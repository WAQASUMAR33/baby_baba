// Shopify API Configuration and Helper Functions

/**
 * Shopify Admin API Client
 * Uses REST API for simplicity
 */

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-01'

// Debug: Log environment variables (will help troubleshoot)
console.log('🔍 Shopify Config Check:')
console.log('  - SHOPIFY_STORE_DOMAIN:', SHOPIFY_STORE_DOMAIN ? '✅ Set' : '❌ Not Set')
console.log('  - SHOPIFY_ACCESS_TOKEN:', SHOPIFY_ACCESS_TOKEN ? '✅ Set' : '❌ Not Set')
console.log('  - SHOPIFY_API_VERSION:', SHOPIFY_API_VERSION)

// Validate configuration
if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ACCESS_TOKEN) {
  console.warn('⚠️  Shopify credentials not configured. Please add SHOPIFY_STORE_DOMAIN and SHOPIFY_ACCESS_TOKEN to .env')
}

// Check for placeholder values
if (SHOPIFY_STORE_DOMAIN === 'your-store.myshopify.com' || SHOPIFY_ACCESS_TOKEN === 'your-admin-api-access-token') {
  console.warn('⚠️  Shopify credentials still have placeholder values. Please update them with your actual credentials.')
}

/**
 * Make a request to Shopify Admin API
 * @param {string} endpoint - API endpoint (e.g., '/products.json')
 * @param {object} options - Fetch options
 * @returns {Promise<object>} - Response data
 */
