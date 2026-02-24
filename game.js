let score = 0;
let timeLeft = 60;
let gameInterval = null;
let timerInterval = null;
let isPlaying = false;
let lastHole = -1;
let highScore = localStorage.getItem('popTheBulkiesHighScore') || 0;
let activeHoles = new Set();

let lastScore = 0;
let playerName = localStorage.getItem('popTheBulkiesName') || '';

const scoreDisplay = document.getElementById('score');
const timeDisplay = document.getElementById('time');
const highScoreDisplay = document.getElementById('highscore');
const startBtn = document.getElementById('startBtn');
const messageDisplay = document.getElementById('message');
const hammer = document.getElementById('hammer');
const holes = document.querySelectorAll('.hole');
const creatures = document.querySelectorAll('.creature');

// leaderboard dom
const LB_KEY = 'popTheBulkiesLeaderboard';
const lbListEl = document.getElementById('lbList');
const lbNameEl = document.getElementById('lbName');
const lbSaveBtn = document.getElementById('lbSaveBtn');
const lbHint = document.getElementById('lbHint');
const lbRankLineEl = document.getElementById('lbRankLine');

const creatureTypes = {
  good: ['good.png'],
  bad: ['cobie.png']
};

highScoreDisplay.textContent = highScore;

/* ----------------- HAMMER ----------------- */
document.addEventListener('mousemove', (e) => {
  hammer.style.left = e.clientX + 'px';
  hammer.style.top = e.clientY + 'px';
});

document.addEventListener('mousedown', () => {
  hammer.classList.add('hit');
});

document.addEventListener('mouseup', () => {
  hammer.classList.remove('hit');
});

/* ----------------- GAME UTILS ----------------- */
function getRandomTime(min, max) {
  return Math.random() * (max - min) + min;
}

function getRandomHole() {
  const availableHoles = [];
  for (let i = 0; i < 9; i++) {
    if (!activeHoles.has(i) && i !== lastHole) availableHoles.push(i);
  }
  if (availableHoles.length === 0) return -1;

  const hole = availableHoles[Math.floor(Math.random() * availableHoles.length)];
  lastHole = hole;
  activeHoles.add(hole);
  return hole;
}

function getRandomCreature() {
  const isGood = Math.random() > 0.3;
  const type = isGood ? 'good' : 'bad';
  const assets = creatureTypes[type];
  const image = assets[Math.floor(Math.random() * assets.length)];
  return { type, image };
}

