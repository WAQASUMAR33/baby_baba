// Test script to verify login logic
require('dotenv').config()
const mysql = require('mysql2/promise')
const bcrypt = require('bcryptjs')

async function testLogin() {
  let connection
  try {
    const dbUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/mydb2'
    const match = dbUrl.match(/mysql:\/\/([^:]+)(?::([^@]*))?@([^:]+):(\d+)\/(.+)/)
    
    connection = await mysql.createConnection({
      host: match[3],
      port: parseInt(match[4]),
      user: match[1],
      password: match[2] || '',
      database: match[5],
    })
    
    const email = 'theitxprts@gmail.com'
    const password = '786ninja'
    
    console.log('Testing login...')
    console.log('Email:', email)
    console.log('')
    
    // Find user
    const [users] = await connection.execute(
      'SELECT * FROM User WHERE email = ?',
      [email]
    )
    
    if (users.length === 0) {
      console.log('❌ User not found')
      return
    }
    
    const user = users[0]
    console.log('✅ User found:')
    console.log('   ID:', user.id)
    console.log('   Email:', user.email)
    console.log('   Name:', user.name)
    console.log('   Password hash:', user.password.substring(0, 20) + '...')
    console.log('')
    
    // Test password
    console.log('Testing password...')
    const isValid = await bcrypt.compare(password, user.password)
    
    if (isValid) {
      console.log('✅ Password is valid!')
      console.log('Login should work.')
    } else {
      console.log('❌ Password is invalid!')
      console.log('The password hash might be incorrect.')
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

testLogin()







