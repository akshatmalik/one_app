// ============================================================================
// Farm Sim — Sprite Atlas.
// Parses all SpriteGrids once at boot, packs them into a single offscreen
// canvas, and exposes drawSprite() for renderers.
// No game logic here — pure rendering.
//
// Sprites are variable size; we pack with a fixed cell large enough for the
// biggest sprite (farmer 12×18) plus padding.
// ============================================================================

import { SpriteGrid } from './sprites/spriteUtil';
import { PAL, PalKey, hexToRgba } from './sprites/palette';
import { TILE_SPRITES } from './sprites/tiles';
import { CROP_SPRITES, WITHERED } from './sprites/crops';
import { FARMER_SPRITES } from './sprites/farmer';
import { STRUCTURE_SPRITES } from './sprites/structures';
import { EXPANSION_SPRITES } from './sprites/expansion';

export interface UVRect {
  x: number; // pixel x in atlas
  y: number;
  w: number;
  h: number;
}

export interface Atlas {
  canvas: HTMLCanvasElement;
  uvs: Map<string, UVRect>;
  /** Draw a named sprite to a target canvas context, scaled. */
  draw(
    ctx: CanvasRenderingContext2D,
    name: string,
    dx: number,
    dy: number,
    scale?: number
  ): void;
}

// All named sprites to pack.
function collectSprites(): Array<{ name: string; grid: SpriteGrid }> {
  const out: Array<{ name: string; grid: SpriteGrid }> = [];

  // Terrain
  for (let i = 0; i < 3; i++) {
    out.push({ name: `grass_${i}`, grid: TILE_SPRITES.grass[i] });
  }
  out.push({ name: 'tilled_dry', grid: TILE_SPRITES.tilledDry });
  out.push({ name: 'tilled_wet', grid: TILE_SPRITES.tilledWet });
  out.push({ name: 'locked', grid: TILE_SPRITES.locked });
  out.push({ name: 'reservoir_tl', grid: TILE_SPRITES.reservoirTL });
  out.push({ name: 'channel_h', grid: TILE_SPRITES.channelH });
  out.push({ name: 'channel_v', grid: TILE_SPRITES.channelV });
  out.push({ name: 'well', grid: TILE_SPRITES.well });
  out.push({ name: 'path', grid: TILE_SPRITES.path });
  for (const [name, grid] of Object.entries(STRUCTURE_SPRITES)) out.push({ name, grid });
  for (const [name, grid] of Object.entries(EXPANSION_SPRITES)) out.push({ name, grid });

  // Crops
  for (const [cropId, stages] of Object.entries(CROP_SPRITES)) {
    stages.forEach((grid, stage) => {
      out.push({ name: `crop_${cropId}_${stage}`, grid });
    });
  }
  out.push({ name: 'crop_withered', grid: WITHERED });

  // Farmer character sprites
  for (const [name, grid] of Object.entries(FARMER_SPRITES)) {
    out.push({ name, grid });
  }

  return out;
}

/** Paint one SpriteGrid into an ImageData buffer at (ox, oy). */
function paintSprite(
  data: Uint8ClampedArray,
  atlasW: number,
  grid: SpriteGrid,
  ox: number,
  oy: number
) {
  for (let row = 0; row < grid.h; row++) {
    for (let col = 0; col < grid.w; col++) {
      const key = grid.pixels[row][col];
      if (key === '.') continue; // transparent
      const hex = PAL[key as PalKey];
      if (!hex) continue;
      const rgba = hexToRgba(hex);
      const idx = ((oy + row) * atlasW + (ox + col)) * 4;
      data[idx]     = rgba[0];
      data[idx + 1] = rgba[1];
      data[idx + 2] = rgba[2];
      data[idx + 3] = rgba[3];
    }
  }
}

let _atlas: Atlas | null = null;

/** Build (or return cached) sprite atlas. Must be called in browser context. */
export function buildAtlas(): Atlas {
  if (_atlas) return _atlas;

  const sprites = collectSprites();

  // Cell size must fit the largest sprite; farmer is 12×18.
  const CELL_W  = 20;
  const CELL_H  = 20;
  const PADDING = 1;
  const COLS    = 16;
  const ROWS    = Math.ceil(sprites.length / COLS);

  const atlasW = COLS * (CELL_W + PADDING);
  const atlasH = ROWS * (CELL_H + PADDING);

  const canvas = document.createElement('canvas');
  canvas.width  = atlasW;
  canvas.height = atlasH;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(atlasW, atlasH);

  const uvs = new Map<string, UVRect>();

  sprites.forEach(({ name, grid }, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const ox  = col * (CELL_W + PADDING);
    const oy  = row * (CELL_H + PADDING);
    paintSprite(imageData.data, atlasW, grid, ox, oy);
    // Store the actual sprite dimensions (not the cell size).
    uvs.set(name, { x: ox, y: oy, w: grid.w, h: grid.h });
  });

  ctx.putImageData(imageData, 0, 0);

  function draw(
    ctx2d: CanvasRenderingContext2D,
    name: string,
    dx: number,
    dy: number,
    scale = 1
  ) {
    const uv = uvs.get(name);
    if (!uv) return;
    ctx2d.drawImage(
      canvas,
      uv.x, uv.y, uv.w, uv.h,
      Math.round(dx), Math.round(dy),
      uv.w * scale, uv.h * scale
    );
  }

  _atlas = { canvas, uvs, draw };
  return _atlas;
}

/** Reset cached atlas (for hot reload in dev). */
export function resetAtlas() {
  _atlas = null;
}
