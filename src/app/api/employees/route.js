import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { getAllEmployees, createEmployee, getEmployeeStats } from '@/lib/employee-db'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filters = {
      name: searchParams.get('name'),
      city: searchParams.get('city'),
    }

    const [employees, stats] = await Promise.all([
      getAllEmployees(filters),
      getEmployeeStats(),
    ])

    return NextResponse.json({ success: true, employees, stats })
  } catch (error) {
    console.error('❌ Error fetching employees:', error)
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
    if (!body.name || !body.phoneNumber || !body.city || !body.address) {
      return NextResponse.json({ success: false, error: 'Required fields missing' }, { status: 400 })
    }

    const employee = await createEmployee(body)
    return NextResponse.json({ success: true, employee }, { status: 201 })
  } catch (error) {
    console.error('❌ Error creating employee:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
