"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"

export default function POSPage() {
  const barcodeInputRef = useRef(null)
  
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [barcodeInput, setBarcodeInput] = useState("")
  
  // Cart state
  const [cartItems, setCartItems] = useState([])
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [amountReceived, setAmountReceived] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [discount, setDiscount] = useState(0)
  
  const [processingPayment, setProcessingPayment] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true)
      const response = await fetch('/api/shopify/products')
      const data = await response.json()
      if (data.success) {
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoadingProducts(false)
    }
  }

  // Filter products by search term
  const filteredProducts = products.filter(product =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.variants && product.variants.some(v => 
      v.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
    ))
  )

  // Add product to cart
  const addToCart = (product) => {
    const variant = product.variants?.[0]
    if (!variant) return

    // Check if inventory is tracked
    const isTracked = variant.inventory_management === 'shopify'
    const availableStock = variant.inventory_quantity || 0

    const existingItemIndex = cartItems.findIndex(item => 
      item.variantId === variant.id
    )

    // Calculate new quantity
    const currentQuantity = existingItemIndex >= 0 ? cartItems[existingItemIndex].quantity : 0
    const newQuantity = currentQuantity + 1

    // Check stock availability (only if tracked)
    if (isTracked && newQuantity > availableStock) {
      alert(`❌ Insufficient stock!\n\nProduct: ${product.title}\nAvailable: ${availableStock}\nRequested: ${newQuantity}\n\nPlease check inventory.`)
      return
    }

    if (existingItemIndex >= 0) {
      // Increase quantity
      const newCart = [...cartItems]
      newCart[existingItemIndex].quantity = newQuantity
      setCartItems(newCart)
    } else {
      // Add new item
      setCartItems([...cartItems, {
        productId: product.id,
        variantId: variant.id,
        title: product.title,
        price: parseFloat(variant.price),
        quantity: 1,
        sku: variant.sku || '',
        inventoryQuantity: availableStock,
        inventoryTracked: isTracked,
      }])
    }
  }

  // Handle barcode scan
  const handleBarcodeSubmit = (e) => {
    e.preventDefault()
    if (!barcodeInput.trim()) return

    // Find product by barcode or SKU
    const product = products.find(p => 
      p.variants?.some(v => 
        v.barcode === barcodeInput || 
        v.sku === barcodeInput
      )
    )

    if (product) {
      addToCart(product)
      setBarcodeInput("")
      barcodeInputRef.current?.focus()
    } else {
      alert(`Product not found with barcode/SKU: ${barcodeInput}`)
      setBarcodeInput("")
    }
  }

  // Update quantity
  const updateQuantity = (variantId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(variantId)
      return
    }

    // Find the cart item
    const cartItem = cartItems.find(item => item.variantId === variantId)
    
    // Check stock availability (only if tracked)
    if (cartItem && cartItem.inventoryTracked && newQuantity > cartItem.inventoryQuantity) {
      alert(`❌ Insufficient stock!\n\nProduct: ${cartItem.title}\nAvailable: ${cartItem.inventoryQuantity}\nRequested: ${newQuantity}\n\nPlease check inventory.`)
      return
    }

    setCartItems(cartItems.map(item => 
      item.variantId === variantId 
        ? { ...item, quantity: newQuantity }
        : item
    ))
  }

  // Update price
  const updatePrice = (variantId, newPrice) => {
    const price = parseFloat(newPrice) || 0
    if (price < 0) return

    setCartItems(cartItems.map(item => 
      item.variantId === variantId 
        ? { ...item, price: price }
        : item
    ))
  }

  // Remove from cart
  const removeFromCart = (variantId) => {
    setCartItems(cartItems.filter(item => item.variantId !== variantId))
  }

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const discountAmount = (subtotal * discount) / 100
  const total = subtotal - discountAmount
  const change = amountReceived ? parseFloat(amountReceived) - total : 0

  // Complete sale
  const completeSale = async () => {
    if (cartItems.length === 0) {
      alert('Please add items to cart')
      return
    }

    if (paymentMethod === 'cash' && (!amountReceived || parseFloat(amountReceived) < total)) {
      alert('Amount received must be equal to or greater than total')
      return
    }

    // Final stock validation before completing sale
    const outOfStockItems = cartItems.filter(item => 
      item.inventoryTracked && item.quantity > item.inventoryQuantity
    )

    if (outOfStockItems.length > 0) {
      const itemsList = outOfStockItems.map(item => 
        `- ${item.title}: Need ${item.quantity}, Available ${item.inventoryQuantity}`
      ).join('\n')
      
      alert(`❌ Cannot complete sale - Insufficient stock:\n\n${itemsList}\n\nPlease adjust quantities or refresh product data.`)
      return
    }

    setProcessingPayment(true)

    try {
      const saleData = {
        items: cartItems,
        subtotal,
        discount: discountAmount,
        total,
        paymentMethod,
        amountReceived: paymentMethod === 'cash' ? parseFloat(amountReceived) : total,
        change: paymentMethod === 'cash' ? change : 0,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        status: 'completed',
      }

      // Save to database via API
      // NOTE: This only records the sale in local database
      // It does NOT create orders or update inventory in Shopify
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saleData),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to save sale')
      }

      console.log('✅ Sale saved to LOCAL database (not synced to Shopify):', data.sale)

      // Show success
      alert(`✅ Sale completed!\n\nSale #${data.sale.id}\nTotal: Rs ${total.toFixed(2)}\nReceived: Rs ${parseFloat(amountReceived || total).toFixed(2)}\nChange: Rs ${Math.max(0, change).toFixed(2)}`)
      
      // Reset form
      setCartItems([])
      setAmountReceived("")
      setCustomerName("")
      setCustomerPhone("")
      setDiscount(0)
      setShowPaymentModal(false)
      barcodeInputRef.current?.focus()
      
    } catch (error) {
      console.error('❌ Error completing sale:', error)
      alert(`❌ Failed to complete sale: ${error.message}`)
    } finally {
      setProcessingPayment(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
            <p className="text-sm text-gray-600">Scan or select products to complete sale</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">
              {new Date().toLocaleDateString('en-PK', { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            <Link
              href="/dashboard/sales"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close POS
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Products */}
        <div className="flex-1 flex flex-col bg-white border-r border-gray-200">
          {/* Search and Barcode */}
          <div className="p-4 border-b border-gray-200 space-y-3">
            <form onSubmit={handleBarcodeSubmit} className="relative">
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan barcode or enter SKU..."
                className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </form>
            
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loadingProducts ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading products...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((product) => {
                  const variant = product.variants?.[0]
                  const isTracked = variant?.inventory_management === 'shopify'
                  const stock = variant?.inventory_quantity || 0
                  const isOutOfStock = isTracked && stock === 0
                  const isLowStock = isTracked && stock > 0 && stock <= 5

                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={isOutOfStock}
                      className={`bg-white border-2 rounded-lg p-3 transition-all duration-200 text-left relative ${
                        isOutOfStock 
                          ? 'border-gray-200 opacity-50 cursor-not-allowed' 
                          : 'border-gray-200 hover:border-indigo-500 hover:shadow-lg'
                      }`}
                    >
                      {/* Stock Badge */}
                      {isTracked && (
                        <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold ${
                          isOutOfStock 
                            ? 'bg-red-100 text-red-800' 
                            : isLowStock 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {isOutOfStock ? 'Out' : stock}
                        </div>
                      )}

                      <div className="space-y-2">
                        <h3 className="font-medium text-base text-gray-900 line-clamp-2">{product.title}</h3>
                        <p className="text-xl font-bold text-indigo-600">
                          Rs {parseFloat(variant?.price || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                        </p>
                        {variant?.sku && (
                          <p className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                            SKU: <span className="font-medium">{variant.sku}</span>
                          </p>
                        )}
                        {variant?.barcode && (
                          <p className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                            Barcode: <span className="font-medium">{variant.barcode}</span>
                          </p>
                        )}
                        {product.vendor && (
                          <p className="text-xs text-gray-500">
                            Vendor: <span className="font-medium">{product.vendor}</span>
                          </p>
                        )}
                      </div>
                      {isOutOfStock && (
                        <p className="text-xs text-red-600 font-semibold mt-1">Out of Stock</p>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart & Payment */}
        <div className="w-[600px] flex flex-col bg-gray-50">
          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Cart Items ({cartItems.length})</h2>
            {cartItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p className="mt-2">Cart is empty</p>
                <p className="text-sm">Scan or select products</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cartItems.map((item) => (
                  <div key={item.variantId} className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm text-gray-900">{item.title}</h3>
                        <p className="text-xs text-gray-500">{item.sku}</p>
                        {/* Editable Price */}
                        <div className="mt-1 flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Price:</span>
                          <div className="relative flex-1 max-w-[120px]">
                            <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-xs text-gray-500">Rs</span>
                            <input
                              type="number"
                              value={item.price}
                              onChange={(e) => updatePrice(item.variantId, e.target.value)}
                              onBlur={(e) => {
                                const value = parseFloat(e.target.value) || 0
                                if (value < 0) {
                                  updatePrice(item.variantId, 0)
                                }
                              }}
                              className="w-full pl-8 pr-2 py-1 text-sm font-semibold text-indigo-600 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        {/* Stock indicator */}
                        {item.inventoryTracked && (
                          <p className={`text-xs font-medium mt-1 ${
                            item.quantity > item.inventoryQuantity 
                              ? 'text-red-600' 
                              : item.inventoryQuantity - item.quantity <= 2 
                              ? 'text-yellow-600' 
                              : 'text-green-600'
                          }`}>
                            📦 Available: {item.inventoryQuantity}
                            {item.quantity > item.inventoryQuantity && ' ⚠️ Insufficient!'}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.variantId)}
                        className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2"
                        title="Remove item"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-md hover:bg-gray-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.variantId, parseInt(e.target.value) || 1)}
                        className="w-16 text-center border border-gray-300 rounded-md py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        min="1"
                      />
                      <button
                        onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-md hover:bg-gray-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      <span className="flex-1 text-right font-semibold text-gray-900">
                        Rs {(item.price * item.quantity).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals & Payment */}
          <div className="border-t border-gray-200 bg-white p-4 space-y-3">
            {/* Discount */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Discount %</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                className="w-20 px-3 py-1 border border-gray-300 rounded-md text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                min="0"
                max="100"
                step="1"
              />
            </div>

            {/* Subtotal */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium text-gray-900">Rs {subtotal.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span>
            </div>

            {/* Discount Amount */}
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount ({discount}%):</span>
                <span className="font-medium text-red-600">- Rs {discountAmount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between text-xl font-bold border-t pt-2">
              <span>Total:</span>
              <span className="text-indigo-600">Rs {total.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2 px-3 rounded-lg border-2 text-sm font-medium ${
                    paymentMethod === 'cash'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cash
                </button>
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`py-2 px-3 rounded-lg border-2 text-sm font-medium ${
                    paymentMethod === 'card'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Card
                </button>
                <button
                  onClick={() => setPaymentMethod('online')}
                  className={`py-2 px-3 rounded-lg border-2 text-sm font-medium ${
                    paymentMethod === 'online'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Online
                </button>
              </div>
            </div>

            {/* Amount Received (Cash only) */}
            {paymentMethod === 'cash' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Amount Received</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-semibold">Rs</span>
                  <input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
                {amountReceived && parseFloat(amountReceived) >= total && (
                  <div className="flex justify-between text-lg font-semibold">
                    <span className="text-gray-700">Change:</span>
                    <span className="text-green-600">Rs {change.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
            )}

            {/* Complete Sale Button */}
            <button
              onClick={completeSale}
              disabled={cartItems.length === 0 || processingPayment}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {processingPayment ? 'Processing...' : `Complete Sale - Rs ${total.toFixed(2)}`}
            </button>

            {/* Clear Cart */}
            <button
              onClick={() => setCartItems([])}
              disabled={cartItems.length === 0}
              className="w-full py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
