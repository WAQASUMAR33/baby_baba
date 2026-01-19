import mysql from 'mysql2/promise';
import 'dotenv/config';

async function checkColumns() {
    const url = process.env.DATABASE_URL;
    const match = url.match(/mysql:\/\/([^:]+)(?::([^@]*))?@([^:]+):(\d+)\/(.+)/);
    const config = {
        host: match[3],
        port: parseInt(match[4]),
        user: match[1],
        password: match[2] || '',
        database: match[5],
    };

    const connection = await mysql.createConnection(config);
    try {
        const [rows] = await connection.execute('DESCRIBE Product');
        console.log('Columns in Product table:');
        rows.forEach(row => console.log(` - ${row.Field} (${row.Type})`));

        const columns = rows.map(r => r.Field);
        if (!columns.includes('sale_price')) {
            console.log('Adding sale_price column...');
            await connection.execute('ALTER TABLE Product ADD COLUMN sale_price DECIMAL(10,2) DEFAULT 0');
        }
        if (!columns.includes('quantity')) {
            console.log('Adding quantity column...');
            await connection.execute('ALTER TABLE Product ADD COLUMN quantity INT DEFAULT 0');
        }
        if (!columns.includes('original_price')) {
            console.log('Adding original_price column...');
            await connection.execute('ALTER TABLE Product ADD COLUMN original_price DECIMAL(10,2) DEFAULT 0');
        }

        // Add commission to Sale
        const [saleCols] = await connection.execute('SHOW COLUMNS FROM Sale');
        const saleColNames = saleCols.map(c => c.Field);
        if (!saleColNames.includes('commission')) {
            console.log('Adding commission column to Sale...');
            await connection.execute('ALTER TABLE Sale ADD COLUMN commission DECIMAL(10,2) DEFAULT 0');
        }

        // Add commission to SaleItem
        const [saleItemCols] = await connection.execute('SHOW COLUMNS FROM SaleItem');
        const saleItemColNames = saleItemCols.map(c => c.Field);
        if (!saleItemColNames.includes('commission')) {
            console.log('Adding commission column to SaleItem...');
            await connection.execute('ALTER TABLE SaleItem ADD COLUMN commission DECIMAL(10,2) DEFAULT 0');
        }
        console.log('Done.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkColumns();
