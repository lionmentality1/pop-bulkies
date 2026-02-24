const SUPABASE_URL = "https://ritsacedputqjzpxnkkv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_FIc50Vksc366FeV2Yk0Kpw_ExqKzjx0";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let score = 0;
let timeLeft = 60;
let gameInterval = null;
let timerInterval = null;
let isPlaying = false;
let lastHole = -1;
let highScore = localStorage.getItem("popTheBulkiesHighScore") || 0;
let activeHoles = new Set();
let lastScore = 0;

const scoreDisplay = document.getElementById("score");
const timeDisplay = document.getElementById("time");
const highScoreDisplay = document.getElementById("highscore");
const startBtn = document.getElementById("startBtn");
const messageDisplay = document.getElementById("message");
const hammer = document.getElementById("hammer");
const holes = document.querySelectorAll(".hole");
const creatures = document.querySelectorAll(".creature");

const lbListEl = document.getElementById("lbList");
const lbNameEl = document.getElementById("lbName");
const lbSaveBtn = document.getElementById("lbSaveBtn");
const lbHint = document.getElementById("lbHint");
const lbRankLineEl = document.getElementById("lbRankLine");

const creatureTypes = {
  good: ["good.png"],
  bad: ["cobie.png"],
};

highScoreDisplay.textContent = highScore;

document.addEventListener("mousemove", (e) => {
  hammer.style.left = e.clientX + "px";
  hammer.style.top = e.clientY + "px";
});

document.addEventListener("mousedown", () => hammer.classList.add("hit"));
document.addEventListener("mouseup", () => hammer.classList.remove("hit"));

document.addEventListener("contextmenu", (e) => e.preventDefault());

function sanitizeName(name) {
  return (name || "").trim().replace(/\s+/g, " ").slice(0, 16);
}

function getRandomTime(min, max) {
  return Math.random() * (max - min) + min;
}

function getRandomHole() {
  const availableHoles = [];
  for (let i = 0; i < 9; i++) {
    if (!activeHoles.has(i) && i !== lastHole) {
      availableHoles.push(i);
    }
  }
  if (availableHoles.length === 0) return -1;

  const hole = availableHoles[Math.floor(Math.random() * availableHoles.length)];
  lastHole = hole;
  activeHoles.add(hole);
  return hole;
}

function getRandomCreature() {
  const isGood = Math.random() > 0.3;
  const type = isGood ? "good" : "bad";
  const assets = creatureTypes[type];
  const image = assets[Math.floor(Math.random() * assets.length)];
  return { type, image };
}

function showMessage(text, type = "") {
  messageDisplay.textContent = text;
  messageDisplay.className = "message visible";
  if (type) messageDisplay.classList.add(type);
}

function showPointsPopup(hole, text, type) {
  const popup = document.createElement("div");
  popup.className = `points-popup ${type}`;
  popup.textContent = text;

  const rect = hole.getBoundingClientRect();
  popup.style.left = rect.left + rect.width / 2 + "px";
  popup.style.top = rect.top + "px";
  popup.style.position = "fixed";

  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 1000);
}

function showSingleCreature() {
  const holeIndex = getRandomHole();
  if (holeIndex === -1) return;

  const creature = creatures[holeIndex];
  const { type, image } = getRandomCreature();

  creature.className = "creature";
  creature.classList.add(type);
  creature.style.backgroundImage = `url('assets/${image}')`;
  creature.dataset.type = type;
  creature.dataset.hit = "false";
  creature.dataset.holeIndex = String(holeIndex);

  creature.classList.add("show");

  const visibleTime = Math.max(800, 1500 - score * 1.2);

  setTimeout(() => {
    if (creature.dataset.hit === "false") {
      creature.classList.remove("show");
      activeHoles.delete(holeIndex);
    }
  }, visibleTime);
}

function showCreature() {
  if (!isPlaying) return;

  const simultaneousCount = Math.min(3, 1 + Math.floor(score / 200));
  for (let i = 0; i < simultaneousCount; i++) showSingleCreature();

  if (isPlaying) {
    const baseTime = Math.max(400, 800 - score * 0.8);
    const nextTime = getRandomTime(baseTime, baseTime + 400);
    gameInterval = setTimeout(showCreature, nextTime);
  }
}

creatures.forEach((creature, index) => {
  creature.addEventListener("click", () => {
    if (!isPlaying) return;
    if (creature.dataset.hit === "true") return;
    if (!creature.classList.contains("show")) return;

    creature.dataset.hit = "true";
    const type = creature.dataset.type;
    const hole = holes[index];

    if (type === "good") {
      score += 10;
      showMessage("+10 points!", "positive");
      showPointsPopup(hole, "+10", "positive");
      creature.classList.add("hit");
    } else {
      score = Math.max(0, score - 15);
      timeLeft = Math.max(0, timeLeft - 3);
      showMessage("Ouch! -15 points and -3 sec!", "negative");
      showPointsPopup(hole, "-15", "negative");
      creature.classList.add("bad-hit");

      document.body.classList.add("screen-shake");
      setTimeout(() => document.body.classList.remove("screen-shake"), 300);
    }

    scoreDisplay.textContent = String(score);
    timeDisplay.textContent = String(timeLeft);

    setTimeout(() => {
      creature.classList.remove("show", "hit", "bad-hit");
      activeHoles.delete(index);
    }, 300);
  });
});

