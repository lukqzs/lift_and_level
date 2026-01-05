
const fetch = require('node-fetch'); // Assuming node-fetch is available or using global fetch in newer node

// Using global fetch if available (Node 18+)
const myFetch = global.fetch ? global.fetch : require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function test() {
  try {
    console.log("1. Health Check");
    const health = await myFetch(`${BASE_URL}/health`).then(r => r.json());
    console.log("Health:", health);

    const email = `testuser_${Date.now()}@example.com`;
    const password = 'password123';
    const name = 'VerificationUser';

    console.log(`2. Login (should fail) - ${email}`);
    const loginFail = await myFetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginFailData = await loginFail.json();
    console.log("Login Fail Response:", loginFail.status, loginFailData.code); // Expected 404 USER_NOT_FOUND

    console.log("3. Register");
    const reg = await myFetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const regData = await reg.json();
    console.log("Register Response:", reg.status, regData.id ? "OK" : regData);

    if (!regData.token) throw new Error("No token from register");
    const token = regData.token;
    const userId = regData.id;

    console.log("4. Register again (should fail)");
    const regFail = await myFetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const regFailData = await regFail.json();
    console.log("Reg Fail Response:", regFail.status, regFailData.code); // Expected 409 USER_EXISTS

    console.log("5. Add Workout (with duration)");
    const workoutPayload = {
      date: "2026-05-20",
      duration: 3600, // 1 hour
      items: [
        { name: "Test Press", sets: 3, reps: 10, weight: 100 }
      ]
    };
    const addW = await myFetch(`${BASE_URL}/users/${userId}/workouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(workoutPayload)
    });
    const addWData = await addW.json();
    console.log("Add Workout Response:", addW.status, addWData.id ? "OK, ID: " + addWData.id : addWData);

    console.log("6. Get Workouts (verify structure)");
    const getW = await myFetch(`${BASE_URL}/users/${userId}/workouts`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const history = await getW.json();
    console.log("History Length:", history.length);
    if (history.length > 0) {
      const first = history[0];
      console.log("First Workout:");
      console.log("  Date:", first.date);
      console.log("  Duration:", first.duration); // Should be 3600
      console.log("  Items:", first.items ? first.items.length : "MISSING");
      if (first.items && first.items.length > 0) {
        console.log("  First Item:", first.items[0].name);
      }
    }

  } catch (e) {
    console.error("Test Error:", e);
  }
}

test();
