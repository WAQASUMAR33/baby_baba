import { NextResponse } from 'next/server'
import { getProductListings, getProductListingCount } from '@/lib/shopify-listings'

/**
 * GET /api/shopify/listings
 * Fetch product listings from Shopify (products published to your sales channel)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    
    const params = {
      limit: searchParams.get('limit') || 250,
    }

    // Fetch product listings and count in parallel
    const [listings, count] = await Promise.all([
      getProductListings(params),
      getProductListingCount(),
    ])

    return NextResponse.json({
      success: true,
      listings,
      count,
      limit: parseInt(params.limit),
    })
  } catch (error) {
    console.error('Error in /api/shopify/listings:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch product listings',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}







