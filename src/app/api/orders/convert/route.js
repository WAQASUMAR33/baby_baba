import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getSales, applySaleInventory, updateSaleWithItems } from '@/lib/sales-db'
import { getLocations, getVariant, adjustInventory } from '@/lib/shopify'

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
    const orderId = body.orderId

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      )
    }

    const { sales } = await getSales({ saleId: orderId, limit: 1, offset: 0 })
    const order = sales[0]

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    if (order.status === 'completed') {
      return NextResponse.json(
        { success: false, error: 'Order is already converted to sale' },
        { status: 400 }
      )
    }

    const items = Array.isArray(order.items) ? order.items : []

    const rawSaleData = body.saleData && typeof body.saleData === 'object'
      ? body.saleData
      : {
          items,
          subtotal: order.subtotal,
          discount: order.discount,
          total: order.total,
          paymentMethod: order.paymentMethod,
          paymentBreakdown: order.paymentBreakdown,
          amountReceived: order.amountReceived,
          change: order.change,
          customerName: order.customerName,
          customerId: order.customerId,
          employeeId: order.employeeId,
          employeeName: order.employeeName,
        }

    const paymentBreakdown = Array.isArray(rawSaleData.paymentBreakdown)
      ? JSON.stringify(rawSaleData.paymentBreakdown)
      : typeof rawSaleData.paymentBreakdown === 'string'
        ? rawSaleData.paymentBreakdown
        : null

    const normalizedItems = (rawSaleData.items || []).map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      title: item.title || item.productName,
      price: parseFloat(item.price || item.unitRate || 0),
      originalPrice: item.originalPrice,
      quantity: parseInt(item.quantity || 0),
      discount: parseFloat(item.discount || 0),
      sku: item.sku,
      image: item.image,
    }))

    if (normalizedItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order has no items to convert' },
        { status: 400 }
      )
    }

    const saleData = {
      items: normalizedItems,
      subtotal: parseFloat(rawSaleData.subtotal || 0),
      discount: parseFloat(rawSaleData.discount ?? rawSaleData.globalDiscount ?? 0),
      total: parseFloat(rawSaleData.total || 0),
      paymentMethod: rawSaleData.paymentMethod || 'cash',
      paymentBreakdown,
      amountReceived: parseFloat(rawSaleData.amountReceived || 0),
      change: parseFloat(rawSaleData.change || 0),
      customerName: rawSaleData.customerName || null,
      customerId: rawSaleData.customerId || null,
      employeeId: rawSaleData.employeeId || null,
      employeeName: rawSaleData.employeeName || null,
      status: 'completed',
    }

    const updatedOrder = await updateSaleWithItems(order.id, saleData, { calculateCommission: true })
    await applySaleInventory(normalizedItems)

    const inventoryUpdates = []
    try {
      const locations = await getLocations()
      const locationId = locations.length > 0 ? locations[0].id : null

      if (!locationId) {
        normalizedItems.forEach(item => {
          inventoryUpdates.push({
            productId: item.productId,
            variantId: item.variantId,
            title: item.title,
            status: 'skipped',
            reason: 'No Shopify location found'
          })
        })
      } else {
        for (const item of normalizedItems) {
          if (!item.variantId || !item.productId) {
            inventoryUpdates.push({
              productId: item.productId,
              variantId: item.variantId,
              title: item.title,
              status: 'skipped',
              reason: 'Missing product or variant ID'
            })
            continue
          }

          try {
            const variant = await getVariant(item.productId, item.variantId)
            const inventoryTracked = variant?.inventory_management === 'shopify'

            if (!inventoryTracked || !variant?.inventory_item_id) {
              inventoryUpdates.push({
                productId: item.productId,
                variantId: item.variantId,
                title: item.title,
                status: 'skipped',
                reason: inventoryTracked ? 'No inventory_item_id found' : 'Inventory not tracked in Shopify'
              })
              continue
            }

            const quantityAdjustment = -parseInt(item.quantity)
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
          } catch (inventoryError) {
            inventoryUpdates.push({
              productId: item.productId,
              variantId: item.variantId,
              title: item.title,
              status: 'error',
              error: inventoryError.message || 'Unknown error'
            })
          }
        }
      }
    } catch (inventoryError) {
      normalizedItems.forEach(item => {
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
      sale: updatedOrder,
      order: updatedOrder,
      inventoryUpdates,
      message: 'Order converted to sale successfully'
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to convert order',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
