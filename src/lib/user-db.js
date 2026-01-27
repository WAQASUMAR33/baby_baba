// Direct SQL for user management operations
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
let hasModulesColumn = null
let hasRoleColumn = null
let hasStatusColumn = null

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

async function getModulesColumnStatus(connection) {
    if (hasModulesColumn !== null) return hasModulesColumn
    await ensureUserSchema(connection)
    return hasModulesColumn
}

async function getRoleColumnStatus(connection) {
    if (hasRoleColumn !== null) return hasRoleColumn
    await ensureUserSchema(connection)
    return hasRoleColumn
}

async function getStatusColumnStatus(connection) {
    if (hasStatusColumn !== null) return hasStatusColumn
    await ensureUserSchema(connection)
    return hasStatusColumn
}

async function ensureUserSchema(connection) {
    if (hasRoleColumn !== null && hasStatusColumn !== null && hasModulesColumn !== null) return
    const alters = [
        { key: 'role', sql: "ALTER TABLE `User` ADD COLUMN `role` VARCHAR(50) DEFAULT 'user'" },
        { key: 'status', sql: "ALTER TABLE `User` ADD COLUMN `status` VARCHAR(50) DEFAULT 'active'" },
        { key: 'modules', sql: "ALTER TABLE `User` ADD COLUMN `modules` TEXT NULL" }
    ]
    for (const alter of alters) {
        const cached = alter.key === 'role' ? hasRoleColumn : alter.key === 'status' ? hasStatusColumn : hasModulesColumn
        if (cached === true) continue
        try {
            await connection.execute(alter.sql)
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

function normalizeUser(user) {
    if (!user) return null
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
}

export async function getAllUsers() {
    try {
        const connection = getPool()
        await ensureUserSchema(connection)
        const includeModules = await getModulesColumnStatus(connection)
        const [users] = await connection.execute(
            includeModules
                ? 'SELECT id, email, name, role, status, modules, createdAt, updatedAt FROM User ORDER BY createdAt DESC'
                : 'SELECT id, email, name, role, status, createdAt, updatedAt FROM User ORDER BY createdAt DESC'
        )
        return users.map((user) => normalizeUser(user))
    } catch (error) {
        console.error('❌ Error fetching all users:', error)
        throw error
    }
}

export async function getUserById(id) {
    try {
        const connection = getPool()
        await ensureUserSchema(connection)
        const includeModules = await getModulesColumnStatus(connection)
        const [users] = await connection.execute(
            includeModules
                ? 'SELECT id, email, name, role, status, modules, createdAt, updatedAt FROM User WHERE id = ?'
                : 'SELECT id, email, name, role, status, createdAt, updatedAt FROM User WHERE id = ?',
            [id]
        )
        return normalizeUser(users[0]) || null
    } catch (error) {
        console.error('❌ Error fetching user by ID:', error)
        throw error
    }
}

export async function findUserByEmail(email) {
    try {
        const connection = getPool()
        await ensureUserSchema(connection)
        const includeModules = await getModulesColumnStatus(connection)
        const [users] = await connection.execute(
            includeModules
                ? 'SELECT * FROM User WHERE email = ?'
                : 'SELECT id, email, password, name, role, status, createdAt, updatedAt FROM User WHERE email = ?',
            [email.trim().toLowerCase()]
        )
        return users.length > 0 ? normalizeUser(users[0]) : null
    } catch (error) {
        console.error('❌ Error finding user by email:', error)
        throw error
    }
}

export async function createUser(data) {
    try {
        const connection = getPool()
        await ensureUserSchema(connection)
        const modulesValue = Array.isArray(data.modules) ? JSON.stringify(data.modules) : null
        const [result] = await connection.execute(
            'INSERT INTO User (email, password, name, role, status, modules, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
            [
                data.email.toLowerCase().trim(),
                data.password,
                data.name || null,
                data.role || 'user',
                data.status || 'active',
                modulesValue
            ]
        )
        return await getUserById(result.insertId)
    } catch (error) {
        console.error('❌ Error creating user:', error)
        throw error
    }
}

export async function updateUser(id, data) {
    try {
        const connection = getPool()
        await ensureUserSchema(connection)
        const updates = []
        const params = []
        const includeModules = await getModulesColumnStatus(connection)

        if (data.email) {
            updates.push('email = ?')
            params.push(data.email.toLowerCase().trim())
        }
        if (data.password) {
            updates.push('password = ?')
            params.push(data.password)
        }
        if (data.name !== undefined) {
            updates.push('name = ?')
            params.push(data.name)
        }
        if (data.role) {
            updates.push('role = ?')
            params.push(data.role)
        }
        if (data.status) {
            updates.push('status = ?')
            params.push(data.status)
        }
        if (includeModules && data.modules !== undefined) {
            updates.push('modules = ?')
            params.push(Array.isArray(data.modules) ? JSON.stringify(data.modules) : null)
        }

        if (updates.length === 0) return await getUserById(id)

        updates.push('updatedAt = NOW()')
        params.push(id)

        await connection.execute(`UPDATE User SET ${updates.join(', ')} WHERE id = ?`, params)
        return await getUserById(id)
    } catch (error) {
        console.error('❌ Error updating user:', error)
        throw error
    }
}

export async function deleteUser(id) {
    try {
        const connection = getPool()
        const [result] = await connection.execute('DELETE FROM User WHERE id = ?', [id])
        return result.affectedRows > 0
    } catch (error) {
        console.error('❌ Error deleting user:', error)
        throw error
    }
}

export default {
    getAllUsers,
    getUserById,
    findUserByEmail,
    createUser,
    updateUser,
    deleteUser,
}
