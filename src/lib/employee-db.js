// Direct SQL for employee management operations
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

function getPool() {
  if (!pool) {
    const dbUrl = process.env.DATABASE_URL
    const config = parseDatabaseUrl(dbUrl)
    pool = mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 5,
      idleTimeout: 60000,
      queueLimit: 0,
    })
  }
  return pool
}

let employeeTableCache = null
let hasStatusColumn = null

async function getEmployeeTable() {
  if (employeeTableCache !== null) return employeeTableCache
  const connection = getPool()
  const [rows] = await connection.query('SHOW TABLES')
  const tableList = rows.map((r) => Object.values(r)[0])
  for (const name of ['Employee', 'employee', 'Employees', 'employees']) {
    if (tableList.includes(name)) {
      employeeTableCache = name
      return employeeTableCache
    }
  }
  employeeTableCache = null
  return null
}

async function ensureStatusColumn(connection) {
  if (hasStatusColumn !== null) return
  const employeeTable = await getEmployeeTable()
  if (!employeeTable) { hasStatusColumn = false; return }
  try {
    await connection.execute(`ALTER TABLE \`${employeeTable}\` ADD COLUMN \`status\` VARCHAR(20) NOT NULL DEFAULT 'active'`)
    hasStatusColumn = true
  } catch (error) {
    if (error?.code === 'ER_DUP_FIELDNAME') { hasStatusColumn = true; return }
    if (error?.code === 'ER_NO_SUCH_TABLE') { hasStatusColumn = false; return }
    throw error
  }
}

export async function getAllEmployees(filters = {}) {
  try {
    const connection = getPool()
    const employeeTable = await getEmployeeTable()
    if (!employeeTable) return []
    await ensureStatusColumn(connection)

    let query = `
      SELECT id, name, phone_number as phoneNumber, city, address, cnic,
             COALESCE(status, 'active') as status, createdAt, updatedAt
      FROM ${employeeTable}
      WHERE 1=1
    `
    const params = []

    if (filters.name) {
      query += ' AND name LIKE ?'
      params.push(`%${filters.name}%`)
    }

    if (filters.city) {
      query += ' AND city = ?'
      params.push(filters.city)
    }

    if (filters.status) {
      query += ' AND COALESCE(status, \'active\') = ?'
      params.push(filters.status)
    }

    query += ' ORDER BY createdAt DESC'

    const [employees] = await connection.execute(query, params)
    return employees
  } catch (error) {
    console.error('❌ Error fetching employees:', error)
    throw error
  }
}

export async function getEmployeeById(id) {
  try {
    const connection = getPool()
    const employeeTable = await getEmployeeTable()
    if (!employeeTable) return null
    const [employees] = await connection.execute(
      `SELECT id, name, phone_number as phoneNumber, city, address, cnic, COALESCE(status, 'active') as status, createdAt, updatedAt FROM ${employeeTable} WHERE id = ?`,
      [id]
    )
    return employees[0] || null
  } catch (error) {
    console.error('❌ Error fetching employee:', error)
    throw error
  }
}

export async function createEmployee(data) {
  try {
    const connection = getPool()
    const employeeTable = await getEmployeeTable()
    if (!employeeTable) throw new Error('Employee table not found in database')
    await ensureStatusColumn(connection)
    const status = data.status || 'active'
    let inserted = false
    // Try with status column first, fall back without it
    for (const attempt of [
      { q: `INSERT INTO ${employeeTable} (name, phone_number, city, address, cnic, status) VALUES (?, ?, ?, ?, ?, ?)`, p: [data.name, data.phoneNumber, data.city, data.address, data.cnic || null, status] },
      { q: `INSERT INTO ${employeeTable} (name, phone_number, city, address, cnic) VALUES (?, ?, ?, ?, ?)`, p: [data.name, data.phoneNumber, data.city, data.address, data.cnic || null] },
    ]) {
      try {
        const [result] = await connection.execute(attempt.q, attempt.p)
        inserted = result.insertId
        break
      } catch (err) {
        if (err?.code !== 'ER_BAD_FIELD_ERROR') throw err
      }
    }
    if (!inserted) throw new Error('Failed to insert employee')
    return await getEmployeeById(inserted)
  } catch (error) {
    console.error('❌ Error creating employee:', error)
    throw error
  }
}

export async function updateEmployee(id, data) {
  try {
    const connection = getPool()
    const employeeTable = await getEmployeeTable()
    if (!employeeTable) return null
    await ensureStatusColumn(connection)
    const updates = []
    const params = []

    if (data.name) { updates.push('name = ?'); params.push(data.name); }
    if (data.phoneNumber) { updates.push('phone_number = ?'); params.push(data.phoneNumber); }
    if (data.city) { updates.push('city = ?'); params.push(data.city); }
    if (data.address) { updates.push('address = ?'); params.push(data.address); }
    if (data.cnic !== undefined) { updates.push('cnic = ?'); params.push(data.cnic); }
    if (data.status !== undefined) { updates.push('status = ?'); params.push(data.status); }

    if (updates.length === 0) return await getEmployeeById(id)

    params.push(id)
    await connection.execute(`UPDATE ${employeeTable} SET ${updates.join(', ')} WHERE id = ?`, params)
    return await getEmployeeById(id)
  } catch (error) {
    console.error('❌ Error updating employee:', error)
    throw error
  }
}

export async function deleteEmployee(id) {
  try {
    const connection = getPool()
    const employeeTable = await getEmployeeTable()
    if (!employeeTable) return false
    const [result] = await connection.execute(`DELETE FROM ${employeeTable} WHERE id = ?`, [id])
    return result.affectedRows > 0
  } catch (error) {
    console.error('❌ Error deleting employee:', error)
    throw error
  }
}

export async function getEmployeeStats() {
  try {
    const connection = getPool()
    const employeeTable = await getEmployeeTable()
    if (!employeeTable) {
      return { totalEmployees: 0 }
    }
    const [stats] = await connection.execute(`SELECT COUNT(*) as totalEmployees FROM ${employeeTable}`)
    return {
      totalEmployees: stats[0].totalEmployees,
    }
  } catch (error) {
    console.error('❌ Error fetching employee stats:', error)
    throw error
  }
}

export default {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeStats,
}
