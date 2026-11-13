import { PALETTE } from '../palette';
import { type PerspectiveCamera, projectPoint } from '../perspective';
import type { CoinEntity } from '../types';

/**
 * Original BOUNCE BACK collectible renderers for all 4 coin types:
 * 1. GENERAL (marigold alpona lotus medallion)
 * 2. HISTORICAL (crimson & heritage-brass octagonal landmark crest)
 * 3. DOUBLE_2X (cobalt & electric-gold "2X" multiplier shield)
 * 4. MAGNET (crimson & silver horseshoe magnet emblem)
 */
export function drawBounceCoin(
  ctx: CanvasRenderingContext2D,
  cam: PerspectiveCamera,
  coin: CoinEntity,
  relX: number,
  timeSec: number,
  alpha = 1
): void {
  const latY = coin.lanePos ?? coin.lane;
  const bob = Math.sin(timeSec * (coin.kind === 'GENERAL' ? 5 : 4.2) + coin.groundX * 1.4) * 4.5;
  const shadow = projectPoint(cam, relX, latY, 0);
  const center = projectPoint(cam, relX, latY, coin.z + 19 + bob);
  const sc = center.scale;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Ground contact shadow
  ctx.fillStyle = 'rgba(24, 24, 27, 0.28)';
  ctx.beginPath();
  ctx.ellipse(shadow.x, shadow.y, 14 * sc, 5 * sc, 0, 0, Math.PI * 2);
  ctx.fill();

  if (coin.kind === 'HISTORICAL') {
    drawHistoricalCoin(ctx, center.x, center.y, sc, coin.groundX, timeSec);
    ctx.restore();
    return;
  }

  if (coin.kind === 'DOUBLE_2X') {
    drawDouble2XCoin(ctx, center.x, center.y, sc, timeSec);
    ctx.restore();
    return;
  }

  if (coin.kind === 'MAGNET') {
    drawMagnetCoin(ctx, center.x, center.y, sc, timeSec);
    ctx.restore();
    return;
  }

  // GENERAL COIN — Warm marigold medallion with alpona lotus diamond motif
  const spinCos = Math.cos(timeSec * 4.2 + coin.groundX * 0.9);
  const spinW = Math.max(4 * sc, Math.abs(spinCos) * 14.5 * sc);
  const radiusY = 14.5 * sc;
  const lw = Math.max(1, 2.2 * sc);

  ctx.fillStyle = PALETTE.marigoldGold;
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.ellipse(center.x, center.y, spinW, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (spinW > 7 * sc) {
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = Math.max(0.8, 1.4 * sc);
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, spinW * 0.72, radiusY * 0.72, 0, 0, Math.PI * 2);
    ctx.stroke();

    const petalX = spinW * 0.38;
    const petalY = radiusY * 0.38;
    ctx.fillStyle = PALETTE.emeraldGreen;
    ctx.beginPath();
    ctx.moveTo(center.x, center.y - petalY);
    ctx.lineTo(center.x + petalX, center.y);
    ctx.lineTo(center.x, center.y + petalY);
    ctx.lineTo(center.x - petalX, center.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = PALETTE.chalkWhite;
    ctx.beginPath();
    ctx.ellipse(
      center.x - spinW * 0.28,
      center.y - radiusY * 0.28,
      2 * sc,
      3.8 * sc,
      -0.3,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.restore();
}

function drawHistoricalCoin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sc: number,
  seedX: number,
  timeSec: number
): void {
  const pulse = 1 + Math.sin(timeSec * 5 + seedX) * 0.08;
  const r = 19 * sc * pulse;
  const lw = Math.max(1.2, 2.3 * sc);

  // Subtle heritage aura ring
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
  ctx.lineWidth = Math.max(1.2, 3 * sc);
  ctx.beginPath();
  ctx.arc(x, y, r * 1.24, 0, Math.PI * 2);
  ctx.stroke();

  // Octagonal heritage brass-gold medallion
  ctx.fillStyle = '#F59E0B';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = lw;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const ang = (Math.PI / 4) * i + Math.PI / 8;
    const px = x + Math.cos(ang) * r;
    const py = y + Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner terracotta-crimson seal
  ctx.fillStyle = '#B91C1C';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.68, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 4-point Mughal heritage star emblem
  ctx.fillStyle = PALETTE.chalkWhite;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const sr = i % 2 === 0 ? r * 0.44 : r * 0.18;
    const ang = (Math.PI / 4) * i - Math.PI / 2;
    const px = x + Math.cos(ang) * sr;
    const py = y + Math.sin(ang) * sr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawDouble2XCoin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sc: number,
  timeSec: number
): void {
  const r = 17.5 * sc;
  const lw = Math.max(1.2, 2.3 * sc);
  const orbitAng = timeSec * 4.5;

  // Cobalt diamond-rimmed circular token
  ctx.fillStyle = '#1D4ED8';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = PALETTE.marigoldGold;
  ctx.lineWidth = Math.max(1.2, 2.4 * sc);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.78, 0, Math.PI * 2);
  ctx.stroke();

  // Orbiting gold spark
  ctx.fillStyle = PALETTE.marigoldGold;
  ctx.beginPath();
  ctx.arc(x + Math.cos(orbitAng) * r * 1.15, y + Math.sin(orbitAng) * r * 1.15, 3.2 * sc, 0, Math.PI * 2);
  ctx.fill();

  // Bold static "2X" emblem inside token
  if (sc > 0.24) {
    ctx.fillStyle = PALETTE.chalkWhite;
    ctx.font = `900 ${Math.max(8, Math.round(14 * sc))}px "Bricolage Grotesque", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('2X', x, y + 0.5 * sc);
  }
}

function drawMagnetCoin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sc: number,
  timeSec: number
): void {
  const r = 17.5 * sc;
  const lw = Math.max(1.2, 2.2 * sc);

  // Dark slate & emerald power token backing
  ctx.fillStyle = '#0F172A';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Pulsing magnetic field wave
  const wave = 1 + (Math.sin(timeSec * 6) * 0.12 + 0.12);
  ctx.strokeStyle = 'rgba(20, 184, 166, 0.75)';
  ctx.lineWidth = Math.max(1, 2 * sc);
  ctx.beginPath();
  ctx.arc(x, y, r * 1.15 * wave, 0, Math.PI * 2);
  ctx.stroke();

  // Horseshoe magnet U-shape in crimson + silver pole tips
  const uR = r * 0.46;
  ctx.strokeStyle = PALETTE.rickshawCrimson;
  ctx.lineWidth = Math.max(2.5, 5.2 * sc);
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.arc(x, y + 1 * sc, uR, 0, Math.PI, false);
  ctx.moveTo(x - uR, y + 1 * sc);
  ctx.lineTo(x - uR, y - uR * 0.9);
  ctx.moveTo(x + uR, y + 1 * sc);
  ctx.lineTo(x + uR, y - uR * 0.9);
  ctx.stroke();

  ctx.fillStyle = '#E2E8F0';
  const tipW = Math.max(2.5, 5.4 * sc);
  const tipH = Math.max(2, 4.2 * sc);
  ctx.fillRect(x - uR - tipW * 0.5, y - uR * 1.15, tipW, tipH);
  ctx.fillRect(x + uR - tipW * 0.5, y - uR * 1.15, tipW, tipH);
}
