
const mysql = require('mysql2/promise');
require('dotenv').config();

async function listTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'liftandlevel'
  });

  try {
    const [rows] = await connection.query("SHOW TABLES");
    console.log("Tables:", rows);
  } catch (error) {
    console.error("List tables failed:", error.message);
  } finally {
    await connection.end();
  }
}

listTables();