async function shopifyFetch(endpoint, options = {}) {
  // Check if credentials are configured
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ACCESS_TOKEN) {
    throw new Error('Shopify credentials not configured. Please update SHOPIFY_STORE_DOMAIN and SHOPIFY_ACCESS_TOKEN in your .env file.')
  }

  // Check for placeholder values
  if (SHOPIFY_STORE_DOMAIN === 'your-store.myshopify.com' || SHOPIFY_ACCESS_TOKEN === 'your-admin-api-access-token') {
    throw new Error('Shopify credentials still have placeholder values. Please update them with your actual Shopify store domain and access token.')
  }

  const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}${endpoint}`
  
  console.log('📡 Fetching from Shopify:', url)
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      ...options.headers,
    },
  })

  // Handle permission errors with helpful messages
  if (response.status === 403) {
    const errorData = await response.text()
    throw new Error(`Permission Denied: Your Shopify app doesn't have the required permissions for this operation. Please add the necessary API scopes in your Shopify app settings. Go to Settings → ${errorData}`)
  }

  if (response.status === 401) {
    throw new Error(`Authentication Failed: Your access token is invalid or expired. Please check your SHOPIFY_ACCESS_TOKEN in the .env file.`)
  }

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Shopify API Error: ${response.status} - ${errorData}`)
  }

  // Handle DELETE requests with no content
  if (response.status === 204) {
    return {}
  }

  return response.json()
}

/**
 * Fetch all products from Shopify with pagination support
 * @param {object} params - Query parameters
 * @returns {Promise<Array>} - Array of all products
 */
export async function getProducts(params = {}) {
  try {
    const allProducts = []
    let hasNextPage = true
    let pageInfo = null
    const limit = 250 // Shopify max is 250 per page
    const maxProducts = params.maxProducts || 2000 // Limit to 2000 products for performance
    let pageCount = 0
    const maxPages = 10 // Maximum 10 pages (2500 products)
    
    console.log(`📦 Fetching products from Shopify (max: ${maxProducts})...`)
    
    while (hasNextPage && allProducts.length < maxProducts && pageCount < maxPages) {
      pageCount++
      
      // Build query params
      const queryParams = new URLSearchParams()
      queryParams.append('limit', limit)
      
      // Add status if provided
      if (params.status) {
        queryParams.append('status', params.status)
      }
      
      // IMPORTANT: Only add order on the FIRST request (not with page_info)
      // Shopify doesn't allow 'order' parameter when using pagination cursors
      if (!pageInfo) {
        // First request only - set the order
        if (params.order) {
          queryParams.append('order', params.order)
        } else {
          queryParams.append('order', 'created_at desc') // Newest first by default
        }
      }
      
      // Add pagination cursor if available (for subsequent pages)
      if (pageInfo) {
        queryParams.append('page_info', pageInfo)
      }
      
      // Add other params but exclude 'page' and 'limit'
      Object.keys(params).forEach(key => {
        if (key !== 'limit' && key !== 'status' && key !== 'page' && key !== 'page_info' && key !== 'maxProducts' && key !== 'order') {
          queryParams.append(key, params[key])
        }
      })

      const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products.json?${queryParams}`
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        },
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Shopify API Error: ${response.status} - ${errorData}`)
      }

      const data = await response.json()
      const products = data.products || []
      
      // If no products returned, stop pagination
      if (products.length === 0) {
        console.log('⚠️ No more products returned, stopping pagination')
        break
      }
      
      allProducts.push(...products)
      console.log(`📦 Page ${pageCount}: Fetched ${products.length} products (Total: ${allProducts.length})`)
      
      // Check for next page using Link header
      const linkHeader = response.headers.get('Link')
      if (linkHeader && linkHeader.includes('rel="next"')) {
        // Extract page_info from the Link header
        const nextLinkMatch = linkHeader.match(/<[^>]*[?&]page_info=([^&>]+)[^>]*>;\s*rel="next"/)
        if (nextLinkMatch && nextLinkMatch[1]) {
          const newPageInfo = nextLinkMatch[1]
          
          // Check if we're getting the same page_info (infinite loop detection)
          if (newPageInfo === pageInfo) {
            console.warn('⚠️ Same page_info detected, stopping to prevent infinite loop')
            break
          }
          
          pageInfo = newPageInfo
        } else {
          hasNextPage = false
        }
      } else {
        hasNextPage = false
      }
      
      // Stop if we've reached the limit
      if (allProducts.length >= maxProducts) {
        console.log(`⚠️ Reached ${maxProducts} products limit, stopping pagination`)
        break
      }
    }
    
    console.log(`✅ Total products fetched: ${allProducts.length} (${pageCount} pages)`)
    return allProducts
  } catch (error) {
    console.error('❌ Error fetching products:', error)
    throw error
  }
}

/**
 * Fetch a single product by ID
 * @param {string|number} productId - Product ID
 * @returns {Promise<object>} - Product data
 */
export async function getProduct(productId) {
  try {
    const data = await shopifyFetch(`/products/${productId}.json`)
    return data.product
  } catch (error) {
    console.error('Error fetching product:', error)
    throw error
  }
}

/**
 * Create a new product in Shopify
 * @param {object} productData - Product data
 * @returns {Promise<object>} - Created product
 */
export async function createProduct(productData) {
  try {
    const data = await shopifyFetch('/products.json', {
      method: 'POST',
      body: JSON.stringify({ product: productData }),
    })
    return data.product
  } catch (error) {
    console.error('Error creating product:', error)
    throw error
  }
}

/**
 * Update an existing product
 * @param {string|number} productId - Product ID
 * @param {object} productData - Product data to update
 * @returns {Promise<object>} - Updated product
 */
export async function updateProduct(productId, productData) {
  try {
    const data = await shopifyFetch(`/products/${productId}.json`, {
      method: 'PUT',
      body: JSON.stringify({ product: productData }),
    })
    return data.product
  } catch (error) {
    console.error('Error updating product:', error)
    throw error
  }
}

/**
 * Delete a product
 * @param {string|number} productId - Product ID
 * @returns {Promise<void>}
 */
export async function deleteProduct(productId) {
  try {
    await shopifyFetch(`/products/${productId}.json`, {
      method: 'DELETE',
    })
  } catch (error) {
    console.error('Error deleting product:', error)
    throw error
  }
}

/**
 * Fetch all collections (categories) from Shopify
 * @param {object} params - Query parameters
 * @returns {Promise<Array>} - Array of collections
 */
export async function getCollections(params = {}) {
  try {
    const queryParams = new URLSearchParams({
      limit: params.limit || 250,
      ...params,
    })

    // Fetch custom collections
    const customData = await shopifyFetch(`/custom_collections.json?${queryParams}`)
    const customCollections = customData.custom_collections || []

    // Fetch smart collections
    const smartData = await shopifyFetch(`/smart_collections.json?${queryParams}`)
    const smartCollections = smartData.smart_collections || []

    // Combine both types
    return [...customCollections, ...smartCollections]
  } catch (error) {
    console.error('Error fetching collections:', error)
    throw error
  }
}

/**
 * Fetch a single collection by ID
 * @param {string|number} collectionId - Collection ID
 * @param {string} type - Collection type ('custom' or 'smart')
 * @returns {Promise<object>} - Collection data
 */
export async function getCollection(collectionId, type = 'custom') {
  try {
    const endpoint = type === 'smart' 
      ? `/smart_collections/${collectionId}.json`
      : `/custom_collections/${collectionId}.json`
    
    const data = await shopifyFetch(endpoint)
    return data.collection || data.custom_collection || data.smart_collection
  } catch (error) {
    console.error('Error fetching collection:', error)
    throw error
  }
}

/**
 * Fetch products in a collection
 * @param {string|number} collectionId - Collection ID
 * @param {object} params - Query parameters
 * @returns {Promise<Array>} - Array of products
 */
export async function getCollectionProducts(collectionId, params = {}) {
  try {
    const queryParams = new URLSearchParams({
      limit: params.limit || 250,
      ...params,
    })

    const data = await shopifyFetch(`/collections/${collectionId}/products.json?${queryParams}`)
    return data.products || []
  } catch (error) {
    console.error('Error fetching collection products:', error)
    throw error
  }
}

/**
 * Get product count
 * @returns {Promise<number>} - Total product count
 */
export async function getProductCount() {
  try {
    const data = await shopifyFetch('/products/count.json')
    return data.count || 0
  } catch (error) {
    console.error('Error fetching product count:', error)
    return 0
  }
}

/**
 * Search products
 * @param {string} query - Search query
 * @param {object} params - Additional parameters
 * @returns {Promise<Array>} - Array of products
 */
export async function searchProducts(query, params = {}) {
  try {
    const queryParams = new URLSearchParams({
      limit: params.limit || 250,
      title: query,
      ...params,
    })

    const data = await shopifyFetch(`/products.json?${queryParams}`)
    return data.products || []
  } catch (error) {
    console.error('Error searching products:', error)
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
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCollections,
  getCollection,
  getCollectionProducts,
  getProductCount,
  searchProducts,
  isShopifyConfigured,
}

