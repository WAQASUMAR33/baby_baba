import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import prisma from '@/lib/prisma'

export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const customer = await prisma.customer.findUnique({
            where: { id: parseInt(params.id) }
        })

        if (!customer) {
            return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, customer })
    } catch (error) {
        console.error('❌ Error fetching customer:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function PATCH(request, { params }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const customer = await prisma.customer.update({
            where: { id: parseInt(params.id) },
            data: {
                ...(body.name && { name: body.name }),
                ...(body.phoneNumber && { phoneNumber: body.phoneNumber }),
                ...(body.address && { address: body.address }),
                ...(body.balance !== undefined && { balance: body.balance })
            }
        })

        return NextResponse.json({ success: true, customer })
    } catch (error) {
        console.error('❌ Error updating customer:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        await prisma.customer.delete({
            where: { id: parseInt(params.id) }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('❌ Error deleting customer:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
