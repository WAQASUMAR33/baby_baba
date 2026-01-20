import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import prisma from '@/lib/prisma'

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const name = searchParams.get('name')
        const phone = searchParams.get('phone')

        const where = {}
        if (name) {
            where.name = { contains: name }
        }
        if (phone) {
            where.phoneNumber = { contains: phone }
        }

        const customers = await prisma.customer.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        })

        const stats = {
            totalCustomers: await prisma.customer.count(),
            totalBalance: await prisma.customer.aggregate({
                _sum: { balance: true }
            }).then(res => res._sum.balance || 0)
        }

        return NextResponse.json({ success: true, customers, stats })
    } catch (error) {
        console.error('❌ Error fetching customers:', error)
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
        if (!body.name || !body.phoneNumber || !body.address) {
            return NextResponse.json({ success: false, error: 'Required fields missing' }, { status: 400 })
        }

        const customer = await prisma.customer.create({
            data: {
                name: body.name,
                phoneNumber: body.phoneNumber,
                address: body.address,
                balance: body.balance || 0
            }
        })

        return NextResponse.json({ success: true, customer }, { status: 201 })
    } catch (error) {
        console.error('❌ Error creating customer:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
