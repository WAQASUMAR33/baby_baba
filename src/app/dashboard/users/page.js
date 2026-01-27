"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import LoadingSpinner from "@/components/LoadingSpinner"

export default function UsersPage() {
    const { data: session } = useSession()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Modal states
    const [showModal, setShowModal] = useState(false)
    const [modalMode, setModalMode] = useState('add') // 'add' or 'edit'
    const [selectedUser, setSelectedUser] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [customRole, setCustomRole] = useState('')

    // Form fields
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'user',
        status: 'active',
        modules: [],
    })

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/users')
            const data = await response.json()

            if (data.success) {
                setUsers(data.users || [])
            }
        } catch (error) {
            console.error('Error fetching users:', error)
        } finally {
            setLoading(false)
        }
    }

    const openAddModal = () => {
        setModalMode('add')
        setFormData({
            name: '',
            email: '',
            password: '',
            role: 'user',
            status: 'active',
            modules: [],
        })
        setShowModal(true)
    }

    const openEditModal = (user) => {
        setModalMode('edit')
        setSelectedUser(user)
        setFormData({
            name: user.name || '',
            email: user.email || '',
            password: '', // Don't show password
            role: user.role || 'user',
            status: user.status || 'active',
            modules: Array.isArray(user.modules) ? user.modules : [],
        })
        setShowModal(true)
    }

    const closeModal = () => {
        setShowModal(false)
        setSelectedUser(null)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.name || !formData.email || (modalMode === 'add' && !formData.password)) {
            alert('Please fill in all required fields')
            return
        }

        setSubmitting(true)

        try {
            const url = modalMode === 'add' ? '/api/users' : `/api/users/${selectedUser.id}`
            const method = modalMode === 'add' ? 'POST' : 'PATCH'

            // Only send password if it's provided (for edit)
            const payload = { ...formData }
            if (modalMode === 'edit' && !formData.password) {
                delete payload.password
            }

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const data = await response.json()

            if (data.success) {
                alert(`✅ User ${modalMode === 'add' ? 'added' : 'updated'} successfully!`)
                closeModal()
                fetchUsers()
            } else {
                throw new Error(data.error || `Failed to ${modalMode} user`)
            }
        } catch (error) {
            console.error('Error:', error)
            alert(`❌ ${error.message}`)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (user) => {
        if (user.email === session?.user?.email) {
            alert("You cannot delete yourself!")
            return
        }

        if (!confirm(`Are you sure you want to delete user "${user.name || user.email}"?`)) {
            return
        }

        try {
            const response = await fetch(`/api/users/${user.id}`, {
                method: 'DELETE',
            })

            const data = await response.json()

            if (data.success) {
                alert(`✅ User deleted successfully!`)
                fetchUsers()
            } else {
                throw new Error(data.error || 'Failed to delete user')
            }
        } catch (error) {
            console.error('Error:', error)
            alert(`❌ ${error.message}`)
        }
    }

    const filteredUsers = users.filter(user =>
        (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    )
    const roleOptions = Array.from(
        new Set(
            ['user', 'admin', ...users.map((user) => user.role).filter(Boolean), formData.role].filter(Boolean)
        )
    )
    const moduleOptions = [
        { key: 'dashboard', label: 'Dashboard' },
        { key: 'products', label: 'Products' },
        { key: 'sales', label: 'Sales' },
        { key: 'expenses', label: 'Expenses' },
        { key: 'day-end', label: 'Day End' },
        { key: 'categories', label: 'Categories' },
        { key: 'customers', label: 'Customers' },
        { key: 'employees', label: 'Employees' },
        { key: 'users', label: 'Users' },
        { key: 'settings', label: 'Settings' },
    ]

    const applyCustomRole = () => {
        const trimmedRole = customRole.trim()
        if (!trimmedRole) return
        setFormData({ ...formData, role: trimmedRole })
        setCustomRole('')
    }

    const toggleModule = (moduleKey) => {
        setFormData((prev) => {
            const nextModules = prev.modules.includes(moduleKey)
                ? prev.modules.filter((item) => item !== moduleKey)
                : [...prev.modules, moduleKey]
            return { ...prev, modules: nextModules }
        })
    }

    if (loading && users.length === 0) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <LoadingSpinner size="lg" text="Loading users..." />
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-8 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">User Management</h1>
                        <p className="mt-2 text-lg text-gray-600">Manage dashboard users, roles, and access permissions.</p>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg transition-all duration-200"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add New User
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[300px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search Users</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by name or email..."
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

                {/* Users Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created At</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold uppercase">
                                                    {user.name ? user.name.charAt(0) : user.email.charAt(0)}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-semibold text-gray-900">{user.name || 'No Name'}</div>
                                                    <div className="text-xs text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => openEditModal(user)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                                            <button
                                                onClick={() => handleDelete(user)}
                                                disabled={user.email === session?.user?.email}
                                                className={`${user.email === session?.user?.email ? 'text-gray-300 cursor-not-allowed' : 'text-red-600 hover:text-red-900'}`}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                            No users found.
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
                                {modalMode === 'add' ? 'Add New User' : 'Edit User'}
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
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address *</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 border transition-all text-gray-900 shadow-sm"
                                    placeholder="name@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    {modalMode === 'add' ? 'Password *' : 'New Password (leave blank to keep current)'}
                                </label>
                                <input
                                    type="password"
                                    required={modalMode === 'add'}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 border transition-all text-gray-900 shadow-sm"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 border transition-all text-gray-900 shadow-sm"
                                    >
                                        {roleOptions.map((roleOption) => (
                                            <option key={roleOption} value={roleOption}>
                                                {roleOption.charAt(0).toUpperCase() + roleOption.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="mt-3 flex gap-2">
                                        <input
                                            type="text"
                                            value={customRole}
                                            onChange={(e) => setCustomRole(e.target.value)}
                                            placeholder="Add custom role"
                                            className="flex-1 px-4 py-2 rounded-xl border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 border transition-all text-gray-900 shadow-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={applyCustomRole}
                                            disabled={!customRole.trim()}
                                            className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 border transition-all text-gray-900 shadow-sm"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Modules</label>
                                <div className="mt-2 grid grid-cols-2 gap-3">
                                    {moduleOptions.map((moduleOption) => (
                                        <label key={moduleOption.key} className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 shadow-sm">
                                            <input
                                                type="checkbox"
                                                checked={formData.modules.includes(moduleOption.key)}
                                                onChange={() => toggleModule(moduleOption.key)}
                                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span>{moduleOption.label}</span>
                                        </label>
                                    ))}
                                </div>
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
                                    {submitting ? 'Processing...' : modalMode === 'add' ? 'Create User' : 'Update User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
