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

let tableNamesCache = null
async function getTableNames() {
    if (tableNamesCache) return tableNamesCache
    const connection = getPool()
    const [rows] = await connection.query('SHOW TABLES')
    const tableList = rows.map((r) => Object.values(r)[0])
    const resolve = (candidates) => {
        for (const name of candidates) {
            if (tableList.includes(name)) return name
        }
        return candidates[0]
    }
    tableNamesCache = {
        category: resolve(['Category', 'category']),
        product: resolve(['Product', 'product']),
    }
    return tableNamesCache
}

export async function getCategories() {
    try {
        const connection = getPool()
        const { category, product } = await getTableNames()
        const [categories] = await connection.execute(
            `SELECT c.*, COUNT(p.id) as productsCount FROM ${category} c LEFT JOIN ${product} p ON c.id = p.categoryId GROUP BY c.id ORDER BY c.name ASC`
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
        const { category } = await getTableNames()
        const [result] = await connection.execute(
            `INSERT INTO ${category} (name, description, slug, createdAt, updatedAt) VALUES (?, ?, ?, NOW(3), NOW(3))`,
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
        const { category } = await getTableNames()
        await connection.execute(
            `UPDATE ${category} SET name = ?, description = ?, slug = ?, updatedAt = NOW(3) WHERE id = ?`,
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
        const { category } = await getTableNames()
        // Product categoryId will be set to NULL due to ON DELETE SET NULL constraint if it exists
        await connection.execute(`DELETE FROM ${category} WHERE id = ?`, [id])
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
