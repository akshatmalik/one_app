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

import { CropId, GameState, Tile } from '../lib/types';
import { CRATE_CATCHMENT, GRID_SIZE, RESERVOIR_POS } from '../lib/balance';
import { PlayerState, facingTileIdx } from '../lib/realtime/player';
import { Atlas } from './atlas';
import { Camera, TILE_PX, tileToWorld, worldToScreen } from './camera';
import { TimeOfDay, applyLighting } from './lighting';
import { groundDetails, GroundDetail, lockedScenery } from '../lib/worldScenery';
import { harvestYield } from '../lib/engine/crops';
import { CROPS } from '../data/crops';
import { dayOfSeason } from '../lib/engine/weather';

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
const GENERATED_ASSET_VERSION = 4;

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

const CROP_VISUALS: Record<CropId, { accent: string; highlight: string }> = {
  wheat:   { accent: '#e4bd45', highlight: '#fff0a3' },
  potato:  { accent: '#d9a36f', highlight: '#f5e2c2' },
  beans:   { accent: '#9b63c7', highlight: '#dbc2ef' },
  tomato:  { accent: '#df5549', highlight: '#ffaaa0' },
  berries: { accent: '#526fc1', highlight: '#aabcf4' },
  pumpkin: { accent: '#e77f2f', highlight: '#ffc078' },
  rice:    { accent: '#d8cf78', highlight: '#fff4b0' },
  corn:    { accent: '#f0c33c', highlight: '#fff09a' },
  carrot:  { accent: '#ed8737', highlight: '#ffc17e' },
};

function cropVisualStage(tile: Tile): number | null {
  if (!tile.crop) return null;
  if (tile.crop.mature) return 3;
  const growDays = CROPS[tile.crop.cropId].growDays;
  return Math.min(2, Math.floor(tile.crop.growthDays * 3 / growDays));
}

function cropSpriteName(tile: Tile): string | null {
  if (!tile.crop) return null;
  const { cropId, mature } = tile.crop;
  if (tile.crop.stressDays >= 2 && !mature) return 'crop_withered';
  const stage = cropVisualStage(tile) ?? 0;
  return `crop_${cropId}_${stage}`;
}

