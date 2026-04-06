const characters = [
  {
    id: 'orion',
    name: 'Orion Pax',
    description: 'Equilibrado y fácil de controlar. El mejor punto de partida.',
    tags: ['Balanceado', 'Salto medio', 'Control seguro'],
    themeClass: 'theme-orion',
    cssVars: {
      '--robot-head': 'linear-gradient(180deg, #ff8a76, #4b7fff)',
      '--robot-body': 'linear-gradient(180deg, #4b7fff, #233f78)',
      '--vehicle-body': 'linear-gradient(180deg, #4b7fff, #1a2e57)',
      '--vehicle-cabin': 'linear-gradient(180deg, #ff8a76, #4b7fff)'
    },
    palette: { main: '#4b7fff', accent: '#ff8a76', dark: '#203454' },
    robotSpeed: 290,
    vehicleSpeed: 370,
    jumpPower: 760
  },
  {
    id: 'bee',
    name: 'Bumblebee',
    description: 'El más rápido en modo vehículo. Ideal para niños inquietos.',
    tags: ['Muy rápido', 'Ágil', 'Vehículo veloz'],
    themeClass: 'theme-bee',
    cssVars: {
      '--robot-head': 'linear-gradient(180deg, #ffe35d, #2e3547)',
      '--robot-body': 'linear-gradient(180deg, #ffd84d, #705516)',
      '--vehicle-body': 'linear-gradient(180deg, #ffd84d, #775710)',
      '--vehicle-cabin': 'linear-gradient(180deg, #2e3547, #ffd84d)'
    },
    palette: { main: '#ffd84d', accent: '#2e3547', dark: '#5b4410' },
    robotSpeed: 305,
    vehicleSpeed: 420,
    jumpPower: 730
  },
  {
    id: 'elita',
    name: 'Elita-1',
    description: 'Salta más alto y se siente ligera en el aire.',
    tags: ['Salto alto', 'Precisa', 'Aérea'],
    themeClass: 'theme-elita',
    cssVars: {
      '--robot-head': 'linear-gradient(180deg, #ff8bc7, #8c79ff)',
      '--robot-body': 'linear-gradient(180deg, #ff7fc0, #5b46b8)',
      '--vehicle-body': 'linear-gradient(180deg, #ff7fc0, #5b46b8)',
      '--vehicle-cabin': 'linear-gradient(180deg, #ffe3ef, #8c79ff)'
    },
    palette: { main: '#ff7fc0', accent: '#8c79ff', dark: '#4d3f7d' },
    robotSpeed: 286,
    vehicleSpeed: 360,
    jumpPower: 820
  },
  {
    id: 'd16',
    name: 'D-16',
    description: 'Más pesado, menos nervioso. Muy estable para controlar.',
    tags: ['Robusto', 'Estable', 'Perdona errores'],
    themeClass: 'theme-d16',
    cssVars: {
      '--robot-head': 'linear-gradient(180deg, #d8dfeb, #5f697d)',
      '--robot-body': 'linear-gradient(180deg, #bec8d8, #4a566b)',
      '--vehicle-body': 'linear-gradient(180deg, #bec8d8, #4a566b)',
      '--vehicle-cabin': 'linear-gradient(180deg, #ffffff, #747f93)'
    },
    palette: { main: '#bec8d8', accent: '#5f697d', dark: '#30384a' },
    robotSpeed: 268,
    vehicleSpeed: 338,
    jumpPower: 710
  }
];

