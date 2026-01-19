// Run database migration to add employee fields to Sales table
const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')

async function runMigration() {
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
        console.log(`   Host: ${config.host}:${config.port}`)
        console.log(`   Database: ${config.database}`)

        const connection = await mysql.createConnection(config)

        console.log('✅ Connected to database')
        console.log('')

        // Read migration SQL file
        const migrationPath = path.join(__dirname, '..', 'migrations', 'add_employee_to_sales.sql')
        const sql = fs.readFileSync(migrationPath, 'utf8')

        // Split by semicolon and filter out empty statements
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'))

        console.log(`📝 Running ${statements.length} SQL statements...`)
        console.log('')

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i]
            console.log(`${i + 1}. ${statement.substring(0, 80)}...`)

            try {
                await connection.execute(statement)
                console.log('   ✅ Success')
            } catch (error) {
                // Check if column already exists
                if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('Duplicate column')) {
                    console.log('   ⚠️  Column already exists, skipping')
                } else if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY' || error.message.includes("Can't DROP")) {
                    console.log('   ⚠️  Column already dropped, skipping')
                } else {
                    console.log(`   ❌ Error: ${error.message}`)
                    throw error
                }
            }
            console.log('')
        }

        await connection.end()

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('✅ Migration completed successfully!')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('')
        console.log('Sale table now includes:')
        console.log('  • employeeId (INT, nullable)')
        console.log('  • employeeName (VARCHAR(255), nullable)')
        console.log('  • Index on employeeId')
        console.log('  • customerPhone column removed')
        console.log('')
        console.log('You can now complete sales with employee tracking!')

    } catch (error) {
        console.error('❌ Migration failed:', error.message)
        process.exit(1)
    }
}

runMigration()
