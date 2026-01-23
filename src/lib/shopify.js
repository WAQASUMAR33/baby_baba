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
    const maxProducts = params.maxProducts || 50000 // Increased default for full sync
    let pageCount = 0

    console.log(`📦 Fetching products from Shopify (max: ${maxProducts})...`)

    while (hasNextPage && allProducts.length < maxProducts) {
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

export async function getProductsPage(params = {}) {
  try {
    const limit = Math.min(params.limit || 250, 250)
    const queryParams = new URLSearchParams()
    queryParams.append('limit', limit)

    if (params.status) {
      queryParams.append('status', params.status)
    }

    if (!params.pageInfo) {
      if (params.order) {
        queryParams.append('order', params.order)
      } else {
        queryParams.append('order', 'created_at desc')
      }
    }

    if (params.pageInfo) {
      queryParams.append('page_info', params.pageInfo)
    }

    Object.keys(params).forEach(key => {
      if (key !== 'limit' && key !== 'status' && key !== 'page' && key !== 'page_info' && key !== 'maxProducts' && key !== 'order' && key !== 'pageInfo') {
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
    const linkHeader = response.headers.get('Link')
    let nextPageInfo = null

    if (linkHeader && linkHeader.includes('rel="next"')) {
      const nextLinkMatch = linkHeader.match(/<[^>]*[?&]page_info=([^&>]+)[^>]*>;\s*rel="next"/)
      if (nextLinkMatch && nextLinkMatch[1]) {
        nextPageInfo = nextLinkMatch[1]
      }
    }

    return {
      products,
      nextPageInfo,
      hasMore: Boolean(nextPageInfo),
    }
  } catch (error) {
    console.error('❌ Error fetching product page:', error)
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
 * Get custom collection count
 * @returns {Promise<number>} - Count of custom collections
 */
export async function getCustomCollectionCount() {
  try {
    const data = await shopifyFetch('/custom_collections/count.json')
    return data.count || 0
  } catch (error) {
    console.error('Error fetching custom collection count:', error)
    return 0
  }
}

/**
 * Get smart collection count
 * @returns {Promise<number>} - Count of smart collections
 */
export async function getSmartCollectionCount() {
  try {
    const data = await shopifyFetch('/smart_collections/count.json')
    return data.count || 0
  } catch (error) {
    console.error('Error fetching smart collection count:', error)
    return 0
  }
}

/**
 * Get total variant count by fetching all products
 * @returns {Promise<number>} - Total variant count
 */
export async function getVariantCount() {
  try {
    let totalVariants = 0
    let hasNextPage = true
    let pageInfo = null
    const limit = 250

    console.log('📦 Calculating total variant count (fetching all products)...')

    while (hasNextPage) {
      const queryParams = new URLSearchParams()
      queryParams.append('limit', limit)
      queryParams.append('fields', 'id,variants') // Only fetch needed fields

      if (pageInfo) {
        queryParams.append('page_info', pageInfo)
      }

      const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products.json?${queryParams}`

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        },
      })

      if (!response.ok) {
        throw new Error(`Shopify API Error: ${response.status}`)
      }

      const data = await response.json()
      const products = data.products || []

      if (products.length === 0) break

      // Sum variants for each product
      let pageVariants = 0
      products.forEach(p => {
        pageVariants += p.variants?.length || 0
      })
      totalVariants += pageVariants
      console.log(`📡 Fetched ${products.length} products, added ${pageVariants} variants (Running Total: ${totalVariants})`)

      // Check for next page
      const linkHeader = response.headers.get('Link')
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const nextLinkMatch = linkHeader.match(/<[^>]*[?&]page_info=([^&>]+)[^>]*>;\s*rel="next"/)
        if (nextLinkMatch && nextLinkMatch[1]) {
          pageInfo = nextLinkMatch[1]
        } else {
          hasNextPage = false
        }
      } else {
        hasNextPage = false
      }
    }

    return totalVariants
  } catch (error) {
    console.error('Error calculating variant count:', error)
    return 0
  }
}

/**
 * Get comprehensive Shopify stats
 * @returns {Promise<object>} - Stats object
 */
export async function getShopifyStats() {
  try {
    // Fetch product and collection counts in parallel (fast)
    const [productCount, customCollCount, smartCollCount] = await Promise.all([
      getProductCount(),
      getCustomCollectionCount(),
      getSmartCollectionCount()
    ])

    // Fetch variant count (slower as it paginates)
    const variantCount = await getVariantCount()

    return {
      products: productCount,
      variants: variantCount,
      collections: customCollCount + smartCollCount,
      customCollections: customCollCount,
      smartCollections: smartCollCount,
    }
  } catch (error) {
    console.error('Error fetching Shopify stats:', error)
    throw error
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

/**
 * Get all inventory locations
 * @returns {Promise<Array>} - Array of locations
 */
export async function getLocations() {
  try {
    const data = await shopifyFetch('/locations.json')
    return data.locations || []
  } catch (error) {
    console.error('Error fetching locations:', error)
    throw error
  }
}

/**
 * Get inventory levels for a variant
 * @param {string|number} inventoryItemId - Inventory item ID
 * @returns {Promise<Array>} - Array of inventory levels
 */
export async function getInventoryLevels(inventoryItemId) {
  try {
    const data = await shopifyFetch(`/inventory_levels.json?inventory_item_ids=${inventoryItemId}`)
    return data.inventory_levels || []
  } catch (error) {
    console.error('Error fetching inventory levels:', error)
    throw error
  }
}

/**
 * Adjust inventory quantity (decrease stock)
 * @param {string|number} locationId - Location ID
 * @param {string|number} inventoryItemId - Inventory item ID
 * @param {number} quantityAdjustment - Quantity to adjust (negative to decrease)
 * @returns {Promise<object>} - Updated inventory level
 */
export async function adjustInventory(locationId, inventoryItemId, quantityAdjustment) {
  try {
    const data = await shopifyFetch('/inventory_levels/adjust.json', {
      method: 'POST',
      body: JSON.stringify({
        location_id: locationId,
        inventory_item_id: inventoryItemId,
        quantity_adjustment: quantityAdjustment
      }),
    })
    return data.inventory_level || null
  } catch (error) {
    console.error('Error adjusting inventory:', error)
    throw error
  }
}

/**
 * Get variant details including inventory_item_id
 * @param {string|number} productId - Product ID
 * @param {string|number} variantId - Variant ID
 * @returns {Promise<object>} - Variant data with inventory_item_id
 */
export async function getVariant(productId, variantId) {
  try {
    const product = await getProduct(productId)
    const variant = product.variants?.find(v => String(v.id) === String(variantId))
    return variant || null
  } catch (error) {
    console.error('Error fetching variant:', error)
    throw error
  }
}

/**
 * Fetch all orders from Shopify with pagination support
 * @param {object} params - Query parameters (status, limit, since_id, etc.)
 * @returns {Promise<Array>} - Array of orders
 */
export async function getOrders(params = {}) {
  try {
    const allOrders = []
    let hasNextPage = true
    let pageInfo = null
    const limit = params.limit || 250 // Shopify max is 250 per page
    const maxOrders = params.maxOrders || 10000 // Increased default
    let pageCount = 0

    console.log(`📦 Fetching orders from Shopify (max: ${maxOrders})...`)

    while (hasNextPage && allOrders.length < maxOrders) {
      pageCount++

      // Build query params
      const queryParams = new URLSearchParams()
      queryParams.append('limit', limit)

      // Add status filter if provided
      if (params.status) {
        queryParams.append('status', params.status)
      }

      // Add financial_status filter if provided
      if (params.financial_status) {
        queryParams.append('financial_status', params.financial_status)
      }

      // Add fulfillment_status filter if provided
      if (params.fulfillment_status) {
        queryParams.append('fulfillment_status', params.fulfillment_status)
      }

      // Add created_at_min filter if provided
      if (params.created_at_min) {
        queryParams.append('created_at_min', params.created_at_min)
      }

      // Add created_at_max filter if provided
      if (params.created_at_max) {
        queryParams.append('created_at_max', params.created_at_max)
      }

      // Add pagination cursor if available (for subsequent pages)
      if (pageInfo) {
        queryParams.append('page_info', pageInfo)
      } else if (params.since_id) {
        // First request with since_id
        queryParams.append('since_id', params.since_id)
      }

      const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/orders.json?${queryParams}`

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
      const orders = data.orders || []

      // If no orders returned, stop pagination
      if (orders.length === 0) {
        console.log('⚠️ No more orders returned, stopping pagination')
        break
      }

      allOrders.push(...orders)
      console.log(`📦 Page ${pageCount}: Fetched ${orders.length} orders (Total: ${allOrders.length})`)

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
      if (allOrders.length >= maxOrders) {
        console.log(`⚠️ Reached ${maxOrders} orders limit, stopping pagination`)
        break
      }
    }

    console.log(`✅ Total orders fetched: ${allOrders.length} (${pageCount} pages)`)
    return allOrders
  } catch (error) {
    console.error('❌ Error fetching orders:', error)
    throw error
  }
}

/**
 * Fetch a single order by ID
 * @param {string|number} orderId - Order ID
 * @returns {Promise<object>} - Order data
 */
export async function getOrder(orderId) {
  try {
    const data = await shopifyFetch(`/orders/${orderId}.json`)
    return data.order
  } catch (error) {
    console.error('Error fetching order:', error)
    throw error
  }
}

export default {
  getProducts,
  getProductsPage,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCollections,
  getCollection,
  getCollectionProducts,
  getProductCount,
  getCustomCollectionCount,
  getSmartCollectionCount,
  getVariantCount,
  getShopifyStats,
  searchProducts,
  isShopifyConfigured,
  getLocations,
  getInventoryLevels,
  adjustInventory,
  getVariant,
  getOrders,
  getOrder,
}