const screens = {
  home: document.getElementById('homeScreen'),
  roster: document.getElementById('rosterScreen'),
  game: document.getElementById('gameScreen'),
  reward: document.getElementById('rewardScreen')
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const voiceBubble = document.getElementById('voiceBubble');
const goalLabel = document.getElementById('goalLabel');
const energyCount = document.getElementById('energyCount');
const starCount = document.getElementById('starCount');
const botCount = document.getElementById('botCount');
const formIndicator = document.getElementById('formIndicator');
const rewardLoot = document.getElementById('rewardLoot');
const carousel = document.getElementById('characterCarousel');
const soundToggle = document.getElementById('soundToggle');
const installButton = document.getElementById('installButton');
const heroName = document.getElementById('heroName');
const heroDescription = document.getElementById('heroDescription');
const heroStats = document.getElementById('heroStats');

const previewNodes = [
  [document.getElementById('heroRobot'), document.getElementById('heroVehicle')],
  [document.getElementById('rewardRobot'), document.getElementById('rewardVehicle')]
];

const uiState = {
  selectedCharacter: characters[0],
  screen: 'home'
};

const audioState = {
  enabled: true
};

const gameState = {
  running: false,
  completed: false,
  energy: 0,
  stars: 0,
  bots: 0,
  levelName: 'Ruta Neon',
  cameraX: 0,
  worldWidth: 6200,
  groundY: 0,
  lastTime: 0,
  currentHint: '',
  currentHintAt: 0,
  player: null,
  entities: [],
  keys: { left: false, right: false },
  tutorialStep: 0,
  checkpoints: [120],
  activeCheckpoint: 120
};

const tutorialSteps = [
  { x: 0, text: 'Usa los botones azules para moverte. Tú decides cuándo avanzar.' },
  { x: 520, text: 'La caja roja se supera saltando.' },
  { x: 1220, text: 'El hueco azul exige saltar antes del borde.' },
  { x: 2120, text: 'El túnel amarillo solo se cruza en modo vehículo.' },
  { x: 3440, text: 'La meta verde está al final. Sigue avanzando.' }
];

function savePrefs() {
  localStorage.setItem('cyberBotsXPrefs', JSON.stringify({
    characterId: uiState.selectedCharacter.id,
    audio: audioState.enabled
  }));
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem('cyberBotsXPrefs');
    if (!raw) return;
    const prefs = JSON.parse(raw);
    const found = characters.find((c) => c.id === prefs.characterId);
    if (found) uiState.selectedCharacter = found;
    if (typeof prefs.audio === 'boolean') audioState.enabled = prefs.audio;
  } catch {
    // ignore corrupted prefs
  }
}

function setScreen(name) {
  Object.entries(screens).forEach(([key, node]) => node.classList.toggle('active', key === name));
  uiState.screen = name;
}

function updatePreviewTheme() {
  const c = uiState.selectedCharacter;
  heroName.textContent = c.name;
  heroDescription.textContent = c.description;
  heroStats.innerHTML = [
    `<span class="stat-chip">Velocidad ${Math.round(c.vehicleSpeed)}</span>`,
    `<span class="stat-chip">Salto ${Math.round(c.jumpPower)}</span>`
  ].join('');

  document.querySelectorAll('.hero-stage, .reward-shell, .character-card').forEach((node) => {
    // passive theme handled inside child previews
  });

  previewNodes.forEach(([robot, vehicle]) => applyTheme(robot, vehicle, c));
  soundToggle.textContent = audioState.enabled ? '🔊' : '🔈';
  savePrefs();
}

function applyTheme(robotNode, vehicleNode, character) {
  if (!robotNode || !vehicleNode) return;
  [robotNode, vehicleNode].forEach((node) => {
    Object.entries(character.cssVars).forEach(([key, value]) => node.style.setProperty(key, value));
  });
}

function renderRoster() {
  carousel.innerHTML = '';
  characters.forEach((character) => {
    const card = document.createElement('button');
    card.className = `character-card ${uiState.selectedCharacter.id === character.id ? 'selected' : ''}`;
    card.innerHTML = `
      <div class="card-preview">
        <div class="preview-lane"></div>
        <div class="hero-robot"></div>
        <div class="hero-vehicle"></div>
      </div>
      <div class="card-copy">
        <h3>${character.name}</h3>
        <p>${character.description}</p>
        <div class="tag-row">${character.tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}</div>
      </div>`;
    const [robotNode, vehicleNode] = card.querySelectorAll('.hero-robot, .hero-vehicle');
    applyTheme(robotNode, vehicleNode, character);
    card.addEventListener('click', () => {
      uiState.selectedCharacter = character;
      renderRoster();
      updatePreviewTheme();
    });
    carousel.appendChild(card);
  });
}

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const bottomPad = Math.max(92, height * 0.16);
  gameState.groundY = Math.max(230, height - bottomPad);
}

