// ============================================================================
// Farm Sim — World renderer.
// Draws GameState onto a canvas. Pure rendering — no state mutation.
//
// Layering order:
//   1. Ground layer (terrain tiles) — drawn to offscreen cache, reused
//   2. Crops (y-sorted so tall back-row crops go behind front-row)
//   3. Buildings / infrastructure
//   4. Player character (y-sorted with objects)
//   5. Selection highlight (facing tile)
//   6. Lighting overlay
// ============================================================================

import { GameState, Tile } from '../lib/types';
import { GRID_SIZE, RESERVOIR_POS } from '../lib/balance';
import { PlayerState, facingTileIdx } from '../lib/realtime/player';
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
  const col = idx % GRID_SIZE;
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
  if (tile.crop.stressDays >= 2 && !mature) return 'crop_withered';
  if (mature) return `crop_${cropId}_3`;
  const stage = Math.min(2, Math.floor(growthDays * 3 / 7));
  return `crop_${cropId}_${stage}`;
}

// ── Ground layer cache ────────────────────────────────────────────────────────

interface GroundCache {
  canvas: HTMLCanvasElement;
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
  canvas.width  = worldW;
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
        spriteName = grassVariant(idx);
        break;
      case 'reservoir':
        spriteName = 'grass';
        break;
      default:
        spriteName = 'locked';
    }

    atlas.draw(ctx, spriteName, wx, wy, 2);
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
  player?: PlayerState;
}

export function renderWorld(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  atlas: Atlas,
  cam: Camera,
  opts: RenderOptions = {}
) {
  const { tod = 'day', selectedIdx = null, player } = opts;
  const { viewW, viewH, worldW, worldH } = cam;

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, viewW, viewH);

  // 1. Ground layer (cached offscreen canvas)
  const ground = getGroundCache(state.tiles, atlas, worldW, worldH);
  ctx.drawImage(
    ground.canvas,
    cam.x, cam.y, viewW, viewH,
    0, 0, viewW, viewH
  );

  // 2. Objects layer: wells, reservoir, crops — y-sorted with player
  type DrawCmd = { wy: number; fn: () => void };
  const cmds: DrawCmd[] = [];

  state.tiles.forEach((tile, idx) => {
    const [wx, wy] = tileToWorld(idx);
    const [sx, sy] = worldToScreen(cam, wx, wy);

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
      cmds.push({ wy: wy + TILE_PX, fn: () => atlas.draw(ctx, cropName, sx, sy - 8, 2) });
    }
  });

  // 3. Player character — y-sorted with objects by feet position
  if (player) {
    const frameName = player.isMoving
      ? `farmer_${player.facing}_walk${player.walkFrame}`
      : `farmer_${player.facing}_idle`;
    const [sx, sy] = worldToScreen(cam, player.x, player.y);
    // Player feet world-y = player.y + 36; use that for y-sort
    const feetWy = player.y + 36;
    cmds.push({
      wy: feetWy,
      fn: () => atlas.draw(ctx, frameName, sx, sy, 2),
    });
  }

  // Y-sort and draw
  cmds.sort((a, b) => a.wy - b.wy);
  for (const cmd of cmds) cmd.fn();

  // 4. Facing tile highlight (shows which tile the tool will act on)
  const highlightIdx = player ? facingTileIdx(player, GRID_SIZE) : selectedIdx;
  if (highlightIdx !== null && highlightIdx !== undefined && highlightIdx >= 0) {
    const [wx, wy] = tileToWorld(highlightIdx);
    const [sx, sy] = worldToScreen(cam, wx, wy);
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 100, 0.85)';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 1, sy + 1, TILE_PX - 2, TILE_PX - 2);
    ctx.fillStyle = 'rgba(255, 255, 100, 0.12)';
    ctx.fillRect(sx + 1, sy + 1, TILE_PX - 2, TILE_PX - 2);
    ctx.restore();
  }

  // 5. Lighting overlay
  applyLighting(ctx, tod, viewW, viewH);
}
