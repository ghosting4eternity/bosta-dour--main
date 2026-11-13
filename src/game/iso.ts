export const TILE_W = 128;
export const TILE_H = 64;

export interface ScreenPoint {
  x: number;
  y: number;
}

/**
 * Oblique 2:1 isometric projection from ground space (x = road distance,
 * y = lane offset -1..1, z = hop height in px) to screen coordinates.
 */
export function toScreen(groundX: number, groundY: number, z = 0): ScreenPoint {
  return {
    x: (groundX - groundY) * TILE_W * 0.5,
    y: (groundX + groundY) * TILE_H * 0.5 - z,
  };
}

/**
 * Deterministic depth key matching isometric back-to-front draw order.
 */
export function groundDepth(groundX: number, groundY: number): number {
  return groundX + groundY;
}
