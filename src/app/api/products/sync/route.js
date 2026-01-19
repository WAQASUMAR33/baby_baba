import { NextResponse } from 'next/server';
import { syncShopifyProductsBatch } from '@/lib/product-sync';

/**
 * POST /api/products/sync
 * Syncs products from Shopify to local database
 * 
 * Query params:
 * - batchSize: Number of products to sync in this batch (default: 1000)
 * - offset: Starting offset for pagination (default: 0)
 * - fullSync: If true, syncs all products (default: false)
 */
export async function POST(request) {
    try {
        const { searchParams } = new URL(request.url);
        const batchSize = parseInt(searchParams.get('batchSize') || '1000');
        const offset = parseInt(searchParams.get('offset') || '0');
        const fullSync = searchParams.get('fullSync') === 'true';

        console.log(`🚀 Starting Shopify product sync - Batch Size: ${batchSize}, Offset: ${offset}, Full Sync: ${fullSync}`);

        if (fullSync) {
            // Full sync mode - sync all products in one go (for smaller catalogs or background jobs)
            const result = await syncShopifyProductsBatch({
                maxProducts: 50000,
                batchSize: 250 // Shopify's max per page
            });
            return NextResponse.json(result);
        } else {
            // Batch mode - sync a specific batch of products
            const result = await syncShopifyProductsBatch({
                maxProducts: batchSize,
                offset: offset,
                batchSize: 250
            });
            return NextResponse.json(result);
        }
    } catch (error) {
        console.error('Sync API Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}

/**
 * GET /api/products/sync/status
 * Returns the current sync status
 */
export async function GET(request) {
    try {
        const { getProductCount } = await import('@/lib/shopify');
        const { getLocalProductCount } = await import('@/lib/product-db');

        const [shopifyCount, localCount] = await Promise.all([
            getProductCount(),
            getLocalProductCount()
        ]);

        return NextResponse.json({
            success: true,
            shopifyProducts: shopifyCount,
            localProducts: localCount,
            syncPercentage: shopifyCount > 0 ? Math.round((localCount / shopifyCount) * 100) : 0,
            remaining: Math.max(0, shopifyCount - localCount)
        });
    } catch (error) {
        console.error('Sync Status Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
