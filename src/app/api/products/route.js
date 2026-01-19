import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Parse DATABASE_URL
const parseDatabaseUrl = (url) => {
    if (!url) throw new Error('DATABASE_URL not defined');
    const match = url.match(/mysql:\/\/([^:]+)(?::([^@]*))?@([^:]+):(\d+)\/(.+)/);
    if (!match) throw new Error('Invalid DATABASE_URL format');
    return {
        host: match[3],
        port: parseInt(match[4]),
        user: match[1],
        password: match[2] || '',
        database: match[5],
    };
};

let pool = null;
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

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || 'all';
        const vendor = searchParams.get('vendor') || 'all';
        const sortBy = searchParams.get('sortBy') || 'name';
        const limit = parseInt(searchParams.get('limit') || '2000');

        const pool = getPool();

        let query = `
      SELECT p.id, p.title, p.vendor, p.product_type, p.status, p.handle, p.updatedAt,
             p.original_price, p.sale_price, p.quantity, p.categoryId,
             c.name as categoryName,
             v.id as variant_id, v.title as variant_title, v.price, v.compare_at_price, 
             v.sku, v.barcode, v.inventory_quantity, v.weight, v.weight_unit
      FROM Product p
      LEFT JOIN ProductVariant v ON p.id = v.productId
      LEFT JOIN Category c ON p.categoryId = c.id
      WHERE 1=1
    `;
        const params = [];

        if (search) {
            query += ` AND (p.title LIKE ? OR p.vendor LIKE ? OR v.sku LIKE ? OR v.barcode LIKE ?)`;
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam, searchParam);
        }

        if (status !== 'all') {
            query += ` AND p.status = ?`;
            params.push(status);
        }

        if (vendor !== 'all') {
            query += ` AND p.vendor = ?`;
            params.push(vendor);
        }

        // Sorting logic - simplified for SQL
        switch (sortBy) {
            case 'name': query += ` ORDER BY p.title ASC`; break;
            case 'name-desc': query += ` ORDER BY p.title DESC`; break;
            case 'price-low': query += ` ORDER BY p.sale_price ASC`; break;
            case 'price-high': query += ` ORDER BY p.sale_price DESC`; break;
            case 'stock-low': query += ` ORDER BY v.inventory_quantity ASC`; break;
            case 'stock-high': query += ` ORDER BY v.inventory_quantity DESC`; break;
            default: query += ` ORDER BY p.updatedAt DESC`;
        }

        query += ` LIMIT ?`;
        params.push(limit);

        const [rows] = await pool.execute(query, params);

        // Group rows by product (since LEFT JOIN returns multiple rows for variants)
        const productMap = new Map();
        rows.forEach(row => {
            if (!productMap.has(row.id)) {
                productMap.set(row.id, {
                    id: row.id,
                    title: row.title,
                    vendor: row.vendor,
                    product_type: row.product_type,
                    status: row.status,
                    handle: row.handle,
                    sale_price: row.sale_price,
                    original_price: row.original_price,
                    quantity: row.quantity,
                    categoryId: row.categoryId,
                    categoryName: row.categoryName,
                    updatedAt: row.updatedAt,
                    variants: []
                });
            }

            if (row.variant_id) {
                productMap.get(row.id).variants.push({
                    id: row.variant_id,
                    title: row.variant_title,
                    price: row.price,
                    compare_at_price: row.compare_at_price,
                    sku: row.sku,
                    barcode: row.barcode,
                    inventory_quantity: row.inventory_quantity,
                    weight: row.weight,
                    weight_unit: row.weight_unit
                });
            }
        });

        return NextResponse.json({
            success: true,
            products: Array.from(productMap.values())
        });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
