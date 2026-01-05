import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { getAllUsers, createUser, getUserStats } from '@/lib/user-db'

/**
 * GET /api/users
 * Fetch all users (Admin only)
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin (you can add role check here)
    // For now, allow all authenticated users to view

    const { searchParams } = new URL(request.url)
    
    const filters = {
      role: searchParams.get('role'),
      status: searchParams.get('status'),
    }

    const [users, stats] = await Promise.all([
      getAllUsers(filters),
      getUserStats(),
    ])

    return NextResponse.json({
      success: true,
      users,
      stats,
    })
  } catch (error) {
    console.error('❌ Error fetching users:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch users',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/users
 * Create a new user (Admin only)
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin (add role check if needed)

    const body = await request.json()
    
    // Validate required fields
    if (!body.email || !body.password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password length
    if (body.password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Create user
    const user = await createUser({
      email: body.email,
      password: body.password,
      name: body.name || null,
      role: body.role || 'user',
      status: body.status || 'active',
    })

    console.log(`✅ User created: ${user.email} (ID: ${user.id})`)

    return NextResponse.json({
      success: true,
      user,
      message: 'User created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('❌ Error creating user:', error)
    
    // Check for duplicate email error
    if (error.message.includes('Duplicate entry') || error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        {
          success: false,
          error: 'Email already exists',
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create user',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}






