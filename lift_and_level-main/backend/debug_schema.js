
const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [t1] = await connection.query("DESCRIBE workouts");
  console.log("=== WORKOUTS TABLE ===");
  console.log(JSON.stringify(t1, null, 2));

  const [t2] = await connection.query("DESCRIBE exercises");
  console.log("=== EXERCISES TABLE ===");
  console.log(JSON.stringify(t2, null, 2));

  await connection.end();
}

check().catch(console.error);
