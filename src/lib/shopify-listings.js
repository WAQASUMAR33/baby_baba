// Shopify Product Listing API Configuration and Helper Functions

/**
 * Shopify Product Listing API Client
 * Used for managing products in sales channels
 */

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-01'

// Debug: Log environment variables
console.log('🔍 Shopify Product Listing API Config Check:')
console.log('  - SHOPIFY_STORE_DOMAIN:', SHOPIFY_STORE_DOMAIN ? '✅ Set' : '❌ Not Set')
console.log('  - SHOPIFY_ACCESS_TOKEN:', SHOPIFY_ACCESS_TOKEN ? '✅ Set' : '❌ Not Set')

/**
 * Make a request to Shopify Product Listing API
 * @param {string} endpoint - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<object>} - Response data
 */
async function shopifyListingFetch(endpoint, options = {}) {
  // Check if credentials are configured
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ACCESS_TOKEN) {
    throw new Error('Shopify credentials not configured. Please update SHOPIFY_STORE_DOMAIN and SHOPIFY_ACCESS_TOKEN in your .env file.')
  }

  const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}${endpoint}`
  
  console.log('📡 Fetching from Shopify Product Listing API:', url)
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.text()
    
    // Provide more helpful error messages
    if (response.status === 404) {
      throw new Error(`Product Listing API: Resource not found. This may mean the Product Listing API is not enabled for your app, or the product/collection doesn't exist. Error: ${errorData}`)
    }
    
    if (response.status === 403) {
      throw new Error(`Product Listing API: Permission denied. Make sure your app has 'read_product_listings' and 'write_product_listings' permissions. Error: ${errorData}`)
    }
    
    throw new Error(`Shopify Product Listing API Error: ${response.status} - ${errorData}`)
  }

  // Handle DELETE requests with no content
  if (response.status === 204) {
    return {}
  }

  return response.json()
}

/**
 * Get all product listings
 * @param {object} params - Query parameters
 * @returns {Promise<Array>} - Array of product listings
 */
export async function getProductListings(params = {}) {
  try {
    const queryParams = new URLSearchParams()
    
    if (params.limit) {
      queryParams.append('limit', params.limit)
    }
    
    if (params.product_ids) {
      queryParams.append('product_ids', params.product_ids)
    }
    
    if (params.collection_id) {
      queryParams.append('collection_id', params.collection_id)
    }

    const data = await shopifyListingFetch(`/product_listings.json?${queryParams}`)
    return data.product_listings || []
  } catch (error) {
    console.error('Error fetching product listings:', error)
    throw error
  }
}

/**
 * Get a specific product listing
 * @param {string|number} productListingId - Product listing ID
 * @returns {Promise<object>} - Product listing data
 */
export async function getProductListing(productListingId) {
  try {
    const data = await shopifyListingFetch(`/product_listings/${productListingId}.json`)
    return data.product_listing
  } catch (error) {
    console.error('Error fetching product listing:', error)
    throw error
  }
}

/**
 * Get product IDs that are published to your app
 * @param {object} params - Query parameters
 * @returns {Promise<Array>} - Array of product IDs
 */
export async function getProductListingIds(params = {}) {
  try {
    const queryParams = new URLSearchParams()
    
    if (params.limit) {
      queryParams.append('limit', params.limit)
    }

    const data = await shopifyListingFetch(`/product_listings/product_ids.json?${queryParams}`)
    return data.product_ids || []
  } catch (error) {
    console.error('Error fetching product listing IDs:', error)
    throw error
  }
}

/**
 * Get count of product listings
 * @returns {Promise<number>} - Count of product listings
 */
export async function getProductListingCount() {
  try {
    const data = await shopifyListingFetch('/product_listings/count.json')
    return data.count || 0
  } catch (error) {
    console.error('Error fetching product listing count:', error)
    return 0
  }
}

/**
 * Create a product listing (publish product to sales channel)
 * @param {string|number} productId - Product ID to publish
 * @param {object} body - Optional body data
 * @returns {Promise<object>} - Created product listing
 */
export async function createProductListing(productId, body = {}) {
  try {
    const data = await shopifyListingFetch(`/product_listings/${productId}.json`, {
      method: 'PUT',
      body: JSON.stringify({
        product_listing: {
          product_id: productId,
          ...body
        }
      }),
    })
    return data.product_listing
  } catch (error) {
    console.error('Error creating product listing:', error)
    throw error
  }
}

/**
 * Delete a product listing (unpublish from sales channel)
 * @param {string|number} productId - Product ID to unpublish
 * @returns {Promise<void>}
 */
export async function deleteProductListing(productId) {
  try {
    await shopifyListingFetch(`/product_listings/${productId}.json`, {
      method: 'DELETE',
    })
  } catch (error) {
    console.error('Error deleting product listing:', error)
    throw error
  }
}

/**
 * Get collection listings
 * @param {object} params - Query parameters
 * @returns {Promise<Array>} - Array of collection listings
 */
export async function getCollectionListings(params = {}) {
  try {
    const queryParams = new URLSearchParams()
    
    if (params.limit) {
      queryParams.append('limit', params.limit)
    }

    const data = await shopifyListingFetch(`/collection_listings.json?${queryParams}`)
    return data.collection_listings || []
  } catch (error) {
    console.error('Error fetching collection listings:', error)
    throw error
  }
}

/**
 * Get a specific collection listing
 * @param {string|number} collectionId - Collection ID
 * @returns {Promise<object>} - Collection listing data
 */
export async function getCollectionListing(collectionId) {
  try {
    const data = await shopifyListingFetch(`/collection_listings/${collectionId}.json`)
    return data.collection_listing
  } catch (error) {
    console.error('Error fetching collection listing:', error)
    throw error
  }
}

/**
 * Get collection listing product IDs
 * @param {string|number} collectionId - Collection ID
 * @returns {Promise<Array>} - Array of product IDs
 */
export async function getCollectionListingProductIds(collectionId) {
  try {
    const data = await shopifyListingFetch(`/collection_listings/${collectionId}/product_ids.json`)
    return data.product_ids || []
  } catch (error) {
    console.error('Error fetching collection listing product IDs:', error)
    throw error
  }
}

/**
 * Check if Shopify is configured
 * @returns {boolean}
 */
export function isShopifyConfigured() {
  return !!(SHOPIFY_STORE_DOMAIN && SHOPIFY_ACCESS_TOKEN)
}

export default {
  getProductListings,
  getProductListing,
  getProductListingIds,
  getProductListingCount,
  createProductListing,
  deleteProductListing,
  getCollectionListings,
  getCollectionListing,
  getCollectionListingProductIds,
  isShopifyConfigured,
}

