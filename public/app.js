const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const uiScore = document.getElementById("ui-score");
const uiLives = document.getElementById("ui-lives");
const uiLevel = document.getElementById("ui-level");
const uiStatus = document.getElementById("ui-status");

const BASE_WIDTH = 480;
const BASE_HEIGHT = 640;
const STAR_COUNT = 70;

let scale = 1;
let levels = [];
let currentLevelIndex = 0;
let running = false;
let paused = false;
let lastTime = 0;
let score = 0;
let lives = 3;
let stars = [];

const DEFAULT_LEVELS = [
  { id: 1, name: "Training Orbit", rows: 3, cols: 7, invaderSpeed: 32, speedMultiplier: 0.75, invaderDrop: 16, invaderFireRate: 0.0015, shotCooldown: 550 },
  { id: 2, name: "Moon Skirmish", rows: 4, cols: 8, invaderSpeed: 40, speedMultiplier: 0.9, invaderDrop: 18, invaderFireRate: 0.0025, shotCooldown: 520 },
  { id: 3, name: "Asteroid Belt", rows: 4, cols: 9, invaderSpeed: 50, speedMultiplier: 1.05, invaderDrop: 20, invaderFireRate: 0.0035, shotCooldown: 490 },
  { id: 4, name: "Nebula Push", rows: 5, cols: 9, invaderSpeed: 60, speedMultiplier: 1.2, invaderDrop: 22, invaderFireRate: 0.0045, shotCooldown: 460 },
  { id: 5, name: "Void Siege", rows: 5, cols: 10, invaderSpeed: 72, speedMultiplier: 1.35, invaderDrop: 24, invaderFireRate: 0.0055, shotCooldown: 430 }
];

const audio = {
  context: null,
  enabled: false,
};

const keys = new Set();

const state = {
  player: null,
  invaders: [],
  bullets: [],
  invaderBullets: [],
  direction: 1,
  invaderSpeed: 30,
  invaderDrop: 18,
  invaderFireRate: 0.002,
  shotCooldown: 520,
};

function initStars() {
  stars = Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * BASE_WIDTH,
    y: Math.random() * BASE_HEIGHT,
    size: 1 + Math.random() * 1.5,
    speed: 6 + Math.random() * 20,
  }));
}

function resizeCanvas() {
  const container = canvas.parentElement;
  const maxWidth = container.clientWidth;
  const maxHeight = Math.min(window.innerHeight * 0.68, 720);
  scale = Math.min(maxWidth / BASE_WIDTH, maxHeight / BASE_HEIGHT);
  const ratio = window.devicePixelRatio || 1;

  canvas.width = BASE_WIDTH * scale * ratio;
  canvas.height = BASE_HEIGHT * scale * ratio;
  canvas.style.width = `${BASE_WIDTH * scale}px`;
  canvas.style.height = `${BASE_HEIGHT * scale}px`;
  ctx.setTransform(scale * ratio, 0, 0, scale * ratio, 0, 0);
}

function createPlayer() {
  return {
    x: BASE_WIDTH / 2 - 18,
    y: BASE_HEIGHT - 48,
    width: 36,
    height: 16,
    speed: 220,
    cooldown: 0,
  };
}

function createInvaders(level) {
  const invaders = [];
  const spacingX = 44;
  const spacingY = 34;
  const startX = (BASE_WIDTH - (level.cols - 1) * spacingX) / 2;
  const startY = 80;

  for (let row = 0; row < level.rows; row += 1) {
    for (let col = 0; col < level.cols; col += 1) {
      invaders.push({
        x: startX + col * spacingX,
        y: startY + row * spacingY,
        width: 30,
        height: 20,
        row,
        alive: true,
      });
    }
  }

  return invaders;
}

function setStatus(message) {
  uiStatus.textContent = message;
}

function initAudio() {
  if (audio.context) {
    return;
  }
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    return;
  }
  audio.context = new AudioContext();
  audio.enabled = true;
}

function resumeAudio() {
  if (!audio.context) {
    initAudio();
  }
  if (audio.context && audio.context.state === "suspended") {
    audio.context.resume();
  }
}

function playTone({
  frequency = 440,
  type = "square",
  duration = 0.08,
  volume = 0.12,
  sweep = 0,
}) {
  if (!audio.context || !audio.enabled) {
    return;
  }
  const ctxAudio = audio.context;
  const now = ctxAudio.currentTime;
  const oscillator = ctxAudio.createOscillator();
  const gain = ctxAudio.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (sweep) {
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, frequency + sweep),
      now + duration
    );
  }

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gain);
  gain.connect(ctxAudio.destination);

  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function soundShoot() {
  playTone({ frequency: 520, type: "square", duration: 0.06, volume: 0.09, sweep: -160 });
}

function soundInvaderHit() {
  playTone({ frequency: 220, type: "square", duration: 0.08, volume: 0.1, sweep: -80 });
}

function soundPlayerHit() {
  playTone({ frequency: 140, type: "sawtooth", duration: 0.18, volume: 0.12, sweep: -90 });
}

