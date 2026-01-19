// Check SaleItem table structure
require('dotenv').config()
const mysql = require('mysql2/promise')

async function checkSaleItemTable() {
    let connection

    try {
        console.log('🔌 Connecting to database...')
        connection = await mysql.createConnection(process.env.DATABASE_URL)
        console.log('✅ Connected')
        console.log('')

        // Show all columns
        console.log('📋 SaleItem Table Structure:')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        const [columns] = await connection.query("SHOW COLUMNS FROM SaleItem")

        columns.forEach((col, index) => {
            console.log(`${index + 1}. ${col.Field.padEnd(20)} | ${col.Type.padEnd(20)} | ${col.Null} | ${col.Key}`)
        })
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('')

        const columnNames = columns.map(c => c.Field)

        // Check if commission exists
        if (!columnNames.includes('commission')) {
            console.log('❌ commission column is MISSING from SaleItem table')
            console.log('➕ Adding commission column...')

            await connection.query(
                "ALTER TABLE `SaleItem` ADD COLUMN `commission` DECIMAL(10,2) DEFAULT 0 AFTER `quantity`"
            )

            console.log('✅ commission column added to SaleItem')
        } else {
            console.log('✅ commission column exists in SaleItem')
        }

    } catch (error) {
        console.error('❌ Error:', error.message)
        process.exit(1)
    } finally {
        if (connection) {
            await connection.end()
        }
    }
}

checkSaleItemTable()
