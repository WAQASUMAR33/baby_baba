import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createExpenseTitle, getExpenseTitles } from '@/lib/expense-db'

/**
 * GET /api/expenses/titles
 * Fetch all expense titles
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

    const titles = await getExpenseTitles()

    return NextResponse.json({
      success: true,
      titles,
    })
  } catch (error) {
    console.error('❌ Error fetching expense titles:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch expense titles',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/expenses/titles
 * Create a new expense title
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
    if (!body.exp_title || body.exp_title.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Expense title is required' },
        { status: 400 }
      )
    }

    // Create expense title
    const title = await createExpenseTitle(body.exp_title.trim())

    console.log(`✅ Expense title created: #${title.id} - ${title.exp_title}`)

    return NextResponse.json({
      success: true,
      title,
      message: 'Expense title created successfully'
    })
  } catch (error) {
    console.error('❌ Error creating expense title:', error)
    
    // Check for duplicate error
    if (error.message.includes('Duplicate entry') || error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        {
          success: false,
          error: 'This expense title already exists',
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create expense title',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}







