// ============================================================================
// Farm Sim — World renderer.
// Draws GameState onto a canvas. Pure rendering — no state mutation.
//
// Layering order:
//   1. Ground layer (terrain tiles) — drawn to offscreen cache, reused
//   2. Crops (y-sorted so tall back-row crops go behind front-row)
//   3. Buildings / infrastructure
//   4. Selection highlight
//   5. Lighting overlay
// ============================================================================

import { GameState, Tile } from '../lib/types';
import { GRID_SIZE, RESERVOIR_POS } from '../lib/balance';
import { Atlas } from './atlas';
import { Camera, TILE_PX, tileToWorld, worldToScreen } from './camera';
import { TimeOfDay, applyLighting } from './lighting';

// ── Helpers ──────────────────────────────────────────────────────────────────

function grassVariant(idx: number): string {
  return `grass_${idx % 3}`;
}

function tilledSprite(tile: Tile): string {
  // Wet = moisture >= 40 (just watered or irrigated)
  return tile.moisture >= 40 ? 'tilled_wet' : 'tilled_dry';
}

function channelSprite(tiles: Tile[], idx: number): string {
  // Simple horizontal/vertical pick based on neighbours.
  // Full bitmask auto-connect is R4; for now use H if any L/R neighbour is channel,
  // V otherwise.
  const col = idx % GRID_SIZE;
  const row = Math.floor(idx / GRID_SIZE);
  const left  = col > 0 ? tiles[idx - 1].kind : null;
  const right = col < GRID_SIZE - 1 ? tiles[idx + 1].kind : null;
  if (left === 'channel' || right === 'channel') return 'channel_h';
  return 'channel_v';
}

function isReservoir(idx: number): boolean {
  const col = idx % GRID_SIZE;
  const row = Math.floor(idx / GRID_SIZE);
  return row === RESERVOIR_POS.r && col === RESERVOIR_POS.c;
}

function cropSpriteName(tile: Tile): string | null {
  if (!tile.crop) return null;
  const { cropId, growthDays, mature } = tile.crop;
  // If stress ≥ 2 and not mature: show withered.
  if (tile.crop.stressDays >= 2 && !mature) return 'crop_withered';
  // Determine stage from growthDays.
  // growDays from CROPS gives max; stages are 0,1,2,3 (mature).
  if (mature) return `crop_${cropId}_3`;
  // rough 3-stage split
  const stage = Math.min(2, Math.floor(growthDays * 3 / 7));
  return `crop_${cropId}_${stage}`;
}

// ── Ground layer cache ────────────────────────────────────────────────────────

interface GroundCache {
  canvas: HTMLCanvasElement;
  /** serialized tile kinds + moisture bins to detect stale cache */
  key: string;
}

let _groundCache: GroundCache | null = null;

function tileKey(t: Tile): string {
  return `${t.kind}:${t.moisture >= 40 ? 'w' : 'd'}`;
}

function groundCacheKey(tiles: Tile[]): string {
  return tiles.map(tileKey).join(',');
}

function buildGroundCache(
  tiles: Tile[],
  atlas: Atlas,
  worldW: number,
  worldH: number
): GroundCache {
  const canvas = document.createElement('canvas');
  canvas.width = worldW;
  canvas.height = worldH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  tiles.forEach((tile, idx) => {
    const [wx, wy] = tileToWorld(idx);
    let spriteName: string;

    switch (tile.kind) {
      case 'grass':
        spriteName = grassVariant(idx);
        break;
      case 'tilled':
        spriteName = tilledSprite(tile);
        break;
      case 'locked':
        spriteName = 'locked';
        break;
      case 'channel':
        spriteName = channelSprite(tiles, idx);
        break;
      case 'well':
        // Draw grass underneath, well on top (in objects layer).
        spriteName = grassVariant(idx);
        break;
      case 'reservoir':
        // Reservoir is a 2×2 building drawn in the objects layer.
        spriteName = 'grass';
        break;
      default:
        spriteName = 'locked';
    }

    atlas.draw(ctx, spriteName, wx, wy, 2); // 16px sprite × 2 = 32px tile
  });

  return { canvas, key: groundCacheKey(tiles) };
}

function getGroundCache(tiles: Tile[], atlas: Atlas, worldW: number, worldH: number): GroundCache {
  const key = groundCacheKey(tiles);
  if (_groundCache && _groundCache.key === key) return _groundCache;
  _groundCache = buildGroundCache(tiles, atlas, worldW, worldH);
  return _groundCache;
}

export function invalidateGroundCache() {
  _groundCache = null;
}

// ── Main render ──────────────────────────────────────────────────────────────

export interface RenderOptions {
  tod?: TimeOfDay;
  selectedIdx?: number | null;
}

export function renderWorld(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  atlas: Atlas,
  cam: Camera,
  opts: RenderOptions = {}
) {
  const { tod = 'day', selectedIdx = null } = opts;
  const { viewW, viewH, worldW, worldH } = cam;

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, viewW, viewH);

  // 1. Ground layer (cached offscreen canvas)
  const ground = getGroundCache(state.tiles, atlas, worldW, worldH);
  ctx.drawImage(
    ground.canvas,
    cam.x, cam.y, viewW, viewH,   // source rect (crop to viewport)
    0, 0, viewW, viewH             // dest (fill canvas)
  );

  // 2. Objects layer: wells, reservoir, crops — y-sorted by world-y bottom edge
  type DrawCmd = { wy: number; fn: () => void };
  const cmds: DrawCmd[] = [];

  state.tiles.forEach((tile, idx) => {
    const [wx, wy] = tileToWorld(idx);
    const [sx, sy] = worldToScreen(cam, wx, wy);

    // Skip tiles fully outside viewport
    if (sx + TILE_PX < 0 || sx > viewW || sy + TILE_PX < 0 || sy > viewH) return;

    if (tile.kind === 'well') {
      cmds.push({ wy: wy + TILE_PX, fn: () => atlas.draw(ctx, 'well', sx, sy, 2) });
    }

    if (isReservoir(idx)) {
      cmds.push({ wy: wy + TILE_PX, fn: () => atlas.draw(ctx, 'reservoir_tl', sx, sy, 2) });
    }

    if (tile.kind === 'channel') {
      const spriteName = channelSprite(state.tiles, idx);
      cmds.push({ wy: wy + TILE_PX, fn: () => atlas.draw(ctx, spriteName, sx, sy, 2) });
    }

    const cropName = cropSpriteName(tile);
    if (cropName) {
      // Crops anchor at bottom-centre of tile; draw offset up.
      cmds.push({ wy: wy + TILE_PX, fn: () => atlas.draw(ctx, cropName, sx, sy - 8, 2) });
    }
  });

  // Y-sort and draw
  cmds.sort((a, b) => a.wy - b.wy);
  for (const cmd of cmds) cmd.fn();

  // 3. Selection highlight
  if (selectedIdx !== null && selectedIdx >= 0) {
    const [wx, wy] = tileToWorld(selectedIdx);
    const [sx, sy] = worldToScreen(cam, wx, wy);
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 100, 0.85)';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 1, sy + 1, TILE_PX - 2, TILE_PX - 2);
    ctx.fillStyle = 'rgba(255, 255, 100, 0.12)';
    ctx.fillRect(sx + 1, sy + 1, TILE_PX - 2, TILE_PX - 2);
    ctx.restore();
  }

  // 4. Lighting overlay
  applyLighting(ctx, tod, viewW, viewH);
}