function drawCropReadability(
  ctx: CanvasRenderingContext2D,
  cropId: CropId,
  stage: number,
  sx: number,
  sy: number,
) {
  const color = CROP_VISUALS[cropId];
  const px = (x: number, y: number, w: number, h: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(sx + x), Math.round(sy + y), w, h);
  };

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  if (stage === 0) {
    // Three raised seed plugs make a newly planted row unmistakable against
    // empty tilled soil. Crop-colored seed coats distinguish adjacent rows.
    px(3, 24, 26, 4, '#302219');
    px(4, 23, 24, 2, '#765038');
    for (const x of [7, 15, 23]) {
      px(x - 3, 21, 7, 4, '#4a3122');
      px(x - 2, 20, 5, 3, '#81563a');
      px(x, 15, 2, 6, '#315d39');
      px(x - 3, 15, 4, 2, '#69a653');
      px(x + 1, 13, 4, 2, '#91c66a');
      px(x, 20, 3, 2, color.accent);
      px(x + 1, 20, 1, 1, color.highlight);
    }
    if (cropId === 'rice') px(3, 27, 26, 2, '#5595a9');
    if (cropId === 'carrot') for (const x of [7, 15, 23]) px(x, 21, 2, 4, color.accent);
    if (cropId === 'potato') for (const x of [7, 15, 23]) px(x - 1, 21, 4, 3, color.accent);
    ctx.restore();
    return;
  }

  px(5, 26, 22, 3, 'rgba(39, 29, 21, 0.65)');

  // Produce accents strengthen crops whose green silhouettes otherwise merge.
  if (cropId === 'potato' && stage >= 2) {
    [[10, 12], [16, 10], [21, 13]].forEach(([x, y]) => {
      px(x, y, 3, 3, color.highlight);
      px(x + 1, y + 1, 1, 1, '#d39b54');
    });
    if (stage === 3) {
      px(8, 25, 5, 3, color.accent);
      px(19, 24, 5, 3, color.accent);
    }
  } else if (cropId === 'beans' && stage >= 2) {
    px(10, 12, 3, stage === 3 ? 8 : 5, color.accent);
    px(20, 15, 3, stage === 3 ? 7 : 4, color.highlight);
    px(11, 13, 1, 4, '#d8b2eb');
  } else if (cropId === 'rice') {
    px(5, 27, 22, 2, 'rgba(87, 157, 175, 0.75)');
    if (stage >= 2) {
      [[9, 9], [15, 7], [21, 10]].forEach(([x, y]) => {
        px(x, y, 2, stage === 3 ? 6 : 3, color.accent);
        px(x + 1, y, 1, 2, color.highlight);
      });
    }
  } else if (cropId === 'tomato' && stage >= 2) {
    px(9, 17, stage === 3 ? 5 : 3, stage === 3 ? 5 : 3, color.accent);
    px(19, 14, stage === 3 ? 5 : 3, stage === 3 ? 5 : 3, color.highlight);
  } else if (cropId === 'berries' && stage >= 2) {
    [[9, 15], [15, 12], [20, 17]].forEach(([x, y], index) => px(x, y, 3, 3, index === 1 ? color.highlight : color.accent));
  } else if (cropId === 'corn' && stage >= 2) {
    px(13, 10, 5, stage === 3 ? 9 : 5, color.accent);
    px(14, 11, 2, stage === 3 ? 7 : 3, color.highlight);
  } else if (cropId === 'carrot' && stage >= 2) {
    px(14, 22, 4, stage === 3 ? 7 : 4, color.accent);
    px(15, 23, 1, stage === 3 ? 4 : 2, color.highlight);
  } else if (cropId === 'pumpkin' && stage >= 2) {
    px(9, 21, stage === 3 ? 14 : 8, stage === 3 ? 8 : 5, color.accent);
    px(14, 20, 2, 2, '#4f713f');
    px(14, 23, 2, stage === 3 ? 5 : 3, color.highlight);
  }

  ctx.restore();
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

    if (tile.kind === 'locked') {
      ctx.fillStyle = 'rgba(25, 50, 25, 0.2)';
      ctx.fillRect(wx, wy, TILE_PX, TILE_PX);
    }
  });

  // Property fence follows every owned-to-locked edge. Unlike a temporary
  // selection glow, it remains readable while moving and at every zoom level.
  tiles.forEach((tile, idx) => {
    if (tile.kind === 'locked') return;
    const row = Math.floor(idx / GRID_SIZE);
    const col = idx % GRID_SIZE;
    const [wx, wy] = tileToWorld(idx);
    const edges = [
      { blocked: row === 0 || tiles[idx - GRID_SIZE]?.kind === 'locked', x1: wx, y1: wy + 2, x2: wx + TILE_PX, y2: wy + 2 },
      { blocked: row === GRID_SIZE - 1 || tiles[idx + GRID_SIZE]?.kind === 'locked', x1: wx, y1: wy + TILE_PX - 2, x2: wx + TILE_PX, y2: wy + TILE_PX - 2 },
      { blocked: col === 0 || tiles[idx - 1]?.kind === 'locked', x1: wx + 2, y1: wy, x2: wx + 2, y2: wy + TILE_PX },
      { blocked: col === GRID_SIZE - 1 || tiles[idx + 1]?.kind === 'locked', x1: wx + TILE_PX - 2, y1: wy, x2: wx + TILE_PX - 2, y2: wy + TILE_PX },
    ];
    for (const edge of edges) {
      if (!edge.blocked) continue;
      ctx.strokeStyle = '#3c2b1e';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(edge.x1, edge.y1); ctx.lineTo(edge.x2, edge.y2); ctx.stroke();
      ctx.strokeStyle = '#b88949';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(edge.x1, edge.y1); ctx.lineTo(edge.x2, edge.y2); ctx.stroke();
    }
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
    if (tile.kind === 'market') cmds.push({ wy: wy + TILE_PX, fn: () => drawGenerated(ctx, 'market-stand', sx - 28, sy - 54, 88, 88) });
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
      const cropId = tile.crop!.cropId;
      const cropStage = cropVisualStage(tile) ?? 0;
      if (cropStage === 0) {
        cmds.push({ wy: wy + TILE_PX, fn: () => drawCropReadability(ctx, cropId, cropStage, sx, sy) });
      } else if (cropName === 'crop_withered') {
        cmds.push({ wy: wy + TILE_PX, fn: () => atlas.draw(ctx, cropName, sx + 4, sy + 8, 1.5) });
      } else if (cropName.startsWith('crop_wheat_')) {
        const stage = cropName.at(-1);
        const size = [18, 23, 28, 32][Number(stage)] ?? 24;
        cmds.push({
          wy: wy + TILE_PX,
          fn: () => {
            drawGenerated(ctx, `wheat-${stage}`, sx + (TILE_PX - size) / 2, sy + TILE_PX - size, size, size);
            drawCropReadability(ctx, cropId, cropStage, sx, sy);
          },
        });
      } else {
        cmds.push({
          wy: wy + TILE_PX,
          fn: () => {
            atlas.draw(ctx, cropName, sx, sy, 2);
            drawCropReadability(ctx, cropId, cropStage, sx, sy);
          },
        });
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

  const selectedTile = selectedIdx === null ? null : state.tiles[selectedIdx];
  const selectedHarvestUnits = selectedTile?.crop?.mature ? harvestYield(selectedTile) : 0;
  const selectedHarvestCrate = selectedTile?.crop?.mature && selectedTile.crop.cropId === 'wheat'
    ? state.fieldCrates
      .filter((crate) => {
        const distance = Math.abs(Math.floor(crate.idx / GRID_SIZE) - Math.floor(selectedIdx! / GRID_SIZE)) + Math.abs(crate.idx % GRID_SIZE - selectedIdx! % GRID_SIZE);
        return distance <= CRATE_CATCHMENT && crate.wheat + selectedHarvestUnits <= crate.capacity;
      })
      .sort((a, b) => {
        const selectedRow = Math.floor(selectedIdx! / GRID_SIZE);
        const selectedCol = selectedIdx! % GRID_SIZE;
        const aDistance = Math.abs(Math.floor(a.idx / GRID_SIZE) - selectedRow) + Math.abs(a.idx % GRID_SIZE - selectedCol);
        const bDistance = Math.abs(Math.floor(b.idx / GRID_SIZE) - selectedRow) + Math.abs(b.idx % GRID_SIZE - selectedCol);
        return aDistance - bDistance || a.idx - b.idx;
      })[0]
    : undefined;
  const selectedCrate = state.fieldCrates.find((crate) => crate.idx === selectedIdx) ?? selectedHarvestCrate;

  if (buildTool === 'crate' || selectedCrate) {
    const crates = selectedCrate ? [selectedCrate] : state.fieldCrates;
    crates.forEach((crate) => {
      const crateRow = Math.floor(crate.idx / GRID_SIZE);
      const crateCol = crate.idx % GRID_SIZE;
      state.tiles.forEach((tile, idx) => {
        if (tile.kind === 'locked') return;
        const row = Math.floor(idx / GRID_SIZE);
        const col = idx % GRID_SIZE;
        if (Math.abs(row - crateRow) + Math.abs(col - crateCol) > CRATE_CATCHMENT) return;
        const [wx, wy] = tileToWorld(idx);
        const [sx, sy] = worldToScreen(cam, wx, wy);
        ctx.fillStyle = selectedCrate ? 'rgba(241, 210, 122, 0.17)' : 'rgba(241, 210, 122, 0.12)';
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

  if (showIrrigation || selectedTile?.kind === 'sprinkler') {
    state.tiles.forEach((tile, idx) => {
      if (tile.kind !== 'sprinkler' || (selectedTile?.kind === 'sprinkler' && idx !== selectedIdx)) return;
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

  if (state.weatherTruth[dayOfSeason(state.day)] === 'rain') {
    const now = performance.now();
    ctx.save();
    ctx.fillStyle = 'rgba(52, 92, 112, 0.13)';
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.lineCap = 'square';
    for (let i = 0; i < 90; i++) {
      const speed = 0.08 + (i % 5) * 0.018;
      const x = ((i * 83 + now * 0.045) % (viewW + 80)) - 40;
      const y = ((i * 47 + now * speed) % (viewH + 60)) - 30;
      const length = 5 + i % 7;
      ctx.strokeStyle = `rgba(174, 219, 239, ${0.28 + (i % 4) * 0.08})`;
      ctx.lineWidth = i % 6 === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(x), Math.round(y));
      ctx.lineTo(Math.round(x - 3), Math.round(y + length));
      ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const cycle = (now / 700 + i * 0.31) % 1;
      const x = (i * 127 + state.seed * 11) % Math.max(1, viewW);
      const y = (i * 71 + state.seed * 7) % Math.max(1, viewH);
      ctx.strokeStyle = `rgba(174, 219, 239, ${(1 - cycle) * 0.45})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y, 2 + cycle * 7, 1 + cycle * 3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 6. Lighting overlay
  applyLighting(ctx, tod, viewW, viewH);
}
