import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { getUserById, updateUser, deleteUser } from '@/lib/user-db'

/**
 * GET /api/users/[id]
 * Fetch a single user
 */
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = parseInt(params.id)
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    const user = await getUserById(userId)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user,
    })
  } catch (error) {
    console.error('❌ Error fetching user:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch user',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/users/[id]
 * Update a user
 */
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = parseInt(params.id)
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate email format if provided
    if (body.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        )
      }
    }

    // Validate password length if provided
    if (body.password && body.password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Update user
    const user = await updateUser(userId, body)

    console.log(`✅ User updated: ${user.email} (ID: ${user.id})`)

    return NextResponse.json({
      success: true,
      user,
      message: 'User updated successfully'
    })
  } catch (error) {
    console.error('❌ Error updating user:', error)
    
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
        error: error.message || 'Failed to update user',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/users/[id]
 * Delete a user
 */
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = parseInt(params.id)
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    // Prevent deleting yourself
    // You can add this check if you store user ID in session
    // if (session.user.id === userId) {
    //   return NextResponse.json(
    //     { success: false, error: 'Cannot delete your own account' },
    //     { status: 400 }
    //   )
    // }

    const deleted = await deleteUser(userId)

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    console.log(`✅ User deleted: ID ${userId}`)

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })
  } catch (error) {
    console.error('❌ Error deleting user:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete user',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}




