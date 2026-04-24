(() => {
  const { characters, levelTemplate } = window.GameData;

  const screens = {
    home: document.getElementById('homeScreen'),
    game: document.getElementById('gameScreen'),
    reward: document.getElementById('rewardScreen')
  };

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const BASE_WIDTH = 1280;
  const BASE_HEIGHT = 720;
  const PLAYER_START_X = 220;

  const layout = {
    ratio: 1,
    scale: 1,
    cssWidth: BASE_WIDTH,
    cssHeight: BASE_HEIGHT,
    viewWidth: BASE_WIDTH,
    viewHeight: BASE_HEIGHT
  };

  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function roundRect(x, y, width, height, radius = 0) {
      const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
      this.moveTo(x + r, y);
      this.lineTo(x + width - r, y);
      this.quadraticCurveTo(x + width, y, x + width, y + r);
      this.lineTo(x + width, y + height - r);
      this.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
      this.lineTo(x + r, y + height);
      this.quadraticCurveTo(x, y + height, x, y + height - r);
      this.lineTo(x, y + r);
      this.quadraticCurveTo(x, y, x + r, y);
      return this;
    };
  }

  const ui = {
    installButton: document.getElementById('installButton'),
    soundToggle: document.getElementById('soundToggle'),
    heroPreview: document.getElementById('heroPreview'),
    heroName: document.getElementById('heroName'),
    heroRole: document.getElementById('heroRole'),
    heroDesc: document.getElementById('heroDesc'),
    selectedTag: document.getElementById('selectedTag'),
    abilityPrimary: document.getElementById('abilityPrimary'),
    abilitySecondary: document.getElementById('abilitySecondary'),
    statControl: document.getElementById('statControl'),
    statJump: document.getElementById('statJump'),
    statSpeed: document.getElementById('statSpeed'),
    statPower: document.getElementById('statPower'),
    carousel: document.getElementById('characterCarousel'),
    playButton: document.getElementById('playButton'),
    previewButton: document.getElementById('toggleFormPreviewButton'),
    pauseButton: document.getElementById('pauseToHomeButton'),
    jumpButton: document.getElementById('jumpButton'),
    transformButton: document.getElementById('transformButton'),
    voiceBubble: document.getElementById('voiceBubble'),
    energyCount: document.getElementById('energyCount'),
    starCount: document.getElementById('starCount'),
    botCount: document.getElementById('botCount'),
    progressFill: document.getElementById('progressFill'),
    rewardRobot: document.getElementById('rewardRobot'),
    rewardLoot: document.getElementById('rewardLoot'),
    playAgainButton: document.getElementById('playAgainButton'),
    homeButton: document.getElementById('homeButton')
  };

  const state = {
    selectedCharacter: characters[0],
    previewForm: 'robot',
    deferredInstallPrompt: null
  };

  const audioState = {
    enabled: true,
    context: null,
    recordedCatalog: {},
    currentVoice: null
  };

  const assets = { images: {} };

  const game = {
    running: false,
    cameraX: 0,
    worldWidth: levelTemplate.worldWidth,
    groundY: levelTemplate.groundY,
    player: null,
    entities: [],
    enemies: [],
    energy: 0,
    stars: 0,
    bots: 0,
    respawnX: PLAYER_START_X,
    failCount: 0,
    lastTime: 0,
    currentPrompt: null,
    promptRepeatAt: 0,
    particles: []
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function setScreen(name) {
    Object.entries(screens).forEach(([key, element]) => element.classList.toggle('active', key === name));
  }

  function getViewportSize() {
    const viewport = window.visualViewport;
    return {
      width: Math.max(320, Math.floor(viewport?.width || window.innerWidth || document.documentElement.clientWidth || BASE_WIDTH)),
      height: Math.max(240, Math.floor(viewport?.height || window.innerHeight || document.documentElement.clientHeight || BASE_HEIGHT))
    };
  }

  function resizeCanvas() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const { width, height } = getViewportSize();
    const scale = Math.max(.34, Math.min(width / BASE_WIDTH, height / BASE_HEIGHT, 1.25));

    layout.ratio = ratio;
    layout.scale = scale;
    layout.cssWidth = width;
    layout.cssHeight = height;
    layout.viewWidth = width / scale;
    layout.viewHeight = height / scale;

    document.documentElement.style.setProperty('--app-width', `${width}px`);
    document.documentElement.style.setProperty('--app-height', `${height}px`);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  function preloadAssets() {
    const urls = new Set();
    characters.forEach((character) => {
      character.robotFrames.forEach((src) => urls.add(src));
      character.vehicleFrames.forEach((src) => urls.add(src));
    });

    return Promise.all([...urls].map((src) => new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        assets.images[src] = image;
        resolve();
      };
      image.onerror = () => resolve();
      image.src = src;
    })));
  }

  function getFrame(character, form, animationTime, speed) {
    const frames = form === 'vehicle' ? character.vehicleFrames : character.robotFrames;
    const moving = Math.abs(speed) > 30;
    const index = moving ? Math.floor(animationTime * 8) % frames.length : 1;
    return assets.images[frames[index]] || assets.images[frames[1]] || null;
  }

  function updateHomePreview() {
    const character = state.selectedCharacter;
    const src = state.previewForm === 'vehicle' ? character.vehicleFrames[1] : character.robotFrames[1];
    ui.heroPreview.src = src;
    ui.heroName.textContent = character.name;
    ui.heroRole.textContent = character.role;
    ui.heroDesc.textContent = character.desc;
    ui.selectedTag.textContent = character.role;
    ui.abilityPrimary.textContent = character.abilities[0];
    ui.abilitySecondary.textContent = character.abilities[1] || '';
    ui.statControl.textContent = character.stats.control;
    ui.statJump.textContent = character.stats.jump;
    ui.statSpeed.textContent = character.stats.speed;
    ui.statPower.textContent = character.stats.power;
  }

  function selectCharacter(index, announce = true) {
    state.selectedCharacter = characters[index] || characters[0];
    state.previewForm = 'robot';
    localStorage.setItem('cyber-bot-selected', state.selectedCharacter.id);
    [...ui.carousel.children].forEach((card, cardIndex) => card.classList.toggle('selected', cardIndex === index));
    updateHomePreview();
    if (announce) speak(state.selectedCharacter.name, `character-${state.selectedCharacter.id}`);
  }

  function renderCharacterCards() {
    ui.carousel.innerHTML = '';
    characters.forEach((character, index) => {
      const card = document.createElement('button');
      card.className = 'character-card';
      card.setAttribute('aria-label', character.name);
      card.innerHTML = `<img class="card-sprite" src="${character.robotFrames[1]}" alt="">`;
      card.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        selectCharacter(index);
      });
      ui.carousel.appendChild(card);
    });
    const savedIndex = Math.max(0, characters.findIndex((character) => character.id === state.selectedCharacter.id));
    selectCharacter(savedIndex, false);
  }

  function getAudioContext() {
    if (!audioState.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioState.context = new AudioContextClass();
    }
    if (audioState.context?.state === 'suspended') audioState.context.resume().catch(() => {});
    return audioState.context;
  }

  function tone(kind = 'jump') {
    if (!audioState.enabled) return;
    const audio = getAudioContext();
    if (!audio) return;
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const table = {
      jump: [420, 720, 0.13, 'triangle'],
      transform: [150, 520, 0.22, 'sawtooth'],
      collect: [780, 1040, 0.11, 'square'],
      success: [520, 860, 0.26, 'sine'],
      soft: [220, 180, 0.16, 'triangle']
    }[kind] || [420, 720, 0.13, 'triangle'];
    osc.type = table[3];
    osc.frequency.setValueAtTime(table[0], now);
    osc.frequency.exponentialRampToValueAtTime(table[1], now + table[2]);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + table[2]);
    osc.connect(gain).connect(audio.destination);
    osc.start(now);
    osc.stop(now + table[2] + 0.03);
  }

  function loadRecordedVoiceCatalog() {
    if (location.protocol === 'file:') return Promise.resolve();
    return fetch('./audio/voice/voice-map.json')
      .then((response) => response.ok ? response.json() : {})
      .then((data) => { audioState.recordedCatalog = data.lines || {}; })
      .catch(() => {});
  }

  function fallbackSpeech(text) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices?.() || [];
      utterance.lang = 'es-CL';
      utterance.pitch = 1.22;
      utterance.rate = 1.02;
      utterance.voice = voices.find((voice) => /es|spanish/i.test(voice.lang) && /google|microsoft|paulina|helena|dalia/i.test(voice.name)) || voices.find((voice) => /es/i.test(voice.lang)) || null;
      window.speechSynthesis.speak(utterance);
    } catch (_) {}
  }

  function playRecordedVoice(key, fallbackText) {
    const line = key ? audioState.recordedCatalog[key] : null;
    if (!line?.src) return false;
    try {
      if (audioState.currentVoice) {
        audioState.currentVoice.pause();
        audioState.currentVoice.currentTime = 0;
      }
      const voice = new Audio(line.src);
      audioState.currentVoice = voice;
      voice.onended = () => { if (audioState.currentVoice === voice) audioState.currentVoice = null; };
      voice.onerror = () => fallbackSpeech(fallbackText);
      voice.play().catch(() => fallbackSpeech(fallbackText));
      return true;
    } catch (_) {
      return false;
    }
  }

  function speak(text, key = null) {
    ui.voiceBubble.textContent = text;
    if (!audioState.enabled) return;
    if (playRecordedVoice(key, text)) return;
    fallbackSpeech(text);
  }

  function showPrompt(text, key = null, action = null, force = false) {
    const now = performance.now();
    if (!force && game.currentPrompt === text && now < game.promptRepeatAt) return;
    game.currentPrompt = text;
    game.promptRepeatAt = now + 3600;
    ui.jumpButton.classList.toggle('highlight', action === 'jump');
    ui.transformButton.classList.toggle('highlight', action === 'transform');
    speak(text, key);
  }

  function clearPromptButtons() {
    ui.jumpButton.classList.remove('highlight');
    ui.transformButton.classList.remove('highlight');
  }

  function createPlayer() {
    const character = state.selectedCharacter;
    return {
      x: PLAYER_START_X,
      y: game.groundY - character.robotSize.height,
      width: character.robotSize.width,
      height: character.robotSize.height,
      vx: character.robotSpeed,
      vy: 0,
      form: 'robot',
      onGround: true,
      jumpCount: 0,
      animationTime: 0,
      invulnerable: 0
    };
  }

  function makeEnemy(enemy) {
    const size = enemy.type === 'drone' ? { width: 76, height: 48 } : { width: 78, height: 70 };
    return {
      ...enemy,
      ...size,
      y: enemy.y ?? game.groundY - size.height,
      dir: -1,
      active: true,
      phase: 0
    };
  }

  function spawnLevel() {
    const level = clone(levelTemplate);
    game.worldWidth = level.worldWidth;
    game.groundY = level.groundY;
    game.entities = level.entities.map((entity) => ({ ...entity, collected: false, destroyed: false, simplified: false }));
    game.enemies = level.enemies.map(makeEnemy);
    game.player = createPlayer();
    game.cameraX = 0;
    game.energy = 0;
    game.stars = 0;
    game.bots = 0;
    game.respawnX = PLAYER_START_X;
    game.failCount = 0;
    game.particles = [];
    game.currentPrompt = null;
    game.promptRepeatAt = 0;
    updateCounters();
  }

  function startGame() {
    getAudioContext();
    spawnLevel();
    game.running = true;
    game.lastTime = performance.now();
    setScreen('game');
    showPrompt('Vamos', 'intro', null, true);
  }

  function getGroundYAt(x) {
    for (const entity of game.entities) {
      if (entity.destroyed) continue;
      if (entity.type === 'gap' && x > entity.x && x < entity.x + entity.width) return null;
      if (entity.type === 'ramp' && x > entity.x && x < entity.x + entity.width) {
        const progress = (x - entity.x) / entity.width;
        return game.groundY - progress * entity.height;
      }
    }
    return game.groundY;
  }

  function playerBox() {
    const player = game.player;
    return { x: player.x, y: player.y, width: player.width, height: player.height };
  }

  function intersects(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  function setPlayerForm(form) {
    const player = game.player;
    const character = state.selectedCharacter;
    if (!player || player.form === form) return;
    const oldBottom = player.y + player.height;
    const oldCenter = player.x + player.width / 2;
    const size = form === 'vehicle' ? character.vehicleSize : character.robotSize;
    player.form = form;
    player.width = size.width;
    player.height = size.height;
    player.x = oldCenter - player.width / 2;
    player.y = oldBottom - player.height;
    player.vx = form === 'vehicle' ? character.vehicleSpeed : character.robotSpeed;
    tone('transform');
    burst(player.x + player.width / 2, player.y + player.height / 2, character.color, 12);
    clearPromptButtons();
  }

  function handleJump() {
    const player = game.player;
    const character = state.selectedCharacter;
    if (!game.running || !player) return;
    const canJump = player.onGround || player.jumpCount < character.extraJumps + 1;
    if (!canJump) return;
    player.vy = -character.jumpVelocity;
    player.onGround = false;
    player.jumpCount += 1;
    tone('jump');
    burst(player.x + player.width / 2, player.y + player.height, character.accent, 8);
    clearPromptButtons();
  }

  function handleTransform() {
    if (!game.running || !game.player) return;
    setPlayerForm(game.player.form === 'robot' ? 'vehicle' : 'robot');
  }

  function respawnNear(entity = null) {
    const player = game.player;
    const character = state.selectedCharacter;
    game.failCount += 1;
    if (entity && game.failCount >= 2) {
      if (entity.type === 'gap') entity.width = Math.max(82, entity.width - 42);
      if (entity.type === 'lowTunnel') entity.height = Math.max(64, entity.height - 18);
      if (entity.type === 'wall') entity.destroyed = true;
    }
    const x = Math.max(PLAYER_START_X, (entity?.x ?? game.respawnX) - 170);
    player.x = x;
    player.form = 'robot';
    player.width = character.robotSize.width;
    player.height = character.robotSize.height;
    player.y = game.groundY - player.height;
    player.vx = character.robotSpeed;
    player.vy = 0;
    player.onGround = true;
    player.jumpCount = 0;
    player.invulnerable = 1;
    tone('soft');
    showPrompt('Prueba otra vez', 'try-again', entity?.cue || null, true);
  }

  function updateCounters() {
    ui.energyCount.textContent = `${game.energy}`;
    ui.starCount.textContent = `${game.stars}`;
    ui.botCount.textContent = `${game.bots}`;
    const progress = game.player ? Math.max(0, Math.min(100, (game.player.x / Math.max(1, game.worldWidth - 180)) * 100)) : 0;
    ui.progressFill.style.width = `${progress}%`;
  }

  function burst(x, y, color, count = 8) {
    for (let index = 0; index < count; index += 1) {
      game.particles.push({
        x,
        y,
        vx: (Math.random() - .5) * 220,
        vy: (Math.random() - .75) * 220,
        life: .45 + Math.random() * .35,
        maxLife: .8,
        color
      });
    }
  }

  function updatePlayer(dt) {
    const player = game.player;
    const character = state.selectedCharacter;
    if (!player) return;
    player.vx = player.form === 'vehicle' ? character.vehicleSpeed : character.robotSpeed;
    player.x += player.vx * dt;
    player.vy += 1280 * dt;
    player.y += player.vy * dt;
    if (player.invulnerable > 0) player.invulnerable -= dt;

    const footX = player.x + player.width / 2;
    const ground = getGroundYAt(footX);
    if (ground !== null && player.y + player.height >= ground) {
      player.y = ground - player.height;
      player.vy = 0;
      player.onGround = true;
      player.jumpCount = 0;
    } else {
      player.onGround = false;
    }

    if (ground === null && player.y > game.groundY - player.height + 28) {
      const gap = game.entities.find((entity) => entity.type === 'gap' && footX > entity.x && footX < entity.x + entity.width);
      respawnNear(gap);
    }

    if (player.y > layout.viewHeight + 220) respawnNear();
    player.animationTime += dt * Math.max(.8, Math.abs(player.vx) / 120);
  }

  function updateEntities(dt) {
    const player = game.player;
    const pbox = playerBox();

    for (const entity of game.entities) {
      if (entity.collected || entity.destroyed) continue;

      if ((entity.cue === 'jump' || entity.cue === 'transform') && entity.x - player.x < 260 && entity.x > player.x) {
        const text = entity.cue === 'jump' ? 'Salta ahora' : 'Transformate';
        const key = entity.cue === 'jump' ? 'jump-now' : 'transform-now';
        showPrompt(text, key, entity.cue);
      }

      if (entity.type === 'checkpoint' && player.x > entity.x) game.respawnX = Math.max(game.respawnX, entity.x - 80);

      if (entity.type === 'energon') {
        const hitbox = { x: entity.x - 26, y: entity.y - 26, width: 52, height: 52 };
        if (intersects(pbox, hitbox)) {
          entity.collected = true;
          game.energy += 1;
          if (game.energy % 3 === 0) game.stars += 1;
          updateCounters();
          tone('collect');
          burst(entity.x, entity.y, '#44efff', 10);
        }
      }

      if (entity.type === 'miniBot') {
        const hitbox = { x: entity.x - 34, y: entity.y - 56, width: 68, height: 64 };
        if (intersects(pbox, hitbox)) {
          entity.collected = true;
          game.bots += 1;
          game.stars += 2;
          updateCounters();
          tone('success');
          burst(entity.x, entity.y - 20, '#65f0a6', 14);
          showPrompt('Muy bien', 'rescue', null, true);
        }
      }

      if (entity.type === 'barrier') {
        const hitbox = { x: entity.x, y: game.groundY - entity.height, width: entity.width, height: entity.height };
        if (intersects(pbox, hitbox)) respawnNear(entity);
      }

      if (entity.type === 'lowTunnel') {
        const hitbox = { x: entity.x, y: game.groundY - 160, width: entity.width, height: 72 };
        if (intersects(pbox, hitbox) && player.form !== 'vehicle') respawnNear(entity);
      }

      if (entity.type === 'wall') {
        const hitbox = { x: entity.x, y: game.groundY - entity.height, width: entity.width, height: entity.height };
        if (intersects(pbox, hitbox)) {
          if (player.form === 'vehicle' || state.selectedCharacter.id === 'd16') {
            entity.destroyed = true;
            game.stars += 1;
            updateCounters();
            tone('transform');
            burst(entity.x + entity.width / 2, game.groundY - entity.height / 2, '#ffd84d', 18);
            showPrompt('Muy bien', 'great', null, true);
          } else {
            respawnNear(entity);
          }
        }
      }

      if (entity.type === 'finish') {
        const hitbox = { x: entity.x, y: game.groundY - 160, width: entity.width, height: 160 };
        if (intersects(pbox, hitbox)) completeLevel();
      }
    }
  }

  function updateEnemies(dt) {
    const player = game.player;
    const pbox = playerBox();
    for (const enemy of game.enemies) {
      if (!enemy.active) continue;
      enemy.phase += dt;
      if (enemy.type === 'patroller') {
        enemy.x += enemy.dir * 70 * dt;
        if (enemy.x < enemy.left) enemy.dir = 1;
        if (enemy.x + enemy.width > enemy.right) enemy.dir = -1;
        enemy.y = game.groundY - enemy.height;
      }
      if (enemy.type === 'drone') {
        enemy.x += Math.sin(enemy.phase * 1.4) * 34 * dt;
        enemy.y = 390 + Math.sin(enemy.phase * 2.4) * 20;
      }
      const box = { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height };
      if (player.invulnerable <= 0 && intersects(pbox, box)) {
        if (player.vy > 120 && player.y + player.height - enemy.y < 34) {
          enemy.active = false;
          player.vy = -360;
          game.stars += 1;
          updateCounters();
          tone('success');
          burst(enemy.x + enemy.width / 2, enemy.y + 20, '#ff8db2', 12);
        } else {
          respawnNear(enemy);
        }
      }
    }
  }

  function updateParticles(dt) {
    game.particles = game.particles.filter((particle) => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 360 * dt;
      return particle.life > 0;
    });
  }

  function updateCamera() {
    const player = game.player;
    const target = player.x + player.width / 2 - layout.viewWidth * .28;
    const max = Math.max(0, game.worldWidth - layout.viewWidth);
    game.cameraX += (Math.max(0, Math.min(max, target)) - game.cameraX) * .12;
  }

  function completeLevel() {
    if (!game.running) return;
    game.running = false;
    const character = state.selectedCharacter;
    ui.rewardRobot.src = character.robotFrames[1];
    const sticker = character.id === 'bee' ? '&#9889;' : character.id === 'd16' ? '&#11042;' : character.id === 'elita' ? '&#10022;' : '&#9670;';
    ui.rewardLoot.innerHTML = `
      <div class="reward-pill" aria-label="Energon"><span aria-hidden="true">&#9889;</span><strong>${game.energy}</strong></div>
      <div class="reward-pill" aria-label="Estrellas"><span aria-hidden="true">&#9733;</span><strong>${Math.max(3, game.stars)}</strong></div>
      <div class="reward-pill" aria-label="Bot rescatado"><span aria-hidden="true">&#129302;</span><strong>${game.bots}</strong></div>
      <div class="reward-pill sticker-reward" aria-label="Sticker nuevo"><span aria-hidden="true">${sticker}</span><strong>&#10022;</strong></div>
    `;
    tone('success');
    setScreen('reward');
    speak('Excelente', 'excellent');
  }

  function drawBackground() {
    const width = layout.viewWidth;
    const height = layout.viewHeight;
    const camera = game.cameraX;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#08162f');
    sky.addColorStop(.45, '#173865');
    sky.addColorStop(1, '#0b1226');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(68,239,255,.08)';
    for (let index = 0; index < 10; index += 1) {
      const x = ((index * 320) - camera * .18) % (width + 360) - 120;
      ctx.fillRect(x, 130 + (index % 3) * 32, 78, 260);
      ctx.fillRect(x + 88, 170 + (index % 2) * 30, 46, 220);
    }

    ctx.fillStyle = '#132b4f';
    ctx.fillRect(0, game.groundY, width, height - game.groundY);
    ctx.fillStyle = '#3e74ad';
    ctx.fillRect(0, game.groundY, width, 16);
    ctx.fillStyle = 'rgba(126,208,255,.9)';
    for (let x = (-camera * .4) % 52; x < width + 52; x += 52) ctx.fillRect(x, game.groundY + 10, 18, 3);
  }

  function worldX(x) {
    return x - game.cameraX;
  }

  function drawCue(x, y, type) {
    const symbol = type === 'transform' ? '\u21C4' : '\u2191';
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(6,13,30,.78)';
    ctx.fill();
    ctx.strokeStyle = type === 'transform' ? '#ffd84d' : '#7af7ff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = '900 25px Trebuchet MS, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, x, y + 1);
    ctx.restore();
  }

  function drawEntities() {
    for (const entity of game.entities) {
      if (entity.collected || entity.destroyed) continue;
      const x = worldX(entity.x);
      if (x < -240 || x > layout.viewWidth + 240) continue;

      if (entity.type === 'energon') {
        ctx.save();
        ctx.translate(x, entity.y);
        ctx.rotate(performance.now() * .0024);
        ctx.fillStyle = '#65f0ff';
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(15, 0);
        ctx.lineTo(0, 18);
        ctx.lineTo(-15, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      if (entity.type === 'gap') {
        ctx.fillStyle = '#050b16';
        ctx.fillRect(x, game.groundY, entity.width, layout.viewHeight - game.groundY);
        ctx.fillStyle = '#9ee3ff';
        ctx.fillRect(x, game.groundY, entity.width, 12);
        drawCue(x + entity.width / 2, game.groundY - 34, 'jump');
      }

      if (entity.type === 'barrier') {
        const top = game.groundY - entity.height;
        const gradient = ctx.createLinearGradient(x, top, x, game.groundY);
        gradient.addColorStop(0, '#ffe27a');
        gradient.addColorStop(.42, '#ff8f3c');
        gradient.addColorStop(1, '#b51f13');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, top, entity.width, entity.height, 14);
        ctx.fill();
        drawCue(x + entity.width / 2, top - 28, 'jump');
      }

      if (entity.type === 'lowTunnel') {
        ctx.fillStyle = '#8da0bf';
        ctx.beginPath();
        ctx.roundRect(x, game.groundY - 160, entity.width, 72, 18);
        ctx.fill();
        ctx.fillStyle = '#dff8ff';
        ctx.fillRect(x + 14, game.groundY - 138, entity.width - 28, 8);
        drawCue(x + entity.width / 2, game.groundY - 184, 'transform');
      }

      if (entity.type === 'ramp') {
        ctx.fillStyle = '#22d7ff';
        ctx.beginPath();
        ctx.moveTo(x, game.groundY);
        ctx.lineTo(x + entity.width, game.groundY);
        ctx.lineTo(x + entity.width, game.groundY - entity.height);
        ctx.closePath();
        ctx.fill();
      }

      if (entity.type === 'wall') {
        ctx.fillStyle = '#707b8f';
        ctx.fillRect(x, game.groundY - entity.height, entity.width, entity.height);
        ctx.fillStyle = '#cfd6e3';
        for (let y = game.groundY - entity.height + 14; y < game.groundY - 8; y += 24) ctx.fillRect(x + 10, y, entity.width - 20, 6);
        drawCue(x + entity.width / 2, game.groundY - entity.height - 28, 'transform');
      }

      if (entity.type === 'checkpoint') {
        ctx.fillStyle = '#65f0a6';
        ctx.fillRect(x - 4, game.groundY - 136, 8, 136);
        ctx.fillStyle = 'rgba(101,240,166,.18)';
        ctx.fillRect(x + 4, game.groundY - 124, 48, 28);
      }

      if (entity.type === 'miniBot') {
        ctx.fillStyle = '#8dffba';
        ctx.beginPath();
        ctx.roundRect(x - 28, entity.y - 46, 56, 56, 14);
        ctx.fill();
        ctx.fillStyle = '#173523';
        ctx.fillRect(x - 14, entity.y - 28, 9, 9);
        ctx.fillRect(x + 5, entity.y - 28, 9, 9);
      }

      if (entity.type === 'finish') {
        ctx.fillStyle = '#65f0a6';
        ctx.fillRect(x, game.groundY - 160, 16, 160);
        ctx.fillStyle = '#d9fff0';
        ctx.beginPath();
        ctx.moveTo(x + 16, game.groundY - 156);
        ctx.lineTo(x + entity.width, game.groundY - 124);
        ctx.lineTo(x + 16, game.groundY - 92);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function drawEnemies() {
    for (const enemy of game.enemies) {
      if (!enemy.active) continue;
      const x = worldX(enemy.x);
      const y = enemy.y;
      if (x < -120 || x > layout.viewWidth + 120) continue;

      ctx.save();
      ctx.translate(x + enemy.width / 2, y + enemy.height / 2);
      if (enemy.type === 'drone') {
        ctx.fillStyle = '#91f3ff';
        ctx.beginPath();
        ctx.roundRect(-34, -17, 68, 34, 17);
        ctx.fill();
        ctx.fillStyle = '#0f2842';
        ctx.fillRect(-14, -6, 10, 10);
        ctx.fillRect(4, -6, 10, 10);
      } else {
        const gradient = ctx.createLinearGradient(-34, -24, 34, 24);
        gradient.addColorStop(0, '#6d5cff');
        gradient.addColorStop(1, '#c779ff');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(-34, -24, 68, 48, 16);
        ctx.fill();
        ctx.fillStyle = '#eff4ff';
        ctx.fillRect(-16, -8, 10, 10);
        ctx.fillRect(6, -8, 10, 10);
      }
      ctx.restore();
    }
  }

  function drawPlayer() {
    const player = game.player;
    const character = state.selectedCharacter;
    const image = getFrame(character, player.form, player.animationTime, player.vx);
    const x = worldX(player.x);
    ctx.save();
    if (player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0) ctx.globalAlpha = .55;
    if (image) {
      ctx.drawImage(image, x, player.y, player.width, player.height);
    } else {
      ctx.fillStyle = character.color;
      ctx.fillRect(x, player.y, player.width, player.height);
      ctx.fillStyle = character.accent;
      ctx.fillRect(x + player.width * .25, player.y + 12, player.width * .5, 18);
    }
    ctx.restore();
  }

  function drawParticles(dt) {
    for (const particle of game.particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(worldX(particle.x), particle.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function render(dt) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(layout.ratio * layout.scale, 0, 0, layout.ratio * layout.scale, 0, 0);
    drawBackground();
    drawEntities();
    drawEnemies();
    drawParticles(dt);
    if (game.player) drawPlayer();
  }

  function update(dt) {
    updatePlayer(dt);
    updateEntities(dt);
    updateEnemies(dt);
    updateParticles(dt);
    updateCamera();
    updateCounters();
  }

  function loop(now) {
    const dt = Math.min(.033, (now - (game.lastTime || now)) / 1000);
    game.lastTime = now;
    if (game.running) update(dt);
    if (screens.game.classList.contains('active')) render(dt);
    requestAnimationFrame(loop);
  }

  function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      state.deferredInstallPrompt = event;
      ui.installButton.classList.add('show-install');
    });
    window.addEventListener('appinstalled', () => {
      state.deferredInstallPrompt = null;
      ui.installButton.classList.remove('show-install');
    });
    ui.installButton.addEventListener('click', async () => {
      if (!state.deferredInstallPrompt) return;
      state.deferredInstallPrompt.prompt();
      await state.deferredInstallPrompt.userChoice.catch(() => null);
      state.deferredInstallPrompt = null;
      ui.installButton.classList.remove('show-install');
    });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  function setupButtons() {
    ui.playButton.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      startGame();
    });
    ui.playAgainButton.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      startGame();
    });
    ui.homeButton.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      setScreen('home');
    });
    ui.pauseButton.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      game.running = false;
      setScreen('home');
    });
    ui.previewButton.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      state.previewForm = state.previewForm === 'robot' ? 'vehicle' : 'robot';
      updateHomePreview();
      tone('transform');
    });
    ui.soundToggle.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      audioState.enabled = !audioState.enabled;
      ui.soundToggle.textContent = audioState.enabled ? '\uD83D\uDD0A' : '\uD83D\uDD07';
      localStorage.setItem('cyber-bot-audio', audioState.enabled ? '1' : '0');
      if (!audioState.enabled) {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        if (audioState.currentVoice) audioState.currentVoice.pause();
      }
    });
    ui.jumpButton.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      handleJump();
    });
    ui.transformButton.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      handleTransform();
    });
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Space' || event.code === 'ArrowUp') {
        event.preventDefault();
        handleJump();
      }
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight' || event.code === 'ArrowDown' || event.code === 'KeyX') {
        event.preventDefault();
        handleTransform();
      }
    });
  }

  function init() {
    const savedCharacter = localStorage.getItem('cyber-bot-selected');
    state.selectedCharacter = characters.find((character) => character.id === savedCharacter) || characters[0];
    audioState.enabled = localStorage.getItem('cyber-bot-audio') !== '0';
    ui.soundToggle.textContent = audioState.enabled ? '\uD83D\uDD0A' : '\uD83D\uDD07';
    resizeCanvas();
    renderCharacterCards();
    updateHomePreview();
    setupButtons();
    setupInstallPrompt();
    registerServiceWorker();
    loadRecordedVoiceCatalog();
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resizeCanvas);
  window.visualViewport?.addEventListener('resize', resizeCanvas);
  window.visualViewport?.addEventListener('scroll', resizeCanvas);
  preloadAssets().then(init);
})();
