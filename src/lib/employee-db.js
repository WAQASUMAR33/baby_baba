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

export async function getAllEmployees(filters = {}) {
  try {
    const connection = getPool()
    const employeeTable = await getEmployeeTable()
    if (!employeeTable) return []

    let query = `
      SELECT id, name, phone_number as phoneNumber, city, address, cnic, createdAt, updatedAt
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
      `SELECT id, name, phone_number as phoneNumber, city, address, cnic, createdAt, updatedAt FROM ${employeeTable} WHERE id = ?`,
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
    const [result] = await connection.execute(
      `INSERT INTO ${employeeTable} (name, phone_number, city, address, cnic) VALUES (?, ?, ?, ?, ?)`,
      [data.name, data.phoneNumber, data.city, data.address, data.cnic || null]
    )
    return await getEmployeeById(result.insertId)
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
    const updates = []
    const params = []

    if (data.name) { updates.push('name = ?'); params.push(data.name); }
    if (data.phoneNumber) { updates.push('phone_number = ?'); params.push(data.phoneNumber); }
    if (data.city) { updates.push('city = ?'); params.push(data.city); }
    if (data.address) { updates.push('address = ?'); params.push(data.address); }
    if (data.cnic !== undefined) { updates.push('cnic = ?'); params.push(data.cnic); }

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
