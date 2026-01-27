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
let tableNamesCache = null

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

async function getTableNames() {
  if (tableNamesCache) return tableNamesCache
  const connection = getPool()
  const [rows] = await connection.query('SHOW TABLES')
  const tableList = rows.map((r) => Object.values(r)[0])
  const resolve = (candidates) => {
    for (const name of candidates) {
      if (tableList.includes(name)) return name
    }
    return candidates[0]
  }
  tableNamesCache = {
    product: resolve(['Product', 'product']),
    productvariant: resolve(['ProductVariant', 'productvariant']),
  }
  return tableNamesCache
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
    const { product: productTable, productvariant: variantTable } = await getTableNames()

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
      0, // Default cost price to 0 on upsert (Shopify might not provide it)
      totalQuantity,
    ]

    await conn.execute(
      `INSERT INTO ${productTable} (id, title, description, vendor, product_type, status, image, handle, sale_price, cost_price, quantity, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
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
    await conn.execute(`DELETE FROM ${variantTable} WHERE productId = ?`, [String(product.id)])

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
        `INSERT INTO ${variantTable} (id, productId, title, price, compare_at_price, sku, barcode, inventory_quantity, weight, weight_unit, updatedAt)
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
    const { product: productTable, productvariant: variantTable } = await getTableNames()
    await connection.execute(`DELETE FROM ${variantTable}`)
    await connection.execute(`DELETE FROM ${productTable}`)
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
    const { product: productTable } = await getTableNames()
    const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${productTable}`)
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
    const { product: productTable } = await getTableNames()
    await connection.execute(
      `UPDATE ${productTable} SET categoryId = ?, updatedAt = NOW() WHERE id = ?`,
      [categoryId, String(productId)]
    )
    return { success: true }
  } catch (error) {
    console.error(`❌ Error updating category for product ${productId}:`, error)
    throw error
  }
}

/**
 * Get a single product and its variants by ID
 * @param {string} id 
 */
export async function getProductById(id) {
  const connection = getPool()
  try {
    const { product: productTable, productvariant: variantTable } = await getTableNames()
    const [products] = await connection.execute(
      `SELECT * FROM ${productTable} WHERE id = ? LIMIT 1`,
      [String(id)]
    )

    if (products.length === 0) return null

    const product = products[0]

    const [variants] = await connection.execute(
      `SELECT * FROM ${variantTable} WHERE productId = ?`,
      [String(id)]
    )

    product.variants = variants
    return product
  } catch (error) {
    console.error(`❌ Error fetching product ${id}:`, error)
    throw error
  }
}

/**
 * Delete a product and its variants from the local database
 * @param {string} id 
 */
export async function deleteProduct(id) {
  const connection = getPool()
  const conn = await connection.getConnection()
  try {
    await conn.beginTransaction()

    const { product: productTable, productvariant: variantTable } = await getTableNames()
    await conn.execute(`DELETE FROM ${variantTable} WHERE productId = ?`, [String(id)])
    await conn.execute(`DELETE FROM ${productTable} WHERE id = ?`, [String(id)])

    await conn.commit()
    return { success: true }
  } catch (error) {
    await conn.rollback()
    console.error(`❌ Error deleting product ${id}:`, error)
    throw error
  } finally {
    conn.release()
  }
}

/**
 * Update core product fields
 * @param {string} id 
 * @param {object} data 
 */
export async function updateProduct(id, data) {
  const connection = getPool()
  const conn = await connection.getConnection()
  try {
    await conn.beginTransaction()
    const { product: productTable, productvariant: variantTable } = await getTableNames()

    // Update Product table
    const updateFields = []
    const params = []

    if (data.title !== undefined) { updateFields.push('title = ?'); params.push(data.title) }
    if (data.vendor !== undefined) { updateFields.push('vendor = ?'); params.push(data.vendor) }
    if (data.status !== undefined) { updateFields.push('status = ?'); params.push(data.status) }
    if (data.sale_price !== undefined) { updateFields.push('sale_price = ?'); params.push(data.sale_price) }
    if (data.original_price !== undefined) { updateFields.push('original_price = ?'); params.push(data.original_price) }
    if (data.cost_price !== undefined) { updateFields.push('cost_price = ?'); params.push(data.cost_price) }
    if (data.quantity !== undefined) { updateFields.push('quantity = ?'); params.push(data.quantity) }
    if (data.categoryId !== undefined) { updateFields.push('categoryId = ?'); params.push(data.categoryId) }

    if (updateFields.length > 0) {
      params.push(String(id))
      await conn.execute(
        `UPDATE ${productTable} SET ${updateFields.join(', ')}, updatedAt = NOW() WHERE id = ?`,
        params
      )
    }

    // Update main variant if barcode or prices are provided
    if (data.barcode !== undefined || data.sale_price !== undefined || data.original_price !== undefined) {
      // Find the first variant
      const [variants] = await conn.execute(`SELECT id FROM ${variantTable} WHERE productId = ? LIMIT 1`, [String(id)])
      if (variants.length > 0) {
        const variantId = variants[0].id
        const vUpdateFields = []
        const vParams = []

        if (data.barcode !== undefined) { vUpdateFields.push('barcode = ?'); vParams.push(data.barcode) }
        if (data.sale_price !== undefined) { vUpdateFields.push('price = ?'); vParams.push(data.sale_price) }
        if (data.original_price !== undefined) { vUpdateFields.push('compare_at_price = ?'); vParams.push(data.original_price) }

        if (vUpdateFields.length > 0) {
          vParams.push(variantId)
          await conn.execute(
            `UPDATE ${variantTable} SET ${vUpdateFields.join(', ')}, updatedAt = NOW() WHERE id = ?`,
            vParams
          )
        }
      }
    }

    await conn.commit()
    return { success: true }
  } catch (error) {
    await conn.rollback()
    console.error(`❌ Error updating product ${id}:`, error)
    throw error
  } finally {
    conn.release()
  }
}

export default {
  upsertProduct,
  clearProducts,
  getLocalProductCount,
  updateProductCategory,
  getProductById,
  deleteProduct,
  updateProduct,
}