function soundLevelStart() {
  playTone({ frequency: 480, type: "square", duration: 0.07, volume: 0.08, sweep: 120 });
  playTone({ frequency: 640, type: "square", duration: 0.07, volume: 0.07, sweep: 160 });
}

function soundGameOver() {
  playTone({ frequency: 220, type: "sawtooth", duration: 0.22, volume: 0.12, sweep: -140 });
  playTone({ frequency: 160, type: "square", duration: 0.18, volume: 0.1, sweep: -80 });
}

function updateUi() {
  uiScore.textContent = score;
  uiLives.textContent = lives;
  uiLevel.textContent = levels[currentLevelIndex]?.id ?? 1;
}

function startLevel() {
  const level = levels[currentLevelIndex];
  if (!level) {
    setStatus("Victory! All levels cleared.");
    running = false;
    return;
  }

  state.player = createPlayer();
  state.invaders = createInvaders(level);
  state.bullets = [];
  state.invaderBullets = [];
  state.direction = 1;
  state.invaderSpeed = level.invaderSpeed * level.speedMultiplier;
  state.invaderDrop = level.invaderDrop;
  state.invaderFireRate = level.invaderFireRate;
  state.shotCooldown = level.shotCooldown;

  setStatus(`Level ${level.id}: ${level.name}`);
  soundLevelStart();
  updateUi();
}

function resetGame() {
  score = 0;
  lives = 3;
  currentLevelIndex = 0;
  running = true;
  paused = false;
  startLevel();
}

function nextLevel() {
  currentLevelIndex += 1;
  startLevel();
}

function firePlayerBullet() {
  state.bullets.push({
    x: state.player.x + state.player.width / 2 - 2,
    y: state.player.y - 10,
    width: 4,
    height: 10,
    speed: 420,
  });
  soundShoot();
}

function fireInvaderBullet(invader) {
  state.invaderBullets.push({
    x: invader.x + invader.width / 2 - 2,
    y: invader.y + invader.height,
    width: 4,
    height: 10,
    speed: 240,
  });
}

function handleInput(dt) {
  if (!state.player) {
    return;
  }

  const speed = state.player.speed;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) {
    state.player.x -= speed * dt;
  }
  if (keys.has("ArrowRight") || keys.has("KeyD")) {
    state.player.x += speed * dt;
  }

  state.player.x = Math.max(12, Math.min(BASE_WIDTH - state.player.width - 12, state.player.x));

  if ((keys.has("Space") || keys.has("KeyK")) && state.player.cooldown <= 0) {
    firePlayerBullet();
    state.player.cooldown = state.shotCooldown;
  }
}

function updateBullets(dt) {
  state.bullets.forEach((bullet) => {
    bullet.y -= bullet.speed * dt;
  });
  state.bullets = state.bullets.filter((bullet) => bullet.y + bullet.height > 0);

  state.invaderBullets.forEach((bullet) => {
    bullet.y += bullet.speed * dt;
  });
  state.invaderBullets = state.invaderBullets.filter((bullet) => bullet.y < BASE_HEIGHT + 20);
}

function updateInvaders(dt) {
  const aliveInvaders = state.invaders.filter((invader) => invader.alive);
  if (aliveInvaders.length === 0) {
    setStatus("Wave cleared. Preparing next level…");
    nextLevel();
    return;
  }

  const moveX = state.direction * state.invaderSpeed * dt;
  let hitEdge = false;

  for (const invader of aliveInvaders) {
    invader.x += moveX;
    if (invader.x < 12 || invader.x + invader.width > BASE_WIDTH - 12) {
      hitEdge = true;
    }
  }

  if (hitEdge) {
    state.direction *= -1;
    for (const invader of aliveInvaders) {
      invader.y += state.invaderDrop;
    }
  }

  aliveInvaders.forEach((invader) => {
    if (Math.random() < state.invaderFireRate * dt) {
      fireInvaderBullet(invader);
    }
  });
}

function checkCollisions() {
  for (const bullet of state.bullets) {
    for (const invader of state.invaders) {
      if (!invader.alive) {
        continue;
      }
      if (rectsIntersect(bullet, invader)) {
        invader.alive = false;
        bullet.y = -20;
        score += 100;
        soundInvaderHit();
      }
    }
  }

  for (const bullet of state.invaderBullets) {
    if (rectsIntersect(bullet, state.player)) {
      bullet.y = BASE_HEIGHT + 40;
      lives -= 1;
      if (lives <= 0) {
        running = false;
        setStatus("Game over. Press Enter to restart.");
        soundGameOver();
      } else {
        setStatus("Hit! Brace for the next volley.");
        soundPlayerHit();
      }
    }
  }

  for (const invader of state.invaders) {
    if (invader.alive && invader.y + invader.height >= state.player.y) {
      running = false;
      setStatus("The invaders broke through. Press Enter to retry.");
      soundGameOver();
    }
  }
}

