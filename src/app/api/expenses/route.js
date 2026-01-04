import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { findUserByEmail } from '@/lib/db'
import { createExpense, getExpenses } from '@/lib/expense-db'

/**
 * POST /api/expenses
 * Create a new expense record
 */
export async function POST(request) {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate required fields
    if (!body.exp_title_id || !body.exp_amount) {
      return NextResponse.json(
        { success: false, error: 'Expense title and amount are required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await findUserByEmail(session.user.email)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Prepare expense data
    const expenseData = {
      exp_title_id: parseInt(body.exp_title_id),
      exp_description: body.exp_description || null,
      exp_amount: parseFloat(body.exp_amount),
      exp_date: body.exp_date || new Date(),
    }

    // Create expense
    const expense = await createExpense(expenseData, user.id)

    console.log(`✅ Expense created: #${expense.id} - Rs ${expense.exp_amount}`)

    return NextResponse.json({
      success: true,
      expense,
      message: 'Expense created successfully'
    })
  } catch (error) {
    console.error('❌ Error creating expense:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create expense',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/expenses
 * Fetch expenses
 */
export async function GET(request) {
  try {
    const session = await getServerSession()
    
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
      exp_title_id: searchParams.get('exp_title_id'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    }

    // Fetch expenses
    const { expenses, total, stats, titleBreakdown } = await getExpenses(filters)

    return NextResponse.json({
      success: true,
      expenses,
      total,
      limit: filters.limit,
      offset: filters.offset,
      stats: {
        totalExpenses: parseInt(stats.totalExpenses) || 0,
        totalAmount: parseFloat(stats.totalAmount) || 0,
      },
      titleBreakdown,
    })
  } catch (error) {
    console.error('❌ Error fetching expenses:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch expenses',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

