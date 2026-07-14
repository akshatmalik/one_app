// ============================================================================
// Farm Sim — Shared 32-colour palette.
// ONE palette for all sprites. This is what makes everything read as a cohesive
// world instead of clip-art. Edit here; all sprites pick up the change.
// ============================================================================

export const PAL = {
  // ── Transparent ────────────────────────────────────────────────────────────
  '.': null,        // transparent

  // ── Soil ramp (6) ──────────────────────────────────────────────────────────
  //   dry light → dry dark → wet light → wet dark → tilled dry → tilled wet
  'A': '#c8a87a',   // soil highlight dry
  'B': '#a8845a',   // soil mid dry
  'C': '#7a5c38',   // soil shadow dry
  'D': '#7a6448',   // soil highlight wet
  'E': '#5a4830',   // soil mid wet
  'F': '#3c3020',   // soil shadow wet

  // ── Grass / foliage ramp (6) ───────────────────────────────────────────────
  'G': '#a8d870',   // grass highlight
  'H': '#78b840',   // grass mid
  'I': '#4a8820',   // grass shadow / dark
  'J': '#386018',   // dark foliage
  'K': '#c8e890',   // pale grass / dry patch
  'L': '#e8f8b0',   // sun glint on grass

  // ── Water / sky ramp (5) ───────────────────────────────────────────────────
  'M': '#b0d8f8',   // sky / water highlight
  'N': '#70a8e0',   // water mid
  'O': '#3878c0',   // water deep
  'P': '#2050a0',   // water shadow
  'Q': '#e8f4ff',   // water shimmer / foam

  // ── Stone / structure (4) ──────────────────────────────────────────────────
  'R': '#d0c8b8',   // stone light
  'S': '#a09888',   // stone mid
  'T': '#706858',   // stone dark
  'U': '#504840',   // stone shadow

  // ── Wood / warm structure (4) ──────────────────────────────────────────────
  'V': '#d89858',   // wood light
  'W': '#a86830',   // wood mid
  'X': '#784020',   // wood dark
  'Y': '#501800',   // wood shadow

  // ── Crop / produce tints (4) ───────────────────────────────────────────────
  'a': '#f8e040',   // warm yellow (wheat)
  'b': '#e86020',   // tomato red
  'c': '#5888d8',   // berry blue-purple
  'd': '#f87808',   // pumpkin orange

  // ── Neutral / outline (3) ──────────────────────────────────────────────────
  '0': '#181008',   // near-black outline
  '1': '#f8f0e0',   // near-white highlight
  '2': '#888070',   // mid grey
} as const;

export type PalKey = keyof typeof PAL;
export type RGBA = [number, number, number, number]; // 0-255 each

/** Parse a hex colour string to RGBA. Returns null for transparent. */
export function hexToRgba(hex: string): RGBA {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff, 255];
}

/** Resolve a palette key to RGBA (null = transparent). */
export function palToRgba(key: PalKey): RGBA | null {
  const hex = PAL[key];
  if (hex === null) return null;
  return hexToRgba(hex);
}
