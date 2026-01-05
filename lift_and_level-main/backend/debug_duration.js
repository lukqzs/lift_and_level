
const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDuration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [cols] = await connection.query("SHOW COLUMNS FROM workouts LIKE 'duration'");
  console.log("Duration column exists?", cols.length > 0);
  console.log(cols);

  await connection.end();
}

checkDuration().catch(console.error);
