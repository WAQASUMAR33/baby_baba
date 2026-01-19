import mysql from 'mysql2/promise'

// Parse DATABASE_URL
const parseDatabaseUrl = (url) => {
  if (!url) throw new Error('DATABASE_URL not defined')
  const match = url.match(/mysql:\/\/([^:]+)(?::([^@]*))?@([^:]+):(\d+)\/(.+)/)
  if (!match) throw new Error('Invalid DATABASE_URL format')
  return {
    host: match[3],
    port: parseInt(match[4]),
    user: match[1],
    password: match[2] || '',
    database: match[5],
  }
}

// Create connection pool
let pool = null

function getPool() {
  if (!pool) {
    const dbUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/mydb2'
    const config = parseDatabaseUrl(dbUrl)
    pool = mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: 20,
      maxIdle: 5,
      idleTimeout: 60000,
      queueLimit: 0,
    })
    console.log('✅ Product DB pool created')
  }
  return pool
}

/**
 * Upsert a product and its variants into the local database
 * @param {object} product - Shopify product object
 */
export async function upsertProduct(product) {
  const connection = getPool()
  const conn = await connection.getConnection()

  try {
    await conn.beginTransaction()

    // Upsert product
    const productSalePrice = product.variants?.[0]?.price || 0
    const totalQuantity = product.variants?.reduce((sum, v) => sum + (parseInt(v.inventory_quantity) || 0), 0) || 0

    const productData = [
      String(product.id),
      product.title,
      product.body_html || null,
      product.vendor || null,
      product.product_type || null,
      product.status || 'active',
      product.image?.src || (product.images?.[0]?.src) || null,
      product.handle || null,
      productSalePrice,
      totalQuantity,
    ]

    await conn.execute(
      `INSERT INTO Product (id, title, description, vendor, product_type, status, image, handle, sale_price, quantity, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       description = VALUES(description),
       vendor = VALUES(vendor),
       product_type = VALUES(product_type),
       status = VALUES(status),
       image = VALUES(image),
       handle = VALUES(handle),
       sale_price = VALUES(sale_price),
       quantity = VALUES(quantity),
       updatedAt = NOW()`,
      productData
    )

    // Delete existing variants for this product to sync
    await conn.execute('DELETE FROM ProductVariant WHERE productId = ?', [String(product.id)])

    // Insert new variants
    for (const variant of product.variants || []) {
      const variantData = [
        String(variant.id),
        String(product.id),
        variant.title || null,
        variant.price || 0,
        variant.compare_at_price || null,
        variant.sku || null,
        variant.barcode || null,
        variant.inventory_quantity || 0,
        variant.weight || null,
        variant.weight_unit || null,
      ]

      await conn.execute(
        `INSERT INTO ProductVariant (id, productId, title, price, compare_at_price, sku, barcode, inventory_quantity, weight, weight_unit, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        variantData
      )
    }

    await conn.commit()
  } catch (error) {
    await conn.rollback()
    console.error(`❌ Error upserting product ${product.id}:`, error)
    throw error
  } finally {
    conn.release()
  }
}

/**
 * Clear all products and variants from the database
 */
export async function clearProducts() {
  const connection = getPool()
  try {
    await connection.execute('DELETE FROM ProductVariant')
    await connection.execute('DELETE FROM Product')
    console.log('✅ Cleared all products and variants from database')
  } catch (error) {
    console.error('❌ Error clearing products:', error)
    throw error
  }
}

/**
 * Get the count of products in the local database
 * @returns {Promise<number>} - Product count
 */
export async function getLocalProductCount() {
  const connection = getPool()
  try {
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM Product')
    return rows[0]?.count || 0
  } catch (error) {
    console.error('❌ Error getting product count:', error)
    return 0
  }
}

/**
 * Update the category of a product
 * @param {string} productId 
 * @param {number|null} categoryId 
 */
export async function updateProductCategory(productId, categoryId) {
  const connection = getPool()
  try {
    await connection.execute(
      'UPDATE Product SET categoryId = ?, updatedAt = NOW() WHERE id = ?',
      [categoryId, String(productId)]
    )
    return { success: true }
  } catch (error) {
    console.error(`❌ Error updating category for product ${productId}:`, error)
    throw error
  }
}

export default {
  upsertProduct,
  clearProducts,
  getLocalProductCount,
  updateProductCategory,
}
