"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import LoadingSpinner from "@/components/LoadingSpinner"

export default function EmployeesPage() {
  const { data: session } = useSession()
  const [employees, setEmployees] = useState([])
  const [stats, setStats] = useState({ totalEmployees: 0 })
  const [loading, setLoading] = useState(true)
  const [nameFilter, setNameFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('add') // 'add' or 'edit'
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    city: '',
    address: '',
    cnic: '',
  })

  useEffect(() => {
    fetchEmployees()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (nameFilter) params.append('name', nameFilter)
      if (cityFilter) params.append('city', cityFilter)

      const response = await fetch(`/api/employees?${params}`)
      const data = await response.json()

      if (data.success) {
        setEmployees(data.employees || [])
        setStats(data.stats || { totalEmployees: 0 })
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = () => {
    setModalMode('add')
    setFormData({
      name: '',
      phoneNumber: '',
      city: '',
      address: '',
      cnic: '',
    })
    setShowModal(true)
  }

  const openEditModal = (employee) => {
    setModalMode('edit')
    setSelectedEmployee(employee)
    setFormData({
      name: employee.name || '',
      phoneNumber: employee.phoneNumber || '',
      city: employee.city || '',
      address: employee.address || '',
      cnic: employee.cnic || '',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedEmployee(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.phoneNumber || !formData.city || !formData.address) {
      alert('Please fill in all required fields')
      return
    }

    setSubmitting(true)

    try {
      const url = modalMode === 'add' ? '/api/employees' : `/api/employees/${selectedEmployee.id}`
      const method = modalMode === 'add' ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        alert(`✅ Employee ${modalMode === 'add' ? 'added' : 'updated'} successfully!`)
        closeModal()
        fetchEmployees()
      } else {
        throw new Error(data.error || `Failed to ${modalMode} employee`)
      }
    } catch (error) {
      console.error('Error:', error)
      alert(`❌ ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (employee) => {
    if (!confirm(`Are you sure you want to delete employee "${employee.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        alert(`✅ Employee deleted successfully!`)
        fetchEmployees()
      } else {
        throw new Error(data.error || 'Failed to delete employee')
      }
    } catch (error) {
      console.error('Error:', error)
      alert(`❌ ${error.message}`)
    }
  }

  if (loading && employees.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <LoadingSpinner size="lg" text="Loading employees..." />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Employee Management</h1>
            <p className="mt-2 text-lg text-gray-600">Manage your staff records and bio information.</p>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg transition-all duration-200"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Employee
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Employees</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalEmployees}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Name</label>
            <input
              type="text"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="Filter by name..."
              className="w-full px-4 py-2 rounded-xl border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 border shadow-sm text-gray-900"
            />
          </div>
          <button
            onClick={fetchEmployees}
            className="px-6 py-2 bg-gray-900 text-white rounded-xl hover:bg-black transition-colors"
          >
            Search
          </button>
        </div>

        {/* Employees Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">City</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">CNIC</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold uppercase">
                          {employee.name.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900">{employee.name}</div>
                          <div className="text-xs text-gray-500">ID: {employee.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {employee.phoneNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {employee.city}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {employee.cnic || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => openEditModal(employee)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                      <button onClick={() => handleDelete(employee)} className="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      No employees found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {modalMode === 'add' ? 'Add New Employee' : 'Edit Employee'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 border transition-all text-gray-900 shadow-sm"
                  placeholder="Enter full name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 border transition-all text-gray-900 shadow-sm"
                    placeholder="+92..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 border transition-all text-gray-900 shadow-sm"
                    placeholder="Search city"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">CNIC (Optional)</label>
                <input
                  type="text"
                  value={formData.cnic}
                  onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 border transition-all text-gray-900 shadow-sm"
                  placeholder="00000-0000000-0"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Address *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 border transition-all text-gray-900 shadow-sm"
                  placeholder="Enter complete address"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-all shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg active:scale-[0.98]"
                >
                  {submitting ? 'Processing...' : modalMode === 'add' ? 'Save Employee' : 'Update Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
