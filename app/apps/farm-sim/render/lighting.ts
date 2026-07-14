// ============================================================================
// Farm Sim — Lighting / time-of-day colour grade.
// R0: single "day" tint (no clock yet). R3 adds full cycle + night radial.
// Applied as a semi-transparent overlay on the canvas after world render.
// ============================================================================

export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

interface LightGrade {
  /** rgba overlay colour */
  overlay: string;
  /** canvas globalAlpha for the overlay (0 = no tint, 1 = fully opaque) */
  alpha: number;
  /** Ambient brightness multiplier for UI reference */
  brightness: number;
}

export const LIGHT_GRADES: Record<TimeOfDay, LightGrade> = {
  dawn:  { overlay: 'rgba(255, 180, 80, 1)',  alpha: 0.18, brightness: 0.8 },
  day:   { overlay: 'rgba(255, 255, 220, 1)', alpha: 0.06, brightness: 1.0 },
  dusk:  { overlay: 'rgba(220, 100, 60, 1)',  alpha: 0.22, brightness: 0.75 },
  night: { overlay: 'rgba(20, 30, 80, 1)',    alpha: 0.55, brightness: 0.3 },
};

/** Apply the colour-grade overlay to a canvas context. Call after all world draws. */
export function applyLighting(
  ctx: CanvasRenderingContext2D,
  tod: TimeOfDay,
  viewW: number,
  viewH: number
) {
  const grade = LIGHT_GRADES[tod];
  if (grade.alpha < 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = grade.alpha;
  ctx.fillStyle = grade.overlay;
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.restore();
}

/** R2+: convert game clock minutes (0–1200) to TimeOfDay bucket. */
export function clockToTimeOfDay(gameMinute: number): TimeOfDay {
  // 06:00 = 0, 22:00 = 960, 02:00 = 1200
  if (gameMinute < 60)  return 'dawn';   // 06:00–07:00
  if (gameMinute < 840) return 'day';    // 07:00–20:00
  if (gameMinute < 960) return 'dusk';   // 20:00–22:00
  return 'night';                         // 22:00–02:00
}
