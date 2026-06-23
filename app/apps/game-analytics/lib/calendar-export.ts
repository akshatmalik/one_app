/**
 * Calendar Sync — turns planning dates already computed elsewhere (Up Next
 * timeline projections, Buy Queue release dates, Goal deadlines) into
 * standard calendar events: a downloadable .ics file (Apple Calendar,
 * Outlook, etc.) or a one-off Google Calendar quick-add link.
 *
 * Pure utilities + one browser-only side effect (triggering a file download).
 * No new data model, no storage — events are derived on the fly from
 * existing app state each time the modal opens.
 */

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  /** All-day event date. */
  date: Date;
  /** Optional end date for multi-day spans (Up Next play windows). Defaults to `date` (1-day event). */
  endDate?: Date;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/** YYYYMMDD — all-day events in iCalendar use DATE (not DATE-TIME) values. */
function toICSDate(date: Date): string {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
}

/** iCalendar all-day DTEND is exclusive, so add one day. */
function nextDay(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d;
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/** Fold lines >75 octets per RFC 5545 so strict clients (Outlook) don't choke on long descriptions. */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let i = 0;
  while (i < line.length) {
    const len = i === 0 ? 75 : 74;
    chunks.push((i === 0 ? '' : ' ') + line.slice(i, i + len));
    i += len;
  }
  return chunks.join('\r\n');
}

let uidCounter = 0;

function buildUID(eventId: string): string {
  uidCounter += 1;
  return `${eventId}-${Date.now()}-${uidCounter}@game-analytics.one-app`;
}

/** Build a complete .ics file body (VCALENDAR with one VEVENT per event). */
export function generateICS(events: CalendarEvent[], calendarName: string): string {
  const now = new Date();
  const stamp = `${toICSDate(now)}T${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}Z`;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//One App//Game Analytics//EN',
    'CALSCALE:GREGORIAN',
    foldLine(`X-WR-CALNAME:${escapeICSText(calendarName)}`),
  ];

  for (const event of events) {
    const dtEnd = nextDay(event.endDate ?? event.date);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${buildUID(event.id)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${toICSDate(event.date)}`,
      `DTEND:${toICSDate(dtEnd)}`,
      foldLine(`SUMMARY:${escapeICSText(event.title)}`),
    );
    if (event.description) {
      lines.push(foldLine(`DESCRIPTION:${escapeICSText(event.description)}`));
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/** Trigger a browser download of the given .ics content. No-op during SSR. */
export function downloadICSFile(filename: string, icsContent: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/** A single-event "Add to Google Calendar" quick-add URL — no download required. */
export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const dtEnd = nextDay(event.endDate ?? event.date);
  const dates = `${toICSDate(event.date)}/${toICSDate(dtEnd)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates,
  });
  if (event.description) params.set('details', event.description);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
