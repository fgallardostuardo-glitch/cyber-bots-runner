(function(){
const SPRITE_BASE = './sprites';
const MODEL_BASE = './models/characters';

const characters = [
  {
    id: 'orion',
    name: 'Orion Pax',
    role: 'Vanguardia',
    fantasy: 'Camión heroico de primera línea',
    desc: 'Versátil y fiable. Tiene combo de tres golpes con hacha, tajo aéreo y alcance medio para abrir paso sin sentirse roto.',
    color: '#d6413b', accent: '#52b5ff',
    stats: { control: 8, jump: 8, speed: 7, power: 8 },
    abilities: ['Hacha azul de energía', 'Tajo aéreo con rebote'],
    modelArt: `${MODEL_BASE}/orion-reference.jpg`,
    robotFrames: [1,2,3].map(n => `${MODEL_BASE}/orion-robot-${n}.png`),
    vehicleFrames: [1,2,3].map(n => `${SPRITE_BASE}/orion-vehicle-${n}.svg`),
    robotAccel: 1700, robotMaxSpeed: 282, vehicleAccel: 1920, vehicleMaxSpeed: 358,
    jumpVelocity: 740, gravity: 1300, airControl: 0.98, extraJumps: 0, glideGravity: 1,
    robotSize: { width: 86, height: 128 }, vehicleSize: { width: 150, height: 86 },
    combat: { kind: 'orion', cadence: 0.2, reach: 0 }
  },
  {
    id: 'bee',
    name: 'Bumblebee',
    role: 'Interceptor',
    fantasy: 'Auto deportivo de choque rápido',
    desc: 'El más rápido. Ataques cortos y veloces, además de un dash slash horizontal que convierte velocidad en agresión.',
    color: '#f2b51c', accent: '#202738',
    stats: { control: 8, jump: 8, speed: 10, power: 5 },
    abilities: ['Espadas de energía', 'Dash slash horizontal'],
    modelArt: `${MODEL_BASE}/bee-reference.jpg`,
    robotFrames: [1,2,3].map(n => `${MODEL_BASE}/bee-robot-${n}.png`),
    vehicleFrames: [1,2,3].map(n => `${SPRITE_BASE}/bee-vehicle-${n}.svg`),
    robotAccel: 1960, robotMaxSpeed: 308, vehicleAccel: 2360, vehicleMaxSpeed: 430,
    jumpVelocity: 742, gravity: 1330, airControl: 1.03, extraJumps: 0, glideGravity: 1,
    robotSize: { width: 82, height: 118 }, vehicleSize: { width: 145, height: 78 },
    combat: { kind: 'bee', cadence: 0.1, reach: 42 }
  },
  {
    id: 'elita',
    name: 'Elita-1',
    role: 'Acróbata',
    fantasy: 'Moto táctica de movilidad total',
    desc: 'La reina del aire. Doble salto, planeo corto y ruta alta con más margen para un plataformas comercialmente amable.',
    color: '#d85aa6', accent: '#6756ff',
    stats: { control: 9, jump: 10, speed: 8, power: 4 },
    abilities: ['Doble salto', 'Planeo ligero'],
    modelArt: `${MODEL_BASE}/elita-reference.jpg`,
    robotFrames: [1,2,3].map(n => `${MODEL_BASE}/elita-robot-${n}.png`),
    vehicleFrames: [1,2,3].map(n => `${SPRITE_BASE}/elita-vehicle-${n}.svg`),
    robotAccel: 1680, robotMaxSpeed: 276, vehicleAccel: 1840, vehicleMaxSpeed: 348,
    jumpVelocity: 724, gravity: 1240, airControl: 1.15, extraJumps: 1, glideGravity: 0.56,
    robotSize: { width: 74, height: 130 }, vehicleSize: { width: 132, height: 74 },
    combat: { kind: 'none' }
  },
  {
    id: 'd16',
    name: 'D-16',
    role: 'Destructor',
    fantasy: 'Tanque de sitio pesado',
    desc: 'Pesado y devastador. Su cañón tiene retroceso leve y carga una ráfaga perforante para abrir la ruta de ventaja.',
    color: '#737d8e', accent: '#cfd5e2',
    stats: { control: 6, jump: 8, speed: 6, power: 10 },
    abilities: ['Cañón con retroceso', 'Disparo cargado'],
    modelArt: `${MODEL_BASE}/d16-reference.jpg`,
    robotFrames: [1,2,3].map(n => `${MODEL_BASE}/d16-robot-${n}.png`),
    vehicleFrames: [1,2,3].map(n => `${SPRITE_BASE}/d16-vehicle-${n}.svg`),
    robotAccel: 1540, robotMaxSpeed: 258, vehicleAccel: 1730, vehicleMaxSpeed: 332,
    jumpVelocity: 748, gravity: 1350, airControl: 0.9, extraJumps: 0, glideGravity: 1,
    robotSize: { width: 100, height: 146 }, vehicleSize: { width: 156, height: 88 },
    combat: { kind: 'd16', cadence: 0.34, reach: 0 }
  }
];


const levelTemplate = {
  worldWidth: 6400,
  terrain: [
    { from: 0, to: 940, y: 580 },
    { from: 1120, to: 1850, y: 580 },
    { from: 1850, to: 2100, y: 520 },
    { from: 2100, to: 2820, y: 580 },
    { from: 3040, to: 3720, y: 580 },
    { from: 3720, to: 3980, y: 520 },
    { from: 3980, to: 4720, y: 580 },
    { from: 4970, to: 6400, y: 580 }
  ],
  entities: [
    { type: 'energon', x: 240, y: 500 },
    { type: 'energon', x: 390, y: 455 },
    { type: 'barrier', x: 640, width: 96, height: 60, label: 'SALTA' },
    { type: 'gap', x: 940, width: 180, label: 'APERTURA' },
    { type: 'checkpoint', x: 1280 },

    { type: 'platform', x: 1360, y: 486, width: 132, height: 18 },
    { type: 'platform', x: 1555, y: 420, width: 138, height: 18 },
    { type: 'platform', x: 1745, y: 354, width: 144, height: 18 },
    { type: 'energon', x: 1618, y: 382 },
    { type: 'energon', x: 1818, y: 314 },
    { type: 'platform', x: 1960, y: 420, width: 120, height: 18 },
    { type: 'platform', x: 2110, y: 356, width: 120, height: 18 },
    { type: 'platform', x: 2265, y: 292, width: 120, height: 18 },
    { type: 'energon', x: 2325, y: 248 },
    { type: 'wall', x: 2440, width: 110, height: 132, label: 'RUTA D-16' },
    { type: 'gap', x: 2820, width: 220, label: 'REMIX' },

    { type: 'platform', x: 3120, y: 504, width: 148, height: 18 },
    { type: 'platform', x: 3310, y: 444, width: 144, height: 18 },
    { type: 'crumble', x: 3500, y: 386, width: 142, height: 18 },
    { type: 'crumble', x: 3670, y: 334, width: 140, height: 18 },
    { type: 'platform', x: 3860, y: 282, width: 150, height: 18 },
    { type: 'energon', x: 3570, y: 348 },
    { type: 'energon', x: 3926, y: 238 },
    { type: 'checkpoint', x: 4100 },

    { type: 'platform', x: 4310, y: 498, width: 144, height: 18 },
    { type: 'platform', x: 4495, y: 430, width: 144, height: 18 },
    { type: 'platform', x: 4680, y: 362, width: 144, height: 18 },
    { type: 'gap', x: 4720, width: 250, label: 'CIERRE' },
    { type: 'platform', x: 5080, y: 484, width: 154, height: 18 },
    { type: 'platform', x: 5285, y: 420, width: 154, height: 18 },
    { type: 'platform', x: 5490, y: 356, width: 154, height: 18 },
    { type: 'energon', x: 5360, y: 378 },
    { type: 'energon', x: 5562, y: 314 },
    { type: 'miniBot', x: 5950, y: 478 },
    { type: 'finish', x: 6110, width: 160 }
  ],
  enemies: [
    { type: 'patroller', x: 470, left: 330, right: 860 },
    { type: 'rusher', x: 1160, left: 1128, right: 1500 },
    { type: 'hopper', x: 2050, left: 1960, right: 2340 },
    { type: 'shield', x: 2520, left: 2480, right: 2780 },
    { type: 'turret', x: 3200, left: 3200, right: 3200 },
    { type: 'drone', x: 3630, y: 260, left: 3410, right: 3880, baseY: 260 },
    { type: 'patroller', x: 4380, left: 4310, right: 4700 },
    { type: 'hopper', x: 5210, left: 5070, right: 5480 },
    { type: 'bruiser', x: 5660, left: 5500, right: 5920 }
  ],
  intro: 'Vertical slice premium. Apertura clara, bloque de identidad y remix. Usa el joystick, el salto, el ataque y la transformación con intención.',
  beats: [
    { x: 0, message: 'Apertura: aprende el ritmo. Salta, ataca y lee el color del peligro.' },
    { x: 1250, message: 'Bloque de identidad: aprovecha tu ventaja única.' },
    { x: 3200, message: 'Remix: mezcla plataformas, telegraphs y combate sin perder el flujo.' }
  ]
};

window.GameData = { characters, levelTemplate };

})();
