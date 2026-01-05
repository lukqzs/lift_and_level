
async function testPost() {
  try {


    console.log("Registering temp user...");
    const regRes = await fetch("http://localhost:3000/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "TestBot",
        email: "testbot" + Date.now() + "@example.com",
        password: "password123"
      })
    });

    const regData = await regRes.json();
    console.log("Register response:", regRes.status, regData);

    if (!regRes.ok) return;

    const { id, token } = regData;

    console.log("Adding workout...");
    const workRes = await fetch(`http://localhost:3000/users/${id}/workouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        exercise: "Debug Press",
        sets: 3,
        reps: 10,
        weight: 100,
        date: "2026-01-05"
      })
    });

    const workData = await workRes.json();
    console.log("Workout response:", workRes.status, workData);

  } catch (err) {
    console.error("Test failed:", err);
  }
}

testPost();
