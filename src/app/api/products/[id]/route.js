import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { updateProductCategory, getProductById, deleteProduct, updateProduct } from '@/lib/product-db'

export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const product = await getProductById(id)

        if (!product) {
            return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, product })
    } catch (error) {
        console.error('Product Fetch Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function PATCH(request, { params }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()

        // Handle full product update or just category update
        await updateProduct(id, body)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Product Update Error:', error)
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
        await deleteProduct(id)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Product Delete Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
