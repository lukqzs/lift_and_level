
const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'liftandlevel'
  });

  try {
    console.log("Attempting to add 'duration' column...");
    await connection.query("ALTER TABLE workouts ADD COLUMN duration INT DEFAULT 0");
    console.log("Success: Column 'duration' added.");
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log("Info: Column 'duration' already exists.");
    } else {
      console.error("Migration failed:", error.message);
    }
  } finally {
    await connection.end();
  }
}

migrate();
