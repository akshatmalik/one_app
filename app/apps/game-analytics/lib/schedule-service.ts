'use client';

import { Game } from './types';
import { getGameChemistry, GameChemistryResult } from './calculations';

/**
 * "Plan My Week" — turns the existing chemistry/queue signals into a forward-looking
 * weekly play schedule that can be exported as a real .ics calendar file.
 * Pure, additive module: only reads Game[] via getGameChemistry, never mutates data.
 */

const AVAILABILITY_KEY = 'ga-schedule-availability-v1';
const START_TIME_KEY = 'ga-schedule-starttime-v1';

export interface ScheduleCandidate {
  game: Game;
  chemistry: GameChemistryResult;
  /** Position in the Up Next queue (0 = top). -1 if not queued. */
  queuePriority: number;
}

export interface ScheduleSlot {
  /** 0 = today, 6 = six days from today */
  dayOffset: number;
  date: Date;
  dateLabel: string;
  startTime: string; // 'HH:MM'
  durationHours: number;
  gameId: string | null;
  gameName: string | null;
  thumbnail?: string;
  chemistryScore: number | null;
  chemistryGrade: GameChemistryResult['grade'] | null;
  justification: string | null;
}

export function loadSavedAvailability(): Record<number, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(AVAILABILITY_KEY);
    return raw ? (JSON.parse(raw) as Record<number, number>) : {};
  } catch {
    return {};
  }
}

export function saveAvailability(hoursByOffset: Record<number, number>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AVAILABILITY_KEY, JSON.stringify(hoursByOffset));
}

export function loadDefaultStartTime(): string {
  if (typeof window === 'undefined') return '19:00';
  return localStorage.getItem(START_TIME_KEY) || '19:00';
}

export function saveDefaultStartTime(time: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(START_TIME_KEY, time);
}

/** Eligible games (owned, not finished/wishlisted) ranked: queued first (by position), then chemistry score. */
export function getScheduleCandidates(allGames: Game[], queuedGames: Game[]): ScheduleCandidate[] {
  const eligible = allGames.filter(g => g.status === 'In Progress' || g.status === 'Not Started');
  const queueIndex = new Map(queuedGames.map((g, i) => [g.id, i]));

  return eligible
    .map(game => ({
      game,
      chemistry: getGameChemistry(game, allGames),
      queuePriority: queueIndex.has(game.id) ? (queueIndex.get(game.id) as number) : -1,
    }))
    .sort((a, b) => {
      const aQueued = a.queuePriority >= 0;
      const bQueued = b.queuePriority >= 0;
      if (aQueued !== bQueued) return aQueued ? -1 : 1;
      if (aQueued && bQueued) return a.queuePriority - b.queuePriority;
      return b.chemistry.score - a.chemistry.score;
    });
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function candidateToSlotFields(c: ScheduleCandidate) {
  return {
    gameId: c.game.id,
    gameName: c.game.name,
    thumbnail: c.game.thumbnail,
    chemistryScore: c.chemistry.score,
    chemistryGrade: c.chemistry.grade,
    justification: c.chemistry.justification,
  };
}

/**
 * Greedily assigns candidates to each day with available hours, round-robining through
 * the ranked candidate list so the same game isn't repeated every day unless there's
 * only one eligible game.
 */
export function buildWeeklyPlan(
  candidates: ScheduleCandidate[],
  hoursByOffset: Record<number, number>,
  startTime: string,
): ScheduleSlot[] {
  const slots: ScheduleSlot[] = [];
  let rotation = 0;
  const today = new Date();

  for (let offset = 0; offset < 7; offset++) {
    const hours = hoursByOffset[offset] ?? 0;
    const date = addDays(today, offset);
    const base: ScheduleSlot = {
      dayOffset: offset,
      date,
      dateLabel: formatDateLabel(date),
      startTime,
      durationHours: hours,
      gameId: null,
      gameName: null,
      chemistryScore: null,
      chemistryGrade: null,
      justification: null,
    };

    if (hours <= 0 || candidates.length === 0) {
      slots.push(base);
      continue;
    }

    const pick = candidates[rotation % candidates.length];
    rotation++;
    slots.push({ ...base, ...candidateToSlotFields(pick) });
  }

  return slots;
}

/** Cycles a single slot's assigned game forward to the next ranked candidate. */
export function cycleSlotGame(slot: ScheduleSlot, candidates: ScheduleCandidate[]): ScheduleSlot {
  if (candidates.length === 0) return slot;
  const currentIdx = candidates.findIndex(c => c.game.id === slot.gameId);
  const next = candidates[(currentIdx + 1) % candidates.length];
  return { ...slot, ...candidateToSlotFields(next) };
}

export function clearSlotGame(slot: ScheduleSlot): ScheduleSlot {
  return {
    ...slot,
    gameId: null,
    gameName: null,
    thumbnail: undefined,
    chemistryScore: null,
    chemistryGrade: null,
    justification: null,
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toICSDateTime(d: Date): string {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}T${pad2(d.getHours())}${pad2(d.getMinutes())}00`;
}

function icsEscape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** Builds an RFC5545 .ics file (floating local time, no TZID) for every assigned slot. */
export function generateICS(slots: ScheduleSlot[]): string {
  const events = slots.filter(s => s.gameId && s.durationHours > 0);
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Game Analytics//Schedule Planner//EN',
    'CALSCALE:GREGORIAN',
  ];

  const now = new Date();
  events.forEach((slot, i) => {
    const [hh, mm] = slot.startTime.split(':').map(Number);
    const start = new Date(slot.date);
    start.setHours(hh || 0, mm || 0, 0, 0);
    const end = new Date(start.getTime() + slot.durationHours * 60 * 60 * 1000);
    const grade = slot.chemistryGrade ? ` (${slot.chemistryGrade} chemistry)` : '';

    lines.push(
      'BEGIN:VEVENT',
      `UID:ga-schedule-${slot.dayOffset}-${i}-${now.getTime()}@game-analytics`,
      `DTSTAMP:${toICSDateTime(now)}`,
      `DTSTART:${toICSDateTime(start)}`,
      `DTEND:${toICSDateTime(end)}`,
      `SUMMARY:${icsEscape(`Play ${slot.gameName}${grade}`)}`,
      `DESCRIPTION:${icsEscape(slot.justification || 'Scheduled via Game Analytics')}`,
      'END:VEVENT',
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
