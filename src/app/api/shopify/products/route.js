import { NextResponse } from 'next/server'
import { getProducts, getProductCount } from '@/lib/shopify'

/**
 * GET /api/shopify/products
 * Fetch products from Shopify
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    
    const params = {
      status: searchParams.get('status'), // Don't default to 'active', fetch all by default
      maxProducts: parseInt(searchParams.get('maxProducts')) || 2000, // Limit to 2000 for performance
      order: searchParams.get('order') || 'created_at desc', // Newest first by default
    }

    console.log('🔍 Fetching products with params:', params)

    // Set cache headers to prevent stale data
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    }

    // Fetch products with a reasonable limit
    const products = await getProducts(params)

    console.log(`✅ API returning ${products.length} products (ordered by: ${params.order})`)

    return NextResponse.json({
      success: true,
      products,
      fetched: products.length,
      limited: products.length >= params.maxProducts,
      order: params.order,
    }, { headers })
  } catch (error) {
    console.error('❌ Error in /api/shopify/products:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch products',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

