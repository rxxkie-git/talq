const io = require("socket.io-client");

async function test() {
  try {
    const res = await fetch("http://localhost:3000/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "testuser_" + Date.now(), password: "password123" })
    });
    const data = await res.json();
    console.log("Signup response:", data);

    if (data.token) {
      console.log("Got token:", data.token);
      const socket = io("http://localhost:3000", { auth: { token: data.token } });
      socket.on("connect", () => {
        console.log("Socket connected successfully");
        process.exit(0);
      });
      socket.on("connect_error", (err) => {
        console.error("Socket connect_error:", err.message);
        process.exit(1);
      });
    }
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
