
const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // 1. Check Users
    const [users] = await connection.query("SELECT id, name, email FROM users");
    console.log("=== USERS ===");
    console.log(JSON.stringify(users, null, 2));

    // 2. Check Workouts
    const [workouts] = await connection.query("SELECT * FROM workouts ORDER BY id DESC LIMIT 5");
    console.log("=== LATEST WORKOUTS ===");
    console.log(JSON.stringify(workouts, null, 2));

    // 3. Check View
    const [view] = await connection.query("SELECT * FROM exercises_view ORDER BY workout_date DESC LIMIT 5");
    console.log("=== EXERCISES VIEW (Top 5) ===");
    console.log(JSON.stringify(view, null, 2));

  } catch (e) {
    console.error("Error:", e.message);
  }

  await connection.end();
}

checkData();
