"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import JsBarcode from "jsbarcode"
import LoadingSpinner from "@/components/LoadingSpinner"

const PAGE_SIZE = 50

export default function ProductsPage() {
  // Data
  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [stockFilter, setStockFilter] = useState("all")
  const [vendorFilter, setVendorFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [categories, setCategories] = useState([])
  const [vendors, setVendors] = useState([])

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  // Barcode print states
  const [showBarcodeModal, setShowBarcodeModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [barcodeQuantity, setBarcodeQuantity] = useState(1)
  const [barcodeLabelName, setBarcodeLabelName] = useState("")

  // Out-of-stock state: tracks which product ID is currently being processed
  const [outOfStockLoading, setOutOfStockLoading] = useState(null)

  // Sync state
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [syncProgress, setSyncProgress] = useState({ imported: 0, failed: 0 })
  const [showSyncErrorModal, setShowSyncErrorModal] = useState(false)
  const [syncErrorMessage, setSyncErrorMessage] = useState("")

  // Debounce search input — only triggers fetch after 400ms pause
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fetch only the current page from the server with all filters applied
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        limit: PAGE_SIZE.toString(),
        offset: ((currentPage - 1) * PAGE_SIZE).toString(),
        sortBy,
      })
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (vendorFilter !== 'all') params.set('vendor', vendorFilter)
      if (categoryFilter !== 'all') params.set('categoryId', categoryFilter)
      if (stockFilter !== 'all') params.set('stock', stockFilter)

      const response = await fetch(`/api/products?${params}`, { cache: 'no-store' })
      const data = await response.json()

      if (data.success) {
        setProducts(data.products || [])
        setTotal(data.total || 0)
      } else {
        setError(data.error || 'Failed to fetch products')
      }
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [currentPage, debouncedSearch, statusFilter, stockFilter, vendorFilter, categoryFilter, sortBy])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Load categories and vendors once on mount
  useEffect(() => {
    fetchCategories()
    fetchVendors()
  }, [])

  const fetchVendors = async () => {
    try {
      const res = await fetch('/api/products?vendorsOnly=true')
      const data = await res.json()
      if (data.success) setVendors(data.vendors || [])
    } catch {}
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      if (data.success) setCategories(data.categories)
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const handleUpdateCategory = async (productId, categoryId) => {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: categoryId === "" ? null : parseInt(categoryId) })
      })
      const data = await response.json()
      if (data.success) {
        setProducts(prev => prev.map(p =>
          p.id === productId
            ? { ...p, categoryId: categoryId === "" ? null : parseInt(categoryId), categoryName: categories.find(c => c.id === parseInt(categoryId))?.name || null }
            : p
        ))
      } else {
        alert(data.error || 'Failed to update category')
      }
    } catch (err) {
      alert(err.message || 'An error occurred')
    }
  }

  // Filter change helpers — always reset to page 1
  const handleStatusFilter = (val) => { setStatusFilter(val); setCurrentPage(1) }
  const handleStockFilter = (val) => { setStockFilter(val); setCurrentPage(1) }
  const handleVendorFilter = (val) => { setVendorFilter(val); setCurrentPage(1) }
  const handleCategoryFilter = (val) => { setCategoryFilter(val); setCurrentPage(1) }
  const handleSortBy = (val) => { setSortBy(val); setCurrentPage(1) }

  const clearAllFilters = () => {
    setStatusFilter("all")
    setStockFilter("all")
    setVendorFilter("all")
    setCategoryFilter("all")
    setSortBy("name")
    setSearchTerm("")
    setCurrentPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE + 1
  const endIndex = Math.min((currentPage - 1) * PAGE_SIZE + products.length, total)

  const handleSync = async () => {
    try {
      setSyncing(true)
      setSyncResult(null)
      setSyncProgress({ imported: 0, failed: 0 })
      setShowSyncErrorModal(false)
      setSyncErrorMessage("")
      let pageInfo = null
      let totalImported = 0
      let totalFailed = 0
      let hasMore = true

      while (hasMore) {
        const params = new URLSearchParams()
        params.set('mode', 'page')
        params.set('limit', '250')
        if (pageInfo) {
          params.set('pageInfo', pageInfo)
        }

        const response = await fetch(`/api/products/sync?${params.toString()}`, {
          method: 'POST'
        })
        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || 'Sync failed')
        }

        totalImported += data.imported || 0
        totalFailed += data.failed || 0
        setSyncProgress({ imported: totalImported, failed: totalFailed })
        pageInfo = data.nextPageInfo || null
        hasMore = Boolean(data.hasMore && pageInfo)
      }

      setSyncResult({
        type: 'success',
        message: `Successfully synced ${totalImported} products${totalFailed ? ` (${totalFailed} failed)` : ''}!`
      })
      fetchProducts()
    } catch (err) {
      setSyncErrorMessage(err.message || 'An error occurred during sync')
      setShowSyncErrorModal(true)
      setSyncResult({
        type: 'error',
        message: err.message || 'An error occurred during sync'
      })
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncResult(null), 5000)
    }
  }

  const handleOutOfStock = async (product) => {
    if (!confirm(`Mark "${product.title}" as out of stock on Shopify? This will set its online inventory to 0.`)) return
    setOutOfStockLoading(product.id)
    try {
      const res = await fetch(`/api/products/${product.id}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'out-of-stock' }),
      })
      const data = await res.json()
      if (data.success) {
        // Update local state so the stock column immediately shows 0
        setProducts(prev => prev.map(p =>
          p.id === product.id
            ? { ...p, quantity: 0, variants: p.variants?.map(v => ({ ...v, inventory_quantity: 0 })) }
            : p
        ))
        alert(`"${product.title}" marked as out of stock on Shopify.`)
      } else {
        alert(`Failed: ${data.error || 'Unknown error'}`)
      }
    } catch (err) {
      alert(`Error: ${err.message}`)
    } finally {
      setOutOfStockLoading(null)
    }
  }

  const openBarcodeModal = (product) => {
    setSelectedProduct(product)
    setBarcodeQuantity(1)
    setBarcodeLabelName(product?.title || "Product")
    setShowBarcodeModal(true)
  }

  const closeBarcodeModal = () => {
    setShowBarcodeModal(false)
    setSelectedProduct(null)
    setBarcodeQuantity(1)
    setBarcodeLabelName("")
  }

  const printBarcodes = () => {
    if (!selectedProduct) return

    const variant = selectedProduct.variants?.[0]
    const barcodeValue = variant?.barcode || variant?.sku || selectedProduct.id.toString()
    const escapeHtml = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")

    const productTitle = escapeHtml(barcodeLabelName || selectedProduct.title || "Product")
    const productPrice = variant?.price ? `Rs ${parseFloat(variant.price).toLocaleString('en-PK', { minimumFractionDigits: 0 })}` : ''

    const normalizedBarcodeValue = String(barcodeValue ?? "").trim()
    if (!normalizedBarcodeValue) {
      alert("No barcode/SKU found for this product.")
      return
    }
    const isDigitsOnly = /^[0-9]+$/.test(normalizedBarcodeValue)
    const barcodeType =
      isDigitsOnly && (normalizedBarcodeValue.length === 7 || normalizedBarcodeValue.length === 8)
        ? "EAN8"
        : isDigitsOnly && (normalizedBarcodeValue.length === 12 || normalizedBarcodeValue.length === 13)
          ? "EAN13"
          : "CODE128"

    const printWindow = window.open('', '_blank', 'width=800,height=600')

    if (!printWindow) {
      alert('Please allow popups to print barcodes')
      return
    }

    const buildBarcodeSvgMarkup = () => {
      try {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg")
        svg.setAttribute("class", "barcode-svg")

        const options = {
          format: barcodeType,
          width: 1.5,
          height: 30,
          displayValue: false,
          margin: 2,
          background: "#ffffff",
          lineColor: "#000000",
        }

        try {
          JsBarcode(svg, normalizedBarcodeValue, options)
        } catch {
          JsBarcode(svg, normalizedBarcodeValue, { ...options, format: "CODE128" })
        }

        return new XMLSerializer().serializeToString(svg)
      } catch (err) {
        const message = escapeHtml(err?.message || "Barcode error")
        return `<svg class="barcode-svg" xmlns="http://www.w3.org/2000/svg"><text x="0" y="14" font-size="10" fill="red">${message}</text></svg>`
      }
    }

    let barcodeHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Barcode Labels - ${productTitle}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { margin: 5mm; font-family: Arial, sans-serif; }
            .barcode-container {
              display: inline-block; width: 2in; height: 1in;
              border: 1px solid #000; padding: 2mm; margin: 2mm;
              text-align: center; page-break-inside: avoid; box-sizing: border-box;
            }
            .barcode-title {
              font-size: 7pt; font-weight: bold; margin-bottom: 1mm; line-height: 1.1;
              word-wrap: break-word; overflow: hidden; text-overflow: ellipsis;
              white-space: nowrap; max-width: 100%;
            }
            .barcode-svg { width: 100%; height: 20mm; margin: 1mm 0; display: block; }
            .barcode-value { font-size: 6pt; margin-top: 0.5mm; font-family: 'Courier New', monospace; }
            .barcode-price { font-size: 7pt; font-weight: bold; margin-top: 0.5mm; }
            @media print {
              @page { size: letter; margin: 5mm; }
              body { margin: 0; padding: 5mm; }
              .barcode-container { border: 1px solid #000; width: 2in; height: 1in; }
            }
          </style>
        </head>
        <body>
    `

    for (let i = 0; i < barcodeQuantity; i++) {
      const barcodeSvgMarkup = buildBarcodeSvgMarkup()
      barcodeHTML += `
        <div class="barcode-container">
          <div class="barcode-title">${productTitle}</div>
          ${barcodeSvgMarkup}
          <div class="barcode-value">${escapeHtml(normalizedBarcodeValue)}</div>
          ${productPrice ? `<div class="barcode-price">${productPrice}</div>` : ''}
        </div>
      `
    }

    barcodeHTML += `
        </body>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() {
                if (confirm('Close this window?')) { window.close(); }
              }, 2000);
            }, 250);
          };
        </script>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(barcodeHTML)
    printWindow.document.close()
    printWindow.focus()

    closeBarcodeModal()
  }

  // Only show full-page spinner on initial empty load
  if (loading && products.length === 0 && !error) {
    return (
      <div className="p-6 lg:p-8">
        <LoadingSpinner size="lg" text="Loading products..." />
      </div>
    )
  }

  if (error && products.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading products</h3>
              <p className="mt-2 text-sm text-red-700">{error}</p>
              <div className="mt-4">
                <button onClick={fetchProducts} className="text-sm font-medium text-red-800 hover:text-red-900">
                  Try again →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Products</h1>
            <p className="mt-2 text-sm text-gray-600">
              {total > 0 ? `${total} products total` : 'Manage your products'}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white ${syncing ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {syncing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Syncing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sync with Shopify
                </>
              )}
            </button>
            {syncing && (
              <div className="text-sm text-gray-600">
                Synced {syncProgress.imported}{syncProgress.failed ? ` (${syncProgress.failed} failed)` : ''} so far
              </div>
            )}
            <Link
              href="/dashboard/products/add"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Product
            </Link>
            <button
              onClick={fetchProducts}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Sync Result Toast */}
        {syncResult && (
          <div className={`mt-4 p-4 rounded-lg flex items-center justify-between ${syncResult.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            <div className="flex items-center">
              {syncResult.type === 'success' ? (
                <svg className="w-5 h-5 mr-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <span className="text-sm font-medium">{syncResult.message}</span>
            </div>
            <button onClick={() => setSyncResult(null)} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="mt-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search products by name, vendor, SKU, or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {loading ? (
                <svg className="animate-spin w-5 h-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>

      {showSyncErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Sync Failed</h3>
            </div>
            <div className="px-6 py-4 space-y-3">
              <p className="text-sm text-gray-600">{syncErrorMessage}</p>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Synced products</span>
                  <span className="font-semibold text-gray-900">{syncProgress.imported}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Failed products</span>
                  <span className="font-semibold text-red-600">{syncProgress.failed}</span>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end">
              <button
                onClick={() => setShowSyncErrorModal(false)}
                className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
          <button
            onClick={clearAllFilters}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Clear all
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Stock Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Stock Level</label>
            <select
              value={stockFilter}
              onChange={(e) => handleStockFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Stock Levels</option>
              <option value="in-stock">In Stock (&gt;10)</option>
              <option value="low-stock">Low Stock (1-10)</option>
              <option value="out-of-stock">Out of Stock (0)</option>
            </select>
          </div>

          {/* Vendor Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Vendor</label>
            <select
              value={vendorFilter}
              onChange={(e) => handleVendorFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor} value={vendor}>
                  {vendor}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => handleCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Categories</option>
              <option value="none">Uncategorized</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => handleSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="name">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="price-low">Price (Low to High)</option>
              <option value="price-high">Price (High to Low)</option>
              <option value="stock-low">Stock (Low to High)</option>
              <option value="stock-high">Stock (High to Low)</option>
            </select>
          </div>
        </div>

        {/* Active Filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          {statusFilter !== "all" && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Status: {statusFilter}
              <button onClick={() => handleStatusFilter("all")} className="ml-2 hover:text-indigo-900">×</button>
            </span>
          )}
          {stockFilter !== "all" && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Stock: {stockFilter.replace("-", " ")}
              <button onClick={() => handleStockFilter("all")} className="ml-2 hover:text-indigo-900">×</button>
            </span>
          )}
          {categoryFilter !== "all" && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Category: {categoryFilter === "none" ? "Uncategorized" : (categories.find(c => c.id.toString() === categoryFilter)?.name || "Unknown")}
              <button onClick={() => handleCategoryFilter("all")} className="ml-2 hover:text-indigo-900">×</button>
            </span>
          )}
          {vendorFilter !== "all" && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Vendor: {vendorFilter}
              <button onClick={() => handleVendorFilter("all")} className="ml-2 hover:text-indigo-900">×</button>
            </span>
          )}
          {searchTerm && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Search: &quot;{searchTerm}&quot;
              <button onClick={() => setSearchTerm("")} className="ml-2 hover:text-indigo-900">×</button>
            </span>
          )}
        </div>
      </div>

      {/* Products Table */}
      {products.length === 0 && !loading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all' || stockFilter !== 'all' || vendorFilter !== 'all' || categoryFilter !== 'all'
              ? "Try adjusting your search or filters"
              : "Add a product or sync with Shopify"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pagination bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-sm text-gray-600">
              {total > 0
                ? <>Showing <span className="font-semibold text-gray-900">{startIndex}–{endIndex}</span> of <span className="font-semibold text-gray-900">{total}</span> products</>
                : <span className="italic text-gray-400">Loading…</span>
              }
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || loading}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>

          <div className={`bg-white shadow-sm rounded-lg border border-gray-200 overflow-x-auto transition-opacity ${loading ? 'opacity-60' : 'opacity-100'}`}>
            <table className="min-w-[1200px] w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Title</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barcode</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sale Price</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Original Price</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => {
                  const variant = product.variants?.[0]
                  return (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900 line-clamp-2">{product.title}</div>
                        {product.tags && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {product.tags.split(',').slice(0, 3).map((tag, idx) => (
                              <span key={idx} className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">{tag.trim()}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{variant?.barcode || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          Rs {parseFloat(product.sale_price || 0).toLocaleString('en-PK')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-gray-500">
                        <div className="text-sm">
                          Rs {parseFloat(product.original_price || 0).toLocaleString('en-PK')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={product.categoryId || ""}
                          onChange={(e) => handleUpdateCategory(product.id, e.target.value)}
                          className="text-xs font-semibold bg-gray-50 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                        >
                          <option value="">Uncategorized</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {(() => {
                          const stock = product.variants?.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0) ?? product.quantity ?? 0
                          return (
                            <div className={`text-sm font-bold ${stock <= 0 ? 'text-red-600' : stock <= 10 ? 'text-yellow-600' : 'text-green-600'}`}>
                              {stock}
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-3">
                          <button
                            onClick={() => openBarcodeModal(product)}
                            className="text-green-600 hover:text-green-900 font-medium inline-flex items-center"
                            title="Print Barcode"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Print Barcode
                          </button>
                          <button
                            onClick={() => handleOutOfStock(product)}
                            disabled={outOfStockLoading === product.id}
                            className="text-orange-600 hover:text-orange-900 font-medium inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Mark as Out of Stock on Shopify"
                          >
                            {outOfStockLoading === product.id ? (
                              <svg className="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            )}
                            Out of Stock
                          </button>
                          <Link
                            href={`/dashboard/products/${product.id}`}
                            className="text-indigo-600 hover:text-indigo-900 font-medium inline-flex items-center"
                          >
                            Edit
                            <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1 || loading}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="text-sm text-gray-700 px-3">
                Page {currentPage} of {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || loading}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || loading}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Last
              </button>
            </div>
          )}
        </div>
      )}

      {/* Barcode Print Modal */}
      {showBarcodeModal && selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
          <div
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
            onClick={closeBarcodeModal}
          ></div>

          <div className="relative w-full max-w-lg mx-auto bg-white rounded-3xl shadow-2xl transform transition-all duration-300 ease-out scale-100 opacity-100 flex flex-col max-h-[90vh] z-10 overflow-hidden">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 leading-tight">Print Barcodes</h3>
                    <p className="text-sm text-gray-500">Configure labels for {selectedProduct.title}</p>
                  </div>
                </div>
                <button onClick={closeBarcodeModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto bg-white">
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <span>Barcode</span>
                    <span className="text-gray-900">{selectedProduct.variants?.[0]?.barcode || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <span>SKU</span>
                    <span className="text-gray-900">{selectedProduct.variants?.[0]?.sku || 'N/A'}</span>
                  </div>
                </div>

                <div className="group">
                  <label htmlFor="barcodeLabelName" className="block text-sm font-bold text-gray-700 mb-2 px-1">
                    Label Name (for printing only)
                  </label>
                  <input
                    type="text"
                    id="barcodeLabelName"
                    value={barcodeLabelName}
                    onChange={(e) => setBarcodeLabelName(e.target.value)}
                    className="block w-full px-5 py-3.5 bg-gray-50 border border-transparent focus:border-green-500 focus:bg-white rounded-2xl text-gray-900 shadow-sm transition-all duration-200 outline-none focus:ring-4 focus:ring-green-500/10"
                    placeholder="Enter label name"
                  />
                </div>

                <div className="group">
                  <label htmlFor="quantity" className="block text-sm font-bold text-gray-700 mb-2 px-1">
                    Quantity
                    <span className="text-xs font-normal text-gray-400 ml-2">(Maximum 100)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="quantity"
                      min="1"
                      max="100"
                      value={barcodeQuantity}
                      onChange={(e) => setBarcodeQuantity(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                      className="block w-full px-5 py-3.5 bg-gray-50 border border-transparent focus:border-green-500 focus:bg-white rounded-2xl text-gray-900 shadow-sm transition-all duration-200 outline-none focus:ring-4 focus:ring-green-500/10"
                      placeholder="Number of labels"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 uppercase">Labels</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 bg-gray-50/80 rounded-b-3xl border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeBarcodeModal}
                  className="px-6 py-3 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-2xl hover:bg-gray-100 active:scale-95 transition-all focus:ring-2 focus:ring-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={printBarcodes}
                  className="px-8 py-3 text-sm font-bold text-white bg-gradient-to-r from-green-600 to-green-700 rounded-2xl hover:shadow-xl hover:shadow-green-600/30 active:scale-[0.97] transition-all flex items-center justify-center min-w-[160px]"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print {barcodeQuantity} Label{barcodeQuantity !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