function rectsIntersect(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function update(dt) {
  if (!running || paused) {
    return;
  }

  if (state.player) {
    state.player.cooldown -= dt * 1000;
  }

  handleInput(dt);
  updateBullets(dt);
  updateInvaders(dt);
  checkCollisions();
  updateStars(dt);
  updateUi();
}

function updateStars(dt) {
  stars.forEach((star) => {
    star.y += star.speed * dt;
    if (star.y > BASE_HEIGHT) {
      star.y = -5;
      star.x = Math.random() * BASE_WIDTH;
    }
  });
}

function draw() {
  ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

  ctx.fillStyle = "#05070f";
  ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

  ctx.fillStyle = "rgba(139, 255, 177, 0.6)";
  stars.forEach((star) => {
    ctx.fillRect(star.x, star.y, star.size, star.size);
  });

  ctx.strokeStyle = "rgba(104, 199, 255, 0.2)";
  ctx.strokeRect(10, 10, BASE_WIDTH - 20, BASE_HEIGHT - 20);

  if (!running) {
    drawPreview();
    return;
  }

  if (state.player) {
    drawPlayer(state.player);
  }

  drawInvaders();
  drawBullets();
}

function drawPreview() {
  if (!state.player) {
    state.player = createPlayer();
  }
  if (state.invaders.length === 0) {
    const previewLevel = levels[0] || { rows: 3, cols: 7 };
    state.invaders = createInvaders(previewLevel);
  }

  drawInvaders();
  drawPlayer(state.player);

  ctx.fillStyle = "rgba(104, 199, 255, 0.3)";
  ctx.font = "16px 'Share Tech Mono', 'Orbitron', monospace";
  ctx.textAlign = "center";
  ctx.fillText("Press Enter to start", BASE_WIDTH / 2, BASE_HEIGHT - 80);
}

function drawPlayer(player) {
  const baseX = player.x;
  const baseY = player.y;
  const pixel = 4;
  const hullColor = "#8bffb1";
  const cockpitColor = "#b6fff0";

  const sprite = [
    "..111111..",
    ".11111111.",
    "1111111111",
    "1111111111",
    "..11..11..",
  ];

  sprite.forEach((row, rowIndex) => {
    [...row].forEach((cell, colIndex) => {
      if (cell === "1") {
        ctx.fillStyle = rowIndex === 1 ? cockpitColor : hullColor;
        ctx.fillRect(baseX + colIndex * pixel, baseY + rowIndex * pixel, pixel, pixel);
      }
    });
  });
}

function drawInvaders() {
  const rowColors = ["#68c7ff", "#8bffb1", "#ffb86c", "#ff6b88", "#b084ff"];
  const pixel = 3;
  const sprite = [
    ".011110.",
    "1111111",
    "1101101",
    "1111111",
    ".101101.",
    "01....10",
  ];

  state.invaders.forEach((invader) => {
    if (!invader.alive) {
      return;
    }
    const color = rowColors[invader.row % rowColors.length];
    const baseX = invader.x;
    const baseY = invader.y;

    sprite.forEach((row, rowIndex) => {
      [...row].forEach((cell, colIndex) => {
        if (cell === "1") {
          ctx.fillStyle = color;
          ctx.fillRect(baseX + colIndex * pixel, baseY + rowIndex * pixel, pixel, pixel);
        }
      });
    });
  });
}

function drawBullets() {
  ctx.fillStyle = "#fff";
  state.bullets.forEach((bullet) => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });
  ctx.fillStyle = "#ff6b88";
  state.invaderBullets.forEach((bullet) => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });
}

function loop(timestamp) {
  const delta = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  update(delta);
  draw();
  requestAnimationFrame(loop);
}

function handleKeyDown(event) {
  resumeAudio();
  if (["ArrowLeft", "ArrowRight", "Space", "KeyA", "KeyD", "KeyK"].includes(event.code)) {
    event.preventDefault();
  }

  if (event.code === "KeyP") {
    paused = !paused;
    setStatus(paused ? "Paused" : `Level ${levels[currentLevelIndex]?.id}`);
  }

  if (event.code === "Enter") {
    if (!running) {
      resetGame();
    }
  }

  keys.add(event.code);
}

function handleKeyUp(event) {
  keys.delete(event.code);
}

async function loadLevels() {
  try {
    // Use relative path so GitHub Pages (repo subpath) works correctly
    const response = await fetch("levels.json?v=20260117");
    if (!response.ok) throw new Error('Levels fetch failed: ' + response.status);
    const data = await response.json();
    // support both shapes: /api/levels returns { levels } and static file may be an array
    levels = data.levels || data || [];
    if (!levels || levels.length === 0) {
      levels = DEFAULT_LEVELS.slice();
      setStatus("Using fallback levels — press Enter to start.");
    } else {
      setStatus("Press Enter to start.");
    }
    updateUi();
  } catch (error) {
    // Fallback to embedded levels so the game still runs
    console.warn(error);
    levels = DEFAULT_LEVELS.slice();
    setStatus("Using fallback levels (offline). Press Enter to start.");
    updateUi();
  }
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);

resizeCanvas();
initStars();
loadLevels();
requestAnimationFrame(loop);