function updateTimer() {
  timeLeft--;
  timeDisplay.textContent = String(timeLeft);
  if (timeLeft <= 0) endGame();
}

function startGame() {
  score = 0;
  timeLeft = 60;
  isPlaying = true;
  lastHole = -1;
  activeHoles.clear();

  scoreDisplay.textContent = "0";
  timeDisplay.textContent = "60";
  startBtn.classList.add("hidden");
  showMessage("Hit the Bulkies! Avoid Cobie!");

  creatures.forEach((c) => {
    c.classList.remove("show", "hit", "bad-hit");
    c.dataset.hit = "false";
  });

  timerInterval = setInterval(updateTimer, 1000);
  showCreature();
}

function endGame() {
  lastScore = score;

  isPlaying = false;
  clearInterval(timerInterval);
  clearTimeout(gameInterval);
  activeHoles.clear();

  creatures.forEach((c) => c.classList.remove("show"));

  if (score > highScore) {
    highScore = score;
    localStorage.setItem("popTheBulkiesHighScore", String(highScore));
    highScoreDisplay.textContent = String(highScore);
    showMessage(`New record: ${score}!`, "positive");
  } else {
    showMessage(`Game over! Score: ${score}`);
  }

  const name = sanitizeName(lbNameEl.value) || sanitizeName(localStorage.getItem("popTheBulkiesName"));
  if (name && lastScore > 0) {
    lbNameEl.value = name;
    localStorage.setItem("popTheBulkiesName", name);

    saveRunToSupabase(name, lastScore);
  } else {
    lbHint.textContent = "type name + press Save (or just play)";
    lbRankLineEl.textContent = "";
  }

  setTimeout(() => {
    messageDisplay.classList.remove("visible");
    startBtn.classList.remove("hidden");
    startBtn.textContent = "Play Again";
  }, 2000);
}

startBtn.addEventListener("click", startGame);

async function submitScoreToDB(name, score) {
  const { data, error } = await sb.rpc("submit_score", {
    p_name: name,
    p_score: score,
  });

  if (error) {
    console.error("submit_score error:", error);
    return null;
  }

  return data?.[0] || null;
}

async function fetchTop7() {
  const { data, error } = await sb
    .from("leaderboard")
    .select("name,best_score,updated_at")
    .order("best_score", { ascending: false })
    .order("updated_at", { ascending: true })
    .limit(7);

  if (error) {
    console.error("fetchTop7 error:", error);
    return [];
  }

  return data || [];
}

function renderLeaderboardFromDB(topRows, myResult) {
  lbListEl.innerHTML = "";
  lbRankLineEl.textContent = "";

  if (!topRows || topRows.length === 0) {
    lbListEl.innerHTML = `<div class="lb-hint">no scores yet</div>`;
    return;
  }

  topRows.forEach((row, i) => {
    const div = document.createElement("div");
    div.className = "lb-row";
    if (i === 0) div.classList.add("top1");

    if (myResult && row.name.toLowerCase() === myResult.name.toLowerCase()) {
      div.classList.add("you");
    }

    div.innerHTML = `
      <div class="lb-rank">#${i + 1}</div>
      <div class="lb-name">${row.name}</div>
      <div class="lb-score">${row.best_score}</div>
    `;
    lbListEl.appendChild(div);
  });

  if (myResult && myResult.rank && myResult.rank > 7) {
    lbRankLineEl.textContent = `you: #${myResult.rank} • ${myResult.name} • ${myResult.best_score}`;
  }
}

async function refreshLeaderboard(myResult = null) {
  const top = await fetchTop7();
  renderLeaderboardFromDB(top, myResult);
}

async function saveRunToSupabase(name, score) {
  lbHint.textContent = "saving...";
  const res = await submitScoreToDB(name, score);

  if (!res) {
    lbHint.textContent = "save failed (check console)";
    return;
  }

  lbHint.textContent = `saved ${name}: ${score} ✅`;
  setTimeout(() => (lbHint.textContent = "score will be recorded after each run"), 1500);

  await refreshLeaderboard(res);
}

lbNameEl.value = localStorage.getItem("popTheBulkiesName") || "";
lbSaveBtn.textContent = "Save";
lbSaveBtn.disabled = false;
lbHint.textContent = "type name + press Save (or just play)";

lbSaveBtn.addEventListener("click", () => {
  const name = sanitizeName(lbNameEl.value);
  if (!name) {
    lbHint.textContent = "type a name first";
    return;
  }
  localStorage.setItem("popTheBulkiesName", name);
  lbHint.textContent = `saved as: ${name} ✅`;
  setTimeout(() => (lbHint.textContent = "score will be recorded after each run"), 1200);
});

lbNameEl.addEventListener("input", () => {
  localStorage.setItem("popTheBulkiesName", sanitizeName(lbNameEl.value));
});

refreshLeaderboard();
