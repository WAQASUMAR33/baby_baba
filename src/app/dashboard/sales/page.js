"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import LoadingSpinner from "@/components/LoadingSpinner"

export default function SalesPage() {
  const [sales, setSales] = useState([])
  const [posSales, setPosSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pos') // 'promotions' or 'pos'
  const [selectedSale, setSelectedSale] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [stats, setStats] = useState({ totalSales: 0, totalRevenue: 0, totalDiscount: 0, totalCommission: 0 })

  // Date filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [employees, setEmployees] = useState([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)

  useEffect(() => {
    fetchSales()
    fetchPosSales()
    fetchEmployees()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const fetchSales = async () => {
    try {
      // Fetch promotions from local storage (legacy)
      const savedSales = localStorage.getItem('store_sales')
      if (savedSales) {
        setSales(JSON.parse(savedSales))
      }
    } catch (error) {
      console.error('Error fetching sales:', error)
    }
  }

  const fetchPosSales = async () => {
    try {
      setLoading(true)

      // Build query params
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (employeeId) params.append('employeeId', employeeId)

      const response = await fetch(`/api/sales?${params}`)
      const data = await response.json()

      if (data.success) {
        setPosSales(data.sales || [])
        setStats(data.stats || { totalSales: 0, totalRevenue: 0, totalDiscount: 0, totalCommission: 0 })
      }
    } catch (error) {
      console.error('Error fetching POS sales:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateFilter = () => {
    fetchPosSales()
  }

  const clearDateFilter = () => {
    setStartDate('')
    setEndDate('')
    setEmployeeId('')
    // Fetch all sales after clearing
    setTimeout(() => fetchPosSales(), 100)
  }

  const viewSaleDetails = (sale) => {
    console.log('=== View Sale Details ===')
    console.log('Sale object:', sale)
    console.log('Sale ID:', sale.id)
    console.log('Items:', sale.items)
    console.log('Items length:', sale.items?.length)
    console.log('Setting showDetailsModal to true...')
    setSelectedSale(sale)
    setShowDetailsModal(true)
    console.log('Modal should now be visible')
    console.log('========================')
  }

  const closeDetailsModal = () => {
    setShowDetailsModal(false)
    setSelectedSale(null)
  }

  const printReceipt = () => {
    if (!selectedSale) return

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=80mm,height=auto')

    if (!printWindow) {
      alert('Please allow popups to print the receipt')
      return
    }

    // Generate receipt HTML
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt #${selectedSale.id}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
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
            <img src="/babybazar.png" alt="Baby Bazar Logo" style="height: 60px; margin-bottom: 8px;">
            <h1 style="text-transform: uppercase;">Baby Bazar</h1>
            <p>Post Office Road Mandi Bahauddin</p>
            <p>Ph : 0347-943-2880</p>
          </div>

          <!-- Receipt Info -->
          <div class="print-section">
            <div>
              <strong>Receipt #:</strong>
              <span>${selectedSale.id || 'N/A'}</span>
            </div>
            <div>
              <strong>Date:</strong>
              <span>${selectedSale.createdAt ? new Date(selectedSale.createdAt).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'N/A'}</span>
            </div>
            <div>
              <strong>Customer:</strong>
              <span>${selectedSale.customerName || 'Walk-in'}</span>
            </div>
            ${selectedSale.customerPhone ? `
            <div>
              <strong>Phone:</strong>
              <span>${selectedSale.customerPhone}</span>
            </div>
            ` : ''}
            <div>
              <strong>Cashier:</strong>
              <span>${selectedSale.userName || selectedSale.userEmail || 'N/A'}</span>
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
              ${selectedSale.items && selectedSale.items.length > 0 ? selectedSale.items.map(item => {
      const itemTotal = parseFloat(item.price || 0) * parseInt(item.quantity || 0)
      const itemDiscount = parseFloat(item.discount || 0)
      const itemNetTotal = itemTotal - itemDiscount
      return `
                <tr>
                  <td>
                    <div style="font-weight: bold;">${item.title || 'N/A'}</div>
                  </td>
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
                  <td colspan="5" style="text-align: center; padding: 8px 0;">
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
              <span>${formatCurrency(selectedSale.subtotal || 0)}</span>
            </div>
            ${(() => {
        const itemDiscounts = selectedSale.items?.reduce((sum, item) => sum + parseFloat(item.discount || 0), 0) || 0
        return itemDiscounts > 0 ? `
              <div>
                <span>Item Discounts:</span>
                <span>-${formatCurrency(itemDiscounts)}</span>
              </div>
              ` : ''
      })()}
            ${parseFloat(selectedSale.discount || 0) > 0 ? `
            <div>
              <span>Bill Discount:</span>
              <span>-${formatCurrency(selectedSale.discount)}</span>
            </div>
            ` : ''}
            <div class="print-total">
              <span>TOTAL:</span>
              <span>${formatCurrency(selectedSale.total || 0)}</span>
            </div>
          </div>

          <div class="print-divider"></div>

          <!-- Payment Info -->
          <div class="print-section">
            <div>
              <span>Payment Method:</span>
              <span style="text-transform: capitalize;">${selectedSale.paymentMethod || 'N/A'}</span>
            </div>
            <div>
              <span>Amount Received:</span>
              <span>${formatCurrency(selectedSale.amountReceived || 0)}</span>
            </div>
            ${parseFloat(selectedSale.change || 0) > 0 ? `
            <div style="font-weight: bold;">
              <span>Change:</span>
              <span>${formatCurrency(selectedSale.change)}</span>
            </div>
            ` : ''}
          </div>

          <div class="print-divider"></div>

          <!-- Footer -->
          <div class="print-footer">
            <p style="margin: 4px 0; font-weight: bold;">Thank you for your purchase!</p>
            <p style="margin: 4px 0;">we look forward to seeing you soon</p>
            <p style="margin: 8px 0 0 0; font-size: 7pt;">Powered by Baby Baba POS</p>
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

  const formatCurrency = (amount) => {
    return `Rs ${parseFloat(amount).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const deleteSale = (id) => {
    if (confirm('Are you sure you want to delete this sale?')) {
      const updatedSales = sales.filter(sale => sale.id !== id)
      setSales(updatedSales)
      localStorage.setItem('store_sales', JSON.stringify(updatedSales))
    }
  }

  const toggleSaleStatus = (id) => {
    const updatedSales = sales.map(sale =>
      sale.id === id
        ? { ...sale, status: sale.status === 'active' ? 'paused' : 'active' }
        : sale
    )
    setSales(updatedSales)
    localStorage.setItem('store_sales', JSON.stringify(updatedSales))
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <LoadingSpinner size="lg" text="Loading sales data..." />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sales</h1>
            <p className="mt-2 text-sm text-gray-600">
              View and manage sales transactions
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchPosSales}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <Link
              href="/dashboard/sales/create"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Sale (POS)
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('pos')}
              className={`${activeTab === 'pos'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              POS Sales ({posSales.length})
            </button>
            <button
              onClick={() => setActiveTab('promotions')}
              className={`${activeTab === 'promotions'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Promotions ({sales.length})
            </button>
          </nav>
        </div>
      </div>

      {/* POS Sales Tab */}
      {activeTab === 'pos' && (
        <>
          {/* Date Range Filter */}
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col md:flex-row md:items-end md:space-x-4 space-y-4 md:space-y-0">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee
                </label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Employees</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={handleDateFilter}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filter
                </button>

                {(startDate || endDate) && (
                  <button
                    onClick={clearDateFilter}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Date Range Display */}
            {(startDate || endDate) && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Showing sales from:</span>{' '}
                  {startDate || '(Beginning)'} to {endDate || '(Now)'}
                </p>
              </div>
            )}
          </div>

          {/* Sales Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Sales</p>
                  <p className="text-3xl font-bold mt-2">{stats.totalSales || 0}</p>
                  <p className="text-blue-100 text-xs mt-1">Completed transactions</p>
                </div>
                <div className="bg-blue-400 bg-opacity-30 rounded-full p-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Total Revenue</p>
                  <p className="text-3xl font-bold mt-2">
                    {formatCurrency(stats.totalRevenue || 0)}
                  </p>
                  <p className="text-green-100 text-xs mt-1">Gross income</p>
                </div>
                <div className="bg-green-400 bg-opacity-30 rounded-full p-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm font-medium">Total Discounts</p>
                  <p className="text-3xl font-bold mt-2">
                    {formatCurrency(stats.totalDiscount || 0)}
                  </p>
                  <p className="text-yellow-100 text-xs mt-1">Given to customers</p>
                </div>
                <div className="bg-yellow-400 bg-opacity-30 rounded-full p-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Total Commission</p>
                  <p className="text-3xl font-bold mt-2">
                    {formatCurrency(stats.totalCommission || 0)}
                  </p>
                  <p className="text-purple-100 text-xs mt-1">Earnings for selected period</p>
                </div>
                <div className="bg-purple-400 bg-opacity-30 rounded-full p-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* POS Sales List */}
          {posSales.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No sales yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start selling products using the POS system
              </p>
              <div className="mt-6">
                <Link
                  href="/dashboard/sales/create"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Create First Sale
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sale #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Commission
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {posSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{sale.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(sale.createdAt).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sale.customerName || 'Walk-in'}
                          {sale.customerPhone && (
                            <div className="text-xs text-gray-400">{sale.customerPhone}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sale.employeeName || '-'}
                          {sale.employeeId && (
                            <div className="text-xs text-gray-400">ID: {sale.employeeId}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sale.items?.length || 0} items
                          <button
                            onClick={() => viewSaleDetails(sale)}
                            className="ml-2 text-indigo-600 hover:text-indigo-900 text-xs font-medium underline"
                          >
                            View Details
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                            {sale.paymentMethod}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          Rs {parseFloat(sale.total).toFixed(2)}
                          {parseFloat(sale.discount) > 0 && (
                            <div className="text-xs text-green-600">
                              -{parseFloat(sale.discount).toFixed(2)} discount
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {sale.commission ? (
                            <span className="font-medium text-purple-600">
                              Rs {parseFloat(sale.commission).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${sale.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : sale.status === 'refunded'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                            }`}>
                            {sale.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Promotions Tab */}
      {activeTab === 'promotions' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Sales</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {sales.filter(s => s.status === 'active').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-100 rounded-lg p-3">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Scheduled</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {sales.filter(s => s.status === 'scheduled').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900">{sales.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sales List */}
          {sales.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No sales yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first sale or promotion
              </p>
              <div className="mt-6">
                <Link
                  href="/dashboard/sales/create"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Sale
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sale Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Discount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Products
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{sale.name}</div>
                            <div className="text-sm text-gray-500">{sale.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-red-600">
                          {sale.discountType === 'percentage'
                            ? `${sale.discountValue}% OFF`
                            : `Rs ${sale.discountValue} OFF`
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {sale.applyTo === 'all' ? 'All Products' : `${sale.productIds?.length || 0} products`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{new Date(sale.startDate).toLocaleDateString()}</div>
                        <div>to {new Date(sale.endDate).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sale.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : sale.status === 'scheduled'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                          }`}>
                          {sale.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => toggleSaleStatus(sale.id)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          {sale.status === 'active' ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          onClick={() => deleteSale(sale.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Sale Details Modal */}
      {showDetailsModal && selectedSale && (
        <>
          {/* Print Styles for 80mm Thermal Receipt Printer */}
          <style>{`
            @media print {
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              
              body * { 
                visibility: hidden !important; 
              }
              
              #printable-receipt {
                display: block !important;
                visibility: visible !important;
                position: absolute;
                left: 0;
                top: 0;
                width: 80mm;
                max-width: 80mm;
                margin: 0;
                padding: 5mm;
                font-family: 'Courier New', Courier, monospace;
                font-size: 10pt;
                line-height: 1.2;
                color: #000;
                background: #fff;
              }
              
              #printable-receipt * { 
                visibility: visible !important; 
              }
              
              .no-print { 
                display: none !important; 
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
                border-bottom: none;
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
                font-size: 9pt;
                margin: 8px 0;
                border-collapse: collapse;
              }
              
              .print-table th {
                text-align: left;
                padding: 4px 0;
                border-bottom: 1px solid #000;
                font-weight: bold;
                font-size: 8pt;
              }
              
              .print-table td {
                padding: 3px 0;
                border-bottom: 1px dotted #999;
                font-size: 9pt;
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
              }
              
              .print-footer {
                text-align: center;
                margin-top: 12px;
                font-size: 8pt;
                border-top: 1px dashed #000;
                padding-top: 8px;
              }
              
              @page {
                size: 80mm auto;
                margin: 0;
                padding: 0;
              }
              
              @media print {
                html, body {
                  width: 80mm;
                  margin: 0;
                  padding: 0;
                }
              }
            }
          `}</style>

          <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-[10000]"
              aria-hidden="true"
              onClick={closeDetailsModal}
            ></div>

            {/* Modal container */}
            <div className="flex items-center justify-center min-h-screen px-4 py-4 relative z-[10001]">
              {/* Modal panel */}
              <div className="bg-white rounded-lg text-left overflow-hidden shadow-xl w-full max-w-4xl my-8" style={{ position: 'relative', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div className="bg-indigo-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Sale Receipt #{selectedSale?.id || 'N/A'}
                      </h3>
                      <p className="text-sm text-indigo-100 mt-1">
                        {selectedSale?.createdAt ? new Date(selectedSale.createdAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : 'Date not available'}
                      </p>
                    </div>
                    <button
                      onClick={closeDetailsModal}
                      className="text-white hover:text-indigo-100"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Printable Receipt (Hidden on screen, visible when printing) */}
                <div id="printable-receipt" style={{ display: 'none' }}>
                  {/* Header */}
                  <div className="print-logo">
                    <h1>BABY BABA</h1>
                    <p>Point of Sale System</p>
                  </div>

                  {/* Receipt Info */}
                  <div className="print-section">
                    <div>
                      <strong>Receipt #:</strong>
                      <span>{selectedSale?.id || 'N/A'}</span>
                    </div>
                    <div>
                      <strong>Date:</strong>
                      <span>{selectedSale?.createdAt ? new Date(selectedSale.createdAt).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'N/A'}</span>
                    </div>
                    <div>
                      <strong>Customer:</strong>
                      <span>{selectedSale?.customerName || 'Walk-in'}</span>
                    </div>
                    {selectedSale?.customerPhone && (
                      <div>
                        <strong>Phone:</strong>
                        <span>{selectedSale.customerPhone}</span>
                      </div>
                    )}
                    <div>
                      <strong>Cashier:</strong>
                      <span>{selectedSale?.userName || selectedSale?.userEmail || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="print-divider"></div>

                  {/* Items Table */}
                  <table className="print-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th className="text-center">Qty</th>
                        <th className="text-right">Price</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSale?.items && selectedSale.items.length > 0 ? selectedSale.items.map((item, index) => (
                        <tr key={index}>
                          <td>
                            <div style={{ fontWeight: 'bold' }}>{item.title || 'N/A'}</div>
                            {item.sku && <div style={{ fontSize: '8pt' }}>SKU: {item.sku}</div>}
                          </td>
                          <td className="text-center">{item.quantity || 0}</td>
                          <td className="text-right">{formatCurrency(item.price || 0)}</td>
                          <td className="text-right" style={{ fontWeight: 'bold' }}>
                            {formatCurrency(parseFloat(item.price || 0) * parseInt(item.quantity || 0))}
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', padding: '8px 0' }}>
                            No items
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <div className="print-divider"></div>

                  {/* Totals */}
                  <div className="print-section">
                    <div>
                      <span>Subtotal:</span>
                      <span>{formatCurrency(selectedSale?.subtotal || 0)}</span>
                    </div>
                    {parseFloat(selectedSale?.discount || 0) > 0 && (
                      <div>
                        <span>Discount:</span>
                        <span>-{formatCurrency(selectedSale.discount)}</span>
                      </div>
                    )}
                    <div className="print-total" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>TOTAL:</span>
                      <span>{formatCurrency(selectedSale?.total || 0)}</span>
                    </div>
                  </div>

                  <div className="print-divider"></div>

                  {/* Payment Info */}
                  <div className="print-section">
                    <div>
                      <span>Payment Method:</span>
                      <span style={{ textTransform: 'capitalize' }}>{selectedSale?.paymentMethod || 'N/A'}</span>
                    </div>
                    <div>
                      <span>Amount Received:</span>
                      <span>{formatCurrency(selectedSale?.amountReceived || 0)}</span>
                    </div>
                    {parseFloat(selectedSale?.change || 0) > 0 && (
                      <div style={{ fontWeight: 'bold' }}>
                        <span>Change:</span>
                        <span>{formatCurrency(selectedSale.change)}</span>
                      </div>
                    )}
                  </div>

                  <div className="print-divider"></div>

                  {/* Footer */}
                  <div className="print-footer">
                    <p style={{ margin: '4px 0', fontWeight: 'bold' }}>Thank you for your purchase!</p>
                    <p style={{ margin: '4px 0' }}>Visit us again soon</p>
                    <p style={{ margin: '4px 0' }}>For queries: +92 XXX XXXXXXX</p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '7pt' }}>Powered by Baby Baba POS</p>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-4 overflow-y-auto" style={{ flex: '1', minHeight: 0 }}>
                  {!selectedSale ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Loading sale details...</p>
                    </div>
                  ) : (
                    <>
                      {/* Sale Info Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Customer Information */}
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Customer Information
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Name:</span>
                              <span className="font-medium text-gray-900">{selectedSale.customerName || 'Walk-in Customer'}</span>
                            </div>
                            {selectedSale.customerPhone && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Phone:</span>
                                <span className="font-medium text-gray-900">{selectedSale.customerPhone}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-600">Served by:</span>
                              <span className="font-medium text-gray-900">{selectedSale.userName || selectedSale.userEmail}</span>
                            </div>
                          </div>
                        </div>

                        {/* Payment Information */}
                        <div className="bg-green-50 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Payment Information
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Method:</span>
                              <span className="font-medium text-gray-900 capitalize">{selectedSale.paymentMethod}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Amount Received:</span>
                              <span className="font-medium text-gray-900">{formatCurrency(selectedSale.amountReceived)}</span>
                            </div>
                            {parseFloat(selectedSale.change) > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Change:</span>
                                <span className="font-medium text-gray-900">{formatCurrency(selectedSale.change)}</span>
                              </div>
                            )}
                            <div className="flex justify-between pt-2 border-t border-green-200">
                              <span className="text-gray-600">Status:</span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${selectedSale.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : selectedSale.status === 'refunded'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                                }`}>
                                {selectedSale.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Items Table */}
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                          Items Purchased ({selectedSale.items?.length || 0})
                        </h4>
                        {(!selectedSale.items || selectedSale.items.length === 0) ? (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                            <p className="text-sm text-yellow-800">No items found for this sale</p>
                          </div>
                        ) : (
                          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {selectedSale.items.map((item, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                      <div className="flex items-center">
                                        {item.image && (
                                          <img
                                            src={item.image}
                                            alt={item.title}
                                            className="w-12 h-12 rounded object-cover mr-3"
                                          />
                                        )}
                                        <div>
                                          <div className="text-sm font-medium text-gray-900">{item.title}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{item.sku || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(item.price)}</td>
                                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{item.quantity}</td>
                                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                      {formatCurrency(parseFloat(item.price) * parseInt(item.quantity))}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Totals */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-medium text-gray-900">{formatCurrency(selectedSale.subtotal)}</span>
                          </div>
                          {parseFloat(selectedSale.discount) > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Discount:</span>
                              <span className="font-medium text-green-600">-{formatCurrency(selectedSale.discount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                            <span className="text-gray-900">Total:</span>
                            <span className="text-indigo-600">{formatCurrency(selectedSale.total)}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                  <button
                    onClick={printReceipt}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Receipt
                  </button>
                  <button
                    onClick={closeDetailsModal}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

