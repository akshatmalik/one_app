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
import { CRATE_CATCHMENT, GRID_SIZE, RESERVOIR_POS } from '../lib/balance';
import { PlayerState, facingTileIdx } from '../lib/realtime/player';
import { Atlas } from './atlas';
import { Camera, TILE_PX, tileToWorld, worldToScreen } from './camera';
import { TimeOfDay, applyLighting } from './lighting';
import { groundDetails, GroundDetail, lockedScenery } from '../lib/worldScenery';

const IMG_CACHE: Record<string, HTMLImageElement> = {};
function drawExternalImg(ctx: CanvasRenderingContext2D, src: string, sx: number, sy: number, w: number, h: number) {
  if (typeof window === 'undefined') return;
  if (!IMG_CACHE[src]) {
    const img = new Image();
    img.onload = invalidateGroundCache;
    img.src = src;
    IMG_CACHE[src] = img;
  }
  if (IMG_CACHE[src].complete) {
    ctx.drawImage(IMG_CACHE[src], sx, sy, w, h);
  }
}

const GENERATED_ASSET_ROOT = '/farm-generated-v2';
const GENERATED_ASSET_VERSION = 3;

function drawGenerated(
  ctx: CanvasRenderingContext2D,
  name: string,
  sx: number,
  sy: number,
  w: number,
  h: number,
) {
  drawExternalImg(ctx, `${GENERATED_ASSET_ROOT}/${name}.png?v=${GENERATED_ASSET_VERSION}`, sx, sy, w, h);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function grassVariant(idx: number): string {
  // Keep the tall variant sparse so fields read as land, not a checkerboard.
  let hash = Math.imul(idx ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  hash ^= hash >>> 16;
  hash %= 8;
  return hash === 0 ? 'grass_2' : hash < 4 ? 'grass_1' : 'grass_0';
}

function tilledSprite(tile: Tile): string {
  return tile.moisture >= 60 ? 'tilled_wet' : 'tilled_dry';
}

function channelSprite(tiles: Tile[], idx: number): string {
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

function drawGroundDetail(ctx: CanvasRenderingContext2D, detail: GroundDetail, wx: number, wy: number) {
  const x = wx + detail.x;
  const y = wy + detail.y;
  if (detail.kind === 'flower') {
    ctx.fillStyle = detail.variant === 0 ? '#e8c96d' : detail.variant === 1 ? '#e58a6d' : '#d9b7e8';
    ctx.fillRect(x, y, 2, 2);
    ctx.fillStyle = '#4f7c43';
    ctx.fillRect(x + 1, y + 2, 1, 3);
    return;
  }
  if (detail.kind === 'tuft') {
    ctx.fillStyle = detail.variant === 0 ? '#3f713e' : '#588442';
    ctx.fillRect(x + 1, y + 2, 2, 5);
    ctx.fillRect(x, y + 3, 1, 3);
    ctx.fillRect(x + 3, y + 1, 1, 5);
    return;
  }
  if (detail.kind === 'pebble') {
    ctx.fillStyle = detail.variant === 0 ? '#8b8b72' : detail.variant === 1 ? '#9b8069' : '#6e786b';
    ctx.fillRect(x, y + 2, 3, 2);
    ctx.fillRect(x + 1, y + 1, 2, 1);
    return;
  }
  ctx.fillStyle = 'rgba(93, 70, 48, 0.22)';
  ctx.fillRect(x, y + 2, 7 + detail.variant * 2, 2);
  ctx.fillRect(x + 3, y, 4, 2);
}

// ── Ground layer cache ────────────────────────────────────────────────────────
// Uses object-reference equality: since tiles array is replaced on every state
// mutation (immutable update pattern), a new reference means a rebuild is needed.

interface GroundCache {
  canvas: HTMLCanvasElement;
  tilesRef: Tile[];
  seed: number;
}

let _groundCache: GroundCache | null = null;

function buildGroundCache(
  tiles: Tile[],
  atlas: Atlas,
  seed: number,
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
      case 'channel':
        spriteName = channelSprite(tiles, idx);
        break;
      case 'well':
        spriteName = grassVariant(idx);
        break;
      case 'reservoir':
        spriteName = grassVariant(idx);
        break;
      case 'path':
        spriteName = 'path';
        break;
      case 'locked':
        spriteName = grassVariant(idx);
        break;
      case 'brush':
      case 'rock':
      case 'marsh':
        spriteName = grassVariant(idx);
        break;
      default:
        spriteName = 'grass_0';
    }

    if (spriteName.startsWith('grass_')) {
      drawGenerated(ctx, `grass-${String.fromCharCode(97 + Number(spriteName.at(-1)))}`, wx, wy, TILE_PX, TILE_PX);
    } else if (spriteName === 'tilled_wet') {
      drawGenerated(ctx, 'soil-wet', wx, wy, TILE_PX, TILE_PX);
    } else if (spriteName === 'tilled_dry') {
      drawGenerated(ctx, 'soil-dry', wx, wy, TILE_PX, TILE_PX);
    } else if (spriteName === 'path') {
      drawGenerated(ctx, 'path', wx, wy, TILE_PX, TILE_PX);
    } else if (spriteName === 'channel_h') {
      drawGenerated(ctx, 'channel-h', wx, wy, TILE_PX, TILE_PX);
    } else if (spriteName === 'channel_v') {
      drawGenerated(ctx, 'channel-v', wx, wy, TILE_PX, TILE_PX);
    } else {
      atlas.draw(ctx, spriteName, wx, wy, 2);
    }

    if (tile.kind === 'grass' || tile.kind === 'tilled') {
      ctx.fillStyle = tile.soil === 'clay' ? 'rgba(139, 84, 60, 0.12)' : tile.soil === 'sandy' ? 'rgba(224, 197, 123, 0.11)' : 'rgba(64, 118, 66, 0.04)';
      ctx.fillRect(wx, wy, TILE_PX, TILE_PX);
    }

    const terrain = tile.kind === 'locked' ? 'locked' : tile.kind === 'path' ? 'path' : tile.kind === 'tilled' ? 'tilled' : 'grass';
    for (const detail of groundDetails(seed, idx, terrain)) drawGroundDetail(ctx, detail, wx, wy);
  });

  return { canvas, tilesRef: tiles, seed };
}

