const characters = [
  {
    id: 'orion',
    name: 'Orion Pax',
    css: 'hero-orion',
    colors: { main: '#497cff', accent: '#ff6d5f', dark: '#1c295a' },
    description: 'Equilibrado. Ideal para aprender.',
    tags: ['Balanceado', 'Salto medio', 'Velocidad media'],
    robotSpeed: 280,
    vehicleSpeed: 360,
    jumpPower: 720
  },
  {
    id: 'bee',
    name: 'Bumblebee',
    css: 'hero-bumblebee',
    colors: { main: '#ffd84d', accent: '#2d3240', dark: '#1d2230' },
    description: 'El más rápido sobre ruedas.',
    tags: ['Muy rápido', 'Salto medio', 'Ágil'],
    robotSpeed: 300,
    vehicleSpeed: 410,
    jumpPower: 700
  },
  {
    id: 'elita',
    name: 'Elita-1',
    css: 'hero-elita',
    colors: { main: '#ff7aba', accent: '#6d63ff', dark: '#30285d' },
    description: 'Salta más alto y controla mejor el aire.',
    tags: ['Salto alto', 'Precisa', 'Segura'],
    robotSpeed: 285,
    vehicleSpeed: 350,
    jumpPower: 780
  },
  {
    id: 'd16',
    name: 'D-16',
    css: 'hero-d16',
    colors: { main: '#bec6d9', accent: '#586173', dark: '#2d3444' },
    description: 'Pesado, firme y fácil de controlar.',
    tags: ['Robusto', 'Estable', 'Salto corto'],
    robotSpeed: 260,
    vehicleSpeed: 330,
    jumpPower: 680
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
const homeHeroCard = document.getElementById('homeHeroCard');
const rewardHero = document.getElementById('rewardHero');
const soundToggle = document.getElementById('soundToggle');
const installButton = document.getElementById('installButton');

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
  cameraX: 0,
  worldWidth: 4300,
  groundY: 0,
  lastTime: 0,
  currentHint: '',
  player: null,
  entities: [],
  keys: { left: false, right: false },
  tutorialIndex: 0,
  tutorialDone: false
};

const tutorialSteps = [
  { when: () => true, text: 'Muévete con los botones azules. Avanza a la derecha.', once: true },
  { when: () => gameState.player && gameState.player.x > 240, text: 'Caja roja: salta para pasar.', once: true },
  { when: () => gameState.player && gameState.player.x > 900, text: 'Hueco azul: salta antes del borde.', once: true },
  { when: () => gameState.player && gameState.player.x > 1650, text: 'Túnel amarillo: transfórmate en vehículo para entrar.', once: true },
  { when: () => gameState.player && gameState.player.x > 2600, text: 'Meta verde: llega hasta ahí.', once: true }
];

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  gameState.groundY = height - 130;
}

function setScreen(name) {
  Object.entries(screens).forEach(([key, node]) => node.classList.toggle('active', key === name));
  uiState.screen = name;
}

function speak(text) {
  voiceBubble.textContent = text;
  gameState.currentHint = text;
  if (!audioState.enabled) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-CL';
  utterance.rate = 0.97;
  utterance.pitch = 1.05;
  window.speechSynthesis.speak(utterance);
}

function renderRoster() {
  carousel.innerHTML = '';
  characters.forEach((character) => {
    const card = document.createElement('button');
    card.className = `character-card ${uiState.selectedCharacter.id === character.id ? 'selected' : ''}`;
    card.innerHTML = `
      <div class="card-hero ${character.css}">
        <div class="robot-swatch">
          <div class="robot-head"></div>
          <div class="robot-body"></div>
        </div>
        <div class="vehicle-swatch"></div>
      </div>
      <div class="card-copy">
        <h3>${character.name}</h3>
        <p>${character.description}</p>
        <div class="tag-row">${character.tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}</div>
      </div>`;
    card.addEventListener('click', () => {
      uiState.selectedCharacter = character;
      homeHeroCard.className = `home-hero-card ${character.css}`;
      rewardHero.className = `reward-hero ${character.css}`;
      renderRoster();
    });
    carousel.appendChild(card);
  });
}

