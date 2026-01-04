import { NextResponse } from 'next/server'
import { createProduct } from '@/lib/shopify'
import { createProductListing } from '@/lib/shopify-listings'

/**
 * POST /api/shopify/products/create
 * Create a new product in Shopify and optionally publish to sales channel
 */
export async function POST(request) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { success: false, error: 'Product title is required' },
        { status: 400 }
      )
    }

    // Build product data
    const productData = {
      title: body.title,
      body_html: body.description || '',
      vendor: body.vendor || '',
      product_type: body.product_type || '',
      tags: body.tags || '',
      status: body.status || 'draft',
      published: body.published !== undefined ? body.published : false,
    }

    // Add variants if provided
    if (body.variants && body.variants.length > 0) {
      productData.variants = body.variants.map(variant => ({
        price: variant.price || '0.00',
        compare_at_price: variant.compare_at_price || null,
        sku: variant.sku || '',
        barcode: variant.barcode || '',
        inventory_quantity: parseInt(variant.inventory_quantity) || 0,
        inventory_management: body.track_quantity ? 'shopify' : null,
        weight: parseFloat(variant.weight) || 0,
        weight_unit: variant.weight_unit || 'kg',
        requires_shipping: variant.requires_shipping !== undefined ? variant.requires_shipping : true,
        option1: variant.option1 || null,
        option2: variant.option2 || null,
        option3: variant.option3 || null,
      }))
    } else {
      // Default variant
      productData.variants = [{
        price: body.price || '0.00',
        compare_at_price: body.compare_at_price || null,
        sku: body.sku || '',
        barcode: body.barcode || '',
        inventory_quantity: parseInt(body.inventory_quantity) || 0,
        inventory_management: body.track_quantity ? 'shopify' : null,
        weight: parseFloat(body.weight) || 0,
        weight_unit: body.weight_unit || 'kg',
        requires_shipping: body.requires_shipping !== undefined ? body.requires_shipping : true,
      }]
    }

    // Add images if provided
    if (body.images && body.images.length > 0) {
      productData.images = body.images.map(img => {
        if (typeof img === 'string') {
          return { src: img, alt: body.title }
        }
        return {
          src: img.src || img.url || img,
          alt: img.alt || body.title,
        }
      })
      console.log('📸 Adding images:', productData.images.length, 'images')
    }

    // Create product in Shopify
    console.log('🚀 Creating product with data:', JSON.stringify(productData, null, 2))
    const product = await createProduct(productData)
    console.log('✅ Product created:', product.id)

    // Add product to collections if specified
    if (body.collections && body.collections.length > 0 && product.id) {
      console.log('📁 Adding product to collections:', body.collections)
      try {
        for (const collectionId of body.collections) {
          // Use Shopify API to add product to collection via "collects"
          await fetch(
            `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/${process.env.SHOPIFY_API_VERSION || '2024-01'}/collects.json`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
              },
              body: JSON.stringify({
                collect: {
                  product_id: product.id,
                  collection_id: parseInt(collectionId),
                }
              })
            }
          )
        }
        console.log('✅ Product added to', body.collections.length, 'collections')
      } catch (collectError) {
        console.error('⚠️ Error adding to collections:', collectError)
        // Don't fail the whole request if collections fail
      }
    }

    // Note: Product Listing API auto-publishing is disabled by default
    // Products are created in your Shopify admin and will be available
    // based on your sales channel settings
    
    return NextResponse.json({
      success: true,
      product,
      message: 'Product created successfully',
      note: 'Product is now available in your Shopify admin',
      collectionsAdded: body.collections?.length || 0,
    })
  } catch (error) {
    console.error('Error creating product:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create product',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

