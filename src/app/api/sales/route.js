import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { findUserByEmail, createSale, getSales } from '@/lib/sales-db'
import { getVariantById, getLocations, adjustInventory } from '@/lib/shopify'

/**
 * POST /api/sales
 * Create a new sale record and update Shopify inventory
 * 
 * This API:
 * 1. Stores sales in the local database
 * 2. Updates Shopify inventory by decreasing stock for sold items
 * 3. Only updates inventory for items with inventory_management = 'shopify'
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      console.error('❌ Unauthorized: No session or email found')
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in again' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cart items are required' },
        { status: 400 }
      )
    }

    // Find user by email (using direct SQL)
    console.log(`🔍 Looking up user for sale: ${session.user.email}`)
    const user = await findUserByEmail(session.user.email)

    if (!user) {
      console.error(`❌ User not found in database for email: ${session.user.email}`)
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

    const saleData = {
      subtotal: parseFloat(body.subtotal) || 0,
        discount: parseFloat(body.discount ?? body.globalDiscount ?? 0) || 0,
      total: parseFloat(body.total) || 0,
      paymentMethod: body.paymentMethod || 'cash',
      paymentBreakdown,
      amountReceived: parseFloat(body.amountReceived) || 0,
      change: parseFloat(body.change) || 0,
      customerName: body.customerName || null,
      customerId: body.customerId || null,
      status: body.status || 'completed',
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

    // Create sale using direct SQL
    const sale = await createSale(saleData, user.id)

    console.log(`✅ Sale created: #${sale.id} - Rs ${sale.total}`)

    // Deduct Shopify inventory for each sold item (non-blocking — sale is already saved)
    const inventoryUpdates = []
    // Only sync inventory for completed sales, not orders/holds
    if (saleData.status === 'completed') {
      try {
        const locations = await getLocations()
        const locationId = locations.length > 0 ? locations[0].id : null

        if (!locationId) {
          console.warn('⚠️ No Shopify location found. Inventory will not be updated.')
          body.items.forEach(item => {
            inventoryUpdates.push({ variantId: item.variantId, title: item.title, status: 'skipped', reason: 'No Shopify location found' })
          })
        } else {
          for (const item of body.items) {
            if (!item.variantId) {
              inventoryUpdates.push({ title: item.title, status: 'skipped', reason: 'No variant ID' })
              continue
            }
            try {
              const variant = await getVariantById(item.variantId)
              if (variant?.inventory_item_id) {
                const result = await adjustInventory(locationId, variant.inventory_item_id, -parseInt(item.quantity))
                inventoryUpdates.push({
                  variantId: item.variantId,
                  title: item.title,
                  quantity: item.quantity,
                  status: 'success',
                  newQuantity: result?.available ?? 'unknown',
                })
                console.log(`✅ Shopify inventory: ${item.title} −${item.quantity} → ${result?.available ?? '?'}`)
              } else {
                inventoryUpdates.push({ variantId: item.variantId, title: item.title, status: 'skipped', reason: 'Variant not found or not inventory-tracked' })
              }
            } catch (err) {
              console.error(`❌ Shopify inventory error for ${item.title}:`, err.message)
              inventoryUpdates.push({ variantId: item.variantId, title: item.title, status: 'error', error: err.message })
            }
          }

          const ok = inventoryUpdates.filter(u => u.status === 'success').length
          const fail = inventoryUpdates.filter(u => u.status === 'error').length
          const skip = inventoryUpdates.filter(u => u.status === 'skipped').length
          console.log(`📊 Shopify Inventory: ${ok} updated, ${fail} errors, ${skip} skipped`)
        }
      } catch (err) {
        console.error('❌ Critical Shopify inventory error:', err.message)
        body.items.forEach(item => {
          inventoryUpdates.push({ variantId: item.variantId, title: item.title, status: 'error', error: err.message })
        })
      }
    }

    return NextResponse.json({
      success: true,
      sale,
      inventoryUpdates,
      message: 'Sale completed successfully'
    })
  } catch (error) {
    console.error('❌ Error creating sale:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create sale',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/sales
 * Fetch sales records
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
    const filters = {
      limit: parseInt(searchParams.get('limit')) || 100,
      offset: parseInt(searchParams.get('offset')) || 0,
      status: searchParams.get('status'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      employeeId: searchParams.get('employeeId'),
      saleId: searchParams.get('saleId'),
    }

    // Fetch sales using direct SQL
    const { sales, total, stats } = await getSales(filters)

    return NextResponse.json({
      success: true,
      sales,
      total,
      limit: filters.limit,
      offset: filters.offset,
      stats: {
        totalSales: parseInt(stats.totalSales) || 0,
        totalRevenue: parseFloat(stats.totalRevenue) || 0,
        totalDiscount: parseFloat(stats.totalDiscount) || 0,
        totalCommission: parseFloat(stats.totalCommission) || 0,
      }
    })
  } catch (error) {
    console.error('❌ Error fetching sales:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch sales',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
