import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { findUserByEmail } from '@/lib/db'
import { deleteExpense } from '@/lib/expense-db'

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const expenseId = parseInt(params.id)
    if (!expenseId) {
      return NextResponse.json({ success: false, error: 'Invalid expense ID' }, { status: 400 })
    }

    const user = await findUserByEmail(session.user.email)
    const isAdmin = session.user.role === 'admin'
    const deleted = await deleteExpense(expenseId, user?.id, isAdmin)

    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Expense not found or not authorized' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete expense' }, { status: 500 })
  }
}
