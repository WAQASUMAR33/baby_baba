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

async function ensureUserTable(connection) {
    try {
        await connection.execute('SELECT 1 FROM `User` LIMIT 1')
        return
    } catch (error) {
        if (error?.code !== 'ER_NO_SUCH_TABLE') throw error
    }
    const createSql = `
        CREATE TABLE IF NOT EXISTS \`User\` (
            \`id\` INT NOT NULL AUTO_INCREMENT,
            \`email\` VARCHAR(191) NOT NULL,
            \`password\` VARCHAR(255) NOT NULL,
            \`name\` VARCHAR(191) NULL,
            \`role\` VARCHAR(50) DEFAULT 'user',
            \`status\` VARCHAR(50) DEFAULT 'active',
            \`modules\` TEXT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL,
            UNIQUE KEY \`User_email_key\` (\`email\`),
            PRIMARY KEY (\`id\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `
    await connection.execute(createSql)
}

async function createAdminUser() {
    try {
        // Load environment variables
        require('dotenv').config()

        const dbUrl = process.env.DATABASE_URL
        const config = parseDatabaseUrl(dbUrl)

        console.log('📡 Connecting to database...')
        const connection = await mysql.createConnection(config)

        await ensureUserTable(connection)

        // Check if admin already exists
        const [existingUsers] = await connection.execute(
            'SELECT * FROM User WHERE email = ?',
            ['admin@gmail.com']
        )

        const adminExistsInUppercase = existingUsers.length > 0

        // Hash password
        console.log('🔐 Hashing password...')
        const hashedPassword = await bcrypt.hash('786ninja', 10)

        if (!adminExistsInUppercase) {
            console.log('👤 Creating admin user in `User` table...')
            await connection.execute(
                'INSERT INTO User (email, password, name, role, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
                ['admin@gmail.com', hashedPassword, 'Admin', 'admin', 'active']
            )
        } else {
            console.log('⚠️  Admin user already exists in `User` table')
        }

        // If a lowercase `user` table exists, mirror the admin there too
        try {
            const [lowerTable] = await connection.execute("SHOW TABLES LIKE 'user'")
            const hasLowercaseUserTable = lowerTable && lowerTable.length > 0
            if (hasLowercaseUserTable) {
                const [existingLower] = await connection.execute(
                    'SELECT * FROM user WHERE email = ?',
                    ['admin@gmail.com']
                )
                if (existingLower.length === 0) {
                    console.log('👤 Creating admin user in lowercase `user` table...')
                    await connection.execute(
                        'INSERT INTO user (email, password, name, role, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
                        ['admin@gmail.com', hashedPassword, 'Admin', 'admin', 'active']
                    )
                } else {
                    console.log('⚠️  Admin user already exists in lowercase `user` table')
                }
            }
        } catch (err) {
            // ignore errors for lowercase table probing
        }

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
