window.GameSystems = {
  CombatTuning: {
    enemyPadding: { x: 8, y: 6 },
    chargedEnemyPadding: { x: 12, y: 10 },
    projectileTrailLife: 0.18,
    lightHitStop: 0.035,
    heavyHitStop: 0.06
  },
  createD16Projectile(player, charged) {
    const muzzleX = player.x + (player.facing > 0 ? player.width * 0.72 : player.width * 0.08);
    const muzzleY = player.y + player.height * 0.60;
    return {
      owner: 'player',
      kind: charged ? 'charged' : 'shot',
      x: muzzleX,
      y: muzzleY,
      vx: player.facing * (charged ? 575 : 448),
      width: charged ? 42 : 30,
      height: charged ? 26 : 18,
      damage: charged ? 2.4 : 1.25,
      dir: player.facing,
      life: charged ? 1.45 : 1.05,
      hitPadding: charged ? { x: 12, y: 10 } : { x: 8, y: 7 },
      trail: [],
      glow: charged ? '#ffc76c' : '#9ae8ff'
    };
  },
  getPaddedRect(rect, pad = { x: 0, y: 0 }) {
    return {
      x: rect.x - (pad.x || 0),
      y: rect.y - (pad.y || 0),
      width: rect.width + (pad.x || 0) * 2,
      height: rect.height + (pad.y || 0) * 2
    };
  },
  getEnemyTargetBox(enemy, proj = null) {
    const base = { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height };
    const fallback = this.CombatTuning.enemyPadding;
    const charged = this.CombatTuning.chargedEnemyPadding;
    const pad = proj?.kind === 'charged' ? charged : (proj?.hitPadding || fallback);
    return this.getPaddedRect(base, pad);
  },
  pushProjectileTrail(proj) {
    if (!proj.trail) proj.trail = [];
    proj.trail.push({ x: proj.x + proj.width * 0.5, y: proj.y + proj.height * 0.5, t: this.CombatTuning.projectileTrailLife, size: proj.kind === 'charged' ? 11 : 7, color: proj.glow || '#9ae8ff' });
    if (proj.trail.length > 8) proj.trail.shift();
  },
  updateProjectileTrail(proj, dt) {
    if (!proj.trail) return;
    proj.trail = proj.trail.filter((step) => (step.t -= dt) > 0);
  },
  pushRingFX(game, x, y, color, burst = false) {
    game.fx.push({ kind: 'ring', x, y, t: burst ? 0.28 : 0.18, color, burst });
  },
  pushSparkFX(game, x, y, color, count = 5, spread = 1) {
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.45;
      const speed = (90 + Math.random() * 120) * spread;
      game.fx.push({ kind: 'spark', x, y, t: 0.24 + Math.random() * 0.1, color, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 26, size: 2 + Math.random() * 3 });
    }
  },
  pushFloatText(game, x, y, text, color = '#ffffff') {
    game.fx.push({ kind: 'text', x, y, text, color, t: 0.55, vy: -28 });
  }
};
