const bcrypt = require('bcryptjs')
const mysql = require('mysql2/promise')

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

async function createAdminUser() {
    try {
        // Load environment variables
        require('dotenv').config()

        const dbUrl = process.env.DATABASE_URL
        const config = parseDatabaseUrl(dbUrl)

        console.log('📡 Connecting to database...')
        const connection = await mysql.createConnection(config)

        // Check if admin already exists
        const [existingUsers] = await connection.execute(
            'SELECT * FROM User WHERE email = ?',
            ['admin@gmail.com']
        )

        if (existingUsers.length > 0) {
            console.log('⚠️  Admin user already exists!')
            await connection.end()
            return
        }

        // Hash password
        console.log('🔐 Hashing password...')
        const hashedPassword = await bcrypt.hash('786ninja', 10)

        // Create admin user
        console.log('👤 Creating admin user...')
        await connection.execute(
            'INSERT INTO User (email, password, name, role, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
            ['admin@gmail.com', hashedPassword, 'Admin', 'admin', 'active']
        )

        console.log('✅ Admin user created successfully!')
        console.log('📧 Email: admin@gmail.com')
        console.log('🔑 Password: 786ninja')
        console.log('👑 Role: admin')

        await connection.end()
    } catch (error) {
        console.error('❌ Error creating admin user:', error)
        process.exit(1)
    }
}

createAdminUser()
