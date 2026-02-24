import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getCustomerLedger } from '@/lib/sales-db'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const filters = {
      limit: parseInt(searchParams.get('limit')) || 100,
      offset: parseInt(searchParams.get('offset')) || 0,
      customerId: searchParams.get('customerId'),
      referenceType: searchParams.get('referenceType'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    }

    const { ledger, total } = await getCustomerLedger(filters)

    return NextResponse.json({
      success: true,
      ledger,
      total,
      limit: filters.limit,
      offset: filters.offset,
    })
  } catch (error) {
    console.error('❌ Error fetching customer ledger:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch ledger' },
      { status: 500 }
    )
  }
}
