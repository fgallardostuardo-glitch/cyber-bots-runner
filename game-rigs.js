// Extracted gameplay rigs from app.js for model lab rendering. Keep in sync with app.js when gameplay rigs change.
(function(){

function limbEndpoint(x, y, length, angle) {
  return { x: x - Math.sin(angle) * length, y: y + Math.cos(angle) * length };
}
function transformOrionLocalPointToWorld(p, visual, x, y, torsoTilt = 0) {
  const tiltCos = Math.cos(torsoTilt);
  const tiltSin = Math.sin(torsoTilt);
  const tiltedX = x * tiltCos - y * tiltSin;
  const tiltedY = x * tiltSin + y * tiltCos;
  const scaleX = visual?.scaleX || 1;
  const scaleY = visual?.scaleY || 1;
  const localX = tiltedX * scaleX;
  const localY = tiltedY * scaleY;
  const rotation = visual?.rotation || 0;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  let worldOffsetX = localX * cos - localY * sin;
  const worldOffsetY = localX * sin + localY * cos;
  if (p.facing < 0) worldOffsetX *= -1;
  return {
    x: p.x + p.width * 0.5 + (visual?.offsetX || 0) + worldOffsetX,
    y: p.y + p.height * 0.5 + (visual?.offsetY || 0) + worldOffsetY
  };
}
function getOrionAxePose(p, visual) {
  const w = p.width;
  const h = p.height;
  const top = -h / 2;
  const runPower = visual?.state === 'run' ? clamp01(visual.speed ?? Math.abs(p.vx) / 300) : 0;
  const step = visual?.runStep ?? Math.sin(p.animationTime * 5.8);
  const isJump = visual?.state === 'jump';
  const attackT = visual?.state === 'orion-axe' ? clamp01(visual.attackT ?? 0) : 0;
  const attacking = visual?.state === 'orion-axe';
  const attackPower = attacking ? Math.sin(attackT * Math.PI) : 0;
  const torsoTilt = runPower * step * 0.032 + (isJump ? -0.06 : 0) + attackPower * 0.04;
  const shoulderY = top + h * 0.32;
  const shoulderSpread = w * 0.36;
  const leftSwing = -step * runPower;
  let axeUpper = -0.26 - leftSwing * 0.18;
  let axeLower = -0.5 - leftSwing * 0.1;
  let axeAngle = -0.68 - leftSwing * 0.06;
  if (attacking) {
    axeUpper = -1.6 + attackT * 1.28;
    axeLower = -0.92 + attackT * 0.84;
    axeAngle = -1.5 + attackT * 1.78;
  } else if (isJump) {
    axeUpper = -0.86;
    axeLower = -0.68;
    axeAngle = -1.02;
  }
  const elbow = limbEndpoint(shoulderSpread, shoulderY, h * 0.185, axeUpper);
  const hand = limbEndpoint(elbow.x, elbow.y, h * 0.165, axeLower);
  return { attackT, axeUpper, axeLower, axeAngle, elbow, hand, handleX: hand.x + 2, handleY: hand.y, torsoTilt };
}

function getBeeRigPose(p, visual) {
  const w = p.width;
  const h = p.height;
  const top = -h / 2;
  const runPower = visual?.state === 'run' ? clamp01(visual.speed ?? Math.abs(p.vx) / 320) : 0;
  const step = visual?.runStep ?? Math.sin(p.animationTime * 5.8);
  const isJump = visual?.state === 'jump';
  const slashT = visual?.state === 'bee-blades' ? clamp01(visual.attackT ?? 0) : 0;
  const dashT = visual?.state === 'bee-dash' ? clamp01(visual.attackT ?? 0) : 0;
  const slashing = visual?.state === 'bee-blades';
  const dashing = visual?.state === 'bee-dash';
  const slashPower = slashing ? Math.sin(slashT * Math.PI) : 0;
  const dashPower = dashing ? 1 : 0;
  const torsoTilt = runPower * step * 0.045 + (isJump ? -0.08 : 0) + dashPower * 0.08 + slashPower * 0.025;
  const shoulderY = top + h * 0.31;
  const hipY = top + h * 0.61;
  const shoulderSpread = w * 0.49;
  const hipSpread = w * 0.09;
  const frontSwing = step * runPower;
  const backSwing = -step * runPower;
  const legBase = isJump ? 0.28 : 0;
  const frontThigh = dashing ? -0.58 : isJump ? -0.28 : frontSwing * 0.5;
  const frontShin = dashing ? 0.22 : frontThigh + (isJump ? 0.48 : Math.max(-0.1, Math.min(0.46, -frontSwing * 0.42)));
  const backThigh = dashing ? 0.66 : isJump ? 0.38 : backSwing * 0.5;
  const backShin = dashing ? 0.78 : backThigh + (isJump ? 0.42 : Math.max(-0.1, Math.min(0.46, -backSwing * 0.42)));
  const frontUpper = dashing ? -1.18 : slashing ? -1.18 + slashT * 0.62 : isJump ? -0.7 : -0.24 - frontSwing * 0.18;
  const frontLower = dashing ? -1.03 : slashing ? -0.84 + slashT * 0.44 : isJump ? -0.28 : 0.28 + frontSwing * 0.14;
  const backUpper = dashing ? -0.78 : slashing ? -0.92 + slashT * 0.5 : isJump ? 0.5 : 0.26 + backSwing * 0.18;
  const backLower = dashing ? -0.7 : slashing ? -0.5 + slashT * 0.38 : isJump ? 0.12 : 0.42 - backSwing * 0.12;
  const frontBladeAngle = dashing ? -1.26 : slashing ? -1.08 + (slashT - 0.5) * 0.28 : -1.28;
  const backBladeAngle = dashing ? -1.02 : slashing ? -0.92 + (slashT - 0.5) * 0.24 : -1.18;
  const frontElbow = limbEndpoint(shoulderSpread, shoulderY, h * 0.17, frontUpper);
  const frontHand = limbEndpoint(frontElbow.x, frontElbow.y, h * 0.152, frontLower);
  const backElbow = limbEndpoint(-shoulderSpread, shoulderY + h * 0.012, h * 0.165, backUpper);
  const backHand = limbEndpoint(backElbow.x, backElbow.y, h * 0.146, backLower);
  const bladeLength = (dashing ? 64 : 48) + slashPower * 8 + dashT * 8;
  const bladeWidth = dashing ? 8.5 : 7.5;
  return {
    top, runPower, step, isJump, slashT, dashT, slashing, dashing, slashPower, dashPower, torsoTilt,
    shoulderY, hipY, shoulderSpread, hipSpread, frontThigh: frontThigh - legBase * 0.15, frontShin,
    backThigh: backThigh + legBase * 0.15, backShin, frontUpper, frontLower, backUpper, backLower,
    frontElbow, frontHand, backElbow, backHand, frontBladeAngle, backBladeAngle, bladeLength, bladeWidth
  };
}

function drawOrionArmorPlate(points, fill, stroke = 'rgba(170,232,255,.38)', shade = 'rgba(4,12,28,.2)') {
  ctx.fillStyle = fill;
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.fill();
  if (shade) {
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
    ctx.save();
    ctx.globalAlpha *= 0.28;
    ctx.fillStyle = shade;
    ctx.beginPath();
    points.forEach((point, index) => {
      const y = point.y > minY + (maxY - minY) * 0.45 ? point.y : point.y + (maxY - minY) * 0.12;
      if (index === 0) ctx.moveTo(point.x * 0.86, y);
      else ctx.lineTo(point.x * 0.86, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}
function drawOrionJoint(x, y, radius, fill = '#233f69') {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(185,240,255,.34)';
  ctx.beginPath();
  ctx.arc(x - radius * 0.24, y - radius * 0.22, radius * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(139,233,255,.34)';
  ctx.lineWidth = 1;
  ctx.stroke();
}
function drawOrionLimbSegment(x, y, length, width, angle, topColor, bottomColor, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  drawOrionArmorPlate([
    { x: -width * 0.42, y: 1 },
    { x: width * 0.42, y: 1 },
    { x: width * 0.58, y: length * 0.62 },
    { x: width * 0.28, y: length },
    { x: -width * 0.28, y: length },
    { x: -width * 0.58, y: length * 0.62 }
  ], topColor, 'rgba(157,229,255,.32)', bottomColor);
  ctx.fillStyle = 'rgba(4,12,28,.2)';
  ctx.beginPath();
  ctx.roundRect(-width * 0.31, length * 0.58, width * 0.62, length * 0.2, width * 0.1);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.beginPath();
  ctx.roundRect(-width * 0.23, length * 0.14, width * 0.15, length * 0.38, width * 0.05);
  ctx.fill();
  ctx.restore();
  return limbEndpoint(x, y, length, angle);
}
function drawOrionFoot(x, y, angle, scale = 1, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  drawOrionArmorPlate([
    { x: -16 * scale, y: -8 * scale },
    { x: 9 * scale, y: -9 * scale },
    { x: 20 * scale, y: -2 * scale },
    { x: 14 * scale, y: 6 * scale },
    { x: -14 * scale, y: 6 * scale },
    { x: -20 * scale, y: 1 * scale }
  ], '#1e6fb8', 'rgba(153,231,255,.38)', '#08152e');
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ctx.fillRect(-2 * scale, -5 * scale, 10 * scale, 2.5 * scale);
  ctx.restore();
}
function drawOrionAxe(x, y, angle, attackT = 0) {
  const power = Math.sin(clamp01(attackT) * Math.PI);
  const handleLength = 48 + power * 4;
  const bladeScale = 0.9 + power * 0.1;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(68,239,255,.85)';
  ctx.shadowBlur = 8 + power * 11;
  ctx.strokeStyle = '#162542';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(handleLength, 0);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(147,239,255,.95)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-5, -0.5);
  ctx.lineTo(handleLength - 4, -0.5);
  ctx.stroke();
  ctx.translate(handleLength, 0);
  ctx.scale(bladeScale, bladeScale);
  const bladeGrad = ctx.createRadialGradient(8, 0, 4, 9, 0, 29);
  bladeGrad.addColorStop(0, 'rgba(255,255,255,.98)');
  bladeGrad.addColorStop(0.38, 'rgba(92,226,255,.92)');
  bladeGrad.addColorStop(0.78, 'rgba(47,117,255,.58)');
  bladeGrad.addColorStop(1, 'rgba(47,117,255,0)');
  ctx.fillStyle = bladeGrad;
  ctx.beginPath();
  ctx.moveTo(-3, -20);
  ctx.quadraticCurveTo(22, -33, 36, -12);
  ctx.quadraticCurveTo(24, -8, 21, 0);
  ctx.quadraticCurveTo(26, 9, 38, 13);
  ctx.quadraticCurveTo(18, 30, -4, 17);
  ctx.quadraticCurveTo(8, 3, -3, -20);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(214,250,255,.94)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.globalAlpha *= 0.72;
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(1, -14);
  ctx.quadraticCurveTo(19, -21, 28, -10);
  ctx.stroke();
  ctx.restore();
}
function drawOrionRig(p, character, visual) {
  const w = p.width;
  const h = p.height;
  const top = -h / 2;
  const bottom = h / 2;
  const runPower = visual?.state === 'run' ? clamp01(visual.speed ?? Math.abs(p.vx) / 300) : 0;
  const step = visual?.runStep ?? Math.sin(p.animationTime * 5.8);
  const idle = Math.sin(p.animationTime * 2.4);
  const isJump = visual?.state === 'jump';
  const attackT = visual?.state === 'orion-axe' ? clamp01(visual.attackT ?? 0) : 0;
  const attacking = visual?.state === 'orion-axe';
  const attackPower = attacking ? Math.sin(attackT * Math.PI) : 0;
  const torsoTilt = runPower * step * 0.032 + (isJump ? -0.06 : 0) + attackPower * 0.04;

  const shoulderY = top + h * 0.33;
  const hipY = top + h * 0.6;
  const shoulderSpread = w * 0.42;
  const hipSpread = w * 0.15;
  const torsoX = -w * 0.27;
  const torsoY = top + h * 0.22;
  const torsoW = w * 0.54;
  const torsoH = h * 0.41;

  ctx.save();
  ctx.rotate(torsoTilt);
  ctx.shadowColor = 'rgba(72,195,255,.32)';
  ctx.shadowBlur = 18;

  const leftSwing = -step * runPower;
  const rightSwing = step * runPower;
  const legBase = isJump ? 0.38 : 0;
  const backThigh = isJump ? 0.36 : leftSwing * 0.42;
  const backShin = backThigh + (isJump ? 0.42 : Math.max(-0.08, Math.min(0.42, -leftSwing * 0.38)));
  const frontThigh = isJump ? -0.36 : rightSwing * 0.42;
  const frontShin = frontThigh + (isJump ? 0.5 : Math.max(-0.08, Math.min(0.42, -rightSwing * 0.38)));

  ctx.save();
  ctx.globalAlpha *= 0.76;
  drawOrionJoint(-hipSpread, hipY, 4.8, '#102543');
  let joint = drawOrionLimbSegment(-hipSpread, hipY, h * 0.21, w * 0.16, backThigh + legBase * 0.16, '#b72632', '#07162d', 0.9);
  drawOrionJoint(joint.x, joint.y, 4.9, '#17243c');
  joint = drawOrionLimbSegment(joint.x, joint.y, h * 0.21, w * 0.17, backShin, '#13549b', '#07162d', 0.88);
  drawOrionFoot(joint.x, Math.min(bottom - 8, joint.y), -0.04 + leftSwing * 0.12, 0.9, 0.88);
  ctx.restore();

  drawOrionJoint(hipSpread, hipY, 5.2, '#152f52');
  joint = drawOrionLimbSegment(hipSpread, hipY, h * 0.215, w * 0.18, frontThigh - legBase * 0.16, '#d3383d', '#102b55', 1);
  drawOrionJoint(joint.x, joint.y, 5.1, '#1d3457');
  joint = drawOrionLimbSegment(joint.x, joint.y, h * 0.21, w * 0.175, frontShin, '#176cc0', '#07162d', 1);
  drawOrionFoot(joint.x, Math.min(bottom - 8, joint.y), 0.04 + rightSwing * 0.14, 0.98, 1);

  ctx.save();
  ctx.globalAlpha *= 0.82;
  drawOrionArmorPlate([
    { x: -shoulderSpread - w * 0.18, y: shoulderY - h * 0.07 },
    { x: -shoulderSpread + w * 0.04, y: shoulderY - h * 0.09 },
    { x: -shoulderSpread + w * 0.16, y: shoulderY - h * 0.01 },
    { x: -shoulderSpread + w * 0.08, y: shoulderY + h * 0.08 },
    { x: -shoulderSpread - w * 0.16, y: shoulderY + h * 0.06 }
  ], '#c92f35', 'rgba(139,229,255,.3)', '#111d36');
  drawOrionJoint(-shoulderSpread, shoulderY, 5.6, '#142d53');
  const freeUpper = isJump ? 0.5 : 0.22 + rightSwing * 0.2;
  const freeLower = isJump ? 0.1 : 0.42 - rightSwing * 0.16;
  let hand = drawOrionLimbSegment(-shoulderSpread, shoulderY, h * 0.18, w * 0.135, freeUpper, '#bd3038', '#07162d', 0.88);
  drawOrionJoint(hand.x, hand.y, 4.2, '#182a4a');
  hand = drawOrionLimbSegment(hand.x, hand.y, h * 0.16, w * 0.125, freeLower, '#1b5fa3', '#061226', 0.88);
  drawOrionJoint(hand.x, hand.y, 4.5, '#c62f35');
  ctx.restore();

  drawOrionArmorPlate([
    { x: -w * 0.22, y: torsoY + torsoH * 0.68 },
    { x: w * 0.22, y: torsoY + torsoH * 0.68 },
    { x: w * 0.17, y: torsoY + torsoH * 0.92 },
    { x: -w * 0.17, y: torsoY + torsoH * 0.92 }
  ], '#172f58', 'rgba(113,215,255,.34)', '#061226');
  drawOrionArmorPlate([
    { x: torsoX + torsoW * 0.12, y: torsoY },
    { x: torsoX + torsoW * 0.88, y: torsoY },
    { x: torsoX + torsoW, y: torsoY + torsoH * 0.32 },
    { x: torsoX + torsoW * 0.74, y: torsoY + torsoH },
    { x: torsoX + torsoW * 0.26, y: torsoY + torsoH },
    { x: torsoX, y: torsoY + torsoH * 0.32 }
  ], '#d23539', 'rgba(188,238,255,.36)', '#102849');
  drawOrionArmorPlate([
    { x: -w * 0.15, y: torsoY + h * 0.1 },
    { x: w * 0.15, y: torsoY + h * 0.1 },
    { x: w * 0.1, y: torsoY + h * 0.26 },
    { x: -w * 0.1, y: torsoY + h * 0.26 }
  ], '#bff5ff', 'rgba(255,255,255,.56)', '#35aee8');
  drawOrionArmorPlate([
    { x: -w * 0.19, y: torsoY + h * 0.29 },
    { x: w * 0.19, y: torsoY + h * 0.29 },
    { x: w * 0.14, y: torsoY + h * 0.38 },
    { x: -w * 0.14, y: torsoY + h * 0.38 }
  ], '#142643', 'rgba(98,209,255,.28)', '#061226');
  drawOrionArmorPlate([
    { x: -w * 0.4, y: shoulderY - h * 0.05 },
    { x: w * 0.4, y: shoulderY - h * 0.05 },
    { x: w * 0.31, y: shoulderY + h * 0.04 },
    { x: -w * 0.31, y: shoulderY + h * 0.04 }
  ], '#154a86', 'rgba(118,221,255,.34)', '#061226');
  ctx.shadowBlur = 0;

  const headY = top + h * 0.105 + idle * 0.55;
  drawOrionArmorPlate([
    { x: -w * 0.165, y: headY + h * 0.012 },
    { x: -w * 0.1, y: headY - h * 0.02 },
    { x: w * 0.1, y: headY - h * 0.02 },
    { x: w * 0.165, y: headY + h * 0.012 },
    { x: w * 0.13, y: headY + h * 0.135 },
    { x: -w * 0.13, y: headY + h * 0.135 }
  ], '#155a9b', 'rgba(170,238,255,.42)', '#061226');
  drawOrionArmorPlate([
    { x: -w * 0.105, y: headY + h * 0.055 },
    { x: w * 0.105, y: headY + h * 0.055 },
    { x: w * 0.082, y: headY + h * 0.097 },
    { x: -w * 0.082, y: headY + h * 0.097 }
  ], '#0b1d35', 'rgba(255,255,255,.25)', null);
  ctx.fillStyle = '#dffaff';
  ctx.beginPath();
  ctx.moveTo(-w * 0.093, headY + h * 0.06);
  ctx.lineTo(-w * 0.015, headY + h * 0.068);
  ctx.lineTo(-w * 0.027, headY + h * 0.087);
  ctx.lineTo(-w * 0.088, headY + h * 0.081);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.093, headY + h * 0.06);
  ctx.lineTo(w * 0.015, headY + h * 0.068);
  ctx.lineTo(w * 0.027, headY + h * 0.087);
  ctx.lineTo(w * 0.088, headY + h * 0.081);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d43a3d';
  ctx.beginPath();
  ctx.moveTo(-w * 0.155, headY + h * 0.02);
  ctx.lineTo(-w * 0.25, headY - h * 0.037);
  ctx.lineTo(-w * 0.12, headY + h * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.155, headY + h * 0.02);
  ctx.lineTo(w * 0.25, headY - h * 0.037);
  ctx.lineTo(w * 0.12, headY + h * 0.06);
  ctx.closePath();
  ctx.fill();

  drawOrionArmorPlate([
    { x: shoulderSpread - w * 0.04, y: shoulderY - h * 0.09 },
    { x: shoulderSpread + w * 0.18, y: shoulderY - h * 0.07 },
    { x: shoulderSpread + w * 0.16, y: shoulderY + h * 0.06 },
    { x: shoulderSpread - w * 0.08, y: shoulderY + h * 0.08 },
    { x: shoulderSpread - w * 0.16, y: shoulderY - h * 0.01 }
  ], '#d23539', 'rgba(139,229,255,.3)', '#112140');
  drawOrionJoint(shoulderSpread, shoulderY, 5.9, '#1b4474');
  const axePose = getOrionAxePose(p, visual);
  hand = drawOrionLimbSegment(shoulderSpread, shoulderY, h * 0.185, w * 0.14, axePose.axeUpper, '#d23539', '#0b1d37', 1);
  drawOrionJoint(hand.x, hand.y, 4.4, '#18345b');
  hand = drawOrionLimbSegment(hand.x, hand.y, h * 0.165, w * 0.13, axePose.axeLower, '#176cc0', '#061226', 1);
  drawOrionJoint(hand.x, hand.y, 5, '#d2383a');
  drawOrionAxe(hand.x + 2, hand.y, axePose.axeAngle, attackT);

  ctx.fillStyle = character?.accent || '#52b5ff';
  ctx.globalAlpha *= 0.16 + attackPower * 0.08;
  ctx.beginPath();
  ctx.ellipse(0, bottom - 7, w * 0.28, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBeeBlade(x, y, angle, length, width, intensity = 0) {
  const glow = 0.55 + intensity * 0.45;
  const tip = limbEndpoint(2, 0, length, angle);
  const nx = Math.cos(angle) * width;
  const ny = Math.sin(angle) * width;
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = 'rgba(68,239,255,.82)';
  ctx.shadowBlur = 8 + intensity * 10;
  const bladeGrad = ctx.createLinearGradient(0, 0, tip.x, tip.y);
  bladeGrad.addColorStop(0, 'rgba(255,255,255,.98)');
  bladeGrad.addColorStop(0.28, 'rgba(129,241,255,.94)');
  bladeGrad.addColorStop(0.66, `rgba(31,160,255,${0.82 * glow})`);
  bladeGrad.addColorStop(1, 'rgba(31,160,255,.14)');
  ctx.fillStyle = bladeGrad;
  ctx.beginPath();
  ctx.moveTo(-nx * 0.55, -ny * 0.55);
  ctx.lineTo(nx * 0.55, ny * 0.55);
  ctx.lineTo(tip.x + nx * 0.28, tip.y + ny * 0.28);
  ctx.lineTo(tip.x - nx * 0.28, tip.y - ny * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.96)';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(tip.x * 0.92, tip.y * 0.92);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(244,254,255,.9)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}
function drawBeeWheel(x, y, radius, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = '#101827';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2f3b54';
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,226,86,.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}
function drawBeeRig(p, character, visual) {
  const w = p.width;
  const h = p.height;
  const top = -h / 2;
  const bottom = h / 2;
  const pose = getBeeRigPose(p, visual);
  const idle = Math.sin(p.animationTime * 2.8);
  const yellow = '#f2b51c';
  const yellowHi = '#ffd94f';
  const amber = '#e8871c';
  const dark = '#171e2b';
  const panelDark = '#273144';
  const cyan = '#74f6ff';

  ctx.save();
  ctx.rotate(pose.torsoTilt);
  ctx.shadowColor = 'rgba(255,217,79,.24)';
  ctx.shadowBlur = 15;

  drawBeeWheel(-w * 0.26, bottom - h * 0.2, w * 0.12, 0.48);
  drawBeeWheel(w * 0.22, bottom - h * 0.22, w * 0.11, 0.42);

  ctx.save();
  ctx.globalAlpha *= 0.82;
  drawOrionJoint(-pose.hipSpread, pose.hipY, 4.6, '#1c2536');
  let joint = drawOrionLimbSegment(-pose.hipSpread, pose.hipY, h * 0.19, w * 0.145, pose.backThigh, amber, '#141b29', 0.88);
  drawOrionJoint(joint.x, joint.y, 4.4, '#242f44');
  joint = drawOrionLimbSegment(joint.x, joint.y, h * 0.19, w * 0.148, pose.backShin, panelDark, '#101827', 0.86);
  drawOrionFoot(joint.x, Math.min(bottom - 6, joint.y), -0.08 + pose.step * pose.runPower * 0.09, 0.78, 0.86);
  ctx.restore();

  drawOrionJoint(pose.hipSpread, pose.hipY, 4.8, '#1f293b');
  joint = drawOrionLimbSegment(pose.hipSpread, pose.hipY, h * 0.195, w * 0.155, pose.frontThigh, yellow, '#161d2c', 1);
  drawOrionJoint(joint.x, joint.y, 4.5, '#273249');
  joint = drawOrionLimbSegment(joint.x, joint.y, h * 0.19, w * 0.152, pose.frontShin, panelDark, '#101827', 1);
  drawOrionFoot(joint.x, Math.min(bottom - 6, joint.y), 0.08 - pose.step * pose.runPower * 0.1, 0.86, 1);

  ctx.save();
  ctx.globalAlpha *= 0.82;
  drawOrionArmorPlate([
    { x: -pose.shoulderSpread - w * 0.2, y: pose.shoulderY - h * 0.06 },
    { x: -pose.shoulderSpread + w * 0.04, y: pose.shoulderY - h * 0.08 },
    { x: -pose.shoulderSpread + w * 0.16, y: pose.shoulderY },
    { x: -pose.shoulderSpread + w * 0.08, y: pose.shoulderY + h * 0.075 },
    { x: -pose.shoulderSpread - w * 0.21, y: pose.shoulderY + h * 0.055 }
  ], yellow, 'rgba(255,241,124,.36)', '#151c2b');
  drawOrionJoint(-pose.shoulderSpread, pose.shoulderY + h * 0.012, 4.8, '#212b3e');
  let hand = drawOrionLimbSegment(-pose.shoulderSpread, pose.shoulderY + h * 0.012, h * 0.162, w * 0.122, pose.backUpper, yellow, '#101827', 0.88);
  drawOrionJoint(hand.x, hand.y, 3.9, '#2a3447');
  hand = drawOrionLimbSegment(hand.x, hand.y, h * 0.142, w * 0.116, pose.backLower, panelDark, '#101827', 0.88);
  drawOrionJoint(hand.x, hand.y, 4.1, '#f0b71e');
  drawBeeBlade(
    hand.x + 2,
    hand.y,
    pose.backBladeAngle,
    pose.slashing || pose.dashing ? pose.bladeLength * 0.92 : 44,
    pose.slashing || pose.dashing ? pose.bladeWidth : 6.6,
    pose.slashPower || pose.dashPower || 0.7
  );
  ctx.restore();

  drawOrionArmorPlate([
    { x: -w * 0.125, y: top + h * 0.56 },
    { x: w * 0.125, y: top + h * 0.56 },
    { x: w * 0.078, y: top + h * 0.78 },
    { x: -w * 0.078, y: top + h * 0.78 }
  ], dark, 'rgba(116,246,255,.22)', '#0b1322');
  drawOrionArmorPlate([
    { x: -w * 0.4, y: top + h * 0.24 },
    { x: -w * 0.16, y: top + h * 0.16 },
    { x: w * 0.16, y: top + h * 0.16 },
    { x: w * 0.4, y: top + h * 0.24 },
    { x: w * 0.21, y: top + h * 0.59 },
    { x: w * 0.072, y: top + h * 0.75 },
    { x: -w * 0.072, y: top + h * 0.75 },
    { x: -w * 0.21, y: top + h * 0.59 }
  ], yellow, 'rgba(255,244,139,.38)', '#a66513');
  drawOrionArmorPlate([
    { x: -w * 0.17, y: top + h * 0.31 },
    { x: w * 0.17, y: top + h * 0.31 },
    { x: w * 0.12, y: top + h * 0.49 },
    { x: -w * 0.12, y: top + h * 0.49 }
  ], '#0f1726', 'rgba(116,246,255,.2)', '#070d18');
  drawOrionArmorPlate([
    { x: -w * 0.1, y: top + h * 0.34 },
    { x: w * 0.1, y: top + h * 0.34 },
    { x: w * 0.075, y: top + h * 0.43 },
    { x: -w * 0.075, y: top + h * 0.43 }
  ], '#bff9ff', 'rgba(255,255,255,.58)', '#31bfe8');
  ctx.fillStyle = 'rgba(255,255,255,.2)';
  ctx.beginPath();
  ctx.roundRect(-w * 0.27, top + h * 0.21, w * 0.16, h * 0.05, 4);
  ctx.roundRect(w * 0.11, top + h * 0.21, w * 0.16, h * 0.05, 4);
  ctx.fill();

  const headY = top + h * 0.09 + idle * 0.45;
  drawOrionArmorPlate([
    { x: -w * 0.16, y: headY + h * 0.018 },
    { x: -w * 0.1, y: headY - h * 0.018 },
    { x: w * 0.1, y: headY - h * 0.018 },
    { x: w * 0.16, y: headY + h * 0.018 },
    { x: w * 0.13, y: headY + h * 0.15 },
    { x: -w * 0.13, y: headY + h * 0.15 }
  ], yellowHi, 'rgba(255,245,164,.45)', '#6f4b0a');
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.roundRect(-w * 0.095, headY + h * 0.06, w * 0.19, h * 0.055, 4);
  ctx.fill();
  ctx.fillStyle = cyan;
  const blink = Math.max(0.35, 1 - Math.abs(Math.sin(p.animationTime * 1.7)) * 0.12);
  ctx.beginPath();
  ctx.moveTo(-w * 0.08, headY + h * 0.066);
  ctx.lineTo(-w * 0.015, headY + h * 0.073);
  ctx.lineTo(-w * 0.025, headY + h * (0.09 * blink));
  ctx.lineTo(-w * 0.08, headY + h * 0.087);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.08, headY + h * 0.066);
  ctx.lineTo(w * 0.015, headY + h * 0.073);
  ctx.lineTo(w * 0.025, headY + h * (0.09 * blink));
  ctx.lineTo(w * 0.08, headY + h * 0.087);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffcf36';
  ctx.beginPath();
  ctx.moveTo(-w * 0.12, headY + h * 0.01);
  ctx.lineTo(-w * 0.2, headY - h * 0.038);
  ctx.lineTo(-w * 0.08, headY + h * 0.045);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.12, headY + h * 0.01);
  ctx.lineTo(w * 0.2, headY - h * 0.038);
  ctx.lineTo(w * 0.08, headY + h * 0.045);
  ctx.closePath();
  ctx.fill();

  drawOrionArmorPlate([
    { x: pose.shoulderSpread - w * 0.04, y: pose.shoulderY - h * 0.085 },
    { x: pose.shoulderSpread + w * 0.2, y: pose.shoulderY - h * 0.06 },
    { x: pose.shoulderSpread + w * 0.22, y: pose.shoulderY + h * 0.045 },
    { x: pose.shoulderSpread - w * 0.04, y: pose.shoulderY + h * 0.078 },
    { x: pose.shoulderSpread - w * 0.16, y: pose.shoulderY }
  ], yellowHi, 'rgba(255,241,124,.42)', '#151c2b');
  drawOrionJoint(pose.shoulderSpread, pose.shoulderY, 5, '#252f42');
  hand = drawOrionLimbSegment(pose.shoulderSpread, pose.shoulderY, h * 0.168, w * 0.13, pose.frontUpper, yellowHi, '#101827', 1);
  drawOrionJoint(hand.x, hand.y, 4.1, '#2d384c');
  hand = drawOrionLimbSegment(hand.x, hand.y, h * 0.148, w * 0.122, pose.frontLower, panelDark, '#101827', 1);
  drawOrionJoint(hand.x, hand.y, 4.4, '#f3bb22');
  drawBeeBlade(
    hand.x + 2,
    hand.y,
    pose.frontBladeAngle,
    pose.slashing || pose.dashing ? pose.bladeLength : 48,
    pose.slashing || pose.dashing ? pose.bladeWidth : 7,
    pose.slashPower || pose.dashPower || 0.78
  );

  if (pose.dashing) {
    ctx.save();
    ctx.globalAlpha *= 0.22;
    ctx.fillStyle = '#44efff';
    for (let index = 0; index < 3; index += 1) {
      ctx.beginPath();
      ctx.ellipse(-w * (0.35 + index * 0.18), h * (0.02 + index * 0.04), w * (0.22 - index * 0.03), 3, -0.12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.fillStyle = character?.accent || '#202738';
  ctx.globalAlpha *= 0.12 + pose.slashPower * 0.08 + pose.dashPower * 0.12;
  ctx.beginPath();
  ctx.ellipse(0, bottom - 7, w * 0.32, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function usesCodeRobotRig(character, player) {
  return player?.form === 'robot' && ['orion', 'bee', 'elita', 'd16'].includes(character?.id);
}
function usesCodeVehicleRig(character, player) {
  return player?.form === 'vehicle' && ['bee', 'elita', 'd16'].includes(character?.id);
}
function getElitaKickStrikeLocal(p, attackT = 0.5) {
  const t = clamp01(attackT);
  const power = Math.sin(t * Math.PI);
  const w = p.width;
  const h = p.height;
  const top = -h / 2;
  const bottom = h / 2;
  const hipY = top + h * 0.53;
  const hipSpread = w * 0.145;
  const frontThighAngle = power ? -1.12 + t * 0.16 : 0;
  const frontShinAngle = power ? -1.26 + t * 0.12 : 0;
  let joint = limbEndpoint(hipSpread, hipY, h * 0.27, frontThighAngle);
  joint = limbEndpoint(joint.x, joint.y, h * 0.258, frontShinAngle);
  const footX = joint.x;
  const footY = Math.min(bottom - 6, joint.y);
  return {
    centerX: footX + w * (0.18 + power * 0.04),
    centerY: footY - h * 0.05,
    width: w * (0.42 + power * 0.12),
    height: h * 0.24,
    power
  };
}
function drawElitaRig(p, character, visual) {
  const w = p.width;
  const h = p.height;
  const top = -h / 2;
  const bottom = h / 2;
  const runPower = visual?.state === 'run' ? clamp01(visual.speed ?? Math.abs(p.vx) / 300) : 0;
  const step = visual?.runStep ?? Math.sin(p.animationTime * 5.8);
  const idle = Math.sin(p.animationTime * 2.7);
  const isJump = visual?.state === 'jump';
  const gliding = !p.onGround && game.input.jumpHeld && p.vy > 0;
  const kickT = visual?.state === 'elita-kick' ? clamp01(visual.attackT ?? 0) : 0;
  const kickPower = Math.sin(kickT * Math.PI);
  const torsoTilt = runPower * step * 0.05 + (isJump ? -0.12 : 0) + (gliding ? 0.08 : 0) - kickPower * 0.08;
  const shoulderY = top + h * 0.3;
  const hipY = top + h * 0.53;
  const shoulderSpread = w * 0.33;
  const hipSpread = w * 0.145;
  const pink = '#d85aa6';
  const hot = '#ff7cc9';
  const purple = '#6756ff';
  const dark = '#17142d';
  const cyan = '#c9fbff';

  ctx.save();
  ctx.rotate(torsoTilt);
  ctx.shadowColor = 'rgba(255,124,201,.24)';
  ctx.shadowBlur = 16;

  if (gliding) {
    const wingGrad = ctx.createLinearGradient(-w * 0.86, top + h * 0.35, w * 0.86, top + h * 0.35);
    wingGrad.addColorStop(0, 'rgba(103,86,255,.05)');
    wingGrad.addColorStop(0.5, 'rgba(255,255,255,.34)');
    wingGrad.addColorStop(1, 'rgba(216,90,166,.05)');
    ctx.fillStyle = wingGrad;
    ctx.beginPath();
    ctx.moveTo(-w * 0.18, top + h * 0.38);
    ctx.lineTo(-w * 0.96, top + h * 0.18);
    ctx.lineTo(-w * 0.62, top + h * 0.52);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w * 0.18, top + h * 0.38);
    ctx.lineTo(w * 0.96, top + h * 0.18);
    ctx.lineTo(w * 0.62, top + h * 0.52);
    ctx.closePath();
    ctx.fill();
  }

  const backThighAngle = kickPower ? 0.18 + kickPower * 0.16 : isJump ? 0.44 : -step * runPower * 0.5;
  const backShinAngle = kickPower ? 0.48 : isJump ? 0.52 : Math.max(-0.1, Math.min(0.48, step * runPower * 0.42));
  const frontThighAngle = kickPower ? -1.12 + kickT * 0.16 : isJump ? -0.42 : step * runPower * 0.5;
  const frontShinAngle = kickPower ? -1.26 + kickT * 0.12 : isJump ? 0.42 : Math.max(-0.1, Math.min(0.48, -step * runPower * 0.42));

  ctx.save();
  ctx.globalAlpha *= 0.8;
  drawOrionJoint(-hipSpread, hipY, 4.2, '#221b3d');
  let joint = drawOrionLimbSegment(-hipSpread, hipY, h * 0.265, w * 0.118, backThighAngle, pink, '#1a1630', 0.82);
  drawOrionJoint(joint.x, joint.y, 3.8, '#2b2248');
  joint = drawOrionLimbSegment(joint.x, joint.y, h * 0.255, w * 0.112, backShinAngle, purple, '#121023', 0.82);
  drawOrionFoot(joint.x, Math.min(bottom - 6, joint.y), -0.1 + step * runPower * 0.14, 0.62, 0.82);
  ctx.restore();

  drawOrionJoint(hipSpread, hipY, 4.4, '#2a2146');
  joint = drawOrionLimbSegment(hipSpread, hipY, h * 0.27, w * 0.125, frontThighAngle, hot, '#1a1630', 1);
  drawOrionJoint(joint.x, joint.y, 3.9, '#31254f');
  joint = drawOrionLimbSegment(joint.x, joint.y, h * 0.258, w * 0.118, frontShinAngle, purple, '#121023', 1);
  const kickFoot = { x: joint.x, y: Math.min(bottom - 6, joint.y) };
  drawOrionFoot(kickFoot.x, kickFoot.y, kickPower ? -0.58 : 0.08 - step * runPower * 0.14, 0.68 + kickPower * 0.1, 1);
  if (kickPower) {
    ctx.save();
    const strike = getElitaKickStrikeLocal(p, kickT);
    ctx.translate(strike.centerX, strike.centerY);
    ctx.shadowColor = 'rgba(255,124,201,.7)';
    ctx.shadowBlur = 14;
    const kickGrad = ctx.createLinearGradient(-strike.width * 0.5, 0, strike.width * 0.5, 0);
    kickGrad.addColorStop(0, 'rgba(255,255,255,.92)');
    kickGrad.addColorStop(0.5, 'rgba(255,124,201,.58)');
    kickGrad.addColorStop(1, 'rgba(103,86,255,0)');
    ctx.fillStyle = kickGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, strike.width * 0.5, strike.height * 0.24, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.42)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha *= 0.86;
  drawOrionArmorPlate([
    { x: -shoulderSpread - w * 0.12, y: shoulderY - h * 0.045 },
    { x: -shoulderSpread + w * 0.06, y: shoulderY - h * 0.07 },
    { x: -shoulderSpread + w * 0.13, y: shoulderY + h * 0.01 },
    { x: -shoulderSpread + w * 0.04, y: shoulderY + h * 0.07 },
    { x: -shoulderSpread - w * 0.14, y: shoulderY + h * 0.04 }
  ], pink, 'rgba(255,206,238,.38)', '#19132d');
  drawOrionJoint(-shoulderSpread, shoulderY, 4.2, '#2a2146');
  let hand = drawOrionLimbSegment(-shoulderSpread, shoulderY, h * 0.18, w * 0.105, gliding ? -1.03 : 0.2 + step * runPower * 0.18, pink, '#161126', 0.84);
  drawOrionJoint(hand.x, hand.y, 3.5, '#372a57');
  hand = drawOrionLimbSegment(hand.x, hand.y, h * 0.17, w * 0.098, gliding ? -0.72 : 0.38 - step * runPower * 0.16, purple, '#121023', 0.84);
  drawOrionJoint(hand.x, hand.y, 3.6, hot);
  ctx.restore();

  drawOrionArmorPlate([
    { x: -w * 0.23, y: top + h * 0.23 },
    { x: -w * 0.095, y: top + h * 0.155 },
    { x: w * 0.095, y: top + h * 0.155 },
    { x: w * 0.23, y: top + h * 0.23 },
    { x: w * 0.13, y: top + h * 0.48 },
    { x: w * 0.21, y: top + h * 0.63 },
    { x: w * 0.08, y: top + h * 0.76 },
    { x: -w * 0.08, y: top + h * 0.76 },
    { x: -w * 0.21, y: top + h * 0.63 },
    { x: -w * 0.13, y: top + h * 0.48 }
  ], pink, 'rgba(255,206,238,.42)', '#7b2b71');
  drawOrionArmorPlate([
    { x: -w * 0.11, y: top + h * 0.31 },
    { x: w * 0.11, y: top + h * 0.31 },
    { x: w * 0.07, y: top + h * 0.48 },
    { x: -w * 0.07, y: top + h * 0.48 }
  ], cyan, 'rgba(255,255,255,.58)', '#49d4ef');
  drawOrionArmorPlate([
    { x: -w * 0.11, y: top + h * 0.5 },
    { x: w * 0.11, y: top + h * 0.5 },
    { x: w * 0.16, y: top + h * 0.63 },
    { x: w * 0.075, y: top + h * 0.77 },
    { x: -w * 0.075, y: top + h * 0.77 },
    { x: -w * 0.16, y: top + h * 0.63 }
  ], dark, 'rgba(103,86,255,.38)', '#080713');

  const headY = top + h * 0.08 + idle * 0.45;
  drawOrionArmorPlate([
    { x: -w * 0.15, y: headY + h * 0.02 },
    { x: -w * 0.08, y: headY - h * 0.014 },
    { x: w * 0.08, y: headY - h * 0.014 },
    { x: w * 0.15, y: headY + h * 0.02 },
    { x: w * 0.12, y: headY + h * 0.14 },
    { x: -w * 0.12, y: headY + h * 0.14 }
  ], hot, 'rgba(255,218,242,.44)', '#7b2b71');
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.roundRect(-w * 0.09, headY + h * 0.06, w * 0.18, h * 0.052, 4);
  ctx.fill();
  ctx.fillStyle = cyan;
  ctx.beginPath();
  ctx.moveTo(-w * 0.078, headY + h * 0.067);
  ctx.lineTo(-w * 0.014, headY + h * 0.074);
  ctx.lineTo(-w * 0.025, headY + h * 0.092);
  ctx.lineTo(-w * 0.076, headY + h * 0.086);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.078, headY + h * 0.067);
  ctx.lineTo(w * 0.014, headY + h * 0.074);
  ctx.lineTo(w * 0.025, headY + h * 0.092);
  ctx.lineTo(w * 0.076, headY + h * 0.086);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = purple;
  ctx.beginPath();
  ctx.moveTo(-w * 0.13, headY + h * 0.022);
  ctx.lineTo(-w * 0.22, headY - h * 0.026);
  ctx.lineTo(-w * 0.08, headY + h * 0.052);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.13, headY + h * 0.022);
  ctx.lineTo(w * 0.22, headY - h * 0.026);
  ctx.lineTo(w * 0.08, headY + h * 0.052);
  ctx.closePath();
  ctx.fill();

  drawOrionArmorPlate([
    { x: shoulderSpread - w * 0.06, y: shoulderY - h * 0.07 },
    { x: shoulderSpread + w * 0.12, y: shoulderY - h * 0.045 },
    { x: shoulderSpread + w * 0.14, y: shoulderY + h * 0.04 },
    { x: shoulderSpread - w * 0.04, y: shoulderY + h * 0.07 },
    { x: shoulderSpread - w * 0.13, y: shoulderY + h * 0.01 }
  ], hot, 'rgba(255,206,238,.42)', '#19132d');
  drawOrionJoint(shoulderSpread, shoulderY, 4.3, '#33264f');
  hand = drawOrionLimbSegment(shoulderSpread, shoulderY, h * 0.18, w * 0.108, gliding ? -0.92 : -0.18 - step * runPower * 0.18, hot, '#161126', 1);
  drawOrionJoint(hand.x, hand.y, 3.7, '#3a2a58');
  hand = drawOrionLimbSegment(hand.x, hand.y, h * 0.17, w * 0.1, gliding ? -0.62 : 0.3 + step * runPower * 0.16, purple, '#121023', 1);
  drawOrionJoint(hand.x, hand.y, 3.8, hot);

  ctx.fillStyle = character?.accent || purple;
  ctx.globalAlpha *= 0.12 + (gliding ? 0.12 : 0);
  ctx.beginPath();
  ctx.ellipse(0, bottom - 6, w * 0.28, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawD16Rig(p, character, visual) {
  const w = p.width;
  const h = p.height;
  const top = -h / 2;
  const bottom = h / 2;
  const runPower = visual?.state === 'run' ? clamp01(visual.speed ?? Math.abs(p.vx) / 280) : 0;
  const step = visual?.runStep ?? Math.sin(p.animationTime * 5.1);
  const idle = Math.sin(p.animationTime * 2.1);
  const isJump = visual?.state === 'jump';
  const charging = visual?.state === 'charge';
  const recoil = visual?.state === 'recoil';
  const cannonPower = charging ? Math.min(1, p.chargeTime || 0) : recoil ? 0.7 : 0;
  const torsoTilt = runPower * step * 0.025 + (isJump ? -0.04 : 0) - cannonPower * 0.035;
  const shoulderY = top + h * 0.31;
  const hipY = top + h * 0.5;
  const shoulderSpread = w * 0.5;
  const hipSpread = w * 0.12;
  const metal = '#737d8e';
  const steel = '#cfd5e2';
  const dark = '#202738';
  const gun = '#384152';
  const red = '#c24646';

  ctx.save();
  ctx.rotate(torsoTilt);
  ctx.shadowColor = 'rgba(207,213,226,.22)';
  ctx.shadowBlur = 14;

  ctx.save();
  ctx.globalAlpha *= 0.82;
  drawOrionJoint(-hipSpread, hipY, 5.4, '#252b36');
  let joint = drawOrionLimbSegment(-hipSpread, hipY, h * 0.265, w * 0.17, isJump ? 0.34 : -step * runPower * 0.34, metal, '#171c25', 0.88);
  drawOrionJoint(joint.x, joint.y, 5.2, '#303743');
  joint = drawOrionLimbSegment(joint.x, joint.y, h * 0.275, w * 0.176, isJump ? 0.38 : Math.max(-0.07, Math.min(0.34, step * runPower * 0.3)), gun, '#111722', 0.88);
  drawOrionFoot(joint.x, Math.min(bottom - 7, joint.y), -0.02 + step * runPower * 0.08, 1.02, 0.88);
  ctx.restore();

  drawOrionJoint(hipSpread, hipY, 5.8, '#2f3642');
  joint = drawOrionLimbSegment(hipSpread, hipY, h * 0.27, w * 0.18, isJump ? -0.3 : step * runPower * 0.34, metal, '#171c25', 1);
  drawOrionJoint(joint.x, joint.y, 5.4, '#353c49');
  joint = drawOrionLimbSegment(joint.x, joint.y, h * 0.278, w * 0.18, isJump ? 0.34 : Math.max(-0.07, Math.min(0.34, -step * runPower * 0.3)), gun, '#111722', 1);
  drawOrionFoot(joint.x, Math.min(bottom - 7, joint.y), 0.02 - step * runPower * 0.08, 1.08, 1);

  drawOrionArmorPlate([
    { x: -w * 0.44, y: top + h * 0.24 },
    { x: -w * 0.24, y: top + h * 0.15 },
    { x: w * 0.24, y: top + h * 0.15 },
    { x: w * 0.44, y: top + h * 0.24 },
    { x: w * 0.24, y: top + h * 0.52 },
    { x: w * 0.125, y: top + h * 0.66 },
    { x: -w * 0.125, y: top + h * 0.66 },
    { x: -w * 0.24, y: top + h * 0.52 }
  ], metal, 'rgba(232,239,255,.35)', '#303743');
  drawOrionArmorPlate([
    { x: -w * 0.2, y: top + h * 0.3 },
    { x: w * 0.2, y: top + h * 0.3 },
    { x: w * 0.105, y: top + h * 0.49 },
    { x: -w * 0.105, y: top + h * 0.49 }
  ], dark, 'rgba(232,239,255,.22)', '#111722');
  drawOrionArmorPlate([
    { x: -w * 0.11, y: top + h * 0.32 },
    { x: w * 0.11, y: top + h * 0.32 },
    { x: w * 0.08, y: top + h * 0.42 },
    { x: -w * 0.08, y: top + h * 0.42 }
  ], '#d9eef7', 'rgba(255,255,255,.48)', '#7d9aa8');
  drawOrionArmorPlate([
    { x: -w * 0.48, y: shoulderY - h * 0.065 },
    { x: w * 0.48, y: shoulderY - h * 0.065 },
    { x: w * 0.39, y: shoulderY + h * 0.055 },
    { x: -w * 0.39, y: shoulderY + h * 0.055 }
  ], gun, 'rgba(232,239,255,.24)', '#101722');
  ctx.fillStyle = '#b93434';
  ctx.fillRect(-w * 0.26, top + h * 0.39, w * 0.16, h * 0.052);
  ctx.fillRect(w * 0.1, top + h * 0.39, w * 0.16, h * 0.052);
  ctx.fillStyle = 'rgba(255,210,210,.32)';
  ctx.fillRect(-w * 0.245, top + h * 0.405, w * 0.13, h * 0.012);
  ctx.fillRect(w * 0.115, top + h * 0.405, w * 0.13, h * 0.012);

  const headY = top + h * 0.09 + idle * 0.35;
  drawOrionArmorPlate([
    { x: -w * 0.16, y: headY + h * 0.02 },
    { x: -w * 0.1, y: headY - h * 0.015 },
    { x: w * 0.1, y: headY - h * 0.015 },
    { x: w * 0.16, y: headY + h * 0.02 },
    { x: w * 0.14, y: headY + h * 0.13 },
    { x: -w * 0.14, y: headY + h * 0.13 }
  ], steel, 'rgba(255,255,255,.42)', '#424b59');
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.roundRect(-w * 0.105, headY + h * 0.055, w * 0.21, h * 0.05, 4);
  ctx.fill();
  ctx.fillStyle = '#ffb7b7';
  ctx.fillRect(-w * 0.082, headY + h * 0.068, w * 0.164, h * 0.012);
  ctx.fillStyle = red;
  ctx.fillRect(-w * 0.028, headY + h * 0.09, w * 0.056, h * 0.02);

  ctx.save();
  ctx.globalAlpha *= 0.86;
  drawOrionJoint(-shoulderSpread, shoulderY, 5.7, '#303743');
  let hand = drawOrionLimbSegment(-shoulderSpread, shoulderY, h * 0.18, w * 0.15, isJump ? 0.42 : 0.22 + step * runPower * 0.12, metal, '#171c25', 0.86);
  drawOrionJoint(hand.x, hand.y, 4.7, '#343b48');
  hand = drawOrionLimbSegment(hand.x, hand.y, h * 0.17, w * 0.145, isJump ? 0.08 : 0.46 - step * runPower * 0.1, gun, '#111722', 0.86);
  drawOrionJoint(hand.x, hand.y, 4.8, steel);
  ctx.restore();

  drawOrionJoint(shoulderSpread, shoulderY, 6, '#343b48');
  const upper = charging || recoil ? -1.02 : -0.2 - step * runPower * 0.12;
  const lower = charging || recoil ? -1.58 : 0.34 + step * runPower * 0.1;
  hand = drawOrionLimbSegment(shoulderSpread, shoulderY, h * 0.17, w * 0.16, upper, metal, '#171c25', 1);
  drawOrionJoint(hand.x, hand.y, 5, '#3b4350');
  hand = drawOrionLimbSegment(hand.x, hand.y, h * 0.145, w * 0.15, lower, gun, '#111722', 1);
  drawOrionJoint(hand.x, hand.y, 5.2, steel);
  ctx.save();
  ctx.translate(hand.x, hand.y);
  const cannonForward = charging || recoil;
  const cannonAngle = cannonForward ? Math.atan2(Math.cos(lower), -Math.sin(lower)) : -0.72;
  ctx.rotate(cannonAngle);
  ctx.fillStyle = '#18202c';
  ctx.beginPath();
  ctx.roundRect(cannonForward ? -5 : -20, -12, cannonForward ? 32 : 28, 24, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(207,213,226,.55)';
  ctx.fillRect(cannonForward ? 2 : -14, -7, 6, 4);
  ctx.fillRect(cannonForward ? 2 : -14, 3, 6, 4);
  ctx.fillStyle = '#2c3544';
  ctx.beginPath();
  ctx.roundRect(cannonForward ? 14 : -4, -9, 72, 18, 8);
  ctx.fill();
  ctx.fillStyle = '#111722';
  ctx.fillRect(cannonForward ? 30 : 12, -6, 13, 12);
  ctx.fillStyle = steel;
  ctx.fillRect(cannonForward ? 44 : 26, -5, 32, 10);
  ctx.fillStyle = '#151c26';
  ctx.beginPath();
  ctx.roundRect(cannonForward ? 74 : 56, -6, 24, 12, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  ctx.fillRect(cannonForward ? 47 : 29, -3, 26, 2);
  ctx.fillStyle = red;
  ctx.beginPath();
  const muzzleX = cannonForward ? 100 : 82;
  ctx.arc(muzzleX, 0, 5.5 + cannonPower * 5.5, 0, Math.PI * 2);
  ctx.fill();
  if (charging) {
    const flare = ctx.createRadialGradient(muzzleX + 4, 0, 2, muzzleX + 4, 0, 28 + cannonPower * 10);
    flare.addColorStop(0, 'rgba(255,244,210,.92)');
    flare.addColorStop(0.42, 'rgba(255,199,108,.62)');
    flare.addColorStop(1, 'rgba(255,199,108,0)');
    ctx.fillStyle = flare;
    ctx.beginPath();
    ctx.arc(muzzleX + 4, 0, 28 + cannonPower * 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = character?.accent || steel;
  ctx.globalAlpha *= 0.12 + cannonPower * 0.08;
  ctx.beginPath();
  ctx.ellipse(0, bottom - 7, w * 0.31, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCyberWheel(x, y, radius, trim = '#9ae8ff', spin = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.fillStyle = '#071226';
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c2738';
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = trim;
  ctx.globalAlpha *= 0.72;
  ctx.lineWidth = 2;
  for (let index = 0; index < 3; index += 1) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(index * Math.PI * 2 / 3) * radius * 0.48, Math.sin(index * Math.PI * 2 / 3) * radius * 0.48);
    ctx.stroke();
  }
  ctx.restore();
}
function drawOrionVehicle(p, character) {
  const w = p.width;
  const h = p.height;
  const spin = p.animationTime * Math.max(0.45, Math.abs(p.vx) / 82);
  const red = character?.color || '#d6413b';
  const blue = '#176cc0';
  const dark = '#0b1d35';
  const glass = '#bff5ff';
  ctx.save();
  ctx.translate(0, Math.sin(p.animationTime * 8.5) * Math.min(1.35, Math.abs(p.vx) / 270));
  ctx.shadowColor = 'rgba(82,181,255,.24)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = 'rgba(7,18,38,.32)';
  ctx.beginPath();
  ctx.ellipse(0, h * 0.37, w * 0.47, h * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  drawOrionArmorPlate([
    { x: -w * 0.52, y: h * 0.07 },
    { x: -w * 0.44, y: -h * 0.08 },
    { x: -w * 0.13, y: -h * 0.08 },
    { x: -w * 0.03, y: h * 0.08 },
    { x: -w * 0.03, y: h * 0.27 },
    { x: -w * 0.52, y: h * 0.27 }
  ], '#123a68', 'rgba(123,223,255,.38)', '#07162d');
  drawOrionArmorPlate([
    { x: -w * 0.46, y: -h * 0.05 },
    { x: -w * 0.18, y: -h * 0.05 },
    { x: -w * 0.08, y: h * 0.07 },
    { x: -w * 0.49, y: h * 0.07 }
  ], blue, 'rgba(123,223,255,.28)', '#07162d');

  drawOrionArmorPlate([
    { x: -w * 0.02, y: -h * 0.16 },
    { x: w * 0.28, y: -h * 0.16 },
    { x: w * 0.49, y: h * 0.04 },
    { x: w * 0.49, y: h * 0.27 },
    { x: -w * 0.02, y: h * 0.27 }
  ], red, 'rgba(123,223,255,.36)', '#8f2430');
  drawOrionArmorPlate([
    { x: w * 0.03, y: -h * 0.33 },
    { x: w * 0.26, y: -h * 0.33 },
    { x: w * 0.39, y: -h * 0.18 },
    { x: w * 0.48, y: h * 0.04 },
    { x: -w * 0.01, y: h * 0.04 }
  ], red, 'rgba(255,255,255,.18)', '#8f2430');
  drawOrionArmorPlate([
    { x: w * 0.07, y: -h * 0.25 },
    { x: w * 0.24, y: -h * 0.25 },
    { x: w * 0.33, y: -h * 0.14 },
    { x: w * 0.02, y: -h * 0.14 }
  ], glass, 'rgba(255,255,255,.55)', 'rgba(45,220,255,.25)');

  drawOrionArmorPlate([
    { x: -w * 0.55, y: h * 0.23 },
    { x: w * 0.53, y: h * 0.23 },
    { x: w * 0.49, y: h * 0.34 },
    { x: -w * 0.5, y: h * 0.34 }
  ], dark, 'rgba(123,223,255,.24)', '#071226');
  drawOrionArmorPlate([
    { x: -w * 0.5, y: h * 0.2 },
    { x: -w * 0.27, y: h * 0.2 },
    { x: -w * 0.22, y: h * 0.28 },
    { x: -w * 0.54, y: h * 0.28 }
  ], blue, 'rgba(123,223,255,.22)', '#07162d');
  drawOrionArmorPlate([
    { x: w * 0.1, y: h * 0.2 },
    { x: w * 0.48, y: h * 0.2 },
    { x: w * 0.42, y: h * 0.29 },
    { x: w * 0.06, y: h * 0.29 }
  ], blue, 'rgba(123,223,255,.22)', '#07162d');

  ctx.fillStyle = 'rgba(45,220,255,.72)';
  ctx.beginPath();
  ctx.roundRect(w * 0.14, -h * 0.02, w * 0.26, h * 0.07, h * 0.02);
  ctx.fill();
  ctx.fillStyle = 'rgba(82,181,255,.88)';
  ctx.beginPath();
  ctx.moveTo(w * 0.48, h * 0.06);
  ctx.lineTo(w * 0.56, h * 0.11);
  ctx.lineTo(w * 0.48, h * 0.17);
  ctx.closePath();
  ctx.fill();
  drawCyberWheel(-w * 0.25, h * 0.34, h * 0.17, glass, spin);
  drawCyberWheel(w * 0.25, h * 0.34, h * 0.17, glass, spin);
  ctx.restore();
}
function drawBeeVehicle(p, character) {
  const w = p.width;
  const h = p.height;
  const spin = p.animationTime * Math.max(0.5, Math.abs(p.vx) / 90);
  const yellow = '#f2b51c';
  const bright = '#ffdf4d';
  const dark = '#141b29';
  const cyan = '#66f5ff';
  ctx.save();
  ctx.translate(0, Math.sin(p.animationTime * 10) * Math.min(1.5, Math.abs(p.vx) / 260));
  ctx.shadowColor = 'rgba(255,223,77,.28)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = 'rgba(7,18,38,.34)';
  ctx.beginPath();
  ctx.ellipse(0, h * 0.34, w * 0.48, h * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  drawOrionArmorPlate([
    { x: -w * 0.5, y: h * 0.08 },
    { x: -w * 0.38, y: -h * 0.18 },
    { x: -w * 0.18, y: -h * 0.36 },
    { x: w * 0.2, y: -h * 0.35 },
    { x: w * 0.43, y: -h * 0.08 },
    { x: w * 0.5, y: h * 0.16 },
    { x: w * 0.41, y: h * 0.28 },
    { x: -w * 0.45, y: h * 0.28 }
  ], yellow, 'rgba(255,246,161,.45)', '#9a6b11');
  drawOrionArmorPlate([
    { x: -w * 0.22, y: -h * 0.31 },
    { x: w * 0.14, y: -h * 0.3 },
    { x: w * 0.28, y: -h * 0.11 },
    { x: -w * 0.31, y: -h * 0.1 }
  ], '#bff9ff', 'rgba(255,255,255,.58)', '#31bfe8');
  drawOrionArmorPlate([
    { x: -w * 0.42, y: h * 0.04 },
    { x: w * 0.34, y: h * 0.04 },
    { x: w * 0.43, y: h * 0.24 },
    { x: -w * 0.44, y: h * 0.24 }
  ], dark, 'rgba(255,223,77,.22)', '#071226');
  drawOrionArmorPlate([
    { x: -w * 0.1, y: -h * 0.34 },
    { x: w * 0.02, y: -h * 0.34 },
    { x: w * 0.13, y: h * 0.26 },
    { x: -w * 0.02, y: h * 0.26 }
  ], '#111827', 'rgba(255,255,255,.16)', '#050913');
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ctx.fillRect(-w * 0.37, -h * 0.02, w * 0.18, h * 0.045);
  ctx.fillRect(w * 0.16, -h * 0.015, w * 0.2, h * 0.045);
  ctx.fillStyle = cyan;
  ctx.beginPath();
  ctx.moveTo(w * 0.44, -h * 0.02);
  ctx.lineTo(w * 0.58, h * 0.05);
  ctx.lineTo(w * 0.43, h * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(102,245,255,.84)';
  ctx.beginPath();
  ctx.roundRect(-w * 0.46, h * 0.02, w * 0.16, h * 0.045, h * 0.02);
  ctx.roundRect(w * 0.22, -h * 0.05, w * 0.18, h * 0.04, h * 0.02);
  ctx.fill();
  drawCyberWheel(-w * 0.29, h * 0.3, h * 0.2, bright, spin);
  drawCyberWheel(w * 0.31, h * 0.3, h * 0.2, bright, spin);
  if (Math.abs(p.vx) > 220) {
    ctx.globalAlpha *= 0.32;
    ctx.fillStyle = cyan;
    ctx.beginPath();
    ctx.ellipse(-w * 0.54, h * 0.09, w * 0.18, h * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function drawElitaVehicle(p, character) {
  const w = p.width;
  const h = p.height;
  const spin = p.animationTime * Math.max(0.5, Math.abs(p.vx) / 85);
  const pink = character?.color || '#d85aa6';
  const hot = '#ff5fb5';
  const purple = character?.accent || '#6756ff';
  const white = '#f0edf4';
  const dark = '#151421';
  const glass = 'rgba(202,212,225,.58)';
  ctx.save();
  ctx.translate(0, Math.sin(p.animationTime * 9) * Math.min(1.4, Math.abs(p.vx) / 260));
  ctx.shadowColor = 'rgba(255,124,201,.3)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = 'rgba(7,18,38,.32)';
  ctx.beginPath();
  ctx.ellipse(0, h * 0.35, w * 0.47, h * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  drawCyberWheel(-w * 0.36, h * 0.25, h * 0.24, hot, spin);
  drawCyberWheel(w * 0.35, h * 0.24, h * 0.21, hot, spin);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(18,17,28,.94)';
  ctx.lineWidth = h * 0.11;
  ctx.beginPath();
  ctx.moveTo(-w * 0.34, h * 0.12);
  ctx.quadraticCurveTo(-w * 0.08, -h * 0.08, w * 0.31, h * 0.12);
  ctx.stroke();

  ctx.strokeStyle = '#292633';
  ctx.lineWidth = h * 0.055;
  ctx.beginPath();
  ctx.moveTo(w * 0.31, h * 0.1);
  ctx.lineTo(w * 0.17, -h * 0.22);
  ctx.lineTo(w * 0.02, -h * 0.3);
  ctx.stroke();

  drawOrionArmorPlate([
    { x: -w * 0.48, y: h * 0.12 },
    { x: -w * 0.35, y: -h * 0.1 },
    { x: -w * 0.08, y: -h * 0.24 },
    { x: w * 0.25, y: -h * 0.2 },
    { x: w * 0.5, y: h * 0.01 },
    { x: w * 0.36, y: h * 0.18 },
    { x: -w * 0.3, y: h * 0.22 }
  ], hot, 'rgba(255,213,240,.45)', '#7b2b71');
  drawOrionArmorPlate([
    { x: -w * 0.26, y: -h * 0.04 },
    { x: w * 0.1, y: -h * 0.08 },
    { x: w * 0.22, y: h * 0.05 },
    { x: -w * 0.07, y: h * 0.2 },
    { x: -w * 0.34, y: h * 0.17 }
  ], white, 'rgba(255,255,255,.58)', '#a9a3ad');
  drawOrionArmorPlate([
    { x: -w * 0.07, y: -h * 0.45 },
    { x: w * 0.2, y: -h * 0.48 },
    { x: w * 0.35, y: -h * 0.29 },
    { x: w * 0.16, y: -h * 0.18 },
    { x: -w * 0.12, y: -h * 0.22 }
  ], glass, 'rgba(255,255,255,.34)', 'rgba(14,17,28,.12)');
  drawOrionArmorPlate([
    { x: w * 0.08, y: -h * 0.23 },
    { x: w * 0.48, y: -h * 0.16 },
    { x: w * 0.42, y: -h * 0.04 },
    { x: w * 0.18, y: -h * 0.06 }
  ], pink, 'rgba(255,213,240,.3)', '#7b2b71');
  drawOrionArmorPlate([
    { x: -w * 0.05, y: -h * 0.02 },
    { x: w * 0.25, y: h * 0.01 },
    { x: w * 0.12, y: h * 0.17 },
    { x: -w * 0.16, y: h * 0.14 }
  ], dark, 'rgba(255,255,255,.16)', '#080713');

  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.roundRect(-w * 0.02, -h * 0.31, w * 0.27, h * 0.09, h * 0.04);
  ctx.fill();
  ctx.fillStyle = '#1b1927';
  ctx.beginPath();
  ctx.roundRect(-w * 0.29, -h * 0.13, w * 0.3, h * 0.09, h * 0.04);
  ctx.fill();

  ctx.strokeStyle = dark;
  ctx.lineWidth = h * 0.065;
  ctx.beginPath();
  ctx.moveTo(w * 0.08, -h * 0.31);
  ctx.lineTo(-w * 0.14, -h * 0.37);
  ctx.stroke();
  ctx.lineWidth = h * 0.075;
  ctx.beginPath();
  ctx.moveTo(-w * 0.15, -h * 0.37);
  ctx.lineTo(-w * 0.28, -h * 0.35);
  ctx.stroke();
  ctx.fillStyle = '#f7fbff';
  ctx.beginPath();
  ctx.roundRect(w * 0.25, -h * 0.04, w * 0.18, h * 0.035, h * 0.018);
  ctx.roundRect(w * 0.2, h * 0.02, w * 0.19, h * 0.032, h * 0.016);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  ctx.fillRect(-w * 0.18, h * 0.03, w * 0.18, h * 0.03);
  ctx.restore();
}
function drawD16Vehicle(p, character) {
  const w = p.width;
  const h = p.height;
  const spin = p.animationTime * Math.max(0.4, Math.abs(p.vx) / 70);
  const metal = '#737d8e';
  const steel = '#cfd5e2';
  const dark = '#202738';
  ctx.save();
  ctx.translate(0, Math.sin(p.animationTime * 7) * Math.min(1, Math.abs(p.vx) / 280));
  ctx.shadowColor = 'rgba(207,213,226,.22)';
  ctx.shadowBlur = 12;
  drawOrionArmorPlate([
    { x: -w * 0.48, y: -h * 0.02 },
    { x: -w * 0.37, y: -h * 0.2 },
    { x: w * 0.34, y: -h * 0.2 },
    { x: w * 0.48, y: -h * 0.02 },
    { x: w * 0.42, y: h * 0.27 },
    { x: -w * 0.42, y: h * 0.27 }
  ], metal, 'rgba(232,239,255,.34)', '#303743');
  drawOrionArmorPlate([
    { x: -w * 0.18, y: -h * 0.39 },
    { x: w * 0.18, y: -h * 0.39 },
    { x: w * 0.26, y: -h * 0.22 },
    { x: -w * 0.26, y: -h * 0.22 }
  ], steel, 'rgba(255,255,255,.4)', '#424b59');
  ctx.fillStyle = '#384152';
  ctx.beginPath();
  ctx.roundRect(w * 0.08, -h * 0.34, w * 0.42, h * 0.1, h * 0.05);
  ctx.fill();
  ctx.fillStyle = '#ffb7b7';
  ctx.beginPath();
  ctx.arc(w * 0.52, -h * 0.29, h * 0.055, 0, Math.PI * 2);
  ctx.fill();
  drawOrionArmorPlate([
    { x: -w * 0.44, y: h * 0.1 },
    { x: w * 0.44, y: h * 0.1 },
    { x: w * 0.36, y: h * 0.34 },
    { x: -w * 0.36, y: h * 0.34 }
  ], dark, 'rgba(232,239,255,.22)', '#071226');
  for (const x of [-0.3, -0.1, 0.1, 0.3]) drawCyberWheel(w * x, h * 0.28, h * 0.13, steel, spin);
  ctx.fillStyle = 'rgba(255,255,255,.16)';
  ctx.fillRect(-w * 0.34, -h * 0.11, w * 0.24, h * 0.05);
  ctx.fillRect(w * 0.06, -h * 0.1, w * 0.24, h * 0.05);
  ctx.restore();
}

function drawPremiumRobotOverlay(p, character, visual) {
  const w = p.width;
  const h = p.height;
  const accent = character?.accent || '#9ae8ff';
  const primary = character?.color || '#ffffff';
  const attackPulse = visual?.attackT ? Math.sin(Math.min(1, visual.attackT) * Math.PI) : 0;
  const runPulse = Math.abs(visual?.runStep || 0) * (visual?.speed || 0);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.26 + attackPulse * 0.2;
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(1.4, w * 0.018);
  ctx.beginPath();
  ctx.roundRect(-w * 0.44, -h * 0.47, w * 0.88, h * 0.86, Math.max(10, w * 0.16));
  ctx.stroke();

  ctx.globalAlpha = 0.72;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(-w * 0.14, -h * 0.18, w * 0.28, h * 0.105, 5);
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-w * 0.1, -h * 0.155, w * 0.2, Math.max(2, h * 0.018));

  ctx.globalAlpha = 0.32 + runPulse * 0.04;
  ctx.strokeStyle = primary;
  ctx.lineWidth = Math.max(1.2, w * 0.014);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * w * 0.18, -h * 0.02);
    ctx.lineTo(side * w * 0.31, h * 0.22);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(side * w * 0.17, h * 0.22);
    ctx.lineTo(side * w * 0.26, h * 0.43);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(side * w * 0.31, -h * 0.3, Math.max(3, w * 0.045), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.45 + attackPulse * 0.35;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.ellipse(0, h * 0.5 - 6, w * 0.28, 3.5 + attackPulse * 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPremiumVehicleOverlay(p, character) {
  const w = p.width;
  const h = p.height;
  const accent = character?.accent || '#9ae8ff';
  const primary = character?.color || '#ffffff';
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.42;
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(1.6, h * 0.028);
  ctx.beginPath();
  ctx.roundRect(-w * 0.45, -h * 0.26, w * 0.9, h * 0.48, Math.max(10, h * 0.2));
  ctx.stroke();

  ctx.globalAlpha = 0.56;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(-w * 0.18, -h * 0.22, w * 0.34, h * 0.11, 4);
  ctx.fill();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = primary;
  ctx.fillRect(-w * 0.36, h * 0.04, w * 0.72, Math.max(2, h * 0.03));
  ctx.globalAlpha = 0.34;
  for (const x of [-0.32, 0.32]) {
    ctx.beginPath();
    ctx.arc(w * x, h * 0.27, h * 0.16, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function withRobotFinish(draw) {
  return (p, character, visual) => {
    draw(p, character, visual);
    drawPremiumRobotOverlay(p, character, visual);
  };
}

function withVehicleFinish(draw) {
  return (p, character) => {
    draw(p, character);
    drawPremiumVehicleOverlay(p, character);
  };
}

window.GameRigs = {
  usesCodeRobotRig,
  usesCodeVehicleRig,
  drawOrionRig: withRobotFinish(drawOrionRig),
  drawBeeRig: withRobotFinish(drawBeeRig),
  drawElitaRig: withRobotFinish(drawElitaRig),
  drawD16Rig: withRobotFinish(drawD16Rig),
  drawOrionVehicle: withVehicleFinish(drawOrionVehicle),
  drawBeeVehicle: withVehicleFinish(drawBeeVehicle),
  drawElitaVehicle: withVehicleFinish(drawElitaVehicle),
  drawD16Vehicle: withVehicleFinish(drawD16Vehicle)
};
})();
