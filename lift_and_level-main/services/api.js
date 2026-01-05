
const BACKEND_IP = "10.0.1.43";
const baseUrl = process.env.EXPO_PUBLIC_API_URL || `http://${BACKEND_IP}:3000`;

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

export async function searchExercises(query = "") {
  const data = await request(`/exercises?q=${encodeURIComponent(query)}`);
  if (data && Array.isArray(data)) return data;


  const catalog = [
    { id: 1, name: "Bench Press" },
    { id: 2, name: "Squat" },
    { id: 3, name: "Deadlift" },
    { id: 4, name: "Overhead Press" },
    { id: 5, name: "Pull Up" },
  ];
  if (!query) return catalog;
  const q = query.toLowerCase();
  return catalog.filter((item) => item.name.toLowerCase().includes(q));
}
