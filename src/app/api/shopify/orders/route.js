import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getOrders } from '@/lib/shopify'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

/**
 * GET /api/shopify/orders
 * Fetch orders from Shopify
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // Build params object
    const params = {
      limit: parseInt(searchParams.get('limit')) || 50,
      maxOrders: parseInt(searchParams.get('maxOrders')) || 500,
      status: searchParams.get('status') || undefined,
      financial_status: searchParams.get('financial_status') || undefined,
      fulfillment_status: searchParams.get('fulfillment_status') || undefined,
      created_at_min: searchParams.get('created_at_min') || undefined,
      created_at_max: searchParams.get('created_at_max') || undefined,
      since_id: searchParams.get('since_id') || undefined,
    }

    // Remove undefined values
    Object.keys(params).forEach(key => {
      if (params[key] === undefined) {
        delete params[key]
      }
    })

    const orders = await getOrders(params)

    return NextResponse.json({
      success: true,
      orders,
      count: orders.length,
    })
  } catch (error) {
    console.error('❌ Error fetching Shopify orders:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch orders',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}


