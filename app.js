const characters = [
  { id: "orion", name: "Orion Pax", css: "hero-orion", color: "#4f7bff", accent: "#ff6a5c", robotSpeed: 220, vehicleSpeed: 310, jumpPower: 640, extraJump: true, dashBoost: 0, glide: false, breaker: false },
  { id: "bee", name: "Bumblebee", css: "hero-bumblebee", color: "#ffd84d", accent: "#2d3240", robotSpeed: 235, vehicleSpeed: 360, jumpPower: 610, extraJump: false, dashBoost: 55, glide: false, breaker: false },
  { id: "elita", name: "Elita-1", css: "hero-elita", color: "#ff78ba", accent: "#6454ff", robotSpeed: 225, vehicleSpeed: 320, jumpPower: 700, extraJump: false, dashBoost: 0, glide: true, breaker: false },
  { id: "d16", name: "D-16", css: "hero-d16", color: "#bec6d9", accent: "#586173", robotSpeed: 210, vehicleSpeed: 300, jumpPower: 600, extraJump: false, dashBoost: 0, glide: false, breaker: true }
];

const tutorialScript = [
  { key: "welcome", speak: "Vamos", demo: "Sigue adelante", wait: 1400 },
  { key: "jumpGap", speak: "Toca para saltar", demo: "Salta", type: "jump" },
  { key: "transformBarrier", speak: "Ahora transformate", demo: "Hazte auto", type: "transform" },
  { key: "collect", speak: "Muy bien", demo: "Toma energon", wait: 1200 },
  { key: "rescue", speak: "Rescata al mini bot", demo: "Sigue", wait: 1200 },
  { key: "finish", speak: "Excelente", demo: "Meta brillante", wait: 1200 }
];

const screens = {
  home: document.getElementById("homeScreen"),
  roster: document.getElementById("rosterScreen"),
  game: document.getElementById("gameScreen"),
  reward: document.getElementById("rewardScreen")
};

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const voiceBubble = document.getElementById("voiceBubble");
const demoHint = document.getElementById("demoHint");
const jumpButton = document.getElementById("jumpButton");
const transformButton = document.getElementById("transformButton");
const energyCount = document.getElementById("energyCount");
const starCount = document.getElementById("starCount");
const botCount = document.getElementById("botCount");
const soundToggle = document.getElementById("soundToggle");
const installButton = document.getElementById("installButton");
const homeHero = document.getElementById("homeHero");
const rewardHero = document.getElementById("rewardHero");
const rewardLoot = document.getElementById("rewardLoot");
const carousel = document.getElementById("characterCarousel");

const audioState = { enabled: true, context: null };
const uiState = { screen: "home", selectedCharacter: characters[0], tutorialComplete: false };
let deferredInstallPrompt = null;
const gameState = {
  running: false, mode: "tutorial", cameraX: 0, worldWidth: 5200, groundY: 590, energy: 0, stars: 0, bots: 0,
  failStreak: 0, levelStart: 0, currentPrompt: null, promptRepeatAt: 0, tutorialStepIndex: 0, player: null,
  entities: [], particles: [], skyBots: []
};

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function setupStandaloneMode() {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  document.body.classList.toggle("standalone", Boolean(standalone));
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

function setupInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton.classList.add("show-install");
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    installButton.classList.remove("show-install");
  });

  installButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice.catch(() => null);
    deferredInstallPrompt = null;
    installButton.classList.remove("show-install");
  });
}

function setScreen(name) {
  Object.entries(screens).forEach(([key, node]) => node.classList.toggle("active", key === name));
  uiState.screen = name;
}

function clearHighlights() {
  jumpButton.classList.remove("highlight");
  transformButton.classList.remove("highlight");
}

function speak(text, button) {
  voiceBubble.textContent = text;
  voiceBubble.classList.add("show");
  clearHighlights();
  if (button === "jump") jumpButton.classList.add("highlight");
  if (button === "transform") transformButton.classList.add("highlight");
  if (audioState.enabled) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-CL";
    utterance.rate = 0.96;
    utterance.pitch = 1.15;
    window.speechSynthesis.speak(utterance);
  }
}

