import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { getEmployeeById, updateEmployee, deleteEmployee } from '@/lib/employee-db'

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const id = parseInt(params.id)
    const employee = await getEmployeeById(id)
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, employee })
  } catch (error) {
    console.error('❌ Error fetching employee:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const id = parseInt(params.id)
    const body = await request.json()
    const employee = await updateEmployee(id, body)
    return NextResponse.json({ success: true, employee })
  } catch (error) {
    console.error('❌ Error updating employee:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const id = parseInt(params.id)
    const success = await deleteEmployee(id)
    return NextResponse.json({ success, message: success ? 'Employee deleted' : 'Delete failed' })
  } catch (error) {
    console.error('❌ Error deleting employee:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