function createPlayer() {
  const c = uiState.selectedCharacter;
  return {
    x: 120,
    y: gameState.groundY - 108,
    width: 86,
    height: 108,
    vx: 0,
    vy: 0,
    onGround: true,
    form: 'robot',
    character: c,
    transformCooldown: 0,
    spawnedAt: 120
  };
}

function setPlayerForm(form) {
  const player = gameState.player;
  if (!player || player.form === form) return;
  player.form = form;
  if (form === 'vehicle') {
    player.width = 128;
    player.height = 62;
    player.y = Math.min(player.y + 46, gameState.groundY - player.height);
    formIndicator.textContent = 'Modo Vehículo';
  } else {
    player.width = 86;
    player.height = 108;
    player.y = Math.min(player.y, gameState.groundY - player.height);
    formIndicator.textContent = 'Modo Robot';
  }
}

function toggleTransform() {
  const player = gameState.player;
  if (!player || player.transformCooldown > 0) return;
  setPlayerForm(player.form === 'robot' ? 'vehicle' : 'robot');
  player.transformCooldown = 0.22;
}

function buildLevel() {
  return [
    { type: 'pickup', x: 540, y: gameState.groundY - 170, w: 34, h: 34, label: 'energón', taken: false },
    { type: 'crate', x: 760, y: gameState.groundY - 90, w: 70, h: 90, label: 'Saltar' },
    { type: 'pickup', x: 980, y: gameState.groundY - 160, w: 34, h: 34, label: 'energón', taken: false },
    { type: 'gap', x: 1240, y: gameState.groundY, w: 170, h: 220, label: 'Salta el hueco' },
    { type: 'platform', x: 1510, y: gameState.groundY - 76, w: 200, h: 18 },
    { type: 'pickup', x: 1600, y: gameState.groundY - 118, w: 34, h: 34, label: 'energón', taken: false },
    { type: 'tunnel', x: 1900, y: gameState.groundY - 74, w: 250, h: 74, label: 'Vehículo' },
    { type: 'pickup', x: 2250, y: gameState.groundY - 160, w: 34, h: 34, label: 'energón', taken: false },
    { type: 'crate', x: 2560, y: gameState.groundY - 70, w: 60, h: 70, label: 'Saltar' },
    { type: 'platform', x: 2760, y: gameState.groundY - 130, w: 190, h: 18 },
    { type: 'bot', x: 2815, y: gameState.groundY - 176, w: 48, h: 48, rescued: false, label: 'Mini bot' },
    { type: 'gap', x: 3160, y: gameState.groundY, w: 140, h: 220, label: 'Salta el hueco' },
    { type: 'pickup', x: 3380, y: gameState.groundY - 170, w: 34, h: 34, label: 'energón', taken: false },
    { type: 'goal', x: 3900, y: gameState.groundY - 170, w: 70, h: 170, label: 'Meta' }
  ];
}

function resetGame() {
  gameState.running = true;
  gameState.completed = false;
  gameState.energy = 0;
  gameState.stars = 0;
  gameState.bots = 0;
  gameState.cameraX = 0;
  gameState.player = createPlayer();
  gameState.entities = buildLevel();
  gameState.tutorialIndex = 0;
  goalLabel.textContent = 'Objetivo: encuentra la meta verde';
  setPlayerForm('robot');
  updateHud();
  speak('Muévete con los botones azules. Avanza a la derecha.');
}

function updateHud() {
  energyCount.textContent = String(gameState.energy);
  starCount.textContent = String(gameState.stars);
  botCount.textContent = String(gameState.bots);
}

function jump() {
  const player = gameState.player;
  if (!player || !player.onGround) return;
  const base = player.character.jumpPower;
  const modifier = player.form === 'vehicle' ? 0.82 : 1;
  player.vy = -base * modifier;
  player.onGround = false;
}

