export const REF_VIEWPORT_W = 1366;
export const REF_VIEWPORT_H = 642;

export const PLAYER_CAM_OFFSET_X = 2.2;
export const CAMERA_DEPTH_BIAS = 1.6;
export const CAMERA_DEPTH_SCALE = 2.6;
export const PLAYER_REF_P =
  CAMERA_DEPTH_SCALE / (PLAYER_CAM_OFFSET_X + CAMERA_DEPTH_BIAS);

export interface PerspectiveCamera {
  width: number;
  height: number;
  isPortrait: boolean;
  horizonY: number;
  vanishX: number;
  roadHalfBottom: number;
  laneUnitBottom: number;
  shakeX: number;
  shakeY: number;
}

export interface ProjectedPoint {
  x: number;
  y: number;
  scale: number;
  p: number;
}

/**
 * Builds responsive camera parameters anchored on the 1366x642 reference
 * composition while adapting cleanly to 1080p, 720p, tablet, and mobile.
 * Optional `horizonPitchPx` lets hilly regions (Chattogram / Sylhet) tilt
 * gently without affecting ground-space physics or collision.
 */
export function createPerspectiveCamera(
  width: number,
  height: number,
  cameraLaneOffset: number,
  shakeX = 0,
  shakeY = 0,
  horizonPitchPx = 0
): PerspectiveCamera {
  const aspect = width / Math.max(1, height);
  const isPortrait = aspect < 1.15;
  const horizonY = height * (isPortrait ? 0.34 : 0.36) + horizonPitchPx;
  const vanishX =
    width * 0.5 -
    cameraLaneOffset * width * (isPortrait ? 0.045 : 0.032) +
    shakeX;

  const roadHalfBottom = isPortrait
    ? width * 0.46
    : Math.min(width * 0.35, height * 0.74);

  return {
    width,
    height,
    isPortrait,
    horizonY: horizonY + shakeY,
    vanishX,
    roadHalfBottom,
    laneUnitBottom: roadHalfBottom / 1.5,
    shakeX,
    shakeY,
  };
}

/**
 * Projects a point at camera-relative forward distance `relX` (in tiles),
 * lateral road offset `groundY` (lanes -1, 0, +1; curbs +-1.65; sidewalks +-2.4),
 * and elevation `z` (in reference pixels) into 2D screen coordinates.
 */
export function projectPoint(
  cam: PerspectiveCamera,
  relX: number,
  groundY: number,
  z = 0
): ProjectedPoint {
  const safeRelX = Math.max(0.35, relX);
  const p = CAMERA_DEPTH_SCALE / (safeRelX + CAMERA_DEPTH_BIAS);
  const scale = p / PLAYER_REF_P;
  const groundSpan = cam.height - cam.horizonY;
  const groundScreenY = cam.horizonY + groundSpan * p;
  const x = cam.vanishX + groundY * cam.laneUnitBottom * p;
  const zScale = (cam.height / REF_VIEWPORT_H) * 1.18;
  const y = groundScreenY - z * p * zScale;

  return { x, y, scale, p };
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(0.0001, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Computes atmospheric distance fog intensity [0..1] and opacity [0..1]
 * per object category so distant scenery fades naturally into the horizon
 * while gameplay hazards remain crisp inside the reaction window.
 */
export function computeDepthVisibility(
  relX: number,
  category: 'building' | 'scenery' | 'tree' | 'vehicle' | 'hazard'
): { fogMix: number; alpha: number } {
  // Buildings and permanent shopfronts NEVER fade or receive distance fog
  if (category === 'building') {
    return { fogMix: 0, alpha: 1 };
  }

  // Smooth near-camera exit for non-building props & vehicles
  const nearFade =
    category === 'vehicle' || category === 'hazard'
      ? smoothstep(0.36, 0.55, relX)
      : smoothstep(0.45, 0.95, relX);

  if (category === 'hazard') {
    // Potholes & open manholes stay crisp all the way through the reaction window
    const farFade = 1 - smoothstep(26, 33, relX);
    const fogMix = smoothstep(20, 32, relX) * 0.45;
    return { fogMix, alpha: Math.min(nearFade, farFade) };
  }

  if (category === 'vehicle') {
    // Traffic vehicles stay 100% solid inside 0..22 tiles, easing smoothly at far horizon
    const farFade = 1 - smoothstep(24, 33, relX);
    const fogMix = smoothstep(18, 32, relX) * 0.55;
    return { fogMix, alpha: Math.min(nearFade, farFade) };
  }

  if (category === 'tree') {
    const farFade = 1 - smoothstep(22, 32.5, relX);
    const fogMix = smoothstep(11, 30, relX) * 0.78;
    return { fogMix, alpha: Math.min(nearFade, farFade) };
  }

  // Sidewalk props, poles, wires
  const farFade = 1 - smoothstep(23, 33, relX);
  const fogMix = smoothstep(12, 31, relX) * 0.82;
  return { fogMix, alpha: Math.min(nearFade, farFade) };
}

export function mixHexColor(hexA: string, hexB: string, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped <= 0.001) return hexA;
  if (clamped >= 0.999) return hexB;

  const parse = (h: string): [number, number, number] => {
    const clean = h.replace('#', '');
    if (clean.length === 3) {
      return [
        parseInt(clean[0] + clean[0], 16),
        parseInt(clean[1] + clean[1], 16),
        parseInt(clean[2] + clean[2], 16),
      ];
    }
    return [
      parseInt(clean.slice(0, 2), 16) || 0,
      parseInt(clean.slice(2, 4), 16) || 0,
      parseInt(clean.slice(4, 6), 16) || 0,
    ];
  };

  const [r1, g1, b1] = parse(hexA);
  const [r2, g2, b2] = parse(hexB);
  const r = Math.round(r1 + (r2 - r1) * clamped);
  const g = Math.round(g1 + (g2 - g1) * clamped);
  const b = Math.round(b1 + (b2 - b1) * clamped);
  return `rgb(${r}, ${g}, ${b})`;
}
