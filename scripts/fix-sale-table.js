// Check and add employee columns to Sale table
const mysql = require('mysql2/promise')

async function fixSaleTable() {
    try {
        // Parse DATABASE_URL
        const dbUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/mydb2'
        const match = dbUrl.match(/mysql:\/\/([^:]+)(?::([^@]*))?@([^:]+):(\d+)\/(.+)/)

        if (!match) {
            throw new Error('Invalid DATABASE_URL format')
        }

        const config = {
            host: match[3],
            port: parseInt(match[4]),
            user: match[1],
            password: match[2] || '',
            database: match[5],
        }

        console.log('🔌 Connecting to database...')
        const connection = await mysql.createConnection(config)
        console.log('✅ Connected')
        console.log('')

        // Check current table structure
        console.log('📋 Checking Sale table structure...')
        const [columns] = await connection.execute(
            "SHOW COLUMNS FROM Sale"
        )

        console.log('Current columns:')
        columns.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type})`)
        })
        console.log('')

        const columnNames = columns.map(c => c.Field)

        // Add employeeId if it doesn't exist
        if (!columnNames.includes('employeeId')) {
            console.log('➕ Adding employeeId column...')
            await connection.execute(
                "ALTER TABLE Sale ADD COLUMN employeeId INT NULL AFTER commission"
            )
            console.log('   ✅ employeeId added')
        } else {
            console.log('   ℹ️  employeeId already exists')
        }

        // Add employeeName if it doesn't exist
        if (!columnNames.includes('employeeName')) {
            console.log('➕ Adding employeeName column...')
            await connection.execute(
                "ALTER TABLE Sale ADD COLUMN employeeName VARCHAR(255) NULL AFTER employeeId"
            )
            console.log('   ✅ employeeName added')
        } else {
            console.log('   ℹ️  employeeName already exists')
        }

        // Add index if it doesn't exist
        console.log('➕ Adding index on employeeId...')
        try {
            await connection.execute(
                "ALTER TABLE Sale ADD INDEX Sale_employeeId_idx (employeeId)"
            )
            console.log('   ✅ Index added')
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('   ℹ️  Index already exists')
            } else {
                throw error
            }
        }

        // Drop customerPhone if it exists
        if (columnNames.includes('customerPhone')) {
            console.log('➖ Removing customerPhone column...')
            await connection.execute(
                "ALTER TABLE Sale DROP COLUMN customerPhone"
            )
            console.log('   ✅ customerPhone removed')
        } else {
            console.log('   ℹ️  customerPhone already removed')
        }

        console.log('')
        console.log('📋 Final Sale table structure:')
        const [finalColumns] = await connection.execute(
            "SHOW COLUMNS FROM Sale"
        )
        finalColumns.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type})`)
        })

        await connection.end()

        console.log('')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('✅ Sale table updated successfully!')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('')
        console.log('You can now complete sales with employee tracking!')

    } catch (error) {
        console.error('❌ Error:', error.message)
        console.error('Stack:', error.stack)
        process.exit(1)
    }
}

fixSaleTable()
