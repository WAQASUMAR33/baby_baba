import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { updateCategory, deleteCategory } from '@/lib/category-db'

export async function PUT(request, { params }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()

        if (!body.name || !body.slug) {
            return NextResponse.json({ success: false, error: 'Name and slug are required' }, { status: 400 })
        }

        const category = await updateCategory(id, body)
        return NextResponse.json({ success: true, category })
    } catch (error) {
        console.error('Category Update Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        await deleteCategory(id)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Category Delete Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
