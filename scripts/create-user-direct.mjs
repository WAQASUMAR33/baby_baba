// Direct user creation script using Prisma
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'

// Parse DATABASE_URL
const parseDatabaseUrl = (url) => {
  if (!url) {
    throw new Error('DATABASE_URL is not defined')
  }
  const match = url.match(/mysql:\/\/([^:]+)(?::([^@]*))?@([^:]+):(\d+)\/(.+)/)
  if (!match) {
    throw new Error('Invalid DATABASE_URL format')
  }
  return {
    host: match[3],
    port: parseInt(match[4]),
    user: match[1],
    password: match[2] || '',
    database: match[5],
  }
}

async function createUser() {
  let prisma
  try {
    const dbUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/mydb2'
    console.log('Connecting to database...')
    console.log('Database URL:', dbUrl.replace(/:[^:@]+@/, ':****@')) // Hide password
    
    const config = parseDatabaseUrl(dbUrl)
    const connection = mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    })
    
    const adapter = new PrismaMariaDb(connection)
    prisma = new PrismaClient({
      adapter,
      log: ['error'],
    })

    const email = 'theitxprts@gmail.com'
    const password = '786ninja'
    const name = 'Test User'

    console.log('')
    console.log('Creating user account...')
    console.log('Email:', email)
    console.log('Name:', name)
    console.log('')

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      console.log('⚠️  User already exists with email:', email)
      console.log('User ID:', existingUser.id)
      console.log('User Name:', existingUser.name)
      return
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

  } catch (error) {
    console.error('❌ Error creating user:', error.message)
    if (error.code) {
      console.error('Error code:', error.code)
    }
    if (error.stack) {
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  } finally {
    if (prisma) {
      await prisma.$disconnect()
    }
  }
}

createUser()
