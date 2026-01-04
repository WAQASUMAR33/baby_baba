import bcrypt from 'bcryptjs'

// Simple script to create a user via the registration API
// This requires the Next.js server to be running

const email = process.argv[2] || 'admin@example.com'
const password = process.argv[3] || 'admin123'
const name = process.argv[4] || 'Admin User'

const API_URL = process.env.API_URL || 'http://localhost:3000'

async function createUser() {
  try {
    console.log('Creating user account...')
    console.log('Email:', email)
    console.log('Name:', name)
    console.log('')

    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        name,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Error:', data.error)
      process.exit(1)
    }

    console.log('✅ User created successfully!')
    console.log('📧 Email:', email)
    console.log('👤 Name:', name)
    console.log('🆔 User ID:', data.userId)
    console.log('')
    console.log('You can now login with:')
    console.log('Email:', email)
    console.log('Password:', password)

  } catch (error) {
    console.error('❌ Error creating user:', error.message)
    console.log('')
    console.log('Make sure your Next.js server is running:')
    console.log('  npm run dev')
    process.exit(1)
  }
}

createUser()
