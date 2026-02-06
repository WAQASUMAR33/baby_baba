import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import prisma from '@/lib/prisma';

const parseDatabaseUrl = (url) => {
    if (!url) throw new Error('DATABASE_URL not defined');
    const match = url.match(/^mysql:\/\/([^:@/]+)(?::([^@/]*))?@([^:/]+)(?::(\d+))?\/(.+)$/);
    if (!match) throw new Error('Invalid DATABASE_URL format');
    return {
        host: match[3],
        port: match[4] ? parseInt(match[4]) : 3306,
        user: match[1],
        password: match[2] || '',
        database: match[5],
    };
};

let pool = null;
let dayEndTableCache = null;

function getPool() {
    if (!pool) {
        const dbUrl = process.env.DATABASE_URL;
        const config = parseDatabaseUrl(dbUrl);
        pool = mysql.createPool({
            ...config,
            waitForConnections: true,
            connectionLimit: 10,
        });
    }
    return pool;
}

async function ensureDayEndTable() {
    if (dayEndTableCache) return dayEndTableCache;
    const pool = getPool();
    const [rows] = await pool.query('SHOW TABLES');
    const tableList = rows.map((r) => Object.values(r)[0]);
    const candidates = ['DayEnd', 'dayend', 'day_end'];
    const existing = candidates.find((name) => tableList.includes(name));
    if (existing) {
        dayEndTableCache = existing;
        return existing;
    }
    const tableName = 'DayEnd';
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS \`${tableName}\` (
            id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            date DATE NOT NULL UNIQUE,
            opening_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
            total_expenses DECIMAL(10, 2) NOT NULL DEFAULT 0,
            total_sales DECIMAL(10, 2) NOT NULL DEFAULT 0,
            daily_cash DECIMAL(10, 2) NOT NULL DEFAULT 0,
            closing_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
            createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
    dayEndTableCache = tableName;
    return tableName;
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');

    try {
        const pool = getPool();
        const dayEndTable = await ensureDayEndTable();
        const baseSelect = `SELECT id, date, opening_balance as openingBalance, total_expenses as totalExpenses, total_sales as totalSales, daily_cash as dailyCash, closing_balance as closingBalance, createdAt, updatedAt FROM \`${dayEndTable}\``;
        if (!dateStr) {
            const [records] = await pool.execute(`${baseSelect} ORDER BY date DESC`);
            return NextResponse.json({ records });
        }

        const date = new Date(dateStr);
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));

        const [existingRows] = await pool.execute(
            `${baseSelect} WHERE date = ? LIMIT 1`,
            [startOfDay]
        );
        const existingRecord = existingRows?.[0];

        if (existingRecord) {
            return NextResponse.json(existingRecord);
        }

        const [previousRows] = await pool.execute(
            `${baseSelect} WHERE date < ? ORDER BY date DESC LIMIT 1`,
            [startOfDay]
        );
        const previousDayRecord = previousRows?.[0];

        const openingBalance = previousDayRecord ? previousDayRecord.closingBalance : 0;

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
            closingBalance: 0
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

        const pool = getPool();
        const dayEndTable = await ensureDayEndTable();
        await pool.execute(
            `INSERT INTO \`${dayEndTable}\` (date, opening_balance, total_expenses, total_sales, daily_cash, closing_balance, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE
                opening_balance = VALUES(opening_balance),
                total_expenses = VALUES(total_expenses),
                total_sales = VALUES(total_sales),
                daily_cash = VALUES(daily_cash),
                closing_balance = VALUES(closing_balance),
                updatedAt = NOW()`,
            [startOfDay, openingBalance, totalExpenses, totalSales, dailyCash, closingBalance]
        );
        const [rows] = await pool.execute(
            `SELECT id, date, opening_balance as openingBalance, total_expenses as totalExpenses, total_sales as totalSales, daily_cash as dailyCash, closing_balance as closingBalance, createdAt, updatedAt FROM \`${dayEndTable}\` WHERE date = ? LIMIT 1`,
            [startOfDay]
        );

        return NextResponse.json(rows?.[0] || null);
    } catch (error) {
        console.error("Error saving day end:", error);
        return NextResponse.json({ error: "Failed to save record" }, { status: 500 });
    }
}
