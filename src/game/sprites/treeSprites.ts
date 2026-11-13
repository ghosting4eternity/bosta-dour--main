import { PALETTE } from '../palette';
import { mixHexColor } from '../perspective';
import type { PropKind } from '../types';

export function drawBangladeshiTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  kind: PropKind,
  foliageColor: string,
  fogColor: string,
  fogMix: number,
  swayPhase: number,
  timeSec: number,
  hasTreePit = true
): void {
  const sway = Math.sin(timeSec * 2.0 + swayPhase) * 4 * scale;
  const trunkCol = mixHexColor('#6F4E37', fogColor, fogMix * 0.85);
  const inkCol = mixHexColor(PALETTE.ink, fogColor, fogMix * 0.85);
  const leafMain = mixHexColor(foliageColor, fogColor, fogMix * 0.88);
  const leafLight = mixHexColor('#22C55E', fogColor, fogMix * 0.9);
  const leafDark = mixHexColor('#14532D', fogColor, fogMix * 0.88);
  const lw = Math.max(0.8, 1.7 * scale);

  ctx.save();

  // Dedicated roadside planting pit / brick curb planter + natural ground contact shadow
  if (hasTreePit) {
    ctx.fillStyle = mixHexColor('#A84B32', fogColor, fogMix * 0.85);
    ctx.strokeStyle = inkCol;
    ctx.lineWidth = Math.max(0.8, 1.5 * scale);
    ctx.beginPath();
    ctx.ellipse(x, y + 1 * scale, 19 * scale, 6.8 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = mixHexColor('#5C4033', fogColor, fogMix * 0.85);
    ctx.beginPath();
    ctx.ellipse(x, y, 15 * scale, 4.8 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(24, 24, 27, 0.24)';
    ctx.beginPath();
    ctx.ellipse(x, y + 1 * scale, 17 * scale, 5.5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (kind === 'COCONUT_TREE') {
    // Tall slender curved coconut palm (নারকেল গাছ)
    const topX = x + sway * 1.4;
    const topY = y - 122 * scale;
    ctx.strokeStyle = trunkCol;
    ctx.lineWidth = Math.max(2, 6.5 * scale);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 10 * scale, y - 62 * scale, topX, topY);
    ctx.stroke();

    // Cluster of coconuts under crown
    ctx.fillStyle = mixHexColor('#78350F', fogColor, fogMix * 0.8);
    for (const cx of [-4, 4, 0]) {
      ctx.beginPath();
      ctx.arc(topX + cx * scale, topY + 5 * scale, 3.6 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Drooping pinnate fronds
    ctx.fillStyle = leafMain;
    ctx.strokeStyle = inkCol;
    ctx.lineWidth = lw * 0.85;
    for (const ang of [-2.85, -2.25, -1.65, -0.95, -0.35, 0.25]) {
      const fx = topX + Math.cos(ang) * 26 * scale;
      const fy = topY + Math.sin(ang) * 12 * scale + 4 * scale;
      ctx.beginPath();
      ctx.ellipse(fx, fy, 27 * scale, 5.8 * scale, ang + 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (kind === 'PALM_TREE') {
    // Upright Tal / Fan-palm (তাল গাছ)
    const topX = x + sway * 0.8;
    const topY = y - 114 * scale;
    ctx.strokeStyle = mixHexColor('#57534E', fogColor, fogMix * 0.85);
    ctx.lineWidth = Math.max(2.2, 8 * scale);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(topX, topY);
    ctx.stroke();

    ctx.fillStyle = leafMain;
    ctx.strokeStyle = inkCol;
    ctx.lineWidth = lw;
    for (const ang of [-2.55, -2.0, -1.5, -1.0, -0.5]) {
      ctx.beginPath();
      ctx.ellipse(
        topX + Math.cos(ang) * 18 * scale,
        topY + Math.sin(ang) * 14 * scale,
        18 * scale,
        7.5 * scale,
        ang,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (kind === 'BANYAN_TREE') {
    // Broad heritage Bangladeshi Banyan (বটগাছ) with aerial prop roots
    const topX = x + sway * 0.4;
    const topY = y - 82 * scale;
    ctx.strokeStyle = trunkCol;
    ctx.lineWidth = Math.max(3, 13 * scale);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(topX, topY + 14 * scale);
    ctx.stroke();

    // Hanging aerial prop roots
    ctx.lineWidth = Math.max(1, 2.2 * scale);
    for (const rx of [-22, -12, 13, 24]) {
      ctx.beginPath();
      ctx.moveTo(topX + rx * scale, topY + 6 * scale);
      ctx.lineTo(topX + rx * 0.92 * scale, y - 4 * scale);
      ctx.stroke();
    }

    // Wide multi-lobed canopy
    ctx.fillStyle = leafDark;
    ctx.strokeStyle = inkCol;
    ctx.lineWidth = lw;
    for (const [cx, cy, r] of [
      [-26, 8, 22],
      [26, 8, 22],
      [-14, -10, 26],
      [14, -10, 26],
      [0, -16, 28],
    ]) {
      ctx.beginPath();
      ctx.arc(topX + cx * scale, topY + cy * scale, r * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = leafMain;
    ctx.beginPath();
    ctx.arc(topX - 6 * scale, topY - 12 * scale, 22 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (kind === 'TEA_SHADE_TREE') {
    // Sylhet Albizia tea-garden shade tree (শিরীষ / ছায়াবৃক্ষ)
    const topX = x + sway * 0.7;
    const topY = y - 98 * scale;
    ctx.strokeStyle = trunkCol;
    ctx.lineWidth = Math.max(2, 7.5 * scale);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(topX, topY);
    ctx.stroke();

    // Flat umbrella canopy
    ctx.fillStyle = leafMain;
    ctx.strokeStyle = inkCol;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.ellipse(topX, topY, 38 * scale, 13 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = leafLight;
    ctx.beginPath();
    ctx.ellipse(topX - 6 * scale, topY - 4 * scale, 26 * scale, 8 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // MANGO_TREE (আম গাছ) with lush rounded crown & golden ripening mangoes
  const topX = x + sway * 0.6;
  const topY = y - 86 * scale;
  ctx.strokeStyle = trunkCol;
  ctx.lineWidth = Math.max(2.2, 8.5 * scale);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 4 * scale, y - 42 * scale, topX, topY);
  ctx.stroke();

  ctx.fillStyle = leafMain;
  ctx.strokeStyle = inkCol;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(topX, topY - 4 * scale, 27 * scale, 0, Math.PI * 2);
  ctx.arc(topX - 18 * scale, topY + 6 * scale, 19 * scale, 0, Math.PI * 2);
  ctx.arc(topX + 18 * scale, topY + 6 * scale, 19 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (fogMix < 0.55) {
    ctx.fillStyle = mixHexColor(PALETTE.marigoldGold, fogColor, fogMix);
    for (const [mx, my] of [
      [-12, 4],
      [9, -6],
      [15, 8],
    ]) {
      ctx.beginPath();
      ctx.ellipse(topX + mx * scale, topY + my * scale, 3.2 * scale, 4.2 * scale, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
