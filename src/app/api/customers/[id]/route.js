import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
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

export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const customerId = parseInt(params.id)
        const connection = getPool()
        const customerTable = await getCustomerTable()
        if (!customerTable) {
            return NextResponse.json({ success: false, error: 'Customer table not found in database' }, { status: 404 })
        }

        const [customers] = await connection.execute(
            `SELECT id, name, phone_number as phoneNumber, address, balance, createdAt, updatedAt FROM ${customerTable} WHERE id = ?`,
            [customerId]
        )
        const customer = customers[0]

        if (!customer) {
            return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, customer })
    } catch (error) {
        console.error('❌ Error fetching customer:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function PATCH(request, { params }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const customerId = parseInt(params.id)
        const connection = getPool()
        const customerTable = await getCustomerTable()
        if (!customerTable) {
            return NextResponse.json({ success: false, error: 'Customer table not found in database' }, { status: 404 })
        }

        const updates = []
        const paramsList = []
        if (body.name !== undefined) { updates.push('name = ?'); paramsList.push(body.name) }
        if (body.phoneNumber !== undefined) { updates.push('phone_number = ?'); paramsList.push(body.phoneNumber) }
        if (body.address !== undefined) { updates.push('address = ?'); paramsList.push(body.address) }
        if (body.balance !== undefined) { updates.push('balance = ?'); paramsList.push(body.balance) }

        if (updates.length > 0) {
            paramsList.push(customerId)
            await connection.execute(
                `UPDATE ${customerTable} SET ${updates.join(', ')}, updatedAt = NOW() WHERE id = ?`,
                paramsList
            )
        }

        const [customers] = await connection.execute(
            `SELECT id, name, phone_number as phoneNumber, address, balance, createdAt, updatedAt FROM ${customerTable} WHERE id = ?`,
            [customerId]
        )
        const customer = customers[0]

        return NextResponse.json({ success: true, customer })
    } catch (error) {
        console.error('❌ Error updating customer:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const customerId = parseInt(params.id)
        const connection = getPool()
        const customerTable = await getCustomerTable()
        if (!customerTable) {
            return NextResponse.json({ success: false, error: 'Customer table not found in database' }, { status: 404 })
        }
        await connection.execute(`DELETE FROM ${customerTable} WHERE id = ?`, [customerId])

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('❌ Error deleting customer:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
