/**
 * Shopify Product Import Script
 * Run: node scripts/import-shopify-products.mjs
 */
import 'dotenv/config'
import { getProducts } from '../src/lib/shopify.js'
import { upsertProduct, clearProducts } from '../src/lib/product-db.js'

import { syncShopifyProducts } from '../src/lib/product-sync.js'

async function importProducts() {
    console.log('🚀 Starting Shopify product import script...')
    console.log('─'.repeat(50))

    try {
        const result = await syncShopifyProducts({ maxProducts: 5000 }, (current, total) => {
            if (current % 10 === 0 || current === total) {
                console.log(`⏳ Progress: ${current}/${total} products imported`)
            }
        })

        console.log('─'.repeat(50))
        console.log('📊 Import Summary:')
        console.log(`   ✅ Successfully imported: ${result.imported}`)
        console.log(`   ❌ Failed: ${result.failed}`)
        console.log(`   📦 Total products: ${result.total}`)
        console.log('─'.repeat(50))
        console.log('🎉 Import completed!')

    } catch (error) {
        console.error('💥 Critical error during import:', error)
        process.exit(1)
    }
}

// Run the import
importProducts()
