import { NextResponse } from 'next/server'
import { createProductListing } from '@/lib/shopify-listings'

/**
 * POST /api/shopify/listings/publish
 * Publish a product to your sales channel
 */
export async function POST(request) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.product_id) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Publish product listing
    const listing = await createProductListing(body.product_id, body.data || {})

    return NextResponse.json({
      success: true,
      listing,
      message: 'Product published successfully',
    })
  } catch (error) {
    console.error('Error publishing product:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to publish product',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}







