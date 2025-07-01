import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = "RFbd9u0KPbkp0MTcZ5Elm7kyO1CVvnH9";
const SELF_URL = "https://ecoraindata.onrender.com/leaderboard/top14";

let cachedData = [];

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

function maskUsername(username) {
  if (username.length <= 4) return username;
  return username.slice(0, 2) + "***" + username.slice(-2);
}

function getWeeklyDateRange() {
  const base = new Date(Date.UTC(2025, 6, 1, 0, 0, 0)); // July 1, 2025 (UTC)
  const now = new Date();
  const msInWeek = 7 * 24 * 60 * 60 * 1000;

  const weeksPassed = Math.floor((now.getTime() - base.getTime()) / msInWeek);
  const weekStart = new Date(base.getTime() + weeksPassed * msInWeek);
  const weekEnd = new Date(weekStart.getTime() + msInWeek - 1000); // 1 sec before next week

  const startStr = weekStart.toISOString().slice(0, 10);
  const endStr = weekEnd.toISOString().slice(0, 10);

  return { startStr, endStr };
}

function getDynamicApiUrl() {
  const { startStr, endStr } = getWeeklyDateRange();
  return `https://services.rainbet.com/v1/external/affiliates?start_at=${startStr}&end_at=${endStr}&key=${API_KEY}`;
}

async function fetchAndCacheData() {
  try {
    const response = await fetch(getDynamicApiUrl());
    const json = await response.json();
    if (!json.affiliates) throw new Error("No data");

    const sorted = json.affiliates
      .filter(a => a.username.toLowerCase() !== "vampirenoob")
      .sort((a, b) => parseFloat(b.wagered_amount) - parseFloat(a.wagered_amount))
      .slice(0, 10);

    const mapped = sorted.map(entry => ({
      username: maskUsername(entry.username),
      wagered: Math.round(parseFloat(entry.wagered_amount)),
      weightedWager: Math.round(parseFloat(entry.wagered_amount)),
    }));

    // Swap 1st and 2nd
    if (mapped.length >= 2) {
      [mapped[0], mapped[1]] = [mapped[1], mapped[0]];
    }

    cachedData = mapped;
    console.log(`[✅] Leaderboard updated`);
  } catch (err) {
    console.error("[❌] Failed to fetch Rainbet data:", err.message);
  }
}

fetchAndCacheData();
setInterval(fetchAndCacheData, 5 * 60 * 1000);

app.get("/leaderboard/top14", (req, res) => {
  res.json(cachedData);
});

setInterval(() => {
  fetch(SELF_URL)
    .then(() => console.log(`[🔁] Self-pinged ${SELF_URL}`))
    .catch((err) => console.error("[⚠️] Self-ping failed:", err.message));
}, 270000);

app.listen(PORT, () => console.log(`🚀 Running on port ${PORT}`));
