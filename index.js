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

// 🎯 Fixed range: July 10 – July 23 (2025)
function getFixedDateRange() {
  const start = new Date(Date.UTC(2025, 6, 10, 0, 0, 1)); // July 10, 2025 00:00:01 UTC
  const end = new Date(Date.UTC(2025, 6, 24, 23, 59, 59)); // July 23, 2025 23:59:59 UTC

  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  return { startStr, endStr };
}

function getDynamicApiUrl() {
  const { startStr, endStr } = getFixedDateRange();
  return `https://services.rainbet.com/v1/external/affiliates?start_at=${startStr}&end_at=${endStr}&key=${API_KEY}`;
}

async function fetchAndCacheData() {
  try {
    const response = await fetch(getDynamicApiUrl());
    const json = await response.json();
    if (!json.affiliates) throw new Error("No data");

    const combinedMap = new Map();

    // Add API data
    json.affiliates
      .filter(a => a.username.toLowerCase() !== "vampirenoob")
      .forEach(entry => {
        combinedMap.set(entry.username, parseFloat(entry.wagered_amount));
      });

    // Convert to array, sort, mask and format
    let combinedSorted = Array.from(combinedMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([username, wagered]) => ({
        username: maskUsername(username),
        wagered: Math.round(wagered),
        weightedWager: Math.round(wagered),
      }));

    // Swap 1st and 2nd
    if (combinedSorted.length >= 2) {
      [combinedSorted[0], combinedSorted[1]] = [combinedSorted[1], combinedSorted[0]];
    }

    cachedData = combinedSorted;
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
