import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getVariantById, getLocations, setInventory } from '@/lib/shopify'
import { getProductById, reduceProductStock, zeroProductStock } from '@/lib/product-db'

/**
 * POST /api/products/[id]/stock
 *
 * Body: { action: 'deduct', quantity: N }
 *   → Decreases local MySQL stock only (no Shopify call)
 *
 * Body: { action: 'out-of-stock' }
 *   → Sets Shopify inventory to 0 AND zeros local MySQL stock
 */
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    if (body.action !== 'deduct' && body.action !== 'out-of-stock') {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }

    // ── DEDUCT: MySQL only ─────────────────────────────────────────────────
    if (body.action === 'deduct') {
      const deductQty = parseInt(body.quantity)
      if (!deductQty || deductQty <= 0) {
        return NextResponse.json(
          { success: false, error: 'Quantity must be a positive number' },
          { status: 400 }
        )
      }

      await reduceProductStock(id, deductQty)
      console.log(`✅ Local stock deducted: product ${id} −${deductQty}`)

      return NextResponse.json({
        success: true,
        message: `Deducted ${deductQty} from local stock`,
      })
    }

    // ── OUT-OF-STOCK: Shopify + MySQL ──────────────────────────────────────
    const product = await getProductById(id)
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }

    const variants = product.variants || []
    if (variants.length === 0) {
      return NextResponse.json({ success: false, error: 'Product has no variants' }, { status: 400 })
    }

    const locations = await getLocations()
    const locationId = locations.length > 0 ? locations[0].id : null

    if (!locationId) {
      return NextResponse.json({ success: false, error: 'No Shopify location found' }, { status: 500 })
    }

    const results = []
    for (const variant of variants) {
      const variantId = variant.id
      if (!variantId) {
        results.push({ variantId: null, status: 'skipped', reason: 'No variant ID' })
        continue
      }
      try {
        const shopifyVariant = await getVariantById(variantId)
        if (!shopifyVariant?.inventory_item_id) {
          results.push({ variantId, status: 'skipped', reason: 'Not inventory-tracked on Shopify' })
          continue
        }
        await setInventory(locationId, shopifyVariant.inventory_item_id, 0)
        results.push({ variantId, status: 'success' })
        console.log(`✅ Shopify inventory set to 0: variant ${variantId}`)
      } catch (err) {
        console.error(`❌ Shopify stock error for variant ${variantId}:`, err.message)
        results.push({ variantId, status: 'error', error: err.message })
      }
    }

    try {
      await zeroProductStock(id)
    } catch (err) {
      console.error('Failed to zero local product stock:', err.message)
    }

    const hasSuccess = results.some(r => r.status === 'success')
    const hasError = results.some(r => r.status === 'error')

    return NextResponse.json({
      success: hasSuccess || !hasError,
      results,
      message: hasSuccess
        ? 'Product marked as out of stock on Shopify'
        : 'No variants were updated on Shopify',
    })
  } catch (error) {
    console.error('❌ Stock update error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
