import { PALETTE } from '../palette';
import { type PerspectiveCamera, mixHexColor, projectPoint } from '../perspective';
import type { MapId, ObstacleEntity } from '../types';

function drawPoly(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
  fill: string,
  stroke?: string,
  lineWidth = 2
): void {
  if (pts.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

export function drawTrafficVehicle(
  ctx: CanvasRenderingContext2D,
  cam: PerspectiveCamera,
  obs: ObstacleEntity,
  relX: number,
  mapId: MapId,
  fogColor: string,
  fogMix: number,
  alpha: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;

  if (obs.kind === 'BUS') {
    drawBangladeshiBus(ctx, cam, obs, relX, mapId, fogColor, fogMix);
  } else if (obs.kind === 'TRUCK') {
    drawBangladeshiTruck(ctx, cam, obs, relX, fogColor, fogMix);
  } else if (obs.kind === 'CNG_TRAFFIC') {
    drawTrafficCng(ctx, cam, obs, relX, fogColor, fogMix);
  } else if (obs.kind === 'CAR') {
    drawTrafficCar(ctx, cam, obs, relX, fogColor, fogMix);
  } else if (obs.kind === 'MOTORCYCLE') {
    drawTrafficMotorcycle(ctx, cam, obs, relX, fogColor, fogMix);
  }

  ctx.restore();
}

function drawBangladeshiBus(
  ctx: CanvasRenderingContext2D,
  cam: PerspectiveCamera,
  obs: ObstacleEntity,
  relX: number,
  mapId: MapId,
  fogColor: string,
  fogMix: number
): void {
  const frontRelX = Math.max(0.35, relX - 0.65);
  const backRelX = Math.max(0.45, relX + 0.85);
  const halfW = 0.42;
  const busH = 104;

  const bFL = projectPoint(cam, frontRelX, obs.lane - halfW, 0);
  const bFR = projectPoint(cam, frontRelX, obs.lane + halfW, 0);
  const bBL = projectPoint(cam, backRelX, obs.lane - halfW, 0);
  const bBR = projectPoint(cam, backRelX, obs.lane + halfW, 0);

  const tFL = projectPoint(cam, frontRelX, obs.lane - halfW, busH);
  const tFR = projectPoint(cam, frontRelX, obs.lane + halfW, busH);
  const tBL = projectPoint(cam, backRelX, obs.lane - halfW, busH);
  const tBR = projectPoint(cam, backRelX, obs.lane + halfW, busH);

  const fsc = bFL.scale;
  const lw = Math.max(1, 2.2 * fsc);
  const ink = mixHexColor(PALETTE.ink, fogColor, fogMix);

  // Shadow + tires
  drawPoly(ctx, [bFL, bFR, bBR, bBL], 'rgba(24, 24, 27, 0.35)');
  for (const ty of [-halfW * 0.78, halfW * 0.78]) {
    const tire = projectPoint(cam, frontRelX, obs.lane + ty, 6);
    ctx.fillStyle = ink;
    ctx.fillRect(tire.x - 6 * fsc, tire.y - 6 * fsc, 12 * fsc, 10 * fsc);
  }

  // Visible side wall with green/cream Dhaka BRTC stripe & passenger windows
  const sideCol = mixHexColor('#991B1B', fogColor, fogMix);
  const frontCol = mixHexColor(PALETTE.rickshawCrimson, fogColor, fogMix);
  const greenBand = mixHexColor(PALETTE.emeraldGreen, fogColor, fogMix);
  const goldBand = mixHexColor(PALETTE.marigoldGold, fogColor, fogMix);

  if (obs.lane <= 0) {
    drawPoly(ctx, [bFR, bBR, tBR, tFR], sideCol, ink, lw);
  } else {
    drawPoly(ctx, [bFL, bBL, tBL, tFL], sideCol, ink, lw);
  }

  // Roof + luggage carrier rails
  drawPoly(ctx, [tFL, tFR, tBR, tBL], mixHexColor(PALETTE.chalkWhite, fogColor, fogMix), ink, lw);

  // Front body
  drawPoly(ctx, [bFL, bFR, tFR, tFL], frontCol, ink, lw);

  // Emerald & marigold lower body livery stripes
  const gFL = projectPoint(cam, frontRelX, obs.lane - halfW, 24);
  const gFR = projectPoint(cam, frontRelX, obs.lane + halfW, 24);
  const gTL = projectPoint(cam, frontRelX, obs.lane - halfW, 40);
  const gTR = projectPoint(cam, frontRelX, obs.lane + halfW, 40);
  drawPoly(ctx, [gFL, gFR, gTR, gTL], greenBand, ink, lw * 0.7);

  const mFL = projectPoint(cam, frontRelX, obs.lane - halfW, 20);
  const mFR = projectPoint(cam, frontRelX, obs.lane + halfW, 20);
  drawPoly(ctx, [mFL, mFR, gFR, gFL], goldBand, ink, lw * 0.6);

  // Split panoramic bus windshield + wipers
  const wBL = projectPoint(cam, frontRelX, obs.lane - halfW * 0.84, 44);
  const wBR = projectPoint(cam, frontRelX, obs.lane + halfW * 0.84, 44);
  const wTL = projectPoint(cam, frontRelX, obs.lane - halfW * 0.84, 80);
  const wTR = projectPoint(cam, frontRelX, obs.lane + halfW * 0.84, 80);
  drawPoly(ctx, [wBL, wBR, wTR, wTL], mixHexColor('#CBE8F8', fogColor, fogMix * 0.7), ink, lw * 0.8);

  // Center windshield mullion
  ctx.strokeStyle = ink;
  ctx.lineWidth = lw * 0.8;
  ctx.beginPath();
  ctx.moveTo((wBL.x + wBR.x) * 0.5, wBL.y);
  ctx.lineTo((wTL.x + wTR.x) * 0.5, wTL.y);
  ctx.stroke();

  // Twin headlights & grille
  const grL = projectPoint(cam, frontRelX, obs.lane - 0.16, 10);
  const grR = projectPoint(cam, frontRelX, obs.lane + 0.16, 18);
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(grL.x, grR.y, grR.x - grL.x, grL.y - grR.y);

  for (const hy of [-0.28, 0.28]) {
    const hl = projectPoint(cam, frontRelX, obs.lane + hy, 14);
    ctx.fillStyle = PALETTE.marigoldGold;
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw * 0.7;
    ctx.beginPath();
    ctx.arc(hl.x, hl.y, Math.max(2, 5.5 * fsc), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Bengali destination marquee
  if (fsc > 0.26) {
    const signPt = projectPoint(cam, frontRelX, obs.lane, 91);
    const label =
      mapId === 'chattogram' ? 'চট্টগ্রাম' : mapId === 'sylhet' ? 'সিলেট বাস' : 'ঢাকা বাস';
    const sw = 54 * fsc;
    const sh = 15 * fsc;
    ctx.fillStyle = mixHexColor(PALETTE.peacockTeal, fogColor, fogMix);
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw * 0.6;
    ctx.fillRect(signPt.x - sw * 0.5, signPt.y - sh * 0.5, sw, sh);
    ctx.strokeRect(signPt.x - sw * 0.5, signPt.y - sh * 0.5, sw, sh);
    ctx.fillStyle = PALETTE.chalkWhite;
    ctx.font = `700 ${Math.max(7, Math.round(10 * fsc))}px "Shahid Tahmid Tamim", "Noto Sans Bengali", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, signPt.x, signPt.y + 0.5);
  }
}

function drawBangladeshiTruck(
  ctx: CanvasRenderingContext2D,
  cam: PerspectiveCamera,
  obs: ObstacleEntity,
  relX: number,
  fogColor: string,
  fogMix: number
): void {
  // Traditional colorful Bangladeshi cargo truck (মায়ের দোয়া)
  const frontRelX = Math.max(0.35, relX - 0.58);
  const backRelX = Math.max(0.45, relX + 0.8);
  const halfW = 0.4;
  const cabH = 74;
  const cargoH = 102;

  const bFL = projectPoint(cam, frontRelX, obs.lane - halfW, 0);
  const bFR = projectPoint(cam, frontRelX, obs.lane + halfW, 0);
  const bBL = projectPoint(cam, backRelX, obs.lane - halfW, 0);
  const bBR = projectPoint(cam, backRelX, obs.lane + halfW, 0);

  const cFL = projectPoint(cam, frontRelX, obs.lane - halfW, cabH);
  const cFR = projectPoint(cam, frontRelX, obs.lane + halfW, cabH);
  const tBL = projectPoint(cam, backRelX, obs.lane - halfW, cargoH);
  const tBR = projectPoint(cam, backRelX, obs.lane + halfW, cargoH);
  const tML = projectPoint(cam, frontRelX + 0.35, obs.lane - halfW, cargoH);
  const tMR = projectPoint(cam, frontRelX + 0.35, obs.lane + halfW, cargoH);

  const fsc = bFL.scale;
  const lw = Math.max(1, 2.2 * fsc);
  const ink = mixHexColor(PALETTE.ink, fogColor, fogMix);

  drawPoly(ctx, [bFL, bFR, bBR, bBL], 'rgba(24, 24, 27, 0.35)');

  // High painted wooden cargo bed peeking behind the cab
  const bedCol = mixHexColor('#1D4ED8', fogColor, fogMix);
  drawPoly(ctx, [cFL, cFR, tMR, tML], bedCol, ink, lw);
  if (obs.lane <= 0) {
    drawPoly(ctx, [bFR, bBR, tBR, cFR], mixHexColor('#B45309', fogColor, fogMix), ink, lw);
  } else {
    drawPoly(ctx, [bFL, bBL, tBL, cFL], mixHexColor('#B45309', fogColor, fogMix), ink, lw);
  }

  // Painted marigold & crimson truck nose cab
  drawPoly(ctx, [bFL, bFR, cFR, cFL], mixHexColor(PALETTE.marigoldGold, fogColor, fogMix), ink, lw);

  const hoodL = projectPoint(cam, frontRelX, obs.lane - halfW * 0.9, 34);
  const hoodR = projectPoint(cam, frontRelX, obs.lane + halfW * 0.9, 34);
  drawPoly(ctx, [bFL, bFR, hoodR, hoodL], mixHexColor(PALETTE.rickshawCrimson, fogColor, fogMix), ink, lw * 0.8);

  // Windshield
  const wBL = projectPoint(cam, frontRelX, obs.lane - halfW * 0.78, 38);
  const wBR = projectPoint(cam, frontRelX, obs.lane + halfW * 0.78, 38);
  const wTL = projectPoint(cam, frontRelX, obs.lane - halfW * 0.78, 66);
  const wTR = projectPoint(cam, frontRelX, obs.lane + halfW * 0.78, 66);
  drawPoly(ctx, [wBL, wBR, wTR, wTL], '#DDF3FF', ink, lw * 0.8);

  // Decorative folk-art diamonds & headlights
  for (const hy of [-0.26, 0.26]) {
    const hl = projectPoint(cam, frontRelX, obs.lane + hy, 14);
    ctx.fillStyle = '#FEF08A';
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw * 0.7;
    ctx.beginPath();
    ctx.arc(hl.x, hl.y, Math.max(2, 5 * fsc), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  if (fsc > 0.28) {
    const bannerPt = projectPoint(cam, frontRelX + 0.15, obs.lane, 88);
    ctx.fillStyle = PALETTE.chalkWhite;
    ctx.font = `700 ${Math.max(7, Math.round(10 * fsc))}px "Shahid Tahmid Tamim", "Noto Sans Bengali", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('মায়ের দোয়া', bannerPt.x, bannerPt.y);
  }
}

function drawTrafficCng(
  ctx: CanvasRenderingContext2D,
  cam: PerspectiveCamera,
  obs: ObstacleEntity,
  relX: number,
  fogColor: string,
  fogMix: number
): void {
  const frontRelX = Math.max(0.35, relX - 0.35);
  const pt = projectPoint(cam, frontRelX, obs.lane, 0);
  const sc = pt.scale * 1.15;
  const lw = Math.max(1, 2 * sc);
  const ink = mixHexColor(PALETTE.ink, fogColor, fogMix);
  const greenBody = mixHexColor(PALETTE.emeraldGreen, fogColor, fogMix);

  // Shadow
  ctx.fillStyle = 'rgba(24, 24, 27, 0.3)';
  ctx.beginPath();
  ctx.ellipse(pt.x, pt.y + 2 * sc, 24 * sc, 8 * sc, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(pt.x, pt.y);

  // 3 wheels (2 rear + 1 front)
  ctx.fillStyle = ink;
  for (const wx of [-17 * sc, 17 * sc, 0]) {
    ctx.beginPath();
    ctx.ellipse(wx, wx === 0 ? -2 * sc : -5 * sc, 5 * sc, 7 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tapered green CNG canopy & body
  drawPoly(
    ctx,
    [
      { x: -24 * sc, y: -8 * sc },
      { x: 24 * sc, y: -8 * sc },
      { x: 20 * sc, y: -56 * sc },
      { x: 0, y: -62 * sc },
      { x: -20 * sc, y: -56 * sc },
    ],
    greenBody,
    ink,
    lw
  );

  // Yellow CNG strip + curved front windshield
  ctx.fillStyle = mixHexColor(PALETTE.marigoldGold, fogColor, fogMix);
  ctx.fillRect(-21 * sc, -24 * sc, 42 * sc, 7 * sc);
  ctx.strokeRect(-21 * sc, -24 * sc, 42 * sc, 7 * sc);

  ctx.fillStyle = '#D9F1FC';
  ctx.fillRect(-14 * sc, -48 * sc, 28 * sc, 18 * sc);
  ctx.strokeRect(-14 * sc, -48 * sc, 28 * sc, 18 * sc);

  // Single bright front headlight
  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.arc(0, -14 * sc, 4.2 * sc, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawTrafficCar(
  ctx: CanvasRenderingContext2D,
  cam: PerspectiveCamera,
  obs: ObstacleEntity,
  relX: number,
  fogColor: string,
  fogMix: number
): void {
  const frontRelX = Math.max(0.35, relX - 0.45);
  const backRelX = Math.max(0.45, relX + 0.55);
  const halfW = 0.34;
  const bFL = projectPoint(cam, frontRelX, obs.lane - halfW, 0);
  const bFR = projectPoint(cam, frontRelX, obs.lane + halfW, 0);
  const tFL = projectPoint(cam, frontRelX, obs.lane - halfW * 0.88, 36);
  const tFR = projectPoint(cam, frontRelX, obs.lane + halfW * 0.88, 36);
  const rTL = projectPoint(cam, backRelX, obs.lane - halfW * 0.72, 62);
  const rTR = projectPoint(cam, backRelX, obs.lane + halfW * 0.72, 62);

  const sc = bFL.scale;
  const lw = Math.max(1, 2 * sc);
  const ink = mixHexColor(PALETTE.ink, fogColor, fogMix);
  const carColors = ['#F1F5F9', '#CBD5E1', '#60A5FA', '#E2E8F0'];
  const bodyCol = mixHexColor(carColors[(obs.variant ?? 0) % carColors.length], fogColor, fogMix);

  // Shadow & tires
  ctx.fillStyle = 'rgba(24, 24, 27, 0.3)';
  ctx.beginPath();
  ctx.ellipse((bFL.x + bFR.x) * 0.5, bFL.y + 2 * sc, 30 * sc, 9 * sc, 0, 0, Math.PI * 2);
  ctx.fill();

  drawPoly(ctx, [bFL, bFR, tFR, tFL], bodyCol, ink, lw);
  drawPoly(ctx, [tFL, tFR, rTR, rTL], '#334155', ink, lw * 0.85);

  for (const hy of [-0.22, 0.22]) {
    const hl = projectPoint(cam, frontRelX, obs.lane + hy, 18);
    ctx.fillStyle = '#FEF9C3';
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw * 0.7;
    ctx.beginPath();
    ctx.ellipse(hl.x, hl.y, 5 * sc, 3.2 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawTrafficMotorcycle(
  ctx: CanvasRenderingContext2D,
  cam: PerspectiveCamera,
  obs: ObstacleEntity,
  relX: number,
  fogColor: string,
  fogMix: number
): void {
  const pt = projectPoint(cam, Math.max(0.35, relX - 0.25), obs.lane, 0);
  const sc = pt.scale * 1.15;
  const lw = Math.max(1, 2 * sc);
  const ink = mixHexColor(PALETTE.ink, fogColor, fogMix);

  ctx.fillStyle = 'rgba(24, 24, 27, 0.3)';
  ctx.beginPath();
  ctx.ellipse(pt.x, pt.y + 2 * sc, 13 * sc, 5 * sc, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(pt.x, pt.y);

  // Front tire
  ctx.fillStyle = ink;
  ctx.fillRect(-4 * sc, -18 * sc, 8 * sc, 18 * sc);

  // Crimson fuel tank & handlebars
  drawPoly(
    ctx,
    [
      { x: -10 * sc, y: -26 * sc },
      { x: 10 * sc, y: -26 * sc },
      { x: 13 * sc, y: -38 * sc },
      { x: -13 * sc, y: -38 * sc },
    ],
    mixHexColor(PALETTE.rickshawCrimson, fogColor, fogMix),
    ink,
    lw
  );

  // Handlebars
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1.5, 3 * sc);
  ctx.beginPath();
  ctx.moveTo(-16 * sc, -42 * sc);
  ctx.lineTo(16 * sc, -42 * sc);
  ctx.stroke();

  // Headlight
  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.arc(0, -32 * sc, 4.5 * sc, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Helmeted rider
  ctx.fillStyle = mixHexColor('#1E293B', fogColor, fogMix);
  ctx.fillRect(-11 * sc, -58 * sc, 22 * sc, 18 * sc);
  ctx.fillStyle = mixHexColor(PALETTE.marigoldGold, fogColor, fogMix);
  ctx.beginPath();
  ctx.arc(0, -68 * sc, 10 * sc, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

export function drawSidewalkRickshaw(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  fogColor: string,
  fogMix: number
): void {
  const sc = scale * 1.45;
  const lw = Math.max(1, 1.7 * sc);
  const ink = mixHexColor(PALETTE.ink, fogColor, fogMix);
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = ink;
  for (const wx of [-15 * sc, 15 * sc]) {
    ctx.beginPath();
    ctx.arc(wx, -9 * sc, 9.5 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = mixHexColor('#CBD5E1', fogColor, fogMix);
    ctx.beginPath();
    ctx.arc(wx, -9 * sc, 3.5 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ink;
  }

  drawPoly(
    ctx,
    [
      { x: -19 * sc, y: -14 * sc },
      { x: 19 * sc, y: -14 * sc },
      { x: 16 * sc, y: -46 * sc },
      { x: -16 * sc, y: -46 * sc },
    ],
    mixHexColor(PALETTE.rickshawCrimson, fogColor, fogMix),
    ink,
    lw
  );
  drawPoly(
    ctx,
    [
      { x: -17 * sc, y: -29 * sc },
      { x: 17 * sc, y: -29 * sc },
      { x: 16 * sc, y: -46 * sc },
      { x: -16 * sc, y: -46 * sc },
    ],
    mixHexColor(PALETTE.marigoldGold, fogColor, fogMix),
    ink,
    lw
  );
  drawPoly(
    ctx,
    [
      { x: 0, y: -26 * sc },
      { x: 6 * sc, y: -21 * sc },
      { x: 0, y: -16 * sc },
      { x: -6 * sc, y: -21 * sc },
    ],
    mixHexColor(PALETTE.peacockTeal, fogColor, fogMix),
    ink,
    lw * 0.7
  );
  ctx.restore();
}

export function drawSidewalkCng(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  fogColor: string,
  fogMix: number
): void {
  const sc = scale * 1.45;
  const lw = Math.max(1, 1.7 * sc);
  const ink = mixHexColor(PALETTE.ink, fogColor, fogMix);
  ctx.save();
  ctx.translate(x, y);
  drawPoly(
    ctx,
    [
      { x: -23 * sc, y: -4 * sc },
      { x: 23 * sc, y: -4 * sc },
      { x: 19 * sc, y: -44 * sc },
      { x: -19 * sc, y: -44 * sc },
    ],
    mixHexColor(PALETTE.emeraldGreen, fogColor, fogMix),
    ink,
    lw
  );
  ctx.fillStyle = mixHexColor('#CBE7F5', fogColor, fogMix);
  ctx.fillRect(-13 * sc, -38 * sc, 26 * sc, 13 * sc);
  ctx.strokeStyle = ink;
  ctx.lineWidth = lw;
  ctx.strokeRect(-13 * sc, -38 * sc, 26 * sc, 13 * sc);
  ctx.fillStyle = mixHexColor(PALETTE.marigoldGold, fogColor, fogMix);
  ctx.fillRect(-21 * sc, -18 * sc, 42 * sc, 6 * sc);
  ctx.restore();
}
