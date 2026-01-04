"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function AddExpensePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingTitles, setLoadingTitles] = useState(true)
  const [expenseTitles, setExpenseTitles] = useState([])
  
  // Form fields
  const [exp_title_id, setExpTitleId] = useState("")
  const [exp_description, setExpDescription] = useState("")
  const [exp_amount, setExpAmount] = useState("")
  const [exp_date, setExpDate] = useState(new Date().toISOString().split('T')[0])

  // Modal state
  const [showTitleModal, setShowTitleModal] = useState(false)
  const [newTitleName, setNewTitleName] = useState("")
  const [creatingTitle, setCreatingTitle] = useState(false)

  useEffect(() => {
    fetchExpenseTitles()
  }, [])

  const fetchExpenseTitles = async () => {
    try {
      setLoadingTitles(true)
      const response = await fetch('/api/expenses/titles')
      const data = await response.json()
      
      if (data.success) {
        setExpenseTitles(data.titles || [])
      }
    } catch (error) {
      console.error('Error fetching expense titles:', error)
    } finally {
      setLoadingTitles(false)
    }
  }

  const handleCreateTitle = async (e) => {
    e.preventDefault()

    if (!newTitleName.trim()) {
      alert('Please enter an expense title')
      return
    }

    setCreatingTitle(true)

    try {
      const response = await fetch('/api/expenses/titles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exp_title: newTitleName.trim(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`✅ Expense title "${data.title.exp_title}" created successfully!`)
        setNewTitleName("")
        setShowTitleModal(false)
        fetchExpenseTitles() // Refresh titles
        setExpTitleId(data.title.id.toString()) // Auto-select the new title
      } else {
        throw new Error(data.error || 'Failed to create expense title')
      }
    } catch (error) {
      console.error('Error creating expense title:', error)
      alert(`❌ ${error.message}`)
    } finally {
      setCreatingTitle(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!exp_title_id || !exp_amount) {
      alert('Please select an expense title and enter amount')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exp_title_id: parseInt(exp_title_id),
          exp_description,
          exp_amount: parseFloat(exp_amount),
          exp_date,
        }),
      })

      const data = await response.json()

      if (data.success) {
        const selectedTitle = expenseTitles.find(t => t.id === parseInt(exp_title_id))
        alert(`✅ Expense added successfully!\n\nExpense #${data.expense.id}\nTitle: ${selectedTitle?.exp_title}\nAmount: Rs ${parseFloat(exp_amount).toFixed(2)}`)
        router.push('/dashboard/expenses')
      } else {
        throw new Error(data.error || 'Failed to add expense')
      }
    } catch (error) {
      console.error('Error adding expense:', error)
      alert(`❌ Failed to add expense: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add Expense</h1>
            <p className="mt-2 text-sm text-gray-600">
              Record a new business expense
            </p>
          </div>
          <Link
            href="/dashboard/expenses"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Expenses
          </Link>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl bg-white rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {/* Expense Title Dropdown */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Expense Title <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowTitleModal(true)}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add New Title
                </button>
              </div>
              
              {loadingTitles ? (
                <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                  Loading expense titles...
                </div>
              ) : expenseTitles.length === 0 ? (
                <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-yellow-50 text-yellow-800">
                  No expense titles available. Please create one first.
                </div>
              ) : (
                <select
                  value={exp_title_id}
                  onChange={(e) => setExpTitleId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select Expense Title</option>
                  {expenseTitles.map((title) => (
                    <option key={title.id} value={title.id}>
                      {title.exp_title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Amount and Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (Rs) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">
                    Rs
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={exp_amount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expense Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={exp_date}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description / Notes
              </label>
              <textarea
                value={exp_description}
                onChange={(e) => setExpDescription(e.target.value)}
                placeholder="Additional details about this expense..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <Link
              href="/dashboard/expenses"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || expenseTitles.length === 0}
              className="inline-flex items-center px-6 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Add Expense
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Add Title Modal */}
      {showTitleModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add New Expense Title</h2>
              <button
                onClick={() => {
                  setShowTitleModal(false)
                  setNewTitleName("")
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateTitle}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expense Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTitleName}
                  onChange={(e) => setNewTitleName(e.target.value)}
                  placeholder="e.g., Office Rent, Electricity Bill, Staff Salary"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                  autoFocus
                />
                <p className="mt-2 text-xs text-gray-500">
                  Enter a descriptive name for this expense category
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowTitleModal(false)
                    setNewTitleName("")
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTitle || !newTitleName.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {creatingTitle ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create Title
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
