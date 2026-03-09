import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { applySaleReturnFinance, getSales, restockSaleItems, createSaleReturn, getSaleReturns } from '@/lib/sales-db'
import { getVariantById, getLocations, adjustInventory } from '@/lib/shopify'

// Calculate the total refund amount from returned items (no DB side-effects)
function calcReturnAmount(sale, items) {
  const saleItems = Array.isArray(sale.items) ? sale.items : []
  const saleItemMap = new Map(saleItems.map(i => [String(i.variantId || i.productId), i]))
  let total = 0
  for (const item of items) {
    const key = String(item.variantId || item.productId)
    const matched = saleItemMap.get(key)
    if (!matched) continue
    const unitPrice = parseFloat(matched.price || 0)
    const soldQty = parseInt(matched.quantity || 0)
    const totalDiscount = parseFloat(matched.discount || 0)
    const discountPerUnit = soldQty > 0 ? totalDiscount / soldQty : 0
    const netUnitPrice = Math.max(0, unitPrice - discountPerUnit)
    total += netUnitPrice * parseInt(item.quantity)
  }
  return Math.max(0, parseFloat(total.toFixed(2)))
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const { returns, total } = await getSaleReturns({ startDate, endDate, limit, offset })
    return NextResponse.json({ success: true, returns, total })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch returns' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Please log in again' }, { status: 401 })
    }

    const body = await request.json()
    const saleId = body.saleId
    const items = Array.isArray(body.items) ? body.items : []
    // cashAmount: how much cash is physically returned to the customer
    // remaining (returnAmount - cashAmount) is added to the customer's ledger
    const rawCash = parseFloat(body.cashAmount)
    const customerId = body.customerId ? String(body.customerId) : null
    const bodyCustomerName = body.customerName ? String(body.customerName) : null

    if (!saleId) {
      return NextResponse.json({ success: false, error: 'Sale ID is required' }, { status: 400 })
    }
    if (items.length === 0) {
      return NextResponse.json({ success: false, error: 'Return items are required' }, { status: 400 })
    }

    const { sales } = await getSales({ saleId, limit: 1, offset: 0 })
    const sale = sales[0]
    if (!sale) {
      return NextResponse.json({ success: false, error: 'Sale not found' }, { status: 404 })
    }

    const saleItems = Array.isArray(sale.items) ? sale.items : []
    const saleItemMap = new Map(saleItems.map(item => [String(item.variantId || item.productId), item]))

    const normalizedItems = []
    for (const item of items) {
      const quantity = parseInt(item.quantity)
      if (!quantity || quantity <= 0) continue
      const key = String(item.variantId || item.productId)
      const matched = saleItemMap.get(key)
      if (!matched) {
        return NextResponse.json({ success: false, error: 'Return item not found in sale' }, { status: 400 })
      }
      if (quantity > parseInt(matched.quantity)) {
        return NextResponse.json({ success: false, error: 'Return quantity exceeds sold quantity' }, { status: 400 })
      }
      normalizedItems.push({
        productId: String(matched.productId),
        variantId: String(matched.variantId),
        quantity,
        title: matched.title,
        price: parseFloat(matched.price || 0),
        costPrice: parseFloat(matched.costPrice || 0),
        discount: parseFloat(matched.discount || 0),
        sku: matched.sku || null,
      })
    }

    if (normalizedItems.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid return quantities provided' }, { status: 400 })
    }

    // Compute exact return amount and split
    const returnAmount = calcReturnAmount(sale, normalizedItems)
    const cashAmount = Number.isFinite(rawCash) ? Math.max(0, Math.min(rawCash, returnAmount)) : returnAmount
    const ledgerAmount = Math.max(0, parseFloat((returnAmount - cashAmount).toFixed(2)))

    // Ledger requires a customer
    if (ledgerAmount > 0 && !customerId) {
      return NextResponse.json(
        { success: false, error: 'A customer must be selected when adding amount to the ledger' },
        { status: 400 }
      )
    }

    // Apply ledger credit if any portion goes to ledger
    let financeResult = { returnAmount, ledgerAmount, applied: false }
    if (ledgerAmount > 0) {
      financeResult = await applySaleReturnFinance(sale, normalizedItems, {
        amountOverride: ledgerAmount,
        customerId,
      })
    }

    // Record the return
    await createSaleReturn({
      saleId,
      items: normalizedItems,
      returnAmount,
      cashAmount,
      ledgerAmount,
      customerId: ledgerAmount > 0 ? customerId : null,
      customerName: bodyCustomerName || sale.customerName || null,
      saleTotal: parseFloat(sale.total || 0),
      employeeId: sale.employeeId || null,
      employeeName: sale.employeeName || null,
    })

    // Always restock inventory
    await restockSaleItems(normalizedItems)

    // Update Shopify inventory
    const inventoryUpdates = []
    try {
      const locations = await getLocations()
      const locationId = locations.length > 0 ? locations[0].id : null
      if (!locationId) {
        normalizedItems.forEach(item => inventoryUpdates.push({ ...item, status: 'skipped', reason: 'No Shopify location found' }))
      } else {
        for (const item of normalizedItems) {
          if (!item.variantId) {
            inventoryUpdates.push({ ...item, status: 'skipped', reason: 'No variant ID' })
            continue
          }
          try {
            const variant = await getVariantById(item.variantId)
            if (variant?.inventory_item_id) {
              const result = await adjustInventory(locationId, variant.inventory_item_id, parseInt(item.quantity))
              inventoryUpdates.push({ ...item, status: 'success', newQuantity: result?.available ?? 'unknown' })
              console.log(`✅ Shopify restock: ${item.title} +${item.quantity} → ${result?.available ?? '?'}`)
            } else {
              inventoryUpdates.push({ ...item, status: 'skipped', reason: variant ? 'No inventory_item_id' : 'Variant not found' })
            }
          } catch (err) {
            console.error(`❌ Shopify restock error for ${item.title}:`, err.message)
            inventoryUpdates.push({ ...item, status: 'error', error: err.message })
          }
        }
      }
    } catch (err) {
      normalizedItems.forEach(item => inventoryUpdates.push({ ...item, status: 'error', error: err.message }))
    }

    return NextResponse.json({
      success: true,
      saleId,
      items: normalizedItems,
      returnAmount,
      cashAmount,
      ledgerAmount,
      financeApplied: financeResult.applied,
      inventoryUpdates,
      message: 'Sale return processed successfully',
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process sale return' },
      { status: 500 }
    )
  }
}