function createPlayer() {
  const c = uiState.selectedCharacter;
  return {
    x: gameState.activeCheckpoint,
    y: gameState.groundY - 108,
    width: 84,
    height: 108,
    vx: 0,
    vy: 0,
    onGround: true,
    form: 'robot',
    morph: 0,
    targetMorph: 0,
    character: c,
    transformCooldown: 0,
    lastSafeX: gameState.activeCheckpoint,
    facing: 1,
    wheelSpin: 0
  };
}

function setPlayerForm(form) {
  const player = gameState.player;
  if (!player || player.form === form) return;
  player.form = form;
  player.targetMorph = form === 'vehicle' ? 1 : 0;
  formIndicator.textContent = form === 'vehicle' ? 'Modo Vehículo' : 'Modo Robot';
}

function toggleTransform() {
  const player = gameState.player;
  if (!player || player.transformCooldown > 0) return;
  setPlayerForm(player.form === 'robot' ? 'vehicle' : 'robot');
  player.transformCooldown = 0.26;
}

function speak(text, force = false) {
  if (!force && gameState.currentHint === text && performance.now() - gameState.currentHintAt < 1600) return;
  voiceBubble.textContent = text;
  gameState.currentHint = text;
  gameState.currentHintAt = performance.now();
  if (!audioState.enabled || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-CL';
  utterance.rate = 0.96;
  utterance.pitch = 1.04;
  window.speechSynthesis.speak(utterance);
}

function updateHud() {
  energyCount.textContent = String(gameState.energy);
  starCount.textContent = String(gameState.stars);
  botCount.textContent = String(gameState.bots);
}

function makeCheckpoint(x, label) {
  return { type: 'checkpoint', x, y: gameState.groundY - 120, w: 32, h: 120, label, activated: false };
}

function buildLevel() {
  return [
    { type: 'pickup', x: 370, y: gameState.groundY - 180, w: 34, h: 34, label: '⚡', taken: false },
    { type: 'crate', x: 620, y: gameState.groundY - 86, w: 84, h: 86, label: 'SALTA' },
    makeCheckpoint(860, 'CP'),
    { type: 'gap', x: 1210, y: gameState.groundY, w: 170, h: 260, label: 'HUECO' },
    { type: 'pickup', x: 1470, y: gameState.groundY - 180, w: 34, h: 34, label: '⚡', taken: false },
    { type: 'platform', x: 1640, y: gameState.groundY - 92, w: 220, h: 18 },
    { type: 'bot', x: 1728, y: gameState.groundY - 144, w: 44, h: 44, rescued: false, label: 'BOT' },
    makeCheckpoint(1890, 'CP'),
    { type: 'tunnel', x: 2140, y: gameState.groundY - 74, w: 320, h: 74, label: 'VEHÍCULO' },
    { type: 'pickup', x: 2530, y: gameState.groundY - 180, w: 34, h: 34, label: '⚡', taken: false },
    { type: 'platform', x: 2720, y: gameState.groundY - 136, w: 210, h: 18 },
    { type: 'crate', x: 3000, y: gameState.groundY - 72, w: 72, h: 72, label: 'SALTA' },
    makeCheckpoint(3190, 'CP'),
    { type: 'gap', x: 3530, y: gameState.groundY, w: 200, h: 260, label: 'HUECO' },
    { type: 'platform', x: 3790, y: gameState.groundY - 120, w: 240, h: 18 },
    { type: 'pickup', x: 3884, y: gameState.groundY - 172, w: 34, h: 34, label: '⚡', taken: false },
    { type: 'bot', x: 3938, y: gameState.groundY - 172, w: 44, h: 44, rescued: false, label: 'BOT' },
    { type: 'crate', x: 4290, y: gameState.groundY - 108, w: 92, h: 108, label: 'SALTA' },
    makeCheckpoint(4520, 'CP'),
    { type: 'tunnel', x: 4840, y: gameState.groundY - 72, w: 280, h: 72, label: 'VEHÍCULO' },
    { type: 'goal', x: 5700, y: gameState.groundY - 180, w: 76, h: 180, label: 'META' }
  ];
}

function resetGame() {
  gameState.running = true;
  gameState.completed = false;
  gameState.energy = 0;
  gameState.stars = 0;
  gameState.bots = 0;
  gameState.cameraX = 0;
  gameState.tutorialStep = 0;
  gameState.activeCheckpoint = 120;
  gameState.entities = buildLevel();
  gameState.player = createPlayer();
  gameState.lastTime = 0;
  updateHud();
  goalLabel.textContent = `Objetivo: llega a la meta verde en ${gameState.levelName}`;
  formIndicator.textContent = 'Modo Robot';
  speak('Usa los botones azules para moverte. Tú decides cuándo avanzar.', true);
}

function jump() {
  const player = gameState.player;
  if (!player || !player.onGround) return;
  const modifier = player.form === 'vehicle' ? 0.82 : 1;
  player.vy = -player.character.jumpPower * modifier;
  player.onGround = false;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function getFloorYAt(xCenter) {
  let floorY = gameState.groundY;
  for (const entity of gameState.entities) {
    if (entity.type === 'gap' && xCenter >= entity.x && xCenter <= entity.x + entity.w) floorY = Infinity;
    if (entity.type === 'platform' && xCenter >= entity.x && xCenter <= entity.x + entity.w) floorY = Math.min(floorY, entity.y);
    if (entity.type === 'crate' && xCenter >= entity.x && xCenter <= entity.x + entity.w) floorY = Math.min(floorY, entity.y);
  }
  return floorY;
}

function getObstacleRects() {
  return gameState.entities.filter((e) => e.type === 'crate').map((e) => ({ x: e.x, y: e.y, w: e.w, h: e.h }));
}

function failAndRespawn(message) {
  const player = gameState.player;
  player.x = gameState.activeCheckpoint;
  player.y = gameState.groundY - 108;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.width = 84;
  player.height = 108;
  player.morph = 0;
  player.targetMorph = 0;
  player.form = 'robot';
  formIndicator.textContent = 'Modo Robot';
  speak(message, true);
}

function updateTutorialHints(playerX) {
  const step = tutorialSteps[gameState.tutorialStep];
  if (!step) return;
  if (playerX >= step.x) {
    speak(step.text, true);
    gameState.tutorialStep += 1;
  }
}

function activateCheckpoint(entity) {
  if (entity.activated) return;
  entity.activated = true;
  gameState.activeCheckpoint = entity.x;
  speak('Guardado. Si fallas, reapareces aquí.');
}

function applyMorph(player, dt) {
  const rate = 7.8;
  player.morph += (player.targetMorph - player.morph) * Math.min(1, dt * rate);
  const t = player.morph;
  player.width = 84 + (126 - 84) * t;
  player.height = 108 + (62 - 108) * t;
}

function update(dt) {
  const player = gameState.player;
  if (!player) return;

  updateTutorialHints(player.x);
  player.transformCooldown = Math.max(0, player.transformCooldown - dt);
  applyMorph(player, dt);

  const speed = player.form === 'vehicle' ? player.character.vehicleSpeed : player.character.robotSpeed;
  const input = (gameState.keys.right ? 1 : 0) - (gameState.keys.left ? 1 : 0);
  player.vx = input * speed;
  if (input !== 0) player.facing = input;
  player.wheelSpin += (player.form === 'vehicle' ? player.vx : player.vx * 0.25) * dt * 0.06;

  const prevX = player.x;
  const prevY = player.y;
  player.x += player.vx * dt;

  for (const box of getObstacleRects()) {
    const nextRect = { x: player.x, y: player.y, w: player.width, h: player.height };
    if (!rectsOverlap(nextRect, box)) continue;
    const wasLeft = prevX + player.width <= box.x + 2;
    const wasRight = prevX >= box.x + box.w - 2;
    if (wasLeft) player.x = box.x - player.width - 0.5;
    if (wasRight) player.x = box.x + box.w + 0.5;
  }

  player.vy += 1880 * dt;
  player.y += player.vy * dt;

  const footCenter = player.x + player.width * 0.5;
  const floorY = getFloorYAt(footCenter);
  const wasAboveFloor = prevY + player.height <= floorY + 2;
  if (player.vy >= 0 && wasAboveFloor && player.y + player.height >= floorY) {
    player.y = floorY - player.height;
    player.vy = 0;
    player.onGround = floorY !== Infinity;
  } else {
    player.onGround = false;
  }

  if (player.y > canvas.clientHeight + 260 || player.x < 0) {
    failAndRespawn('Fallaste. Salta un poco antes del borde.');
    return;
  }

  const playerRect = { x: player.x, y: player.y, w: player.width, h: player.height };

  for (const entity of gameState.entities) {
    if (entity.type === 'pickup' && !entity.taken && rectsOverlap(playerRect, entity)) {
      entity.taken = true;
      gameState.energy += 1;
      gameState.stars = Math.max(1, Math.ceil(gameState.energy / 2));
      updateHud();
    }

    if (entity.type === 'bot' && !entity.rescued && rectsOverlap(playerRect, entity)) {
      entity.rescued = true;
      gameState.bots += 1;
      updateHud();
      speak('Rescataste un mini bot.');
    }

    if (entity.type === 'checkpoint' && rectsOverlap(playerRect, entity)) activateCheckpoint(entity);

    if (entity.type === 'tunnel' && playerRect.x + playerRect.w > entity.x && playerRect.x < entity.x + entity.w) {
      const enteringRoof = playerRect.y < entity.y + 6;
      if (player.form !== 'vehicle' || enteringRoof) {
        failAndRespawn('El túnel amarillo se cruza en modo vehículo.');
        return;
      }
    }

    if (entity.type === 'goal' && rectsOverlap(playerRect, entity)) {
      finishLevel();
      return;
    }
  }

  if (player.onGround && getFloorYAt(player.x + player.width * 0.5) !== Infinity) {
    player.lastSafeX = player.x;
  }

  gameState.cameraX = clamp(player.x - canvas.clientWidth * 0.35, 0, gameState.worldWidth - canvas.clientWidth);
}

function finishLevel() {
  if (gameState.completed) return;
  gameState.completed = true;
  gameState.running = false;
  const totalStars = Math.max(1, gameState.stars);
  rewardLoot.innerHTML = [
    `<span class="reward-pill">⚡ Energón: ${gameState.energy}</span>`,
    `<span class="reward-pill">★ Estrellas: ${totalStars}</span>`,
    `<span class="reward-pill">🤖 Mini bots: ${gameState.bots}</span>`
  ].join('');
  setTimeout(() => setScreen('reward'), 220);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function drawBackground(viewWidth, viewHeight) {
  const sky = ctx.createLinearGradient(0, 0, 0, viewHeight);
  sky.addColorStop(0, '#223f84');
  sky.addColorStop(0.45, '#102343');
  sky.addColorStop(1, '#06101d');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  for (let i = 0; i < 3; i += 1) {
    const parallax = 0.08 + i * 0.08;
    ctx.fillStyle = i === 0 ? 'rgba(100,130,190,0.18)' : i === 1 ? 'rgba(65,95,150,0.22)' : 'rgba(30,55,92,0.4)';
    ctx.beginPath();
    const offset = -(gameState.cameraX * parallax) % (viewWidth + 300);
    ctx.moveTo(offset - 240, viewHeight);
    for (let x = offset - 240; x < viewWidth + 320; x += 180) {
      const peakY = viewHeight - 220 - i * 40 - ((x / 180) % 2 === 0 ? 20 : 80);
      ctx.lineTo(x + 90, peakY);
      ctx.lineTo(x + 180, viewHeight);
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = '#15283f';
  ctx.fillRect(0, gameState.groundY, viewWidth, viewHeight - gameState.groundY);
  ctx.fillStyle = '#1c5570';
  ctx.fillRect(0, gameState.groundY - 18, viewWidth, 18);

  ctx.fillStyle = 'rgba(71,229,255,0.08)';
  for (let i = 0; i < 12; i += 1) {
    const x = ((i * 240) - (gameState.cameraX * 0.14)) % (viewWidth + 240) - 60;
    ctx.fillRect(x, 130 + (i % 4) * 28, 120, viewHeight - 280);
  }
}

function drawSign(x, y, text, fill) {
  ctx.font = '900 15px Inter, sans-serif';
  const width = Math.max(88, ctx.measureText(text).width + 24);
  ctx.fillStyle = 'rgba(6,14,29,0.9)';
  ctx.fillRect(x, y, width, 34);
  ctx.strokeStyle = fill;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, 34);
  ctx.fillStyle = fill;
  ctx.fillText(text, x + 12, y + 22);
}

function drawEntity(entity) {
  const x = entity.x - gameState.cameraX;
  if (x > canvas.clientWidth + 260 || x < -260) return;

  if (entity.type === 'crate') {
    ctx.fillStyle = '#ff655f';
    ctx.fillRect(x, entity.y, entity.w, entity.h);
    ctx.fillStyle = '#ff9b95';
    ctx.fillRect(x + 6, entity.y + 6, entity.w - 12, 12);
    ctx.fillRect(x + 6, entity.y + 24, entity.w - 12, 8);
    drawSign(x - 8, entity.y - 46, entity.label, '#ffd7d4');
  }

  if (entity.type === 'gap') {
    ctx.fillStyle = '#062a63';
    ctx.fillRect(x, gameState.groundY, entity.w, 280);
    const shimmer = (Math.sin(performance.now() / 260) + 1) * 0.5;
    ctx.fillStyle = `rgba(71,229,255,${0.18 + shimmer * 0.16})`;
    ctx.fillRect(x, gameState.groundY + 18, entity.w, 22);
    ctx.fillRect(x + 18, gameState.groundY + 60, entity.w - 36, 12);
    drawSign(x + 12, gameState.groundY - 46, entity.label, '#8dedff');
  }

  if (entity.type === 'platform') {
    ctx.fillStyle = '#5b6eff';
    ctx.fillRect(x, entity.y, entity.w, entity.h);
    ctx.fillStyle = '#c1caff';
    ctx.fillRect(x, entity.y, entity.w, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x + 8, entity.y + 8, entity.w - 16, 8);
  }

  if (entity.type === 'tunnel') {
    ctx.fillStyle = '#ffd84d';
    ctx.fillRect(x, entity.y, entity.w, entity.h);
    ctx.fillStyle = '#0a1323';
    ctx.fillRect(x + 20, entity.y + 8, entity.w - 40, entity.h - 8);
    ctx.fillStyle = '#ffd84d';
    ctx.fillRect(x + entity.w - 64, entity.y + 16, 36, 18);
    drawSign(x + 10, entity.y - 46, entity.label, '#fff3a2');
  }

  if (entity.type === 'pickup' && !entity.taken) {
    const t = performance.now() / 340;
    ctx.save();
    ctx.translate(x + entity.w / 2, entity.y + entity.h / 2 + Math.sin(t) * 5);
    ctx.rotate(t * 0.8);
    ctx.fillStyle = '#47e5ff';
    ctx.beginPath();
    for (let i = 0; i < 4; i += 1) {
      ctx.lineTo(Math.cos(i * Math.PI / 2) * 17, Math.sin(i * Math.PI / 2) * 17);
      ctx.lineTo(Math.cos((i + 0.5) * Math.PI / 2) * 8, Math.sin((i + 0.5) * Math.PI / 2) * 8);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  if (entity.type === 'bot' && !entity.rescued) {
    ctx.fillStyle = '#aaf0ff';
    ctx.fillRect(x, entity.y, entity.w, entity.h);
    ctx.fillStyle = '#05101f';
    ctx.fillRect(x + 8, entity.y + 8, entity.w - 16, 10);
    ctx.fillRect(x + 10, entity.y + 22, 7, 14);
    ctx.fillRect(x + entity.w - 17, entity.y + 22, 7, 14);
    drawSign(x - 6, entity.y - 40, entity.label, '#aaf0ff');
  }

  if (entity.type === 'checkpoint') {
    ctx.fillStyle = entity.activated ? '#39e096' : '#47e5ff';
    ctx.fillRect(x, entity.y, entity.w, entity.h);
    ctx.fillStyle = entity.activated ? '#dffff0' : '#dffaff';
    ctx.fillRect(x + 6, entity.y + 8, entity.w - 12, 18);
    drawSign(x - 12, entity.y - 40, entity.activated ? 'GUARDADO' : entity.label, entity.activated ? '#9effcc' : '#8dedff');
  }

  if (entity.type === 'goal') {
    ctx.fillStyle = '#39e096';
    ctx.fillRect(x, entity.y, entity.w, entity.h);
    ctx.fillStyle = '#e9fff4';
    ctx.fillRect(x + 10, entity.y + 12, entity.w - 20, entity.h - 24);
    drawSign(x - 4, entity.y - 46, entity.label, '#9effcc');
  }
}

function drawPlayer(player) {
  const x = player.x - gameState.cameraX;
  const y = player.y;
  const t = player.morph;
  const colors = player.character.palette;
  const robotAlpha = 1 - t * 0.95;
  const vehicleAlpha = 0.2 + t * 0.8;

  if (robotAlpha > 0.02) {
    ctx.save();
    ctx.globalAlpha = robotAlpha;
    ctx.translate(x + player.width / 2, y + player.height / 2);
    ctx.scale(player.facing < 0 ? -1 : 1, 1);
    ctx.translate(-(x + player.width / 2), -(y + player.height / 2));

    const legSwing = player.onGround ? Math.sin(performance.now() / 100) * Math.min(8, Math.abs(player.vx) * 0.025) : 0;
    ctx.fillStyle = colors.dark;
    ctx.fillRect(x + 10, y + 38, 12, 54);
    ctx.fillRect(x + 62, y + 38, 12, 54);
    ctx.fillRect(x + 24, y + 90, 12, 18 + legSwing * 0.2);
    ctx.fillRect(x + 48, y + 90, 12, 18 - legSwing * 0.2);
    ctx.fillStyle = colors.main;
    ctx.fillRect(x + 18, y + 30, 48, 58);
    ctx.fillStyle = colors.accent;
    ctx.fillRect(x + 22, y + 6, 40, 34);
    ctx.fillStyle = '#cafaff';
    ctx.fillRect(x + 30, y + 18, 8, 6);
    ctx.fillRect(x + 46, y + 18, 8, 6);
    ctx.fillStyle = colors.dark;
    ctx.fillRect(x + 4, y + 42, 12, 42);
    ctx.fillRect(x + 68, y + 42, 12, 42);
    ctx.restore();
  }

  if (vehicleAlpha > 0.02) {
    ctx.save();
    ctx.globalAlpha = vehicleAlpha;
    ctx.translate(x + player.width / 2, y + player.height / 2);
    ctx.scale(player.facing < 0 ? -1 : 1, 1);
    ctx.translate(-(x + player.width / 2), -(y + player.height / 2));

    const baseY = y + 26;
    ctx.fillStyle = colors.main;
    ctx.fillRect(x + 10, baseY, 100, 28);
    ctx.fillRect(x + 34, baseY - 16, 44, 20);
    ctx.fillStyle = colors.accent;
    ctx.fillRect(x + 82, baseY + 6, 22, 12);
    ctx.fillStyle = '#dffaff';
    ctx.fillRect(x + 42, baseY - 12, 20, 10);
    drawWheel(x + 30, baseY + 34, player.wheelSpin);
    drawWheel(x + 88, baseY + 34, player.wheelSpin);
    ctx.restore();
  }
}

function drawWheel(x, y, spin) {
  ctx.fillStyle = '#222a38';
  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8c95ac';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#8c95ac';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i += 1) {
    const a = spin + i * Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8);
    ctx.stroke();
  }
}

function render() {
  const viewWidth = canvas.clientWidth;
  const viewHeight = canvas.clientHeight;
  drawBackground(viewWidth, viewHeight);
  gameState.entities.forEach(drawEntity);
  if (gameState.player) drawPlayer(gameState.player);
}

function loop(timestamp) {
  if (!gameState.lastTime) gameState.lastTime = timestamp;
  const dt = Math.min((timestamp - gameState.lastTime) / 1000, 0.032);
  gameState.lastTime = timestamp;
  if (gameState.running) {
    update(dt);
    render();
  }
  requestAnimationFrame(loop);
}

function bindHold(button, key) {
  const start = (event) => {
    event.preventDefault();
    gameState.keys[key] = true;
  };
  const stop = (event) => {
    event.preventDefault();
    gameState.keys[key] = false;
  };
  button.addEventListener('pointerdown', start);
  button.addEventListener('pointerup', stop);
  button.addEventListener('pointerleave', stop);
  button.addEventListener('pointercancel', stop);
}

function setupButtons() {
  document.getElementById('playButton').addEventListener('click', () => {
    setScreen('game');
    resetGame();
  });
  document.getElementById('openRosterButton').addEventListener('click', () => setScreen('roster'));
  document.getElementById('rosterBackButton').addEventListener('click', () => setScreen('home'));
  document.getElementById('selectCharacterButton').addEventListener('click', () => setScreen('home'));
  document.getElementById('playAgainButton').addEventListener('click', () => {
    setScreen('game');
    resetGame();
  });
  document.getElementById('homeButton').addEventListener('click', () => setScreen('home'));
  document.getElementById('jumpButton').addEventListener('click', jump);
  document.getElementById('transformButton').addEventListener('click', toggleTransform);

  bindHold(document.getElementById('leftButton'), 'left');
  bindHold(document.getElementById('rightButton'), 'right');

  soundToggle.addEventListener('click', () => {
    audioState.enabled = !audioState.enabled;
    if (!audioState.enabled && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    updatePreviewTheme();
  });
}

function setupKeyboard() {
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key === 'arrowleft' || key === 'a') gameState.keys.left = true;
    if (key === 'arrowright' || key === 'd') gameState.keys.right = true;
    if (event.key === 'ArrowUp' || event.key === ' ') {
      event.preventDefault();
      jump();
    }
    if (event.key === 'ArrowDown' || key === 's' || key === 't') {
      event.preventDefault();
      toggleTransform();
    }
  });

  window.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'arrowleft' || key === 'a') gameState.keys.left = false;
    if (key === 'arrowright' || key === 'd') gameState.keys.right = false;
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

function setupInstallPrompt() {
  let deferredInstallPrompt = null;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton.classList.add('show-install');
  });
  installButton.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice.catch(() => null);
    deferredInstallPrompt = null;
    installButton.classList.remove('show-install');
  });
}

function init() {
  loadPrefs();
  resizeCanvas();
  renderRoster();
  updatePreviewTheme();
  setupButtons();
  setupKeyboard();
  setupInstallPrompt();
  registerServiceWorker();
  window.addEventListener('resize', () => {
    resizeCanvas();
    if (gameState.running) {
      const player = gameState.player;
      if (player) {
        player.y = Math.min(player.y, gameState.groundY - player.height);
        goalLabel.textContent = `Objetivo: llega a la meta verde en ${gameState.levelName}`;
      }
    }
  });
  loop(0);
}

init();
