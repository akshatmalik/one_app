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
  dawn:  { overlay: 'rgba(255, 185, 110, 1)', alpha: 0.08, brightness: 0.9 },
  day:   { overlay: 'rgba(255, 255, 255, 1)', alpha: 0, brightness: 1.0 },
  dusk:  { overlay: 'rgba(205, 105, 75, 1)',  alpha: 0.12, brightness: 0.82 },
  night: { overlay: 'rgba(20, 30, 70, 1)',    alpha: 0.42, brightness: 0.42 },
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

/** Convert absolute clock minutes (06:00 through next-day 02:00) to a light bucket. */
export function clockToTimeOfDay(gameMinute: number): TimeOfDay {
  if (gameMinute < 7 * 60) return 'dawn';
  if (gameMinute < 20 * 60) return 'day';
  if (gameMinute < 22 * 60) return 'dusk';
  return 'night';
}
