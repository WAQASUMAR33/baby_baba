import { NextResponse } from 'next/server'
import { getCollections } from '@/lib/shopify'

/**
 * GET /api/shopify/collections
 * Fetch collections (categories) from Shopify
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    
    const params = {
      limit: searchParams.get('limit') || 250,
    }

    const collections = await getCollections(params)

    return NextResponse.json({
      success: true,
      collections,
      count: collections.length,
    })
  } catch (error) {
    console.error('Error in /api/shopify/collections:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch collections',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}







