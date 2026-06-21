'use client';

/**
 * "Rival Check" — encode a compact, shareable snapshot of your library stats
 * into a short text code a friend can paste back in for a head-to-head
 * comparison. No accounts, no server round-trip: just a base64url-encoded
 * JSON blob of aggregate numbers (never the underlying game list), built
 * entirely from calculateSummary/getGamingCreditScore/getGenreMastery — no
 * changes to those functions or to lib/types.ts.
 */

import { Game } from './types';
import { calculateSummary, getGamingCreditScore, getGenreMastery } from './calculations';

export const VERSUS_CODE_VERSION = 1;

export interface VersusSnapshot {
  v: number;
  name: string;
  totalGames: number;
  ownedCount: number;
  totalHours: number;
  totalSpent: number;
  avgCostPerHour: number;
  avgRating: number;
  completionRate: number; // 0-1
  creditScore: number;
  creditLabel: string;
  mainClass: string | null;
  mainClassLevel: number;
  topGame: { name: string; hours: number } | null;
  bestValueGame: { name: string; costPerHour: number } | null;
  generatedAt: string;
}

export function buildVersusSnapshot(games: Game[], name: string): VersusSnapshot {
  const summary = calculateSummary(games);
  const credit = getGamingCreditScore(games);
  const mainClass = getGenreMastery(games).mainClass;

  return {
    v: VERSUS_CODE_VERSION,
    name: name.trim().slice(0, 24) || 'Player',
    totalGames: summary.totalGames,
    ownedCount: summary.ownedCount,
    totalHours: summary.totalHours,
    totalSpent: summary.totalSpent,
    avgCostPerHour: summary.averageCostPerHour,
    avgRating: summary.averageRating,
    completionRate: summary.completionRate,
    creditScore: credit.score,
    creditLabel: credit.label,
    mainClass: mainClass ? mainClass.genre : null,
    mainClassLevel: mainClass ? mainClass.level : 0,
    topGame: summary.mostPlayed,
    bestValueGame: summary.bestValue,
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

export function encodeVersusCode(snapshot: VersusSnapshot): string {
  try {
    return toBase64Url(JSON.stringify(snapshot));
  } catch {
    return '';
  }
}

function isValidSnapshot(value: unknown): value is VersusSnapshot {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.v === 'number' &&
    typeof s.name === 'string' &&
    typeof s.totalGames === 'number' &&
    typeof s.totalHours === 'number' &&
    typeof s.totalSpent === 'number' &&
    typeof s.avgCostPerHour === 'number' &&
    typeof s.avgRating === 'number' &&
    typeof s.completionRate === 'number' &&
    typeof s.creditScore === 'number'
  );
}

export function decodeVersusCode(code: string): VersusSnapshot | null {
  const trimmed = code.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(trimmed));
    return isValidSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
