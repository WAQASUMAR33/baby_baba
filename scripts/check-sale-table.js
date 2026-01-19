// Check actual Sale table structure
require('dotenv').config()
const mysql = require('mysql2/promise')

async function checkSaleTable() {
    let connection

    try {
        console.log('🔌 Connecting to database...')
        connection = await mysql.createConnection(process.env.DATABASE_URL)
        console.log('✅ Connected')
        console.log('')

        // Show all columns
        console.log('📋 Sale Table Structure:')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        const [columns] = await connection.query("SHOW COLUMNS FROM Sale")

        columns.forEach((col, index) => {
            console.log(`${index + 1}. ${col.Field.padEnd(20)} | ${col.Type.padEnd(20)} | ${col.Null} | ${col.Key} | ${col.Default}`)
        })
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('')

        const columnNames = columns.map(c => c.Field)

        // Check for required columns
        console.log('✓ Required Columns Check:')
        const requiredColumns = [
            'id', 'subtotal', 'discount', 'total', 'paymentMethod',
            'amountReceived', 'change', 'customerName', 'status',
            'commission', 'employeeId', 'employeeName', 'userId',
            'createdAt', 'updatedAt'
        ]

        requiredColumns.forEach(col => {
            const exists = columnNames.includes(col)
            console.log(`  ${exists ? '✅' : '❌'} ${col}`)
        })

    } catch (error) {
        console.error('❌ Error:', error.message)
        process.exit(1)
    } finally {
        if (connection) {
            await connection.end()
        }
    }
}

checkSaleTable()
