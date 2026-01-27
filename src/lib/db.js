// Direct database access for authentication (reliable and compatible)
import mysql from 'mysql2/promise'

// Parse DATABASE_URL
const parseDatabaseUrl = (url) => {
  if (!url) {
    throw new Error('DATABASE_URL is not defined')
  }
  const match = url.match(/^mysql:\/\/([^:@/]+)(?::([^@/]*))?@([^:/]+)(?::(\d+))?\/(.+)$/)
  if (!match) {
    throw new Error('Invalid DATABASE_URL format')
  }
  return {
    host: match[3],
    port: match[4] ? parseInt(match[4]) : 3306,
    user: match[1],
    password: match[2] || '',
    database: match[5],
  }
}

// Global connection pool
let pool = null
let hasModulesColumn = null
let hasRoleColumn = null
let hasStatusColumn = null

export function getPool() {
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

async function getModulesColumnStatus() {
  if (hasModulesColumn !== null) return hasModulesColumn
  await ensureUserSchema()
  return hasModulesColumn
}

async function getRoleColumnStatus() {
  if (hasRoleColumn !== null) return hasRoleColumn
  await ensureUserSchema()
  return hasRoleColumn
}

async function getStatusColumnStatus() {
  if (hasStatusColumn !== null) return hasStatusColumn
  await ensureUserSchema()
  return hasStatusColumn
}

async function ensureUserSchema() {
  if (hasRoleColumn !== null && hasStatusColumn !== null && hasModulesColumn !== null) return
  const connectionPool = getPool()
  const alters = [
    { key: 'role', sql: "ALTER TABLE `User` ADD COLUMN `role` VARCHAR(50) DEFAULT 'user'" },
    { key: 'status', sql: "ALTER TABLE `User` ADD COLUMN `status` VARCHAR(50) DEFAULT 'active'" },
    { key: 'modules', sql: "ALTER TABLE `User` ADD COLUMN `modules` TEXT NULL" }
  ]
  for (const alter of alters) {
    const cached = alter.key === 'role' ? hasRoleColumn : alter.key === 'status' ? hasStatusColumn : hasModulesColumn
    if (cached === true) continue
    try {
      await connectionPool.execute(alter.sql)
      if (alter.key === 'role') hasRoleColumn = true
      if (alter.key === 'status') hasStatusColumn = true
      if (alter.key === 'modules') hasModulesColumn = true
    } catch (error) {
      if (error?.code === 'ER_DUP_FIELDNAME') {
        if (alter.key === 'role') hasRoleColumn = true
        if (alter.key === 'status') hasStatusColumn = true
        if (alter.key === 'modules') hasModulesColumn = true
        continue
      }
      throw error
    }
  }
}

export async function findUserByEmail(email) {
  try {
    const connectionPool = getPool()
    await ensureUserSchema()
    const includeModules = await getModulesColumnStatus()
    const [users] = await connectionPool.execute(
      includeModules
        ? 'SELECT id, email, password, name, role, modules, createdAt, updatedAt FROM User WHERE email = ? LIMIT 1'
        : 'SELECT id, email, password, name, role, createdAt, updatedAt FROM User WHERE email = ? LIMIT 1',
      [email.trim().toLowerCase()]
    )
    if (users.length === 0) return null
    const user = users[0]
    let modules = []
    if (user.modules) {
      try {
        const parsed = JSON.parse(user.modules)
        if (Array.isArray(parsed)) {
          modules = parsed
        }
      } catch (error) {
        modules = []
      }
    }
    return { ...user, modules }
  } catch (error) {
    console.error('Database error in findUserByEmail:', error.message)
    throw error
  }
}

export async function createUser({ email, password, name }) {
  try {
    const connectionPool = getPool()
    await ensureUserSchema()
    const [result] = await connectionPool.execute(
      'INSERT INTO User (email, password, name, role, status, modules, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [email.trim().toLowerCase(), password, name || null, 'user', 'active', null]
    )
    return {
      id: result.insertId,
      email: email.trim().toLowerCase(),
      name: name || null,
      role: 'user',
      status: 'active'
    }
  } catch (error) {
    console.error('Database error in createUser:', error.message)
    throw error
  }
}

export default { findUserByEmail, createUser, getPool }
