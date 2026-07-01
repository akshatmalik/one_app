'use client';

/**
 * "Game Night" — Co-Op Match Finder. Two players exchange a compact code
 * (no accounts, no server) listing the games they actually own, so the app
 * can figure out what you BOTH have and could play together tonight.
 *
 * This is a deliberate, explicit exception to the "never share the
 * underlying game list" rule in versus-codes.ts — here the whole point is
 * to compare libraries, and the user opts in every time they generate a
 * code. Only compact, low-sensitivity fields travel (name/genre/platform/
 * status/hours/rating) — no price, notes, reviews, or dates.
 */

import { Game } from './types';
import { getTotalHours } from './calculations';

export const COOP_CODE_VERSION = 1;

export interface CoOpGameEntry {
  name: string;
  genre?: string;
  platform?: string;
  status: Game['status'];
  hours: number;
  rating: number;
}

export interface CoOpLibrarySnapshot {
  v: number;
  name: string;
  games: CoOpGameEntry[];
  generatedAt: string;
}

const PLAYABLE_STATUSES: Game['status'][] = ['Not Started', 'In Progress', 'Completed', 'Pick Up Later'];

export function buildCoOpSnapshot(games: Game[], name: string): CoOpLibrarySnapshot {
  const entries: CoOpGameEntry[] = games
    .filter(g => PLAYABLE_STATUSES.includes(g.status))
    .map(g => ({
      name: g.name,
      genre: g.genre,
      platform: g.platform,
      status: g.status,
      hours: Math.round(getTotalHours(g) * 10) / 10,
      rating: g.rating,
    }));

  return {
    v: COOP_CODE_VERSION,
    name: name.trim().slice(0, 24) || 'Player',
    games: entries,
    generatedAt: new Date().toISOString(),
  };
}

function toBase64Url(input: string): string {
  const b64 = btoa(unescape(encodeURIComponent(input)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return decodeURIComponent(escape(atob(padded + pad)));
}

export function encodeCoOpCode(snapshot: CoOpLibrarySnapshot): string {
  try {
    return toBase64Url(JSON.stringify(snapshot));
  } catch {
    return '';
  }
}

function isValidEntry(value: unknown): value is CoOpGameEntry {
  if (!value || typeof value !== 'object') return false;
  const e = value as Record<string, unknown>;
  return typeof e.name === 'string' && typeof e.status === 'string' && typeof e.hours === 'number' && typeof e.rating === 'number';
}

function isValidSnapshot(value: unknown): value is CoOpLibrarySnapshot {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.v === 'number' &&
    typeof s.name === 'string' &&
    Array.isArray(s.games) &&
    s.games.every(isValidEntry)
  );
}

export function decodeCoOpCode(code: string): CoOpLibrarySnapshot | null {
  const trimmed = code.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(trimmed));
    return isValidSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// ── Matching ─────────────────────────────────────────────────────────

export type MatchRelation = 'both-unplayed' | 'both-playing' | 'one-finished' | 'both-finished' | 'mismatched-progress';

export interface CoOpMatch {
  name: string;
  genre?: string;
  platform?: string;
  myStatus: Game['status'];
  myHours: number;
  myRating: number;
  theirStatus: Game['status'];
  theirHours: number;
  theirRating: number;
  relation: MatchRelation;
  /** Higher = better pick for tonight: both own it and neither has finished it. */
  tonightScore: number;
}

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function classifyRelation(myStatus: Game['status'], theirStatus: Game['status']): MatchRelation {
  const finished = (s: Game['status']) => s === 'Completed';
  // 'Pick Up Later' is a paused-but-not-finished game — still counts as "playing" for match purposes.
  const playing = (s: Game['status']) => s === 'In Progress' || s === 'Pick Up Later';
  if (finished(myStatus) && finished(theirStatus)) return 'both-finished';
  if (finished(myStatus) || finished(theirStatus)) return 'one-finished';
  if (myStatus === 'Not Started' && theirStatus === 'Not Started') return 'both-unplayed';
  if (playing(myStatus) && playing(theirStatus)) return 'both-playing';
  return 'mismatched-progress';
}

function tonightScore(relation: MatchRelation, myHours: number, theirHours: number): number {
  // Reward "fresh together" pairs, lightly reward "in progress together" pairs,
  // and penalize anything where one of you has already finished it.
  switch (relation) {
    case 'both-unplayed': return 100;
    case 'both-playing': return 80 - Math.min(40, Math.abs(myHours - theirHours));
    case 'mismatched-progress': return 50;
    case 'one-finished': return 15;
    case 'both-finished': return 5;
    default: return 0;
  }
}

export interface CoOpMatchResult {
  matches: CoOpMatch[];
  compatibilityScore: number; // 0-100, overlap size weighted by shared genre taste
  sharedGenres: { genre: string; count: number }[];
  myLibrarySize: number;
  theirLibrarySize: number;
}

export function computeCoOpMatches(myGames: Game[], theirSnapshot: CoOpLibrarySnapshot): CoOpMatchResult {
  const myEntries = myGames
    .filter(g => PLAYABLE_STATUSES.includes(g.status))
    .map(g => ({
      name: g.name,
      genre: g.genre,
      platform: g.platform,
      status: g.status,
      hours: Math.round(getTotalHours(g) * 10) / 10,
      rating: g.rating,
    }));

  const theirByKey = new Map<string, CoOpGameEntry>();
  for (const entry of theirSnapshot.games) {
    theirByKey.set(normalize(entry.name), entry);
  }

  const matches: CoOpMatch[] = [];
  for (const mine of myEntries) {
    const theirs = theirByKey.get(normalize(mine.name));
    if (!theirs) continue;
    const relation = classifyRelation(mine.status, theirs.status);
    matches.push({
      name: mine.name,
      genre: mine.genre ?? theirs.genre,
      platform: mine.platform ?? theirs.platform,
      myStatus: mine.status,
      myHours: mine.hours,
      myRating: mine.rating,
      theirStatus: theirs.status,
      theirHours: theirs.hours,
      theirRating: theirs.rating,
      relation,
      tonightScore: tonightScore(relation, mine.hours, theirs.hours),
    });
  }

  matches.sort((a, b) => b.tonightScore - a.tonightScore);

  const genreCounts = new Map<string, number>();
  for (const m of matches) {
    if (!m.genre) continue;
    genreCounts.set(m.genre, (genreCounts.get(m.genre) ?? 0) + 1);
  }
  const sharedGenres = Array.from(genreCounts.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);

  const unionSize = new Set([
    ...myEntries.map(e => normalize(e.name)),
    ...theirSnapshot.games.map(e => normalize(e.name)),
  ]).size;
  const overlapRatio = unionSize > 0 ? matches.length / unionSize : 0;
  const genreBonus = Math.min(20, sharedGenres.length * 4);
  const compatibilityScore = Math.round(Math.min(100, overlapRatio * 80 + genreBonus));

  return {
    matches,
    compatibilityScore,
    sharedGenres,
    myLibrarySize: myEntries.length,
    theirLibrarySize: theirSnapshot.games.length,
  };
}

/** Restrict to games neither of you has finished — the actual "what to play tonight" pool. */
export function getTonightCandidates(matches: CoOpMatch[]): CoOpMatch[] {
  return matches.filter(m => m.relation !== 'both-finished' && m.relation !== 'one-finished');
}
