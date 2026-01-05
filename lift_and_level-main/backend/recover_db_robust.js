
const mysql = require('mysql2/promise');
require('dotenv').config();

async function recover() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'liftandlevel'
  });

  async function safeRead(table) {
    try {
      const [rows] = await connection.query(`SELECT * FROM ${table}`);
      console.log(`Read ${rows.length} rows from ${table}`);
      return rows;
    } catch (e) {
      console.log(`Failed to read ${table}: ${e.message}`);
      return [];
    }
  }

  try {
    console.log("Starting robust recovery...");
    const users = await safeRead('users');
    const workouts = await safeRead('workouts');
    const exercises = await safeRead('exercises');

    // Create v2 tables
    console.log("Creating v2 tables...");

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users_v2 (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        xp INT DEFAULT 0,
        level INT DEFAULT 1,
        rank VARCHAR(50) DEFAULT 'Stickman'
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS workouts_v2 (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        workout_date DATETIME NOT NULL,
        total_xp INT DEFAULT 0,
        duration INT DEFAULT 0
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS exercises_v2 (
        id INT AUTO_INCREMENT PRIMARY KEY,
        workout_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        sets INT NOT NULL,
        reps INT NOT NULL,
        weight_kg DECIMAL(6,2) DEFAULT 0,
        xp INT DEFAULT 0
      )
    `);

    // Restore data
    console.log("Restoring data...");

    for (const u of users) {
      try {
        await connection.query(
          "INSERT IGNORE INTO users_v2 (id, name, email, password_hash, xp, level, rank) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [u.id, u.name, u.email, u.password_hash, u.xp, u.level, u.rank]
        );
      } catch (e) { console.log("User restore error:", e.message); }
    }

    for (const w of workouts) {
      try {
        await connection.query(
          "INSERT IGNORE INTO workouts_v2 (id, user_id, workout_date, total_xp, duration) VALUES (?, ?, ?, ?, 0)",
          [w.id, w.user_id, w.workout_date, w.total_xp]
        );
      } catch (e) { console.log("Workout restore error:", e.message); }
    }

    for (const e of exercises) {
      try {
        await connection.query(
          "INSERT IGNORE INTO exercises_v2 (id, workout_id, name, sets, reps, weight_kg, xp) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [e.id, e.workout_id, e.name, e.sets, e.reps, e.weight_kg, e.xp]
        );
      } catch (e) { console.log("Exercise restore error:", e.message); }
    }

    // View
    console.log("Updating view...");
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
      FROM exercises_v2 e
      JOIN workouts_v2 w ON e.workout_id = w.id
    `);

    console.log("Recovery complete.");

  } catch (error) {
    console.error("Fatal recovery error:", error.message);
  } finally {
    await connection.end();
  }
}

recover();
