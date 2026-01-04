// Direct SQL for expense operations
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
    console.log('✅ Expense DB pool created')
  }
  return pool
}

export async function createExpenseTitle(expTitle) {
  const connection = getPool()
  
  try {
    const [result] = await connection.execute(
      `INSERT INTO ExpenseTitle (exp_title, createdAt) VALUES (?, NOW())`,
      [expTitle]
    )
    
    const titleId = result.insertId
    
    // Fetch created title
    const [titles] = await connection.execute(
      `SELECT * FROM ExpenseTitle WHERE id = ?`,
      [titleId]
    )
    
    return titles[0]
  } catch (error) {
    console.error('❌ Error creating expense title:', error)
    throw error
  }
}

export async function getExpenseTitles() {
  const connection = getPool()
  
  try {
    const [titles] = await connection.execute(
      `SELECT * FROM ExpenseTitle ORDER BY exp_title ASC`
    )
    return titles
  } catch (error) {
    console.error('❌ Error fetching expense titles:', error)
    throw error
  }
}

export async function createExpense(expenseData, userId) {
  const connection = getPool()
  
  try {
    const [result] = await connection.execute(
      `INSERT INTO Expense (exp_title_id, exp_description, exp_amount, exp_date, added_by, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        expenseData.exp_title_id,
        expenseData.exp_description || null,
        expenseData.exp_amount,
        expenseData.exp_date || new Date(),
        userId,
      ]
    )
    
    const expenseId = result.insertId
    
    // Fetch created expense with title
    const [expenses] = await connection.execute(
      `SELECT e.*, et.exp_title, u.name as userName, u.email as userEmail
       FROM Expense e
       LEFT JOIN ExpenseTitle et ON e.exp_title_id = et.id
       LEFT JOIN User u ON e.added_by = u.id
       WHERE e.id = ?`,
      [expenseId]
    )
    
    return expenses[0]
  } catch (error) {
    console.error('❌ Error creating expense:', error)
    throw error
  }
}

export async function getExpenses(filters = {}) {
  try {
    const connection = getPool()
    
    let query = `
      SELECT e.*, et.exp_title, u.name as userName, u.email as userEmail
      FROM Expense e
      LEFT JOIN ExpenseTitle et ON e.exp_title_id = et.id
      LEFT JOIN User u ON e.added_by = u.id
    `
    const params = []
    const conditions = []
    
    // Title filter
    if (filters.exp_title_id) {
      conditions.push('e.exp_title_id = ?')
      params.push(filters.exp_title_id)
    }
    
    // Date range filter
    if (filters.startDate) {
      conditions.push('DATE(e.exp_date) >= ?')
      params.push(filters.startDate)
    }
    
    if (filters.endDate) {
      conditions.push('DATE(e.exp_date) <= ?')
      params.push(filters.endDate)
    }
    
    // Add WHERE clause if there are conditions
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    
    query += ' ORDER BY e.exp_date DESC, e.createdAt DESC'
    
    const limit = parseInt(filters.limit) || 100
    const offset = parseInt(filters.offset) || 0
    query += ` LIMIT ${limit} OFFSET ${offset}`
    
    const [expenses] = await connection.execute(query, params)
    
    // Get total count with same filters
    let countQuery = 'SELECT COUNT(*) as count FROM Expense'
    const countParams = []
    const countConditions = []
    
    if (filters.exp_title_id) {
      countConditions.push('exp_title_id = ?')
      countParams.push(filters.exp_title_id)
    }
    
    if (filters.startDate) {
      countConditions.push('DATE(exp_date) >= ?')
      countParams.push(filters.startDate)
    }
    
    if (filters.endDate) {
      countConditions.push('DATE(exp_date) <= ?')
      countParams.push(filters.endDate)
    }
    
    if (countConditions.length > 0) {
      countQuery += ' WHERE ' + countConditions.join(' AND ')
    }
    
    const [countResult] = await connection.execute(countQuery, countParams)
    const total = countResult[0].count
    
    // Get stats by expense title
    let statsQuery = `
      SELECT 
        COUNT(*) as totalExpenses,
        SUM(e.exp_amount) as totalAmount,
        et.exp_title,
        et.id as titleId,
        SUM(e.exp_amount) as titleAmount
       FROM Expense e
       LEFT JOIN ExpenseTitle et ON e.exp_title_id = et.id
       WHERE 1=1
    `
    const statsParams = []
    
    if (filters.startDate) {
      statsQuery += ' AND DATE(e.exp_date) >= ?'
      statsParams.push(filters.startDate)
    }
    
    if (filters.endDate) {
      statsQuery += ' AND DATE(e.exp_date) <= ?'
      statsParams.push(filters.endDate)
    }
    
    statsQuery += ' GROUP BY et.id, et.exp_title'
    
    const [titleStats] = await connection.execute(statsQuery, statsParams)
    
    // Get overall total
    let totalQuery = `
      SELECT 
        COUNT(*) as totalExpenses,
        SUM(exp_amount) as totalAmount
       FROM Expense
       WHERE 1=1
    `
    const totalParams = []
    
    if (filters.startDate) {
      totalQuery += ' AND DATE(exp_date) >= ?'
      totalParams.push(filters.startDate)
    }
    
    if (filters.endDate) {
      totalQuery += ' AND DATE(exp_date) <= ?'
      totalParams.push(filters.endDate)
    }
    
    const [totalResult] = await connection.execute(totalQuery, totalParams)
    
    return {
      expenses,
      total,
      stats: totalResult[0],
      titleBreakdown: titleStats,
    }
  } catch (error) {
    console.error('❌ Error fetching expenses:', error)
    throw error
  }
}

export async function deleteExpense(expenseId, userId) {
  try {
    const connection = getPool()
    
    // Delete expense (only if owned by user)
    const [result] = await connection.execute(
      'DELETE FROM Expense WHERE id = ? AND added_by = ?',
      [expenseId, userId]
    )
    
    return result.affectedRows > 0
  } catch (error) {
    console.error('❌ Error deleting expense:', error)
    throw error
  }
}

export default {
  createExpenseTitle,
  getExpenseTitles,
  createExpense,
  getExpenses,
  deleteExpense,
}

