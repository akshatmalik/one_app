// ============================================================================
// Farm Sim — Sprite grid helpers.
// A sprite is a template-literal string grid; each character = one pixel.
// ============================================================================

import { PalKey } from './palette';

export interface SpriteGrid {
  w: number;
  h: number;
  pixels: PalKey[][]; // [row][col]
}

/**
 * Parse a multi-line template string into a SpriteGrid.
 * Leading/trailing blank lines are stripped; inner rows are padded to the
 * same width with '.' (transparent).
 */
export function sprite(src: string): SpriteGrid {
  const rows = src
    .split('\n')
    .map((r) => r.trimEnd()) // keep leading spaces (indentation is part of the grid)
    .filter((r) => r.trim().length > 0);

  // Strip common leading whitespace so the template can be indented in source.
  const indent = Math.min(...rows.filter((r) => r.trim()).map((r) => r.search(/\S/)));
  const stripped = rows.map((r) => r.slice(indent));

  const w = Math.max(...stripped.map((r) => r.length));
  const pixels: PalKey[][] = stripped.map((row) =>
    Array.from({ length: w }, (_, i) => (row[i] as PalKey) ?? '.')
  );

  return { w, h: pixels.length, pixels };
}
