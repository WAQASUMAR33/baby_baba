"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import JsBarcode from "jsbarcode"

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
  const [sortBy, setSortBy] = useState("name")
  
  // Barcode print states
  const [showBarcodeModal, setShowBarcodeModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [barcodeQuantity, setBarcodeQuantity] = useState(1)

  useEffect(() => {
    fetchProducts()
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
  }, [searchTerm, products, statusFilter, stockFilter, vendorFilter, sortBy])
  
  // Get unique vendors for filter
  const vendors = [...new Set(products.map(p => p.vendor).filter(Boolean))]

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔄 Fetching products from Shopify (newest first, limited to 2000)...')
      
      // Fetch with no-cache headers to ensure fresh data
      const response = await fetch('/api/shopify/products?maxProducts=2000&order=created_at desc', {
        cache: 'no-store', // Disable Next.js cache
        headers: {
          'Cache-Control': 'no-cache', // Disable browser cache
        }
      })
      const data = await response.json()

      if (data.success) {
        console.log(`✅ Received ${data.products.length} products (${data.order})`)
        
        if (data.limited) {
          console.warn(`⚠️ Limited to ${data.products.length} products for performance. Showing newest products first.`)
        }
        
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

  const openBarcodeModal = (product) => {
    setSelectedProduct(product)
    setBarcodeQuantity(1)
    setShowBarcodeModal(true)
  }

  const closeBarcodeModal = () => {
    setShowBarcodeModal(false)
    setSelectedProduct(null)
    setBarcodeQuantity(1)
  }

  const printBarcodes = () => {
    if (!selectedProduct) return

    const variant = selectedProduct.variants?.[0]
    const barcodeValue = variant?.barcode || variant?.sku || selectedProduct.id.toString()
    const productTitle = (selectedProduct.title || 'Product').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    const productPrice = variant?.price ? `Rs ${parseFloat(variant.price).toLocaleString('en-PK', { minimumFractionDigits: 0 })}` : ''
    
    // Determine barcode type
    const barcodeType = barcodeValue.length <= 8 ? 'EAN8' : barcodeValue.length <= 13 ? 'EAN13' : 'CODE128'
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    
    if (!printWindow) {
      alert('Please allow popups to print barcodes')
      return
    }

    // Escape barcode value for JavaScript
    const escapedBarcodeValue = barcodeValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "\\'")

    // Generate barcode HTML
    let barcodeHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode Labels - ${productTitle}</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js" onerror="window.barcodeLoadError = true;"></script>
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
      const barcodeId = `barcode-${i}`
      barcodeHTML += `
        <div class="barcode-container">
          <div class="barcode-title">${productTitle}</div>
          <svg id="${barcodeId}" class="barcode-svg"></svg>
          <div class="barcode-value">${barcodeValue}</div>
          ${productPrice ? `<div class="barcode-price">${productPrice}</div>` : ''}
        </div>
      `
    }

    barcodeHTML += `
        </body>
        <script>
          (function() {
            let retryCount = 0;
            const maxRetries = 20; // 4 seconds max wait (20 * 200ms)
            
            // Wait for JsBarcode to load and DOM to be ready
            function generateBarcodes() {
              const barcodeValue = "${escapedBarcodeValue}";
              const barcodeType = "${barcodeType}";
              const quantity = ${barcodeQuantity};
              
              // Check if script failed to load
              if (window.barcodeLoadError) {
                console.error('Failed to load JsBarcode library from CDN');
                document.body.innerHTML = '<div style="padding: 20px; text-align: center;"><h2>Error Loading Barcode Library</h2><p>Please check your internet connection and try again.</p></div>';
                return;
              }
              
              // Check if JsBarcode is loaded
              if (typeof JsBarcode === 'undefined') {
                retryCount++;
                if (retryCount < maxRetries) {
                  console.log('Waiting for JsBarcode library to load... (' + retryCount + '/' + maxRetries + ')');
                  setTimeout(generateBarcodes, 200);
                  return;
                } else {
                  console.error('JsBarcode library failed to load after ' + maxRetries + ' attempts');
                  document.body.innerHTML = '<div style="padding: 20px; text-align: center;"><h2>Error: Barcode Library Timeout</h2><p>Please refresh and try again.</p></div>';
                  return;
                }
              }
              
              console.log('JsBarcode loaded, generating barcodes...');
              console.log('Barcode value:', barcodeValue);
              console.log('Barcode type:', barcodeType);
              console.log('Quantity:', quantity);
              
              let generatedCount = 0;
              
              // Generate barcodes
              for (let i = 0; i < quantity; i++) {
                const barcodeId = "barcode-" + i;
                const svg = document.getElementById(barcodeId);
                
                if (svg) {
                  console.log('Generating barcode for:', barcodeId);
                  try {
                    // Try the specified format first
                    JsBarcode(svg, barcodeValue, {
                      format: barcodeType,
                      width: 1.5,
                      height: 30,
                      displayValue: false,
                      margin: 2,
                      background: '#ffffff',
                      lineColor: '#000000'
                    });
                    generatedCount++;
                    console.log('Barcode generated successfully with format:', barcodeType);
                  } catch (e) {
                    console.warn('Barcode generation error with format ' + barcodeType + ', trying CODE128:', e);
                    // Fallback to CODE128 which supports alphanumeric
                    try {
                      JsBarcode(svg, barcodeValue, {
                        format: 'CODE128',
                        width: 1.5,
                        height: 30,
                        displayValue: false,
                        margin: 2,
                        background: '#ffffff',
                        lineColor: '#000000'
                      });
                      generatedCount++;
                      console.log('Barcode generated successfully with CODE128');
                    } catch (e2) {
                      console.error('Barcode generation failed:', e2);
                      svg.innerHTML = '<text x="50%" y="50%" text-anchor="middle" font-size="8" fill="red">Error: ' + e2.message + '</text>';
                    }
                  }
                } else {
                  console.error('SVG element not found:', barcodeId);
                }
              }
              
              console.log('Generated ' + generatedCount + ' barcodes out of ' + quantity);
              
              if (generatedCount === 0) {
                alert('Failed to generate any barcodes. Please check the console for errors.');
                return;
              }
              
              // Auto-print after barcodes are generated (wait a bit longer to ensure rendering)
              setTimeout(function() {
                console.log('Triggering print...');
                window.print();
                // Don't auto-close, let user close manually after printing
                setTimeout(function() {
                  if (confirm('Close this window?')) {
                    window.close();
                  }
                }, 2000);
              }, 1000);
            }
            
            // Wait for script to load first
            if (document.readyState === 'loading') {
              window.addEventListener('DOMContentLoaded', function() {
                console.log('DOM loaded, waiting for JsBarcode...');
                setTimeout(generateBarcodes, 300);
              });
            } else {
              // DOM already loaded
              console.log('DOM already loaded, waiting for JsBarcode...');
              setTimeout(generateBarcodes, 300);
            }
            
            // Also listen for window load event
            window.addEventListener('load', function() {
              console.log('Window loaded, checking JsBarcode...');
              if (typeof JsBarcode !== 'undefined') {
                generateBarcodes();
              }
            });
          })();
        </script>
      </html>
    `

    // Write HTML to the new window
    printWindow.document.write(barcodeHTML)
    printWindow.document.close()
    
    closeBarcodeModal()
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading products...</p>
          </div>
        </div>
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
              onClick={fetchProducts}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <Link
              href="/dashboard/products/add"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Product
            </Link>
          </div>
        </div>

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

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
          <button
            onClick={() => {
              setStatusFilter("all")
              setStockFilter("all")
              setVendorFilter("all")
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
                ✅ Successfully loaded {products.length} products (newest first) from your Shopify store
              </span>
            </div>
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
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-x-auto">
          <table className="min-w-[1200px] w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Details
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU / Barcode
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pricing
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Inventory Stock
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Info
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const variant = product.variants?.[0]
                const totalStock = product.variants?.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0) || 0
                const isLowStock = totalStock > 0 && totalStock <= 10
                const isOutOfStock = totalStock === 0

                return (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-16 w-16">
                          {product.image?.src || product.images?.[0]?.src ? (
                            <img
                              src={product.image?.src || product.images[0]?.src}
                              alt={product.title}
                              className="h-16 w-16 rounded-lg object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="ml-4 max-w-md">
                          <div className="text-sm font-semibold text-gray-900 line-clamp-2">
                            {product.title}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            <span className="font-medium">Vendor:</span> {product.vendor || 'No vendor'}
                          </div>
                          {product.product_type && (
                            <div className="text-xs text-gray-500">
                              <span className="font-medium">Type:</span> {product.product_type}
                            </div>
                          )}
                          {product.variants && product.variants.length > 1 && (
                            <div className="text-xs text-indigo-600 font-medium mt-1">
                              {product.variants.length} variants
                            </div>
                          )}
                          {product.tags && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {product.tags.split(',').slice(0, 3).map((tag, idx) => (
                                <span key={idx} className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                                  {tag.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {variant?.sku || '-'}
                      </div>
                      {variant?.barcode && (
                        <div className="text-xs text-gray-500 mt-1">
                          {variant.barcode}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="text-base font-bold text-gray-900">
                          Rs {parseFloat(variant?.price || 0).toLocaleString('en-PK', { minimumFractionDigits: 0 })}
                        </div>
                        {variant?.compare_at_price && parseFloat(variant.compare_at_price) > parseFloat(variant.price) && (
                          <>
                            <div className="text-xs text-gray-500 line-through">
                              Rs {parseFloat(variant.compare_at_price).toLocaleString('en-PK', { minimumFractionDigits: 0 })}
                            </div>
                            <div className="inline-block px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-800 rounded">
                              {Math.round(((parseFloat(variant.compare_at_price) - parseFloat(variant.price)) / parseFloat(variant.compare_at_price)) * 100)}% OFF
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        {/* Check if inventory tracking is enabled */}
                        {variant?.inventory_management === null ? (
                          <div className="text-center py-2">
                            <div className="inline-flex items-center px-3 py-2 bg-gray-100 rounded-lg">
                              <svg className="w-5 h-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div className="text-left">
                                <div className="text-sm font-medium text-gray-900">Not Tracked</div>
                                <div className="text-xs text-gray-500">Enable in Shopify</div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Main Stock Display */}
                            <div className="flex items-center space-x-2">
                              <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                                isOutOfStock 
                                  ? 'bg-red-100'
                                  : isLowStock
                                  ? 'bg-yellow-100'
                                  : 'bg-green-100'
                              }`}>
                                {isOutOfStock ? (
                                  <svg className={`w-5 h-5 text-red-600`} fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                ) : isLowStock ? (
                                  <svg className={`w-5 h-5 text-yellow-600`} fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className={`w-5 h-5 text-green-600`} fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div>
                                <div className={`text-2xl font-bold ${
                                  isOutOfStock 
                                    ? 'text-red-600'
                                    : isLowStock
                                    ? 'text-yellow-600'
                                    : 'text-green-600'
                                }`}>
                                  {totalStock >= 0 ? totalStock : 0}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {isOutOfStock ? 'Out of stock' : isLowStock ? 'Low stock' : 'In stock'}
                                </div>
                              </div>
                            </div>
                            
                            {/* Variant Stock Breakdown */}
                            {product.variants && product.variants.length > 1 && (
                              <div className="pl-12">
                                <div className="text-xs text-gray-500 space-y-1">
                                  {product.variants.slice(0, 3).map((v, idx) => {
                                    const vStock = v.inventory_quantity >= 0 ? v.inventory_quantity : 0
                                    return (
                                      <div key={idx} className="flex justify-between items-center">
                                        {v.title !== 'Default Title' && (
                                          <>
                                            <span className="text-gray-700 truncate max-w-[120px]">{v.title}:</span>
                                            <span className={`font-semibold ml-2 ${
                                              vStock === 0 
                                                ? 'text-red-600' 
                                                : vStock <= 5 
                                                ? 'text-yellow-600' 
                                                : 'text-green-600'
                                            }`}>
                                              {vStock}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    )
                                  })}
                                  {product.variants.length > 3 && (
                                    <div className="text-indigo-600 font-medium">+{product.variants.length - 3} more</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        {/* Status Badge */}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          product.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : product.status === 'draft'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {product.status || 'draft'}
                        </span>
                        
                        {/* Additional Info */}
                        <div className="text-xs text-gray-500 space-y-1">
                          {product.created_at && (
                            <div>
                              <span className="font-medium">Created:</span> {new Date(product.created_at).toLocaleDateString('en-PK')}
                            </div>
                          )}
                          {product.images && product.images.length > 0 && (
                            <div>
                              <span className="font-medium">Images:</span> {product.images.length}
                            </div>
                          )}
                          {product.options && product.options.length > 0 && (
                            <div>
                              <span className="font-medium">Options:</span> {product.options.length}
                            </div>
                          )}
                        </div>
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
                        <a
                          href={`https://${process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || 'your-store.myshopify.com'}/admin/products/${product.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-900 font-medium inline-flex items-center"
                        >
                          View
                          <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Barcode Print Modal */}
      {showBarcodeModal && selectedProduct && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={closeBarcodeModal}
            ></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Print Barcode Labels
                    </h3>
                    <div className="mt-4">
                      <div className="mb-4">
                        <p className="text-sm text-gray-500 mb-2">
                          <strong>Product:</strong> {selectedProduct.title}
                        </p>
                        {selectedProduct.variants?.[0]?.barcode && (
                          <p className="text-sm text-gray-500 mb-2">
                            <strong>Barcode:</strong> {selectedProduct.variants[0].barcode}
                          </p>
                        )}
                        {selectedProduct.variants?.[0]?.sku && (
                          <p className="text-sm text-gray-500 mb-2">
                            <strong>SKU:</strong> {selectedProduct.variants[0].sku}
                          </p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity (Number of labels to print)
                        </label>
                        <input
                          type="number"
                          id="quantity"
                          min="1"
                          max="100"
                          value={barcodeQuantity}
                          onChange={(e) => setBarcodeQuantity(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Enter quantity"
                        />
                        <p className="mt-2 text-xs text-gray-500">
                          Enter the number of barcode labels you want to print (1-100)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={printBarcodes}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Print {barcodeQuantity} Label{barcodeQuantity !== 1 ? 's' : ''}
                </button>
                <button
                  type="button"
                  onClick={closeBarcodeModal}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

