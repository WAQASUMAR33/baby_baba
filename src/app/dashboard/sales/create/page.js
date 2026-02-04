"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { toast } from "react-hot-toast"

export default function EnhancedPOSPage() {
  const { data: session } = useSession()

  // Product and Employee States
  const [products, setProducts] = useState([])
  const [employees, setEmployees] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingEmployees, setLoadingEmployees] = useState(true)

  // Filter and Selection States
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEmployee, setSelectedEmployee] = useState(null)

  // Cart States
  const [billItems, setBillItems] = useState([])
  const [globalDiscount, setGlobalDiscount] = useState(0)

  // Payment States
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [amountReceived, setAmountReceived] = useState("")
  const [splitPayments, setSplitPayments] = useState([])
  const [customerName, setCustomerName] = useState("")
  const [processingPayment, setProcessingPayment] = useState(false)
  const [lastSale, setLastSale] = useState(null)

  useEffect(() => {
    fetchProducts()
    fetchEmployees()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true)
      const pageSize = 1000
      let offset = 0
      let allProducts = []
      let total = null
      let hasMore = true

      while (hasMore) {
        const response = await fetch(`/api/products?limit=${pageSize}&offset=${offset}`)
        const data = await response.json()
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch products')
        }
        const batch = data.products || []
        allProducts = allProducts.concat(batch)
        total = Number.isFinite(data.total) ? data.total : total
        if (batch.length < pageSize) {
          hasMore = false
        } else if (total !== null && allProducts.length >= total) {
          hasMore = false
        } else {
          offset += pageSize
        }
      }

      setProducts(allProducts)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoadingProducts(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true)
      const response = await fetch('/api/employees')
      const data = await response.json()
      if (data.success) {
        setEmployees(data.employees || [])
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    } finally {
      setLoadingEmployees(false)
    }
  }

  const normalizeText = (value) => {
    if (value === null || value === undefined) return ''
    return value
      .toString()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u2010-\u2015]/g, '-')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const normalizedSearch = normalizeText(searchTerm)

  const filteredProducts = normalizedSearch
    ? products.filter(product => {
      const title = normalizeText(product.title)
      const vendor = normalizeText(product.vendor)
      const variantMatch = Array.isArray(product.variants) && product.variants.some(v => {
        const sku = normalizeText(v.sku)
        const barcode = normalizeText(v.barcode)
        return (sku && sku.includes(normalizedSearch)) || (barcode && barcode.includes(normalizedSearch))
      })
      return (title && title.includes(normalizedSearch)) || (vendor && vendor.includes(normalizedSearch)) || variantMatch
    })
    : products

  const rankedProducts = normalizedSearch
    ? filteredProducts.slice().sort((a, b) => {
      const score = (product) => {
        const title = normalizeText(product.title)
        const vendor = normalizeText(product.vendor)
        if (title === normalizedSearch) return 0
        if (title.startsWith(normalizedSearch)) return 1
        if (title.includes(normalizedSearch)) return 2
        if (vendor.startsWith(normalizedSearch)) return 3
        if (vendor.includes(normalizedSearch)) return 4
        return 5
      }
      return score(a) - score(b)
    })
    : filteredProducts

  // Add product to bill
  const addProductToBill = () => {
    if (!selectedProduct) {
      toast.error('Please select a product first')
      return
    }

    const variant = selectedProduct.variants?.[0]
    if (!variant) {
      alert('Product has no variants')
      return
    }

    const availableStock = parseInt(variant.inventory_quantity || 0)

    // Check if product already in bill
    const existingItemIndex = billItems.findIndex(item =>
      item.variantId === variant.id
    )

    if (existingItemIndex >= 0) {
      // Increase quantity
      const newBillItems = [...billItems]
      const newQuantity = newBillItems[existingItemIndex].quantity + 1

      newBillItems[existingItemIndex].quantity = newQuantity
      newBillItems[existingItemIndex].total = newBillItems[existingItemIndex].unitRate * newQuantity
      newBillItems[existingItemIndex].netTotal = newBillItems[existingItemIndex].total - newBillItems[existingItemIndex].discount
      setBillItems(newBillItems)
    } else {
      // Add new item
      const unitRate = parseFloat(variant.price || 0)
      const newItem = {
        productId: selectedProduct.id,
        variantId: variant.id,
        productName: selectedProduct.title,
        unitRate: unitRate,
        quantity: 1,
        total: unitRate,
        discount: 0,
        discountType: 'rupees', // 'rupees' or 'percentage'
        netTotal: unitRate,
        sku: variant.sku || '',
        barcode: variant.barcode || '',
        availableStock: availableStock
      }
      setBillItems([...billItems, newItem])
    }

    // Reset product selection
    setSelectedProduct(null)
    setSearchTerm("")
  }

  // Update item quantity
  const updateItemQuantity = (variantId, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(variantId)
      return
    }

    setBillItems(billItems.map(item => {
      if (item.variantId === variantId) {
        const total = item.unitRate * newQuantity
        const netTotal = total - item.discount
        return { ...item, quantity: newQuantity, total, netTotal }
      }
      return item
    }))
  }

  // Update item discount
  const updateItemDiscount = (variantId, newDiscount) => {
    const discount = parseFloat(newDiscount) || 0
    if (discount < 0) return

    setBillItems(billItems.map(item => {
      if (item.variantId === variantId) {
        let discountAmount = 0

        if (item.discountType === 'percentage') {
          if (discount > 100) {
            alert('Percentage discount cannot be greater than 100%')
            return item
          }
          discountAmount = (item.total * discount) / 100
        } else {
          // rupees
          if (discount > item.total) {
            alert('Discount cannot be greater than total')
            return item
          }
          discountAmount = discount
        }

        const netTotal = item.total - discountAmount
        return { ...item, discount, netTotal }
      }
      return item
    }))
  }

  // Toggle discount type
  const toggleDiscountType = (variantId) => {
    setBillItems(billItems.map(item => {
      if (item.variantId === variantId) {
        const newType = item.discountType === 'rupees' ? 'percentage' : 'rupees'
        // Recalculate net total with new type
        let discountAmount = 0
        if (newType === 'percentage') {
          discountAmount = (item.total * item.discount) / 100
        } else {
          discountAmount = item.discount
        }
        const netTotal = item.total - discountAmount
        return { ...item, discountType: newType, netTotal }
      }
      return item
    }))
  }

  // Update unit rate
  const updateUnitRate = (variantId, newRate) => {
    const rate = parseFloat(newRate) || 0
    if (rate < 0) return

    setBillItems(billItems.map(item => {
      if (item.variantId === variantId) {
        const total = rate * item.quantity
        const netTotal = total - item.discount
        return { ...item, unitRate: rate, total, netTotal }
      }
      return item
    }))
  }

  // Remove item from bill
  const removeItem = (variantId) => {
    setBillItems(billItems.filter(item => item.variantId !== variantId))
  }

  // Calculate totals
  const subtotal = billItems.reduce((sum, item) => sum + item.netTotal, 0)
  const totalItemDiscounts = billItems.reduce((sum, item) => sum + item.discount, 0)
  const globalDiscountAmount = parseFloat(globalDiscount) || 0
  const grandTotal = subtotal - globalDiscountAmount
  const change = amountReceived ? parseFloat(amountReceived) - grandTotal : 0
  const splitTotal = splitPayments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0)
  const splitChange = splitTotal - grandTotal
  const splitRemaining = grandTotal - splitTotal

  // Format currency
  const formatCurrency = (amount) => {
    return `Rs ${parseFloat(amount).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const parsePaymentBreakdown = (breakdown) => {
    if (!breakdown) return []
    if (Array.isArray(breakdown)) return breakdown
    if (typeof breakdown !== 'string') return []
    try {
      const parsed = JSON.parse(breakdown)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const printReceipt = (sale) => {
    if (!sale) return

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=80mm,height=auto')

    if (!printWindow) {
      alert('Please allow popups to print the receipt')
      return
    }

    // Generate receipt HTML
    const paymentBreakdownItems = parsePaymentBreakdown(sale.paymentBreakdown)
    const paymentBreakdownHtml = paymentBreakdownItems.length > 0
      ? paymentBreakdownItems.map(item => `
            <div>
              <span>${item.method || 'N/A'}:</span>
              <span>${formatCurrency(item.amount || 0)}</span>
            </div>
          `).join('')
      : ''

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt #${sale.id}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              font-weight: bold;
              color: #000;
            }
            
            body {
              width: 80mm;
              max-width: 80mm;
              margin: 0;
              padding: 5mm;
              font-family: 'Courier New', Courier, monospace;
              font-size: 10pt;
              line-height: 1.2;
              color: #000 !important;
              background: #fff;
              font-weight: bold;
            }
            
            .print-logo {
              text-align: center;
              margin-bottom: 8px;
              border-bottom: 1px dashed #000;
              padding-bottom: 8px;
            }
            
            .print-logo h1 {
              font-size: 18pt;
              font-weight: bold;
              margin: 0;
              letter-spacing: 1px;
            }
            
            .print-logo p {
              margin: 2px 0;
              font-size: 9pt;
            }
            
            .print-divider {
              border-top: 1px dashed #000;
              margin: 6px 0;
            }
            
            .print-section {
              margin-bottom: 8px;
              font-size: 9pt;
            }
            
            .print-section div {
              display: flex;
              justify-content: space-between;
              margin-bottom: 3px;
              line-height: 1.3;
            }
            
            .print-table {
              width: 100%;
              font-size: 8pt;
              margin: 8px 0;
              border-collapse: collapse;
              color: #000;
            }
            
            .print-table th {
              text-align: left;
              padding: 4px 0;
              border-bottom: 1px solid #000;
              font-weight: bold;
              font-size: 8pt;
            }
            
            .print-table td {
              padding: 4px 0;
              border-bottom: 1px dotted #000;
              font-size: 8pt;
              color: #000;
              font-weight: bold;
            }
            
            .print-table .text-center {
              text-align: center;
            }
            
            .print-table .text-right {
              text-align: right;
            }
            
            .print-total {
              font-size: 11pt;
              font-weight: bold;
              margin-top: 8px;
              padding-top: 8px;
              border-top: 2px solid #000;
              display: flex;
              justify-content: space-between;
            }
            
            .print-footer {
              text-align: center;
              margin-top: 12px;
              font-size: 8pt;
              border-top: 1px dashed #000;
              padding-top: 8px;
            }
            
            @media print {
              @page {
                size: 80mm auto;
                margin: 0;
              }
              
              body {
                width: 80mm;
                margin: 0;
                padding: 5mm;
              }
            }
          </style>
        </head>
        <body>
          <!-- Header -->
          <div class="print-logo">
            <img src="/babybazar.jpeg" alt="Baby Bazar Logo" style="height: 80px; margin-bottom: 8px;">
            <h1 style="text-transform: uppercase;">Baby Bazar</h1>
            <p>Post Office Road Mandi Bahauddin</p>
            <p>Ph : 0347-943-2880</p>
          </div>

          <!-- Receipt Info -->
          <div class="print-section">
            <div>
              <strong>Receipt #:</strong>
              <span>${sale.id || 'N/A'}</span>
            </div>
            <div>
              <strong>Date:</strong>
              <span>${sale.createdAt ? new Date(sale.createdAt).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</span>
            </div>
            <div>
              <strong>Customer:</strong>
              <span>${sale.customerName || 'Walk-in'}</span>
            </div>
            <div>
              <strong>Employee:</strong>
              <span>${sale.employeeName || selectedEmployee?.name || 'N/A'}</span>
            </div>
            <div>
              <strong>Cashier:</strong>
              <span>${session?.user?.name || session?.user?.email || 'N/A'}</span>
            </div>
          </div>

          <div class="print-divider"></div>

          <!-- Items Table -->
          <table class="print-table">
            <thead>
              <tr>
                <th style="width: 35%">Item</th>
                <th class="text-right" style="width: 13%">Rate</th>
                <th class="text-right" style="width: 10%">Qty</th>
                <th class="text-right" style="width: 15%">Total</th>
                <th class="text-right" style="width: 12%">Dis</th>
                <th class="text-right" style="width: 15%">Net</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items && sale.items.length > 0 ? sale.items.map(item => {
      const itemTotal = parseFloat(item.price || 0) * parseInt(item.quantity || 0)
      const itemDiscount = parseFloat(item.discount || 0)
      const itemNetTotal = itemTotal - itemDiscount
      return `
                <tr>
                  <td colspan="6" style="font-weight: bold;">${item.title || item.productName || 'N/A'}</td>
                </tr>
                <tr>
                  <td></td>
                  <td class="text-right">${parseFloat(item.price || 0).toFixed(0)}</td>
                  <td class="text-right">${item.quantity || 0}</td>
                  <td class="text-right">${(parseFloat(item.price || 0) * parseInt(item.quantity || 0)).toFixed(0)}</td>
                  <td class="text-right">${itemDiscount > 0 ? itemDiscount.toFixed(0) : '-'}</td>
                  <td class="text-right" style="font-weight: bold;">
                    ${itemNetTotal.toFixed(0)}
                  </td>
                </tr>
              `}).join('') : `
                <tr>
                  <td colspan="6" style="text-align: center; padding: 8px 0;">
                    No items
                  </td>
                </tr>
              `}
            </tbody>
          </table>

          <div class="print-divider"></div>

          <!-- Totals -->
          <div class="print-section">
            <div>
              <span>Subtotal:</span>
              <span>${formatCurrency(sale.subtotal || 0)}</span>
            </div>
            ${parseFloat(sale.discount ?? sale.globalDiscount ?? sale.billDiscount ?? 0) > 0 ? `
            <div>
              <span>Bill Discount:</span>
              <span>-${formatCurrency(sale.discount ?? sale.globalDiscount ?? sale.billDiscount ?? 0)}</span>
            </div>
            ` : ''}
            <div class="print-total">
              <span>TOTAL:</span>
              <span>${formatCurrency(sale.total || 0)}</span>
            </div>
          </div>

          <div class="print-divider"></div>

          <!-- Payment Info -->
          <div class="print-section">
            <div>
              <span>Payment Method:</span>
              <span style="text-transform: capitalize;">${sale.paymentMethod || 'N/A'}</span>
            </div>
            <div>
              <span>Amount Received:</span>
              <span>${formatCurrency(sale.amountReceived || 0)}</span>
            </div>
            ${paymentBreakdownHtml}
            ${parseFloat(sale.change || 0) > 0 ? `
            <div style="font-weight: bold;">
              <span>Change:</span>
              <span>${formatCurrency(sale.change)}</span>
            </div>
            ` : ''}
          </div>

          <div class="print-divider"></div>

          <!-- Footer -->
          <div class="print-footer">
            <p style="margin: 4px 0; font-weight: bold;">Thank you for your purchase!</p>
            <p style="margin: 4px 0;">we look forward to seeing you soon</p>
            <p style="margin: 8px 0 0 0; font-size: 7pt;">Powered by RapidtechPro</p>
            <div style="margin-top: 8px; font-size: 7pt; text-align: left;">
              <p style="margin: 4px 0; font-weight: bold;">Important Note:</p>
              <p style="margin: 2px 0;">*Products will not be returned or exchanged without the original bill.</p>
              <p style="margin: 2px 0;">Garments, Shoes, Hosiery Items, Feeding Items, Stuff Toys Can Be Returned Or Exchanged Within 4 Days.</p>
              <p style="margin: 2px 0;">*All Electric Items, Small Toys, Prams, Wooden Cots, Wooden Cupboards, Wooden Beds, Cycles Will Not Be Returned Nor Exchanged.</p>
            </div>
          </div>

          <script>
            // Auto-print when window loads
            window.onload = function() {
              setTimeout(function() {
                window.print();
                // Close window after printing (or after 1 second if print dialog is cancelled)
                setTimeout(function() {
                  window.close();
                }, 1000);
              }, 250);
            };
          </script>
        </body>
      </html>
    `

    // Write HTML to the new window
    printWindow.document.write(receiptHTML)
    printWindow.document.close()
  }

  // Complete sale
  const completeSale = async () => {
    if (billItems.length === 0) {
      alert('Please add items to the bill')
      return
    }

    if (!selectedEmployee) {
      alert('Please select an employee')
      return
    }

    if (paymentMethod === 'cash' && (!amountReceived || parseFloat(amountReceived) < grandTotal)) {
      toast.error('Amount received must be equal to or greater than total')
      return
    }

    if (paymentMethod === 'split' && splitTotal < grandTotal) {
      toast.error('Split payments must cover the total amount')
      return
    }

    setProcessingPayment(true)

    try {
      const normalizedSplitPayments = splitPayments
        .map(payment => ({
          method: payment.method,
          amount: parseFloat(payment.amount) || 0,
        }))
        .filter(payment => payment.amount > 0)
      const splitAmountReceived = normalizedSplitPayments.reduce((sum, payment) => sum + payment.amount, 0)
      const isSplitPayment = paymentMethod === 'split'
      const saleData = {
        items: billItems.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          title: item.productName,
          price: item.unitRate,
          quantity: item.quantity,
          discount: item.discount,
          sku: item.sku
        })),
        subtotal,
        itemDiscounts: totalItemDiscounts,
        globalDiscount: globalDiscountAmount,
        total: grandTotal,
        paymentMethod,
        paymentBreakdown: isSplitPayment ? normalizedSplitPayments : null,
        amountReceived: paymentMethod === 'cash' ? parseFloat(amountReceived) : isSplitPayment ? splitAmountReceived : grandTotal,
        change: paymentMethod === 'cash' ? change : isSplitPayment ? Math.max(0, splitAmountReceived - grandTotal) : 0,
        customerName: customerName.trim() || null,
        employeeId: selectedEmployee.id,
        employeeName: selectedEmployee.name,
        status: 'completed',
      }

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

      // Print receipt automatically
      printReceipt(data.sale)

      // Reset form
      setBillItems([])
      setAmountReceived("")
      setCustomerName("")
      setGlobalDiscount(0)
      setSelectedEmployee(null)
      setLastSale(data.sale)
      toast.success(`Sale completed! Total: ${formatCurrency(grandTotal)}`)

    } catch (error) {
      console.error('❌ Error completing sale:', error)
      toast.error(`Failed to complete sale: ${error.message}`)
    } finally {
      setProcessingPayment(false)
    }
  }

  // --- Hold Sale Feature ---
  const [heldSales, setHeldSales] = useState([])
  const [showRecallModal, setShowRecallModal] = useState(false)

  useEffect(() => {
    // Load held sales from local storage on mount
    const saved = localStorage.getItem('pos_held_sales')
    if (saved) {
      try {
        setHeldSales(JSON.parse(saved))
      } catch (e) {
        console.error("Failed to parse held sales", e)
      }
    }
  }, [])

  const holdSale = () => {
    if (billItems.length === 0) {
      alert("Cart is empty!")
      return
    }

    const saleToHold = {
      id: Date.now(), // simple unique ID
      timestamp: new Date().toISOString(),
      items: billItems,
      customerName,
      employee: selectedEmployee,
      paymentMethod,
      amountReceived,
      splitPayments,
      globalDiscount
    }

    const updatedHeldSales = [saleToHold, ...heldSales]
    setHeldSales(updatedHeldSales)
    localStorage.setItem('pos_held_sales', JSON.stringify(updatedHeldSales))

    // Clear current sale
    setBillItems([])
    setCustomerName("")
    setGlobalDiscount(0)
    setAmountReceived("")
    setSplitPayments([])
    setSelectedEmployee(null)
    setPaymentMethod("cash")


    alert("Sale put on hold! You can recall it from the 'Recall Held' button.") // Kept for now, effectively harmless if we add toast
    toast.success("Sale put on hold successfully!")
  }

  const recallSale = (sale) => {
    if (billItems.length > 0) {
      if (!confirm("Current cart will be cleared. Continue?")) return
    }

    // Restore state
    setBillItems(sale.items)
    setCustomerName(sale.customerName || "")
    setSelectedEmployee(sale.employee || null)
    setPaymentMethod(sale.paymentMethod || "cash")
    setAmountReceived(sale.amountReceived || "")
    setSplitPayments(sale.splitPayments || [])
    setGlobalDiscount(sale.globalDiscount || 0)

    // Remove from held list
    deleteHeldSale(sale.id)
    setShowRecallModal(false)
  }

  const deleteHeldSale = (id) => {
    const updated = heldSales.filter(s => s.id !== id)
    setHeldSales(updated)
    localStorage.setItem('pos_held_sales', JSON.stringify(updated))
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Recall Modal */}
      {showRecallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Held Sales</h2>
              <button onClick={() => setShowRecallModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {heldSales.length === 0 ? (
                <p className="text-center text-gray-500">No held sales found.</p>
              ) : (
                <div className="space-y-3">
                  {heldSales.map(sale => (
                    <div key={sale.id} className="border rounded p-3 flex justify-between items-center bg-gray-50 hover:bg-gray-100">
                      <div>
                        <p className="font-bold">{new Date(sale.timestamp).toLocaleString()} - {sale.items.length} Items</p>
                        <p className="text-sm text-gray-600">Cust: {sale.customerName || 'N/A'} | Emp: {sale.employee?.name || 'N/A'}</p>
                        <p className="text-sm font-semibold">Total: {formatCurrency(sale.items.reduce((acc, i) => acc + i.netTotal, 0))}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => recallSale(sale)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => deleteHeldSale(sale.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t text-right">
              <button onClick={() => setShowRecallModal(false)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Product Selection */}
        <div className="flex-1 flex flex-col bg-white border-r border-gray-200 p-6">

          {/* Product Dropdown with Search */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search & Select Product
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type to search products..."
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Dropdown Results */}
            {searchTerm && (
              <div className="mt-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg">
                {loadingProducts ? (
                  <div className="p-4 text-center text-gray-500">Loading...</div>
                ) : filteredProducts.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No products found</div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {rankedProducts.slice(0, 200).map((product) => {
                      const variant = product.variants?.[0]
                      const stock = parseInt(variant?.inventory_quantity || 0)
                      const isOutOfStock = stock <= 0

                      return (
                        <button
                          key={product.id}
                          onClick={() => {
                            setSelectedProduct(product)
                            setSearchTerm(product.title)
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selectedProduct?.id === product.id ? 'bg-indigo-50' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{product.title}</p>
                              <div className="flex items-center space-x-3 mt-1">
                                <p className="text-sm text-indigo-600 font-semibold">
                                  {formatCurrency(variant?.price || 0)}
                                </p>
                                {variant?.sku && (
                                  <p className="text-xs text-gray-500">SKU: {variant.sku}</p>
                                )}
                                <p className={`text-xs font-medium ${isOutOfStock ? 'text-red-600' : stock <= 5 ? 'text-yellow-600' : 'text-green-600'
                                  }`}>
                                  Stock: {stock}
                                </p>
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Product Display */}
          {selectedProduct && (
            <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Selected Product:</p>
                  <p className="text-lg font-bold text-gray-900">{selectedProduct.title}</p>
                  <p className="text-sm text-indigo-600">
                    {formatCurrency(selectedProduct.variants?.[0]?.price || 0)}
                  </p>
                </div>
                <button
                  onClick={addProductToBill}
                  className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Add to Bill
                </button>
              </div>
            </div>
          )}

          {/* Bill Items List */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Bill Items ({billItems.length})</h3>

            {billItems.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-2">No items in bill</p>
                  <p className="text-sm">Select products to add</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Rate</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Discount</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Total</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {billItems.map((item) => (
                      <tr key={item.variantId} className="hover:bg-gray-50">
                        <td className="px-3 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                            {item.sku && <p className="text-xs text-gray-500">SKU: {item.sku}</p>}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <input
                            type="number"
                            value={item.unitRate}
                            onChange={(e) => updateUnitRate(item.variantId, e.target.value)}
                            className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            step="0.01"
                            min="0"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => updateItemQuantity(item.variantId, item.quantity - 1)}
                              className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded hover:bg-gray-200"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </button>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.variantId, parseInt(e.target.value) || 1)}
                              className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              min="1"
                            />
                            <button
                              onClick={() => updateItemQuantity(item.variantId, item.quantity + 1)}
                              className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded hover:bg-gray-200"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-sm font-medium text-gray-900">
                          {item.total.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end space-x-1">
                            <input
                              type="number"
                              value={item.discount}
                              onChange={(e) => updateItemDiscount(item.variantId, e.target.value)}
                              className="w-20 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              step="0.01"
                              min="0"
                              max={item.discountType === 'percentage' ? 100 : item.total}
                            />
                            <button
                              onClick={() => toggleDiscountType(item.variantId)}
                              className="px-2 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                              title={`Switch to ${item.discountType === 'rupees' ? 'percentage' : 'rupees'}`}
                            >
                              {item.discountType === 'percentage' ? '%' : 'Rs'}
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-sm font-bold text-indigo-600">
                          {item.netTotal.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => removeItem(item.variantId)}
                            className="text-red-500 hover:text-red-700"
                            title="Remove item"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Billing Area */}
        <div className="w-[450px] flex flex-col bg-gray-50 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing Details</h2>

          {/* Employee Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Employee <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedEmployee?.id || ''}
              onChange={(e) => {
                const emp = employees.find(emp => emp.id === parseInt(e.target.value))
                setSelectedEmployee(emp || null)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Select Employee --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} {emp.phoneNumber ? `(${emp.phoneNumber})` : ''}
                </option>
              ))}
            </select>
            {selectedEmployee && (
              <p className="mt-1 text-xs text-green-600">
                ✓ Commission will be recorded for {selectedEmployee.name}
              </p>
            )}
          </div>

          {/* Customer Information */}
          <div className="mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name (Optional)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in customer"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Totals Summary */}
          <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-semibold text-gray-900">{subtotal.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span>
            </div>

            {totalItemDiscounts > 0 && (
              <div className="flex justify-between text-sm text-gray-500 italic">
                <span>Total Item Discounts:</span>
                <span>{totalItemDiscounts.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            {/* Global Discount */}
            <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-200">
              <span className="text-gray-600">Global Discount (Rs):</span>
              <input
                type="number"
                value={globalDiscount}
                onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                className="w-24 px-2 py-1 text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                step="0.01"
                min="0"
                max={subtotal}
              />
            </div>
            {globalDiscountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Global Discount Amount:</span>
                <span className="font-semibold text-red-600">-{globalDiscountAmount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="flex justify-between text-lg font-bold pt-2 border-t-2 border-gray-300">
              <span className="text-gray-900">Grand Total:</span>
              <span className="text-indigo-600">{grandTotal.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Payment Section - Includes Hold/Recall and Methods */}
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            {/* Hold & Recall Buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={holdSale}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Hold Sale
              </button>
              <button
                onClick={() => setShowRecallModal(true)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded font-semibold transition-colors flex items-center justify-center gap-2 relative"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Recall Held
                {heldSales.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                    {heldSales.length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex justify-between items-center text-lg font-bold mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setPaymentMethod('cash')
                    setSplitPayments([])
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${paymentMethod === 'cash'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  Cash
                </button>
                <button
                  onClick={() => {
                    setPaymentMethod('card')
                    setSplitPayments([])
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${paymentMethod === 'card'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  Card
                </button>
                <button
                  onClick={() => {
                    setPaymentMethod('split')
                    if (splitPayments.length === 0) {
                      setSplitPayments([
                        { method: 'cash', amount: '' },
                        { method: 'bank', amount: '' },
                      ])
                    }
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${paymentMethod === 'split'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  Split
                </button>
              </div>
            </div>

            {/* Amount Received (for cash) */}
            {paymentMethod === 'cash' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount Received
                </label>
                <input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-semibold"
                  step="0.01"
                  min="0"
                />
                {amountReceived && change >= 0 && (
                  <p className="mt-2 text-sm">
                    <span className="text-gray-600">Change: </span>
                    <span className="font-bold text-green-600">{change.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span>
                  </p>
                )}
                {amountReceived && change < 0 && (
                  <p className="mt-2 text-sm text-red-600">
                    ⚠️ Amount received is less than total
                  </p>
                )}
              </div>
            )}

            {paymentMethod === 'split' && (
              <div className="mb-4">
                <div className="space-y-2">
                  {splitPayments.map((payment, index) => (
                    <div key={`${payment.method}-${index}`} className="flex items-center gap-2">
                      <select
                        value={payment.method}
                        onChange={(e) => {
                          const updated = [...splitPayments]
                          updated[index] = { ...updated[index], method: e.target.value }
                          setSplitPayments(updated)
                        }}
                        className="w-28 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="bank">Bank</option>
                      </select>
                      <input
                        type="number"
                        value={payment.amount}
                        onChange={(e) => {
                          const updated = [...splitPayments]
                          updated[index] = { ...updated[index], amount: e.target.value }
                          setSplitPayments(updated)
                        }}
                        placeholder="0.00"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        step="0.01"
                        min="0"
                      />
                      <button
                        onClick={() => {
                          const updated = splitPayments.filter((_, i) => i !== index)
                          setSplitPayments(updated)
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setSplitPayments([...splitPayments, { method: 'cash', amount: '' }])}
                  className="mt-3 w-full px-4 py-2 border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 font-medium"
                >
                  Add Payment
                </button>
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Paid:</span>
                    <span className="font-semibold">{splitTotal.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Remaining:</span>
                    <span className={`font-semibold ${splitRemaining <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {splitRemaining.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {splitChange > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Change:</span>
                      <span className="font-semibold text-green-600">
                        {splitChange.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Complete Sale Button */}
            <button
              onClick={completeSale}
              disabled={processingPayment || billItems.length === 0 || !selectedEmployee}
              className={`w-full py-4 rounded-lg font-bold text-lg transition-colors ${processingPayment || billItems.length === 0 || !selectedEmployee
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
                }`}
            >
              {processingPayment ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                `Complete Sale - ${grandTotal.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`
              )}
            </button>

            {/* Quick Actions */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  if (confirm('Clear all items from bill?')) {
                    setBillItems([])
                    setGlobalDiscount(0)
                  }
                }}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium"
              >
                Clear Bill
              </button>
              <button
                onClick={() => {
                  setCustomerName("")
                  setAmountReceived("")
                  setSelectedEmployee(null)
                  setSplitPayments([])
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Reset Details
              </button>
              {lastSale && (
                <button
                  onClick={() => printReceipt(lastSale)}
                  className="col-span-2 px-4 py-3 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 font-bold flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Last Receipt (#{lastSale.id})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
