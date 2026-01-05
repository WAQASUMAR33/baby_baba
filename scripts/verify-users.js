// Script to verify users in the database
require('dotenv').config()
const mysql = require('mysql2/promise')

async function verifyUsers() {
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
    
    const [users] = await connection.execute('SELECT id, email, name, createdAt FROM User ORDER BY id')
    
    console.log('Users in database:')
    console.log('==================')
    if (users.length === 0) {
      console.log('No users found.')
    } else {
      users.forEach(user => {
        console.log(`ID: ${user.id}`)
        console.log(`  Email: ${user.email}`)
        console.log(`  Name: ${user.name || '(no name)'}`)
        console.log(`  Created: ${user.createdAt}`)
        console.log('')
      })
    }
    console.log(`Total users: ${users.length}`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

verifyUsers()