function getGroundCache(tiles: Tile[], atlas: Atlas, seed: number, worldW: number, worldH: number): GroundCache {
  if (_groundCache && _groundCache.tilesRef === tiles && _groundCache.seed === seed) return _groundCache;
  _groundCache = buildGroundCache(tiles, atlas, seed, worldW, worldH);
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
  navigationPath?: Array<{ row: number; col: number }>;
  waterEffects?: Array<{ idx: number; progress: number }>;
  showIrrigation?: boolean;
  buildTool?: string | null;
}

export function renderWorld(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  atlas: Atlas,
  cam: Camera,
  opts: RenderOptions = {}
) {
  const { tod = 'day', selectedIdx = null, player, navigationPath = [], waterEffects = [], showIrrigation = false, buildTool = null } = opts;
  const { viewW, viewH, worldW, worldH } = cam;

  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#6aa84f';
  ctx.fillRect(0, 0, viewW, viewH);

  // 1. Ground layer (cached offscreen canvas)
  const ground = getGroundCache(state.tiles, atlas, state.seed, worldW, worldH);
  ctx.drawImage(ground.canvas, Math.round(-cam.x), Math.round(-cam.y));

  if (player && navigationPath.length > 0) {
    const [playerX, playerY] = worldToScreen(cam, player.x + 12, player.y + 28);
    ctx.save();
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(241, 210, 122, 0.78)';
    ctx.beginPath();
    ctx.moveTo(Math.round(playerX), Math.round(playerY));
    for (const point of navigationPath) {
      const [x, y] = worldToScreen(cam, point.col * TILE_PX + TILE_PX / 2, point.row * TILE_PX + TILE_PX / 2);
      ctx.lineTo(Math.round(x), Math.round(y));
    }
    ctx.stroke();
    const destination = navigationPath[navigationPath.length - 1];
    const [endX, endY] = worldToScreen(cam, destination.col * TILE_PX + TILE_PX / 2, destination.row * TILE_PX + TILE_PX / 2);
    ctx.setLineDash([]);
    ctx.fillStyle = '#f1d27a';
    ctx.fillRect(Math.round(endX) - 3, Math.round(endY) - 3, 6, 6);
    ctx.restore();
  }

  // Hauling routes are world infrastructure: visible even when no transfer is active.
  const millIdx = state.tiles.findIndex((tile) => tile.kind === 'mill');
  if (millIdx >= 0) {
    const [millWx, millWy] = tileToWorld(millIdx);
    const [millSx, millSy] = worldToScreen(cam, millWx + TILE_PX / 2, millWy + TILE_PX / 2);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const route of state.haulRoutes) {
      const crate = state.fieldCrates.find((candidate) => candidate.id === route.crateId);
      if (!crate) continue;
      const [crateWx, crateWy] = tileToWorld(crate.idx);
      const [crateSx, crateSy] = worldToScreen(cam, crateWx + TILE_PX / 2, crateWy + TILE_PX / 2);
      ctx.setLineDash([]);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(32, 30, 22, 0.72)';
      ctx.beginPath();
      ctx.moveTo(crateSx, crateSy);
      ctx.lineTo(millSx, crateSy);
      ctx.lineTo(millSx, millSy);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.setLineDash(route.level === 1 ? [3, 3] : route.level === 2 ? [7, 3] : []);
      ctx.strokeStyle = route.level === 3 ? '#f1d27a' : '#c3a35d';
      ctx.stroke();
      const direction = Math.sign(millSx - crateSx) || 1;
      const arrowX = crateSx + (millSx - crateSx) * 0.55;
      ctx.setLineDash([]);
      ctx.fillStyle = '#f1d27a';
      ctx.beginPath();
      ctx.moveTo(arrowX + direction * 4, crateSy);
      ctx.lineTo(arrowX - direction * 3, crateSy - 3);
      ctx.lineTo(arrowX - direction * 3, crateSy + 3);
      ctx.closePath();
      ctx.fill();
      drawGenerated(ctx, 'cart', arrowX - 24, crateSy - 14, 48, 29);
    }
    ctx.restore();
  }

  // 2. Objects layer: wells, reservoir, crops — y-sorted with player
  type DrawCmd = { wy: number; fn: () => void };
  const cmds: DrawCmd[] = [];

  state.tiles.forEach((tile, idx) => {
    const [wx, wy] = tileToWorld(idx);
    const [sx, sy] = worldToScreen(cam, wx, wy);

    if (sx + TILE_PX < 0 || sx > viewW || sy + TILE_PX < 0 || sy > viewH) return;

    if (tile.kind === 'well') {
      cmds.push({ wy: wy + TILE_PX, fn: () => drawGenerated(ctx, 'well', sx - 8, sy - 24, 48, 48) });
    }

    if (tile.kind === 'shed') cmds.push({ wy: wy + TILE_PX, fn: () => drawGenerated(ctx, 'farmhouse', sx - 24, sy - 52, 80, 80) });
    if (tile.kind === 'mill') {
      const millSprite = !state.mill.commissioned
        ? 'mill-foundation'
        : state.mill.level >= 3
          ? 'mill-4'
          : state.mill.level === 2
            ? 'mill-2'
            : 'mill-1';
      const millSize = !state.mill.commissioned
        ? { w: 80, h: 68 }
        : state.mill.level >= 3
          ? { w: 112, h: 84 }
          : state.mill.level === 2
            ? { w: 96, h: 80 }
            : { w: 80, h: 80 };
      cmds.push({
        wy: wy + TILE_PX,
        fn: () => drawGenerated(ctx, millSprite, sx + TILE_PX / 2 - millSize.w / 2, sy + TILE_PX - millSize.h, millSize.w, millSize.h),
      });
    }
    if (tile.kind === 'depot') cmds.push({ wy: wy + TILE_PX, fn: () => drawGenerated(ctx, 'depot', sx - 16, sy - 40, 64, 64) });
    if (tile.kind === 'crate') cmds.push({ wy: wy + TILE_PX, fn: () => {
      const crate = state.fieldCrates.find((candidate) => candidate.idx === idx);
      drawGenerated(ctx, crate && crate.wheat > 0 ? 'crate-full' : 'crate-empty', sx, sy - 8, 32, 32);
      if (crate) {
        ctx.fillStyle = 'rgba(18, 16, 12, 0.82)';
        ctx.fillRect(sx + 4, sy + 26, 24, 4);
        ctx.fillStyle = crate.wheat >= crate.capacity ? '#f1d27a' : '#d9b95f';
        ctx.fillRect(sx + 5, sy + 27, Math.round(22 * crate.wheat / crate.capacity), 2);
      }
    } });
    if (tile.kind === 'brush' || tile.kind === 'rock') cmds.push({
      wy: wy + TILE_PX,
      fn: () => drawGenerated(ctx, tile.kind, sx, sy - 8, 32, 32),
    });
    if (tile.kind === 'marsh') cmds.push({
      wy: wy + TILE_PX,
      fn: () => drawGenerated(ctx, 'marsh', sx - 4, sy - 8, 40, 30),
    });
    if (tile.kind === 'extractor') cmds.push({
      wy: wy + TILE_PX,
      fn: () => atlas.draw(ctx, 'extractor', sx, sy - 8, 2),
    });
    if (tile.kind === 'locked') {
      const scenery = lockedScenery(state.seed, idx);
      if (scenery === 'brush' || scenery === 'rock') cmds.push({
        wy: wy + TILE_PX,
        fn: () => drawGenerated(ctx, scenery, sx, sy - 8, 32, 32),
      });
      if (scenery === 'marsh') cmds.push({
        wy: wy + TILE_PX,
        fn: () => drawGenerated(ctx, scenery, sx - 4, sy - 8, 40, 30),
      });
    }
    if (tile.kind === 'sprinkler') cmds.push({
      wy: wy + TILE_PX,
      fn: () => drawGenerated(ctx, tile.irrigated ? 'sprinkler-on' : 'sprinkler-off', sx, sy - 8, 32, 32),
    });

    if (tile.kind === 'barn') {
      cmds.push({ wy: wy + TILE_PX, fn: () => drawExternalImg(ctx, '/farm-barn.png', sx - 8, sy - 24, 48, 48) });
    }

    if (tile.kind === 'coop') {
      cmds.push({ wy: wy + TILE_PX, fn: () => drawExternalImg(ctx, '/farm-coop.png', sx - 8, sy - 24, 48, 48) });
    }

    if (isReservoir(idx)) {
      cmds.push({ wy: wy + TILE_PX, fn: () => drawGenerated(ctx, 'reservoir', sx - 8, sy - 24, 48, 48) });
    }

    if (tile.kind === 'channel') {
      if (!tile.irrigated) cmds.push({ wy: wy + TILE_PX + 0.1, fn: () => { ctx.fillStyle = 'rgba(65, 55, 45, 0.42)'; ctx.fillRect(sx, sy, TILE_PX, TILE_PX); } });
    }

    const cropName = cropSpriteName(tile);
    if (cropName) {
      if (cropName.startsWith('crop_wheat_')) {
        const stage = cropName.at(-1);
        const size = [18, 23, 28, 32][Number(stage)] ?? 24;
        cmds.push({
          wy: wy + TILE_PX,
          fn: () => drawGenerated(ctx, `wheat-${stage}`, sx + (TILE_PX - size) / 2, sy + TILE_PX - size, size, size),
        });
      } else {
        cmds.push({ wy: wy + TILE_PX, fn: () => atlas.draw(ctx, cropName, sx + 4, sy + 8, 1.5) });
      }
    }
  });

  // 3. Player character — y-sorted with objects by feet position
  if (player) {
    const [sx, sy] = worldToScreen(cam, player.x, player.y);
    const feetWy = player.y + 36;
    const bob = player.isMoving && player.walkFrame % 2 === 1 ? -1 : 0;
    cmds.push({
      wy: feetWy,
      fn: () => drawGenerated(ctx, `farmer-${player.facing}`, sx, sy + bob, 32, 40),
    });
  }

  // Y-sort and draw
  cmds.sort((a, b) => a.wy - b.wy);
  for (const cmd of cmds) cmd.fn();

  if (buildTool === 'crate') {
    state.fieldCrates.forEach((crate) => {
      const crateRow = Math.floor(crate.idx / GRID_SIZE);
      const crateCol = crate.idx % GRID_SIZE;
      state.tiles.forEach((tile, idx) => {
        if (tile.kind === 'locked') return;
        const row = Math.floor(idx / GRID_SIZE);
        const col = idx % GRID_SIZE;
        if (Math.abs(row - crateRow) + Math.abs(col - crateCol) > CRATE_CATCHMENT) return;
        const [wx, wy] = tileToWorld(idx);
        const [sx, sy] = worldToScreen(cam, wx, wy);
        ctx.fillStyle = 'rgba(241, 210, 122, 0.12)';
        ctx.fillRect(sx + 2, sy + 2, TILE_PX - 4, TILE_PX - 4);
      });
    });
  }

  if (buildTool === 'clear') {
    state.tiles.forEach((tile, idx) => {
      if (!['brush', 'rock', 'marsh'].includes(tile.kind)) return;
      const [wx, wy] = tileToWorld(idx);
      const [sx, sy] = worldToScreen(cam, wx, wy);
      ctx.strokeStyle = 'rgba(242, 193, 78, 0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 2, sy + 2, TILE_PX - 4, TILE_PX - 4);
    });
  }

  if (showIrrigation) {
    state.tiles.forEach((tile, idx) => {
      if (tile.kind !== 'sprinkler') return;
      const row = Math.floor(idx / GRID_SIZE);
      const col = idx % GRID_SIZE;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nextRow = row + dr;
          const nextCol = col + dc;
          if (nextRow < 0 || nextRow >= GRID_SIZE || nextCol < 0 || nextCol >= GRID_SIZE) continue;
          const [wx, wy] = tileToWorld(nextRow * GRID_SIZE + nextCol);
          const [sx, sy] = worldToScreen(cam, wx, wy);
          ctx.fillStyle = tile.irrigated ? 'rgba(80, 180, 225, 0.14)' : 'rgba(220, 110, 70, 0.12)';
          ctx.fillRect(sx + 2, sy + 2, TILE_PX - 4, TILE_PX - 4);
        }
      }
    });
  }

  // 4. Facing tile highlight
  const highlightIdx = selectedIdx ?? (player ? facingTileIdx(player, GRID_SIZE) : null);
  if (highlightIdx !== null && highlightIdx !== undefined && highlightIdx >= 0) {
    const [wx, wy] = tileToWorld(highlightIdx);
    const [sx, sy] = worldToScreen(cam, wx, wy);
    ctx.save();
    const isSelected = selectedIdx === highlightIdx;
    const pulse = isSelected ? 0.55 + Math.sin(performance.now() / 180) * 0.18 : 1;
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = isSelected ? '#f1d27a' : player?.tool === 'can' ? '#7dd3fc' : player?.tool === 'hand' ? '#f2c14e' : '#f5f2e8';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 1, sy + 1, TILE_PX - 2, TILE_PX - 2);
    ctx.fillStyle = isSelected ? 'rgba(241, 210, 122, 0.14)' : player?.tool === 'can' ? 'rgba(125, 211, 252, 0.16)' : 'rgba(245, 242, 232, 0.1)';
    ctx.fillRect(sx + 1, sy + 1, TILE_PX - 2, TILE_PX - 2);

    const tile = state.tiles[highlightIdx];
    if (player?.tool === 'can' && tile?.kind === 'tilled') {
      const meterX = sx + 4;
      const meterY = sy + TILE_PX - 8;
      const meterW = TILE_PX - 8;
      ctx.fillStyle = 'rgba(5, 20, 30, 0.75)';
      ctx.fillRect(meterX, meterY, meterW, 5);
      ctx.fillStyle = tile.moisture >= 60 ? '#70c8f0' : '#7aa6bb';
      ctx.fillRect(meterX + 1, meterY + 1, Math.round((meterW - 2) * tile.moisture / 100), 3);
    }
    ctx.restore();
  }

  // 5. Water feedback: a short ripple and rising droplets at the watered tile.
  for (const effect of waterEffects) {
    const [wx, wy] = tileToWorld(effect.idx);
    const [sx, sy] = worldToScreen(cam, wx, wy);
    const alpha = Math.max(0, 1 - effect.progress);
    const cx = sx + TILE_PX / 2;
    const cy = sy + TILE_PX / 2;
    ctx.save();
    ctx.fillStyle = `rgba(112, 200, 240, ${alpha * 0.22})`;
    ctx.fillRect(sx + 2, sy + 2, TILE_PX - 4, TILE_PX - 4);
    ctx.strokeStyle = `rgba(112, 200, 240, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 6, 4 + effect.progress * 10, 2 + effect.progress * 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(176, 216, 248, ${alpha})`;
    for (let i = 0; i < 3; i++) {
      const offsetX = (i - 1) * 6;
      const rise = effect.progress * (8 + i * 3);
      ctx.fillRect(Math.round(cx + offsetX - 2), Math.round(cy - rise), 4, 6);
    }
    ctx.restore();
  }

  // 6. Lighting overlay
  applyLighting(ctx, tod, viewW, viewH);
}
