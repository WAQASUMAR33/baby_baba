// Direct SQL script to create user - bypasses Prisma client issues
require('dotenv').config()
const mysql = require('mysql2/promise')
const bcrypt = require('bcryptjs')

async function createUser() {
  let connection
  try {
    // Parse DATABASE_URL
    const dbUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/mydb2'
    console.log('Connecting to database...')
    
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
    
    connection = await mysql.createConnection(config)
    console.log('✅ Connected to database')
    
    const email = 'theitxprts@gmail.com'
    const password = '786ninja'
    const name = 'Test User'
    
    // Check if user exists
    const [existing] = await connection.execute(
      'SELECT * FROM User WHERE email = ?',
      [email]
    )
    
    if (existing.length > 0) {
      console.log('⚠️  User already exists:')
      console.log('   ID:', existing[0].id)
      console.log('   Email:', existing[0].email)
      console.log('   Name:', existing[0].name)
      return
    }
    
    // Hash password
    console.log('Hashing password...')
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Insert user
    console.log('Creating user...')
    const [result] = await connection.execute(
      'INSERT INTO User (email, password, name, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())',
      [email, hashedPassword, name]
    )
    
    console.log('')
    console.log('✅ User created successfully!')
    console.log('📧 Email:', email)
    console.log('👤 Name:', name)
    console.log('🆔 ID:', result.insertId)
    console.log('')
    console.log('You can now login with:')
    console.log('Email:', email)
    console.log('Password:', password)
    console.log('')
    console.log('Login at: http://localhost:3000/login')
    
  } catch (error) {
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

createUser()







