
const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'liftandlevel'
  });

  try {
    console.log("Dropping table 'workouts'...");
    try {
      await connection.query("DROP TABLE IF EXISTS workouts");
    } catch (e) {
      console.log("Drop failed (might be ok):", e.message);
    }

    console.log("Creating table 'workouts' with duration...");
    await connection.query(`
      CREATE TABLE workouts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        workout_date DATETIME NOT NULL,
        total_xp INT DEFAULT 0,
        duration INT DEFAULT 0
      )
    `);
    console.log("Table 'workouts' created successfully.");

  } catch (error) {
    console.error("Fix failed:", error.message);
  } finally {
    await connection.end();
  }
}

fixTable();
