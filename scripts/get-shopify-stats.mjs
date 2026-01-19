import 'dotenv/config'
import { getShopifyStats } from '../src/lib/shopify.js'

async function main() {
    try {
        console.log('-------------------------------------------')
        console.log('📊 FETCHING SHOPIFY RESOURCE COUNTS...')
        console.log('-------------------------------------------')

        // This will calculate product, variant, and collection counts
        const stats = await getShopifyStats()

        console.log('\n✅ COMPLETED!')
        console.log('-------------------------------------------')
        console.log(`🛍️  Total Products:    ${stats.products}`)
        console.log(`📦 Total Variants:    ${stats.variants}`)
        console.log(`📁 Total Collections: ${stats.collections}`)
        console.log('-------------------------------------------')
        console.log(`   - Custom:       ${stats.customCollections}`)
        console.log(`   - Smart:        ${stats.smartCollections}`)
        console.log('-------------------------------------------')

    } catch (error) {
        console.error('\n❌ ERROR:')
        console.error(error.message)
        process.exit(1)
    }
}

main()
