const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTableStructure() {
    let connection;
    try {
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            console.error('DATABASE_URL is not defined');
            return;
        }

        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbUrl);
        console.log('Connected!');

        console.log('--- SaleItem Table Structure ---');
        const [rows] = await connection.execute('DESCRIBE SaleItem');
        console.table(rows);

        console.log('\n--- Sale Table Structure ---');
        const [saleRows] = await connection.execute('DESCRIBE Sale');
        console.table(saleRows);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

checkTableStructure();
