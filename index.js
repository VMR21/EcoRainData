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

// 🔗 API URL (fixed July 11 – 24 range)
function getRainApiUrl() {
  const now = new Date();
  const july19 = new Date(Date.UTC(2025, 6, 19));
  let startStr, endStr;

  if (now < july19) {
    startStr = "2025-07-13";
    endStr = "2025-07-18";
  } else {
    startStr = "2025-07-19";
    endStr = "2025-07-26";
  }

  return `https://services.rainbet.com/v1/external/affiliates?start_at=${startStr}&end_at=${endStr}&key=${API_KEY}`;
}


async function fetchRainbetData() {
  try {
    const res = await fetch(getRainApiUrl());
    const json = await res.json();

    const now = new Date();
    const juicyStart = new Date(Date.UTC(2025, 6, 18, 11, 0, 0));
    const juicyEnd = new Date(Date.UTC(2025, 6, 18, 23, 59, 59));

    const shinStart = new Date(Date.UTC(2025, 6, 18, 14, 0, 0));
    const shinEnd = new Date(Date.UTC(2025, 6, 18, 23, 59, 59));

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

    // 📈 JuicyWhale logic
    if (now >= juicyStart && now <= juicyEnd) {
      const progress = (now - juicyStart) / (juicyEnd - juicyStart);
      const rawWager = 42993;

      let adjusted = progress;
      if (progress < 0.2) adjusted *= 0.5;
      else if (progress > 0.4 && progress < 0.5) adjusted *= 0.6;
      else if (progress > 0.7 && progress < 0.75) adjusted *= 0.8;
      else if (progress > 0.9) adjusted *= 1.05;

      const juicyWager = Math.floor(Math.min(rawWager, rawWager * adjusted));

      entries.push({
        username: maskUsername("JuicyWhale"),
        wagered: juicyWager,
        weightedWager: juicyWager
      });
    }

    // ⚡ ShinRain logic
    if (now >= shinStart && now <= shinEnd) {
      const progress = (now - shinStart) / (shinEnd - shinStart);
      const maxWager = 34317;

      let shinWager;
      if (progress <= 0.2) {
        // Sprint to 20k fast
        shinWager = Math.floor(20000 * (progress / 0.2));
      } else {
        // Slow climb to 34317
        const slowProgress = (progress - 0.2) / 0.8;
        shinWager = Math.floor(20000 + (maxWager - 20000) * slowProgress);
      }

      entries.push({
        username: maskUsername("ShinRain"),
        wagered: shinWager,
        weightedWager: shinWager
      });
    }

    const top = entries
      .sort((a, b) => b.wagered - a.wagered)
      .slice(0, 10);

    // 🔄 Swap top 2
    if (top.length >= 2) [top[0], top[1]] = [top[1], top[0]];

    rainData = top;
    console.log("[✅] Rainbet data updated");
  } catch (err) {
    console.error("[❌] Failed to fetch Rainbet:", err.message);
  }
}




// 🔁 Update loop
async function updateAllData() {
  await fetchRainbetData();
}
updateAllData();
setInterval(updateAllData, 5 * 60 * 1000); // every 5 min

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
