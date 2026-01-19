"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function ProductDetailPage({ params }) {
    const { id } = use(params)
    const router = useRouter()
    const [product, setProduct] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)

    // Form states
    const [formData, setFormData] = useState({
        title: "",
        vendor: "",
        status: "active",
        barcode: "",
        original_price: 0,
        sale_price: 0,
        quantity: 0
    })

    useEffect(() => {
        fetchProduct()
    }, [id])

    const fetchProduct = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/products/${id}`)
            const data = await res.json()
            if (data.success) {
                setProduct(data.product)
                setFormData({
                    title: data.product.title || "",
                    vendor: data.product.vendor || "",
                    status: data.product.status || "active",
                    barcode: data.product.variants?.[0]?.barcode || "",
                    original_price: data.product.original_price || 0,
                    sale_price: data.product.sale_price || 0,
                    quantity: data.product.quantity || 0
                })
            } else {
                setError(data.error || "Product not found")
            }
        } catch (err) {
            setError("Failed to fetch product details")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e) => {
        e.preventDefault()
        try {
            setSaving(true)
            setError(null)
            setSuccess(null)

            const res = await fetch(`/api/products/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            const data = await res.json()
            if (data.success) {
                setSuccess("Product updated successfully!")
                setTimeout(() => setSuccess(null), 3000)
            } else {
                setError(data.error || "Failed to update product")
            }
        } catch (err) {
            setError("An error occurred while saving")
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this product from the local database? This will NOT delete it from Shopify.")) return

        try {
            setDeleting(true)
            const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) {
                router.push("/dashboard/products")
            } else {
                setError(data.error || "Failed to delete product")
            }
        } catch (err) {
            setError("An error occurred while deleting")
        } finally {
            setDeleting(false)
        }
    }

    if (loading) {
        return (
            <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    if (error && !product) {
        return (
            <div className="p-8">
                <div className="bg-red-50 text-red-800 p-4 rounded-lg border border-red-200">
                    {error}
                    <div className="mt-4">
                        <Link href="/dashboard/products" className="text-indigo-600 hover:underline">← Back to Products</Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <Link href="/dashboard/products" className="text-sm text-indigo-600 hover:underline flex items-center mb-2">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Products
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
                    <p className="text-sm text-gray-500 mt-1">ID: {id}</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 font-medium transition-colors disabled:opacity-50"
                    >
                        {deleting ? 'Deleting...' : 'Delete Product'}
                    </button>
                </div>
            </div>

            {success && (
                <div className="mb-6 bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {success}
                </div>
            )}

            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
                    {error}
                </div>
            )}

            <form onSubmit={handleSave} className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Product Title</label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                            <input
                                type="text"
                                value={formData.vendor}
                                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="active">Active</option>
                                <option value="draft">Draft</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
                            <input
                                type="text"
                                value={formData.barcode}
                                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.sale_price}
                                    onChange={(e) => setFormData({ ...formData, sale_price: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Original Price</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.original_price}
                                    onChange={(e) => setFormData({ ...formData, original_price: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (Stock)</label>
                                <input
                                    type="number"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-xs text-gray-500 tabular-nums">
                        Last updated: {product.updatedAt ? new Date(product.updatedAt).toLocaleString() : 'Never'}
                    </div>
                    <div className="flex space-x-3">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Product'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}
