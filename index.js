import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// 🧾 Rainbet API Info
const API_KEY = "RFbd9u0KPbkp0MTcZ5Elm7kyO1CVvnH9";
const SELF_URL = "https://ecoraindata.onrender.com/leaderboard/top14";

// 🗃️ Cache
let rainData = [];

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// 🛡️ Mask usernames
function maskUsername(username) {
  if (!username) return "Anonymous";
  if (username.length <= 4) return username;
  return username.slice(0, 2) + "***" + username.slice(-2);
}

// 🔗 Fixed API URL for July 19–26
function getRainApiUrl() {
  const startStr = "2025-07-19";
  const endStr = "2025-07-26";
  return `https://services.rainbet.com/v1/external/affiliates?start_at=${startStr}&end_at=${endStr}&key=${API_KEY}`;
}

// 🔄 Fetch Rainbet Data with fixed Juicy & Shin
async function fetchRainbetData() {
  try {
    const res = await fetch(getRainApiUrl());
    const json = await res.json();

    let entries = (json.affiliates || [])
      .filter(a => {
        const name = a.username.toLowerCase();
        return name !== "vampirenoob" && name !== "juicywhale" && name !== "shinrain";
      })
      .map(a => ({
        username: maskUsername(a.username),
        wagered: Math.round(parseFloat(a.wagered_amount)),
        weightedWager: Math.round(parseFloat(a.wagered_amount))
      }));

    // ✅ Add fixed JuicyWhale
    entries.push({
      username: maskUsername("JuicyWhale"),
      wagered: 26522,
      weightedWager: 26522
    });

    // ✅ Add fixed ShinRain
    entries.push({
      username: maskUsername("ShinRain"),
      wagered: 38317,
      weightedWager: 38317
    });

    const top = entries
      .sort((a, b) => b.wagered - a.wagered)
      .slice(0, 10);

    // 🔁 Swap top 2
    if (top.length >= 2) [top[0], top[1]] = [top[1], top[0]];

    rainData = top;
    console.log("[✅] Rainbet data updated (July 19–26)");
  } catch (err) {
    console.error("[❌] Failed to fetch Rainbet:", err.message);
  }
}

// 🔁 Update loop
async function updateAllData() {
  await fetchRainbetData();
}
updateAllData();
setInterval(updateAllData, 5 * 60 * 1000); // every 5 minutes

// 🛠️ API route
app.get("/leaderboard/top14", (req, res) => {
  res.json(rainData);
});

// 🫀 Self-ping for Render
setInterval(() => {
  fetch(SELF_URL)
    .then(() => console.log(`[🔁] Self-pinged ${SELF_URL}`))
    .catch((err) => console.error("[⚠️] Self-ping failed:", err.message));
}, 270000);

// 🚀 Start server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
