import 'dotenv/config'
import mysql from 'mysql2/promise'

async function checkCount() {
    const dbUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/mydb2'
    const match = dbUrl.match(/mysql:\/\/([^:]+)(?::([^@]*))?@([^:]+):(\d+)\/(.+)/)
    const config = {
        host: match[3],
        port: parseInt(match[4]),
        user: match[1],
        password: match[2] || '',
        database: match[5],
    }

    const connection = await mysql.createConnection(config)
    try {
        const [products] = await connection.execute('SELECT COUNT(*) as count FROM Product')
        const [variants] = await connection.execute('SELECT COUNT(*) as count FROM ProductVariant')
        console.log(`📊 Products in DB: ${products[0].count}`)
        console.log(`📊 Variants in DB: ${variants[0].count}`)
    } catch (error) {
        console.error('❌ Error checking count:', error)
    } finally {
        await connection.end()
    }
}

checkCount()
