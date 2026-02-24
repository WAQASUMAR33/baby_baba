import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { findUserByEmail, createOrder } from '@/lib/sales-db'

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in again' },
        { status: 401 }
      )
    }

    const body = await request.json()

    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cart items are required' },
        { status: 400 }
      )
    }

    const user = await findUserByEmail(session.user.email)

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: `User record not found for ${session.user.email}. Please ensure your account is correctly set up.`
        },
        { status: 404 }
      )
    }

    const paymentBreakdown = Array.isArray(body.paymentBreakdown)
      ? JSON.stringify(body.paymentBreakdown)
      : (typeof body.paymentBreakdown === 'string' ? body.paymentBreakdown : null)

    const orderData = {
      subtotal: parseFloat(body.subtotal) || 0,
      discount: parseFloat(body.discount ?? body.globalDiscount ?? 0) || 0,
      total: parseFloat(body.total) || 0,
      paymentMethod: body.paymentMethod || 'cash',
      paymentBreakdown,
      amountReceived: parseFloat(body.amountReceived) || 0,
      change: parseFloat(body.change) || 0,
      customerName: body.customerName || null,
      customerId: body.customerId || null,
      status: body.status || 'order',
      employeeId: body.employeeId || null,
      employeeName: body.employeeName || null,
      items: body.items.map(item => ({
        productId: String(item.productId),
        variantId: String(item.variantId),
        title: item.title,
        price: parseFloat(item.price),
        originalPrice: parseFloat(item.originalPrice || 0),
        quantity: parseInt(item.quantity),
        discount: parseFloat(item.discount || 0),
        sku: item.sku || null,
        image: item.image || null,
      }))
    }

    const order = await createOrder(orderData, user.id)

    return NextResponse.json({
      success: true,
      order,
      message: 'Order recorded successfully'
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create order',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
