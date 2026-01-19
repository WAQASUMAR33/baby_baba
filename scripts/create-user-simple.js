// Simple script to create a user directly in the database
// Run with: node scripts/create-user-simple.js

require('dotenv').config()
const bcrypt = require('bcryptjs')

// Use dynamic import for ES modules
async function createUser() {
  try {
    // Import Prisma and bcrypt
    const { PrismaClient } = await import('../src/generated/prisma/client.js')
    const prisma = new PrismaClient()

    const email = process.argv[2] || 'admin@example.com'
    const password = process.argv[3] || 'admin123'
    const name = process.argv[4] || 'Admin User'

    console.log('Creating user account...')
    console.log('Email:', email)
    console.log('Name:', name)
    console.log('')

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      console.log('❌ User already exists with email:', email)
      await prisma.$disconnect()
      process.exit(1)
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      }
    })

    console.log('✅ User created successfully!')
    console.log('📧 Email:', user.email)
    console.log('👤 Name:', user.name)
    console.log('🆔 ID:', user.id)
    console.log('')
    console.log('You can now login with:')
    console.log('Email:', email)
    console.log('Password:', password)

    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ Error creating user:', error.message)
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('')
      console.log('Make sure Prisma client is generated:')
      console.log('  npx prisma generate')
    }
    process.exit(1)
  }
}

createUser()







