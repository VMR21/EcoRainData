import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// 🧾 Keys & URLs
const API_KEY = "RFbd9u0KPbkp0MTcZ5Elm7kyO1CVvnH9";
const CLASH_API = "https://api.clash.gg/affiliates/detailed-summary/v2/2025-07-10";
const CLASH_AUTH = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicGFzcyIsInNjb3BlIjoiYWZmaWxpYXRlcyIsInVzZXJJZCI6NTk5OTg5OCwiaWF0IjoxNzUyMTQxMTU1LCJleHAiOjE5MDk5MjkxNTV9.OOp2OWP3Rb9iTiuZt1O0CFXIgfeTywu9A2gwyM73fHc";

const SELF_URL = "https://ecoraindata.onrender.com/leaderboard/top14";

// 🗃️ Cache containers
let rainData = [];
let clashData = [];

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

function maskUsername(username) {
  if (!username) return "Anonymous";
  if (username.length <= 4) return username;
  return username.slice(0, 2) + "***" + username.slice(-2);
}

// 🎯 Fixed range: July 11 – July 24 (inclusive)
function getFixedDateRange() {
  const start = new Date(Date.UTC(2025, 6, 10, 0, 0, 1)); // July 11
  const end = new Date(Date.UTC(2025, 6, 24, 23, 59, 59)); // July 24
  return {
    startStr: start.toISOString().slice(0, 10),
    endStr: end.toISOString().slice(0, 10),
  };
}

function getRainApiUrl() {
  const { startStr, endStr } = getFixedDateRange();
  return `https://services.rainbet.com/v1/external/affiliates?start_at=${startStr}&end_at=${endStr}&key=${API_KEY}`;
}

// 🚰 Rainbet
async function fetchRainbetData() {
  try {
    const res = await fetch(getRainApiUrl());
    const json = await res.json();

    const top = (json.affiliates || [])
      .filter(a => a.username.toLowerCase() !== "vampirenoob")
      .map(a => ({
        username: maskUsername(a.username),
        wagered: Math.round(parseFloat(a.wagered_amount)),
        weightedWager: Math.round(parseFloat(a.wagered_amount)),
      }))
      .sort((a, b) => b.wagered - a.wagered)
      .slice(0, 10);

    // swap 1st and 2nd
    if (top.length >= 2) [top[0], top[1]] = [top[1], top[0]];

    rainData = top;
    console.log("[✅] Rainbet data updated");
  } catch (err) {
    console.error("[❌] Failed to fetch Rainbet:", err.message);
  }
}

// 🚰 Clash
async function fetchClashData() {
  try {
    const res = await fetch(CLASH_API, {
      headers: { Authorization: CLASH_AUTH },
    });
    console.log("[Clash] Response status:", res.status);
    if (!res.ok) throw new Error(`Clash API error: ${res.status}`);

    const data = await res.json();
    const raw = Array.isArray(data) ? data : (data.referralSummaries || []);

    const top = raw
      .map(entry => {
        const name = entry.name?.trim() || "Unknown";
        const masked = maskUsername(name);
        const wagered = Math.floor((entry.wagered || 0) / 1000);       // gem cents to gems
        const weightedWager = Math.floor((entry.wagered || 0) / 100);  // gem cents to tenths

        return { username: masked, wagered, weightedWager };
      })
      .sort((a, b) => b.wagered - a.wagered)
      .slice(0, 10);

    if (top.length >= 2) [top[0], top[1]] = [top[1], top[0]];

    clashData = top;
    console.log("[✅] Clash data updated:", top);
  } catch (err) {
    console.error("[❌] Clash fetch error:", err.message);
  }
}



// 🔁 Main updater
async function updateAllData() {
  await Promise.all([fetchRainbetData(), fetchClashData()]);
}

updateAllData();
setInterval(updateAllData, 5 * 60 * 1000); // every 5 min

// 🛠️ Routes
app.get("/leaderboard/top14", (req, res) => {
  res.json(rainData);
});

app.get("/leaderboard/clash", (req, res) => {
  res.json(clashData);
});

// 🫀 Keep-alive ping
setInterval(() => {
  fetch(SELF_URL)
    .then(() => console.log(`[🔁] Self-pinged ${SELF_URL}`))
    .catch((err) => console.error("[⚠️] Self-ping failed:", err.message));
}, 270000);

// 🚀 Start
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
