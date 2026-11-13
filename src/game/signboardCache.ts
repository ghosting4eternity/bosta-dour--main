import { PALETTE } from './palette';
import type { ShopIdentity } from './shops';

export const BAKED_SIGN_WIDTH = 300;
export const BAKED_SIGN_HEIGHT = 82;
const BAKED_SUPERSAMPLE = 2;
const HEADER_STRIP_HEIGHT = 6;
const SIGN_PADDING_X = 14;
export const SIGN_INNER_MAX_WIDTH = BAKED_SIGN_WIDTH - SIGN_PADDING_X * 2;
export const SIGN_MAX_FONT_PX = 38;
export const SIGN_MIN_FONT_PX = 16;

export interface BakedSignboardTexture {
  canvas: HTMLCanvasElement;
  logicalWidth: number;
  logicalHeight: number;
}

const signboardCache = new Map<string, BakedSignboardTexture>();

export function buildSignboardFont(fontPx: number): string {
  return `700 ${fontPx}px "Shahid Tahmid Tamim", "শহীদ তাহমিদ তামিম", "Noto Sans Bengali", sans-serif`;
}

export function fitSignboardFontSize(
  label: string,
  measureWidth: (fontPx: number) => number,
  maxInnerWidth = SIGN_INNER_MAX_WIDTH
): number {
  for (let px = SIGN_MAX_FONT_PX; px >= SIGN_MIN_FONT_PX; px--) {
    if (measureWidth(px) <= maxInnerWidth) {
      return px;
    }
  }
  return SIGN_MIN_FONT_PX;
}

function createOffscreenSignCanvas(logicalW: number, logicalH: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = logicalW * BAKED_SUPERSAMPLE;
  canvas.height = logicalH * BAKED_SUPERSAMPLE;
  return canvas;
}

function bakeSignboardBitmap(
  key: string,
  label: string,
  bgColor: string,
  borderColor: string,
  textColor: string,
  accentStripColor: string
): BakedSignboardTexture | null {
  const existing = signboardCache.get(key);
  if (existing) return existing;

  const canvas = createOffscreenSignCanvas(BAKED_SIGN_WIDTH, BAKED_SIGN_HEIGHT);
  if (!canvas) return null;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.save();
  ctx.scale(BAKED_SUPERSAMPLE, BAKED_SUPERSAMPLE);

  // Solid signboard plate + top accent header strip + dark ink border
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, BAKED_SIGN_WIDTH, BAKED_SIGN_HEIGHT);

  ctx.fillStyle = accentStripColor;
  ctx.fillRect(0, 0, BAKED_SIGN_WIDTH, HEADER_STRIP_HEIGHT);

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 3.5;
  ctx.strokeRect(1.75, 1.75, BAKED_SIGN_WIDTH - 3.5, BAKED_SIGN_HEIGHT - 3.5);

  // Corner mounting rivets
  ctx.fillStyle = borderColor;
  for (const [rx, ry] of [
    [9, 13],
    [BAKED_SIGN_WIDTH - 9, 13],
    [9, BAKED_SIGN_HEIGHT - 8],
    [BAKED_SIGN_WIDTH - 9, BAKED_SIGN_HEIGHT - 8],
  ]) {
    ctx.beginPath();
    ctx.arc(rx, ry, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Baked static Bengali typography: measured ONCE at bake time to maximize legibility while strictly staying inside the frame
  const staticFontPx = fitSignboardFontSize(label, (px) => {
    ctx.font = buildSignboardFont(px);
    return ctx.measureText(label).width;
  });

  // Hard clip inside the inner frame so Bengali vowel marks never protrude past borders
  ctx.beginPath();
  ctx.rect(
    SIGN_PADDING_X - 4,
    HEADER_STRIP_HEIGHT + 2,
    BAKED_SIGN_WIDTH - (SIGN_PADDING_X - 4) * 2,
    BAKED_SIGN_HEIGHT - HEADER_STRIP_HEIGHT - 6
  );
  ctx.clip();

  ctx.fillStyle = textColor;
  ctx.font = buildSignboardFont(staticFontPx);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    label,
    BAKED_SIGN_WIDTH * 0.5,
    HEADER_STRIP_HEIGHT + (BAKED_SIGN_HEIGHT - HEADER_STRIP_HEIGHT) * 0.5 + 1.5,
    SIGN_INNER_MAX_WIDTH
  );

  ctx.restore();

  const baked: BakedSignboardTexture = {
    canvas,
    logicalWidth: BAKED_SIGN_WIDTH,
    logicalHeight: BAKED_SIGN_HEIGHT,
  };
  signboardCache.set(key, baked);
  return baked;
}

/**
 * Returns a pre-baked, static signboard bitmap for a permanent shop identity.
 * The text is baked into pixels once per shopId so it can never zoom, flicker, or shift independently.
 */
export function getBakedSignboardTexture(shop: ShopIdentity): BakedSignboardTexture | null {
  return bakeSignboardBitmap(
    shop.shopId,
    shop.nameBn,
    shop.signboard.bgColor,
    shop.signboard.borderColor,
    shop.signboard.textColor,
    shop.signboard.accentStripColor
  );
}

/**
 * Returns a pre-baked signboard bitmap for fixed sidewalk tea stalls ("চা ও নাস্তা").
 */
export function getBakedTeaStallTexture(): BakedSignboardTexture | null {
  return bakeSignboardBitmap(
    'static_tea_stall_sign',
    'চা ও নাস্তা',
    PALETTE.marigoldGold,
    PALETTE.ink,
    PALETTE.ink,
    PALETTE.peacockTeal
  );
}
