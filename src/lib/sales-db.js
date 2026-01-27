// Direct SQL for sales operations (more reliable than Prisma with adapter issues)
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
let hasSaleItemDiscountColumn = null

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
    console.log('✅ Sales DB pool created')
  }
  return pool
}

async function ensureSaleItemDiscountColumn(connection) {
  if (hasSaleItemDiscountColumn !== null) return
  try {
    await connection.execute("ALTER TABLE `SaleItem` ADD COLUMN `discount` DECIMAL(10,2) DEFAULT 0")
    hasSaleItemDiscountColumn = true
  } catch (error) {
    if (error?.code === 'ER_DUP_FIELDNAME') {
      hasSaleItemDiscountColumn = true
      return
    }
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      hasSaleItemDiscountColumn = false
      return
    }
    throw error
  }
}

export async function findUserByEmail(email) {
  try {
    const connection = getPool()
    const [users] = await connection.execute(
      'SELECT * FROM User WHERE email = ?',
      [email.trim().toLowerCase()]
    )
    return users.length > 0 ? users[0] : null
  } catch (error) {
    console.error('❌ Error finding user:', error)
    throw error
  }
}

export async function createSale(saleData, userId) {
  const connection = getPool()
  const conn = await connection.getConnection()

  try {
    await ensureSaleItemDiscountColumn(conn)
    await conn.beginTransaction()

    // Calculate total commission for the sale
    let totalCommission = 0;
    const itemsWithCommission = saleData.items.map(item => {
      const price = parseFloat(item.price);
      const originalPrice = parseFloat(item.originalPrice || 0);
      let itemCommissionPerUnit = 0;

      if (price <= originalPrice) {
        // 1% of the sale amount
        itemCommissionPerUnit = price * 0.01;
      } else {
        // 1% of original price + 10% of profit
        itemCommissionPerUnit = (originalPrice * 0.01) + ((price - originalPrice) * 0.10);
      }

      const itemTotalCommission = itemCommissionPerUnit * item.quantity;
      totalCommission += itemTotalCommission;
      return { ...item, commission: itemTotalCommission };
    });

    // Insert sale
    const [saleResult] = await conn.execute(
      `INSERT INTO Sale (subtotal, discount, total, paymentMethod, amountReceived, \`change\`, customerName, status, commission, employeeId, employeeName, userId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        saleData.subtotal,
        saleData.discount,
        saleData.total,
        saleData.paymentMethod,
        saleData.amountReceived,
        saleData.change,
        saleData.customerName,
        saleData.status,
        totalCommission,
        saleData.employeeId,
        saleData.employeeName,
        userId,
      ]
    )

    const saleId = saleResult.insertId

    // Insert sale items and update inventory
    for (const item of itemsWithCommission) {
      // Some DBs may not yet have the `commission` column on SaleItem.
      // Try with commission first, then gracefully fallback without it.
      const insertVariants = [
        {
          query: `INSERT INTO SaleItem (saleId, productId, variantId, title, price, quantity, discount, commission, sku, image, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          params: [
            saleId,
            String(item.productId),
            String(item.variantId),
            item.title,
            item.price,
            item.quantity,
            parseFloat(item.discount || 0),
            item.commission,
            item.sku || null,
            item.image || null,
          ],
        },
        {
          query: `INSERT INTO SaleItem (saleId, productId, variantId, title, price, quantity, commission, sku, image, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          params: [
            saleId,
            String(item.productId),
            String(item.variantId),
            item.title,
            item.price,
            item.quantity,
            item.commission,
            item.sku || null,
            item.image || null,
          ],
        },
        {
          query: `INSERT INTO SaleItem (saleId, productId, variantId, title, price, quantity, discount, sku, image, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          params: [
            saleId,
            String(item.productId),
            String(item.variantId),
            item.title,
            item.price,
            item.quantity,
            parseFloat(item.discount || 0),
            item.sku || null,
            item.image || null,
          ],
        },
        {
          query: `INSERT INTO SaleItem (saleId, productId, variantId, title, price, quantity, sku, image, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          params: [
            saleId,
            String(item.productId),
            String(item.variantId),
            item.title,
            item.price,
            item.quantity,
            item.sku || null,
            item.image || null,
          ],
        },
      ]

      let inserted = false
      for (const variant of insertVariants) {
        try {
          await conn.execute(variant.query, variant.params)
          inserted = true
          break
        } catch (insertErr) {
          if (insertErr?.code === 'ER_BAD_FIELD_ERROR') {
            continue
          }
          throw insertErr
        }
      }

      if (!inserted) {
        throw new Error('Failed to insert SaleItem with available columns')
      }

      // Update local variant inventory
      await conn.execute(
        `UPDATE productvariant SET inventory_quantity = inventory_quantity - ?, updatedAt = NOW() WHERE id = ?`,
        [item.quantity, String(item.variantId)]
      )

      // Update local product total quantity
      await conn.execute(
        `UPDATE product SET quantity = quantity - ?, updatedAt = NOW() WHERE id = ?`,
        [item.quantity, String(item.productId)]
      )
    }

    await conn.commit()

    // Fetch created sale with items
    const [sales] = await connection.execute(
      `SELECT * FROM Sale WHERE id = ?`,
      [saleId]
    )

    const [items] = await connection.execute(
      `SELECT * FROM SaleItem WHERE saleId = ?`,
      [saleId]
    )

    return {
      ...sales[0],
      items,
    }
  } catch (error) {
    await conn.rollback()
    console.error('❌ Error creating sale:', error)
    throw error
  } finally {
    conn.release()
  }
}

export async function getSales(filters = {}) {
  try {
    const connection = getPool()

    let query = `
      SELECT s.*, u.name as userName, u.email as userEmail
      FROM Sale s
      LEFT JOIN User u ON s.userId = u.id
    `
    const params = []
    const conditions = []

    // Status filter
    if (filters.status) {
      conditions.push('s.status = ?')
      params.push(filters.status)
    }

    // Employee filter
    if (filters.employeeId) {
      conditions.push('s.employeeId = ?')
      params.push(filters.employeeId)
    }

    // Date range filter
    if (filters.startDate) {
      conditions.push('DATE(s.createdAt) >= ?')
      params.push(filters.startDate)
    }

    if (filters.endDate) {
      conditions.push('DATE(s.createdAt) <= ?')
      params.push(filters.endDate)
    }

    // Add WHERE clause if there are conditions
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' ORDER BY s.createdAt DESC'

    // Use string interpolation for LIMIT/OFFSET instead of params
    // (MySQL prepared statements have issues with LIMIT as parameter)
    const limit = parseInt(filters.limit) || 100
    const offset = parseInt(filters.offset) || 0
    query += ` LIMIT ${limit} OFFSET ${offset}`

    const [sales] = await connection.execute(query, params)

    // Fetch items for each sale
    for (const sale of sales) {
      const [items] = await connection.execute(
        'SELECT * FROM SaleItem WHERE saleId = ?',
        [sale.id]
      )
      sale.items = items
    }

    // Get total count with same filters
    let countQuery = 'SELECT COUNT(*) as count FROM Sale'
    const countParams = []
    const countConditions = []

    if (filters.status) {
      countConditions.push('status = ?')
      countParams.push(filters.status)
    }

    if (filters.employeeId) {
      countConditions.push('employeeId = ?')
      countParams.push(filters.employeeId)
    }

    if (filters.startDate) {
      countConditions.push('DATE(createdAt) >= ?')
      countParams.push(filters.startDate)
    }

    if (filters.endDate) {
      countConditions.push('DATE(createdAt) <= ?')
      countParams.push(filters.endDate)
    }

    if (countConditions.length > 0) {
      countQuery += ' WHERE ' + countConditions.join(' AND ')
    }

    const [countResult] = await connection.execute(countQuery, countParams)
    const total = countResult[0].count

    // Get stats with same date and employee filters
    let statsQuery = `
      SELECT 
        COUNT(*) as totalSales,
        SUM(total) as totalRevenue,
        SUM(discount) as totalDiscount,
        SUM(commission) as totalCommission
       FROM Sale
       WHERE status = 'completed'
    `
    const statsParams = []

    if (filters.employeeId) {
      statsQuery += ' AND employeeId = ?'
      statsParams.push(filters.employeeId)
    }

    if (filters.startDate) {
      statsQuery += ' AND DATE(createdAt) >= ?'
      statsParams.push(filters.startDate)
    }

    if (filters.endDate) {
      statsQuery += ' AND DATE(createdAt) <= ?'
      statsParams.push(filters.endDate)
    }

    const [statsResult] = await connection.execute(statsQuery, statsParams)

    return {
      sales,
      total,
      stats: statsResult[0],
    }
  } catch (error) {
    console.error('❌ Error fetching sales:', error)
    throw error
  }
}

export default {
  findUserByEmail,
  createSale,
  getSales,
}
