"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import JsBarcode from "jsbarcode"
import LoadingSpinner from "@/components/LoadingSpinner"

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredProducts, setFilteredProducts] = useState([])

  // Filter states
  const [statusFilter, setStatusFilter] = useState("all")
  const [stockFilter, setStockFilter] = useState("all")
  const [vendorFilter, setVendorFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [categories, setCategories] = useState([])

  // Barcode print states
  const [showBarcodeModal, setShowBarcodeModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [barcodeQuantity, setBarcodeQuantity] = useState(1)
  const [barcodeLabelName, setBarcodeLabelName] = useState("")

  // Sync state
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [syncProgress, setSyncProgress] = useState({ imported: 0, failed: 0 })
  const [showSyncErrorModal, setShowSyncErrorModal] = useState(false)
  const [syncErrorMessage, setSyncErrorMessage] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 50

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  useEffect(() => {
    let filtered = [...products]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (product) =>
          product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (product.vendor && product.vendor.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (product.variants && product.variants.some(v =>
            v.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
          ))
      )
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(product => product.status === statusFilter)
    }

    // Apply stock filter
    if (stockFilter !== "all") {
      filtered = filtered.filter(product => {
        const totalStock = product.variants?.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0) || 0

        if (stockFilter === "in-stock") return totalStock > 10
        if (stockFilter === "low-stock") return totalStock > 0 && totalStock <= 10
        if (stockFilter === "out-of-stock") return totalStock === 0
        return true
      })
    }

    // Apply vendor filter
    if (vendorFilter !== "all") {
      filtered = filtered.filter(product => product.vendor === vendorFilter)
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(product => product.categoryId?.toString() === categoryFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.title.localeCompare(b.title)
        case "name-desc":
          return b.title.localeCompare(a.title)
        case "price-low":
          return (parseFloat(a.variants?.[0]?.price || 0) - parseFloat(b.variants?.[0]?.price || 0))
        case "price-high":
          return (parseFloat(b.variants?.[0]?.price || 0) - parseFloat(a.variants?.[0]?.price || 0))
        case "stock-low":
          const stockA = a.variants?.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0) || 0
          const stockB = b.variants?.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0) || 0
          return stockA - stockB
        case "stock-high":
          const stockA2 = a.variants?.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0) || 0
          const stockB2 = b.variants?.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0) || 0
          return stockB2 - stockA2
        default:
          return 0
      }
    })

    setFilteredProducts(filtered)
    setCurrentPage(1)
  }, [searchTerm, products, statusFilter, stockFilter, vendorFilter, sortBy])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [filteredProducts.length, currentPage, pageSize])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      if (data.success) {
        setCategories(data.categories)
      }
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
        // Update local state to reflect change immediately
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

  const vendors = [...new Set(products.map(p => p.vendor).filter(Boolean))]

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔄 Fetching products from Local Database...')

      const response = await fetch(`/api/products?limit=all&sortBy=${sortBy}`, {
        cache: 'no-store'
      })
      const data = await response.json()

      if (data.success) {
        console.log(`✅ Received ${data.products.length} products from local DB`)
        setProducts(data.products)
        setFilteredProducts(data.products)
      } else {
        setError(data.error || 'Failed to fetch products')
      }
    } catch (err) {
      console.error('❌ Error fetching products:', err)
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

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
      // Clear message after 5 seconds
      setTimeout(() => setSyncResult(null), 5000)
    }
  }

  const openBarcodeModal = (product) => {
    setSelectedProduct(product)
    setBarcodeQuantity(1)
    setBarcodeLabelName(product?.title || "Product")
    setShowBarcodeModal(true)
  }

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, filteredProducts.length)
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

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

    // Create a new window for printing
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

    // Generate barcode HTML
    let barcodeHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Barcode Labels - ${productTitle}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              margin: 5mm;
              font-family: Arial, sans-serif;
            }
            
            .barcode-container {
              display: inline-block;
              width: 2in;
              height: 1in;
              border: 1px solid #000;
              padding: 2mm;
              margin: 2mm;
              text-align: center;
              page-break-inside: avoid;
              box-sizing: border-box;
            }
            
            .barcode-title {
              font-size: 7pt;
              font-weight: bold;
              margin-bottom: 1mm;
              line-height: 1.1;
              word-wrap: break-word;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              max-width: 100%;
            }
            
            .barcode-svg {
              width: 100%;
              height: 20mm;
              margin: 1mm 0;
              display: block;
            }
            
            .barcode-value {
              font-size: 6pt;
              margin-top: 0.5mm;
              font-family: 'Courier New', monospace;
            }
            
            .barcode-price {
              font-size: 7pt;
              font-weight: bold;
              margin-top: 0.5mm;
            }
            
            @media print {
              @page {
                size: letter;
                margin: 5mm;
              }
              
              body {
                margin: 0;
                padding: 5mm;
              }
              
              .barcode-container {
                border: 1px solid #000;
                width: 2in;
                height: 1in;
              }
            }
          </style>
        </head>
        <body>
    `

    // Generate multiple barcode labels
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
                if (confirm('Close this window?')) {
                  window.close();
                }
              }, 2000);
            }, 250);
          };
        </script>
      </html>
    `

    // Write HTML to the new window
    printWindow.document.open()
    printWindow.document.write(barcodeHTML)
    printWindow.document.close()
    printWindow.focus()

    closeBarcodeModal()
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <LoadingSpinner size="lg" text="Loading products..." />
      </div>
    )
  }

  if (error) {
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
                <button
                  onClick={fetchProducts}
                  className="text-sm font-medium text-red-800 hover:text-red-900"
                >
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
              Manage your Shopify products ({filteredProducts.length} products)
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
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Refresh
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
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
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
            onClick={() => {
              setStatusFilter("all")
              setStockFilter("all")
              setVendorFilter("all")
              setCategoryFilter("all")
              setSortBy("name")
            }}
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
              onChange={(e) => setStatusFilter(e.target.value)}
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
              onChange={(e) => setStockFilter(e.target.value)}
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
              onChange={(e) => setVendorFilter(e.target.value)}
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
              onChange={(e) => setCategoryFilter(e.target.value)}
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
              onChange={(e) => setSortBy(e.target.value)}
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

        {/* Active Filters Display */}
        <div className="mt-4 flex flex-wrap gap-2">
          {statusFilter !== "all" && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Status: {statusFilter}
              <button
                onClick={() => setStatusFilter("all")}
                className="ml-2 hover:text-indigo-900"
              >
                ×
              </button>
            </span>
          )}
          {stockFilter !== "all" && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Stock: {stockFilter.replace("-", " ")}
              <button
                onClick={() => setStockFilter("all")}
                className="ml-2 hover:text-indigo-900"
              >
                ×
              </button>
            </span>
          )}
          {categoryFilter !== "all" && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Category: {categoryFilter === "none" ? "Uncategorized" : (categories.find(c => c.id.toString() === categoryFilter)?.name || "Unknown")}
              <button
                onClick={() => setCategoryFilter("all")}
                className="ml-2 hover:text-indigo-900"
              >
                ×
              </button>
            </span>
          )}
          {vendorFilter !== "all" && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Vendor: {vendorFilter}
              <button
                onClick={() => setVendorFilter("all")}
                className="ml-2 hover:text-indigo-900"
              >
                ×
              </button>
            </span>
          )}
          {searchTerm && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Search: &quot;{searchTerm}&quot;
              <button
                onClick={() => setSearchTerm("")}
                className="ml-2 hover:text-indigo-900"
              >
                ×
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Fetch Status Message */}
      {products.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-blue-900">
                ✅ Successfully loaded {products.length} products from your local database
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                {syncing ? 'Syncing...' : 'Sync with Shopify'}
              </button>
              <button
                onClick={fetchProducts}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Summary Dashboard */}
      {products.length > 0 && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Total Products</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{products.length}</p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">In Stock</p>
                <p className="mt-1 text-2xl font-bold text-green-600">
                  {products.filter(p => {
                    const stock = p.variants?.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0) || 0
                    return stock > 10
                  }).length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Low Stock</p>
                <p className="mt-1 text-2xl font-bold text-yellow-600">
                  {products.filter(p => {
                    const stock = p.variants?.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0) || 0
                    return stock > 0 && stock <= 10
                  }).length}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Out of Stock</p>
                <p className="mt-1 text-2xl font-bold text-red-600">
                  {products.filter(p => {
                    const stock = p.variants?.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0) || 0
                    return stock === 0
                  }).length}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{filteredProducts.length}</span> of{' '}
          <span className="font-semibold text-gray-900">{products.length}</span> products
        </div>
        {filteredProducts.length > 0 && (
          <div className="text-xs text-gray-500">
            Sorted by: {sortBy.replace("-", " ")}
          </div>
        )}
      </div>

      {/* Products Table */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? "Try adjusting your search" : "Connect your Shopify store to see products"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1}-{endIndex} of {filteredProducts.length} products
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-x-auto">
            <table className="min-w-[1200px] w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Title
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Barcode
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sale Price
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Original Price
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedProducts.map((product) => {
                const variant = product.variants?.[0]

                return (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900 line-clamp-2">
                        {product.title}
                      </div>
                      {product.tags && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {product.tags.split(',').slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {variant?.barcode || '-'}
                      </div>
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
                      <div className={`text-sm font-bold ${product.quantity <= 0 ? 'text-red-600' : product.quantity <= 10 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {product.quantity || 0}
                      </div>
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
      </div>
      )}

      {/* Refined Barcode Print Modal */}
      {showBarcodeModal && selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
          {/* Backdrop with Blur */}
          <div
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
            onClick={closeBarcodeModal}
          ></div>

          {/* Modal Card */}
          <div className="relative w-full max-w-lg mx-auto bg-white rounded-3xl shadow-2xl transform transition-all duration-300 ease-out scale-100 opacity-100 flex flex-col max-h-[90vh] z-10 overflow-hidden">
            <div className="flex flex-col h-full">
              {/* Header */}
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
                <button
                  onClick={closeBarcodeModal}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="p-8 space-y-6 overflow-y-auto bg-white">
                {/* Product Info Card */}
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
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 uppercase">
                      Labels
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
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
