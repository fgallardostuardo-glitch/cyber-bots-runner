const { characters, levelTemplate } = window.GameData;
const Systems = window.GameSystems;

const screens = {
  home: document.getElementById('homeScreen'),
  game: document.getElementById('gameScreen'),
  reward: document.getElementById('rewardScreen')
};
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const ui = {
  voiceBubble: document.getElementById('voiceBubble'),
  energyCount: document.getElementById('energyCount'),
  starCount: document.getElementById('starCount'),
  botCount: document.getElementById('botCount'),
  installButton: document.getElementById('installButton'),
  soundToggle: document.getElementById('soundToggle'),
  heroName: document.getElementById('heroName'),
  heroRole: document.getElementById('heroRole'),
  heroDesc: document.getElementById('heroDesc'),
  heroPreview: document.getElementById('heroPreview'),
  rewardRobot: document.getElementById('rewardRobot'),
  rewardLoot: document.getElementById('rewardLoot'),
  selectedTag: document.getElementById('selectedTag'),
  previewButton: document.getElementById('toggleFormPreviewButton'),
  carousel: document.getElementById('characterCarousel'),
  abilityPrimary: document.getElementById('abilityPrimary'),
  abilitySecondary: document.getElementById('abilitySecondary'),
  statControl: document.getElementById('statControl'),
  statJump: document.getElementById('statJump'),
  statSpeed: document.getElementById('statSpeed'),
  statPower: document.getElementById('statPower'),
  progressFill: document.getElementById('progressFill')
};

const state = { selectedCharacter: characters[0], deferredInstallPrompt: null, previewForm: 'robot' };
const audioState = { enabled: true };
const assets = { images: {} };
let audioCtx = null;

const game = {
  running: false,
  cameraX: 0,
  worldWidth: 6200,
  energy: 0,
  stars: 0,
  bots: 0,
  frameTime: 0,
  currentLevel: null,
  player: null,
  entities: [],
  enemies: [],
  checkpoints: [],
  checkpointIndex: 0,
  respawnX: 120,
  justCompleted: false,
  projectiles: [],
  fx: [],
  messageTimer: 0,
  joystick: { active: false, pointerId: null, radius: 56, dirX: 0 },
  input: { jumpPressed: false, jumpHeld: false, attackPressed: false, attackHeld: false, attackReleased: false }
};

const joystickBase = document.getElementById('joystickBase');
const joystickKnob = document.getElementById('joystickKnob');
const timing = { hitStop: 0 };


function structuredCloneLocal(obj) { return JSON.parse(JSON.stringify(obj)); }

function getEnemyTargetBox(enemy, proj = null) { return Systems.getEnemyTargetBox(enemy, proj); }
function addRingFX(x, y, color, burst = false) { Systems.pushRingFX(game, x, y, color, burst); }
function addSparkFX(x, y, color, count = 5, spread = 1) { Systems.pushSparkFX(game, x, y, color, count, spread); }
function addFloatText(x, y, text, color = '#ffffff') { Systems.pushFloatText(game, x, y, text, color); }
function addHitStop(duration) { timing.hitStop = Math.max(timing.hitStop, duration); }
function setScreen(name) { Object.entries(screens).forEach(([k, el]) => el.classList.toggle('active', k === name)); }
function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth, h = window.visualViewport?.height || window.innerHeight;
  canvas.width = Math.floor(w * ratio); canvas.height = Math.floor(h * ratio);
  canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}