function getSolidSurfaces() {
  const surfaces = [{ x: -2000, y: gameState.groundY, w: gameState.worldWidth + 4000, h: 2000, kind: 'ground' }];
  gameState.entities.forEach((entity) => {
    if (entity.type === 'gap') {
      surfaces.push({ x: entity.x, y: gameState.groundY, w: entity.w, h: 2000, hole: true });
    }
    if (entity.type === 'platform') {
      surfaces.push({ x: entity.x, y: entity.y, w: entity.w, h: 20, kind: 'platform' });
    }
  });
  return surfaces;
}

function getFloorYAt(xCenter) {
  let floorY = gameState.groundY;
  for (const entity of gameState.entities) {
    if (entity.type === 'gap' && xCenter >= entity.x && xCenter <= entity.x + entity.w) {
      floorY = Infinity;
    }
    if (entity.type === 'platform' && xCenter >= entity.x && xCenter <= entity.x + entity.w) {
      floorY = Math.min(floorY, entity.y);
    }
  }
  return floorY;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function failAndRespawn(text) {
  const player = gameState.player;
  player.x = player.spawnedAt;
  player.vx = 0;
  player.vy = 0;
  setPlayerForm('robot');
  player.y = gameState.groundY - player.height;
  player.onGround = true;
  speak(text);
}

function updateTutorialHints() {
  const step = tutorialSteps[gameState.tutorialIndex];
  if (!step) return;
  if (step.when()) {
    speak(step.text);
    gameState.tutorialIndex += 1;
  }
}

function update(dt) {
  const player = gameState.player;
  if (!player) return;

  updateTutorialHints();

  const speed = player.form === 'vehicle' ? player.character.vehicleSpeed : player.character.robotSpeed;
  const target = (gameState.keys.right ? 1 : 0) - (gameState.keys.left ? 1 : 0);
  player.vx = target * speed;
  player.x += player.vx * dt;
  player.transformCooldown = Math.max(0, player.transformCooldown - dt);

  player.vy += 1800 * dt;
  player.y += player.vy * dt;

  const footCenter = player.x + player.width / 2;
  const floorY = getFloorYAt(footCenter);
  if (player.vy >= 0 && player.y + player.height >= floorY) {
    player.y = floorY - player.height;
    player.vy = 0;
    player.onGround = floorY !== Infinity;
  } else {
    player.onGround = false;
  }

  if (player.y > canvas.clientHeight + 220 || player.x < 0) {
    failAndRespawn('Intenta otra vez. Salta antes del hueco.');
    return;
  }

  const playerRect = { x: player.x, y: player.y, w: player.width, h: player.height };

  for (const entity of gameState.entities) {
    if (entity.type === 'pickup' && !entity.taken && rectsOverlap(playerRect, entity)) {
      entity.taken = true;
      gameState.energy += 1;
      gameState.stars = Math.floor(gameState.energy / 2);
      updateHud();
    }

    if (entity.type === 'bot' && !entity.rescued && rectsOverlap(playerRect, entity)) {
      entity.rescued = true;
      gameState.bots += 1;
      updateHud();
      speak('Rescataste un mini bot. Sigue avanzando.');
    }

    if (entity.type === 'crate' && rectsOverlap(playerRect, entity)) {
      failAndRespawn('La caja roja se pasa saltando.');
      return;
    }

    if (entity.type === 'tunnel' && player.x + player.width > entity.x && player.x < entity.x + entity.w) {
      if (player.form !== 'vehicle' || player.height > entity.h) {
        failAndRespawn('El túnel amarillo es para el modo vehículo.');
        return;
      }
    }

    if (entity.type === 'goal' && rectsOverlap(playerRect, entity)) {
      finishLevel();
      return;
    }
  }

  player.spawnedAt = Math.max(120, Math.min(player.spawnedAt, player.x));
  if (player.onGround) {
    player.spawnedAt = Math.max(player.spawnedAt, player.x - 40);
  }

  gameState.cameraX = Math.max(0, Math.min(player.x - canvas.clientWidth * 0.35, gameState.worldWidth - canvas.clientWidth));
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
  setTimeout(() => setScreen('reward'), 350);
}

function drawBackground(viewWidth, viewHeight) {
  const sky = ctx.createLinearGradient(0, 0, 0, viewHeight);
  sky.addColorStop(0, '#1d2d68');
  sky.addColorStop(0.45, '#122247');
  sky.addColorStop(1, '#09101f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  for (let i = 0; i < 8; i += 1) {
    const x = ((i * 320) - (gameState.cameraX * 0.18)) % (viewWidth + 320) - 120;
    ctx.fillStyle = 'rgba(71, 228, 255, 0.08)';
    ctx.fillRect(x, 140 + (i % 3) * 26, 180, viewHeight - 320);
  }

  ctx.fillStyle = '#1f3f5d';
  ctx.fillRect(0, gameState.groundY, viewWidth, viewHeight - gameState.groundY);
  ctx.fillStyle = '#2d6f85';
  ctx.fillRect(0, gameState.groundY - 18, viewWidth, 18);
}

function drawSigns(entity, screenX) {
  if (!entity.label) return;
  ctx.fillStyle = 'rgba(6, 13, 30, 0.86)';
  ctx.fillRect(screenX - 10, entity.y - 66, Math.max(94, entity.label.length * 8), 36);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.strokeRect(screenX - 10, entity.y - 66, Math.max(94, entity.label.length * 8), 36);
  ctx.fillStyle = '#f6f8ff';
  ctx.font = 'bold 16px Inter, sans-serif';
  ctx.fillText(entity.label, screenX, entity.y - 42);
}

function drawEntity(entity) {
  const x = entity.x - gameState.cameraX;
  if (x > canvas.clientWidth + 200 || x < -250) return;

  if (entity.type === 'crate') {
    ctx.fillStyle = '#ff6c60';
    ctx.fillRect(x, entity.y, entity.w, entity.h);
    ctx.strokeStyle = '#ffd8d0';
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 4, entity.y + 4, entity.w - 8, entity.h - 8);
    drawSigns(entity, x);
  }

  if (entity.type === 'gap') {
    ctx.fillStyle = '#08306d';
    ctx.fillRect(x, gameState.groundY, entity.w, 220);
    ctx.fillStyle = 'rgba(71,228,255,0.26)';
    ctx.fillRect(x, gameState.groundY + 24, entity.w, 22);
    drawSigns(entity, x + 12);
  }

  if (entity.type === 'platform') {
    ctx.fillStyle = '#5d6ff2';
    ctx.fillRect(x, entity.y, entity.w, entity.h);
    ctx.fillStyle = '#8f9cff';
    ctx.fillRect(x, entity.y, entity.w, 6);
  }

  if (entity.type === 'tunnel') {
    ctx.fillStyle = '#ffd84d';
    ctx.fillRect(x, entity.y, entity.w, entity.h);
    ctx.fillStyle = '#09101f';
    ctx.fillRect(x + 24, entity.y + 10, entity.w - 48, entity.h - 10);
    ctx.fillStyle = '#ffd84d';
    ctx.fillRect(x + entity.w - 56, entity.y + 18, 28, 18);
    drawSigns(entity, x + 18);
  }

  if (entity.type === 'pickup' && !entity.taken) {
    ctx.save();
    ctx.translate(x + entity.w / 2, entity.y + entity.h / 2 + Math.sin(performance.now() / 180) * 6);
    ctx.rotate(performance.now() / 700);
    ctx.fillStyle = '#47e4ff';
    ctx.beginPath();
    for (let i = 0; i < 4; i += 1) {
      ctx.lineTo(Math.cos(i * Math.PI / 2) * 18, Math.sin(i * Math.PI / 2) * 18);
      ctx.lineTo(Math.cos((i + 0.5) * Math.PI / 2) * 8, Math.sin((i + 0.5) * Math.PI / 2) * 8);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  if (entity.type === 'bot' && !entity.rescued) {
    ctx.fillStyle = '#9fe8ff';
    ctx.fillRect(x, entity.y, entity.w, entity.h);
    ctx.fillStyle = '#09101f';
    ctx.fillRect(x + 10, entity.y + 10, entity.w - 20, 10);
    ctx.fillRect(x + 12, entity.y + 24, 8, 16);
    ctx.fillRect(x + entity.w - 20, entity.y + 24, 8, 16);
    drawSigns(entity, x);
  }

  if (entity.type === 'goal') {
    ctx.fillStyle = '#38df8f';
    ctx.fillRect(x, entity.y, entity.w, entity.h);
    ctx.fillStyle = '#daf9ea';
    ctx.fillRect(x + 10, entity.y + 10, entity.w - 20, entity.h - 20);
    drawSigns(entity, x);
  }
}

function drawRobot(player, screenX) {
  const y = player.y;
  ctx.fillStyle = player.character.colors.main;
  ctx.fillRect(screenX + 16, y + 30, 54, 64);
  ctx.fillStyle = player.character.colors.accent;
  ctx.fillRect(screenX + 20, y + 6, 46, 38);
  ctx.fillStyle = '#caf6ff';
  ctx.fillRect(screenX + 30, y + 20, 8, 6);
  ctx.fillRect(screenX + 48, y + 20, 8, 6);
  ctx.fillStyle = player.character.colors.dark;
  ctx.fillRect(screenX + 8, y + 36, 12, 56);
  ctx.fillRect(screenX + 66, y + 36, 12, 56);
  ctx.fillRect(screenX + 26, y + 94, 14, 14);
  ctx.fillRect(screenX + 46, y + 94, 14, 14);
}

function drawVehicle(player, screenX) {
  const y = player.y;
  ctx.fillStyle = player.character.colors.main;
  ctx.fillRect(screenX + 10, y + 18, 96, 30);
  ctx.fillRect(screenX + 26, y + 2, 44, 24);
  ctx.fillStyle = player.character.colors.accent;
  ctx.fillRect(screenX + 82, y + 20, 26, 16);
  ctx.fillStyle = '#caf6ff';
  ctx.fillRect(screenX + 38, y + 8, 22, 12);
  ctx.fillStyle = '#232634';
  ctx.beginPath();
  ctx.arc(screenX + 32, y + 52, 14, 0, Math.PI * 2);
  ctx.arc(screenX + 88, y + 52, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7e88a8';
  ctx.beginPath();
  ctx.arc(screenX + 32, y + 52, 6, 0, Math.PI * 2);
  ctx.arc(screenX + 88, y + 52, 6, 0, Math.PI * 2);
  ctx.fill();
}

function render() {
  const viewWidth = canvas.clientWidth;
  const viewHeight = canvas.clientHeight;
  drawBackground(viewWidth, viewHeight);
  gameState.entities.forEach(drawEntity);

  const player = gameState.player;
  if (!player) return;
  const screenX = player.x - gameState.cameraX;
  if (player.form === 'robot') {
    drawRobot(player, screenX);
  } else {
    drawVehicle(player, screenX);
  }
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

  const leftButton = document.getElementById('leftButton');
  const rightButton = document.getElementById('rightButton');

  const bindHold = (button, key) => {
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
  };

  bindHold(leftButton, 'left');
  bindHold(rightButton, 'right');

  soundToggle.addEventListener('click', () => {
    audioState.enabled = !audioState.enabled;
    soundToggle.textContent = audioState.enabled ? '🔊' : '🔈';
    if (!audioState.enabled) window.speechSynthesis.cancel();
  });
}

function setupKeyboard() {
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') gameState.keys.left = true;
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') gameState.keys.right = true;
    if (event.key === 'ArrowUp' || event.key === ' ') {
      event.preventDefault();
      jump();
    }
    if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's' || event.key.toLowerCase() === 't') {
      event.preventDefault();
      toggleTransform();
    }
  });

  window.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') gameState.keys.left = false;
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') gameState.keys.right = false;
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
  resizeCanvas();
  renderRoster();
  setupButtons();
  setupKeyboard();
  registerServiceWorker();
  setupInstallPrompt();
  window.addEventListener('resize', resizeCanvas);
  requestAnimationFrame(loop);
}

init();
