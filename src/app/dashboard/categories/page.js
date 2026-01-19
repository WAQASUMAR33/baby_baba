"use client"

import { useState, useEffect } from "react"
import LoadingSpinner from "@/components/LoadingSpinner"

export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentCategory, setCurrentCategory] = useState({ name: '', slug: '', description: '' })
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/categories')
      const data = await response.json()

      if (data.success) {
        setCategories(data.categories)
      } else {
        setError(data.error || 'Failed to fetch categories')
      }
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (category = null) => {
    if (category) {
      setCurrentCategory({ ...category })
      setIsEditing(true)
    } else {
      setCurrentCategory({ name: '', slug: '', description: '' })
      setIsEditing(false)
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setCurrentCategory({ name: '', slug: '', description: '' })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setCurrentCategory(prev => {
      const updated = { ...prev, [name]: value }
      if (name === 'name' && !isEditing) {
        updated.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      }
      return updated
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      const url = isEditing ? `/api/categories/${currentCategory.id}` : '/api/categories'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentCategory)
      })

      const data = await response.json()
      if (data.success) {
        fetchCategories()
        handleCloseModal()
      } else {
        alert(data.error || 'Failed to save category')
      }
    } catch (err) {
      alert(err.message || 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this category? Products associated with it will be uncategorized.')) {
      return
    }

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (data.success) {
        fetchCategories()
      } else {
        alert(data.error || 'Failed to delete category')
      }
    } catch (err) {
      alert(err.message || 'An error occurred')
    }
  }

  if (loading && categories.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <LoadingSpinner size="lg" text="Loading categories..." />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 relative min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Category Management</h1>
            <p className="mt-2 text-lg text-gray-500 max-w-2xl">
              Organize your products with custom local categories. Changes here are independent of Shopify collections.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchCategories}
              className="inline-flex items-center px-5 py-2.5 border border-gray-200 shadow-sm text-sm font-semibold rounded-2xl text-gray-700 bg-white hover:bg-gray-50 transition-all active:scale-95"
            >
              <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center px-6 py-2.5 border border-transparent shadow-xl text-sm font-bold rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-95 hover:shadow-indigo-600/20"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Category
            </button>
          </div>
        </div>

        {/* Count Stats */}
        <div className="mt-6 flex gap-4">
          <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm flex items-center">
            <span className="w-3 h-3 rounded-full bg-indigo-500 mr-2"></span>
            <span className="text-sm font-bold text-gray-700">{categories.length} Categories</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-8 bg-red-50 border border-red-100 rounded-2xl p-5 flex items-center text-red-700 shadow-sm">
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium text-sm">{error}</span>
        </div>
      )}

      {/* Categories Content */}
      {categories.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-20 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
            <svg className="h-10 w-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900">No categories established</h3>
          <p className="mt-2 text-gray-500 max-w-sm">
            Categories help you organize your products for better reporting and management.
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="mt-8 inline-flex items-center px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg hover:bg-indigo-700 transition-all hover:shadow-indigo-600/30"
          >
            Create Your First Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {categories.map((category) => (
            <div
              key={category.id}
              className="group bg-white rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col h-[280px]"
            >
              <div className="p-8 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-bold text-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                    {category.name.charAt(0)}
                  </div>
                  <span className="bg-gray-50 text-gray-600 group-hover:bg-indigo-50 group-hover:text-indigo-700 text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-gray-100 transition-all whitespace-nowrap">
                    {category.productsCount || 0} Products
                  </span>
                </div>
                <h3 className="text-xl font-black text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                  {category.name}
                </h3>
                <p className="text-[10px] font-mono text-gray-400 mt-1 uppercase tracking-tighter">
                  /{category.slug}
                </p>
                {category.description && (
                  <p className="text-sm text-gray-500 mt-4 line-clamp-2 leading-relaxed">
                    {category.description}
                  </p>
                )}
              </div>
              <div className="px-8 py-5 bg-gray-50/50 border-t border-gray-50 flex justify-end gap-6">
                <button
                  onClick={() => handleOpenModal(category)}
                  className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(category.id)}
                  className="text-sm font-bold text-red-500 hover:text-red-700 flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Refined Modal Implementation */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
          {/* Backdrop with Blur */}
          <div
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
            onClick={handleCloseModal}
          ></div>

          {/* Modal Card */}
          <div className="relative w-full max-w-lg mx-auto bg-white rounded-3xl shadow-2xl transform transition-all duration-300 ease-out scale-100 opacity-100 flex flex-col max-h-[90vh] z-10">
            <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div className="flex flex-col">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {isEditing ? 'Edit Category' : 'Create Category'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {isEditing ? 'Make changes to your existing category' : 'Organize your store by adding a new category'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 mb-2 px-1">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={currentCategory.name}
                    onChange={handleInputChange}
                    required
                    className="block w-full px-5 py-3.5 bg-gray-50 border border-transparent group-focus-within:border-indigo-500 group-focus-within:bg-white rounded-2xl text-gray-900 shadow-sm transition-all duration-200 outline-none focus:ring-4 focus:ring-indigo-500/10"
                    placeholder="e.g. Newborn Accessories"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 px-1">
                    Slug (URL Path)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      name="slug"
                      value={currentCategory.slug}
                      onChange={handleInputChange}
                      required
                      className={`block w-full px-5 py-3.5 ${isEditing ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-50'} border border-transparent rounded-2xl text-gray-500 font-mono text-sm outline-none transition-all duration-200`}
                      placeholder="newborn-accessories"
                      readOnly={isEditing}
                    />
                    {!isEditing && (
                      <span className="absolute right-4 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider rounded-md">
                        Auto
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 px-1">Description</label>
                  <textarea
                    name="description"
                    value={currentCategory.description || ''}
                    onChange={handleInputChange}
                    rows={4}
                    className="block w-full px-5 py-3.5 bg-gray-50 border border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl text-gray-900 shadow-sm transition-all duration-200 outline-none focus:ring-4 focus:ring-indigo-500/10 resize-none"
                    placeholder="Describe this category..."
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 bg-gray-50/80 rounded-b-3xl border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-3 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-2xl hover:bg-gray-100 active:scale-95 transition-all focus:ring-2 focus:ring-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-3 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl hover:shadow-xl hover:shadow-indigo-600/30 active:scale-[0.97] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center min-w-[160px]"
                >
                  {saving && (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {isEditing ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
