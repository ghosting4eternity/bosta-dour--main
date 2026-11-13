import { BostaEngine } from './engine';
import { PALETTE } from './palette';
import {
  PLAYER_CAM_OFFSET_X,
  type PerspectiveCamera,
  computeDepthVisibility,
  createPerspectiveCamera,
  mixHexColor,
  projectPoint,
} from './perspective';
import { BUILDING_DEPTH_X } from './shops';
import { getBakedSignboardTexture, getBakedTeaStallTexture } from './signboardCache';
import { drawBounceCoin } from './sprites/coinSprite';
import { drawPlayerSprite } from './sprites/playerSprite';
import { drawBangladeshiTree } from './sprites/treeSprites';
import {
  drawSidewalkCng,
  drawSidewalkRickshaw,
  drawTrafficVehicle,
} from './sprites/vehicles';
import type {
  DistrictSegmentDef,
  LandmarkEntity,
  MapId,
  ObstacleEntity,
  PropEntity,
} from './types';
import { getDistrictInfrastructureProfile, sampleEnvironmentAt } from './worldSegments';

interface DrawableItem {
  depthX: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
  fill: string,
  stroke?: string,
  lineWidth = 2
): void {
  if (pts.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
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

export function renderGame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  engine: BostaEngine,
  timeSec: number
): void {
  const map = engine.currentMap;
  const activeX = engine.phase === 'title' ? engine.titleScrollX : engine.playerX;
  const cameraX = activeX - PLAYER_CAM_OFFSET_X;
  const cameraLaneOffset = engine.phase === 'title' ? 0 : engine.lanePos;

  const env = sampleEnvironmentAt(map.id, activeX);

  // Subtle hillside horizon pitch for hilly regions (Chattogram GEC/Foy's Lake, Sylhet hills)
  const hillPitchPx = env.hillSlope * height * 0.035;

  const shakeMag = engine.trauma * engine.trauma * 15;
  const shakeX = shakeMag > 0.1 ? (Math.random() - 0.5) * 2 * shakeMag : 0;
  const shakeY = shakeMag > 0.1 ? (Math.random() - 0.5) * 2 * shakeMag : 0;

  const cam = createPerspectiveCamera(
    width,
    height,
    cameraLaneOffset,
    shakeX,
    shakeY,
    hillPitchPx
  );

  // 1. Sky & Regional Parallax Skyline
  drawSkyAndHorizon(
    ctx,
    cam,
    map.id,
    env.district.archTheme,
    env.skyTop,
    env.skyBottom,
    env.skylineColor,
    activeX
  );

  // 2. Roadside Terrain Base (smoothly blended by district)
  ctx.fillStyle = env.terrainColor;
  ctx.fillRect(0, cam.horizonY, width, height - cam.horizonY);

  // Smoothly blended water horizon for Sadarghat / Patenga / Surma Riverfront (zero hard vertical seam)
  if (env.district.archTheme === 'riverfront' || env.district.archTheme === 'coastal') {
    const waterTop = cam.horizonY;
    const waterHeight = (height - waterTop) * 0.28;
    const waterGrad = ctx.createLinearGradient(width * 0.46, waterTop, width * 0.72, waterTop + waterHeight);
    waterGrad.addColorStop(0, toRgba(env.terrainColor, 0));
    waterGrad.addColorStop(0.45, toRgba('#7EB3C6', 0.65));
    waterGrad.addColorStop(1, '#5B9BB2');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(width * 0.46, waterTop, width * 0.54, waterHeight);
  }

  // 3. Perspective Road, Sidewalks, Curbs & Lane Markings
  const nearTile = Math.floor(cameraX) + 1;
  const farTile = Math.floor(activeX) + 32;
  const minX = Math.max(0.35, nearTile - 1 - cameraX);
  const maxX = Math.max(0.35, farTile + 1 - cameraX);
  const roadEdge = 1.5 * env.roadScale;
  const curbOuter = roadEdge + 0.16;
  const walkOuter = curbOuter + 1.25;

  // Continuous underlayer prevents any 1px anti-aliasing seams across tile slices
  drawQuadStrip(ctx, cam, minX, maxX, -walkOuter, -curbOuter, '#C7BFB1');
  drawQuadStrip(ctx, cam, minX, maxX, curbOuter, walkOuter, '#C7BFB1');

  // Dedicated roadside green planting strip along outer curb in landscaped/campus/tea/boulevard zones
  const isGreenVergeDistrict =
    env.district.archTheme === 'campus' ||
    env.district.archTheme === 'boulevard' ||
    env.district.archTheme === 'tea_valley' ||
    env.district.archTheme === 'hills';
  if (isGreenVergeDistrict) {
    drawQuadStrip(ctx, cam, minX, maxX, -curbOuter - 0.16, -curbOuter, mixHexColor(env.foliageColor, '#78716C', 0.35));
    drawQuadStrip(ctx, cam, minX, maxX, curbOuter, curbOuter + 0.16, mixHexColor(env.foliageColor, '#78716C', 0.35));
  }

  drawQuadStrip(ctx, cam, minX, maxX, -roadEdge, roadEdge, env.roadColor);

  for (let gx = farTile; gx >= nearTile - 1; gx--) {
    const x0 = Math.max(0.35, gx - cameraX);
    const x1 = Math.max(0.35, gx + 1 - cameraX);
    if (x1 <= x0) continue;

    const vis = computeDepthVisibility(x0, 'scenery');
    const isAlt = ((gx % 2) + 2) % 2 === 0;
    const roadFill = mixHexColor(isAlt ? env.roadColor : env.roadAltColor, env.fogColor, vis.fogMix * 0.85);
    const sidewalkFill = mixHexColor(isAlt ? '#CFC8BA' : '#C3BCAE', env.fogColor, vis.fogMix * 0.85);

    drawQuadStrip(ctx, cam, x0, x1, -walkOuter, -curbOuter, sidewalkFill, 'rgba(24,24,27,0.14)', 1);
    drawQuadStrip(ctx, cam, x0, x1, curbOuter, walkOuter, sidewalkFill, 'rgba(24,24,27,0.14)', 1);

    const curbCol = mixHexColor(env.curbColor, env.fogColor, vis.fogMix * 0.8);
    const whiteCurb = mixHexColor(PALETTE.chalkWhite, env.fogColor, vis.fogMix * 0.8);
    const curbL = isAlt ? curbCol : whiteCurb;
    const curbR = isAlt ? whiteCurb : curbCol;
    const curbStroke = mixHexColor(PALETTE.ink, env.fogColor, vis.fogMix * 0.8);
    drawQuadStrip(ctx, cam, x0, x1, -curbOuter, -roadEdge, curbL, curbStroke, 1);
    drawQuadStrip(ctx, cam, x0, x1, roadEdge, curbOuter, curbR, curbStroke, 1);

    drawQuadStrip(ctx, cam, x0, x1, -roadEdge, roadEdge, roadFill);

    // Subtle wheel-track wear inside the 3 lanes (-1, 0, +1)
    for (const laneCenter of [-1, 0, 1]) {
      drawQuadStrip(
        ctx,
        cam,
        x0,
        x1,
        laneCenter - 0.28,
        laneCenter + 0.28,
        isAlt ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.06)'
      );
    }

    // Outer white road edge stripes
    const lineAlpha = Math.max(0.08, 0.52 * (1 - vis.fogMix * 0.85));
    for (const edgeY of [-roadEdge + 0.05, roadEdge - 0.05]) {
      const a = projectPoint(cam, x0, edgeY, 0);
      const b = projectPoint(cam, x1, edgeY, 0);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `rgba(255, 253, 247, ${lineAlpha.toFixed(2)})`;
      ctx.lineWidth = Math.max(1, 2.3 * a.scale);
      ctx.stroke();
    }

    // Dashed lane dividers (-0.5, +0.5) — mechanically consistent across all widths
    if (isAlt) {
      const dx0 = Math.max(0.35, gx + 0.15 - cameraX);
      const dx1 = Math.max(0.35, gx + 0.78 - cameraX);
      if (dx1 > dx0) {
        const dashAlpha = Math.max(0.1, 0.78 * (1 - vis.fogMix * 0.8));
        for (const divY of [-0.5, 0.5]) {
          const a = projectPoint(cam, dx0, divY, 0);
          const b = projectPoint(cam, dx1, divY, 0);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(255, 253, 247, ${dashAlpha.toFixed(2)})`;
          ctx.lineWidth = Math.max(1.1, 3.4 * a.scale);
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      }
    }
  }

  // 4. Horizon Haze Band behind buildings & foreground (buildings must never be fogged)
  const fogBandTop = cam.horizonY - 14;
  const fogBandHeight = (height - cam.horizonY) * 0.2 + 16;
  const haze = ctx.createLinearGradient(0, fogBandTop, 0, fogBandTop + fogBandHeight);
  haze.addColorStop(0, 'rgba(255, 253, 247, 0)');
  haze.addColorStop(0.35, toRgba(env.fogColor, 0.58));
  haze.addColorStop(1, 'rgba(255, 253, 247, 0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, fogBandTop, width, fogBandHeight);

  // 5. Continuous Un-Fogged Buildings & Permanent Shopfronts (back-to-front, strictly solid alpha = 1)
  const buildingProps = engine.props
    .filter((p) => {
      if (p.kind !== 'BUILDING' && p.kind !== 'UNIVERSITY_HALL') return false;
      const relX = p.groundX - cameraX;
      return relX + BUILDING_DEPTH_X > 0.35 && relX <= 42;
    })
    .sort((a, b) => b.groundX - a.groundX);

  for (const prop of buildingProps) {
    drawPermanentBuilding(ctx, cam, prop, prop.groundX - cameraX, env.roadScale);
  }

  // 6. Regional Overhead Electrical & Communication Wiring (Dhaka bundles, cross-street spans & fascia drops)
  drawOverheadWires(
    ctx,
    cam,
    engine.props,
    cameraX,
    activeX + 32,
    map.id,
    env.district,
    env.roadScale,
    env.fogColor
  );

  // 7. Back-to-Front Depth-Sorted Sidewalk Props, Landmarks, Coins, Obstacles, Particles & Player
  const drawList: DrawableItem[] = [];

  for (const prop of engine.props) {
    if (prop.kind === 'BUILDING' || prop.kind === 'UNIVERSITY_HALL') continue;
    const relX = prop.groundX - cameraX;
    if (relX < 0.42 || relX > 33) continue;
    drawList.push({
      depthX: prop.groundX,
      draw: (c) =>
        drawStreetProp(
          c,
          cam,
          prop,
          relX,
          env.foliageColor,
          env.fogColor,
          env.roadScale,
          timeSec
        ),
    });
  }

  if (engine.phase !== 'title') {
    for (const lm of engine.landmarks) {
      const relX = lm.groundX - cameraX;
      if (relX < 0.4 || relX > 33) continue;
      drawList.push({
        depthX: lm.groundX,
        draw: (c) => drawLandmarkGate(c, cam, lm, relX, env.fogColor, timeSec),
      });
    }

    for (const coin of engine.coinItems) {
      if (coin.collected) continue;
      const relX = coin.groundX - cameraX;
      if (relX < 0.4 || relX > 31) continue;
      const vis = computeDepthVisibility(relX, 'hazard');
      drawList.push({
        depthX: coin.groundX,
        draw: (c) => drawBounceCoin(c, cam, coin, relX, timeSec, vis.alpha),
      });
    }

    for (const obs of engine.obstacles) {
      const relX = obs.groundX - cameraX;
      if (relX < 0.35 || relX > 32) continue;
      const isVehicle =
        obs.kind === 'BUS' ||
        obs.kind === 'TRUCK' ||
        obs.kind === 'CNG_TRAFFIC' ||
        obs.kind === 'CAR' ||
        obs.kind === 'MOTORCYCLE';
      const vis = computeDepthVisibility(relX, isVehicle ? 'vehicle' : 'hazard');
      drawList.push({
        depthX: obs.groundX,
        draw: (c) =>
          isVehicle
            ? drawTrafficVehicle(c, cam, obs, relX, map.id, env.fogColor, vis.fogMix, vis.alpha)
            : drawRoadHazard(c, cam, obs, relX, env.fogColor, vis.fogMix, vis.alpha),
      });
    }
  }

  // Player in lower-center foreground (with subtle active Magnet / 2X field indicator)
  drawList.push({
    depthX: activeX,
    draw: (c) => {
      if (engine.phase === 'playing' && (engine.magnetTimer > 0 || engine.doubleCoinsTimer > 0)) {
        const ringPt = projectPoint(cam, PLAYER_CAM_OFFSET_X, engine.lanePos, 6);
        const rsc = ringPt.scale;
        c.save();
        if (engine.magnetTimer > 0) {
          const pulse = 1 + Math.sin(timeSec * 8) * 0.12;
          c.strokeStyle = 'rgba(20, 184, 166, 0.72)';
          c.lineWidth = Math.max(1.5, 2.8 * rsc);
          c.beginPath();
          c.ellipse(ringPt.x, ringPt.y, 44 * rsc * pulse, 15 * rsc * pulse, 0, 0, Math.PI * 2);
          c.stroke();
        }
        if (engine.doubleCoinsTimer > 0) {
          c.strokeStyle = 'rgba(59, 130, 246, 0.72)';
          c.lineWidth = Math.max(1.2, 2.2 * rsc);
          c.setLineDash([6 * rsc, 5 * rsc]);
          c.beginPath();
          c.ellipse(ringPt.x, ringPt.y, 35 * rsc, 11 * rsc, 0, 0, Math.PI * 2);
          c.stroke();
        }
        c.restore();
      }
      drawPlayerSprite(
        c,
        cam,
        PLAYER_CAM_OFFSET_X,
        engine.phase === 'title' ? 0 : engine.lanePos,
        {
          z: engine.z,
          vz: engine.vz,
          playerState: engine.playerState,
          speedMult: engine.speedMult,
          scaleX: engine.scaleX,
          scaleY: engine.scaleY,
          invulnTimer: engine.invulnTimer,
          hitFlashTimer: engine.hitFlashTimer,
          isTitle: engine.phase === 'title',
        },
        timeSec
      );
    },
  });

  // Ground-space particles
  for (const p of engine.particles) {
    if (!p.active) continue;
    const relX = p.groundX - cameraX;
    if (relX < 0.4 || relX > 28) continue;
    drawList.push({
      depthX: p.groundX,
      draw: (c) => {
        const pt = projectPoint(cam, relX, p.groundY, p.z);
        const alpha = Math.max(0, p.life / p.maxLife);
        c.save();
        c.globalAlpha = alpha;
        c.fillStyle = p.color;
        c.strokeStyle = PALETTE.ink;
        c.lineWidth = Math.max(0.8, 1.3 * pt.scale);
        c.beginPath();
        c.arc(pt.x, pt.y, Math.max(1.5, p.size * pt.scale * alpha), 0, Math.PI * 2);
        c.fill();
        c.stroke();
        c.restore();
      },
    });
  }

  drawList.sort((a, b) => b.depthX - a.depthX);
  for (const item of drawList) {
    item.draw(ctx);
  }
}

function toRgba(color: string, alpha: number): string {
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  }
  const clean = color.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) || 240;
  const g = parseInt(clean.slice(2, 4), 16) || 230;
  const b = parseInt(clean.slice(4, 6), 16) || 210;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawQuadStrip(
  ctx: CanvasRenderingContext2D,
  cam: PerspectiveCamera,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  fill: string,
  stroke?: string,
  lineWidth = 1
): void {
  const p00 = projectPoint(cam, x0, y0, 0);
  const p01 = projectPoint(cam, x0, y1, 0);
  const p11 = projectPoint(cam, x1, y1, 0);
  const p10 = projectPoint(cam, x1, y0, 0);
  drawPolygon(ctx, [p00, p01, p11, p10], fill, stroke, lineWidth);
}

function drawSkyAndHorizon(
  ctx: CanvasRenderingContext2D,
  cam: PerspectiveCamera,
  mapId: string,
  archTheme: string,
  skyTop: string,
  skyBottom: string,
  skylineColor: string,
  scrollX: number
): void {
  const { width, horizonY } = cam;
  const grad = ctx.createLinearGradient(0, 0, 0, horizonY + 14);
  grad.addColorStop(0, skyTop);
  grad.addColorStop(1, skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, horizonY + 14);

  ctx.save();
  // Soft morning sun disc
  ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
  ctx.beginPath();
  ctx.arc(width * 0.24, horizonY * 0.42, Math.min(width, horizonY) * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Drifting clouds
  const cloudDrift = (scrollX * 2.5) % (width + 260);
  ctx.fillStyle = 'rgba(255, 253, 247, 0.72)';
  for (let i = 0; i < 4; i++) {
    const cx = ((i * 360 - cloudDrift * 0.35 + width + 260) % (width + 260)) - 130;
    const cy = horizonY * (0.24 + (i % 2) * 0.16);
    ctx.beginPath();
    ctx.ellipse(cx, cy, 56, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 28, cy - 8, 34, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Regional skyline silhouette
  const baseY = horizonY + 5;
  ctx.fillStyle = skylineColor;
  ctx.beginPath();
  ctx.moveTo(0, baseY);

  if (archTheme === 'hills' || archTheme === 'tea_valley' || mapId === 'sylhet') {
    // Rolling Chattogram / Khasi / Himalayan foothills ridge
    const peaks = [0.06, 0.16, 0.28, 0.41, 0.56, 0.7, 0.84, 1.0];
    for (let i = 0; i < peaks.length; i++) {
      const hFrac = i % 2 === 0 ? 0.34 : 0.15;
      ctx.quadraticCurveTo(
        width * (peaks[i] - 0.05),
        baseY - horizonY * hFrac,
        width * peaks[i],
        baseY - horizonY * (hFrac * 0.45)
      );
    }
  } else if (archTheme === 'coastal') {
    // Distant coastal palm ridge & open sea horizon
    for (let x = 0; x <= width * 0.65; x += 130) {
      ctx.quadraticCurveTo(x + 65, baseY - horizonY * 0.18, x + 130, baseY);
    }
    ctx.lineTo(width, baseY);
  } else {
    // Urban Dhaka / Agrabad skyline with domes & office towers
    const blocks = [
      { w: 0.09, h: 0.24, dome: false },
      { w: 0.08, h: 0.38, dome: false },
      { w: 0.1, h: 0.26, dome: true },
      { w: 0.08, h: 0.44, dome: false },
      { w: 0.14, h: 0.16, dome: false },
      { w: 0.09, h: 0.28, dome: true },
      { w: 0.12, h: 0.4, dome: false },
      { w: 0.11, h: 0.22, dome: false },
      { w: 0.1, h: 0.34, dome: false },
      { w: 0.09, h: 0.2, dome: false },
    ];
    let cx = 0;
    for (const b of blocks) {
      const segW = width * b.w;
      const bh = horizonY * b.h;
      ctx.lineTo(cx, baseY - bh);
      if (b.dome) {
        ctx.arc(cx + segW * 0.5, baseY - bh, segW * 0.3, Math.PI, 0);
      } else {
        ctx.lineTo(cx + segW, baseY - bh);
      }
      ctx.lineTo(cx + segW, baseY);
      cx += segW;
    }
  }

  ctx.lineTo(width, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawOverheadWires(
  ctx: CanvasRenderingContext2D,
  cam: PerspectiveCamera,
  props: PropEntity[],
  cameraX: number,
  maxGroundX: number,
  mapId: MapId,
  district: DistrictSegmentDef,
  roadScale: number,
  fogColor: string
): void {
  const infra = getDistrictInfrastructureProfile(mapId, district);
  const poleY = 1.88 * roadScale;
  const wallAnchorY = 2.75 * roadScale;
  const strandHeights = [194, 186, 178, 171, 165];
  const activeStrands = strandHeights.slice(0, infra.strandCount);

  ctx.save();

  for (const side of [-1, 1] as const) {
    const poles = props
      .filter(
        (p) => p.kind === 'POLE' && p.side === side && p.groundX > cameraX + 0.4 && p.groundX < maxGroundX
      )
      .sort((a, b) => a.groundX - b.groundX);

    // 1. Longitudinal overhead distribution & telecom cable bundles connecting concrete poles
    for (let i = 0; i < poles.length - 1; i++) {
      const pA = poles[i];
      const pB = poles[i + 1];
      if (pB.groundX - pA.groundX > 12) continue;

      const relA = pA.groundX - cameraX;
      const relB = pB.groundX - cameraX;
      const vis = computeDepthVisibility(relA, 'scenery');
      if (vis.alpha <= 0.04) continue;

      ctx.globalAlpha = vis.alpha * 0.78;
      ctx.strokeStyle = mixHexColor('#18181B', fogColor, vis.fogMix * 0.8);

      for (let sIdx = 0; sIdx < activeStrands.length; sIdx++) {
        const zLevel = activeStrands[sIdx];
        const latShift = (sIdx % 2 === 0 ? -0.04 : 0.04) * side;
        const a = projectPoint(cam, relA, side * poleY + latShift, zLevel);
        const b = projectPoint(cam, relB, side * poleY + latShift, zLevel);
        const midX = (a.x + b.x) * 0.5;
        const sag = (12 + sIdx * 4.5) * Math.min(a.scale, b.scale);
        const midY = (a.y + b.y) * 0.5 + sag;

        ctx.lineWidth = Math.max(0.75, (sIdx < 2 ? 1.8 : 1.35) * b.scale);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(midX, midY, b.x, b.y);
        ctx.stroke();
      }

      // 2. Service drop cables anchored directly from pole to neighboring building upper fascia
      if (infra.hasFasciaServiceDrops && i % 2 === 0) {
        const polePt = projectPoint(cam, relA, side * poleY, 174);
        const wallPt = projectPoint(cam, Math.min(relB, relA + 1.4), side * wallAnchorY, 158);
        ctx.lineWidth = Math.max(0.65, 1.15 * polePt.scale);
        ctx.beginPath();
        ctx.moveTo(polePt.x, polePt.y);
        ctx.quadraticCurveTo(
          (polePt.x + wallPt.x) * 0.5,
          (polePt.y + wallPt.y) * 0.5 + 8 * polePt.scale,
          wallPt.x,
          wallPt.y
        );
        ctx.stroke();
      }
    }

    // 3. High cross-street overhead spans connecting left and right poles cleanly above road traffic
    if (side === -1 && infra.hasCrossStreetSpans) {
      for (const pLeft of poles) {
        if (!pLeft.crossRoadWire) continue;
        const relA = pLeft.groundX - cameraX;
        const vis = computeDepthVisibility(relA, 'scenery');
        if (vis.alpha <= 0.08 || relA < 1.2) continue;

        ctx.globalAlpha = vis.alpha * 0.72;
        ctx.strokeStyle = mixHexColor('#18181B', fogColor, vis.fogMix * 0.8);
        for (const [zCross, sagMul] of [
          [214, 14],
          [206, 18],
        ]) {
          const leftPt = projectPoint(cam, relA, -poleY, zCross);
          const rightPt = projectPoint(cam, relA + 1.2, poleY, zCross);
          ctx.lineWidth = Math.max(0.7, 1.4 * leftPt.scale);
          ctx.beginPath();
          ctx.moveTo(leftPt.x, leftPt.y);
          ctx.quadraticCurveTo(
            (leftPt.x + rightPt.x) * 0.5,
            (leftPt.y + rightPt.y) * 0.5 + sagMul * leftPt.scale,
            rightPt.x,
            rightPt.y
          );
          ctx.stroke();
        }
      }
    }
  }

  ctx.restore();
}

function drawPermanentBuilding(
  ctx: CanvasRenderingContext2D,
  cam: PerspectiveCamera,
  prop: PropEntity,
  relX: number,
  roadScale: number
): void {
  const s = prop.side;
  const depth = BUILDING_DEPTH_X;
  const nearPlane = 0.35;
  const backRelX = relX + depth;
  if (backRelX <= nearPlane) return;

  // Buildings never fade or receive atmospheric fog
  const vis = computeDepthVisibility(relX, 'building');
  const frontRelX = Math.max(nearPlane, relX);

  const shop = prop.shop;
  const isUniversity = shop ? shop.appearance.isUniversityHall : prop.kind === 'UNIVERSITY_HALL';
  const isCommercial = prop.archTheme === 'commercial' || prop.archTheme === 'port';
  const isLowRural = prop.archTheme === 'tea_valley' || prop.archTheme === 'coastal';
  const stories = shop ? shop.appearance.stories : isCommercial ? 4 : 3;
  const bHeight = isLowRural ? 148 + stories * 36 : (isCommercial ? 195 : 165) + stories * 58;

  const innerY = s * (2.75 * roadScale);
  const outerY = s * (4.55 * roadScale);
  const ink = PALETTE.ink;

  const wallCol = shop ? shop.appearance.wallColor : isUniversity ? '#B94E3E' : '#E8D6B9';
  const frontWallCol = shop ? shop.appearance.sideWallColor : isUniversity ? '#9B3B2D' : '#CEB898';
  const trimCol = shop ? shop.appearance.trimColor : PALETTE.curbBrick;
  const awningCol = shop ? shop.appearance.awningColor : trimCol;

  const frontBaseInner = projectPoint(cam, frontRelX, innerY, 0);
  const frontTopInner = projectPoint(cam, frontRelX, innerY, bHeight);
  const backBaseInner = projectPoint(cam, backRelX, innerY, 0);
  const backTopInner = projectPoint(cam, backRelX, innerY, bHeight);
  const lw = Math.max(0.8, 1.9 * frontBaseInner.scale);

  ctx.save();
  ctx.globalAlpha = vis.alpha; // Always 1.0

  // Main road-facing facade (clips seamlessly at camera nearPlane without vanishing)
  drawPolygon(ctx, [frontBaseInner, backBaseInner, backTopInner, frontTopInner], wallCol, ink, lw);

  // Side street-facing wall when front edge is in front of the camera plane
  if (relX >= nearPlane) {
    const frontBaseOuter = projectPoint(cam, frontRelX, outerY, 0);
    const frontTopOuter = projectPoint(cam, frontRelX, outerY, bHeight);
    drawPolygon(ctx, [frontBaseInner, frontBaseOuter, frontTopOuter, frontTopInner], frontWallCol, ink, lw);
  }

  // Roof treatment by regional building style (keeps Dhaka, Chattagram & Sylhet distinct)
  const roofStyle = shop?.appearance.roofStyle ?? (isCommercial ? 'modern_glass' : 'flat_parapet');
  if (roofStyle === 'pitched_gable') {
    const ridgeH = bHeight + 58;
    const midY = (innerY + outerY) * 0.5;
    const eaveInnerY = innerY - s * 0.14;
    const eaveFront = projectPoint(cam, frontRelX, eaveInnerY, bHeight - 6);
    const eaveBack = projectPoint(cam, backRelX, eaveInnerY, bHeight - 6);
    const ridgeFront = projectPoint(cam, frontRelX, midY, ridgeH);
    const ridgeBack = projectPoint(cam, backRelX, midY, ridgeH);
    if (relX >= nearPlane) {
      const frontTopOuter = projectPoint(cam, frontRelX, outerY, bHeight);
      drawPolygon(ctx, [frontTopInner, frontTopOuter, ridgeFront], frontWallCol, ink, lw * 0.8);
    }
    drawPolygon(ctx, [eaveFront, eaveBack, ridgeBack, ridgeFront], trimCol, ink, lw * 0.85);
  } else if (roofStyle === 'coastal_sloped') {
    const slopeH = bHeight + 28;
    const backSlopeTop = projectPoint(cam, backRelX, outerY, slopeH);
    const frontSlopeTop = projectPoint(cam, frontRelX, outerY, slopeH);
    drawPolygon(ctx, [frontTopInner, backTopInner, backSlopeTop, frontSlopeTop], trimCol, ink, lw * 0.8);
  } else {
    // Parapet trim (with colonial arch cornice on heritage facades)
    const parF = projectPoint(cam, frontRelX, innerY, bHeight - (roofStyle === 'colonial_arch' ? 18 : 12));
    const parB = projectPoint(cam, backRelX, innerY, bHeight - (roofStyle === 'colonial_arch' ? 18 : 12));
    drawPolygon(ctx, [parF, parB, backTopInner, frontTopInner], trimCol, ink, lw * 0.7);
  }

  // Ground-floor shutters or arched campus colonnade (clipped to [frontRelX, backRelX])
  for (const sxFrac of [0.14, 0.56]) {
    const wx0 = Math.max(frontRelX, relX + sxFrac * depth);
    const wx1 = Math.min(backRelX, relX + (sxFrac + 0.3) * depth);
    if (wx1 <= wx0 + 0.04) continue;
    const sa = projectPoint(cam, wx0, innerY, 4);
    const sb = projectPoint(cam, wx1, innerY, 4);
    const sc = projectPoint(cam, wx1, innerY, 62);
    const sd = projectPoint(cam, wx0, innerY, 62);
    drawPolygon(
      ctx,
      [sa, sb, sc, sd],
      isUniversity || roofStyle === 'colonial_arch' ? '#3B231E' : '#64748B',
      ink,
      lw * 0.7
    );
  }

  // Permanent shop awning
  if (!isUniversity) {
    const awnEnd = Math.min(backRelX, relX + depth * 0.94);
    if (awnEnd > frontRelX + 0.06) {
      const awnTop = projectPoint(cam, frontRelX, innerY, 76);
      const awnBack = projectPoint(cam, awnEnd, innerY, 76);
      const awnOutF = projectPoint(cam, frontRelX, s * (2.25 * roadScale), 60);
      const awnOutB = projectPoint(cam, awnEnd, s * (2.25 * roadScale), 60);
      drawPolygon(ctx, [awnTop, awnBack, awnOutB, awnOutF], awningCol, ink, lw);
    }
  }

  // Upper floor windows & fixed balconies
  const winCol = roofStyle === 'modern_glass' || isCommercial ? '#3B82F6' : '#2C4257';
  const hasBalcony = shop ? shop.appearance.hasBalcony : prop.variant % 2 === 1 && !isCommercial;
  for (let st = 1; st < stories; st++) {
    const wz0 = 86 + st * 48;
    const wz1 = wz0 + 26;
    for (const wxFrac of [0.16, 0.58]) {
      const wx0 = Math.max(frontRelX, relX + wxFrac * depth);
      const wx1 = Math.min(backRelX, relX + (wxFrac + 0.24) * depth);
      if (wx1 <= wx0 + 0.03) continue;
      const wa = projectPoint(cam, wx0, innerY, wz0);
      const wb = projectPoint(cam, wx1, innerY, wz0);
      const wc = projectPoint(cam, wx1, innerY, wz1);
      const wd = projectPoint(cam, wx0, innerY, wz1);
      drawPolygon(ctx, [wa, wb, wc, wd], winCol, ink, lw * 0.65);
    }
    if (st === 1 && hasBalcony) {
      const bx0 = Math.max(frontRelX, relX + 0.14 * depth);
      const bx1 = Math.min(backRelX, relX + 0.86 * depth);
      if (bx1 > bx0 + 0.06) {
        const bl0 = projectPoint(cam, bx0, innerY, wz0 - 6);
        const bl1 = projectPoint(cam, bx1, innerY, wz0 - 6);
        const bl2 = projectPoint(cam, bx1, innerY - s * 0.18, wz0 + 6);
        const bl3 = projectPoint(cam, bx0, innerY - s * 0.18, wz0 + 6);
        drawPolygon(ctx, [bl0, bl1, bl2, bl3], '#E5DEC9', ink, lw * 0.6);
      }
    }
  }

  // Rooftop water tank (only on flat/modern rooftops)
  const hasWaterTank =
    roofStyle !== 'pitched_gable' &&
    roofStyle !== 'coastal_sloped' &&
    (shop ? shop.appearance.hasWaterTank : prop.variant % 2 === 0 && !isUniversity);
  if (hasWaterTank) {
    const tx0 = Math.max(frontRelX, relX + 0.55);
    const tx1 = Math.min(backRelX, relX + 1.35);
    if (tx1 > tx0 + 0.06) {
      const t0 = projectPoint(cam, tx0, s * (3.15 * roadScale), bHeight);
      const t1 = projectPoint(cam, tx1, s * (3.15 * roadScale), bHeight);
      const t2 = projectPoint(cam, tx1, s * (3.15 * roadScale), bHeight + 32);
      const t3 = projectPoint(cam, tx0, s * (3.15 * roadScale), bHeight + 32);
      drawPolygon(ctx, [t0, t1, t2, t3], '#1E293B', ink, lw * 0.7);
    }
  }

  // Static world-space baked shop signboard (text baked into bitmap once per shopId — zero zoom/flicker/independent shift)
  const signRelX = relX + depth * 0.44;
  if (shop && signRelX >= nearPlane && signRelX <= 38) {
    const signMount = projectPoint(cam, signRelX, innerY, 76);
    const signCenter = projectPoint(cam, signRelX, s * (2.62 * roadScale), 98);
    const baked = getBakedSignboardTexture(shop);
    const sw = (baked ? baked.logicalWidth * 0.44 : 132) * signCenter.scale;
    const sh = (baked ? baked.logicalHeight * 0.44 : 36) * signCenter.scale;
    const dx = signCenter.x - sw * 0.5;
    const dy = signCenter.y - sh * 0.5;

    // Steel mounting struts physically anchoring the signboard onto the building fascia
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(0.9, 1.8 * signCenter.scale);
    ctx.beginPath();
    ctx.moveTo(signMount.x - sw * 0.25, signMount.y);
    ctx.lineTo(signCenter.x - sw * 0.25, dy + sh);
    ctx.moveTo(signMount.x + sw * 0.25, signMount.y);
    ctx.lineTo(signCenter.x + sw * 0.25, dy + sh);
    ctx.stroke();

    if (baked) {
      ctx.drawImage(baked.canvas, dx, dy, sw, sh);
    } else {
      ctx.fillStyle = shop.signboard.bgColor;
      ctx.strokeStyle = shop.signboard.borderColor;
      ctx.lineWidth = Math.max(0.8, 1.6 * signCenter.scale);
      ctx.fillRect(dx, dy, sw, sh);
      ctx.strokeRect(dx, dy, sw, sh);
    }
  }

  ctx.restore();
}

function drawStreetProp(
  ctx: CanvasRenderingContext2D,
  cam: PerspectiveCamera,
  prop: PropEntity,
  relX: number,
  foliageColor: string,
  fogColor: string,
  roadScale: number,
  timeSec: number
): void {
  const s = prop.side;
  const isTree =
    prop.kind === 'COCONUT_TREE' ||
    prop.kind === 'PALM_TREE' ||
    prop.kind === 'BANYAN_TREE' ||
    prop.kind === 'MANGO_TREE' ||
    prop.kind === 'TEA_SHADE_TREE';
  const vis = computeDepthVisibility(relX, isTree ? 'tree' : 'scenery');
  if (vis.alpha <= 0.02) return;

  ctx.save();
  ctx.globalAlpha = vis.alpha;
  const ink = mixHexColor(PALETTE.ink, fogColor, vis.fogMix * 0.85);

  if (isTree) {
    const treeLat = prop.lateralOffset ?? 1.73;
    const base = projectPoint(cam, relX, s * (treeLat * roadScale), 0);
    drawBangladeshiTree(
      ctx,
      base.x,
      base.y,
      base.scale,
      prop.kind,
      foliageColor,
      fogColor,
      vis.fogMix,
      prop.groundX,
      timeSec,
      prop.hasTreePit !== false
    );
    ctx.restore();
    return;
  }

  if (prop.kind === 'POLE') {
    const poleY = 1.88 * roadScale;
    const base = projectPoint(cam, relX, s * poleY, 0);
    const top = projectPoint(cam, relX, s * poleY, 196);
    const crossIn = projectPoint(cam, relX, s * (poleY - 0.14), 186);
    const crossOut = projectPoint(cam, relX, s * (poleY + 0.14), 186);
    const armOut = projectPoint(cam, relX, s * (1.48 * roadScale), 178);
    const sc = base.scale;

    // Tapered reinforced concrete utility pole
    drawPolygon(
      ctx,
      [
        { x: base.x - 4.2 * sc, y: base.y },
        { x: base.x + 4.2 * sc, y: base.y },
        { x: top.x + 2.4 * sc, y: top.y },
        { x: top.x - 2.4 * sc, y: top.y },
      ],
      mixHexColor('#94A3B8', fogColor, vis.fogMix),
      ink,
      Math.max(0.8, 1.4 * sc)
    );

    // Steel cross-arm + 3 ceramic insulators
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1.2, 2.8 * sc);
    ctx.beginPath();
    ctx.moveTo(crossIn.x, crossIn.y);
    ctx.lineTo(crossOut.x, crossOut.y);
    ctx.stroke();

    ctx.fillStyle = mixHexColor('#E2E8F0', fogColor, vis.fogMix);
    for (const frac of [0.1, 0.5, 0.9]) {
      const ix = crossIn.x + (crossOut.x - crossIn.x) * frac;
      const iy = crossIn.y + (crossOut.y - crossIn.y) * frac - 2.5 * sc;
      ctx.beginPath();
      ctx.arc(ix, iy, Math.max(1, 2.3 * sc), 0, Math.PI * 2);
      ctx.fill();
    }

    // Pole-mounted cylindrical distribution transformer (Motijheel / Mirpur / Agrabad)
    if (prop.hasTransformer) {
      const trPt = projectPoint(cam, relX, s * (poleY + 0.08), 146);
      ctx.fillStyle = mixHexColor('#475569', fogColor, vis.fogMix);
      ctx.strokeStyle = ink;
      ctx.lineWidth = Math.max(0.8, 1.5 * sc);
      ctx.fillRect(trPt.x - 6.5 * sc, trPt.y - 12 * sc, 13 * sc, 22 * sc);
      ctx.strokeRect(trPt.x - 6.5 * sc, trPt.y - 12 * sc, 13 * sc, 22 * sc);
    }

    // Coiled black telecom / fiber cable loop hanging below cross-arm (Old Dhaka / Mirpur signature)
    if (prop.hasCoiledCable) {
      const coilPt = projectPoint(cam, relX, s * poleY, 166);
      ctx.strokeStyle = mixHexColor('#09090B', fogColor, vis.fogMix * 0.75);
      ctx.lineWidth = Math.max(1.1, 2.2 * sc);
      ctx.beginPath();
      ctx.ellipse(coilPt.x + s * 4 * sc, coilPt.y + 6 * sc, 6.5 * sc, 8.5 * sc, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(coilPt.x + s * 2 * sc, coilPt.y + 8 * sc, 5 * sc, 7 * sc, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Streetlight bracket arm & warm sodium lamp
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1, 2.2 * sc);
    ctx.beginPath();
    ctx.moveTo(top.x, top.y + 12 * sc);
    ctx.lineTo(armOut.x, armOut.y);
    ctx.stroke();

    ctx.fillStyle = mixHexColor(PALETTE.marigoldGold, fogColor, vis.fogMix * 0.7);
    ctx.beginPath();
    ctx.arc(armOut.x, armOut.y + 3 * sc, Math.max(1.5, 4.3 * sc), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (prop.kind === 'METRO_PILLAR') {
    const base = projectPoint(cam, relX, s * (2.35 * roadScale), 0);
    const top = projectPoint(cam, relX, s * (2.35 * roadScale), 235);
    const sc = base.scale;
    const lw = Math.max(1, 2 * sc);
    const w = 36 * sc;
    const colFill = mixHexColor('#94A3B8', fogColor, vis.fogMix);
    drawPolygon(
      ctx,
      [
        { x: base.x - w * 0.45, y: base.y },
        { x: base.x + w * 0.45, y: base.y },
        { x: top.x + w * 0.65, y: top.y },
        { x: top.x - w * 0.65, y: top.y },
      ],
      colFill,
      ink,
      lw
    );
    ctx.fillStyle = mixHexColor('#64748B', fogColor, vis.fogMix);
    ctx.fillRect(top.x - w * 1.4, top.y - 24 * sc, w * 2.8, 24 * sc);
    ctx.strokeStyle = ink;
    ctx.strokeRect(top.x - w * 1.4, top.y - 24 * sc, w * 2.8, 24 * sc);
    ctx.restore();
    return;
  }

  if (prop.kind === 'PORT_CRANE') {
    const base = projectPoint(cam, relX, s * (3.6 * roadScale), 0);
    const sc = base.scale;
    const craneCol = mixHexColor('#DC2626', fogColor, vis.fogMix * 0.9);
    ctx.strokeStyle = craneCol;
    ctx.lineWidth = Math.max(1.5, 4 * sc);
    ctx.beginPath();
    ctx.moveTo(base.x - 16 * sc, base.y);
    ctx.lineTo(base.x, base.y - 210 * sc);
    ctx.lineTo(base.x + 16 * sc, base.y);
    ctx.moveTo(base.x - 50 * sc, base.y - 165 * sc);
    ctx.lineTo(base.x + 48 * sc, base.y - 185 * sc);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (prop.kind === 'PEDESTRIAN') {
    const pt = projectPoint(cam, relX, s * (2.05 * roadScale), 0);
    const sc = pt.scale * 1.1;
    const lw = Math.max(0.8, 1.5 * sc);
    const shirtCols = [PALETTE.peacockTeal, PALETTE.marigoldGold, PALETTE.chalkWhite, PALETTE.royalIndigo];
    const shirt = mixHexColor(shirtCols[prop.variant % shirtCols.length], fogColor, vis.fogMix);
    ctx.fillStyle = mixHexColor('#1E293B', fogColor, vis.fogMix);
    ctx.fillRect(pt.x - 5 * sc, pt.y - 20 * sc, 4 * sc, 20 * sc);
    ctx.fillRect(pt.x + 1 * sc, pt.y - 20 * sc, 4 * sc, 20 * sc);
    ctx.fillStyle = shirt;
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;
    ctx.fillRect(pt.x - 7 * sc, pt.y - 38 * sc, 14 * sc, 18 * sc);
    ctx.strokeRect(pt.x - 7 * sc, pt.y - 38 * sc, 14 * sc, 18 * sc);
    ctx.fillStyle = mixHexColor('#D99B66', fogColor, vis.fogMix);
    ctx.beginPath();
    ctx.arc(pt.x, pt.y - 44 * sc, 5.5 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (prop.kind === 'TEA_STALL') {
    const base = projectPoint(cam, relX, s * (2.15 * roadScale), 0);
    const sc = base.scale * 1.15;
    const w = 72 * sc;
    const h = 66 * sc;
    const dir = s === -1 ? -1 : 1;
    const cx = base.x + dir * w * 0.25;
    const lw = Math.max(1, 1.8 * sc);

    ctx.fillStyle = mixHexColor('#8C6239', fogColor, vis.fogMix);
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;
    ctx.fillRect(cx - w * 0.5, base.y - h, w, h);
    ctx.strokeRect(cx - w * 0.5, base.y - h, w, h);

    drawPolygon(
      ctx,
      [
        { x: cx - w * 0.58, y: base.y - h },
        { x: cx + w * 0.58, y: base.y - h },
        { x: cx + w * 0.48, y: base.y - h - 18 * sc },
        { x: cx - w * 0.48, y: base.y - h - 18 * sc },
      ],
      mixHexColor(PALETTE.peacockTeal, fogColor, vis.fogMix),
      ink,
      lw
    );

    const bakedTea = getBakedTeaStallTexture();
    if (bakedTea && sc > 0.24) {
      const signW = w * 0.94;
      const signH = signW * (bakedTea.logicalHeight / bakedTea.logicalWidth);
      ctx.drawImage(bakedTea.canvas, cx - signW * 0.5, base.y - h - signH - 1 * sc, signW, signH);
    } else {
      ctx.fillStyle = mixHexColor(PALETTE.marigoldGold, fogColor, vis.fogMix);
      ctx.fillRect(cx - w * 0.42, base.y - h * 0.55, w * 0.84, 14 * sc);
    }
    ctx.restore();
    return;
  }

  if (prop.kind === 'RICKSHAW') {
    const pt = projectPoint(cam, relX, s * (1.98 * roadScale), 0);
    drawSidewalkRickshaw(ctx, pt.x, pt.y, pt.scale, fogColor, vis.fogMix);
    ctx.restore();
    return;
  }

  if (prop.kind === 'CNG') {
    const pt = projectPoint(cam, relX, s * (2.02 * roadScale), 0);
    drawSidewalkCng(ctx, pt.x, pt.y, pt.scale, fogColor, vis.fogMix);
    ctx.restore();
    return;
  }

  if (prop.kind === 'BILLBOARD') {
    const base = projectPoint(cam, relX, s * (2.35 * roadScale), 0);
    const sc = base.scale;
    const lw = Math.max(1, 1.8 * sc);
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1.2, 3 * sc);
    ctx.beginPath();
    ctx.moveTo(base.x - 16 * sc, base.y);
    ctx.lineTo(base.x - 16 * sc, base.y - 86 * sc);
    ctx.moveTo(base.x + 16 * sc, base.y);
    ctx.lineTo(base.x + 16 * sc, base.y - 86 * sc);
    ctx.stroke();

    ctx.fillStyle = mixHexColor(PALETTE.royalIndigo, fogColor, vis.fogMix);
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;
    ctx.fillRect(base.x - 42 * sc, base.y - 116 * sc, 84 * sc, 36 * sc);
    ctx.fillStyle = mixHexColor(PALETTE.marigoldGold, fogColor, vis.fogMix);
    ctx.fillRect(base.x - 42 * sc, base.y - 116 * sc, 84 * sc, 8 * sc);
    ctx.fillStyle = mixHexColor(PALETTE.emeraldGreen, fogColor, vis.fogMix);
    ctx.fillRect(base.x - 32 * sc, base.y - 102 * sc, 64 * sc, 12 * sc);
    ctx.strokeRect(base.x - 42 * sc, base.y - 116 * sc, 84 * sc, 36 * sc);
    ctx.restore();
    return;
  }

  if (prop.kind === 'BOAT') {
    const pt = projectPoint(cam, relX, s * (2.55 * roadScale), 0);
    const sc = pt.scale * 1.1;
    drawPolygon(
      ctx,
      [
        { x: pt.x - 32 * sc, y: pt.y - 7 * sc },
        { x: pt.x + 32 * sc, y: pt.y - 7 * sc },
        { x: pt.x + 20 * sc, y: pt.y + 8 * sc },
        { x: pt.x - 20 * sc, y: pt.y + 8 * sc },
      ],
      mixHexColor(PALETTE.peacockTeal, fogColor, vis.fogMix),
      ink,
      Math.max(1, 1.8 * sc)
    );
    // Bamboo boat canopy
    ctx.fillStyle = mixHexColor(PALETTE.juteSack, fogColor, vis.fogMix);
    ctx.beginPath();
    ctx.arc(pt.x, pt.y - 7 * sc, 13 * sc, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  // TEA_BUSH
  const pt = projectPoint(cam, relX, s * (2.15 * roadScale), 0);
  const sc = pt.scale;
  ctx.fillStyle = mixHexColor(foliageColor, fogColor, vis.fogMix * 0.85);
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1, 1.8 * sc);
  ctx.beginPath();
  ctx.ellipse(pt.x, pt.y - 12 * sc, 30 * sc, 16 * sc, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawLandmarkGate(
  ctx: CanvasRenderingContext2D,
  cam: PerspectiveCamera,
  lm: LandmarkEntity,
  relX: number,
  fogColor: string,
  timeSec: number
): void {
  const vis = computeDepthVisibility(relX, 'scenery');
  if (vis.alpha <= 0.04) return;

  const spanHalfY = lm.gateSpanHalfY ?? 1.72;
  const gateHeight = lm.gateHeight ?? 168;
  const leftBase = projectPoint(cam, relX, -spanHalfY, 0);
  const rightBase = projectPoint(cam, relX, spanHalfY, 0);
  const leftTop = projectPoint(cam, relX, -spanHalfY, gateHeight);
  const rightTop = projectPoint(cam, relX, spanHalfY, gateHeight);
  const sc = leftBase.scale;
  const lw = Math.max(1, 2.2 * sc);
  const ink = mixHexColor(PALETTE.ink, fogColor, vis.fogMix);
  const accent = mixHexColor(lm.accentColor, fogColor, vis.fogMix);
  const trim = mixHexColor(lm.secondaryColor ?? PALETTE.chalkWhite, fogColor, vis.fogMix);

  ctx.save();
  ctx.globalAlpha = vis.alpha;

  const pillarW = (lm.gateStyle === 'lalbagh_fort_gate' ? 18 : 14) * sc;
  for (const [b, t] of [
    [leftBase, leftTop],
    [rightBase, rightTop],
  ]) {
    drawPolygon(
      ctx,
      [
        { x: b.x - pillarW, y: b.y },
        { x: b.x + pillarW, y: b.y },
        { x: t.x + pillarW, y: t.y },
        { x: t.x - pillarW, y: t.y },
      ],
      accent,
      ink,
      lw
    );
    // Decorative trim strip along each gate pier
    ctx.fillStyle = trim;
    ctx.fillRect(t.x - pillarW * 0.7, t.y + 8 * sc, pillarW * 1.4, 5 * sc);
  }

  const beamH = 40 * sc;
  drawPolygon(
    ctx,
    [
      { x: leftTop.x - pillarW, y: leftTop.y + beamH * 0.3 },
      { x: rightTop.x + pillarW, y: rightTop.y + beamH * 0.3 },
      { x: rightTop.x + pillarW, y: rightTop.y - beamH * 0.7 },
      { x: leftTop.x - pillarW, y: leftTop.y - beamH * 0.7 },
    ],
    lm.triggered ? mixHexColor(PALETTE.marigoldGold, fogColor, vis.fogMix) : accent,
    ink,
    lw
  );

  const midX = (leftTop.x + rightTop.x) * 0.5;
  const midY = (leftTop.y + rightTop.y) * 0.5;

  if (lm.gateStyle === 'ahsan_manjil_palace') {
    // Ahsan Manjil Pink Palace: triangular portico pediment + iconic ribbed central dome
    drawPolygon(
      ctx,
      [
        { x: midX - 42 * sc, y: midY - beamH * 0.7 },
        { x: midX + 42 * sc, y: midY - beamH * 0.7 },
        { x: midX, y: midY - beamH * 0.7 - 22 * sc },
      ],
      trim,
      ink,
      lw
    );
    ctx.fillStyle = accent;
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(midX, midY - beamH * 0.7 - 20 * sc, 22 * sc, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Ribbed dome finial spire
    ctx.beginPath();
    ctx.moveTo(midX, midY - beamH * 0.7 - 42 * sc);
    ctx.lineTo(midX, midY - beamH * 0.7 - 54 * sc);
    ctx.stroke();
  } else if (lm.gateStyle === 'lalbagh_fort_gate') {
    // Lalbagh Fort: Mughal crenellated merlons & central chhatri dome
    const spanW = rightTop.x - leftTop.x;
    const merlonCount = 7;
    for (let i = 0; i < merlonCount; i++) {
      const mx = leftTop.x + ((i + 0.5) / merlonCount) * spanW;
      ctx.fillStyle = accent;
      ctx.strokeStyle = ink;
      ctx.lineWidth = lw;
      ctx.fillRect(mx - 6 * sc, midY - beamH * 0.7 - 12 * sc, 12 * sc, 12 * sc);
      ctx.strokeRect(mx - 6 * sc, midY - beamH * 0.7 - 12 * sc, 12 * sc, 12 * sc);
    }
    // Mughal onion kiosk dome + sandstone arch inlay
    ctx.fillStyle = trim;
    ctx.beginPath();
    ctx.arc(midX, midY - beamH * 0.7 - 12 * sc, 20 * sc, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (lm.archStyle === 'bridge') {
    // Sylhet Keane Bridge iron truss arch + Ali Amjad's clock tower silhouette
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1.5, 3 * sc);
    ctx.beginPath();
    ctx.arc(midX, midY - beamH * 0.4, (rightTop.x - leftTop.x) * 0.45, Math.PI, 0);
    ctx.stroke();

    // Clock face on right pillar top
    ctx.fillStyle = PALETTE.chalkWhite;
    ctx.beginPath();
    ctx.arc(rightTop.x, rightTop.y - beamH * 1.15, 16 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = trim;
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(midX, midY - beamH * 0.7, 24 * sc, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  const wave = Math.sin(timeSec * 4) * 3 * sc;
  const beaconOffsetY =
    lm.gateStyle === 'ahsan_manjil_palace'
      ? 60 * sc
      : lm.gateStyle === 'lalbagh_fort_gate'
        ? 44 * sc
        : 30 * sc;
  ctx.fillStyle = lm.triggered ? PALETTE.emeraldGreen : PALETTE.marigoldGold;
  ctx.strokeStyle = ink;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(midX, midY - beamH * 0.7 - beaconOffsetY + wave, 8 * sc, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (sc > 0.2) {
    ctx.font = `800 ${Math.max(9, Math.round(14 * sc))}px "Bricolage Grotesque", "Shahid Tahmid Tamim", "Noto Sans Bengali", sans-serif`;
    ctx.fillStyle = PALETTE.chalkWhite;
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1.5, 3 * sc);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = `${lm.nameBn} · ${lm.name.toUpperCase()}`;
    ctx.strokeText(label, midX, midY - beamH * 0.2);
    ctx.fillText(label, midX, midY - beamH * 0.2);
  }
  ctx.restore();
}

function drawRoadHazard(
  ctx: CanvasRenderingContext2D,
  cam: PerspectiveCamera,
  obs: ObstacleEntity,
  relX: number,
  fogColor: string,
  fogMix: number,
  alpha: number
): void {
  const pos = projectPoint(cam, relX, obs.lane, 0);
  const sc = pos.scale;
  const lw = Math.max(1, 2.2 * sc);
  const ink = mixHexColor(PALETTE.ink, fogColor, fogMix);

  ctx.save();
  ctx.globalAlpha = alpha;

  if (obs.kind === 'POTHOLE') {
    ctx.fillStyle = mixHexColor('#141519', fogColor, fogMix * 0.6);
    ctx.strokeStyle = mixHexColor(PALETTE.curbBrick, fogColor, fogMix * 0.6);
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y, 34 * sc, 13 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = mixHexColor(PALETTE.asphaltMid, fogColor, fogMix * 0.6);
    ctx.lineWidth = Math.max(0.8, 1.6 * sc);
    ctx.beginPath();
    ctx.moveTo(pos.x - 24 * sc, pos.y - 3 * sc);
    ctx.lineTo(pos.x - 42 * sc, pos.y - 8 * sc);
    ctx.moveTo(pos.x + 22 * sc, pos.y + 3 * sc);
    ctx.lineTo(pos.x + 38 * sc, pos.y + 8 * sc);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // MANHOLE
  ctx.fillStyle = mixHexColor(PALETTE.marigoldGold, fogColor, fogMix * 0.6);
  ctx.strokeStyle = ink;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.ellipse(pos.x, pos.y, 34 * sc, 15 * sc, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#09090B';
  ctx.beginPath();
  ctx.ellipse(pos.x, pos.y + 1 * sc, 25 * sc, 11 * sc, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = mixHexColor(PALETTE.asphaltMid, fogColor, fogMix * 0.6);
  ctx.beginPath();
  ctx.ellipse(pos.x + 30 * sc, pos.y - 6 * sc, 14 * sc, 6 * sc, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  drawPolygon(
    ctx,
    [
      { x: pos.x - 32 * sc, y: pos.y + 2 * sc },
      { x: pos.x - 16 * sc, y: pos.y + 2 * sc },
      { x: pos.x - 24 * sc, y: pos.y - 26 * sc },
    ],
    mixHexColor(PALETTE.rickshawCrimson, fogColor, fogMix * 0.6),
    ink,
    lw
  );
  ctx.restore();
}
