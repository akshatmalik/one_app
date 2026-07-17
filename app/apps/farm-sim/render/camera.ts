// ============================================================================
// Farm Sim — Camera.
// Translates world-pixel coordinates to screen coordinates.
// In R0 the camera is centered on the farm; R1 will follow the player.
// ============================================================================

import { GRID_SIZE } from '../lib/balance';

export const TILE_PX = 32; // display pixels per tile (sprite is 16px drawn at 2×)

export interface Camera {
  /** World pixel at the top-left of the viewport */
  x: number;
  y: number;
  /** Viewport size in screen pixels */
  viewW: number;
  viewH: number;
  /** World size in pixels */
  worldW: number;
  worldH: number;
}

export function makeCamera(viewW: number, viewH: number): Camera {
  const worldW = GRID_SIZE * TILE_PX;
  const worldH = GRID_SIZE * TILE_PX;
  // Center the world in the viewport.
  const x = (worldW - viewW) / 2;
  const y = (worldH - viewH) / 2;
  return { x, y, viewW, viewH, worldW, worldH };
}

/** Clamp camera so it never shows outside the world. */
export function clampCamera(cam: Camera): Camera {
  // Allow a small overflow so the player can walk near edges without hard-stopping.
  const margin = TILE_PX * 2;
  const x = cam.viewW >= cam.worldW
    ? (cam.worldW - cam.viewW) / 2
    : Math.max(-margin, Math.min(cam.x, cam.worldW - cam.viewW + margin));
  const y = cam.viewH >= cam.worldH
    ? (cam.worldH - cam.viewH) / 2
    : Math.max(-margin, Math.min(cam.y, cam.worldH - cam.viewH + margin));
  return { ...cam, x, y };
}

/** Convert a world pixel position to screen pixel position. */
export function worldToScreen(cam: Camera, wx: number, wy: number): [number, number] {
  return [wx - cam.x, wy - cam.y];
}

/** Convert tile grid index to world-pixel top-left. */
export function tileToWorld(idx: number): [number, number] {
  const col = idx % GRID_SIZE;
  const row = Math.floor(idx / GRID_SIZE);
  return [col * TILE_PX, row * TILE_PX];
}

/** Center camera on a world pixel position. */
export function centerOn(cam: Camera, wx: number, wy: number): Camera {
  return clampCamera({
    ...cam,
    x: wx - cam.viewW / 2,
    y: wy - cam.viewH / 2,
  });
}

/** Center camera on the middle of the farm. */
export function centerOnFarm(cam: Camera): Camera {
  const midX = cam.worldW / 2;
  const midY = cam.worldH / 2;
  return centerOn(cam, midX, midY);
}
