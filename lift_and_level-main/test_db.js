
const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'lift_and_level-main/backend/.env' });

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'Luk12luk',
      database: process.env.DB_NAME || 'liftandlevel'
    });
    console.log('Successfully connected to the database.');
    await connection.end();
  } catch (error) {
    console.error('Error connecting to the database:', error.message);
  }
}

testConnection();
