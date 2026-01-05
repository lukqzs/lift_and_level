const mysql = require('mysql2/promise');
require('dotenv').config();

const exercisesList = [
  "Bench Press", "Squat", "Deadlift", "Overhead Press", "Barbell Row",
  "Pull Up", "Chin Up", "Push Up", "Dips",
  "Incline Bench Press", "Dumbbell Press", "Dumbbell Fly",
  "Lat Pulldown", "Seated Row", "Face Pull",
  "Bicep Curl", "Hammer Curl", "Tricep Extension", "Skullcrusher",
  "Leg Press", "Leg Extension", "Leg Curl", "Calf Raise",
  "Bulgarian Split Squat", "Lunge",
  "Plank", "Crunch", "Russian Twist", "Leg Raise"
];

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'liftandlevel'
  });

  try {
    console.log("Connected. Updating schema...");


    await connection.query(`
      CREATE TABLE IF NOT EXISTS exercise_library (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        category VARCHAR(50) DEFAULT 'General'
      )
    `);
    console.log("Created exercise_library table.");


    for (const ex of exercisesList) {
      await connection.query(`
        INSERT IGNORE INTO exercise_library (name) VALUES (?)
      `, [ex]);
    }
    console.log("Populated exercise_library.");


    const [cols] = await connection.query(`SHOW COLUMNS FROM workouts LIKE 'duration'`);
    if (cols.length === 0) {
      await connection.query(`ALTER TABLE workouts ADD COLUMN duration INT DEFAULT 0`);
      console.log("Added 'duration' column to workouts.");
    }

    console.log("Migration complete!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await connection.end();
  }
}

migrate();
