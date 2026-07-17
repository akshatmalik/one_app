export const WAKE_MINUTES = 6 * 60;
export const DUSK_MINUTES = 20 * 60;
export const NIGHT_MINUTES = 22 * 60;
export const FORCED_SLEEP_MINUTES = 26 * 60;
export const REAL_MS_PER_GAME_MINUTE = 700;

export function advanceClock(currentMinutes: number, realElapsedMs: number): number {
  if (!Number.isFinite(realElapsedMs) || realElapsedMs <= 0) return currentMinutes;
  return Math.min(FORCED_SLEEP_MINUTES, currentMinutes + realElapsedMs / REAL_MS_PER_GAME_MINUTE);
}

export function formatClock(totalMinutes: number): string {
  const wrapped = ((Math.floor(totalMinutes) % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(wrapped / 60);
  const minutes = wrapped % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
