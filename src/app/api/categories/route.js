import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getCategories, createCategory } from '@/lib/category-db'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const categories = await getCategories()
        return NextResponse.json({ success: true, categories })
    } catch (error) {
        console.error('Category API Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        if (!body.name || !body.slug) {
            return NextResponse.json({ success: false, error: 'Name and slug are required' }, { status: 400 })
        }

        const category = await createCategory(body)
        return NextResponse.json({ success: true, category })
    } catch (error) {
        console.error('Category Create Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
