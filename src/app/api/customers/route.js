import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import mysql from 'mysql2/promise'

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

let pool = null
function getPool() {
    if (!pool) {
        const dbUrl = process.env.DATABASE_URL
        const config = parseDatabaseUrl(dbUrl)
        pool = mysql.createPool({
            ...config,
            waitForConnections: true,
            connectionLimit: 10,
        })
    }
    return pool
}

let customerTableCache = null
async function getCustomerTable() {
    if (customerTableCache !== null) return customerTableCache
    const connection = getPool()
    const [rows] = await connection.query('SHOW TABLES')
    const tableList = rows.map((r) => Object.values(r)[0])
    for (const name of ['Customer', 'customer', 'Customers', 'customers']) {
        if (tableList.includes(name)) {
            customerTableCache = name
            return customerTableCache
        }
    }
    customerTableCache = null
    return null
}

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const name = searchParams.get('name')
        const phone = searchParams.get('phone')

        const connection = getPool()
        const customerTable = await getCustomerTable()

        if (!customerTable) {
            return NextResponse.json({
                success: true,
                customers: [],
                stats: { totalCustomers: 0, totalBalance: 0 }
            })
        }

        let query = `SELECT id, name, phone_number as phoneNumber, address, balance, createdAt, updatedAt FROM ${customerTable}`
        const params = []
        const conditions = []
        if (name) {
            conditions.push('name LIKE ?')
            params.push(`%${name}%`)
        }
        if (phone) {
            conditions.push('(phone_number LIKE ? OR phoneNumber LIKE ?)')
            params.push(`%${phone}%`, `%${phone}%`)
        }
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ')
        }
        query += ' ORDER BY createdAt DESC'

        const [customers] = await connection.execute(query, params)

        const [countRows] = await connection.execute(`SELECT COUNT(*) as count FROM ${customerTable}`)
        const [sumRows] = await connection.execute(`SELECT SUM(balance) as totalBalance FROM ${customerTable}`)

        return NextResponse.json({
            success: true,
            customers,
            stats: { totalCustomers: countRows[0]?.count || 0, totalBalance: sumRows[0]?.totalBalance || 0 }
        })
    } catch (error) {
        console.error('❌ Error fetching customers:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        if (!body.name || !body.phoneNumber || !body.address) {
            return NextResponse.json({ success: false, error: 'Required fields missing' }, { status: 400 })
        }

        const connection = getPool()
        const customerTable = await getCustomerTable()
        if (!customerTable) {
            return NextResponse.json({ success: false, error: 'Customer table not found in database' }, { status: 400 })
        }

        const [result] = await connection.execute(
            `INSERT INTO ${customerTable} (name, phone_number, address, balance, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())`,
            [body.name, body.phoneNumber, body.address, parseFloat(body.balance || 0)]
        )

        const [rows] = await connection.execute(`SELECT id, name, phone_number as phoneNumber, address, balance, createdAt, updatedAt FROM ${customerTable} WHERE id = ?`, [result.insertId])
        const customer = rows[0]

        return NextResponse.json({ success: true, customer }, { status: 201 })
    } catch (error) {
        console.error('❌ Error creating customer:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
