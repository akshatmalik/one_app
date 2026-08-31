const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse YYYY-MM-DD as a local calendar date so countdowns do not shift by timezone. */
export function parseReleaseDate(value?: string): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getReleaseCountdown(value?: string, now = new Date()): number | null {
  const release = parseReleaseDate(value);
  if (!release) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((release.getTime() - today.getTime()) / DAY_MS));
}

export function formatReleaseDate(value?: string): string {
  const date = parseReleaseDate(value);
  return date
    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Date TBA';
}

export function formatReleaseCountdown(value?: string): string {
  const days = getReleaseCountdown(value);
  if (days === null) return 'TBA';
  if (days === 0) return 'Out today';
  if (days === 1) return 'Tomorrow';
  if (days < 14) return `${days} days`;
  if (days < 60) return `${Math.ceil(days / 7)} weeks`;
  return `${Math.ceil(days / 30)} months`;
}
