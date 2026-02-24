"use client"

import { useState, useRef, useEffect } from "react"

export default function OutOfStockPage() {
  const [barcode, setBarcode] = useState("")
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)

  // The matched product (after barcode search)
  const [selectedProduct, setSelectedProduct] = useState(null)

  // Quantity to deduct
  const [quantity, setQuantity] = useState("")

  // Deduct action state
  const [deducting, setDeducting] = useState(false)
  const [toast, setToast] = useState(null)

  // Session log of deductions this session
  const [log, setLog] = useState([])

  const barcodeInputRef = useRef(null)
  const quantityInputRef = useRef(null)

  // Auto-focus barcode input on mount
  useEffect(() => {
    barcodeInputRef.current?.focus()
  }, [])

  // Auto-focus quantity input when a product is selected
  useEffect(() => {
    if (selectedProduct) {
      setTimeout(() => quantityInputRef.current?.focus(), 50)
    }
  }, [selectedProduct])

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 5000)
  }

  const getStock = (product) =>
    product.variants?.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0) ??
    product.quantity ??
    0

  const handleSearch = async (e) => {
    e?.preventDefault()
    const term = barcode.trim()
    if (!term) return

    setSearching(true)
    setSearchError(null)
    setSelectedProduct(null)
    setQuantity("")

    try {
      const params = new URLSearchParams({ search: term, limit: "10" })
      const res = await fetch(`/api/products?${params}`, { cache: "no-store" })
      const data = await res.json()

      if (!data.success) throw new Error(data.error || "Search failed")

      const products = data.products || []
      if (products.length === 0) {
        setSearchError(`No product found for barcode: "${term}"`)
        return
      }

      // Prefer exact barcode match (variant or product barcode)
      const exact = products.find((p) => {
        const matchVariant = p.variants?.some(
          (v) => v.barcode?.trim() === term || v.sku?.trim() === term
        )
        return matchVariant || p.barcode?.trim() === term
      })

      setSelectedProduct(exact || products[0])
    } catch (err) {
      setSearchError(err.message || "An error occurred")
    } finally {
      setSearching(false)
    }
  }

  const handleDeduct = async (e) => {
    e?.preventDefault()
    if (!selectedProduct) return

    const qty = parseInt(quantity)
    const stock = getStock(selectedProduct)

    if (!qty || qty <= 0) {
      showToast("error", "Please enter a valid quantity greater than 0.")
      return
    }

    setDeducting(true)
    try {
      const res = await fetch(`/api/products/${selectedProduct.id}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deduct", quantity: qty }),
      })
      const data = await res.json()

      if (data.success) {
        const newStock = stock - qty

        // Add to session log
        setLog((prev) => [
          {
            id: Date.now(),
            productId: selectedProduct.id,
            title: selectedProduct.title,
            barcode: barcode.trim(),
            deducted: qty,
            newStock,
            time: new Date().toLocaleTimeString(),
          },
          ...prev,
        ])

        showToast("success", `Deducted ${qty} from "${selectedProduct.title}". Stock updated in database.`)

        // Reset form — ready for next scan
        setBarcode("")
        setSelectedProduct(null)
        setQuantity("")
        barcodeInputRef.current?.focus()
      } else {
        showToast("error", data.error || "Failed to deduct stock")
      }
    } catch (err) {
      showToast("error", err.message || "An error occurred")
    } finally {
      setDeducting(false)
    }
  }

  const handleClear = () => {
    setBarcode("")
    setSelectedProduct(null)
    setQuantity("")
    setSearchError(null)
    barcodeInputRef.current?.focus()
  }

  const stock = selectedProduct ? getStock(selectedProduct) : 0
  const variant = selectedProduct?.variants?.[0]
  const qtyNum = parseInt(quantity)
  const isValidQty = qtyNum > 0

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Stock Deduction</h1>
        <p className="mt-1 text-sm text-gray-500">
          Scan or enter a barcode, enter the quantity, and deduct from the database
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center justify-between ${
            toast.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {toast.type === "success" ? (
              <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Step 1 — Barcode input */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
          <h2 className="text-base font-semibold text-gray-800">Scan or Enter Barcode</h2>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h1M4 10h1M4 14h1M4 18h1M8 4v16M12 6h1M12 10h1M12 14h1M12 18h1M16 4v16M20 6h1M20 10h1M20 14h1M20 18h1" />
              </svg>
            </div>
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcode}
              onChange={(e) => {
                setBarcode(e.target.value)
                setSearchError(null)
                if (selectedProduct) {
                  setSelectedProduct(null)
                  setQuantity("")
                }
              }}
              placeholder="Scan barcode or type product name / SKU…"
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            disabled={!barcode.trim() || searching}
            className="px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {searching ? (
              <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
            {searching ? "Searching…" : "Search"}
          </button>
        </form>

        {searchError && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {searchError}
          </div>
        )}
      </div>

      {/* Step 2 — Product found + quantity */}
      {selectedProduct && (
        <div className="bg-white rounded-2xl border border-orange-200 shadow-sm p-6 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
            <h2 className="text-base font-semibold text-gray-800">Product Found — Enter Quantity</h2>
            <button
              onClick={handleClear}
              className="ml-auto text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          </div>

          {/* Product info card */}
          <div className="bg-gray-50 rounded-xl p-4 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="col-span-2 sm:col-span-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Product</p>
              <p className="text-base font-bold text-gray-900">{selectedProduct.title}</p>
              {selectedProduct.vendor && (
                <p className="text-xs text-gray-500">{selectedProduct.vendor}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">SKU</p>
              <p className="text-sm font-semibold text-gray-700">{variant?.sku || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Barcode</p>
              <p className="text-sm font-semibold text-gray-700">{variant?.barcode || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Price</p>
              <p className="text-sm font-semibold text-gray-700">
                Rs {parseFloat(selectedProduct.sale_price || 0).toLocaleString("en-PK")}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Current Stock</p>
              <p className={`text-lg font-bold ${stock <= 0 ? "text-red-600" : stock <= 10 ? "text-yellow-600" : "text-green-600"}`}>
                {stock}
              </p>
            </div>
          </div>

          <form onSubmit={handleDeduct} className="flex items-start gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Quantity to Deduct
              </label>
              <input
                ref={quantityInputRef}
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
                className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 ${
                  quantity && !isValidQty
                    ? "border-red-400 focus:ring-red-400"
                    : "border-gray-300 focus:ring-orange-500"
                }`}
              />
              {quantity && !isValidQty && (
                <p className="text-xs text-red-500 mt-1">Must be greater than 0</p>
              )}
            </div>
            <div className="pt-6">
              <button
                type="submit"
                disabled={!isValidQty || deducting}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                {deducting ? (
                  <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                )}
                {deducting ? "Deducting…" : "Deduct Stock"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Session log */}
      {log.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Session Log</h2>
            <button
              onClick={() => setLog([])}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Clear log
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-2 text-left">Product</th>
                <th className="px-6 py-2 text-left">Barcode</th>
                <th className="px-6 py-2 text-right">Deducted</th>
                <th className="px-6 py-2 text-right">New Stock</th>
                <th className="px-6 py-2 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {log.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-800 max-w-[200px] truncate">{entry.title}</td>
                  <td className="px-6 py-3 text-gray-500">{entry.barcode}</td>
                  <td className="px-6 py-3 text-right font-bold text-orange-600">−{entry.deducted}</td>
                  <td className="px-6 py-3 text-right font-bold">
                    <span className={entry.newStock <= 0 ? "text-red-600" : entry.newStock <= 10 ? "text-yellow-600" : "text-green-600"}>
                      {entry.newStock}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right text-gray-400">{entry.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
