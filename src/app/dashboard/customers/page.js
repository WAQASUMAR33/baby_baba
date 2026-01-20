"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import LoadingSpinner from "@/components/LoadingSpinner"

export default function CustomersPage() {
    const { data: session } = useSession()
    const [customers, setCustomers] = useState([])
    const [stats, setStats] = useState({ totalCustomers: 0, totalBalance: 0 })
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Modal states
    const [showModal, setShowModal] = useState(false)
    const [modalMode, setModalMode] = useState('add') // 'add' or 'edit'
    const [selectedCustomer, setSelectedCustomer] = useState(null)
    const [submitting, setSubmitting] = useState(false)

    // Form fields
    const [formData, setFormData] = useState({
        name: '',
        phoneNumber: '',
        address: '',
        balance: 0,
    })

    useEffect(() => {
        fetchCustomers()
    }, [])

    const fetchCustomers = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/customers')
            const data = await response.json()

            if (data.success) {
                setCustomers(data.customers || [])
                setStats(data.stats || { totalCustomers: 0, totalBalance: 0 })
            }
        } catch (error) {
            console.error('Error fetching customers:', error)
        } finally {
            setLoading(false)
        }
    }

    const openAddModal = () => {
        setModalMode('add')
        setFormData({
            name: '',
            phoneNumber: '',
            address: '',
            balance: 0,
        })
        setShowModal(true)
    }

    const openEditModal = (customer) => {
        setModalMode('edit')
        setSelectedCustomer(customer)
        setFormData({
            name: customer.name || '',
            phoneNumber: customer.phoneNumber || '',
            address: customer.address || '',
            balance: parseFloat(customer.balance) || 0,
        })
        setShowModal(true)
    }

    const closeModal = () => {
        setShowModal(false)
        setSelectedCustomer(null)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.name || !formData.phoneNumber || !formData.address) {
            alert('Please fill in all required fields')
            return
        }

        setSubmitting(true)

        try {
            const url = modalMode === 'add' ? '/api/customers' : `/api/customers/${selectedCustomer.id}`
            const method = modalMode === 'add' ? 'POST' : 'PATCH'

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            const data = await response.json()

            if (data.success) {
                alert(`✅ Customer ${modalMode === 'add' ? 'added' : 'updated'} successfully!`)
                closeModal()
                fetchCustomers()
            } else {
                throw new Error(data.error || `Failed to ${modalMode} customer`)
            }
        } catch (error) {
            console.error('Error:', error)
            alert(`❌ ${error.message}`)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (customer) => {
        if (!confirm(`Are you sure you want to delete customer "${customer.name}"?`)) {
            return
        }

        try {
            const response = await fetch(`/api/customers/${customer.id}`, {
                method: 'DELETE',
            })

            const data = await response.json()

            if (data.success) {
                alert(`✅ Customer deleted successfully!`)
                fetchCustomers()
            } else {
                throw new Error(data.error || 'Failed to delete customer')
            }
        } catch (error) {
            console.error('Error:', error)
            alert(`❌ ${error.message}`)
        }
    }

    const filteredCustomers = customers.filter(customer =>
        (customer.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (customer.phoneNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    )

    if (loading && customers.length === 0) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <LoadingSpinner size="lg" text="Loading customers..." />
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-8 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Customer Management</h1>
                        <p className="mt-2 text-lg text-gray-600">Manage your store customers and their account balances.</p>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg transition-all duration-200"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add New Customer
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Customers</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalCustomers}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Balance</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">
                            Rs {parseFloat(stats.totalBalance || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
                    <div className="flex-1 min-w-[300px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search Customers</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by name or phone..."
                                className="w-full pl-10 pr-4 py-2 rounded-xl border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 border shadow-sm text-gray-900"
                            />
                            <div className="absolute left-3 top-2.5 text-gray-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Customers Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Address</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {filteredCustomers.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold uppercase">
                                                    {customer.name.charAt(0)}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-semibold text-gray-900">{customer.name}</div>
                                                    <div className="text-xs text-gray-500">ID: {customer.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {customer.phoneNumber}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <div className="max-w-xs truncate">{customer.address}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            Rs {parseFloat(customer.balance).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => openEditModal(customer)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                                            <button onClick={() => handleDelete(customer)} className="text-red-600 hover:text-red-900">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredCustomers.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                            No customers found.
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
                                {modalMode === 'add' ? 'Add New Customer' : 'Edit Customer'}
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
                                    placeholder="Enter customer name"
                                />
                            </div>
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
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Balance (Rs)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.balance}
                                    onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-4 py-3 rounded-xl border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 border transition-all text-gray-900 shadow-sm"
                                    placeholder="0.00"
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
                                    {submitting ? 'Processing...' : modalMode === 'add' ? 'Add Customer' : 'Update Customer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
