
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
    console.log("Checking if 'duration' column exists in 'workouts'...");
    const [columns] = await connection.query("SHOW COLUMNS FROM workouts LIKE 'duration'");

    if (columns.length === 0) {
      console.log("Adding 'duration' column...");
      await connection.query("ALTER TABLE workouts ADD COLUMN duration INT DEFAULT 0");
      console.log("Column 'duration' added successfully.");
    } else {
      console.log("Column 'duration' already exists.");
    }

  } catch (error) {
    console.error("Migration failed:", error.message);
  } finally {
    await connection.end();
  }
}

migrate();
