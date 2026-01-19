// Simple script to add employee columns to Sale table
require('dotenv').config()
const mysql = require('mysql2/promise')

async function addEmployeeColumns() {
    let connection

    try {
        console.log('🔌 Connecting to database...')
        console.log('Database URL:', process.env.DATABASE_URL ? 'Found' : 'Not found')

        // Create connection directly from DATABASE_URL
        connection = await mysql.createConnection(process.env.DATABASE_URL)

        console.log('✅ Connected to database')
        console.log('')

        // Check current columns
        console.log('📋 Checking current Sale table columns...')
        const [columns] = await connection.query("SHOW COLUMNS FROM Sale")

        const columnNames = columns.map(c => c.Field)
        console.log('Current columns:', columnNames.join(', '))
        console.log('')

        // Add employeeId
        if (!columnNames.includes('employeeId')) {
            console.log('➕ Adding employeeId column...')
            await connection.query(
                "ALTER TABLE `Sale` ADD COLUMN `employeeId` INT NULL AFTER `commission`"
            )
            console.log('   ✅ Done')
        } else {
            console.log('✓ employeeId already exists')
        }

        // Add employeeName
        if (!columnNames.includes('employeeName')) {
            console.log('➕ Adding employeeName column...')
            await connection.query(
                "ALTER TABLE `Sale` ADD COLUMN `employeeName` VARCHAR(255) NULL AFTER `employeeId`"
            )
            console.log('   ✅ Done')
        } else {
            console.log('✓ employeeName already exists')
        }

        // Add index
        console.log('➕ Adding index on employeeId...')
        try {
            await connection.query(
                "ALTER TABLE `Sale` ADD INDEX `Sale_employeeId_idx` (`employeeId`)"
            )
            console.log('   ✅ Done')
        } catch (err) {
            if (err.code === 'ER_DUP_KEYNAME') {
                console.log('✓ Index already exists')
            } else {
                throw err
            }
        }

        // Remove customerPhone
        if (columnNames.includes('customerPhone')) {
            console.log('➖ Removing customerPhone column...')
            await connection.query(
                "ALTER TABLE `Sale` DROP COLUMN `customerPhone`"
            )
            console.log('   ✅ Done')
        } else {
            console.log('✓ customerPhone already removed')
        }

        console.log('')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('✅ Migration completed successfully!')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('')
        console.log('Sale table now has employee tracking!')
        console.log('Try creating a sale in the POS now.')

    } catch (error) {
        console.error('')
        console.error('❌ Error:', error.message)
        if (error.code) {
            console.error('Error code:', error.code)
        }
        process.exit(1)
    } finally {
        if (connection) {
            await connection.end()
        }
    }
}

addEmployeeColumns()
