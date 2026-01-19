const mysql = require('mysql2/promise');
require('dotenv').config();

async function createEmployeeTable() {
    let connection;
    try {
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            console.error('DATABASE_URL is not defined');
            return;
        }

        console.log('Connecting to database...');
        // Simple parsing for mysql2
        connection = await mysql.createConnection(dbUrl);
        console.log('Connected!');

        const sql = `
      CREATE TABLE IF NOT EXISTS Employee (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone_number VARCHAR(50) NOT NULL,
        city VARCHAR(100) NOT NULL,
        address TEXT NOT NULL,
        cnic VARCHAR(20),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

        await connection.execute(sql);
        console.log('✅ Employee table created or already exists');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

createEmployeeTable();
