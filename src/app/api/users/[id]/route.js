import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { getUserById, updateUser, deleteUser } from '@/lib/user-db'
import bcrypt from 'bcryptjs'

export async function PATCH(request, { params }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()

        // Check if user exists
        const user = await getUserById(id)
        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
        }

        // Hash password if provided
        const updateData = { ...body }
        if (body.password) {
            updateData.password = await bcrypt.hash(body.password, 10)
        }

        const updatedUser = await updateUser(id, updateData)
        return NextResponse.json({ success: true, user: updatedUser })
    } catch (error) {
        console.error('❌ Error updating user:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        // Prevent deleting oneself
        const userToEmail = await getUserById(id)
        if (userToEmail?.email === session.user.email) {
            return NextResponse.json({ success: false, error: 'You cannot delete yourself' }, { status: 400 })
        }

        const success = await deleteUser(id)
        if (!success) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, message: 'User deleted successfully' })
    } catch (error) {
        console.error('❌ Error deleting user:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
