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

export async function getAllUsers() {
    try {
        const connection = getPool()
        const [users] = await connection.execute(
            'SELECT id, email, name, role, status, createdAt, updatedAt FROM User ORDER BY createdAt DESC'
        )
        return users
    } catch (error) {
        console.error('❌ Error fetching all users:', error)
        throw error
    }
}

export async function getUserById(id) {
    try {
        const connection = getPool()
        const [users] = await connection.execute(
            'SELECT id, email, name, role, status, createdAt, updatedAt FROM User WHERE id = ?',
            [id]
        )
        return users[0] || null
    } catch (error) {
        console.error('❌ Error fetching user by ID:', error)
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
        console.error('❌ Error finding user by email:', error)
        throw error
    }
}

export async function createUser(data) {
    try {
        const connection = getPool()
        const [result] = await connection.execute(
            'INSERT INTO User (email, password, name, role, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
            [
                data.email.toLowerCase().trim(),
                data.password,
                data.name || null,
                data.role || 'user',
                data.status || 'active'
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
        const updates = []
        const params = []

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
