import { getProducts, getProductsPage } from './shopify.js'
import { upsertProduct } from './product-db.js'

/**
 * Sync products from Shopify to the local database (with batch support)
 * @param {object} options - Sync options
 * @param {number} options.maxProducts - Maximum products to fetch in this batch
 * @param {number} options.offset - Starting offset for pagination
 * @param {number} options.batchSize - Shopify API page size (max 250)
 * @param {function} onProgress - Optional progress callback
 * @returns {Promise<object>} - Sync summary
 */
export async function syncShopifyProductsBatch(options = {}, onProgress = null) {
    const maxProducts = options.maxProducts || 1000
    const offset = options.offset || 0
    const batchSize = Math.min(options.batchSize || 250, 250) // Shopify max is 250

    console.log(`📡 Fetching products from Shopify (offset: ${offset}, max: ${maxProducts})...`)

    // Calculate which page to start from based on offset
    const startPage = Math.floor(offset / batchSize)
    let fetchedProducts = []

    // Fetch products with pagination
    try {
        const products = await getProducts({
            maxProducts: maxProducts + offset, // Fetch extra to account for offset
            limit: batchSize
        })

        // Skip products before offset and take only maxProducts
        fetchedProducts = products.slice(offset, offset + maxProducts)

        console.log(`✅ Fetched ${fetchedProducts.length} products from Shopify (after offset ${offset})`)
    } catch (error) {
        console.error('❌ Error fetching products from Shopify:', error)
        throw error
    }

    if (fetchedProducts.length === 0) {
        return {
            success: true,
            imported: 0,
            failed: 0,
            total: 0,
            offset: offset,
            message: 'No products found to sync'
        }
    }

    let successCount = 0
    let failCount = 0

    console.log(`🔄 Starting to sync ${fetchedProducts.length} products to database...`)

    for (let i = 0; i < fetchedProducts.length; i++) {
        const product = fetchedProducts[i]
        try {
            await upsertProduct(product)
            successCount++

            // Log progress every 100 products
            if (successCount % 100 === 0) {
                console.log(`📊 Progress: ${successCount}/${fetchedProducts.length} products synced (${Math.round(successCount / fetchedProducts.length * 100)}%)`)
            }

            if (onProgress) {
                onProgress(successCount, fetchedProducts.length)
            }
        } catch (error) {
            console.error(`❌ Failed to sync product ${product.id}:`, error.message)
            failCount++
        }
    }

    console.log(`✅ Batch sync complete: ${successCount} imported, ${failCount} failed`)

    return {
        success: true,
        imported: successCount,
        failed: failCount,
        total: fetchedProducts.length,
        offset: offset,
        nextOffset: offset + fetchedProducts.length,
        hasMore: fetchedProducts.length === maxProducts
    }
}


/**
 * Sync products from Shopify to the local database
 * @param {object} options - Sync options
 * @param {function} onProgress - Optional progress callback
 * @returns {Promise<object>} - Sync summary
 */
export async function syncShopifyProducts(options = {}, onProgress = null) {
    const maxProducts = options.maxProducts || 50000

    console.log('📡 Fetching products from Shopify...')
    const products = await getProducts({ maxProducts })
    console.log(`✅ Fetched ${products.length} products from Shopify`)

    if (products.length === 0) {
        return { success: true, count: 0, message: 'No products found to sync' }
    }

    let successCount = 0
    let failCount = 0

    console.log(`🔄 Starting to sync ${products.length} products to database...`)

    for (let i = 0; i < products.length; i++) {
        const product = products[i]
        try {
            await upsertProduct(product)
            successCount++

            // Log progress every 100 products
            if (successCount % 100 === 0) {
                console.log(`📊 Progress: ${successCount}/${products.length} products synced (${Math.round(successCount / products.length * 100)}%)`)
            }

            if (onProgress) {
                onProgress(successCount, products.length)
            }
        } catch (error) {
            console.error(`❌ Failed to sync product ${product.id}:`, error.message)
            failCount++
        }
    }

    return {
        success: true,
        imported: successCount,
        failed: failCount,
        total: products.length
    }
}

export async function syncShopifyProductsPage(options = {}, onProgress = null) {
    const limit = Math.min(options.limit || 250, 250)
    const pageInfo = options.pageInfo || null
    const status = options.status
    const order = options.order

    const { products, nextPageInfo, hasMore } = await getProductsPage({
        limit,
        pageInfo,
        status,
        order
    })

    if (products.length === 0) {
        return {
            success: true,
            imported: 0,
            failed: 0,
            total: 0,
            nextPageInfo: null,
            hasMore: false
        }
    }

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < products.length; i++) {
        const product = products[i]
        try {
            await upsertProduct(product)
            successCount++
            if (onProgress) {
                onProgress(successCount, products.length)
            }
        } catch (error) {
            console.error(`❌ Failed to sync product ${product.id}:`, error.message)
            failCount++
        }
    }

    return {
        success: true,
        imported: successCount,
        failed: failCount,
        total: products.length,
        nextPageInfo,
        hasMore
    }
}

export default {
    syncShopifyProducts,
    syncShopifyProductsBatch,
    syncShopifyProductsPage
}
