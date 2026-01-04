// Direct SQL for user management operations
import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'

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
    console.log('✅ User DB pool created')
  }
  return pool
}

export async function getAllUsers(filters = {}) {
  try {
    const connection = getPool()
    
    let query = `
      SELECT id, email, name, role, status, createdAt, updatedAt
      FROM user
      WHERE 1=1
    `
    const params = []
    
    // Role filter
    if (filters.role) {
      query += ' AND role = ?'
      params.push(filters.role)
    }
    
    // Status filter
    if (filters.status) {
      query += ' AND status = ?'
      params.push(filters.status)
    }
    
    query += ' ORDER BY createdAt DESC'
    
    const [users] = await connection.execute(query, params)
    
    return users
  } catch (error) {
    console.error('❌ Error fetching users:', error)
    throw error
  }
}

export async function getUserById(userId) {
  try {
    const connection = getPool()
    
    const [users] = await connection.execute(
      `SELECT id, email, name, role, status, createdAt, updatedAt
       FROM user
       WHERE id = ?`,
      [userId]
    )
    
    return users[0] || null
  } catch (error) {
    console.error('❌ Error fetching user:', error)
    throw error
  }
}

export async function createUser(userData) {
  try {
    const connection = getPool()
    
    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10)
    
    const [result] = await connection.execute(
      `INSERT INTO user (email, password, name, role, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        userData.email,
        hashedPassword,
        userData.name || null,
        userData.role || 'user',
        userData.status || 'active',
      ]
    )
    
    const userId = result.insertId
    
    // Fetch created user
    const user = await getUserById(userId)
    return user
  } catch (error) {
    console.error('❌ Error creating user:', error)
    throw error
  }
}

export async function updateUser(userId, userData) {
  try {
    const connection = getPool()
    
    const updates = []
    const params = []
    
    if (userData.name !== undefined) {
      updates.push('name = ?')
      params.push(userData.name)
    }
    
    if (userData.email !== undefined) {
      updates.push('email = ?')
      params.push(userData.email)
    }
    
    if (userData.role !== undefined) {
      updates.push('role = ?')
      params.push(userData.role)
    }
    
    if (userData.status !== undefined) {
      updates.push('status = ?')
      params.push(userData.status)
    }
    
    if (userData.password !== undefined && userData.password) {
      const hashedPassword = await bcrypt.hash(userData.password, 10)
      updates.push('password = ?')
      params.push(hashedPassword)
    }
    
    updates.push('updatedAt = NOW()')
    params.push(userId)
    
    const [result] = await connection.execute(
      `UPDATE user SET ${updates.join(', ')} WHERE id = ?`,
      params
    )
    
    if (result.affectedRows === 0) {
      throw new Error('User not found')
    }
    
    // Fetch updated user
    const user = await getUserById(userId)
    return user
  } catch (error) {
    console.error('❌ Error updating user:', error)
    throw error
  }
}

export async function deleteUser(userId) {
  try {
    const connection = getPool()
    
    const [result] = await connection.execute(
      'DELETE FROM user WHERE id = ?',
      [userId]
    )
    
    return result.affectedRows > 0
  } catch (error) {
    console.error('❌ Error deleting user:', error)
    throw error
  }
}

export async function getUserStats() {
  try {
    const connection = getPool()
    
    const [stats] = await connection.execute(`
      SELECT 
        COUNT(*) as totalUsers,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeUsers,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactiveUsers,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
        SUM(CASE WHEN role = 'manager' THEN 1 ELSE 0 END) as managers,
        SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as users
      FROM user
    `)
    
    return stats[0]
  } catch (error) {
    console.error('❌ Error fetching user stats:', error)
    throw error
  }
}

export default {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
}




