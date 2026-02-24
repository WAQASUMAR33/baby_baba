import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

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
let dayEndColumnsChecked = false;

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
    const p = getPool();
    const [rows] = await p.query('SHOW TABLES');
    const tableList = rows.map((r) => Object.values(r)[0]);
    const candidates = ['DayEnd', 'dayend', 'day_end'];
    const existing = candidates.find((name) => tableList.includes(name));
    if (existing) {
        dayEndTableCache = existing;
        await ensureDayEndColumns(p, existing);
        return existing;
    }
    const tableName = 'DayEnd';
    await p.execute(`
        CREATE TABLE IF NOT EXISTS \`${tableName}\` (
            id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            date DATE NOT NULL UNIQUE,
            opening_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
            total_expenses  DECIMAL(10, 2) NOT NULL DEFAULT 0,
            total_sales     DECIMAL(10, 2) NOT NULL DEFAULT 0,
            cash_sales      DECIMAL(10, 2) NOT NULL DEFAULT 0,
            daily_cash      DECIMAL(10, 2) NOT NULL DEFAULT 0,
            closing_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
            createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
    dayEndTableCache = tableName;
    dayEndColumnsChecked = true;
    return tableName;
}

async function ensureDayEndColumns(p, tableName) {
    if (dayEndColumnsChecked) return;
    try {
        await p.execute(`ALTER TABLE \`${tableName}\` ADD COLUMN \`cash_sales\` DECIMAL(10,2) NOT NULL DEFAULT 0`);
    } catch (err) {
        if (err?.code !== 'ER_DUP_FIELDNAME') throw err;
    }
    dayEndColumnsChecked = true;
}

async function getSourceTables(p) {
    const [tableRows] = await p.query('SHOW TABLES');
    const all = tableRows.map((r) => Object.values(r)[0]);
    const resolve = (candidates) => candidates.find((n) => all.includes(n)) || null;
    return {
        expenseTable: resolve(['Expense', 'expense', 'expenses']),
        saleTable: resolve(['Sale', 'sale', 'sales']),
    };
}

/**
 * Fetch live totals for a given date string "YYYY-MM-DD".
 * Uses DATE() MySQL function to avoid timezone boundary issues.
 */
async function fetchLiveTotals(p, dateStr) {
    const { expenseTable, saleTable } = await getSourceTables(p);

    let totalExpenses = 0;
    if (expenseTable) {
        const [expRows] = await p.execute(
            `SELECT COALESCE(SUM(exp_amount), 0) AS total
             FROM \`${expenseTable}\`
             WHERE DATE(exp_date) = ?`,
            [dateStr]
        );
        totalExpenses = parseFloat(expRows[0]?.total || 0);
    }

    let totalSales = 0;
    let cashSales = 0;
    if (saleTable) {
        const [salesRows] = await p.execute(
            `SELECT
                COALESCE(SUM(total), 0) AS totalSales,
                COALESCE(SUM(CASE WHEN LOWER(paymentMethod) = 'cash' THEN total ELSE 0 END), 0) AS cashSales
             FROM \`${saleTable}\`
             WHERE DATE(createdAt) = ? AND status = 'completed'`,
            [dateStr]
        );
        totalSales = parseFloat(salesRows[0]?.totalSales || 0);
        cashSales  = parseFloat(salesRows[0]?.cashSales  || 0);
    }

    return { totalExpenses, totalSales, cashSales };
}

const BASE_SELECT = (t) => `
    SELECT id, date,
        opening_balance  AS openingBalance,
        total_expenses   AS totalExpenses,
        total_sales      AS totalSales,
        COALESCE(cash_sales, 0) AS cashSales,
        daily_cash       AS dailyCash,
        closing_balance  AS closingBalance,
        createdAt, updatedAt
    FROM \`${t}\`
`;

// ---------------------------------------------------------------------------
// GET /api/day-end
//   ?date=YYYY-MM-DD  → summary for that date (creates preview if not saved)
//   (no params)       → full history list
// ---------------------------------------------------------------------------
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');

    try {
        const p = getPool();
        const t = await ensureDayEndTable();

        if (!dateStr) {
            const [records] = await p.execute(`${BASE_SELECT(t)} ORDER BY date DESC`);
            return NextResponse.json({ records });
        }

        // Opening balance = previous day's closing balance
        const [prevRows] = await p.execute(
            `${BASE_SELECT(t)} WHERE date < ? ORDER BY date DESC LIMIT 1`,
            [dateStr]
        );
        const openingBalance = parseFloat(prevRows[0]?.closingBalance || 0);

        // Live totals from source tables
        const { totalExpenses, totalSales, cashSales } = await fetchLiveTotals(p, dateStr);

        // Expected cash in drawer = Opening + All Sales - Expenses
        const expectedClosing = parseFloat((openingBalance + totalSales - totalExpenses).toFixed(2));

        // Check for an already-saved record
        const [saved] = await p.execute(
            `${BASE_SELECT(t)} WHERE date = ? LIMIT 1`,
            [dateStr]
        );
        const existingRecord = saved?.[0];

        if (existingRecord) {
            const dailyCash = parseFloat(existingRecord.dailyCash || 0);
            return NextResponse.json({
                ...existingRecord,
                // Always show live-computed values so the user sees up-to-date figures
                openingBalance,
                totalExpenses,
                totalSales,
                cashSales,
                expectedClosing,
                variance: parseFloat((dailyCash - expectedClosing).toFixed(2)),
            });
        }

        // No saved record yet — return preview data
        return NextResponse.json({
            id: null,
            date: dateStr,
            openingBalance,
            totalExpenses,
            totalSales,
            cashSales,
            dailyCash: 0,
            closingBalance: 0,
            expectedClosing,
            variance: parseFloat((0 - expectedClosing).toFixed(2)),
        });
    } catch (error) {
        console.error('Error fetching day end data:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}

// ---------------------------------------------------------------------------
// POST /api/day-end
// Body: { date, openingBalance, totalExpenses, totalSales, cashSales, dailyCash }
// closingBalance is set to dailyCash so next day's opening = physical count.
// ---------------------------------------------------------------------------
export async function POST(request) {
    try {
        const body = await request.json();
        const {
            date,
            openingBalance,
            totalExpenses,
            totalSales,
            cashSales,
            dailyCash,
        } = body;

        // Physical cash count becomes the closing balance (next day's opening)
        const closingBalance = parseFloat(dailyCash) || 0;

        const p = getPool();
        const t = await ensureDayEndTable();

        await p.execute(
            `INSERT INTO \`${t}\`
                (date, opening_balance, total_expenses, total_sales, cash_sales, daily_cash, closing_balance, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE
                opening_balance = VALUES(opening_balance),
                total_expenses  = VALUES(total_expenses),
                total_sales     = VALUES(total_sales),
                cash_sales      = VALUES(cash_sales),
                daily_cash      = VALUES(daily_cash),
                closing_balance = VALUES(closing_balance),
                updatedAt       = NOW()`,
            [
                date,
                parseFloat(openingBalance) || 0,
                parseFloat(totalExpenses)  || 0,
                parseFloat(totalSales)     || 0,
                parseFloat(cashSales)      || 0,
                parseFloat(dailyCash)      || 0,
                closingBalance,
            ]
        );

        const [rows] = await p.execute(
            `${BASE_SELECT(t)} WHERE date = ? LIMIT 1`,
            [date]
        );

        return NextResponse.json(rows?.[0] || null);
    } catch (error) {
        console.error('Error saving day end:', error);
        return NextResponse.json({ error: 'Failed to save record' }, { status: 500 });
    }
}
