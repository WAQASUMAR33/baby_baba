import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { findUserByEmail, createSale, getSales } from '@/lib/sales-db'
import { getVariant, getLocations, adjustInventory } from '@/lib/shopify'

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

    // Prepare sale data
      const saleData = {
      subtotal: parseFloat(body.subtotal) || 0,
        discount: parseFloat(body.discount ?? body.globalDiscount ?? 0) || 0,
      total: parseFloat(body.total) || 0,
      paymentMethod: body.paymentMethod || 'cash',
      amountReceived: parseFloat(body.amountReceived) || 0,
      change: parseFloat(body.change) || 0,
      customerName: body.customerName || null,
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

    // Update Shopify inventory for each item
    const inventoryUpdates = []
    try {
      // Get the first location (or use default)
      const locations = await getLocations()
      const locationId = locations.length > 0 ? locations[0].id : null

      if (!locationId) {
        console.warn('⚠️ No Shopify location found. Inventory will not be updated.')
        // Add warning to all items
        body.items.forEach(item => {
          inventoryUpdates.push({
            productId: item.productId,
            variantId: item.variantId,
            title: item.title,
            status: 'skipped',
            reason: 'No Shopify location found'
          })
        })
      } else {
        console.log(`📍 Using Shopify location ID: ${locationId}`)

        // Update inventory for each item
        for (const item of body.items) {
          // Only update if inventory is tracked
          if (item.inventoryTracked && item.variantId) {
            try {
              console.log(`🔄 Updating inventory for: ${item.title} (Variant: ${item.variantId}, Qty: ${item.quantity})`)

              // Get variant to get inventory_item_id
              const variant = await getVariant(item.productId, item.variantId)

              if (variant && variant.inventory_item_id) {
                // Decrease inventory by the quantity sold (negative adjustment)
                const quantityAdjustment = -parseInt(item.quantity)

                console.log(`📦 Adjusting inventory: Location=${locationId}, Item=${variant.inventory_item_id}, Adjustment=${quantityAdjustment}`)

                const result = await adjustInventory(locationId, variant.inventory_item_id, quantityAdjustment)

                inventoryUpdates.push({
                  productId: item.productId,
                  variantId: item.variantId,
                  title: item.title,
                  quantity: item.quantity,
                  status: 'success',
                  inventoryItemId: variant.inventory_item_id,
                  newQuantity: result?.available || 'unknown'
                })

                console.log(`✅ Inventory updated successfully: ${item.title} - Decreased by ${item.quantity} (New stock: ${result?.available || 'unknown'})`)
              } else {
                console.warn(`⚠️ Variant not found or no inventory_item_id for variant ${item.variantId} of product ${item.productId}`)
                inventoryUpdates.push({
                  productId: item.productId,
                  variantId: item.variantId,
                  title: item.title,
                  status: 'skipped',
                  reason: variant ? 'No inventory_item_id found' : 'Variant not found'
                })
              }
            } catch (inventoryError) {
              console.error(`❌ Error updating inventory for ${item.title}:`, inventoryError)
              console.error('Error details:', {
                message: inventoryError.message,
                stack: inventoryError.stack,
                productId: item.productId,
                variantId: item.variantId
              })
              inventoryUpdates.push({
                productId: item.productId,
                variantId: item.variantId,
                title: item.title,
                status: 'error',
                error: inventoryError.message || 'Unknown error'
              })
              // Continue with other items even if one fails
            }
          } else {
            console.log(`⏭️ Skipping inventory update for ${item.title}: ${!item.inventoryTracked ? 'Inventory not tracked' : 'No variant ID'}`)
            inventoryUpdates.push({
              productId: item.productId,
              variantId: item.variantId,
              title: item.title,
              status: 'skipped',
              reason: !item.inventoryTracked ? 'Inventory not tracked in Shopify' : 'No variant ID provided'
            })
          }
        }
      }

      // Log summary
      const successful = inventoryUpdates.filter(u => u.status === 'success').length
      const failed = inventoryUpdates.filter(u => u.status === 'error').length
      const skipped = inventoryUpdates.filter(u => u.status === 'skipped').length

      console.log(`📊 Inventory Update Summary: ${successful} successful, ${failed} failed, ${skipped} skipped`)

    } catch (inventoryError) {
      // Log error but don't fail the sale
      console.error('❌ Critical error updating Shopify inventory:', inventoryError)
      console.error('Error stack:', inventoryError.stack)
      console.log('⚠️ Sale was created successfully, but inventory update failed')

      // Mark all items as failed
      body.items.forEach(item => {
        inventoryUpdates.push({
          productId: item.productId,
          variantId: item.variantId,
          title: item.title,
          status: 'error',
          error: inventoryError.message || 'Critical inventory update error'
        })
      })
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
    const session = await getServerSession()

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
