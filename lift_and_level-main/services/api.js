import Constants from "expo-constants";
import { Platform } from "react-native";

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }


  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:3000`; // Předpokládá backend na portu 3000
  }

  // Fallback pro Android emulátor
  return Platform.OS === 'android' ? "http://10.0.2.2:3000" : "http://localhost:3000";
};

const baseUrl = getBaseUrl();

// --- BACKEND COMMUNICATION FUNCTIONS ---
// This file contains all functions used by the application to send and retrieve data.

async function request(path, options = {}) {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Throw object with message/code if available
      const err = new Error(errorData.message || `Request failed with ${response.status}`);
      err.code = errorData.code;
      throw err;
    }

    return await response.json();
  } catch (error) {
    console.warn("API Error:", path, error.message);
    throw error; // Propagate error
  }
}

// --- FUNKCE PRO PŘIHLÁŠENÍ A REGISTRACI ---

export async function login(email, password) {
  const payload = { email, password };
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function register(name, email, password) {
  const payload = { name, email, password };
  const data = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function authGoogle(email, name, uid) {
  const payload = { email, name, uid };
  const data = await request("/auth/google", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

// --- FUNKCE PRO TRÉNINKY A UŽIVATELE ---

export async function fetchWorkouts(userId, token) {
  const data = await request(`/users/${userId}/workouts`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data || [];
}

export async function addWorkout(userId, workout, token) {
  const payload = { ...workout, userId };
  console.log("DEBUG: addWorkout payload ->", JSON.stringify(payload));
  const data = await request(`/users/${userId}/workouts`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data;
}

export async function addXp(userId, xp, token) {
  const payload = { xp };
  const data = await request(`/users/${userId}/add-xp`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data;
}

export async function fetchRandomQuote() {
  return await request("/quotes/random");
}

const EXERCISE_CATALOG = [
  // Hrudník (Chest)
  { id: 1, name: "Bench Press", muscles: ["chest", "triceps", "deltoids"] },
  { id: 2, name: "Tlaky s jednoručkami", muscles: ["chest", "triceps", "deltoids"] },
  { id: 3, name: "Kliky (Push-up)", muscles: ["chest", "triceps", "deltoids"] },
  { id: 4, name: "Rozpažování (Chest Fly)", muscles: ["chest"] },
  { id: 5, name: "Protisměrné kladky", muscles: ["chest"] },
  { id: 6, name: "Tlaky na šikmé lavici", muscles: ["chest", "triceps", "deltoids"] },
  { id: 7, name: "Dipy (Hrudník)", muscles: ["chest", "triceps", "deltoids"] },
  { id: 8, name: "Pec Deck", muscles: ["chest"] },

  // Záda (Back)
  { id: 20, name: "Mrtvý tah (Deadlift)", muscles: ["lower-back", "gluteal", "hamstring", "trapezius"] },
  { id: 21, name: "Shyby (Pull-up)", muscles: ["upper-back", "biceps", "forearm", "trapezius"] },
  { id: 22, name: "Přítahy činky v předklonu", muscles: ["upper-back", "biceps", "lower-back"] },
  { id: 23, name: "Stahování horní kladky", muscles: ["upper-back", "biceps"] },
  { id: 24, name: "Přítahy spodní kladky", muscles: ["upper-back", "biceps"] },
  { id: 25, name: "Shyby podhmatem (Chin-up)", muscles: ["upper-back", "biceps"] },
  { id: 26, name: "Veslování na trenažéru", muscles: ["upper-back", "biceps", "trapezius"] },
  { id: 27, name: "Přítahy jednoručky", muscles: ["upper-back", "biceps"] },

  // Nohy (Legs)
  { id: 40, name: "Dřep (Squat)", muscles: ["quadriceps", "gluteal", "calves", "hamstring"] },
  { id: 41, name: "Leg Press", muscles: ["quadriceps", "gluteal", "calves"] },
  { id: 42, name: "Výpady", muscles: ["quadriceps", "gluteal"] },
  { id: 43, name: "Předkopávání", muscles: ["quadriceps"] },
  { id: 44, name: "Zakopávání", muscles: ["hamstring"] },
  { id: 45, name: "Výpony na lýtka", muscles: ["calves"] },
  { id: 46, name: "Bulharské dřepy", muscles: ["quadriceps", "gluteal"] },
  { id: 47, name: "Rumunský mrtvý tah", muscles: ["hamstring", "gluteal", "lower-back"] },
  { id: 48, name: "Hip Thrust", muscles: ["gluteal", "hamstring"] },

  // Ramena (Shoulders)
  { id: 60, name: "Tlaky nad hlavu (Military Press)", muscles: ["deltoids", "triceps", "trapezius"] },
  { id: 61, name: "Tlaky s jednoručkami vsedě", muscles: ["deltoids", "triceps"] },
  { id: 62, name: "Upažování (Lateral Raise)", muscles: ["deltoids"] },
  { id: 63, name: "Předpažování", muscles: ["deltoids"] },
  { id: 64, name: "Zapažování (Rear Delt Fly)", muscles: ["deltoids", "upper-back"] },
  { id: 65, name: "Přítahy k bradě", muscles: ["deltoids", "trapezius"] },

  // Ruce (Arms)
  { id: 80, name: "Bicepsový zdvih", muscles: ["biceps", "forearm"] },
  { id: 81, name: "Kladivový zdvih (Hammer)", muscles: ["biceps", "forearm"] },
  { id: 82, name: "Biceps na Scottově lavici", muscles: ["biceps"] },
  { id: 83, name: "Francouzský tlak", muscles: ["triceps"] },
  { id: 84, name: "Tricepsové stahování kladky", muscles: ["triceps"] },
  { id: 85, name: "Tricepsové kliky vzadu", muscles: ["triceps", "chest"] },
  { id: 86, name: "Biceps s velkou činkou", muscles: ["biceps"] },

  // Břicho a střed těla
  { id: 100, name: "Zkracovačky", muscles: ["abs"] },
  { id: 101, name: "Sedy-lehy", muscles: ["abs"] },
  { id: 102, name: "Plank", muscles: ["abs", "obliques", "lower-back"] },
  { id: 103, name: "Zvedání nohou ve visu", muscles: ["abs"] },
  { id: 104, name: "Russian Twist", muscles: ["abs", "obliques"] },
  { id: 105, name: "Ab Wheel", muscles: ["abs", "lower-back"] }
];

export async function searchExercises(query = "") {
  if (!query) return EXERCISE_CATALOG;
  const q = query.toLowerCase();
  return EXERCISE_CATALOG.filter(item => item.name.toLowerCase().includes(q));
}
