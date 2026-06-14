/**
 * Shared formatting helpers for the Game Analytics app.
 *
 * Single source of truth so currency, hours, dates, and percentages read
 * identically everywhere (no more "2.3h" vs "138 min" vs "$5" vs "$5.00"
 * drift across panels). Prefer these over inline `.toFixed()` calls.
 */

/** Currency, e.g. 5 -> "$5", 5.4 -> "$5.40". Whole numbers drop the cents. */
export function formatCurrency(value: number, opts: { cents?: boolean } = {}): string {
  const abs = Math.abs(value);
  const forceCents = opts.cents ?? !Number.isInteger(abs);
  const body = forceCents ? abs.toFixed(2) : Math.round(abs).toLocaleString();
  return `${value < 0 ? '-' : ''}$${forceCents ? Number(body).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : body}`;
}

/** Cost-per-hour, always 2dp, e.g. "$1.80/hr". */
export function formatCostPerHour(value: number): string {
  return `$${value.toFixed(2)}/hr`;
}

/** Hours, e.g. 2.5 -> "2.5h", 40 -> "40h", 0 -> "0h". */
export function formatHours(value: number): string {
  if (value === 0) return '0h';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}h` : `${rounded.toFixed(1)}h`;
}

/** Whole-number with thousands separators, e.g. 1247 -> "1,247". */
export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString();
}

/** Percentage from a 0-100 number, e.g. 45 -> "45%". */
export function formatPercent(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`;
}

/** Day count into human duration, e.g. 1 -> "1 day", 45 -> "45 days", 400 -> "1.1 years". */
export function formatDays(days: number): string {
  if (days < 0) days = 0;
  if (days < 1) return 'today';
  if (days < 60) return `${Math.round(days)} day${Math.round(days) === 1 ? '' : 's'}`;
  if (days < 365) return `${Math.round(days / 7)} weeks`;
  const years = days / 365;
  return `${years.toFixed(1)} year${years >= 2 ? 's' : ''}`;
}

/** Short relative time from an ISO date, e.g. "3 days ago", "2 months ago". */
export function formatRelativeTime(isoDate: string): string {
  if (!isoDate) return '';
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return '';
  const days = Math.floor((Date.now() - then) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) {
    const months = Math.round(days / 30);
    return `${months} month${months === 1 ? '' : 's'} ago`;
  }
  const years = Math.round(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

/** Compact date, e.g. "Mar 3" or "Mar 3, 2024" when not the current year. */
export function formatDate(isoDate: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}
