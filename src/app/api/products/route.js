import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Parse DATABASE_URL
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
        const limitParam = searchParams.get('limit');
        const parsedLimit = Number.parseInt(limitParam ?? '', 10);
        const applyLimit = limitParam !== 'all' && Number.isFinite(parsedLimit) && parsedLimit > 0;
        const limit = applyLimit ? parsedLimit : null;

        const pool = getPool();

        let query = `
      SELECT p.id, p.title, p.vendor, p.product_type, p.status, p.handle, p.updatedAt,
             p.original_price, p.sale_price, p.quantity, p.categoryId,
             c.name as categoryName,
             v.id as variant_id, v.title as variant_title, v.price, v.compare_at_price, 
             v.sku, v.barcode, v.inventory_quantity, v.weight, v.weight_unit
      FROM product p
      LEFT JOIN productvariant v ON p.id = v.productId
      LEFT JOIN category c ON p.categoryId = c.id
    `;
        const params = [];
        const conditions = [];

        if (search) {
            conditions.push(`(p.title LIKE ? OR p.vendor LIKE ? OR v.sku LIKE ? OR v.barcode LIKE ?)`);
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam, searchParam);
        }

        if (status !== 'all') {
            conditions.push(`p.status = ?`);
            params.push(status);
        }

        if (vendor !== 'all') {
            conditions.push(`p.vendor = ?`);
            params.push(vendor);
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`
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

        if (applyLimit) {
            query += ` LIMIT ${limit}`;
        }

        const [rows] = await pool.execute(query, params);

        let countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM product p
      LEFT JOIN productvariant v ON p.id = v.productId
      LEFT JOIN category c ON p.categoryId = c.id
    `
        if (conditions.length > 0) {
            countQuery += ` WHERE ${conditions.join(' AND ')}`
        }
        const [countRows] = await pool.execute(countQuery, params)
        const total = countRows?.[0]?.total || 0

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
            products: Array.from(productMap.values()),
            total
        });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const pool = getPool();

        // Validate required fields
        if (!body.title) {
            return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
        }

        // Generate a unique ID with timestamp and random string
        const productId = body.id || `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        // Generate handle from title
        const baseHandle = body.handle || body.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        // Check if handle already exists and make it unique if needed
        let handle = baseHandle;
        let handleExists = true;
        let counter = 1;

        while (handleExists) {
            const [existingProducts] = await pool.execute(
                'SELECT id FROM product WHERE handle = ?',
                [handle]
            );

            if (existingProducts.length === 0) {
                handleExists = false;
            } else {
                handle = `${baseHandle}-${counter}`;
                counter++;
            }
        }

        // Insert product
        await pool.execute(
            `INSERT INTO product (id, title, description, vendor, product_type, status, image, handle, 
             sale_price, original_price, cost_price, quantity, categoryId, createdAt, updatedAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                productId,
                body.title,
                body.description || null,
                body.vendor || null,
                body.productType || body.product_type || null,
                body.status || 'active',
                body.image || null,
                handle,
                parseFloat(body.salePrice || body.sale_price || body.price || 0),
                parseFloat(body.originalPrice || body.original_price || body.compare_at_price || 0),
                parseFloat(body.costPrice || body.cost_price || body.cost_per_item || 0),
                parseInt(body.quantity || body.inventory_quantity || 0),
                body.categoryId ? parseInt(body.categoryId) : null
            ]
        );

        // Insert variant (every product needs at least one variant)
        const variantId = body.variant_id || `${productId}-variant-1`;
        await pool.execute(
            `INSERT INTO productvariant (id, productId, title, price, compare_at_price, sku, barcode, 
             inventory_quantity, weight, weight_unit, createdAt, updatedAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                variantId,
                productId,
                body.variant_title || 'Default',
                parseFloat(body.salePrice || body.sale_price || body.price || 0),
                parseFloat(body.originalPrice || body.original_price || body.compare_at_price || 0),
                body.sku || null,
                body.barcode || null,
                parseInt(body.inventoryQuantity || body.quantity || body.inventory_quantity || 0),
                parseFloat(body.weight || 0),
                body.weightUnit || body.weight_unit || 'kg'
            ]
        );

        return NextResponse.json({
            success: true,
            product: {
                id: productId,
                title: body.title
            }
        }, { status: 201 });
    } catch (error) {
        console.error('❌ Error creating product:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
