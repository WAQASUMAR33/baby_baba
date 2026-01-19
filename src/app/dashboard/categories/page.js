"use client"

import { useState, useEffect } from "react"
import LoadingSpinner from "@/components/LoadingSpinner"

export default function CategoriesPage() {
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchCollections()
  }, [])

  const fetchCollections = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/shopify/collections')
      const data = await response.json()

      if (data.success) {
        setCollections(data.collections)
      } else {
        setError(data.error || 'Failed to fetch collections')
      }
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <LoadingSpinner size="lg" text="Loading categories..." />
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
              <h3 className="text-sm font-medium text-red-800">Error loading categories</h3>
              <p className="mt-2 text-sm text-red-700">{error}</p>
              <div className="mt-4">
                <button
                  onClick={fetchCollections}
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
            <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
            <p className="mt-2 text-sm text-gray-600">
              Shopify Collections ({collections.length} categories)
            </p>
          </div>
          <button
            onClick={fetchCollections}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Categories Grid */}
      {collections.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No categories found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Connect your Shopify store to see collections
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <div
              key={collection.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
            >
              {/* Collection Image */}
              <div className="aspect-w-16 aspect-h-9 bg-gradient-to-br from-indigo-500 to-purple-600">
                {collection.image ? (
                  <img
                    src={collection.image.src}
                    alt={collection.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Collection Info */}
              <div className="p-5">
                <h3 className="text-lg font-semibold text-gray-900" title={collection.title}>
                  {collection.title}
                </h3>

                {collection.body_html && (
                  <p
                    className="text-sm text-gray-600 mt-2 line-clamp-2"
                    dangerouslySetInnerHTML={{
                      __html: collection.body_html.replace(/<[^>]*>/g, '')
                    }}
                  />
                )}

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {collection.products_count || 0} products
                  </span>

                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${collection.published_at
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                    }`}>
                    {collection.published_at ? 'Published' : 'Draft'}
                  </span>
                </div>

                {/* View Link */}
                <div className="mt-4">
                  <a
                    href={`https://${process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || 'your-store.myshopify.com'}/collections/${collection.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    View collection →
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}







