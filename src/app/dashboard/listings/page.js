"use client"

import { useState, useEffect } from "react"
import LoadingSpinner from "@/components/LoadingSpinner"

export default function ProductListingsPage() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchListings()
  }, [])

  const fetchListings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/shopify/listings')
      const data = await response.json()

      if (data.success) {
        setListings(data.listings)
      } else {
        setError(data.error || 'Failed to fetch product listings')
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
        <LoadingSpinner size="lg" text="Loading product listings..." />
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
              <h3 className="text-sm font-medium text-red-800">Error loading product listings</h3>
              <p className="mt-2 text-sm text-red-700">{error}</p>
              <div className="mt-4">
                <button
                  onClick={fetchListings}
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
            <h1 className="text-3xl font-bold text-gray-900">Product Listings</h1>
            <p className="mt-2 text-sm text-gray-600">
              Products published to your sales channel ({listings.length} listings)
            </p>
          </div>
          <button
            onClick={fetchListings}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              Product listings are products that are published and available in your sales channels.
              This uses the Shopify Product Listing API.
            </p>
          </div>
        </div>
      </div>

      {/* Listings Grid */}
      {listings.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No product listings found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Publish products to your sales channel to see them here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {listings.map((listing) => (
            <div
              key={listing.product_id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
            >
              {/* Product Image */}
              <div className="aspect-w-1 aspect-h-1 bg-gray-200">
                {listing.images && listing.images.length > 0 ? (
                  <img
                    src={listing.images[0].src}
                    alt={listing.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 truncate" title={listing.title}>
                  {listing.title}
                </h3>

                {listing.vendor && (
                  <p className="text-xs text-gray-500 mt-1">{listing.vendor}</p>
                )}

                <div className="mt-2 flex items-center justify-between">
                  <div>
                    {listing.variants && listing.variants.length > 0 && (
                      <p className="text-lg font-bold text-gray-900">
                        Rs {parseFloat(listing.variants[0].price).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>

                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Published
                  </span>
                </div>

                {/* View Link */}
                <div className="mt-3">
                  <a
                    href={`https://${process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || 'your-store.myshopify.com'}/products/${listing.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    View listing →
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

