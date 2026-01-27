// Direct SQL for category operations
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
        console.log('✅ Category DB pool created')
    }
    return pool
}

export async function getCategories() {
    try {
        const connection = getPool()
        const [categories] = await connection.execute(
            'SELECT c.*, COUNT(p.id) as productsCount FROM category c LEFT JOIN product p ON c.id = p.categoryId GROUP BY c.id ORDER BY c.name ASC'
        )
        return categories
    } catch (error) {
        console.error('❌ Error fetching categories:', error)
        throw error
    }
}

export async function createCategory(data) {
    try {
        const connection = getPool()
        const [result] = await connection.execute(
            'INSERT INTO Category (name, description, slug, createdAt, updatedAt) VALUES (?, ?, ?, NOW(3), NOW(3))',
            [data.name, data.description || null, data.slug]
        )
        return { id: result.insertId, ...data }
    } catch (error) {
        console.error('❌ Error creating category:', error)
        throw error
    }
}

export async function updateCategory(id, data) {
    try {
        const connection = getPool()
        await connection.execute(
            'UPDATE Category SET name = ?, description = ?, slug = ?, updatedAt = NOW(3) WHERE id = ?',
            [data.name, data.description || null, data.slug, id]
        )
        return { id, ...data }
    } catch (error) {
        console.error('❌ Error updating category:', error)
        throw error
    }
}

export async function deleteCategory(id) {
    try {
        const connection = getPool()
        // Product categoryId will be set to NULL due to ON DELETE SET NULL constraint if it exists
        await connection.execute('DELETE FROM Category WHERE id = ?', [id])
        return { success: true }
    } catch (error) {
        console.error('❌ Error deleting category:', error)
        throw error
    }
}

export default {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
}
