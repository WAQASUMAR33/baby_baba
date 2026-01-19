
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
    const url = process.env.DATABASE_URL;
    try {
        const connection = await mysql.createConnection(url);
        console.log('CONNECTED');

        const [tables] = await connection.execute('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);
        console.log('TABLES: ' + tableNames.join(', '));

        const [users] = await connection.execute('SELECT COUNT(*) as count FROM User');
        console.log('USER_COUNT: ' + users[0].count);

        const [sample] = await connection.execute('SELECT id, email, role FROM User LIMIT 5');
        sample.forEach(u => {
            console.log(`USER: ${u.id} | ${u.email} | ${u.role}`);
        });

        await connection.end();
    } catch (error) {
        console.log('ERROR: ' + error.message);
    }
}

testConnection();