function setDemoHint(text) {
  demoHint.textContent = text || "";
  demoHint.classList.toggle("hidden", !text);
}

function queuePrompt(text, button, demo, delay = 0) {
  gameState.currentPrompt = { text, button, demo };
  gameState.promptRepeatAt = performance.now() + 3600 + delay;
  speak(text, button);
  setDemoHint(demo);
}

function ensurePrompt(text, button, demo, delay = 0) {
  const current = gameState.currentPrompt;
  if (current && current.text === text && current.button === button && current.demo === demo) return;
  queuePrompt(text, button, demo, delay);
}

function ensureAudio() {
  if (!audioState.context) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) audioState.context = new AudioCtx();
  }
  if (audioState.context?.state === "suspended") audioState.context.resume();
}

function tone(freq, duration, type = "sine", gainValue = 0.05) {
  if (!audioState.enabled) return;
  ensureAudio();
  if (!audioState.context) return;
  const now = audioState.context.currentTime;
  const osc = audioState.context.createOscillator();
  const gain = audioState.context.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain).connect(audioState.context.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playSfx(kind) {
  const map = {
    jump: [420, 0.12, "triangle", 0.05],
    transform: [180, 0.18, "sawtooth", 0.04],
    energon: [780, 0.1, "square", 0.04],
    rescue: [540, 0.16, "triangle", 0.05],
    finish: [660, 0.28, "sine", 0.06],
    fail: [160, 0.2, "sawtooth", 0.03]
  };
  tone(...(map[kind] || map.energon));
}

function makeCharacterCard(character, index) {
  const card = document.createElement("button");
  card.className = "character-card";
  card.innerHTML = `<div class="character-orb" style="color:${character.color}; background:${character.color}"></div><div class="hero-avatar ${character.css}"><div class="hero-core"></div><div class="hero-vehicle"></div></div>`;
  card.addEventListener("click", () => selectCharacter(index));
  return card;
}

function renderCharacterCards() {
  carousel.innerHTML = "";
  characters.forEach((character, index) => carousel.appendChild(makeCharacterCard(character, index)));
  selectCharacter(0);
}

function updateHeroClasses() {
  const cssClasses = characters.map((item) => item.css);
  [homeHero, rewardHero].forEach((node) => {
    node.classList.remove(...cssClasses);
    node.classList.add(uiState.selectedCharacter.css);
  });
}

function selectCharacter(index) {
  uiState.selectedCharacter = characters[index];
  [...carousel.children].forEach((card, idx) => card.classList.toggle("selected", idx === index));
  updateHeroClasses();
  speak(uiState.selectedCharacter.name);
  tone(620, 0.08, "triangle", 0.03);
}

function createPlayer() {
  const chosen = uiState.selectedCharacter;
  return { x: 210, y: gameState.groundY - 132, width: 92, height: 132, vx: chosen.robotSpeed, vy: 0, onGround: true, form: "robot", jumpCount: 0, transformFlash: 0 };
}

function createTutorialLevel() {
  gameState.worldWidth = 3400;
  return [
    { type: "gap", x: 760, width: 140, guided: "jumpGap" },
    { type: "lowBarrier", x: 1160, width: 160, height: 64, guided: "transformBarrier" },
    { type: "energon", x: 1440, y: 460 },
    { type: "energon", x: 1520, y: 420 },
    { type: "miniBot", x: 1840, y: 506 },
    { type: "ramp", x: 2140, width: 220, height: 110 },
    { type: "finish", x: 2860, width: 140 }
  ];
}

function createMainLevel() {
  gameState.worldWidth = 5200;
  return [
    { type: "energon", x: 620, y: 450 },
    { type: "gap", x: 860, width: 120 },
    { type: "ramp", x: 1180, width: 200, height: 90 },
    { type: "lowBarrier", x: 1540, width: 160, height: 58 },
    { type: "energon", x: 1740, y: 410 },
    { type: "wall", x: 2060, width: 100, height: 132 },
    { type: "platform", x: 2340, y: 430, width: 220, height: 24 },
    { type: "energon", x: 2420, y: 350 },
    { type: "drone", x: 2700, y: 420, range: 120 },
    { type: "gap", x: 3020, width: 130 },
    { type: "miniBot", x: 3340, y: 506 },
    { type: "lowBarrier", x: 3660, width: 180, height: 60 },
    { type: "platform", x: 3940, y: 390, width: 180, height: 24 },
    { type: "energon", x: 4020, y: 320 },
    { type: "turret", x: 4300, y: 520, cooldown: 0 },
    { type: "finish", x: 4780, width: 180 }
  ];
}

function updateCounters() {
  energyCount.textContent = gameState.energy;
  starCount.textContent = gameState.stars;
  botCount.textContent = gameState.bots;
}

function startGame(mode) {
  gameState.running = true;
  gameState.mode = mode;
  gameState.energy = 0;
  gameState.stars = 0;
  gameState.bots = 0;
  gameState.failStreak = 0;
  gameState.cameraX = 0;
  gameState.levelStart = performance.now();
  gameState.player = createPlayer();
  gameState.entities = mode === "tutorial" ? createTutorialLevel() : createMainLevel();
  gameState.particles = [];
  gameState.skyBots = Array.from({ length: 6 }, (_, index) => ({ x: 180 + index * 220, y: 110 + (index % 3) * 56, size: 12 + (index % 2) * 6 }));
  gameState.tutorialStepIndex = mode === "tutorial" ? 1 : 0;
  setScreen("game");
  updateCounters();
  queuePrompt("Vamos", null, "Sigue adelante");
}

function spawnBurst(x, y, color) {
  for (let i = 0; i < 10; i += 1) {
    gameState.particles.push({ x, y, vx: (Math.random() - 0.5) * 220, vy: (Math.random() - 0.7) * 220, life: 0.6 + Math.random() * 0.4, color });
  }
}

function resolveTutorialAction(type) {
  if (gameState.mode !== "tutorial") return;
  const current = tutorialScript[gameState.tutorialStepIndex];
  if (!current || current.type !== type) return;
  gameState.tutorialStepIndex += 1;
  const next = tutorialScript[gameState.tutorialStepIndex];
  if (next) window.setTimeout(() => queuePrompt(next.speak, next.type, next.demo), 350);
}

function handleJump() {
  if (!gameState.running) return;
  const player = gameState.player;
  const chosen = uiState.selectedCharacter;
  const canDouble = chosen.extraJump && player.jumpCount < 2;
  const canNormal = player.onGround || (!player.onGround && canDouble);
  if (!canNormal) return;
  player.vy = -chosen.jumpPower;
  player.onGround = false;
  player.jumpCount += 1;
  playSfx("jump");
  spawnBurst(player.x + 40, player.y + 120, chosen.color);
  resolveTutorialAction("jump");
}

function handleTransform() {
  if (!gameState.running) return;
  const player = gameState.player;
  const chosen = uiState.selectedCharacter;
  player.form = player.form === "robot" ? "vehicle" : "robot";
  player.transformFlash = 18;
  if (player.form === "vehicle") {
    player.height = 78;
    player.width = 124;
    player.y += 54;
    player.vx = chosen.vehicleSpeed + chosen.dashBoost;
  } else {
    player.y -= 54;
    player.height = 132;
    player.width = 92;
    player.vx = chosen.robotSpeed;
  }
  playSfx("transform");
  spawnBurst(player.x + 40, player.y + 30, chosen.accent);
  resolveTutorialAction("transform");
}

function pointerAction(button, handler) {
  const trigger = (event) => { event.preventDefault(); ensureAudio(); handler(); };
  button.addEventListener("pointerdown", trigger);
  button.addEventListener("touchstart", trigger, { passive: false });
}

function findGroundYAt(x) {
  let ground = gameState.groundY;
  for (const entity of gameState.entities) {
    if ((entity.type === "platform" || entity.type === "ramp") && x > entity.x && x < entity.x + entity.width) {
      if (entity.type === "platform") ground = Math.min(ground, entity.y);
      if (entity.type === "ramp") ground = Math.min(ground, gameState.groundY - entity.height * ((x - entity.x) / entity.width));
    }
  }
  return ground;
}

function simplifyObstacle(entity) {
  if (!entity || entity.simplified) return;
  entity.simplified = true;
  if (entity.type === "gap") entity.width = Math.max(70, entity.width - 50);
  if (entity.type === "lowBarrier") entity.height = Math.max(38, entity.height - 22);
  if (entity.type === "wall") entity.height = 0;
  if (entity.type === "turret") entity.disabled = true;
}

function respawnNearObstacle(entity) {
  const player = gameState.player;
  player.x = Math.max(180, (entity?.x || player.x) - 180);
  player.y = gameState.groundY - 132;
  player.vy = 0;
  player.onGround = true;
  player.jumpCount = 0;
  if (player.form === "vehicle") {
    player.form = "robot";
    player.width = 92;
    player.height = 132;
    player.vx = uiState.selectedCharacter.robotSpeed;
  }
}

function handleFail(entity) {
  gameState.failStreak += 1;
  playSfx("fail");
  spawnBurst(gameState.player.x + 40, gameState.player.y + 40, "#ff6a5c");
  if (gameState.failStreak >= 2) {
    simplifyObstacle(entity);
    queuePrompt("Prueba otra vez", entity?.type === "gap" ? "jump" : "transform", "Te ayudo", 400);
  }
  respawnNearObstacle(entity);
}

function applyAdaptiveHelp(now) {
  const ahead = gameState.entities.find((entity) => entity.x + (entity.width || 0) > gameState.player.x + 40 && !entity.collected && entity.type !== "finish");
  if (!ahead) return;
  if (ahead.guided === "jumpGap" && ahead.x - gameState.player.x < 220 && gameState.tutorialStepIndex <= 1) ensurePrompt("Toca para saltar", "jump", "Salta");
  if (ahead.guided === "transformBarrier" && ahead.x - gameState.player.x < 220 && gameState.tutorialStepIndex <= 2) ensurePrompt("Ahora transformate", "transform", "Hazte auto");
  if (gameState.currentPrompt && now > gameState.promptRepeatAt) queuePrompt(gameState.currentPrompt.text, gameState.currentPrompt.button, gameState.currentPrompt.demo, 1100);
}

function endLevel() {
  gameState.running = false;
  playSfx("finish");
  uiState.tutorialComplete = true;
  rewardHero.className = `reward-hero ${uiState.selectedCharacter.css}`;
  rewardLoot.innerHTML = `<div class="reward-pill">⚡ ${gameState.energy} energon</div><div class="reward-pill">★ ${Math.max(3, gameState.stars || 3)} estrellas</div><div class="reward-pill">🎖 sticker nuevo</div>`;
  speak("Excelente");
  setScreen("reward");
}

function checkInteractions(now, dt) {
  const player = gameState.player;
  const footX = player.x + player.width * 0.5;
  for (const entity of gameState.entities) {
    if (entity.collected) continue;
    if (entity.type === "energon") {
      const dx = entity.x - (player.x + player.width / 2);
      const dy = entity.y - (player.y + player.height / 2);
      if (Math.abs(dx) < 52 && Math.abs(dy) < 52) {
        entity.collected = true;
        gameState.energy += 1;
        if (gameState.energy % 3 === 0) gameState.stars += 1;
        updateCounters();
        playSfx("energon");
        spawnBurst(entity.x, entity.y, "#44efff");
      }
    }
    if (entity.type === "miniBot" && Math.abs(entity.x - footX) < 56 && Math.abs(entity.y - (player.y + player.height)) < 90) {
      entity.collected = true;
      gameState.bots += 1;
      gameState.stars += 1;
      updateCounters();
      playSfx("rescue");
      queuePrompt("Muy bien", null, "Mini bot rescatado", 400);
    }
    if (entity.type === "gap") {
      const withinGap = footX > entity.x && footX < entity.x + entity.width;
      const floorHere = findGroundYAt(footX);
      if (withinGap && player.y + player.height >= floorHere - 4) handleFail(entity);
    }
    if (entity.type === "lowBarrier" && !entity.simplified) {
      const hit = player.x + player.width > entity.x && player.x < entity.x + entity.width && player.y + player.height > gameState.groundY - entity.height;
      if (hit && player.form !== "vehicle") handleFail(entity);
    }
    if (entity.type === "wall" && !entity.simplified) {
      const hit = player.x + player.width > entity.x && player.x < entity.x + entity.width;
      if (hit) {
        if (uiState.selectedCharacter.breaker || player.form === "vehicle") {
          entity.simplified = true;
          playSfx("transform");
          spawnBurst(entity.x, gameState.groundY - 60, "#ffd84d");
        } else {
          handleFail(entity);
        }
      }
    }
    if (entity.type === "drone") {
      entity.phase = (entity.phase || 0) + dt * 1.5;
      entity.y += Math.sin(entity.phase) * 18 * dt;
      if (Math.abs(entity.x - (player.x + 40)) < 42 && Math.abs(entity.y - (player.y + 44)) < 44) handleFail(entity);
    }
    if (entity.type === "turret" && !entity.disabled) {
      entity.cooldown = (entity.cooldown || 0) - dt;
      if (entity.cooldown <= 0 && entity.x > player.x && entity.x - player.x < 420) {
        entity.cooldown = 2.6;
        gameState.particles.push({ projectile: true, x: entity.x, y: entity.y - 38, vx: -250, vy: -12, life: 3, color: "#ff6a5c" });
      }
    }
    if (entity.type === "finish" && player.x + player.width > entity.x) endLevel();
  }
  gameState.particles = gameState.particles.filter((particle) => {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    if (!particle.projectile) particle.vy += 380 * dt;
    if (particle.projectile && Math.abs(particle.x - (player.x + 40)) < 28 && Math.abs(particle.y - (player.y + 40)) < 34) {
      handleFail({ type: "turret" });
      return false;
    }
    return particle.life > 0;
  });
}

function updateGame(dt, now) {
  const player = gameState.player;
  const chosen = uiState.selectedCharacter;
  player.vx = player.form === "vehicle" ? chosen.vehicleSpeed + chosen.dashBoost : chosen.robotSpeed;
  player.x += player.vx * dt;
  player.vy += (chosen.glide && player.form === "robot" && player.vy > 160 ? 500 : 1250) * dt;
  player.y += player.vy * dt;
  const floor = findGroundYAt(player.x + player.width * 0.5);
  if (player.y + player.height >= floor) {
    player.y = floor - player.height;
    player.vy = 0;
    player.onGround = true;
    player.jumpCount = 0;
  } else {
    player.onGround = false;
  }
  if (player.y > canvas.height + 120) handleFail({ type: "gap", x: player.x });
  gameState.cameraX = Math.max(0, Math.min(player.x - canvas.clientWidth * 0.24, gameState.worldWidth - canvas.clientWidth));
  if (player.transformFlash > 0) player.transformFlash -= 1;
  applyAdaptiveHelp(now);
  checkInteractions(now, dt);
}

function drawBackground(width, height) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#0b1128");
  gradient.addColorStop(0.48, "#182759");
  gradient.addColorStop(1, "#0a0f22");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 36; i += 1) {
    const x = (i * 170 - gameState.cameraX * 0.15) % (width + 200);
    const y = 80 + (i % 5) * 72;
    ctx.fillStyle = i % 2 ? "rgba(68,239,255,0.12)" : "rgba(255,216,77,0.08)";
    ctx.beginPath();
    ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(-gameState.cameraX * 0.35, 0);
  for (let i = 0; i < 10; i += 1) {
    ctx.fillStyle = i % 2 ? "rgba(61,139,255,0.22)" : "rgba(196,102,255,0.16)";
    const baseX = i * 420;
    ctx.beginPath();
    ctx.moveTo(baseX, height - 220);
    ctx.lineTo(baseX + 120, height - 420);
    ctx.lineTo(baseX + 240, height - 240);
    ctx.lineTo(baseX + 380, height - 380);
    ctx.lineTo(baseX + 460, height - 220);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawGround(width, height) {
  ctx.fillStyle = "#131a33";
  ctx.fillRect(0, gameState.groundY, width, height - gameState.groundY);
  ctx.fillStyle = "rgba(68,239,255,0.18)";
  for (let x = -gameState.cameraX % 80; x < width; x += 80) ctx.fillRect(x, gameState.groundY, 44, 8);
}

function drawEntity(entity) {
  const x = entity.x - gameState.cameraX;
  if (x < -220 || x > canvas.clientWidth + 220) return;
  if (entity.type === "gap") { ctx.fillStyle = "#070b14"; ctx.fillRect(x, gameState.groundY, entity.width, 240); return; }
  if (entity.type === "platform") { ctx.fillStyle = "#6e7db8"; ctx.fillRect(x, entity.y, entity.width, entity.height); return; }
  if (entity.type === "ramp") {
    ctx.fillStyle = "#22d7ff";
    ctx.beginPath(); ctx.moveTo(x, gameState.groundY); ctx.lineTo(x + entity.width, gameState.groundY); ctx.lineTo(x + entity.width, gameState.groundY - entity.height); ctx.closePath(); ctx.fill(); return;
  }
  if (entity.type === "lowBarrier") { ctx.fillStyle = entity.simplified ? "rgba(255,216,77,0.3)" : "#ffb347"; ctx.fillRect(x, gameState.groundY - entity.height, entity.width, entity.height); return; }
  if (entity.type === "wall") { if (entity.simplified) return; ctx.fillStyle = "#9ca8c7"; ctx.fillRect(x, gameState.groundY - entity.height, entity.width, entity.height); return; }
  if (entity.type === "energon") {
    if (entity.collected) return;
    ctx.save(); ctx.translate(x, entity.y); ctx.rotate(performance.now() / 500); ctx.fillStyle = "#44efff";
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(16, 0); ctx.lineTo(0, 18); ctx.lineTo(-16, 0); ctx.closePath(); ctx.fill(); ctx.restore(); return;
  }
  if (entity.type === "miniBot") { if (entity.collected) return; ctx.fillStyle = "#ffe768"; ctx.fillRect(x - 20, entity.y - 34, 40, 34); ctx.fillStyle = "#2d3240"; ctx.fillRect(x - 10, entity.y - 48, 20, 12); return; }
  if (entity.type === "drone") { ctx.fillStyle = "#ff6a5c"; ctx.beginPath(); ctx.arc(x, entity.y, 22, 0, Math.PI * 2); ctx.fill(); return; }
  if (entity.type === "turret" && !entity.disabled) { ctx.fillStyle = "#c466ff"; ctx.fillRect(x - 20, entity.y - 40, 40, 40); ctx.fillRect(x, entity.y - 56, 26, 12); return; }
  if (entity.type === "finish") {
    ctx.fillStyle = "#44efff"; ctx.fillRect(x, gameState.groundY - 180, 20, 180); ctx.fillStyle = "#ffe768";
    ctx.beginPath(); ctx.moveTo(x + 20, gameState.groundY - 180); ctx.lineTo(x + entity.width, gameState.groundY - 136); ctx.lineTo(x + 20, gameState.groundY - 100); ctx.closePath(); ctx.fill();
  }
}

function drawPlayer() {
  const player = gameState.player;
  const x = player.x - gameState.cameraX;
  const y = player.y;
  const chosen = uiState.selectedCharacter;
  ctx.save();
  if (player.transformFlash > 0) { ctx.shadowBlur = 20; ctx.shadowColor = chosen.color; }
  if (player.form === "vehicle") {
    ctx.fillStyle = chosen.color;
    ctx.fillRect(x, y + 26, player.width, player.height - 26);
    ctx.fillStyle = chosen.accent;
    ctx.fillRect(x + 16, y + 8, player.width - 34, 28);
    ctx.fillStyle = "#111827";
    ctx.beginPath(); ctx.arc(x + 24, y + player.height - 4, 12, 0, Math.PI * 2); ctx.arc(x + player.width - 24, y + player.height - 4, 12, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = chosen.color;
    ctx.fillRect(x + 18, y + 18, player.width - 36, 44);
    ctx.fillRect(x + 8, y + 58, player.width - 16, 52);
    ctx.fillStyle = chosen.accent;
    ctx.fillRect(x + 24, y, player.width - 48, 28);
    ctx.fillRect(x, y + 52, 18, 56);
    ctx.fillRect(x + player.width - 18, y + 52, 18, 56);
    ctx.fillRect(x + 18, y + 98, 20, 34);
    ctx.fillRect(x + player.width - 38, y + 98, 20, 34);
  }
  ctx.restore();
}

function drawParticles() {
  gameState.particles.forEach((particle) => {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.beginPath();
    ctx.arc(particle.x - gameState.cameraX, particle.y, particle.projectile ? 10 : 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function render() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);
  drawBackground(width, height);
  drawGround(width, height);
  gameState.entities.forEach(drawEntity);
  drawParticles();
  if (gameState.player) drawPlayer();
}

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;
  if (gameState.running) updateGame(dt, now);
  if (uiState.screen === "game") render();
  requestAnimationFrame(loop);
}

document.getElementById("playButton").addEventListener("click", () => { ensureAudio(); startGame(uiState.tutorialComplete ? "main" : "tutorial"); });
document.getElementById("openRosterButton").addEventListener("click", () => { setScreen("roster"); speak("Elige tu robot"); });
document.getElementById("rosterBackButton").addEventListener("click", () => setScreen("home"));
document.getElementById("selectCharacterButton").addEventListener("click", () => { setScreen("home"); speak("Listo"); });
document.getElementById("rosterPrev").addEventListener("click", () => {
  const current = characters.findIndex((item) => item.id === uiState.selectedCharacter.id);
  selectCharacter((current + characters.length - 1) % characters.length);
});
document.getElementById("rosterNext").addEventListener("click", () => {
  const current = characters.findIndex((item) => item.id === uiState.selectedCharacter.id);
  selectCharacter((current + 1) % characters.length);
});
document.getElementById("playAgainButton").addEventListener("click", () => startGame("main"));
document.getElementById("homeButton").addEventListener("click", () => { setScreen("home"); clearHighlights(); setDemoHint(""); });
soundToggle.addEventListener("click", () => {
  audioState.enabled = !audioState.enabled;
  soundToggle.textContent = audioState.enabled ? "🔊" : "◔";
  if (!audioState.enabled) {
    window.speechSynthesis.cancel();
  } else {
    ensureAudio();
  }
});

pointerAction(jumpButton, handleJump);
pointerAction(transformButton, handleTransform);
window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp") handleJump();
  if (event.code === "ShiftLeft" || event.code === "ShiftRight" || event.code === "ArrowDown") handleTransform();
});
window.addEventListener("resize", resizeCanvas);

renderCharacterCards();
updateHeroClasses();
setupStandaloneMode();
setupInstallPrompt();
registerServiceWorker();
resizeCanvas();
requestAnimationFrame(loop);
