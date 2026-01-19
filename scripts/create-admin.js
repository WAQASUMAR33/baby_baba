// Script to create admin account
// Run with: node scripts/create-admin.js

const bcrypt = require('bcryptjs')

async function createAdmin() {
    try {
        // Import Prisma client
        const { PrismaClient } = require('@prisma/client')
        const prisma = new PrismaClient()

        const email = 'theitxprts@gmail.com'
        const password = '786ninja'
        const name = 'Admin'

        console.log('🔍 Checking if user already exists...')

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            console.log('⚠️  User already exists with this email!')
            console.log('User ID:', existingUser.id)
            console.log('Email:', existingUser.email)
            console.log('Name:', existingUser.name)
            await prisma.$disconnect()
            return
        }

        console.log('🔐 Hashing password...')
        const hashedPassword = await bcrypt.hash(password, 10)

        console.log('👤 Creating admin user...')
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
            }
        })

        console.log('✅ Admin account created successfully!')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('User ID:', user.id)
        console.log('Email:', user.email)
        console.log('Name:', user.name)
        console.log('Password:', password)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('You can now login with these credentials!')

        await prisma.$disconnect()
    } catch (error) {
        console.error('❌ Error creating admin account:', error)
        process.exit(1)
    }
}

createAdmin()
