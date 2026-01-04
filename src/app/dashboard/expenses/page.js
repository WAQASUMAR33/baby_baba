"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { formatPKR } from "@/lib/currency"

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([])
  const [expenseTitles, setExpenseTitles] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalExpenses: 0, totalAmount: 0 })
  const [titleBreakdown, setTitleBreakdown] = useState([])
  
  // Date filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [titleFilter, setTitleFilter] = useState('')

  useEffect(() => {
    fetchExpenseTitles()
    fetchExpenses()
  }, [])

  const fetchExpenseTitles = async () => {
    try {
      const response = await fetch('/api/expenses/titles')
      const data = await response.json()
      
      if (data.success) {
        setExpenseTitles(data.titles || [])
      }
    } catch (error) {
      console.error('Error fetching expense titles:', error)
    }
  }

  const fetchExpenses = async () => {
    try {
      setLoading(true)
      
      // Build query params
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (titleFilter) params.append('exp_title_id', titleFilter)
      
      const response = await fetch(`/api/expenses?${params}`)
      const data = await response.json()

      if (data.success) {
        setExpenses(data.expenses || [])
        setStats(data.stats || { totalExpenses: 0, totalAmount: 0 })
        setTitleBreakdown(data.titleBreakdown || [])
      }
    } catch (error) {
      console.error('Error fetching expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateFilter = () => {
    fetchExpenses()
  }

  const clearFilters = () => {
    setStartDate('')
    setEndDate('')
    setTitleFilter('')
    setTimeout(() => fetchExpenses(), 100)
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading expenses...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
            <p className="mt-2 text-sm text-gray-600">
              Track and manage business expenses
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchExpenses}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <Link
              href="/dashboard/expenses/add"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Expense
            </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
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
              Expense Title
            </label>
            <select
              value={titleFilter}
              onChange={(e) => setTitleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Titles</option>
              {expenseTitles.map((title) => (
                <option key={title.id} value={title.id}>
                  {title.exp_title}
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
            
            {(startDate || endDate || titleFilter) && (
              <button
                onClick={clearFilters}
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
        
        {/* Active filters indicator */}
        {(startDate || endDate || titleFilter) && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Active Filters:</span>{' '}
              {startDate && `From: ${startDate}`}
              {endDate && ` To: ${endDate}`}
              {titleFilter && ` Title: ${expenseTitles.find(t => t.id === parseInt(titleFilter))?.exp_title}`}
            </p>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Total Expenses</p>
              <p className="text-4xl font-bold mt-2">{stats.totalExpenses || 0}</p>
              <p className="text-red-100 text-xs mt-1">Total transactions</p>
            </div>
            <div className="bg-red-400 bg-opacity-30 rounded-full p-4">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Total Amount</p>
              <p className="text-4xl font-bold mt-2">
                {formatPKR(stats.totalAmount || 0)}
              </p>
              <p className="text-orange-100 text-xs mt-1">Total spent</p>
            </div>
            <div className="bg-orange-400 bg-opacity-30 rounded-full p-4">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      {expenses.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            {(startDate || endDate || titleFilter)
              ? "Try adjusting your filters"
              : "Get started by adding a new expense"}
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/expenses/add"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Add First Expense
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
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expense Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Added By
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(expense.exp_date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                      <div className="text-xs text-gray-500 mt-1">
                        Added: {new Date(expense.createdAt).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-semibold text-gray-900">{expense.exp_title}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {expense.exp_description ? (
                        <div className="max-w-xs truncate" title={expense.exp_description}>
                          {expense.exp_description}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No description</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-lg font-bold text-red-600">
                        {formatPKR(parseFloat(expense.exp_amount))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{expense.userName || expense.userEmail}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan="3" className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                    Total ({expenses.length} expense{expenses.length !== 1 ? 's' : ''}):
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-xl font-bold text-red-700">
                      {formatPKR(expenses.reduce((sum, exp) => sum + parseFloat(exp.exp_amount), 0))}
                    </div>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
