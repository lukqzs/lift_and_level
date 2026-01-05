const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const mysql = require("mysql2/promise");

require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

const {
  DB_HOST = "localhost",
  DB_USER = "root",
  DB_PASSWORD = "",
  DB_NAME = "liftandlevel",
  JWT_SECRET = "dev-secret-change-me",
  PORT = 3000,
} = process.env;

const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// Auth Middleware
function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const [, token] = header.split(" ");
  if (!token) return res.status(401).json({ message: "Chybí token" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Neplatný token" });
  }
}

// --- Routes ---

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: "Email a heslo jsou povinné." });
  }

  try {
    // 1. Check if user exists
    const users = await query("SELECT * FROM users_v2 WHERE email = ? LIMIT 1", [email]);
    if (!users.length) {
      // REQUIREMENT: Specific message "user needs to register"
      return res.status(404).json({
        message: "Uživatel s tímto e-mailem neexistuje. Prosím, zaregistrujte se.",
        code: "USER_NOT_FOUND"
      });
    }

    // 2. Check password
    const user = users[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: "Neplatné heslo. Zkuste to znovu.", code: "INVALID_CREDENTIALS" });
    }

    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "7d" });

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      xp: user.xp,
      level: user.level,
      rank: user.rank,
      token,
    });
  } catch (error) {
    console.error("/auth/login error", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/auth/register", async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Jméno, email a heslo jsou povinné." });
  }

  try {
    const existing = await query("SELECT id FROM users_v2 WHERE email = ? LIMIT 1", [email]);
    if (existing.length) {
      // REQUIREMENT: "User already exists, please login"
      return res.status(409).json({
        message: "Účet s tímto e-mailem už existuje. Prosím, přihlašte se.",
        code: "USER_EXISTS"
      });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      "INSERT INTO users_v2 (name, email, password_hash, xp, level, rank) VALUES (?, ?, ?, 0, 1, 'Stickman')",
      [name, email, hash]
    );

    const userId = result.insertId;
    const token = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      id: userId,
      name,
      email,
      xp: 0,
      level: 1,
      rank: "Stickman",
      token,
    });
  } catch (error) {
    console.error("/auth/register error", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/users/:id/workouts", auth, async (req, res) => {
  const { id } = req.params;
  if (Number(id) !== Number(req.userId)) return res.status(403).json({ message: "Forbidden" });

  try {
    // Return structured workouts: [ { id, date, duration, total_xp, items: [ { name, sets, reps... } ] } ]

    // 1. Get workouts
    const workouts = await query(
      "SELECT id, workout_date, duration, total_xp FROM workouts_v2 WHERE user_id = ? ORDER BY workout_date DESC",
      [id]
    );

    if (workouts.length === 0) {
      return res.json([]);
    }

    // 2. Get exercises for these workouts
    // Using simple approach: fetch all exercises for these workout IDs
    const workoutIds = workouts.map(w => w.id);
    if (workoutIds.length > 0) {
      // Create safe placeholder string (?, ?, ?)
      const placeholders = workoutIds.map(() => '?').join(',');
      const exercises = await query(
        `SELECT id, workout_id, name, sets, reps, weight_kg, xp FROM exercises_v2 WHERE workout_id IN (${placeholders}) ORDER BY id ASC`,
        workoutIds
      );

      // 3. Group
      const workoutsMap = {};
      workouts.forEach(w => {
        workoutsMap[w.id] = {
          id: w.id,
          date: new Date(w.workout_date).toISOString().slice(0, 10), // Format YYYY-MM-DD
          duration: w.duration,
          xp: w.total_xp,
          items: []
        };
      });

      exercises.forEach(e => {
        if (workoutsMap[e.workout_id]) {
          workoutsMap[e.workout_id].items.push({
            id: e.id,
            name: e.name,
            sets: e.sets,
            reps: e.reps,
            weight: Number(e.weight_kg),
            xp: e.xp
          });
        }
      });

      // Convert map back to list (sorted by date desc as originally queried)
      const result = workouts.map(w => workoutsMap[w.id]);
      res.json(result);
    } else {
      res.json([]);
    }

  } catch (error) {
    console.error("GET workouts error", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/users/:id/workouts", auth, async (req, res) => {
  const { id } = req.params;
  if (Number(id) !== Number(req.userId)) return res.status(403).json({ message: "Forbidden" });

  console.log("POST /workouts Content-Type:", req.headers["content-type"]);
  console.log("POST /workouts body:", JSON.stringify(req.body));
  const { items, duration, date } = req.body || {};

  if (!items || !Array.isArray(items) || items.length === 0 || !date) {
    return res.status(400).json({ message: "items (array), date jsou povinné" });
  }

  // Calculate total XP
  let totalXp = 0;
  items.forEach(item => {
    // item: { name, sets, reps, weight }
    const vol = Number(item.sets) * Number(item.reps) * (Number(item.weight) || 1);
    const itemXp = Math.max(10, Math.ceil(vol / 10));
    item.xp = itemXp; // Add xp to item for saving
    totalXp += itemXp;
  });

  // Calculate duration XP bonus? (Optional, user didn't ask, but good practice). Let's stick to simple volume XP for now.

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [workoutResult] = await conn.execute(
      "INSERT INTO workouts_v2 (user_id, workout_date, total_xp, duration) VALUES (?, ?, ?, ?)",
      [id, date, totalXp, duration || 0]
    );

    const workoutId = workoutResult.insertId;

    for (const item of items) {
      await conn.execute(
        "INSERT INTO exercises_v2 (workout_id, name, sets, reps, weight_kg, xp) VALUES (?, ?, ?, ?, ?, ?)",
        [workoutId, item.name, item.sets, item.reps, item.weight || 0, item.xp]
      );
    }

    await conn.execute("UPDATE users_v2 SET xp = xp + ? WHERE id = ?", [totalXp, id]);

    await conn.commit();

    res.status(201).json({
      id: workoutId,
      userId: Number(id),
      date,
      duration,
      xp: totalXp,
      items
    });
  } catch (error) {
    await conn.rollback();
    console.error("POST workout error", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
});

// Search exercises (Public)
app.get("/exercises", async (req, res) => {
  const q = req.query.q || "";
  // We can just return hardcoded list or search in saved exercises?
  // User requirement: "vybírat z databáze cviků"
  // Let's keep the hardcoded catalog for now or distinct from DB.
  // The DB only stores history.
  // Let's use the static catalog + maybe any custom names found in DB? 
  // For simplicity and speed, let's keep the static list but extended.

  const catalog = [
    { id: 1, name: "Bench Press" },
    { id: 2, name: "Squat" },
    { id: 3, name: "Deadlift" },
    { id: 4, name: "Overhead Press" },
    { id: 5, name: "Pull Up" },
    { id: 6, name: "Dumbbell Curl" },
    { id: 7, name: "Tricep Extension" },
    { id: 8, name: "Leg Press" },
    { id: 9, name: "Lat Pulldown" },
    { id: 10, name: "Push Up" },
  ];

  if (!q) return res.json(catalog);
  const lower = q.toLowerCase();
  const filtered = catalog.filter(c => c.name.toLowerCase().includes(lower));
  return res.json(filtered);
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Accessible on LAN at http://10.0.1.43:${PORT}`);
});