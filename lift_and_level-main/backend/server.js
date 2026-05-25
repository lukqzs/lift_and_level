const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const mysql = require("mysql2/promise");

require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

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

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: "Email a heslo jsou povinné." });
  }

  try {
    const users = await query("SELECT * FROM users_v2 WHERE email = ? LIMIT 1", [email]);
    if (!users.length) {
      return res.status(404).json({
        message: "Uživatel s tímto e-mailem neexistuje. Prosím, zaregistrujte se.",
        code: "USER_NOT_FOUND"
      });
    }

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
    const workouts = await query(
      "SELECT id, workout_date, duration, total_xp FROM workouts_v2 WHERE user_id = ? ORDER BY workout_date DESC",
      [id]
    );

    if (workouts.length === 0) {
      return res.json([]);
    }

    const workoutIds = workouts.map(w => w.id);
    if (workoutIds.length > 0) {
      const placeholders = workoutIds.map(() => '?').join(',');
      const exercises = await query(
        `SELECT id, workout_id, name, sets, reps, weight_kg, xp FROM exercises_v2 WHERE workout_id IN (${placeholders}) ORDER BY id ASC`,
        workoutIds
      );

      const workoutsMap = {};
      workouts.forEach(w => {
        workoutsMap[w.id] = {
          id: w.id,
          date: new Date(w.workout_date).toISOString().slice(0, 10),
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

function calculateLevel(xp) {
  if (xp < 0) xp = 0;
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

function getRank(level) {
  if (level < 5) return "Začátečník";
  if (level < 10) return "Pokročilý";
  if (level < 20) return "Atlet";
  if (level < 30) return "Elita";
  if (level < 50) return "Mistr";
  return "Legenda";
}

app.post("/users/:id/workouts", auth, async (req, res) => {
  const { id } = req.params;
  if (Number(id) !== Number(req.userId)) return res.status(403).json({ message: "Forbidden" });

  console.log("POST /workouts Content-Type:", req.headers["content-type"]);
  const { items, duration, date, boostPercentage } = req.body || {};

  if (!items || !Array.isArray(items) || items.length === 0 || !date) {
    return res.status(400).json({ message: "items (array), date jsou povinné" });
  }

  let baseWorkoutXp = 0;
  items.forEach(item => {
    const vol = Number(item.sets) * Number(item.reps) * (Number(item.weight) || 1);
    const itemXp = Math.max(10, Math.ceil(vol / 10));
    item.xp = itemXp;
    baseWorkoutXp += itemXp;
  });

  const finalMult = 1 + (Number(boostPercentage) || 0) / 100;
  const workoutXp = Math.floor(baseWorkoutXp * finalMult);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [workoutResult] = await conn.execute(
      "INSERT INTO workouts_v2 (user_id, workout_date, total_xp, duration) VALUES (?, ?, ?, ?)",
      [id, date, workoutXp, duration || 0]
    );
    const workoutId = workoutResult.insertId;

    for (const item of items) {
      await conn.execute(
        "INSERT INTO exercises_v2 (workout_id, name, sets, reps, weight_kg, xp) VALUES (?, ?, ?, ?, ?, ?)",
        [workoutId, item.name, item.sets, item.reps, item.weight || 0, item.xp]
      );
    }

    const [users] = await conn.execute("SELECT xp FROM users_v2 WHERE id = ? FOR UPDATE", [id]);
    if (users.length > 0) {
      const currentXp = users[0].xp || 0;
      const newTotalXp = currentXp + workoutXp;
      const newLevel = calculateLevel(newTotalXp);
      const newRank = getRank(newLevel);

      await conn.execute(
        "UPDATE users_v2 SET xp = ?, level = ?, rank = ? WHERE id = ?",
        [newTotalXp, newLevel, newRank, id]
      );

      await conn.commit();

      res.status(201).json({
        id: workoutId,
        userId: Number(id),
        date,
        duration,
        xp: workoutXp,
        newUserStats: {
          level: newLevel,
          rank: newRank,
          totalXp: newTotalXp
        },
        items
      });
    } else {
      await conn.rollback();
      res.status(404).json({ message: "User not found" });
    }

  } catch (error) {
    await conn.rollback();
    console.error("POST workout error", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
});

app.get("/exercises", async (req, res) => {
  const q = req.query.q || "";

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

const FALLBACK_QUOTES = [
  { quote: "Tvoje jediné limity jsou ty, které si sám vytvoříš.", author: "Neznámý" },
  { quote: "Dnes udělej něco, za co ti tvé budoucí já poděkuje.", author: "Neznámý" },
  { quote: "Nezastavuj se, když jsi unavený. Zastav se, až když jsi hotový.", author: "David Goggins" }
];

app.get("/quotes/random", async (req, res) => {
  try {
    const response = await fetch("https://zenquotes.io/api/random");

    if (!response.ok) {
      throw new Error(`ZenQuotes returned ${response.status}`);
    }

    const data = await response.json();
    if (data && data.length > 0) {
      res.json({ quote: data[0].q, author: data[0].a });
    } else {
      throw new Error("No quotes returned");
    }
  } catch (error) {
    console.error("Error fetching quote from ZenQuotes:", error.message);
    const fallback = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
    res.json(fallback);
  }
});

app.post("/users/:id/add-xp", auth, async (req, res) => {
  const { id } = req.params;
  const { xp } = req.body;
  if (Number(id) !== Number(req.userId)) return res.status(403).json({ message: "Forbidden" });

  const conn = await pool.getConnection();
  try {
    const [users] = await conn.execute("SELECT xp FROM users_v2 WHERE id = ? FOR UPDATE", [id]);
    if (users.length > 0) {
      const newTotalXp = (users[0].xp || 0) + Number(xp || 0);
      const newLevel = calculateLevel(newTotalXp);
      const newRank = getRank(newLevel);

      await conn.execute("UPDATE users_v2 SET xp = ?, level = ?, rank = ? WHERE id = ?", [newTotalXp, newLevel, newRank, id]);
      res.json({ totalXp: newTotalXp, level: newLevel, rank: newRank });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (err) {
    console.error("POST /add-xp error", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Accessible on LAN at http://10.0.1.43:${PORT}`);
});