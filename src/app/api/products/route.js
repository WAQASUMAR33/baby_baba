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

let tableNamesCache = null;
async function getTableNames() {
    if (tableNamesCache) return tableNamesCache;
    const pool = getPool();
    const [rows] = await pool.query('SHOW TABLES');
    const tableList = rows.map((r) => Object.values(r)[0]);
    const resolve = (candidates) => {
        for (const name of candidates) {
            if (tableList.includes(name)) return name;
        }
        return candidates[0];
    };
    tableNamesCache = {
        product: resolve(['Product', 'product']),
        productvariant: resolve(['ProductVariant', 'productvariant']),
        category: resolve(['Category', 'category']),
    };
    return tableNamesCache;
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || 'all';
        const vendor = searchParams.get('vendor') || 'all';
        const sortBy = searchParams.get('sortBy') || 'name';
        const limitParam = searchParams.get('limit');
        const offsetParam = searchParams.get('offset');
        const parsedLimit = Number.parseInt(limitParam ?? '', 10);
        const parsedOffset = Number.parseInt(offsetParam ?? '', 10);
        const hasLimitParam = limitParam !== null;
        const isAll = limitParam === 'all';
        const applyLimit = hasLimitParam && (isAll || (Number.isFinite(parsedLimit) && parsedLimit > 0));
        const limit = isAll ? 1000 : parsedLimit;
        const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

        const pool = getPool();
        const { product, productvariant } = await getTableNames();

        const baseSelect = `
      SELECT p.id, p.title, p.vendor, p.product_type, p.status, p.handle, p.updatedAt,
             p.original_price, p.sale_price, p.quantity, p.categoryId,
             v.id as variant_id, v.title as variant_title, v.price, v.compare_at_price, 
             v.sku, v.barcode, v.inventory_quantity, v.weight, v.weight_unit
      FROM ${product} p
      LEFT JOIN ${productvariant} v ON p.id = v.productId
    `;
        const filterParams = [];
        const conditions = [];

        if (search) {
            conditions.push(`(p.title LIKE ? OR p.vendor LIKE ? OR v.sku LIKE ? OR v.barcode LIKE ?)`);
            const searchParam = `%${search}%`;
            filterParams.push(searchParam, searchParam, searchParam, searchParam);
        }

        if (status !== 'all') {
            conditions.push(`p.status = ?`);
            filterParams.push(status);
        }

        if (vendor !== 'all') {
            conditions.push(`p.vendor = ?`);
            filterParams.push(vendor);
        }

        const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

        const orderByClause = (() => {
            switch (sortBy) {
                case 'name': return ` ORDER BY p.title ASC`;
                case 'name-desc': return ` ORDER BY p.title DESC`;
                case 'price-low': return ` ORDER BY p.sale_price ASC`;
                case 'price-high': return ` ORDER BY p.sale_price DESC`;
                case 'stock-low': return ` ORDER BY v.inventory_quantity ASC`;
                case 'stock-high': return ` ORDER BY v.inventory_quantity DESC`;
                default: return ` ORDER BY p.updatedAt DESC`;
            }
        })();

        const idOrderByClause = (() => {
            switch (sortBy) {
                case 'name': return ` ORDER BY p.title ASC`;
                case 'name-desc': return ` ORDER BY p.title DESC`;
                case 'price-low': return ` ORDER BY p.sale_price ASC`;
                case 'price-high': return ` ORDER BY p.sale_price DESC`;
                case 'stock-low': return ` ORDER BY stock_total ASC`;
                case 'stock-high': return ` ORDER BY stock_total DESC`;
                default: return ` ORDER BY p.updatedAt DESC`;
            }
        })();

        let countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM ${product} p
      LEFT JOIN ${productvariant} v ON p.id = v.productId
    ${whereClause}`
        const [countRows] = await pool.execute(countQuery, filterParams)
        const total = countRows?.[0]?.total || 0

        let rows = [];
        if (applyLimit) {
            const idQuery = `
        SELECT p.id, SUM(COALESCE(v.inventory_quantity, 0)) as stock_total
        FROM ${product} p
        LEFT JOIN ${productvariant} v ON p.id = v.productId
        ${whereClause}
        GROUP BY p.id
        ${idOrderByClause}
        LIMIT ? OFFSET ?
      `;
            const [idRows] = await pool.execute(idQuery, [...filterParams, limit, offset]);
            const ids = idRows.map((row) => row.id);

            if (ids.length === 0) {
                return NextResponse.json({
                    success: true,
                    products: [],
                    total,
                    limit,
                    offset
                });
            }

            const placeholders = ids.map(() => '?').join(',');
            const detailQuery = `
        ${baseSelect}
        WHERE p.id IN (${placeholders})
        ORDER BY FIELD(p.id, ${placeholders})
      `;
            const [detailRows] = await pool.execute(detailQuery, [...ids, ...ids]);
            rows = detailRows;
        } else {
            const query = `${baseSelect}${whereClause}${orderByClause}`;
            const [detailRows] = await pool.execute(query, filterParams);
            rows = detailRows;
        }

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
            total,
            limit: applyLimit ? limit : null,
            offset: applyLimit ? offset : 0
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
        const { product, productvariant } = await getTableNames();

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
                `SELECT id FROM ${product} WHERE handle = ?`,
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
            `INSERT INTO ${product} (id, title, description, vendor, product_type, status, image, handle, 
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
            `INSERT INTO ${productvariant} (id, productId, title, price, compare_at_price, sku, barcode, 
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
