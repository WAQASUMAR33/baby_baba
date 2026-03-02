// Direct SQL for sales operations (more reliable than Prisma with adapter issues)
import mysql from 'mysql2/promise'

// Parse DATABASE_URL
const parseDatabaseUrl = (url) => {
  if (!url) throw new Error('DATABASE_URL not defined')
  const match = url.match(/^mysql:\/\/([^:@/]+)(?::([^@/]*))?@([^:/]+)(?::(\d+))?\/(.+)$/)
  if (!match) throw new Error('Invalid DATABASE_URL format')
  return {
    host: match[3],
    port: match[4] ? parseInt(match[4]) : 3306,
    user: match[1],
    password: match[2] || '',
    database: match[5],
  }
}

// Create connection pool
let pool = null
let hasSaleItemDiscountColumn = null
let hasSaleItemCostPriceColumn = null
let hasSalePaymentBreakdownColumn = null
let hasSaleCustomerIdColumn = null
let hasCustomerLedgerTable = null
let hasCustomerLedgerDebitCreditColumns = null

function getPool() {
  if (!pool) {
    const dbUrl = process.env.DATABASE_URL
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

let productTablesCache = null
async function getProductTables() {
  if (productTablesCache) return productTablesCache
  const connection = getPool()
  const [rows] = await connection.query('SHOW TABLES')
  const tableList = rows.map((r) => Object.values(r)[0])
  const resolve = (candidates) => {
    for (const name of candidates) {
      if (tableList.includes(name)) return name
    }
    return candidates[0]
  }
  productTablesCache = {
    product: resolve(['Product', 'product']),
    productvariant: resolve(['ProductVariant', 'productvariant']),
  }
  return productTablesCache
}

let salesTablesCache = null
async function getSalesTables() {
  if (salesTablesCache) return salesTablesCache
  const connection = getPool()
  const [rows] = await connection.query('SHOW TABLES')
  const tableList = rows.map((r) => Object.values(r)[0])
  const resolve = (candidates) => {
    for (const name of candidates) {
      if (tableList.includes(name)) return name
    }
    return null
  }
  salesTablesCache = {
    sale: resolve(['Sale', 'sale', 'sales']),
    saleitem: resolve(['SaleItem', 'saleitem', 'sale_item']),
    user: resolve(['User', 'user', 'users'])
  }
  return salesTablesCache
}

let customerTableCache = null
async function getCustomerTable() {
  if (customerTableCache !== null) return customerTableCache
  const connection = getPool()
  const [rows] = await connection.query('SHOW TABLES')
  const tableList = rows.map((r) => Object.values(r)[0])
  for (const name of ['Customer', 'customer', 'Customers', 'customers']) {
    if (tableList.includes(name)) {
      customerTableCache = name
      return customerTableCache
    }
  }
  customerTableCache = null
  return null
}
async function ensureSaleItemDiscountColumn(connection) {
  if (hasSaleItemDiscountColumn !== null) return
  try {
    const { saleitem } = await getSalesTables()
    if (!saleitem) {
      hasSaleItemDiscountColumn = false
      return
    }
    await connection.execute(`ALTER TABLE \`${saleitem}\` ADD COLUMN \`discount\` DECIMAL(10,2) DEFAULT 0`)
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

async function ensureSaleItemCostPriceColumn(connection) {
  if (hasSaleItemCostPriceColumn !== null) return
  try {
    const { saleitem } = await getSalesTables()
    if (!saleitem) { hasSaleItemCostPriceColumn = false; return }
    await connection.execute(`ALTER TABLE \`${saleitem}\` ADD COLUMN \`costPrice\` DECIMAL(10,2) DEFAULT 0`)
    hasSaleItemCostPriceColumn = true
  } catch (error) {
    if (error?.code === 'ER_DUP_FIELDNAME') { hasSaleItemCostPriceColumn = true; return }
    if (error?.code === 'ER_NO_SUCH_TABLE') { hasSaleItemCostPriceColumn = false; return }
    throw error
  }
}

async function ensureSalePaymentBreakdownColumn(connection) {
  if (hasSalePaymentBreakdownColumn !== null) return
  try {
    const { sale } = await getSalesTables()
    if (!sale) {
      hasSalePaymentBreakdownColumn = false
      return
    }
    await connection.execute(`ALTER TABLE \`${sale}\` ADD COLUMN \`paymentBreakdown\` TEXT NULL`)
    hasSalePaymentBreakdownColumn = true
  } catch (error) {
    if (error?.code === 'ER_DUP_FIELDNAME') {
      hasSalePaymentBreakdownColumn = true
      return
    }
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      hasSalePaymentBreakdownColumn = false
      return
    }
    throw error
  }
}

async function ensureSaleCustomerIdColumn(connection) {
  if (hasSaleCustomerIdColumn !== null) return
  try {
    const { sale } = await getSalesTables()
    if (!sale) {
      hasSaleCustomerIdColumn = false
      return
    }
    await connection.execute(`ALTER TABLE \`${sale}\` ADD COLUMN \`customerId\` INT NULL`)
    hasSaleCustomerIdColumn = true
  } catch (error) {
    if (error?.code === 'ER_DUP_FIELDNAME') {
      hasSaleCustomerIdColumn = true
      return
    }
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      hasSaleCustomerIdColumn = false
      return
    }
    throw error
  }
}

async function ensureCustomerLedgerTable(connection) {
  if (hasCustomerLedgerTable !== null) return
  await connection.execute(`CREATE TABLE IF NOT EXISTS CustomerLedger (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customerId INT NOT NULL,
    referenceId INT NULL,
    referenceType VARCHAR(50) NOT NULL,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    paid DECIMAL(10,2) NOT NULL DEFAULT 0,
    due DECIMAL(10,2) NOT NULL DEFAULT 0,
    debit DECIMAL(10,2) NOT NULL DEFAULT 0,
    credit DECIMAL(10,2) NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (customerId),
    INDEX (referenceId),
    INDEX (referenceType)
  )`)
  hasCustomerLedgerTable = true
}

async function ensureCustomerLedgerDebitCreditColumns(connection) {
  if (hasCustomerLedgerDebitCreditColumns !== null) return
  try {
    await connection.execute('ALTER TABLE CustomerLedger ADD COLUMN debit DECIMAL(10,2) NOT NULL DEFAULT 0')
    await connection.execute('ALTER TABLE CustomerLedger ADD COLUMN credit DECIMAL(10,2) NOT NULL DEFAULT 0')
    hasCustomerLedgerDebitCreditColumns = true
  } catch (error) {
    if (error?.code === 'ER_DUP_FIELDNAME') {
      hasCustomerLedgerDebitCreditColumns = true
      return
    }
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      hasCustomerLedgerDebitCreditColumns = false
      return
    }
    throw error
  }
}

function calculatePaidAndDue(saleLike) {
  const total = Number.isFinite(parseFloat(saleLike?.total)) ? parseFloat(saleLike.total) : 0
  const amountReceived = Number.isFinite(parseFloat(saleLike?.amountReceived)) ? parseFloat(saleLike.amountReceived) : 0
  const change = Number.isFinite(parseFloat(saleLike?.change)) ? parseFloat(saleLike.change) : 0
  const normalizedChange = Math.max(0, change)
  const paid = amountReceived - normalizedChange
  const due = total - paid
  return { total, paid, due }
}

async function resolveCustomerId(connection, customerId, customerName) {
  const resolvedId = customerId ? parseInt(customerId) : null
  if (Number.isInteger(resolvedId) && resolvedId > 0) return resolvedId
  if (!customerName) return null
  const customerTable = await getCustomerTable()
  if (!customerTable) return null
  const normalizeName = (value) => value.replace(/\s+/g, ' ').trim()
  const trimmedName = normalizeName(customerName)
  const normalizedName = normalizeName(trimmedName.replace(/\s*\(.*\)\s*$/, ''))
  const nameCandidates = Array.from(new Set([trimmedName, normalizedName])).filter(Boolean)
  for (const name of nameCandidates) {
    const [rows] = await connection.execute(
      `SELECT id FROM ${customerTable} WHERE LOWER(TRIM(name)) = ? LIMIT 1`,
      [name.toLowerCase()]
    )
    if (rows.length > 0) {
      return rows[0].id
    }
  }
  const digits = trimmedName.replace(/\D/g, '')
  if (digits.length < 6) return null
  const [rows] = await connection.execute(
    `SELECT id FROM ${customerTable}
     WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone_number, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = ?
     LIMIT 1`,
    [digits]
  )
  if (rows.length === 0) return null
  return rows[0].id
}

async function ensureReturnCustomerId(connection, sale) {
  const customerTable = await getCustomerTable()
  if (!customerTable) return null
  const rawName = sale?.customerName ? String(sale.customerName) : 'Walk-in Customer'
  const normalizedName = rawName.replace(/\s+/g, ' ').trim()
  if (!normalizedName) return null
  const [existing] = await connection.execute(
    `SELECT id FROM ${customerTable} WHERE LOWER(TRIM(name)) = ? LIMIT 1`,
    [normalizedName.toLowerCase()]
  )
  if (existing.length > 0) return existing[0].id
  const [result] = await connection.execute(
    `INSERT INTO ${customerTable} (name, phone_number, address, balance, createdAt, updatedAt) VALUES (?, ?, ?, 0, NOW(), NOW())`,
    [normalizedName, '0000000000', '']
  )
  const newCustomerId = result.insertId
  try {
    const { sale: saleTable } = await getSalesTables()
    if (saleTable && sale?.id) {
      await connection.execute(
        `UPDATE ${saleTable} SET customerId = ? WHERE id = ?`,
        [newCustomerId, String(sale.id)]
      )
    }
  } catch (error) {
    if (error?.code !== 'ER_BAD_FIELD_ERROR') {
      throw error
    }
  }
  return newCustomerId
}

async function applyCustomerLedgerEntry(connection, saleData, saleId) {
  const customerId = await resolveCustomerId(connection, saleData.customerId, saleData.customerName)
  if (!customerId) return
  const customerTable = await getCustomerTable()
  if (!customerTable) return
  await ensureCustomerLedgerTable(connection)
  await ensureCustomerLedgerDebitCreditColumns(connection)
  const { total, paid, due } = calculatePaidAndDue(saleData)
  await connection.execute(
    `UPDATE ${customerTable} SET balance = balance + ? WHERE id = ?`,
    [due, customerId]
  )
  const referenceType = saleData.status === 'order' ? 'order' : 'sale'
  const paymentReferenceType = referenceType === 'order' ? 'order-payment' : 'sale-payment'
  if (total > 0) {
    await connection.execute(
      `INSERT INTO CustomerLedger (customerId, referenceId, referenceType, total, paid, due, debit, credit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [customerId, saleId, referenceType, total, 0, total, total, 0]
    )
  }
  if (paid > 0) {
    await connection.execute(
      `INSERT INTO CustomerLedger (customerId, referenceId, referenceType, total, paid, due, debit, credit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [customerId, saleId, paymentReferenceType, total, paid, Math.max(0, total - paid), 0, paid]
    )
  }
}

async function reconcileCustomerLedgerEntry(connection, saleId, previousSale, saleData) {
  const customerTable = await getCustomerTable()
  if (!customerTable) return
  await ensureCustomerLedgerTable(connection)
  await ensureCustomerLedgerDebitCreditColumns(connection)

  // ── Order → Sale conversion: preserve prior payment history ─────────────────
  const isOrderToSale = previousSale?.status === 'order' && saleData.status === 'completed'
  if (isOrderToSale) {
    const previousCustomerId = await resolveCustomerId(connection, previousSale?.customerId, previousSale?.customerName)

    // Sum credits already recorded (partial payments made when booking the order)
    const [paidRows] = await connection.execute(
      `SELECT COALESCE(SUM(credit), 0) as totalPaid FROM CustomerLedger WHERE referenceId = ? AND referenceType IN ('order-payment', 'sale-payment')`,
      [saleId]
    )
    const previouslyPaid = parseFloat(paidRows[0]?.totalPaid || 0)

    // Reverse the "due" that was added to the customer's balance at order creation
    if (previousCustomerId) {
      const { due: oldDue } = calculatePaidAndDue(previousSale)
      await connection.execute(
        `UPDATE ${customerTable} SET balance = balance - ? WHERE id = ?`,
        [oldDue, previousCustomerId]
      )
    }

    const { total: newTotal, paid: newTotalPaid, due: newDue } = calculatePaidAndDue(saleData)
    const additionalPayment = Math.max(0, parseFloat((newTotalPaid - previouslyPaid).toFixed(2)))

    // Resolve the (possibly updated) customer
    const nextCustomerId =
      (await resolveCustomerId(connection, saleData.customerId, saleData.customerName)) ||
      previousCustomerId
    if (!nextCustomerId) return

    // Update existing entries in-place:
    //   order → sale  |  order-payment → sale-payment
    // Also update the debit entry's total in case items were edited during conversion
    await connection.execute(
      `UPDATE CustomerLedger
       SET referenceType = CASE
             WHEN referenceType = 'order'         THEN 'sale'
             WHEN referenceType = 'order-payment' THEN 'sale-payment'
             ELSE referenceType
           END,
           total    = CASE WHEN referenceType = 'order' THEN ? ELSE total END,
           customerId = ?
       WHERE referenceId = ?`,
      [newTotal, nextCustomerId, saleId]
    )

    // Apply the new "due" to the customer's balance
    await connection.execute(
      `UPDATE ${customerTable} SET balance = balance + ? WHERE id = ?`,
      [newDue, nextCustomerId]
    )

    // Insert a new sale-payment entry for the amount paid at conversion time
    if (additionalPayment > 0) {
      await connection.execute(
        `INSERT INTO CustomerLedger (customerId, referenceId, referenceType, total, paid, due, debit, credit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [nextCustomerId, saleId, 'sale-payment', newTotal, additionalPayment, newDue, 0, additionalPayment]
      )
    }
    return
  }

  // ── Standard reconcile (any other edit) ──────────────────────────────────────
  const previousCustomerId = await resolveCustomerId(connection, previousSale?.customerId, previousSale?.customerName)
  if (previousCustomerId) {
    const { due } = calculatePaidAndDue(previousSale)
    await connection.execute(
      `UPDATE ${customerTable} SET balance = balance - ? WHERE id = ?`,
      [due, previousCustomerId]
    )
  }
  await connection.execute(
    `DELETE FROM CustomerLedger WHERE referenceId = ?`,
    [saleId]
  )
  const nextCustomerId = await resolveCustomerId(connection, saleData.customerId, saleData.customerName)
  if (!nextCustomerId) return
  const { total, paid, due } = calculatePaidAndDue(saleData)
  await connection.execute(
    `UPDATE ${customerTable} SET balance = balance + ? WHERE id = ?`,
    [due, nextCustomerId]
  )
  const referenceType = saleData.status === 'order' ? 'order' : 'sale'
  const paymentReferenceType = referenceType === 'order' ? 'order-payment' : 'sale-payment'
  if (total > 0) {
    await connection.execute(
      `INSERT INTO CustomerLedger (customerId, referenceId, referenceType, total, paid, due, debit, credit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nextCustomerId, saleId, referenceType, total, 0, total, total, 0]
    )
  }
  if (paid > 0) {
    await connection.execute(
      `INSERT INTO CustomerLedger (customerId, referenceId, referenceType, total, paid, due, debit, credit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nextCustomerId, saleId, paymentReferenceType, total, paid, Math.max(0, total - paid), 0, paid]
    )
  }
}

export async function findUserByEmail(email) {
  try {
    const connection = getPool()
    const { user } = await getSalesTables()
    if (!user) return null
    const [users] = await connection.execute(
      `SELECT * FROM ${user} WHERE email = ?`,
      [email.trim().toLowerCase()]
    )
    return users.length > 0 ? users[0] : null
  } catch (error) {
    console.error('❌ Error finding user:', error)
    throw error
  }
}

export async function createSale(saleData, userId, options = {}) {
  const connection = getPool()
  const conn = await connection.getConnection()
  const adjustInventory = options.adjustInventory !== false
  const calculateCommission = options.calculateCommission !== false

  try {
    await ensureSaleItemDiscountColumn(conn)
    await ensureSaleItemCostPriceColumn(conn)
    await ensureSalePaymentBreakdownColumn(conn)
    await ensureSaleCustomerIdColumn(conn)
    await conn.beginTransaction()

    const { sale, saleitem } = await getSalesTables()
    if (!sale) {
      throw new Error('Sale table not found in database')
    }

    // Calculate total commission for the sale
    let totalCommission = 0;
    const itemsWithCommission = saleData.items.map(item => {
      if (!calculateCommission) {
        return { ...item, commission: 0 };
      }
      const price = parseFloat(item.price);
      const costPrice = parseFloat(item.originalPrice || 0);

      // No-commission thresholds based on cost price range:
      // costPrice < 10,000 → need ≥20% markup; costPrice ≥ 10,000 → need ≥10% markup
      if (costPrice > 0) {
        const threshold = costPrice < 10000 ? costPrice * 1.2 : costPrice * 1.1;
        if (price < threshold) {
          return { ...item, commission: 0 };
        }
      }

      let itemCommissionPerUnit = 0;
      if (price <= costPrice) {
        itemCommissionPerUnit = price * 0.01;
      } else {
        itemCommissionPerUnit = (costPrice * 0.01) + ((price - costPrice) * 0.10);
      }

      const itemTotalCommission = itemCommissionPerUnit * item.quantity;
      totalCommission += itemTotalCommission;
      return { ...item, commission: itemTotalCommission };
    });

    // Insert sale
    const saleInsertVariants = [
      {
        query: `INSERT INTO ${sale} (subtotal, discount, total, paymentMethod, paymentBreakdown, amountReceived, \`change\`, customerName, customerId, status, commission, employeeId, employeeName, userId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        params: [
          saleData.subtotal,
          saleData.discount,
          saleData.total,
          saleData.paymentMethod,
          saleData.paymentBreakdown,
          saleData.amountReceived,
          saleData.change,
          saleData.customerName,
          saleData.customerId || null,
          saleData.status,
          totalCommission,
          saleData.employeeId,
          saleData.employeeName,
          userId,
        ],
      },
      {
        query: `INSERT INTO ${sale} (subtotal, discount, total, paymentMethod, amountReceived, \`change\`, customerName, customerId, status, commission, employeeId, employeeName, userId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        params: [
          saleData.subtotal,
          saleData.discount,
          saleData.total,
          saleData.paymentMethod,
          saleData.amountReceived,
          saleData.change,
          saleData.customerName,
          saleData.customerId || null,
          saleData.status,
          totalCommission,
          saleData.employeeId,
          saleData.employeeName,
          userId,
        ],
      },
    ]

    let saleResult = null
    for (const variant of saleInsertVariants) {
      try {
        const [result] = await conn.execute(variant.query, variant.params)
        saleResult = result
        break
      } catch (insertErr) {
        if (insertErr?.code === 'ER_BAD_FIELD_ERROR') {
          continue
        }
        throw insertErr
      }
    }

    if (!saleResult) {
      throw new Error('Failed to insert Sale with available columns')
    }

    const saleId = saleResult.insertId

    // Insert sale items and update inventory
    for (const item of itemsWithCommission) {
      // Some DBs may not yet have the `commission` column on SaleItem.
      // Try with commission first, then gracefully fallback without it.
      const costPrice = parseFloat(item.originalPrice || item.costPrice || 0)
      const insertVariants = [
        {
          query: `INSERT INTO ${saleitem || 'SaleItem'} (saleId, productId, variantId, title, price, costPrice, quantity, discount, commission, sku, image, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          params: [
            saleId,
            String(item.productId),
            String(item.variantId),
            item.title,
            item.price,
            costPrice,
            item.quantity,
            parseFloat(item.discount || 0),
            item.commission,
            item.sku || null,
            item.image || null,
          ],
        },
        {
          query: `INSERT INTO ${saleitem || 'SaleItem'} (saleId, productId, variantId, title, price, quantity, discount, commission, sku, image, createdAt)
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
          query: `INSERT INTO ${saleitem || 'SaleItem'} (saleId, productId, variantId, title, price, quantity, commission, sku, image, createdAt)
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
          query: `INSERT INTO ${saleitem || 'SaleItem'} (saleId, productId, variantId, title, price, quantity, discount, sku, image, createdAt)
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
          query: `INSERT INTO ${saleitem || 'SaleItem'} (saleId, productId, variantId, title, price, quantity, sku, image, createdAt)
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

      if (adjustInventory) {
        const { productvariant: variantTable } = await getProductTables()
        await conn.execute(
          `UPDATE ${variantTable} SET inventory_quantity = inventory_quantity - ?, updatedAt = NOW() WHERE id = ?`,
          [item.quantity, String(item.variantId)]
        )
      }

      if (adjustInventory) {
        const { product: productTable } = await getProductTables()
        await conn.execute(
          `UPDATE ${productTable} SET quantity = quantity - ?, updatedAt = NOW() WHERE id = ?`,
          [item.quantity, String(item.productId)]
        )
      }
    }

    await applyCustomerLedgerEntry(conn, saleData, saleId)

    await conn.commit()

    // Fetch created sale with items
    const [sales] = await connection.execute(
      `SELECT * FROM ${sale} WHERE id = ?`,
      [saleId]
    )

    let items = []
    if (saleitem) {
      const [rows] = await connection.execute(
        `SELECT * FROM ${saleitem} WHERE saleId = ?`,
        [saleId]
      )
      items = rows
    }

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

export async function updateSaleWithItems(saleId, saleData, options = {}) {
  const connection = getPool()
  const conn = await connection.getConnection()
  const calculateCommission = options.calculateCommission !== false

  try {
    await ensureSaleItemDiscountColumn(conn)
    await ensureSaleItemCostPriceColumn(conn)
    await ensureSalePaymentBreakdownColumn(conn)
    await ensureSaleCustomerIdColumn(conn)
    await conn.beginTransaction()

    const { sale, saleitem } = await getSalesTables()
    if (!sale) {
      throw new Error('Sale table not found in database')
    }

    const [existingRows] = await conn.execute(
      `SELECT customerId, customerName, total, amountReceived, \`change\`, status FROM ${sale} WHERE id = ?`,
      [String(saleId)]
    )
    const existingSale = existingRows[0]
    if (saleData.customerId === undefined && existingSale?.customerId) {
      saleData.customerId = existingSale.customerId
    }

    let totalCommission = 0
    const itemsWithCommission = saleData.items.map(item => {
      if (!calculateCommission) {
        return { ...item, commission: 0 }
      }
      const price = parseFloat(item.price)
      const costPrice = parseFloat(item.originalPrice || 0)

      // No-commission thresholds based on cost price range:
      // costPrice < 10,000 → need ≥20% markup; costPrice ≥ 10,000 → need ≥10% markup
      if (costPrice > 0) {
        const threshold = costPrice < 10000 ? costPrice * 1.2 : costPrice * 1.1
        if (price < threshold) {
          return { ...item, commission: 0 }
        }
      }

      let itemCommissionPerUnit = 0
      if (price <= costPrice) {
        itemCommissionPerUnit = price * 0.01
      } else {
        itemCommissionPerUnit = (costPrice * 0.01) + ((price - costPrice) * 0.10)
      }

      const itemTotalCommission = itemCommissionPerUnit * item.quantity
      totalCommission += itemTotalCommission
      return { ...item, commission: itemTotalCommission }
    })

    const saleUpdateVariants = [
      {
        query: `UPDATE ${sale} SET subtotal = ?, discount = ?, total = ?, paymentMethod = ?, paymentBreakdown = ?, amountReceived = ?, \`change\` = ?, customerName = ?, customerId = ?, status = ?, commission = ?, employeeId = ?, employeeName = ?, updatedAt = NOW() WHERE id = ?`,
        params: [
          saleData.subtotal,
          saleData.discount,
          saleData.total,
          saleData.paymentMethod,
          saleData.paymentBreakdown,
          saleData.amountReceived,
          saleData.change,
          saleData.customerName,
          saleData.customerId || null,
          saleData.status,
          totalCommission,
          saleData.employeeId,
          saleData.employeeName,
          String(saleId),
        ],
      },
      {
        query: `UPDATE ${sale} SET subtotal = ?, discount = ?, total = ?, paymentMethod = ?, amountReceived = ?, \`change\` = ?, customerName = ?, customerId = ?, status = ?, commission = ?, employeeId = ?, employeeName = ?, updatedAt = NOW() WHERE id = ?`,
        params: [
          saleData.subtotal,
          saleData.discount,
          saleData.total,
          saleData.paymentMethod,
          saleData.amountReceived,
          saleData.change,
          saleData.customerName,
          saleData.customerId || null,
          saleData.status,
          totalCommission,
          saleData.employeeId,
          saleData.employeeName,
          String(saleId),
        ],
      },
    ]

    let updated = false
    for (const variant of saleUpdateVariants) {
      try {
        await conn.execute(variant.query, variant.params)
        updated = true
        break
      } catch (updateErr) {
        if (updateErr?.code === 'ER_BAD_FIELD_ERROR') {
          continue
        }
        throw updateErr
      }
    }

    if (!updated) {
      throw new Error('Failed to update Sale with available columns')
    }

    if (saleitem) {
      await conn.execute(`DELETE FROM ${saleitem} WHERE saleId = ?`, [String(saleId)])
    }

    for (const item of itemsWithCommission) {
      const insertVariants = [
        {
          query: `INSERT INTO ${saleitem || 'SaleItem'} (saleId, productId, variantId, title, price, quantity, discount, commission, sku, image, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          params: [
            String(saleId),
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
          query: `INSERT INTO ${saleitem || 'SaleItem'} (saleId, productId, variantId, title, price, quantity, commission, sku, image, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          params: [
            String(saleId),
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
          query: `INSERT INTO ${saleitem || 'SaleItem'} (saleId, productId, variantId, title, price, quantity, discount, sku, image, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          params: [
            String(saleId),
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
          query: `INSERT INTO ${saleitem || 'SaleItem'} (saleId, productId, variantId, title, price, quantity, sku, image, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          params: [
            String(saleId),
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
    }

    await reconcileCustomerLedgerEntry(conn, saleId, existingSale, saleData)

    await conn.commit()

    const [sales] = await connection.execute(
      `SELECT * FROM ${sale} WHERE id = ?`,
      [String(saleId)]
    )

    let items = []
    if (saleitem) {
      const [rows] = await connection.execute(
        `SELECT * FROM ${saleitem} WHERE saleId = ?`,
        [String(saleId)]
      )
      items = rows
    }

    return {
      ...sales[0],
      items,
    }
  } catch (error) {
    await conn.rollback()
    console.error('❌ Error updating sale:', error)
    throw error
  } finally {
    conn.release()
  }
}

export async function createOrder(orderData, userId) {
  return createSale(orderData, userId, { adjustInventory: false, calculateCommission: false })
}

export async function applySaleReturnFinance(sale, returnItems = [], options = {}) {
  const items = Array.isArray(returnItems) ? returnItems : []
  if (!sale || items.length === 0) {
    return { returnAmount: 0, applied: false }
  }
  const saleItems = Array.isArray(sale.items) ? sale.items : []
  const saleItemMap = new Map(
    saleItems.map((item) => [String(item.variantId || item.productId), item])
  )
  let returnAmount = 0
  for (const item of items) {
    const quantity = parseInt(item.quantity)
    if (!quantity || quantity <= 0) continue
    const key = String(item.variantId || item.productId)
    const matched = saleItemMap.get(key)
    if (!matched) continue
    const unitPrice = parseFloat(matched.price || 0)
    const totalDiscount = parseFloat(matched.discount || 0)
    const soldQty = parseInt(matched.quantity || 0)
    const discountPerUnit = soldQty > 0 ? totalDiscount / soldQty : 0
    const netUnitPrice = Math.max(0, unitPrice - discountPerUnit)
    returnAmount += netUnitPrice * quantity
  }
  returnAmount = Math.max(0, parseFloat(returnAmount.toFixed(2)))

  // Allow caller to credit only a partial amount (e.g. split cash + ledger)
  const ledgerAmount = (options.amountOverride !== undefined && options.amountOverride !== null)
    ? Math.max(0, parseFloat(options.amountOverride) || 0)
    : returnAmount

  if (!ledgerAmount) {
    return { returnAmount, ledgerAmount: 0, applied: false }
  }
  const connection = getPool()
  const conn = await connection.getConnection()
  try {
    await conn.beginTransaction()
    let customerId = options.customerId
      ? String(options.customerId)
      : await resolveCustomerId(conn, sale.customerId, sale.customerName)
    if (!customerId) {
      customerId = await ensureReturnCustomerId(conn, sale)
    }
    if (!customerId) {
      await conn.rollback()
      return { returnAmount, ledgerAmount, applied: false }
    }
    const customerTable = await getCustomerTable()
    if (!customerTable) {
      await conn.rollback()
      return { returnAmount, ledgerAmount, applied: false }
    }
    await ensureCustomerLedgerTable(conn)
    await ensureCustomerLedgerDebitCreditColumns(conn)
    await conn.execute(
      `UPDATE ${customerTable} SET balance = balance - ? WHERE id = ?`,
      [ledgerAmount, customerId]
    )
    const referenceType = sale.status === 'order' ? 'order-return' : 'sale-return'
    // Store return total as negative to indicate a refund/return transaction
    await conn.execute(
      `INSERT INTO CustomerLedger (customerId, referenceId, referenceType, total, paid, due, debit, credit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [customerId, sale.id, referenceType, -ledgerAmount, ledgerAmount, 0, 0, ledgerAmount]
    )
    await conn.commit()
    return { returnAmount, ledgerAmount, applied: true, customerId }
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

export async function restockSaleItems(items = []) {
  if (!Array.isArray(items) || items.length === 0) return
  const connection = getPool()
  const conn = await connection.getConnection()
  try {
    await conn.beginTransaction()
    for (const item of items) {
      const quantity = parseInt(item.quantity)
      if (!quantity || quantity <= 0) continue
      const { productvariant: variantTable, product: productTable } = await getProductTables()
      if (item.variantId) {
        await conn.execute(
          `UPDATE ${variantTable} SET inventory_quantity = inventory_quantity + ?, updatedAt = NOW() WHERE id = ?`,
          [quantity, String(item.variantId)]
        )
      }
      if (item.productId) {
        await conn.execute(
          `UPDATE ${productTable} SET quantity = quantity + ?, updatedAt = NOW() WHERE id = ?`,
          [quantity, String(item.productId)]
        )
      }
    }
    await conn.commit()
  } catch (error) {
    await conn.rollback()
    console.error('❌ Error restocking sale items:', error)
    throw error
  } finally {
    conn.release()
  }
}

export async function applySaleInventory(items = []) {
  if (!Array.isArray(items) || items.length === 0) return
  const connection = getPool()
  const conn = await connection.getConnection()
  try {
    await conn.beginTransaction()
    for (const item of items) {
      const quantity = parseInt(item.quantity)
      if (!quantity || quantity <= 0) continue
      const { productvariant: variantTable, product: productTable } = await getProductTables()
      if (item.variantId) {
        await conn.execute(
          `UPDATE ${variantTable} SET inventory_quantity = inventory_quantity - ?, updatedAt = NOW() WHERE id = ?`,
          [quantity, String(item.variantId)]
        )
      }
      if (item.productId) {
        await conn.execute(
          `UPDATE ${productTable} SET quantity = quantity - ?, updatedAt = NOW() WHERE id = ?`,
          [quantity, String(item.productId)]
        )
      }
    }
    await conn.commit()
  } catch (error) {
    await conn.rollback()
    console.error('❌ Error applying sale inventory:', error)
    throw error
  } finally {
    conn.release()
  }
}

export async function updateSaleStatus(saleId, status) {
  const connection = getPool()
  const { sale } = await getSalesTables()
  if (!sale) {
    throw new Error('Sales table not found')
  }
  const [result] = await connection.execute(
    `UPDATE ${sale} SET status = ?, updatedAt = NOW() WHERE id = ?`,
    [status, String(saleId)]
  )
  return result
}

export async function getSales(filters = {}) {
  try {
    const connection = getPool()
    const { sale, user, saleitem } = await getSalesTables()
    if (!sale) {
      return {
        sales: [],
        total: 0,
        stats: {
          totalSales: 0,
          totalRevenue: 0,
          totalDiscount: 0,
          totalCommission: 0,
        }
      }
    }

    let query = `
      SELECT s.*, u.name as userName, u.email as userEmail
      FROM ${sale} s
      LEFT JOIN ${user || 'User'} u ON s.userId = u.id
    `
    const params = []
    const conditions = []

    // Status filter
    if (filters.status) {
      conditions.push('s.status = ?')
      params.push(filters.status)
    }

    if (filters.saleId) {
      conditions.push('s.id = ?')
      params.push(filters.saleId)
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

    if (saleitem && sales.length > 0) {
      const saleIds = sales.map((sale) => sale.id)
      const placeholders = saleIds.map(() => '?').join(',')
      const [itemsRows] = await connection.execute(
        `SELECT * FROM ${saleitem} WHERE saleId IN (${placeholders})`,
        saleIds
      )
      const itemsBySaleId = new Map()
      for (const item of itemsRows) {
        const key = String(item.saleId)
        if (!itemsBySaleId.has(key)) {
          itemsBySaleId.set(key, [])
        }
        itemsBySaleId.get(key).push(item)
      }
      for (const sale of sales) {
        sale.items = itemsBySaleId.get(String(sale.id)) || []
      }
    } else {
      for (const sale of sales) {
        sale.items = []
      }
    }

    // Get total count with same filters
    let countQuery = `SELECT COUNT(*) as count FROM ${sale}`
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
       FROM ${sale}
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

export async function getCustomerLedger(filters = {}) {
  try {
    const connection = getPool()
    await ensureCustomerLedgerTable(connection)
    await ensureCustomerLedgerDebitCreditColumns(connection)
    const customerTable = await getCustomerTable()
    const limit = parseInt(filters.limit) || 100
    const offset = parseInt(filters.offset) || 0
    const params = []
    const conditions = []

    if (filters.customerId) {
      conditions.push('l.customerId = ?')
      params.push(filters.customerId)
    }

    if (filters.referenceType) {
      conditions.push('l.referenceType = ?')
      params.push(filters.referenceType)
    }

    if (filters.startDate) {
      conditions.push('DATE(l.createdAt) >= ?')
      params.push(filters.startDate)
    }

    if (filters.endDate) {
      conditions.push('DATE(l.createdAt) <= ?')
      params.push(filters.endDate)
    }

    const joinClause = customerTable
      ? `LEFT JOIN ${customerTable} c ON l.customerId = c.id`
      : ''
    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : ''
    const selectCustomerFields = customerTable
      ? 'c.name as customerName, c.phone_number as customerPhone'
      : 'NULL as customerName, NULL as customerPhone'

    const ledgerQuery = `
      SELECT l.*, ${selectCustomerFields}
      FROM CustomerLedger l
      ${joinClause}
      ${whereClause}
      ORDER BY l.createdAt DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const [ledger] = await connection.execute(ledgerQuery, params)
    const ledgerWithBalances = ledger.map(entry => ({
      ...entry,
      preBalance: 0,
      balance: 0,
    }))

    const earliestByCustomer = new Map()
    for (const entry of ledgerWithBalances) {
      const customerId = String(entry.customerId || '')
      if (!customerId) continue
      const createdAt = new Date(entry.createdAt)
      const existing = earliestByCustomer.get(customerId)
      if (!existing || createdAt < existing) {
        earliestByCustomer.set(customerId, createdAt)
      }
    }

    const startingBalances = new Map()
    for (const [customerId, earliestDate] of earliestByCustomer.entries()) {
      const [rows] = await connection.execute(
        `SELECT SUM(debit - credit) as balance FROM CustomerLedger WHERE customerId = ? AND createdAt < ?`,
        [customerId, earliestDate]
      )
      startingBalances.set(customerId, parseFloat(rows[0]?.balance || 0))
    }

    const entriesByCustomer = new Map()
    for (const entry of ledgerWithBalances) {
      const key = String(entry.customerId || '')
      if (!entriesByCustomer.has(key)) {
        entriesByCustomer.set(key, [])
      }
      entriesByCustomer.get(key).push(entry)
    }

    for (const [customerId, entries] of entriesByCustomer.entries()) {
      const sortedEntries = entries.sort((a, b) => {
        const timeDiff = new Date(a.createdAt) - new Date(b.createdAt)
        if (timeDiff !== 0) return timeDiff
        return (a.id || 0) - (b.id || 0)
      })
      let runningBalance = startingBalances.get(customerId) || 0
      for (const entry of sortedEntries) {
        const debit = parseFloat(entry.debit || 0)
        const credit = parseFloat(entry.credit || 0)
        entry.preBalance = runningBalance
        runningBalance += debit - credit
        entry.balance = runningBalance
      }
    }

    const countQuery = `
      SELECT COUNT(*) as count
      FROM CustomerLedger l
      ${joinClause}
      ${whereClause}
    `
    const [countRows] = await connection.execute(countQuery, params)
    const total = countRows[0]?.count || 0

    return { ledger: ledgerWithBalances, total }
  } catch (error) {
    console.error('❌ Error fetching customer ledger:', error)
    throw error
  }
}

export async function createManualLedgerEntry({ customerId, amount, type, description }) {
  const connection = getPool()
  const conn = await connection.getConnection()
  try {
    await conn.beginTransaction()
    await ensureCustomerLedgerTable(conn)
    await ensureCustomerLedgerDebitCreditColumns(conn)
    const customerTable = await getCustomerTable()
    if (!customerTable) throw new Error('Customer table not found')

    const debit = type === 'debit' ? amount : 0
    const credit = type === 'credit' ? amount : 0
    const balanceDelta = debit - credit

    // Update customer balance
    await conn.execute(
      `UPDATE ${customerTable} SET balance = balance + ? WHERE id = ?`,
      [balanceDelta, customerId]
    )

    // Insert ledger entry
    const [result] = await conn.execute(
      `INSERT INTO CustomerLedger (customerId, referenceId, referenceType, total, paid, due, debit, credit) VALUES (?, NULL, ?, ?, ?, ?, ?, ?)`,
      [customerId, 'manual', amount, 0, amount, debit, credit]
    )
    await conn.commit()
    return { id: result.insertId, customerId, type, amount, description }
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

export default {
  findUserByEmail,
  createSale,
  getSales,
  getCustomerLedger,
  createManualLedgerEntry,
}
