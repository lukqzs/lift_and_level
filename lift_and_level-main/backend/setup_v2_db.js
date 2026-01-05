
const mysql = require('mysql2/promise');
require('dotenv').config();

async function setup() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'liftandlevel'
  });

  try {
    console.log("Creating 'workouts_v2'...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS workouts_v2 (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        workout_date DATETIME NOT NULL,
        total_xp INT DEFAULT 0,
        duration INT DEFAULT 0
      )
    `);
    console.log("Table 'workouts_v2' ready.");

    console.log("Updating 'exercises_view'...");
    // Need to know the exact definition of exercises to join.
    // Assuming exercises table has: id, workout_id, name, sets, reps, weight_kg, xp

    await connection.query(`
      CREATE OR REPLACE VIEW exercises_view AS
      SELECT 
        e.id, 
        e.workout_id, 
        w.user_id, 
        w.workout_date, 
        w.duration,
        e.name AS exercise, 
        e.sets, 
        e.reps, 
        e.weight_kg, 
        e.xp
      FROM exercises e
      JOIN workouts_v2 w ON e.workout_id = w.id
    `);
    console.log("View 'exercises_view' updated.");

  } catch (error) {
    console.error("Setup failed:", error.message);
  } finally {
    await connection.end();
  }
}

setup();
