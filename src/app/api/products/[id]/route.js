import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Reuse the parseDatabaseUrl function or import it if possible (defined in route.js)
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

export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const pool = getPool();

        const [rows] = await pool.execute(
            `SELECT p.id, p.title, p.description, p.vendor, p.product_type, p.status, p.image, p.handle, 
                    p.sale_price, p.original_price, p.quantity, p.updatedAt,
                    v.id as variant_id, v.title as variant_title, v.price, v.compare_at_price, 
                    v.sku, v.barcode, v.inventory_quantity, v.weight, v.weight_unit
             FROM Product p
             LEFT JOIN ProductVariant v ON p.id = v.productId
             WHERE p.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
        }

        // Grouping
        const product = {
            id: rows[0].id,
            title: rows[0].title,
            description: rows[0].description,
            vendor: rows[0].vendor,
            product_type: rows[0].product_type,
            status: rows[0].status,
            image: { src: rows[0].image },
            handle: rows[0].handle,
            sale_price: rows[0].sale_price,
            original_price: rows[0].original_price,
            quantity: rows[0].quantity,
            updatedAt: rows[0].updatedAt,
            variants: []
        };

        rows.forEach(row => {
            if (row.variant_id) {
                product.variants.push({
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

        return NextResponse.json({ success: true, product });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    try {
        const { id } = await params;
        const data = await request.json();
        const pool = getPool();

        // Update product table
        const updateFields = [];
        const updateValues = [];

        if (data.title !== undefined) { updateFields.push('title = ?'); updateValues.push(data.title); }
        if (data.vendor !== undefined) { updateFields.push('vendor = ?'); updateValues.push(data.vendor); }
        if (data.status !== undefined) { updateFields.push('status = ?'); updateValues.push(data.status); }
        if (data.original_price !== undefined) { updateFields.push('original_price = ?'); updateValues.push(data.original_price); }
        if (data.sale_price !== undefined) { updateFields.push('sale_price = ?'); updateValues.push(data.sale_price); }
        if (data.quantity !== undefined) { updateFields.push('quantity = ?'); updateValues.push(data.quantity); }

        if (updateFields.length > 0) {
            updateValues.push(id);
            await pool.execute(
                `UPDATE Product SET ${updateFields.join(', ')}, updatedAt = NOW() WHERE id = ?`,
                updateValues
            );
        }

        // Update variant if barcode changed (we assume only 1 variant for simplicity in this detail view for now)
        if (data.barcode !== undefined) {
            await pool.execute(
                `UPDATE ProductVariant SET barcode = ?, updatedAt = NOW() WHERE productId = ?`,
                [data.barcode, id]
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        const pool = getPool();

        // Delete variants first due to foreign key
        await pool.execute('DELETE FROM ProductVariant WHERE productId = ?', [id]);
        await pool.execute('DELETE FROM Product WHERE id = ?', [id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
