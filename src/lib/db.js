// Direct database access for authentication (reliable and compatible)
import mysql from 'mysql2/promise'

// Parse DATABASE_URL
const parseDatabaseUrl = (url) => {
  if (!url) {
    throw new Error('DATABASE_URL is not defined')
  }
  const match = url.match(/mysql:\/\/([^:]+)(?::([^@]*))?@([^:]+):(\d+)\/(.+)/)
  if (!match) {
    throw new Error('Invalid DATABASE_URL format')
  }
  return {
    host: match[3],
    port: parseInt(match[4]),
    user: match[1],
    password: match[2] || '',
    database: match[5],
  }
}

// Global connection pool
let pool = null

function getPool() {
  if (!pool) {
    const dbUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/mydb2'
    try {
      const config = parseDatabaseUrl(dbUrl)
      pool = mysql.createPool({
        ...config,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      })
    } catch (error) {
      console.error('Failed to create database pool:', error)
      throw error
    }
  }
  return pool
}

export async function findUserByEmail(email) {
  try {
    const connectionPool = getPool()
    const [users] = await connectionPool.execute(
      'SELECT id, email, password, name, createdAt, updatedAt FROM User WHERE email = ? LIMIT 1',
      [email.trim().toLowerCase()]
    )
    return users.length > 0 ? users[0] : null
  } catch (error) {
    console.error('Database error in findUserByEmail:', error.message)
    throw error
  }
}

export default { findUserByEmail }

