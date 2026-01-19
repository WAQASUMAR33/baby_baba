
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error('DATABASE_URL is not defined');
        process.exit(1);
    }

    console.log('Testing connection to:', url.split('@')[1]);

    try {
        const connection = await mysql.createConnection(url);
        console.log('✅ Connected to database');

        const [tables] = await connection.execute('SHOW TABLES');
        console.log('Tables in database:', tables.map(t => Object.values(t)[0]));

        const [users] = await connection.execute('SELECT COUNT(*) as count FROM User');
        console.log('Total users in User table:', users[0].count);

        const [sampleEmployees] = await connection.execute('SELECT id, email, role FROM User LIMIT 5');
        console.log('Sample users:', sampleEmployees);

        await connection.end();
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
    }
}

testConnection();
