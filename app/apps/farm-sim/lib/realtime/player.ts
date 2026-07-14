// ============================================================================
// Farm Sim — Player state + helper functions.
// No React dependencies — this is a plain mutable value held in a useRef.
// ============================================================================

export type FacingDir = 'up' | 'down' | 'left' | 'right';
export type ToolId = 'hand' | 'hoe' | 'can' | 'seeds' | 'builder';

export interface PlayerState {
  /** World pixel position (top-left of sprite bounding box, 24×36 at 2× scale) */
  x: number;
  y: number;
  facing: FacingDir;
  walkFrame: number;   // 0 or 1
  walkTick: number;    // increments each frame while moving
  isMoving: boolean;
  tool: ToolId;
  /** Watering-can charges remaining (refilled at reservoir / channel tile) */
  waterCharges: number;
}

export const WALK_SPEED = 2.5;  // tiles per second at 60 fps
export const RUN_SPEED  = 4.0;  // tiles per second while Shift held
export const CAN_MAX_CHARGES = 5;

const TILE_PX = 32;
// Sprite footprint drawn at 2× scale: 12×18 px source → 24×36 px on screen
const SPRITE_W = 24;
const SPRITE_H = 36;

/**
 * Return the tile index the player is currently facing (one tile ahead).
 * Returns null if the facing tile is outside the grid.
 */
export function facingTileIdx(player: PlayerState, gridSize: number): number | null {
  // Feet position: bottom-centre of sprite
  const feetX = player.x + SPRITE_W / 2;
  const feetY = player.y + SPRITE_H;

  let targetRow = Math.floor(feetY / TILE_PX);
  let targetCol = Math.floor(feetX / TILE_PX);

  switch (player.facing) {
    case 'up':    targetRow -= 1; break;
    case 'down':  targetRow += 1; break;
    case 'left':  targetCol -= 1; break;
    case 'right': targetCol += 1; break;
  }

  if (targetRow < 0 || targetRow >= gridSize || targetCol < 0 || targetCol >= gridSize) {
    return null;
  }
  return targetRow * gridSize + targetCol;
}

/**
 * Return the tile index the player's feet are standing on.
 */
export function standingTileIdx(player: PlayerState, gridSize: number): number {
  const feetX = player.x + SPRITE_W / 2;
  const feetY = player.y + SPRITE_H;
  const col = Math.min(gridSize - 1, Math.max(0, Math.floor(feetX / TILE_PX)));
  const row = Math.min(gridSize - 1, Math.max(0, Math.floor(feetY / TILE_PX)));
  return row * gridSize + col;
}

/** Construct the initial PlayerState, centred on the start plot. */
export function makePlayer(gridSize: number): PlayerState {
  const centerTile = Math.floor(gridSize / 2);
  return {
    x: centerTile * TILE_PX + 4,
    y: centerTile * TILE_PX,
    facing: 'down',
    walkFrame: 0,
    walkTick: 0,
    isMoving: false,
    tool: 'hoe',
    waterCharges: CAN_MAX_CHARGES,
  };
}
