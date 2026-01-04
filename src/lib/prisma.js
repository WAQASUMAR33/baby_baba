import { PrismaClient } from '../generated/prisma/index.js'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import mysql from 'mysql2/promise'

// Singleton pattern for Prisma Client
const globalForPrisma = globalThis

// Create connection pool (singleton)
let pool
if (!globalForPrisma.mysqlPool) {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/mydb2'
  
  // Parse connection string
  const match = dbUrl.match(/mysql:\/\/([^:]+)(?::([^@]*))?@([^:]+):(\d+)\/(.+)/)
  if (!match) throw new Error('Invalid DATABASE_URL')
  
  const [_, user, password, host, port, database] = match
  
  pool = mysql.createPool({
    host,
    port: parseInt(port),
    user,
    password: password || '',
    database,
    waitForConnections: true,
    connectionLimit: 20, // Increased
    maxIdle: 5,
    idleTimeout: 60000,
    queueLimit: 0,
    enableKeepAlive: true,
    connectTimeout: 10000,
  })
  
  globalForPrisma.mysqlPool = pool
  console.log('✅ MySQL connection pool created (limit: 20)')
} else {
  pool = globalForPrisma.mysqlPool
}

// Create adapter
const adapter = new PrismaMariaDb(pool)

// Create Prisma Client (singleton)
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Test connection
prisma.$queryRaw`SELECT 1 as test`
  .then(() => console.log('✅ Prisma connected to MySQL'))
  .catch((err) => console.error('❌ Prisma connection failed:', err.message))

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  await pool.end()
})

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  await pool.end()
  process.exit(0)
})

export default prisma