function showSingleCreature() {
  const holeIndex = getRandomHole();
  if (holeIndex === -1) return;

  const creature = creatures[holeIndex];
  const { type, image } = getRandomCreature();

  creature.className = 'creature';
  creature.classList.add(type);
  creature.style.backgroundImage = `url('assets/${image}')`;
  creature.dataset.type = type;
  creature.dataset.hit = 'false';
  creature.dataset.holeIndex = holeIndex;

  creature.classList.add('show');

  const visibleTime = Math.max(800, 1500 - score * 1.2);

  setTimeout(() => {
    if (creature.dataset.hit === 'false') {
      creature.classList.remove('show');
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

/* ----------------- CLICK HANDLER ----------------- */
creatures.forEach((creature, index) => {
  creature.addEventListener('click', () => {
    if (!isPlaying) return;
    if (creature.dataset.hit === 'true') return;
    if (!creature.classList.contains('show')) return;

    creature.dataset.hit = 'true';
    const type = creature.dataset.type;
    const hole = holes[index];

    if (type === 'good') {
      score += 10;
      showMessage('+10 points!', 'positive');
      showPointsPopup(hole, '+10', 'positive');
      creature.classList.add('hit');
    } else {
      score = Math.max(0, score - 15);
      timeLeft = Math.max(0, timeLeft - 3);
      showMessage('Ouch! -15 points and -3 sec!', 'negative');
      showPointsPopup(hole, '-15', 'negative');
      creature.classList.add('bad-hit');

      document.body.classList.add('screen-shake');
      setTimeout(() => document.body.classList.remove('screen-shake'), 300);
    }

    scoreDisplay.textContent = score;
    timeDisplay.textContent = timeLeft;

    setTimeout(() => {
      creature.classList.remove('show', 'hit', 'bad-hit');
      activeHoles.delete(index);
    }, 300);
  });
});

function showPointsPopup(hole, text, type) {
  const popup = document.createElement('div');
  popup.className = `points-popup ${type}`;
  popup.textContent = text;

  const rect = hole.getBoundingClientRect();
  popup.style.left = rect.left + rect.width / 2 + 'px';
  popup.style.top = rect.top + 'px';
  popup.style.position = 'fixed';

  document.body.appendChild(popup);

  setTimeout(() => popup.remove(), 1000);
}

function showMessage(text, type = '') {
  messageDisplay.textContent = text;
  messageDisplay.className = 'message visible';
  if (type) messageDisplay.classList.add(type);
}

function updateTimer() {
  timeLeft--;
  timeDisplay.textContent = timeLeft;
  if (timeLeft <= 0) endGame();
}

function startGame() {
  score = 0;
  timeLeft = 60;
  isPlaying = true;
  lastHole = -1;
  activeHoles.clear();

  scoreDisplay.textContent = score;
  timeDisplay.textContent = timeLeft;
  startBtn.classList.add('hidden');
  showMessage('Hit the Bulkies! Avoid Cobie!');

  creatures.forEach(c => {
    c.classList.remove('show', 'hit', 'bad-hit');
    c.dataset.hit = 'false';
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

  creatures.forEach(c => c.classList.remove('show'));

  if (score > highScore) {
    highScore = score;
    localStorage.setItem('popTheBulkiesHighScore', highScore);
    highScoreDisplay.textContent = highScore;
    showMessage(`New record: ${score}!`, 'positive');
  } else {
    showMessage(`Game over! Score: ${score}`);
  }

  // ✅ AUTO SAVE AFTER GAME (1 name = 1 best score)
  const currentName = sanitizeName(lbNameEl?.value) || sanitizeName(playerName);
  if (currentName && lastScore > 0) {
    playerName = currentName;
    localStorage.setItem('popTheBulkiesName', playerName);
    lbNameEl.value = playerName;

    upsertBestScore(playerName, lastScore);

    lbHint.textContent = `saved ${playerName}: ${lastScore} ✅`;
    setTimeout(() => (lbHint.textContent = 'score will be recorded after each run'), 1500);
  } else {
    lbHint.textContent = 'type name + press Save (or just play)';
    lbRankLineEl.textContent = '';
  }

  setTimeout(() => {
    messageDisplay.classList.remove('visible');
    startBtn.classList.remove('hidden');
    startBtn.textContent = 'Play Again';
  }, 2000);
}

startBtn.addEventListener('click', startGame);

document.addEventListener('contextmenu', (e) => e.preventDefault());

/* ----------------- LEADERBOARD (TOP 7 + YOUR RANK) ----------------- */
function loadLeaderboard() {
  try { return JSON.parse(localStorage.getItem(LB_KEY)) || []; }
  catch { return []; }
}

function saveLeaderboard(data) {
  localStorage.setItem(LB_KEY, JSON.stringify(data));
}

function sanitizeName(name) {
  return (name || '').trim().replace(/\s+/g, ' ').slice(0, 16);
}

function getRankForName(sorted, name) {
  const idx = sorted.findIndex(x => x.name.toLowerCase() === name.toLowerCase());
  return idx === -1 ? null : idx + 1;
}

function renderLeaderboard(highlightName = null) {
  const sorted = loadLeaderboard().sort((a, b) => b.score - a.score);
  const top = sorted.slice(0, 7);

  lbListEl.innerHTML = '';
  lbRankLineEl.textContent = '';

  if (sorted.length === 0) {
    lbListEl.innerHTML = `<div class="lb-hint">no scores yet</div>`;
    return;
  }

  top.forEach((row, i) => {
    const div = document.createElement('div');
    div.className = 'lb-row';
    if (i === 0) div.classList.add('top1');
    if (highlightName && row.name.toLowerCase() === highlightName.toLowerCase()) div.classList.add('you');

    div.innerHTML = `
      <div class="lb-rank">#${i + 1}</div>
      <div class="lb-name">${row.name}</div>
      <div class="lb-score">${row.score}</div>
    `;
    lbListEl.appendChild(div);
  });

  if (highlightName) {
    const rank = getRankForName(sorted, highlightName);
    if (rank && rank > 7) {
      const row = sorted[rank - 1];
      lbRankLineEl.textContent = `you: #${rank} • ${row.name} • ${row.score}`;
    }
  }
}

// ✅ 1 NAME = 1 ROW (best score only)
function upsertBestScore(name, score) {
  const cleanName = sanitizeName(name);
  const newScore = Number(score) || 0;
  if (!cleanName || newScore <= 0) return;

  const data = loadLeaderboard();
  const idx = data.findIndex(x => x.name.toLowerCase() === cleanName.toLowerCase());

  if (idx === -1) {
    data.push({
      id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random(),
      name: cleanName,
      score: newScore,
      at: Date.now()
    });
  } else {
    const oldScore = Number(data[idx].score) || 0;
    if (newScore > oldScore) {
      data[idx].score = newScore;
      data[idx].at = Date.now();
    }
  }

  saveLeaderboard(data);
  renderLeaderboard(cleanName);
}

/* ----------------- LEADERBOARD UI INIT ----------------- */
lbNameEl.value = playerName;
lbSaveBtn.textContent = 'Save';
lbSaveBtn.disabled = false;
lbHint.textContent = 'type name + press Save (or just play)';

lbSaveBtn.addEventListener('click', () => {
  const name = sanitizeName(lbNameEl.value);
  if (!name) {
    lbHint.textContent = 'type a name first';
    return;
  }

  playerName = name;
  localStorage.setItem('popTheBulkiesName', playerName);

  lbHint.textContent = `saved as: ${playerName} ✅`;
  setTimeout(() => (lbHint.textContent = 'score will be recorded after each run'), 1200);
});

lbNameEl.addEventListener('input', () => {
  playerName = sanitizeName(lbNameEl.value);
  localStorage.setItem('popTheBulkiesName', playerName);
});

renderLeaderboard();