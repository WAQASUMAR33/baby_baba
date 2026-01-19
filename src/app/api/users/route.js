import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { getAllUsers, createUser, findUserByEmail } from '@/lib/user-db'
import bcrypt from 'bcryptjs'

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        // You might want to restrict this to only certain roles (e.g., admin)
        // if (session.user.role !== 'admin') {
        //   return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
        // }

        const users = await getAllUsers()
        return NextResponse.json({ success: true, users })
    } catch (error) {
        console.error('❌ Error fetching users:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        if (!body.email || !body.password || !body.name) {
            return NextResponse.json({ success: false, error: 'Required fields missing' }, { status: 400 })
        }

        // Check if user already exists
        const existingUser = await findUserByEmail(body.email)
        if (existingUser) {
            return NextResponse.json({ success: false, error: 'User with this email already exists' }, { status: 400 })
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(body.password, 10)

        const user = await createUser({
            ...body,
            password: hashedPassword
        })

        return NextResponse.json({ success: true, user }, { status: 201 })
    } catch (error) {
        console.error('❌ Error creating user:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
