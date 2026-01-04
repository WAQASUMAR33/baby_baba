import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
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
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
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
    const user = await findUserByEmail(session.user.email)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Prepare sale data
    const saleData = {
      subtotal: parseFloat(body.subtotal) || 0,
      discount: parseFloat(body.discount) || 0,
      total: parseFloat(body.total) || 0,
      paymentMethod: body.paymentMethod || 'cash',
      amountReceived: parseFloat(body.amountReceived) || 0,
      change: parseFloat(body.change) || 0,
      customerName: body.customerName || null,
      customerPhone: body.customerPhone || null,
      status: body.status || 'completed',
      items: body.items.map(item => ({
        productId: String(item.productId),
        variantId: String(item.variantId),
        title: item.title,
        price: parseFloat(item.price),
        quantity: parseInt(item.quantity),
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
      } else {
        // Update inventory for each item
        for (const item of body.items) {
          // Only update if inventory is tracked
          if (item.inventoryTracked && item.variantId) {
            try {
              // Get variant to get inventory_item_id
              const variant = await getVariant(item.productId, item.variantId)
              
              if (variant && variant.inventory_item_id) {
                // Decrease inventory by the quantity sold (negative adjustment)
                const quantityAdjustment = -parseInt(item.quantity)
                await adjustInventory(locationId, variant.inventory_item_id, quantityAdjustment)
                
                inventoryUpdates.push({
                  productId: item.productId,
                  variantId: item.variantId,
                  title: item.title,
                  quantity: item.quantity,
                  status: 'success'
                })
                
                console.log(`✅ Inventory updated: ${item.title} - Decreased by ${item.quantity}`)
              } else {
                console.warn(`⚠️ Variant not found or no inventory_item_id for variant ${item.variantId}`)
                inventoryUpdates.push({
                  productId: item.productId,
                  variantId: item.variantId,
                  title: item.title,
                  status: 'skipped',
                  reason: 'Variant not found or inventory not tracked'
                })
              }
            } catch (inventoryError) {
              console.error(`❌ Error updating inventory for ${item.title}:`, inventoryError)
              inventoryUpdates.push({
                productId: item.productId,
                variantId: item.variantId,
                title: item.title,
                status: 'error',
                error: inventoryError.message
              })
              // Continue with other items even if one fails
            }
          } else {
            inventoryUpdates.push({
              productId: item.productId,
              variantId: item.variantId,
              title: item.title,
              status: 'skipped',
              reason: 'Inventory not tracked'
            })
          }
        }
      }
    } catch (inventoryError) {
      // Log error but don't fail the sale
      console.error('❌ Error updating Shopify inventory:', inventoryError)
      console.log('⚠️ Sale was created successfully, but inventory update failed')
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

