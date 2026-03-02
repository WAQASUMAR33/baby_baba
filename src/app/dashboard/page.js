"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"

export default function DashboardPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    totalProducts: 0,
  })
  const [loadingStats, setLoadingStats] = useState(true)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const loadStats = async (start, end) => {
    setLoadingStats(true)
    try {
      const salesParams = new URLSearchParams({ limit: "1", offset: "0" })
      if (start) salesParams.set("startDate", start)
      if (end) salesParams.set("endDate", end)

      const expenseParams = new URLSearchParams({ limit: "1" })
      if (start) expenseParams.set("startDate", start)
      if (end) expenseParams.set("endDate", end)

      const [salesRes, expensesRes, productsRes] = await Promise.all([
        fetch(`/api/sales?${salesParams}`),
        fetch(`/api/expenses?${expenseParams}`),
        fetch("/api/products?limit=1"),
      ])
      const salesData = salesRes.ok ? await salesRes.json() : null
      const expensesData = expensesRes.ok ? await expensesRes.json() : null
      const productsData = productsRes.ok ? await productsRes.json() : null

      setStats({
        totalOrders: salesData?.stats?.totalSales || 0,
        totalRevenue: salesData?.stats?.totalRevenue || 0,
        totalExpenses: expensesData?.stats?.totalAmount || 0,
        totalProducts: productsData?.total || 0,
      })
    } catch (error) {
      setStats({ totalOrders: 0, totalRevenue: 0, totalExpenses: 0, totalProducts: 0 })
    } finally {
      setLoadingStats(false)
    }
  }

  useEffect(() => {
    loadStats("", "")
  }, [])

  const handleFilter = () => {
    loadStats(startDate, endDate)
  }

  const handleClear = () => {
    setStartDate("")
    setEndDate("")
    loadStats("", "")
  }

  const formatCurrency = (amount) => {
    return `Rs ${Number(amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">
          Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}!
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Here&apos;s what&apos;s happening with your account.
        </p>
      </div>

      {/* Date Range Filter */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-end md:space-x-4 space-y-3 md:space-y-0">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleFilter}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Apply
            </button>
            {(startDate || endDate) && (
              <button
                onClick={handleClear}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        {(startDate || endDate) && (
          <p className="mt-2 text-xs text-blue-700 bg-blue-50 px-3 py-1 rounded">
            Showing statistics from {startDate || "beginning"} to {endDate || "now"}
          </p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {loadingStats ? "--" : stats.totalOrders}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Revenue</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {loadingStats ? "--" : formatCurrency(stats.totalRevenue)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Expenses</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {loadingStats ? "--" : formatCurrency(stats.totalExpenses)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Products</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {loadingStats ? "--" : stats.totalProducts}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Activity</h3>
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No activity</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new item.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
