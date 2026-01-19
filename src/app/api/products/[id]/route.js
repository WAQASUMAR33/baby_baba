import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { updateProductCategory } from '@/lib/product-db'

export async function PATCH(request, { params }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()

        // Support category assignment
        if (Object.prototype.hasOwnProperty.call(body, 'categoryId')) {
            await updateProductCategory(id, body.categoryId)
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Product Update Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
