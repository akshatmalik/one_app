// Shared natural palette for the 16x16 farm sprites.
export const PAL = {
  '.': null,

  // Soil: dry and wet ramps remain deliberately far apart.
  A: '#c3a36f', B: '#99764b', C: '#63472d',
  D: '#756451', E: '#514636', F: '#302b25',

  // Grass and hedge: olive greens keep the field calm and readable.
  G: '#a5b86a', H: '#71894b', I: '#4b6538', J: '#293b2d',
  K: '#c4c98a', L: '#d9d5a0',

  // Water.
  M: '#a9c4bd', N: '#6f9e9a', O: '#3f706f', P: '#2a4d52', Q: '#d5e1cc',

  // Stone.
  R: '#c7c0aa', S: '#938d7a', T: '#625f55', U: '#3e3d38',

  // Wood.
  V: '#c59a63', W: '#8c6742', X: '#5f432f', Y: '#35271f',

  // Produce.
  a: '#d6bd59', b: '#b95e4c', c: '#667e9d', d: '#c9834f',

  // Outline and neutral highlight.
  0: '#20221f', 1: '#f0e7c9', 2: '#888678',
} as const;

export type PalKey = keyof typeof PAL;
export type RGBA = [number, number, number, number];

export function hexToRgba(hex: string): RGBA {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff, 255];
}

export function palToRgba(key: PalKey): RGBA | null {
  const hex = PAL[key];
  return hex === null ? null : hexToRgba(hex);
}
