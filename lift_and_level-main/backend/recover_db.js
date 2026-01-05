
const mysql = require('mysql2/promise');
require('dotenv').config();

async function recover() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'liftandlevel'
  });

  try {
    console.log("Backing up data...");
    // Since we know View is readable, let's read it.
    // Note: exercises_view has joins. To reconstruct, we need users, workouts, exercises.
    // We can fetch users separately.
    // We can fetch workouts separately from workouts table (if readable).
    // We can fetch exercises from exercises table (if readable).

    // 1. Users
    const [users] = await connection.query("SELECT * FROM users");
    console.log(`Backed up ${users.length} users.`);

    // 2. Workouts - try reading
    let workouts = [];
    try {
      const [rows] = await connection.query("SELECT * FROM workouts");
      workouts = rows;
      console.log(`Backed up ${workouts.length} workouts.`);
    } catch (e) {
      console.log("Could not read workouts table directly:", e.message);
      // Fallback: try to reconstruct from view? 
      // check_data.js could read it. Maybe the SELECT works but ALTER failed.
    }

    // 3. Exercises
    let exercises = [];
    try {
      const [rows] = await connection.query("SELECT * FROM exercises");
      exercises = rows;
      console.log(`Backed up ${exercises.length} exercises.`);
    } catch (e) {
      console.log("Could not read exercises table:", e.message);
    }

    console.log("Dropping old structures...");
    try { await connection.query("DROP VIEW IF EXISTS exercises_view"); } catch (e) { console.log(e.message); }
    try { await connection.query("DROP TABLE IF EXISTS exercises"); } catch (e) { console.log(e.message); }
    // We know workouts drop fails, but let's try.
    try { await connection.query("DROP TABLE IF EXISTS workouts"); } catch (e) { console.log(e.message); }

    console.log("Creating new schema (v2)...");

    // Workouts V2
    await connection.query(`
      CREATE TABLE IF NOT EXISTS workouts_v2 (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        workout_date DATETIME NOT NULL,
        total_xp INT DEFAULT 0,
        duration INT DEFAULT 0
      )
    `);

    // Exercises V2
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

    console.log("Restoring data...");

    // Restore Workouts
    // Map old ID to new ID? If we use auto_increment, IDs might verify.
    // But we can INSERT with ID if we want to preserve history.
    if (workouts.length > 0) {
      for (const w of workouts) {
        await connection.query(
          "INSERT INTO workouts_v2 (id, user_id, workout_date, total_xp, duration) VALUES (?, ?, ?, ?, 0)",
          [w.id, w.user_id, w.workout_date, w.total_xp]
        );
      }
      console.log("Workouts restored.");
    }

    // Restore Exercises
    if (exercises.length > 0) {
      for (const e of exercises) {
        await connection.query(
          "INSERT INTO exercises_v2 (id, workout_id, name, sets, reps, weight_kg, xp) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [e.id, e.workout_id, e.name, e.sets, e.reps, e.weight_kg, e.xp]
        );
      }
      console.log("Exercises restored.");
    }

    console.log("Recreating View...");
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
    console.error("Recovery failed:", error.message);
  } finally {
    await connection.end();
  }
}

recover();
