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
    const start = new Date(Date.UTC(2025, 6, 18, 11, 0, 0)); // July 18, 11:00 UTC
    const end = new Date(Date.UTC(2025, 6, 18, 23, 59, 59)); // July 18, 23:59:59 UTC

    let entries = (json.affiliates || [])
      .filter(a => {
        const name = a.username.toLowerCase();
        return name !== "vampirenoob" && name !== "juicywhale";
      })
      .map(a => ({
        username: maskUsername(a.username),
        wagered: Math.round(parseFloat(a.wagered_amount)),
        weightedWager: Math.round(parseFloat(a.wagered_amount))
      }));

    // 📈 Simulate JuicyWhale growth with breaks
    if (now >= start && now <= end) {
      const progress = (now - start) / (end - start);
      const rawWager = 42993;

      // Simulate natural breaks
      let adjusted = progress;
      if (progress < 0.2) {
        adjusted *= 0.5; // slow start
      } else if (progress > 0.4 && progress < 0.5) {
        adjusted *= 0.6; // slow patch
      } else if (progress > 0.7 && progress < 0.75) {
        adjusted *= 0.8; // another pause
      } else if (progress > 0.9) {
        adjusted *= 1.05; // little rush at the end
      }

      const juicyWager = Math.floor(Math.min(rawWager, rawWager * adjusted));

      entries.push({
        username: maskUsername("JuicyWhale"),
        wagered: juicyWager,
        weightedWager: juicyWager
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
