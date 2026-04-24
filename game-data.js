(() => {
  const SPRITE_BASE = './sprites';

  const characters = [
    {
      id: 'orion',
      name: 'Orion Pax',
      role: 'Equilibrado',
      fantasy: 'Camion heroico',
      desc: 'Facil para empezar. Salta bien y se siente seguro.',
      color: '#d6413b',
      accent: '#52b5ff',
      stats: { control: 8, jump: 8, speed: 7, power: 8 },
      abilities: ['Escudo corto', 'Recuperacion segura'],
      robotFrames: [1, 2, 3].map((n) => `${SPRITE_BASE}/orion-robot-${n}.svg`),
      vehicleFrames: [1, 2, 3].map((n) => `${SPRITE_BASE}/orion-vehicle-${n}.svg`),
      robotSize: { width: 92, height: 138 },
      vehicleSize: { width: 150, height: 86 },
      robotSpeed: 210,
      vehicleSpeed: 295,
      jumpVelocity: 760,
      extraJumps: 0
    },
    {
      id: 'bee',
      name: 'Bumblebee',
      role: 'Veloz',
      fantasy: 'Auto jugueton',
      desc: 'Muy rapido. Ideal para rampas y carreras cortas.',
      color: '#f2b51c',
      accent: '#202738',
      stats: { control: 8, jump: 8, speed: 10, power: 5 },
      abilities: ['Impulso corto', 'Aceleracion feliz'],
      robotFrames: [1, 2, 3].map((n) => `${SPRITE_BASE}/bee-robot-${n}.svg`),
      vehicleFrames: [1, 2, 3].map((n) => `${SPRITE_BASE}/bee-vehicle-${n}.svg`),
      robotSize: { width: 82, height: 118 },
      vehicleSize: { width: 145, height: 78 },
      robotSpeed: 230,
      vehicleSpeed: 340,
      jumpVelocity: 742,
      extraJumps: 0
    },
    {
      id: 'elita',
      name: 'Elita-1',
      role: 'Agil',
      fantasy: 'Moto acrobatica',
      desc: 'Salta alto y planea un poco. Se ve liviana y precisa.',
      color: '#d85aa6',
      accent: '#6756ff',
      stats: { control: 9, jump: 10, speed: 8, power: 4 },
      abilities: ['Doble salto', 'Planeo corto'],
      robotFrames: [1, 2, 3].map((n) => `${SPRITE_BASE}/elita-robot-${n}.svg`),
      vehicleFrames: [1, 2, 3].map((n) => `${SPRITE_BASE}/elita-vehicle-${n}.svg`),
      robotSize: { width: 74, height: 130 },
      vehicleSize: { width: 132, height: 74 },
      robotSpeed: 215,
      vehicleSpeed: 285,
      jumpVelocity: 790,
      extraJumps: 1
    },
    {
      id: 'd16',
      name: 'D-16',
      role: 'Fuerte',
      fantasy: 'Tanque poderoso',
      desc: 'Rompe barreras pesadas y protege el avance.',
      color: '#737d8e',
      accent: '#cfd5e2',
      stats: { control: 6, jump: 8, speed: 6, power: 10 },
      abilities: ['Rompe muros', 'Disparo cargado'],
      robotFrames: [1, 2, 3].map((n) => `${SPRITE_BASE}/d16-robot-${n}.svg`),
      vehicleFrames: [1, 2, 3].map((n) => `${SPRITE_BASE}/d16-vehicle-${n}.svg`),
      robotSize: { width: 100, height: 146 },
      vehicleSize: { width: 156, height: 88 },
      robotSpeed: 195,
      vehicleSpeed: 270,
      jumpVelocity: 748,
      extraJumps: 0
    }
  ];

  const levelTemplate = {
    worldWidth: 5200,
    groundY: 580,
    entities: [
      { type: 'energon', x: 360, y: 480 },
      { type: 'barrier', x: 720, width: 84, height: 66, cue: 'jump' },
      { type: 'gap', x: 1120, width: 150, cue: 'jump' },
      { type: 'checkpoint', x: 1380 },
      { type: 'energon', x: 1540, y: 430 },
      { type: 'lowTunnel', x: 1850, width: 210, height: 86, cue: 'transform' },
      { type: 'ramp', x: 2260, width: 260, height: 100 },
      { type: 'energon', x: 2520, y: 390 },
      { type: 'wall', x: 2860, width: 100, height: 132, cue: 'transform' },
      { type: 'checkpoint', x: 3180 },
      { type: 'gap', x: 3460, width: 170, cue: 'jump' },
      { type: 'miniBot', x: 4040, y: 506 },
      { type: 'energon', x: 4260, y: 430 },
      { type: 'finish', x: 4820, width: 160 }
    ],
    enemies: [
      { type: 'patroller', x: 1620, left: 1510, right: 1760 },
      { type: 'drone', x: 3720, y: 410, left: 3620, right: 3880 }
    ],
    intro: 'Vamos',
    beats: [
      { x: 650, message: 'Salta ahora', voice: 'jump-now', action: 'jump' },
      { x: 1760, message: 'Transformate', voice: 'transform-now', action: 'transform' },
      { x: 3980, message: 'Muy bien', voice: 'great' }
    ]
  };

  window.GameData = { characters, levelTemplate };
})();
