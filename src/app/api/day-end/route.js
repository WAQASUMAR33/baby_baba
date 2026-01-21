import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');

    if (!dateStr) {
        return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const date = new Date(dateStr);

    // Start and End of the selected day
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    try {
        // 1. Try to find existing DayEnd record
        const existingRecord = await prisma.dayEnd.findUnique({
            where: {
                date: startOfDay,
            },
        });

        if (existingRecord) {
            return NextResponse.json(existingRecord);
        }

        // 2. If no record, calculate defaults

        // a. Get Previous Day's Closing Balance (to set as Opening Balance)
        const previousDayRecord = await prisma.dayEnd.findFirst({
            where: {
                date: {
                    lt: startOfDay,
                },
            },
            orderBy: {
                date: 'desc',
            },
        });

        const openingBalance = previousDayRecord ? previousDayRecord.closingBalance : 0;

        // b. Calculate Total Expenses for the day
        const expenses = await prisma.expense.aggregate({
            where: {
                exp_date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
            _sum: {
                exp_amount: true,
            },
        });

        const totalExpenses = expenses._sum.exp_amount || 0;

        // c. Calculate Total Sales for the day (Completed sales only)
        const sales = await prisma.sale.aggregate({
            where: {
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                status: 'completed'
            },
            _sum: {
                total: true
            }
        });

        const totalSales = sales._sum.total || 0;

        return NextResponse.json({
            id: null,
            date: startOfDay,
            openingBalance,
            totalExpenses,
            totalSales,
            dailyCash: 0,
            closingBalance: 0 // Will be calculated on frontend or can be partial
        });

    } catch (error) {
        console.error('Error fetching day end data:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { date, openingBalance, totalExpenses, totalSales, dailyCash, closingBalance } = body;

        const dateObj = new Date(date);
        const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0));

        const record = await prisma.dayEnd.upsert({
            where: {
                date: startOfDay,
            },
            update: {
                openingBalance,
                totalExpenses,
                totalSales,
                dailyCash,
                closingBalance
            },
            create: {
                date: startOfDay,
                openingBalance,
                totalExpenses,
                totalSales,
                dailyCash,
                closingBalance
            }
        });

        return NextResponse.json(record);
    } catch (error) {
        console.error("Error saving day end:", error);
        return NextResponse.json({ error: "Failed to save record" }, { status: 500 });
    }
}