function preloadAssets() {
  const urls = new Set();
  characters.forEach(c => { c.robotFrames.forEach(s => urls.add(s)); c.vehicleFrames.forEach(s => urls.add(s)); });
  const tasks = [...urls].map(src => new Promise(resolve => {
    const img = new Image();
    let settled = false;
    const done = () => { if (settled) return; settled = true; resolve(); };
    img.onload = () => { assets.images[src] = img; done(); };
    img.onerror = done;
    img.src = src;
    setTimeout(done, 1200);
  }));
  return Promise.allSettled(tasks);
}
function makeSpriteFallback(character, form = 'robot') {
  const label = (character?.name || '?').split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
  const accent = character?.accent || '#52b5ff';
  const base = character?.color || '#243b66';
  const kind = form === 'vehicle' ? 'VEHÍCULO' : 'ROBOT';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="${base}"/><stop offset="1" stop-color="${accent}"/></linearGradient></defs><rect width="320" height="320" rx="44" fill="#08162f"/><rect x="20" y="20" width="280" height="280" rx="34" fill="url(#g)" opacity=".18"/><circle cx="160" cy="138" r="72" fill="url(#g)" opacity=".22"/><rect x="92" y="88" width="136" height="96" rx="22" fill="url(#g)" opacity=".85"/><rect x="112" y="194" width="96" height="24" rx="12" fill="#dfe9ff" opacity=".9"/><text x="160" y="148" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#ffffff">${label}</text><text x="160" y="258" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#d7ecff">${kind}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
function setImageWithFallback(imgEl, src, fallbackSrc) {
  if (!imgEl) return;
  imgEl.onerror = () => {
    if (imgEl.dataset.fallbackApplied === '1') return;
    imgEl.dataset.fallbackApplied = '1';
    imgEl.src = fallbackSrc;
  };
  imgEl.dataset.fallbackApplied = '0';
  imgEl.src = src || fallbackSrc;
}
function updateHomePreview() {
  const c = state.selectedCharacter;
  const previewSrc = state.previewForm === 'robot' ? c.robotFrames[1] : c.vehicleFrames[1];
  ui.heroName.textContent = c.name; ui.heroRole.textContent = c.fantasy; ui.heroDesc.textContent = c.desc;
  setImageWithFallback(ui.heroPreview, previewSrc, makeSpriteFallback(c, state.previewForm));
  ui.selectedTag.textContent = c.role; ui.previewButton.textContent = state.previewForm === 'robot' ? 'Ver vehículo' : 'Ver robot';
  ui.abilityPrimary.textContent = c.abilities[0]; ui.abilitySecondary.textContent = c.abilities[1] || 'Ruta principal completa';
  ui.statControl.textContent = c.stats.control; ui.statJump.textContent = c.stats.jump; ui.statSpeed.textContent = c.stats.speed; ui.statPower.textContent = c.stats.power;
}
function renderCharacterCards() {
  ui.carousel.innerHTML = '';
  characters.forEach((c, index) => {
    const card = document.createElement('button'); card.className = 'character-card';
    card.innerHTML = `<img class="card-sprite" alt="${c.name}"><div class="card-meta"><div class="card-name">${c.name}</div><div class="card-role">${c.fantasy}</div><div class="card-stats">Ctrl ${c.stats.control} · Salto ${c.stats.jump} · Vel ${c.stats.speed}</div></div>`;
    const sprite = card.querySelector('.card-sprite');
    setImageWithFallback(sprite, c.robotFrames[1], makeSpriteFallback(c, 'robot'));
    card.addEventListener('click', () => selectCharacter(index)); ui.carousel.appendChild(card);
  });
  selectCharacter(characters.findIndex(c => c.id === state.selectedCharacter.id));
}
function selectCharacter(index) {
  state.selectedCharacter = characters[index]; [...ui.carousel.children].forEach((el, i) => el.classList.toggle('selected', i === index));
  state.previewForm = 'robot'; updateHomePreview(); localStorage.setItem('cyber-bot-selected', state.selectedCharacter.id);
}
function getAudioContext() {
  if (!audioCtx) { const Ctx = window.AudioContext || window.webkitAudioContext; if (Ctx) audioCtx = new Ctx(); }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {}); return audioCtx;
}
function robotBeep(type = 'jump') {
  if (!audioState.enabled) return; const a = getAudioContext(); if (!a) return; const now = a.currentTime;
  const osc = a.createOscillator(), osc2 = a.createOscillator(), gain = a.createGain(), filter = a.createBiquadFilter();
  osc.type = type === 'transform' ? 'sawtooth' : type === 'attack' ? 'triangle' : 'square';
  osc2.type = type === 'attack' ? 'square' : 'triangle'; filter.type = 'bandpass';
  const map = {
    jump: [260, 420, 140, 190, 840, 0.12], transform: [180, 520, 90, 240, 1200, 0.22],
    attack: [160, 330, 120, 210, 900, 0.14], charge: [120, 620, 80, 180, 620, 0.24], shoot: [100, 520, 70, 150, 720, 0.16], hit: [220, 110, 160, 100, 540, 0.11]
  }[type] || [260, 420, 140, 190, 840, 0.12];
  filter.frequency.value = map[4];
  osc.frequency.setValueAtTime(map[0], now); osc.frequency.exponentialRampToValueAtTime(map[1], now + map[5] * 0.75);
  osc2.frequency.setValueAtTime(map[2], now); osc2.frequency.exponentialRampToValueAtTime(map[3], now + map[5] * 0.8);
  gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(0.09, now + 0.015); gain.gain.exponentialRampToValueAtTime(0.0001, now + map[5]);
  osc.connect(filter); osc2.connect(filter); filter.connect(gain); gain.connect(a.destination);
  osc.start(now); osc2.start(now); osc.stop(now + map[5] + 0.03); osc2.stop(now + map[5] + 0.03);
}
function speak(text) {
  ui.voiceBubble.textContent = text;
  if (!audioState.enabled || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel(); const utter = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices?.() || [];
    utter.lang = 'es-CL'; utter.pitch = 1.32; utter.rate = 1.1;
    utter.voice = voices.find(v => /es|spanish/i.test(v.lang) && /google|microsoft|paulina|helena|dalia/i.test(v.name)) || voices.find(v => /es/i.test(v.lang)) || null;
    window.speechSynthesis.speak(utter);
  } catch (_) {}
}
function showMessage(text, voice = false) { ui.voiceBubble.textContent = text; game.messageTimer = 3.2; if (voice) speak(text); }
function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); state.deferredInstallPrompt = e; ui.installButton.classList.add('show-install'); });
  window.addEventListener('appinstalled', () => { state.deferredInstallPrompt = null; ui.installButton.classList.remove('show-install'); });
  ui.installButton.addEventListener('click', async () => {
    if (!state.deferredInstallPrompt) return; state.deferredInstallPrompt.prompt(); await state.deferredInstallPrompt.userChoice.catch(() => null); state.deferredInstallPrompt = null; ui.installButton.classList.remove('show-install');
  });
}
function registerServiceWorker() { if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => {}); }
function getCharacterById(id) { return characters.find(c => c.id === id) || characters[0]; }
function getPlayerStats() { return state.selectedCharacter; }
function getGroundYAt(x) {
  let ground = null; const terrain = game.currentLevel?.terrain || [];
  for (const seg of terrain) if (x >= seg.from && x <= seg.to) ground = ground === null ? seg.y : Math.min(ground, seg.y);
  return ground;
}
function createPlayer() {
  const c = state.selectedCharacter;
  return {
    x: 120, y: 580 - c.robotSize.height, vx: 0, vy: 0, width: c.robotSize.width, height: c.robotSize.height,
    form: 'robot', facing: 1, onGround: true, coyote: 0, holdJumpTimer: 0, extraJumpsLeft: c.extraJumps,
    transformLock: 0, invuln: 0, animationTime: 0, dashTimer: 0,
    attack: null, attackCooldown: 0, comboWindow: 0, comboIndex: 0, charging: false, chargeTime: 0,
    groundBelow: 580
  };
}
function setPlayerForm(form) {
  const p = game.player; const c = getPlayerStats(); if (!p || p.form === form) return;
  const oldBottom = p.y + p.height; const oldCenterX = p.x + p.width * 0.5; p.form = form;
  const size = form === 'vehicle' ? c.vehicleSize : c.robotSize; p.width = size.width; p.height = size.height; p.x = oldCenterX - p.width * 0.5; p.y = oldBottom - p.height;
  const ground = getGroundYAt(p.x + p.width * 0.5); if (ground !== null && p.y + p.height > ground) { p.y = ground - p.height; p.vy = 0; p.onGround = true; }
}
function makeEnemy(enemy) {
  const cfg = {
    patroller: { width: 78, height: 74, hp: 1 }, hopper: { width: 72, height: 70, hp: 1 }, turret: { width: 84, height: 96, hp: 2 },
    rusher: { width: 82, height: 76, hp: 1 }, shield: { width: 84, height: 82, hp: 2 }, drone: { width: 76, height: 46, hp: 1 }, bruiser: { width: 104, height: 104, hp: 4 }
  }[enemy.type];
  const centerGround = getGroundYAt((enemy.left + enemy.right) * 0.5) ?? 580;
  return { ...enemy, ...cfg, y: enemy.y ?? centerGround - cfg.height, vx: 0, vy: 0, dir: -1, active: true, timer: 0, state: 'idle', telegraph: 0, grounded: enemy.type !== 'drone', shielded: enemy.type === 'shield', shot: null, damageFlash: 0 };
}
function spawnLevel() {
  const clone = structuredCloneLocal(levelTemplate); game.currentLevel = clone; game.worldWidth = clone.worldWidth;
  game.entities = clone.entities.map(e => ({ ...e, collected: false, destroyed: false, timer: 0, falling: false, vy: 0 }));
  game.enemies = clone.enemies.map(makeEnemy); game.checkpoints = game.entities.filter(e => e.type === 'checkpoint'); game.checkpointIndex = 0;
  game.energy = 0; game.stars = 0; game.bots = 0; game.cameraX = 0; game.player = createPlayer(); game.respawnX = 120; game.justCompleted = false; game.projectiles = []; game.fx = [];
  updateCounters();
}
function startGame() { spawnLevel(); game.running = true; setScreen('game'); showMessage(game.currentLevel.intro, true); }
function updateCounters() {
  ui.energyCount.textContent = `${game.energy}`; ui.starCount.textContent = `${game.stars}`; ui.botCount.textContent = `${game.bots}`;
  const p = game.player; const max = Math.max(1, (game.worldWidth || 1) - 220); const progress = p ? Math.max(0, Math.min(100, (p.x / max) * 100)) : 0; if (ui.progressFill) ui.progressFill.style.width = `${progress}%`;
}
function handleJumpPress() { game.input.jumpPressed = true; game.input.jumpHeld = true; }
function performJump() {
  const p = game.player, c = getPlayerStats(); if (!p) return false;
  if (p.onGround || p.coyote > 0) { p.vy = -c.jumpVelocity; p.onGround = false; p.coyote = 0; p.holdJumpTimer = 0.16; robotBeep('jump'); return true; }
  if (p.extraJumpsLeft > 0) { p.extraJumpsLeft -= 1; p.vy = -c.jumpVelocity * 0.96; p.holdJumpTimer = 0.14; robotBeep('jump'); return true; }
  return false;
}
function handleTransform() { const p = game.player; if (!p || p.transformLock > 0) return; setPlayerForm(p.form === 'robot' ? 'vehicle' : 'robot'); p.transformLock = 0.18; robotBeep('transform'); }
function intersect(a, b) { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y; }
function hurtPlayer(reason = 'Golpe') {
  const p = game.player; if (!p || p.invuln > 0) return; p.invuln = 1.2; p.vx = -170 * (p.facing || 1); p.vy = -240; p.attack = null; p.charging = false; showMessage(reason, true);
}
function respawnPlayer() {
  const p = game.player; const c = getPlayerStats(); if (!p) return; p.x = game.respawnX; const ground = getGroundYAt(p.x + 40) ?? 580;
  p.form = 'robot'; p.width = c.robotSize.width; p.height = c.robotSize.height; p.y = ground - p.height; p.vx = 0; p.vy = 0; p.onGround = true; p.extraJumpsLeft = c.extraJumps; p.invuln = 1; p.attack = null; p.charging = false;
  showMessage('Checkpoint seguro. Reintenta sin castigo duro.', true);
}
function getAttackHitbox(p, attack) {
  if (!attack) return null;
  if (attack.type === 'orion-air') return { x: p.x + p.width * 0.15, y: p.y + p.height * 0.55, width: p.width * 0.7, height: p.height * 0.72, dir: p.facing, aerial: true, damage: 2 };
  if (attack.type === 'orion') return { x: p.facing > 0 ? p.x + p.width * 0.5 : p.x - attack.reach, y: p.y + 24, width: attack.reach, height: 62, dir: p.facing, damage: attack.damage };
  if (attack.type === 'bee-slash') return { x: p.facing > 0 ? p.x + p.width * 0.55 : p.x - attack.reach, y: p.y + 20, width: attack.reach, height: 46, dir: p.facing, damage: 1.2 };
  if (attack.type === 'bee-dash') return { x: p.facing > 0 ? p.x + 8 : p.x - 10, y: p.y + 14, width: p.width + 14, height: p.height - 20, dir: p.facing, damage: 2.2 };
  return null;
}
function beginAttack() {
  const p = game.player, c = getPlayerStats(); if (!p || p.form !== 'robot') return; if (c.id === 'elita') return;
  if (c.id === 'd16') {
    if (p.attackCooldown > 0 || p.charging || p.attack) return; p.charging = true; p.chargeTime = 0; robotBeep('charge'); return;
  }
  if (p.attackCooldown > 0 || p.attack) return;
  if (c.id === 'orion') {
    if (!p.onGround) {
      p.attack = { type: 'orion-air', timer: 0, duration: 0.26, damage: 2, hit: new Set() }; p.attackCooldown = 0.18; robotBeep('attack'); return;
    }
    p.comboIndex = p.comboWindow > 0 ? (p.comboIndex % 3) + 1 : 1; p.comboWindow = 0.28;
    const reach = 80 + p.comboIndex * 10; const damage = p.comboIndex === 3 ? 2 : 1.3;
    p.attack = { type: 'orion', timer: 0, duration: 0.18 + p.comboIndex * 0.02, reach, damage, combo: p.comboIndex, hit: new Set() }; p.attackCooldown = 0.12; robotBeep('attack');
  }
  if (c.id === 'bee') {
    const fast = Math.abs(p.vx) > 170 && p.onGround && Math.abs(game.joystick.dirX) > 0.45;
    if (fast) { p.attack = { type: 'bee-dash', timer: 0, duration: 0.22, reach: 82, hit: new Set() }; p.attackCooldown = 0.14; p.dashTimer = 0.22; p.vx = p.facing * 480; robotBeep('attack'); return; }
    p.comboIndex = p.comboWindow > 0 ? ((p.comboIndex % 4) + 1) : 1; p.comboWindow = 0.24; const reach = 54 + (p.comboIndex >= 3 ? 8 : 0);
    p.attack = { type: 'bee-slash', timer: 0, duration: 0.12, reach, combo: p.comboIndex, hit: new Set() }; p.attackCooldown = 0.07; robotBeep('attack');
  }
}
function releaseAttack() {
  const p = game.player, c = getPlayerStats(); if (!p || c.id !== 'd16' || !p.charging) return;
  const charged = p.chargeTime >= 0.46;
  game.projectiles.push(Systems.createD16Projectile(p, charged));
  p.vx -= p.facing * (charged ? 70 : 34); p.attackCooldown = charged ? 0.45 : 0.28; p.charging = false; p.chargeTime = 0; robotBeep(charged ? 'charge' : 'shoot');
}
function applyDamageToEnemy(enemy, source) {
  if (!enemy.active) return false;
  if (enemy.type === 'shield' && source.dir && enemy.dir === source.dir && !source.aerial && source.kind !== 'charged') {
    enemy.telegraph = 0.35; addRingFX(enemy.x + enemy.width / 2, enemy.y + 24, '#b4d7ff'); addSparkFX(enemy.x + enemy.width / 2, enemy.y + 28, '#d8f2ff', 4, 0.9); return false;
  }
  enemy.hp -= source.damage || 1; enemy.damageFlash = 0.18; robotBeep('hit');
  const cx = enemy.x + enemy.width / 2, cy = enemy.y + enemy.height * 0.45;
  addHitStop((source.damage || 1) >= 2 ? Systems.CombatTuning.heavyHitStop : Systems.CombatTuning.lightHitStop);
  addSparkFX(cx, cy, source.kind === 'charged' ? '#ffd48a' : '#9fe8ff', source.kind === 'charged' ? 7 : 5, source.kind === 'charged' ? 1.3 : 1);
  addFloatText(cx, enemy.y - 10, enemy.hp <= 0 ? 'KO' : 'HIT', enemy.hp <= 0 ? '#ffd84d' : '#dff8ff');
  if (enemy.hp <= 0) {
    enemy.active = false; game.stars += enemy.type === 'bruiser' ? 3 : 1; updateCounters();
    addRingFX(cx, enemy.y + enemy.height / 2, '#9cf7ff', true); addSparkFX(cx, cy, '#9cf7ff', enemy.type === 'bruiser' ? 10 : 7, enemy.type === 'bruiser' ? 1.5 : 1.1);
  }
  return true;
}
function updateCombat(dt) {
  const p = game.player; if (!p) return;
  if (p.attackCooldown > 0) p.attackCooldown -= dt; if (p.comboWindow > 0) p.comboWindow -= dt; else p.comboIndex = 0;
  if (p.attack) {
    p.attack.timer += dt;
    const box = getAttackHitbox(p, p.attack);
    if (box) {
      for (const enemy of game.enemies) {
        if (!enemy.active || p.attack.hit.has(enemy)) continue;
        if (intersect(box, { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height })) {
          if (applyDamageToEnemy(enemy, box)) {
            p.attack.hit.add(enemy);
            if (p.attack.type === 'orion-air') { p.vy = -240; }
          }
        }
      }
    }
    if (p.attack.type === 'bee-dash') p.vx = p.facing * 420;
    if (p.attack.timer >= p.attack.duration) p.attack = null;
  }
  if (p.charging) {
    p.chargeTime = Math.min(0.8, p.chargeTime + dt);
    if (!game.input.attackHeld) releaseAttack();
  }
}
function resolvePlatforms(previousBottom) {
  const p = game.player; if (!p) return;
  for (const entity of game.entities) {
    if (entity.collected || entity.destroyed || (entity.type !== 'platform' && entity.type !== 'crumble')) continue;
    const top = entity.y; const withinX = p.x + p.width > entity.x + 10 && p.x < entity.x + entity.width - 10; const wasAbove = previousBottom <= top + 8; const crossingDown = p.vy >= 0 && p.y + p.height >= top && wasAbove;
    if (withinX && crossingDown) { p.y = top - p.height; p.vy = 0; p.onGround = true; if (entity.type === 'crumble' && !entity.falling) entity.timer = Math.max(entity.timer, 0.48); return; }
  }
}
function updatePlayer(dt) {
  const p = game.player, c = getPlayerStats(); if (!p) return;
  const moveInput = game.joystick.dirX; const isVehicle = p.form === 'vehicle'; const accel = isVehicle ? c.vehicleAccel : c.robotAccel; const maxSpeed = isVehicle ? c.vehicleMaxSpeed : c.robotMaxSpeed; const air = p.onGround ? 1 : c.airControl;
  let desiredSpeed = moveInput * maxSpeed; if (c.id === 'bee' && isVehicle && Math.abs(moveInput) > 0.92) desiredSpeed *= 1.12;
  if (p.charging) desiredSpeed *= 0.2; if (p.attack?.type === 'bee-dash') desiredSpeed = p.facing * 420;
  const difference = desiredSpeed - p.vx; const push = Math.sign(difference) * Math.min(Math.abs(difference), accel * dt * air); p.vx += push;
  if (Math.abs(moveInput) < 0.08 && !p.charging && p.attack?.type !== 'bee-dash') {
    const friction = p.onGround ? 1720 : 380; if (Math.abs(p.vx) <= friction * dt) p.vx = 0; else p.vx -= Math.sign(p.vx) * friction * dt;
  }
  if (Math.abs(p.vx) > 16) p.facing = Math.sign(p.vx);
  if (game.input.jumpPressed) { performJump(); game.input.jumpPressed = false; }
  if (game.input.attackPressed) { beginAttack(); game.input.attackPressed = false; }
  if (game.input.attackReleased) { releaseAttack(); game.input.attackReleased = false; }
  if (game.input.jumpHeld && p.holdJumpTimer > 0 && p.vy < 0) { p.vy -= 390 * dt; p.holdJumpTimer -= dt; } else p.holdJumpTimer = 0;
  const glide = c.id === 'elita' && c.glideGravity < 1 && game.input.jumpHeld && !p.onGround && p.vy > 0; p.vy += c.gravity * (glide ? c.glideGravity : 1) * dt;
  if (p.transformLock > 0) p.transformLock -= dt; if (p.invuln > 0) p.invuln -= dt; p.coyote -= dt;
  const previousBottom = p.y + p.height; const previousVy = p.vy; const previousOnGround = p.onGround;
  p.x += p.vx * dt; p.y += p.vy * dt; p.x = Math.max(0, Math.min(game.worldWidth - p.width, p.x)); p.onGround = false;
  const footX = p.x + p.width * 0.5; const ground = getGroundYAt(footX); p.groundBelow = ground ?? 9999;
  if (ground !== null && p.vy >= 0 && p.y + p.height >= ground) { p.y = ground - p.height; p.vy = 0; p.onGround = true; } else resolvePlatforms(previousBottom);
  if (p.onGround) { p.coyote = 0.1; p.extraJumpsLeft = c.extraJumps; if (!previousOnGround && c.id === 'd16' && p.form === 'robot' && previousVy > 520) damageNearbyEnemies(p.x + p.width / 2, 92, 1.5); }
  else if (previousOnGround) p.coyote = 0.12;
  if (ground === null && p.y > canvas.clientHeight + 240) respawnPlayer();
  p.animationTime += dt * Math.max(0.8, Math.min(2.2, Math.abs(p.vx) / 90 + (p.onGround ? 0.25 : 0.1)));
  updateCounters();
}
function damageNearbyEnemies(x, radius, damage = 1) { for (const enemy of game.enemies) if (enemy.active && Math.abs(enemy.x + enemy.width / 2 - x) <= radius) applyDamageToEnemy(enemy, { damage, dir: game.player.facing, aerial: true }); }
function enemyFootGround(enemy) {
  if (enemy.type === 'drone') return null;
  return getGroundYAt(enemy.x + enemy.width * 0.5);
}
function updateEnemyTelegraph(enemy, dt, player) {
  const center = enemy.x + enemy.width / 2; const playerCenter = player.x + player.width / 2; const dx = playerCenter - center;
  if (enemy.type === 'patroller') {
    if (enemy.state === 'idle') enemy.state = 'patrol';
    enemy.x += 82 * enemy.dir * dt; if (enemy.x < enemy.left) enemy.dir = 1; if (enemy.x + enemy.width > enemy.right) enemy.dir = -1;
  }
  if (enemy.type === 'rusher') {
    if (enemy.state === 'idle' || enemy.state === 'patrol') {
      enemy.x += 70 * enemy.dir * dt; if (enemy.x < enemy.left) enemy.dir = 1; if (enemy.x + enemy.width > enemy.right) enemy.dir = -1;
      if (Math.abs(dx) < 240 && Math.sign(dx || 1) === enemy.dir) { enemy.state = 'telegraph'; enemy.timer = 0.62; }
    } else if (enemy.state === 'telegraph') { enemy.timer -= dt; if (enemy.timer <= 0) { enemy.state = 'dash'; enemy.timer = 0.48; enemy.vx = enemy.dir * 360; } }
    else if (enemy.state === 'dash') { enemy.x += enemy.vx * dt; enemy.timer -= dt; if (enemy.timer <= 0) enemy.state = 'patrol'; }
  }
  if (enemy.type === 'hopper') {
    enemy.x += 66 * enemy.dir * dt; if (enemy.x < enemy.left) enemy.dir = 1; if (enemy.x + enemy.width > enemy.right) enemy.dir = -1; enemy.timer += dt;
    if (enemy.grounded && enemy.state !== 'jump' && enemy.timer > 1.0) { enemy.state = 'telegraph'; enemy.telegraph = 0.55; enemy.timer = 0; }
    if (enemy.state === 'telegraph') { enemy.telegraph -= dt; if (enemy.telegraph <= 0) { enemy.vy = -520; enemy.state = 'jump'; } }
    if (enemy.grounded && enemy.state === 'jump') enemy.state = 'idle';
  }
  if (enemy.type === 'shield') {
    enemy.x += 58 * enemy.dir * dt; if (enemy.x < enemy.left) enemy.dir = 1; if (enemy.x + enemy.width > enemy.right) enemy.dir = -1;
  }
  if (enemy.type === 'turret') {
    enemy.timer += dt; if (enemy.state === 'idle' && Math.abs(dx) < 420 && enemy.timer > 1.2) { enemy.state = 'telegraph'; enemy.telegraph = 0.72; }
    if (enemy.state === 'telegraph') { enemy.telegraph -= dt; if (enemy.telegraph <= 0) { spawnEnemyShot(enemy, dx); enemy.state = 'idle'; enemy.timer = 0; } }
  }
  if (enemy.type === 'drone') {
    enemy.timer += dt; enemy.x += Math.sin(enemy.timer * 0.9) * 34 * dt; enemy.y = enemy.baseY + Math.sin(enemy.timer * 2.2) * 18;
    if (enemy.state === 'idle' && Math.abs(dx) < 180) { enemy.state = 'telegraph'; enemy.telegraph = 0.56; }
    if (enemy.state === 'telegraph') { enemy.telegraph -= dt; if (enemy.telegraph <= 0) { enemy.state = 'dive'; enemy.vx = Math.sign(dx || 1) * 220; enemy.vy = 280; enemy.timer = 0; } }
    if (enemy.state === 'dive') {
      enemy.x += enemy.vx * dt; enemy.y += enemy.vy * dt; if (enemy.y > enemy.baseY + 90 || enemy.timer > 0.6) { enemy.state = 'return'; enemy.timer = 0; }
    }
    if (enemy.state === 'return') {
      enemy.x += (Math.max(enemy.left, Math.min(enemy.right, enemy.x)) - enemy.x) * 0.12;
      enemy.y += (enemy.baseY - enemy.y) * 0.15; if (Math.abs(enemy.y - enemy.baseY) < 8) enemy.state = 'idle';
    }
  }
  if (enemy.type === 'bruiser') {
    enemy.x += 46 * enemy.dir * dt; if (enemy.x < enemy.left) enemy.dir = 1; if (enemy.x + enemy.width > enemy.right) enemy.dir = -1;
    if (enemy.state === 'idle' && Math.abs(dx) < 220) { enemy.state = 'telegraph'; enemy.telegraph = 0.78; }
    if (enemy.state === 'telegraph') { enemy.telegraph -= dt; if (enemy.telegraph <= 0) { enemy.state = 'slam'; enemy.timer = 0.5; enemy.vx = enemy.dir * 240; } }
    if (enemy.state === 'slam') { enemy.x += enemy.vx * dt; enemy.timer -= dt; if (enemy.timer <= 0) enemy.state = 'idle'; }
  }
}
function spawnEnemyShot(enemy, dx) {
  game.projectiles.push({ owner: 'enemy', kind: 'enemy-shot', x: enemy.x + enemy.width / 2 + Math.sign(dx || 1) * 18, y: enemy.y + 28, vx: Math.sign(dx || 1) * 290, width: 18, height: 10, damage: 1, dir: Math.sign(dx || 1), life: 1.4 });
}
function updateEnemies(dt) {
  const p = game.player;
  for (const enemy of game.enemies) {
    if (!enemy.active) continue;
    if (enemy.damageFlash > 0) enemy.damageFlash -= dt;
    const ground = enemyFootGround(enemy);
    if (ground !== null) {
      if (enemy.y + enemy.height >= ground && enemy.vy >= 0) { enemy.y = ground - enemy.height; enemy.vy = 0; enemy.grounded = true; }
      else { enemy.grounded = false; enemy.vy += 1200 * dt; enemy.y += enemy.vy * dt; }
    }
    updateEnemyTelegraph(enemy, dt, p);
  }
}
function updateProjectiles(dt) {
  for (const proj of game.projectiles) {
    if (!proj.active) proj.active = true;
    proj.x += proj.vx * dt; proj.life -= dt; Systems.pushProjectileTrail(proj); Systems.updateProjectileTrail(proj, dt);
    if (proj.life <= 0 || proj.x < -80 || proj.x > game.worldWidth + 80) { proj.active = false; continue; }
    if (proj.owner === 'player') {
      for (const entity of game.entities) {
        if (entity.destroyed || entity.type !== 'wall') continue;
        const ground = getGroundYAt(entity.x + entity.width / 2) ?? 580;
        const hitbox = { x: entity.x, y: ground - entity.height, width: entity.width, height: entity.height };
        if (intersect(proj, hitbox) && proj.kind === 'charged') {
          entity.destroyed = true; proj.active = false; game.stars += 1; updateCounters(); showMessage('Cañón cargado: ruta de ventaja abierta.');
          addRingFX(proj.x + proj.width / 2, proj.y + proj.height / 2, '#ffc76c', true); addSparkFX(proj.x + proj.width / 2, proj.y + proj.height / 2, '#ffd58a', 9, 1.4);
        }
      }
      for (const enemy of game.enemies) {
        if (!enemy.active) continue;
        const target = getEnemyTargetBox(enemy, proj);
        if (intersect(proj, target)) {
          if (applyDamageToEnemy(enemy, { damage: proj.damage, dir: proj.dir, kind: proj.kind })) {
            addRingFX(proj.x + proj.width / 2, proj.y + proj.height / 2, proj.kind === 'charged' ? '#ffc76c' : '#9ae8ff');
            proj.active = proj.kind === 'charged' ? proj.life > 0.2 : false;
          }
        }
      }
    } else if (proj.owner === 'enemy' && intersect(game.player, proj)) {
      proj.active = false; addRingFX(proj.x + proj.width / 2, proj.y + proj.height / 2, '#ffd8ff'); hurtPlayer('Disparo enemigo. Lee la carga antes del tiro.');
    }
  }
  game.projectiles = game.projectiles.filter(p => p.active !== false);
}
function stompedEnemy(enemy) { return game.player.vy > 90 && game.player.y + game.player.height - enemy.y < 28; }
function handleEnemyCollisions() {
  const p = game.player;
  for (const enemy of game.enemies) {
    if (!enemy.active) continue; const body = getEnemyTargetBox(enemy);
    if (intersect(p, body)) {
      if (stompedEnemy(enemy) || (state.selectedCharacter.id === 'd16' && p.form === 'robot' && Math.abs(p.vy) > 250)) { applyDamageToEnemy(enemy, { damage: 1.5, aerial: true, dir: p.facing }); p.vy = -320; }
      else if (enemy.type !== 'drone' || enemy.state === 'dive') { hurtPlayer('Enemigo encima. Espera el telegraph y responde.'); }
    }
  }
}
function updateEntities(dt) {
  const p = game.player;
  for (const entity of game.entities) {
    if (entity.collected || entity.destroyed) continue;
    if (entity.type === 'crumble' && entity.timer > 0) { entity.timer -= dt; if (entity.timer <= 0) entity.falling = true; }
    if (entity.falling) { entity.vy += 1000 * dt; entity.y += entity.vy * dt; if (entity.y > canvas.clientHeight + 120) entity.destroyed = true; }

    if (entity.type === 'energon') {
      const hitbox = { x: entity.x - 18, y: entity.y - 18, width: 36, height: 36 };
      if (intersect(p, hitbox)) { entity.collected = true; game.energy += 1; if (game.energy % 4 === 0) game.stars += 1; updateCounters(); }
    }
    if (entity.type === 'miniBot') {
      const hitbox = { x: entity.x - 32, y: entity.y - 40, width: 64, height: 64 };
      if (intersect(p, hitbox)) { entity.collected = true; game.bots += 1; game.stars += 2; updateCounters(); showMessage('Mini bot rescatado. Buen cierre.', true); }
    }
    if (entity.type === 'checkpoint') {
      const hitbox = { x: entity.x - 18, y: 0, width: 36, height: 720 };
      if (intersect(p, hitbox)) { game.respawnX = entity.x - 80; game.checkpointIndex = Math.max(game.checkpointIndex, game.checkpoints.indexOf(entity)); }
    }
    if (entity.type === 'barrier') {
      const ground = getGroundYAt(entity.x + entity.width / 2) ?? 580; const hitbox = { x: entity.x, y: ground - entity.height, width: entity.width, height: entity.height };
      if (intersect(p, hitbox) && p.y + p.height > hitbox.y + 10) { p.x = p.vx > 0 ? hitbox.x - p.width - 2 : hitbox.x + hitbox.width + 2; p.vx = 0; showMessage('Obstáculo rojo: salta con margen, no con precisión ridícula.'); }
    }
    if (entity.type === 'wall') {
      const ground = getGroundYAt(entity.x + entity.width / 2) ?? 580; const hitbox = { x: entity.x, y: ground - entity.height, width: entity.width, height: entity.height };
      if (intersect(p, hitbox)) {
        if (state.selectedCharacter.id === 'd16' && (Math.abs(p.vx) > 120 || game.projectiles.some(pr => pr.owner === 'player' && pr.kind === 'charged' && intersect(pr, hitbox)))) { entity.destroyed = true; game.stars += 1; updateCounters(); showMessage('Ruta de ventaja abierta por D-16.'); }
        else { p.x = p.vx > 0 ? hitbox.x - p.width - 2 : hitbox.x + hitbox.width + 2; p.vx = 0; showMessage('Muro pesado: la ruta principal sigue abierta, pero D-16 domina esta ventaja.'); }
      }
    }
    if (entity.type === 'finish') {
      const ground = getGroundYAt(entity.x + entity.width / 2) ?? 580; const hitbox = { x: entity.x, y: ground - 150, width: entity.width, height: 150 };
      if (!game.justCompleted && intersect(p, hitbox)) completeLevel();
    }
  }
  for (const beat of game.currentLevel.beats) if (!beat.done && p.x >= beat.x) { beat.done = true; showMessage(beat.message, beat.x === 0); }
}
function completeLevel() {
  game.justCompleted = true; game.running = false; setImageWithFallback(ui.rewardRobot, state.selectedCharacter.robotFrames[1], makeSpriteFallback(state.selectedCharacter, 'robot'));
  ui.rewardLoot.innerHTML = `<div class="reward-pill">⚡ Energón: ${game.energy}</div><div class="reward-pill">★ Estrellas: ${game.stars}</div><div class="reward-pill">🤖 Bots rescatados: ${game.bots}</div><div class="reward-pill">Ruta de ventaja: ${state.selectedCharacter.abilities[0]}</div>`; setScreen('reward');
}
function updateCamera() { const target = game.player.x + game.player.width * 0.5 - canvas.clientWidth * 0.38; const maxCamera = Math.max(0, game.worldWidth - canvas.clientWidth); game.cameraX += (Math.max(0, Math.min(maxCamera, target)) - game.cameraX) * 0.12; }
function getFrameSource(character, form, animationTime, speed) {
  const frames = form === 'vehicle' ? character.vehicleFrames : character.robotFrames; const moving = Math.abs(speed) > 30; const idx = moving ? Math.floor(animationTime * 7) % frames.length : 1; return assets.images[frames[idx]] || assets.images[frames[1]];
}
function drawBackground() {
  const w = canvas.clientWidth, h = canvas.clientHeight, cam = game.cameraX;
  const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#08162f'); sky.addColorStop(0.38, '#102b59'); sky.addColorStop(0.72, '#18355e'); sky.addColorStop(1, '#0d1730'); ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  const sun = ctx.createRadialGradient(w * 0.78, h * 0.22, 20, w * 0.78, h * 0.22, 180); sun.addColorStop(0, 'rgba(255,220,128,.9)'); sun.addColorStop(0.3, 'rgba(255,160,95,.32)'); sun.addColorStop(1, 'rgba(255,160,95,0)'); ctx.fillStyle = sun; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 12; i += 1) { const starX = ((i * 173) - cam * 0.08) % (w + 220); const starY = 50 + (i % 5) * 38; ctx.fillRect(starX, starY, 2, 2); }
  ctx.fillStyle = '#122745'; for (let i = 0; i < 7; i += 1) { const baseX = ((i * 360) - cam * 0.14) % (w + 420) - 180; ctx.beginPath(); ctx.moveTo(baseX, h - 215); ctx.lineTo(baseX + 90, h - 330); ctx.lineTo(baseX + 180, h - 215); ctx.closePath(); ctx.fill(); }
  for (let i = 0; i < 8; i += 1) { const px = ((i * 310) - cam * 0.24) % (w + 340) - 110; ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(px, 150 + (i % 3) * 26, 74, 250); ctx.fillRect(px + 82, 188 + (i % 2) * 24, 44, 208); ctx.fillStyle = 'rgba(68,239,255,.08)'; ctx.fillRect(px + 8, 166 + (i % 3) * 26, 10, 170); ctx.fillRect(px + 92, 204 + (i % 2) * 24, 8, 130); }
  ctx.fillStyle = '#132b4f'; ctx.fillRect(0, h - 164, w, 164); ctx.fillStyle = '#1c4273'; ctx.fillRect(0, h - 116, w, 116); ctx.fillStyle = '#2f5f98'; ctx.fillRect(0, h - 116, w, 10);
  for (let x = -100; x < w + 120; x += 64) { const px = x + (-cam * 0.35 % 64); ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(px, h - 104, 38, 4); ctx.fillStyle = 'rgba(68,239,255,.16)'; ctx.fillRect(px + 8, h - 101, 10, 2); }
}
function worldToScreenX(x) { return x - game.cameraX; }
function drawTerrain() {
  const h = canvas.clientHeight;
  for (const seg of game.currentLevel.terrain) {
    const sx = worldToScreenX(seg.from), ex = worldToScreenX(seg.to); if (ex < -100 || sx > canvas.clientWidth + 100) continue;
    ctx.fillStyle = '#1f3d68'; ctx.fillRect(sx, seg.y, ex - sx, h - seg.y); ctx.fillStyle = '#3e74ad'; ctx.fillRect(sx, seg.y, ex - sx, 16); ctx.fillStyle = '#7ed0ff'; for (let x = sx; x < ex; x += 42) ctx.fillRect(x, seg.y + 10, 16, 3);
  }
  for (const entity of game.entities) {
    if (entity.collected || entity.destroyed || ((entity.type !== 'platform' && entity.type !== 'crumble'))) continue;
    const x = worldToScreenX(entity.x); const platGrad = ctx.createLinearGradient(x, entity.y, x, entity.y + entity.height); platGrad.addColorStop(0, entity.type === 'crumble' ? '#ff9a4a' : '#537db0'); platGrad.addColorStop(1, entity.type === 'crumble' ? '#7e2f14' : '#2a4361'); ctx.fillStyle = platGrad; ctx.fillRect(x, entity.y, entity.width, entity.height); ctx.fillStyle = entity.type === 'crumble' ? '#ffd3a8' : '#b8e8ff'; ctx.fillRect(x, entity.y, entity.width, 5); ctx.fillStyle = entity.type === 'crumble' ? 'rgba(255,234,160,.38)' : 'rgba(255,216,77,.38)'; for (let px = x + 8; px < x + entity.width - 10; px += 24) ctx.fillRect(px, entity.y + entity.height - 5, 12, 2);
  }
}
function drawChevronStrip(x, y, width, color) { ctx.fillStyle = color; for (let i = 0; i < width; i += 28) { ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(x + i + 10, y); ctx.lineTo(x + i + 18, y + 10); ctx.lineTo(x + i + 8, y + 10); ctx.closePath(); ctx.fill(); } }
function drawLabel(x, y, text, color) { ctx.font = '700 14px Inter, Arial'; const width = Math.max(66, ctx.measureText(text).width + 18); ctx.fillStyle = 'rgba(8,15,31,.8)'; ctx.beginPath(); ctx.roundRect(x - width / 2, y - 16, width, 26, 13); ctx.fill(); ctx.fillStyle = color; ctx.fillText(text, x - width / 2 + 9, y + 2); }
function drawEntities() {
  for (const entity of game.entities) {
    if (entity.collected || entity.destroyed) continue; const x = worldToScreenX(entity.x);
    if (entity.type === 'energon') { ctx.save(); ctx.translate(x, entity.y); ctx.rotate(performance.now() * 0.002); ctx.fillStyle = '#65f0ff'; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(14, 0); ctx.lineTo(0, 18); ctx.lineTo(-14, 0); ctx.closePath(); ctx.fill(); ctx.restore(); }
    if (entity.type === 'gap') { const gapGrad = ctx.createLinearGradient(x, 580, x, canvas.clientHeight); gapGrad.addColorStop(0, 'rgba(61,164,255,.65)'); gapGrad.addColorStop(1, 'rgba(5,12,25,.88)'); ctx.fillStyle = gapGrad; ctx.fillRect(x, 580, entity.width, canvas.clientHeight - 580); ctx.fillStyle = '#9ee3ff'; ctx.fillRect(x, 580, entity.width, 12); drawLabel(x + entity.width / 2, 548, entity.label, '#3da4ff'); drawChevronStrip(x + 12, 594, entity.width - 24, '#9ee3ff'); }
    if (entity.type === 'barrier') {
      const ground = getGroundYAt(entity.x + entity.width / 2) ?? 580, top = ground - entity.height; const fireGrad = ctx.createLinearGradient(x, top, x, ground); fireGrad.addColorStop(0, '#ffe27a'); fireGrad.addColorStop(0.32, '#ff8f3c'); fireGrad.addColorStop(1, '#b51f13'); ctx.fillStyle = fireGrad; ctx.beginPath(); ctx.roundRect(x, top, entity.width, entity.height, 14); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.18)'; for (let fx = x + 8; fx < x + entity.width - 8; fx += 18) { ctx.beginPath(); ctx.moveTo(fx, ground - 8); ctx.quadraticCurveTo(fx + 8, top + 18, fx + 14, ground - 20); ctx.quadraticCurveTo(fx + 18, top + 36, fx + 24, ground - 10); ctx.closePath(); ctx.fill(); } ctx.strokeStyle = '#ffd67f'; ctx.lineWidth = 3; ctx.strokeRect(x + 4, top + 4, entity.width - 8, entity.height - 8); drawLabel(x + entity.width / 2, top - 22, entity.label, '#ffb35f');
    }
    if (entity.type === 'wall') { const ground = getGroundYAt(entity.x + entity.width / 2) ?? 580; ctx.fillStyle = '#707b8f'; ctx.fillRect(x, ground - entity.height, entity.width, entity.height); ctx.fillStyle = '#cfd6e3'; for (let yy = ground - entity.height + 10; yy < ground - 10; yy += 22) ctx.fillRect(x + 10, yy, entity.width - 20, 6); drawLabel(x + entity.width / 2, ground - entity.height - 22, entity.label, '#c3cad8'); }
    if (entity.type === 'checkpoint') { ctx.fillStyle = '#65f0a6'; ctx.fillRect(x - 5, 440, 10, 140); ctx.fillStyle = 'rgba(101,240,166,.18)'; ctx.fillRect(x + 5, 452, 50, 30); }
    if (entity.type === 'miniBot') { ctx.fillStyle = '#8dffba'; ctx.beginPath(); ctx.roundRect(x - 26, entity.y - 42, 52, 52, 14); ctx.fill(); ctx.fillStyle = '#173523'; ctx.fillRect(x - 12, entity.y - 26, 8, 8); ctx.fillRect(x + 4, entity.y - 26, 8, 8); }
    if (entity.type === 'finish') { const ground = getGroundYAt(entity.x + entity.width / 2) ?? 580; ctx.fillStyle = '#65f0a6'; ctx.fillRect(x, ground - 150, 14, 150); ctx.fillStyle = '#d9fff0'; ctx.beginPath(); ctx.moveTo(x + 14, ground - 146); ctx.lineTo(x + entity.width, ground - 122); ctx.lineTo(x + 14, ground - 96); ctx.closePath(); ctx.fill(); }
  }
}
function drawEnemyTelegraph(enemy, x, y) {
  if ((enemy.state === 'telegraph' || enemy.telegraph > 0) && enemy.active) {
    const pulse = 0.72 + Math.abs(Math.sin(performance.now() * 0.014)) * 0.28;
    ctx.save();
    ctx.strokeStyle = `rgba(255,216,77,${0.45 + pulse * 0.25})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(x - 4, y - 4, enemy.width + 8, enemy.height + 8, 18); ctx.stroke();
    ctx.fillStyle = 'rgba(255,225,125,.96)'; ctx.beginPath(); ctx.roundRect(x + enemy.width * 0.18, y - 28, enemy.width * 0.64, 16, 8); ctx.fill();
    ctx.fillStyle = '#2f1a04'; ctx.fillRect(x + enemy.width * 0.24, y - 22, enemy.width * 0.52, 4);
    ctx.fillStyle = '#fff6ce'; ctx.font = '900 12px Inter, Arial'; ctx.fillText('!', x + enemy.width * 0.48, y - 15);
    ctx.restore();
  }
}
function drawEnemies() {
  for (const enemy of game.enemies) {
    if (!enemy.active) continue; const x = worldToScreenX(enemy.x), y = enemy.y;
    ctx.save(); ctx.translate(x + enemy.width / 2, y + enemy.height / 2); if (enemy.type !== 'turret' && enemy.type !== 'drone') ctx.scale(enemy.dir, 1);
    ctx.globalAlpha = enemy.damageFlash > 0 ? 0.55 : 1;
    if (enemy.type === 'patroller' || enemy.type === 'rusher') {
      const grad = ctx.createLinearGradient(-34, -24, 34, 24); grad.addColorStop(0, '#6d5cff'); grad.addColorStop(1, enemy.type === 'rusher' ? '#ff7f66' : '#c779ff'); ctx.fillStyle = grad; ctx.beginPath(); ctx.roundRect(-34, -24, 68, 48, 18); ctx.fill(); ctx.fillStyle = '#eff4ff'; ctx.fillRect(-16, -8, 10, 10); ctx.fillRect(6, -8, 10, 10); ctx.fillStyle = '#2b1a55'; ctx.fillRect(-28, 10, 56, 9); if (enemy.type === 'rusher') { ctx.fillStyle = '#ffd36c'; ctx.fillRect(22, -4, 16, 8); }
    }
    if (enemy.type === 'hopper') {
      const pulse = Math.sin(performance.now() * 0.012) * 3; ctx.fillStyle = '#f96cc9'; ctx.beginPath(); ctx.roundRect(-30, -25 + pulse, 60, 50, 18); ctx.fill(); ctx.fillStyle = '#2f123e'; ctx.fillRect(-18, -8 + pulse, 10, 10); ctx.fillRect(8, -8 + pulse, 10, 10); ctx.fillStyle = '#ffd6f2'; ctx.beginPath(); ctx.moveTo(-24, 18 + pulse); ctx.lineTo(-6, 28 + pulse); ctx.lineTo(-22, 28 + pulse); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(24, 18 + pulse); ctx.lineTo(6, 28 + pulse); ctx.lineTo(22, 28 + pulse); ctx.closePath(); ctx.fill();
    }
    if (enemy.type === 'shield') {
      const grad = ctx.createLinearGradient(-34, -28, 34, 28); grad.addColorStop(0, '#3c5c8a'); grad.addColorStop(1, '#93b8ff'); ctx.fillStyle = grad; ctx.beginPath(); ctx.roundRect(-34, -28, 68, 56, 18); ctx.fill(); ctx.fillStyle = '#13233f'; ctx.beginPath(); ctx.moveTo(8, -22); ctx.lineTo(34, -10); ctx.lineTo(34, 10); ctx.lineTo(8, 22); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#dff4ff'; ctx.fillRect(-18, -10, 10, 10); ctx.fillRect(-2, -10, 10, 10);
    }
    if (enemy.type === 'turret') {
      const grad = ctx.createLinearGradient(-40, -34, 40, 34); grad.addColorStop(0, '#47556e'); grad.addColorStop(1, '#ab6df5'); ctx.fillStyle = grad; ctx.beginPath(); ctx.roundRect(-38, -34, 76, 68, 18); ctx.fill(); ctx.fillStyle = '#ebdcff'; ctx.fillRect(-16, -12, 32, 14); ctx.fillStyle = '#1f1739'; const barrelDir = Math.sign(((game.player.x + game.player.width / 2) - (enemy.x + enemy.width / 2)) || 1); ctx.fillRect(0, -5, 32 * barrelDir, 10); ctx.fillStyle = '#82ddff'; ctx.beginPath(); ctx.arc(0, 18, 10, 0, Math.PI * 2); ctx.fill();
    }
    if (enemy.type === 'drone') {
      ctx.fillStyle = '#91f3ff'; ctx.beginPath(); ctx.roundRect(-34, -16, 68, 32, 16); ctx.fill(); ctx.fillStyle = '#0f2842'; ctx.fillRect(-14, -6, 10, 10); ctx.fillRect(4, -6, 10, 10); ctx.fillStyle = '#7ec1ff'; ctx.fillRect(-42, -6, 8, 4); ctx.fillRect(34, -6, 8, 4);
    }
    if (enemy.type === 'bruiser') {
      const grad = ctx.createLinearGradient(-48, -36, 48, 36); grad.addColorStop(0, '#6a5560'); grad.addColorStop(1, '#ff7a8b'); ctx.fillStyle = grad; ctx.beginPath(); ctx.roundRect(-48, -36, 96, 72, 20); ctx.fill(); ctx.fillStyle = '#250d16'; ctx.fillRect(-22, -10, 14, 14); ctx.fillRect(8, -10, 14, 14); ctx.fillStyle = '#ffd4db'; ctx.fillRect(-54, 10, 24, 10); ctx.fillRect(30, 10, 24, 10);
    }
    ctx.restore(); drawEnemyTelegraph(enemy, x, y);
    if (enemy.type === 'bruiser') { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + 6, y - 10, enemy.width - 12, 6); ctx.fillStyle = '#ff8e9b'; ctx.fillRect(x + 6, y - 10, (enemy.width - 12) * (enemy.hp / 4), 6); }
  }
}
function drawProjectiles() {
  for (const proj of game.projectiles) {
    if (proj.trail?.length) {
      for (const step of proj.trail) {
        const tx = worldToScreenX(step.x);
        ctx.globalAlpha = Math.max(0, step.t / Systems.CombatTuning.projectileTrailLife) * 0.65;
        ctx.fillStyle = step.color;
        ctx.beginPath(); ctx.arc(tx, step.y, step.size * (0.35 + step.t / Systems.CombatTuning.projectileTrailLife), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    const x = worldToScreenX(proj.x);
    const fill = proj.owner === 'player' ? (proj.kind === 'charged' ? '#ffc76c' : '#9ae8ff') : '#f4d7ff';
    ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, proj.y, proj.width, proj.height, proj.kind === 'charged' ? 9 : 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.58)'; ctx.fillRect(x + 4, proj.y + 3, Math.max(6, proj.width - 8), 3);
    ctx.strokeStyle = proj.kind === 'charged' ? 'rgba(255,212,138,.82)' : 'rgba(216,251,255,.8)'; ctx.lineWidth = 2; ctx.stroke();
  }
}
function drawFX(dt = 0.016) {
  game.fx = game.fx.filter((fx) => (fx.t -= dt) > 0);
  for (const fx of game.fx) {
    const x = worldToScreenX(fx.x);
    if (fx.kind === 'spark') {
      fx.x += (fx.vx || 0) * dt; fx.y += (fx.vy || 0) * dt; fx.vy = (fx.vy || 0) + 120 * dt;
      ctx.globalAlpha = Math.max(0, fx.t / 0.34); ctx.fillStyle = fx.color; ctx.beginPath(); ctx.arc(worldToScreenX(fx.x), fx.y, fx.size || 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; continue;
    }
    if (fx.kind === 'text') {
      fx.y += (fx.vy || -28) * dt; ctx.globalAlpha = Math.max(0, fx.t / 0.55); ctx.fillStyle = fx.color; ctx.font = '900 14px Inter, Arial'; ctx.fillText(fx.text, x - 12, fx.y); ctx.globalAlpha = 1; continue;
    }
    ctx.globalAlpha = Math.max(0, fx.t / 0.28); ctx.strokeStyle = fx.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, fx.y, fx.burst ? (1 - fx.t / 0.28) * 34 : 12 + (1 - fx.t / 0.18) * 8, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  }
}
function drawPlayerAttack() {
  const p = game.player; if (!p?.attack) return; const box = getAttackHitbox(p, p.attack); if (!box) return; const x = worldToScreenX(box.x); ctx.fillStyle = 'rgba(154,232,255,.18)'; ctx.fillRect(x, box.y, box.width, box.height); ctx.strokeStyle = 'rgba(154,232,255,.55)'; ctx.strokeRect(x, box.y, box.width, box.height);
}
function drawPlayer() {
  const p = game.player, c = state.selectedCharacter, img = getFrameSource(c, p.form, p.animationTime, p.vx), sx = worldToScreenX(p.x);
  ctx.save(); if (p.invuln > 0 && Math.floor(p.invuln * 10) % 2 === 0) ctx.globalAlpha = 0.5; if (p.facing < 0) { ctx.translate(sx + p.width / 2, 0); ctx.scale(-1, 1); ctx.drawImage(img, -p.width / 2, p.y, p.width, p.height); } else ctx.drawImage(img, sx, p.y, p.width, p.height);
  if (c.id === 'elita' && !p.onGround && game.input.jumpHeld && p.vy > 0) { ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.moveTo(sx + p.width / 2, p.y + 48); ctx.lineTo(sx - 10, p.y + 84); ctx.lineTo(sx + p.width + 10, p.y + 84); ctx.closePath(); ctx.fill(); }
  if (p.charging) { ctx.fillStyle = 'rgba(255, 199, 108, .8)'; ctx.beginPath(); ctx.arc(sx + p.width * .7, p.y + 46, 12 + p.chargeTime * 18, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore(); drawPlayerAttack();
}
function render(dt = 0.016) { drawBackground(); drawTerrain(); drawEntities(); drawEnemies(); drawProjectiles(); drawFX(dt); drawPlayer(); }
function updateLoop(now) {
  if (!game.frameTime) game.frameTime = now; const dt = Math.min(0.025, (now - game.frameTime) / 1000); game.frameTime = now;
  if (timing.hitStop > 0) { timing.hitStop = Math.max(0, timing.hitStop - dt); render(dt); requestAnimationFrame(updateLoop); return; }
  if (game.running) { updatePlayer(dt); updateCombat(dt); updateEnemies(dt); updateProjectiles(dt); updateEntities(dt); handleEnemyCollisions(); updateCamera(); render(dt); if (game.messageTimer > 0) game.messageTimer -= dt; }
  requestAnimationFrame(updateLoop);
}
function setupButtons() {
  document.getElementById('playButton').addEventListener('click', startGame); document.getElementById('playAgainButton').addEventListener('click', startGame); document.getElementById('homeButton').addEventListener('click', () => setScreen('home'));
  document.getElementById('pauseToHomeButton').addEventListener('click', () => { game.running = false; setScreen('home'); });
  ui.previewButton.addEventListener('click', () => { state.previewForm = state.previewForm === 'robot' ? 'vehicle' : 'robot'; updateHomePreview(); });
  ui.soundToggle.addEventListener('click', () => { audioState.enabled = !audioState.enabled; ui.soundToggle.textContent = audioState.enabled ? '🔊' : '🔇'; localStorage.setItem('cyber-bot-audio', audioState.enabled ? '1' : '0'); if (!audioState.enabled && 'speechSynthesis' in window) window.speechSynthesis.cancel(); });
  const jumpButton = document.getElementById('jumpButton'), transformButton = document.getElementById('transformButton'), attackButton = document.getElementById('attackButton');
  const activateJump = e => { e.preventDefault(); handleJumpPress(); }, releaseJump = e => { e.preventDefault(); game.input.jumpHeld = false; };
  ['pointerdown', 'touchstart'].forEach(evt => jumpButton.addEventListener(evt, activateJump, { passive: false })); ['pointerup', 'pointercancel', 'touchend'].forEach(evt => jumpButton.addEventListener(evt, releaseJump, { passive: false }));
  ['click','pointerdown'].forEach(evt => transformButton.addEventListener(evt, e => { e.preventDefault(); handleTransform(); }, { passive: false }));
  const attackDown = e => { e.preventDefault(); game.input.attackPressed = true; game.input.attackHeld = true; };
  const attackUp = e => { e.preventDefault(); game.input.attackHeld = false; game.input.attackReleased = true; };
  ['pointerdown', 'touchstart'].forEach(evt => attackButton.addEventListener(evt, attackDown, { passive: false })); ['pointerup', 'pointercancel', 'touchend'].forEach(evt => attackButton.addEventListener(evt, attackUp, { passive: false }));
  window.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); handleJumpPress(); }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX') { e.preventDefault(); handleTransform(); }
    if (e.code === 'KeyJ' || e.code === 'KeyK' || e.code === 'ControlRight') { e.preventDefault(); game.input.attackPressed = true; game.input.attackHeld = true; }
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') game.joystick.dirX = -1; if (e.code === 'ArrowRight' || e.code === 'KeyD') game.joystick.dirX = 1;
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') game.input.jumpHeld = false;
    if (e.code === 'KeyJ' || e.code === 'KeyK' || e.code === 'ControlRight') { game.input.attackHeld = false; game.input.attackReleased = true; }
    if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowRight' || e.code === 'KeyD') game.joystick.dirX = 0;
  });
}
function updateJoystickVisual(nx, ny) { joystickKnob.style.transform = `translate(calc(-50% + ${nx * game.joystick.radius}px), calc(-50% + ${ny * game.joystick.radius}px))`; }
function resetJoystick() { game.joystick.active = false; game.joystick.pointerId = null; game.joystick.dirX = 0; updateJoystickVisual(0, 0); }
function setupJoystick() {
  const onMove = (clientX, clientY) => {
    const rect = joystickBase.getBoundingClientRect(), cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2; let dx = clientX - cx, dy = clientY - cy; const distance = Math.hypot(dx, dy), max = rect.width * 0.32;
    if (distance > max) { dx = (dx / distance) * max; dy = (dy / distance) * max; }
    const nx = dx / max, ny = dy / max; game.joystick.dirX = Math.abs(nx) < 0.18 ? 0 : nx; updateJoystickVisual(nx, ny);
  };
  joystickBase.addEventListener('pointerdown', e => { e.preventDefault(); game.joystick.active = true; game.joystick.pointerId = e.pointerId; joystickBase.setPointerCapture(e.pointerId); onMove(e.clientX, e.clientY); });
  joystickBase.addEventListener('pointermove', e => { if (!game.joystick.active || e.pointerId !== game.joystick.pointerId) return; onMove(e.clientX, e.clientY); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(evt => joystickBase.addEventListener(evt, e => { if (game.joystick.pointerId !== null && e.pointerId !== game.joystick.pointerId) return; resetJoystick(); }));
}
let initialized = false;
function init() {
  if (initialized) return;
  initialized = true;
  const savedChar = localStorage.getItem('cyber-bot-selected');
  state.selectedCharacter = getCharacterById(savedChar || characters[0].id);
  audioState.enabled = localStorage.getItem('cyber-bot-audio') !== '0';
  ui.soundToggle.textContent = audioState.enabled ? '🔊' : '🔇';
  document.documentElement.classList.toggle('touch-device', window.matchMedia ? matchMedia('(pointer: coarse)').matches : false);
  renderCharacterCards();
  updateHomePreview();
  setupButtons();
  setupJoystick();
  setupInstallPrompt();
  registerServiceWorker();
  resizeCanvas();
  requestAnimationFrame(updateLoop);
  preloadAssets().then(() => {
    renderCharacterCards();
    updateHomePreview();
  }).catch(() => {});
}
window.addEventListener('resize', resizeCanvas);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}