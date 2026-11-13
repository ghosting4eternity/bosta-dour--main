import { getPlayerCharacterImage } from '../assets';
import { PALETTE } from '../palette';
import { type PerspectiveCamera, projectPoint } from '../perspective';
import type { PlayerAnimState, PlayerState } from '../types';

export interface PlayerVisualParams {
  z: number;
  vz: number;
  playerState: PlayerState;
  speedMult: number;
  scaleX: number;
  scaleY: number;
  invulnTimer: number;
  hitFlashTimer: number;
  isTitle: boolean;
}

export function resolvePlayerAnimState(params: PlayerVisualParams): PlayerAnimState {
  if (params.playerState === 'DEAD') return 'gameover';
  if (params.playerState === 'STUMBLE') {
    return params.speedMult > 0.72 ? 'recovering' : 'stumbling';
  }
  if (params.isTitle) return 'idle';
  if (params.z > 32) return 'jumping';
  if (params.z > 4 && params.vz < -160) return 'landing';
  return 'hopping';
}

export function drawPlayerSprite(
  ctx: CanvasRenderingContext2D,
  cam: PerspectiveCamera,
  relX: number,
  lanePos: number,
  params: PlayerVisualParams,
  timeSec: number
): void {
  const anim = resolvePlayerAnimState(params);
  const shadowPt = projectPoint(cam, relX, lanePos, 0);
  const bodyPt = projectPoint(cam, relX, lanePos, params.z);
  const sc = shadowPt.scale;

  // Dynamic ground contact shadow
  const shadowHeightScale = Math.max(0.32, 1 - params.z / 145);
  ctx.fillStyle = 'rgba(24, 24, 27, 0.36)';
  ctx.beginPath();
  ctx.ellipse(
    shadowPt.x,
    shadowPt.y + 4 * sc,
    28 * sc * shadowHeightScale,
    10.5 * sc * shadowHeightScale,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.save();
  if (params.invulnTimer > 0 && Math.floor(timeSec * 16) % 2 === 0) {
    ctx.globalAlpha = 0.55;
  }

  ctx.translate(bodyPt.x, bodyPt.y);
  ctx.scale(sc * 1.24 * params.scaleX, sc * 1.24 * params.scaleY);

  if (anim === 'gameover') {
    ctx.rotate(-0.56);
    ctx.translate(-8, 8);
  } else if (anim === 'stumbling') {
    ctx.rotate(Math.sin(timeSec * 25) * 0.22);
  } else if (anim === 'recovering') {
    ctx.rotate(Math.sin(timeSec * 16) * 0.09);
  } else if (anim === 'jumping') {
    ctx.rotate(Math.sin(timeSec * 8) * 0.04);
  }

  const isFlash = params.hitFlashTimer > 0;
  const spriteImg = getPlayerCharacterImage();
  if (spriteImg) {
    // Crop the bottom 4.5% static shadow ellipse baked into the source PNG so dynamic road shadow leads
    const srcW = spriteImg.naturalWidth;
    const srcH = Math.round(spriteImg.naturalHeight * 0.955);
    const drawH = 98;
    const drawW = drawH * (srcW / srcH);
    if (isFlash && 'filter' in ctx) {
      ctx.filter = 'brightness(2.1) saturate(0.35)';
    }
    ctx.drawImage(spriteImg, 0, 0, srcW, srcH, -drawW * 0.5, 10 - drawH, drawW, drawH);
    ctx.restore();
    return;
  }

  const sackColor = isFlash ? PALETTE.chalkWhite : PALETTE.juteSack;

  // Subtle peeking sneakers at jump apex or landing
  if (anim === 'jumping' || anim === 'landing') {
    ctx.fillStyle = PALETTE.chalkWhite;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2;
    for (const fx of [-8, 8]) {
      ctx.beginPath();
      ctx.ellipse(fx, 8, 5.5, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // Woven jute sack body (পাটের বস্তা) with natural fold silhouette
  ctx.fillStyle = sackColor;
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(-21, -35);
  ctx.quadraticCurveTo(-26, -15, -22, 0);
  ctx.quadraticCurveTo(-18, 9, 0, 10);
  ctx.quadraticCurveTo(18, 9, 22, 0);
  ctx.quadraticCurveTo(26, -15, 21, -35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (!isFlash) {
    // Right-side warm jute shading
    ctx.fillStyle = PALETTE.juteShadow;
    ctx.beginPath();
    ctx.moveTo(4, -33);
    ctx.quadraticCurveTo(22, -12, 18, 2);
    ctx.quadraticCurveTo(8, 8, -1, 7);
    ctx.quadraticCurveTo(9, -10, 4, -33);
    ctx.closePath();
    ctx.fill();

    // Woven burlap cross-hatch fibers & vertical side seam stitches
    ctx.strokeStyle = 'rgba(66, 40, 18, 0.24)';
    ctx.lineWidth = 1.3;
    for (const wx of [-11, -3, 5, 12]) {
      ctx.beginPath();
      ctx.moveTo(wx, -24);
      ctx.quadraticCurveTo(wx * 1.08, -9, wx * 0.85, 5);
      ctx.stroke();
    }
    for (const wy of [-18, -9, 0]) {
      ctx.beginPath();
      ctx.moveTo(-16, wy);
      ctx.quadraticCurveTo(0, wy + 3, 16, wy);
      ctx.stroke();
    }

    // Folded sack rim cuff + green/gold rope tie
    ctx.fillStyle = '#D5A76E';
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -33, 21.5, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = PALETTE.emeraldGreen;
    ctx.lineWidth = 3.8;
    ctx.beginPath();
    ctx.moveTo(-19, -29);
    ctx.quadraticCurveTo(0, -23, 19, -29);
    ctx.stroke();
  }

  // Runner jersey (crimson with Bangladesh emerald & marigold shoulder stripe)
  ctx.fillStyle = isFlash ? PALETTE.chalkWhite : PALETTE.rickshawCrimson;
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-14, -34);
  ctx.lineTo(14, -34);
  ctx.lineTo(18, -56);
  ctx.lineTo(-18, -56);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (!isFlash) {
    ctx.fillStyle = PALETTE.emeraldGreen;
    ctx.beginPath();
    ctx.moveTo(-16, -54);
    ctx.lineTo(16, -54);
    ctx.lineTo(15, -47);
    ctx.lineTo(-15, -47);
    ctx.closePath();
    ctx.fill();

    // Jersey back number / bounce stripe
    ctx.fillStyle = PALETTE.marigoldGold;
    ctx.fillRect(-3.5, -45, 7, 8);
  }

  // Balancing arms animated per state
  let armYOffset = 0;
  let armSpread = 25;
  if (anim === 'jumping') {
    armYOffset = -14;
    armSpread = 28;
  } else if (anim === 'landing') {
    armYOffset = 6;
    armSpread = 26;
  } else if (anim === 'stumbling') {
    armYOffset = Math.sin(timeSec * 24) * 10;
    armSpread = 30;
  } else if (anim === 'recovering') {
    armYOffset = -6 + Math.sin(timeSec * 14) * 4;
  } else if (anim === 'idle') {
    armYOffset = Math.sin(timeSec * 3.5) * 2.5;
  } else {
    armYOffset = params.z > 10 ? -8 : 3;
  }

  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 5.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-16, -50);
  ctx.lineTo(-armSpread, -36 + armYOffset);
  ctx.moveTo(16, -50);
  ctx.lineTo(armSpread, -36 + (anim === 'stumbling' ? -armYOffset : armYOffset));
  ctx.stroke();

  // Head + dark hair + fluttering headband
  ctx.fillStyle = isFlash ? PALETTE.chalkWhite : '#D99B66';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, -69, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = PALETTE.ink;
  ctx.beginPath();
  ctx.arc(0, -71, 13.6, Math.PI * 0.86, Math.PI * 2.14);
  ctx.fill();

  // Headband + trailing ribbon tails
  const ribbonWave = Math.sin(timeSec * (anim === 'idle' ? 3 : 11)) * 3;
  ctx.fillStyle = PALETTE.emeraldGreen;
  ctx.fillRect(-13, -73, 26, 5.5);
  ctx.strokeRect(-13, -73, 26, 5.5);

  ctx.strokeStyle = PALETTE.rickshawCrimson;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(12, -70);
  ctx.quadraticCurveTo(19, -70 + ribbonWave, 23, -65 + ribbonWave);
  ctx.stroke();

  ctx.restore();
}
