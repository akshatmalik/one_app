'use client';

/**
 * Squad Challenges — time-bound, delta-based competitions layered on top of
 * the existing Squad Leaderboard (squad-storage.ts) and Rival Check
 * snapshots (versus-codes.ts). A VersusSnapshot is a single all-time-totals
 * point-in-time export with no built-in time-series concept, so a challenge
 * works around that by freezing a baseline snapshot for every participant
 * at start time — standings are always "current minus baseline" for the
 * chosen metric, computed live against whatever snapshot each participant
 * currently has (refreshed via squad-storage's refreshSquadMember when a
 * friend re-shares an updated code). Device-local only (localStorage, no
 * Firestore rule) — same precedent as squad-storage.ts.
 */

import { VersusSnapshot } from './versus-codes';
import { formatCurrency, formatHours } from './format';

export type ChallengeMetric = 'hours' | 'creditScore' | 'library' | 'spend';

export interface ChallengeMetricDef {
  key: ChallengeMetric;
  label: string;
  shortLabel: string;
  description: string;
  lowerBetter: boolean;
  value: (s: VersusSnapshot) => number;
  formatDelta: (delta: number) => string;
}

export const CHALLENGE_METRICS: ChallengeMetricDef[] = [
  {
    key: 'hours',
    label: 'Most Hours Played',
    shortLabel: 'Hours',
    description: 'Whoever logs the most hours before the clock runs out wins.',
    lowerBetter: false,
    value: s => s.totalHours,
    formatDelta: d => `${d >= 0 ? '+' : '-'}${formatHours(Math.abs(d))}`,
  },
  {
    key: 'creditScore',
    label: 'Biggest Credit Score Gain',
    shortLabel: 'Credit',
    description: 'Improve your Gaming Credit Score the most to take the crown.',
    lowerBetter: false,
    value: s => s.creditScore,
    formatDelta: d => `${d >= 0 ? '+' : '-'}${Math.round(Math.abs(d))} pts`,
  },
  {
    key: 'library',
    label: 'Most Games Added',
    shortLabel: 'Library',
    description: 'Grow your library the fastest — most new owned games wins.',
    lowerBetter: false,
    value: s => s.ownedCount,
    formatDelta: d => `${d >= 0 ? '+' : '-'}${Math.round(Math.abs(d))} game${Math.round(Math.abs(d)) === 1 ? '' : 's'}`,
  },
  {
    key: 'spend',
    label: 'Lowest Additional Spend',
    shortLabel: 'Frugality',
    description: 'A frugality challenge — whoever spends the least new money wins.',
    lowerBetter: true,
    value: s => s.totalSpent,
    formatDelta: d => `${d > 0 ? '+' : ''}${formatCurrency(d)}`,
  },
];

export function getChallengeMetric(key: ChallengeMetric): ChallengeMetricDef {
  return CHALLENGE_METRICS.find(m => m.key === key) ?? CHALLENGE_METRICS[0];
}

export interface ChallengeParticipantBaseline {
  id: string; // 'me' or a squad member id
  name: string;
  baseline: VersusSnapshot;
}

export interface SquadChallenge {
  id: string;
  metric: ChallengeMetric;
  durationDays: number;
  startedAt: string; // ISO
  endsAt: string; // ISO
  participants: ChallengeParticipantBaseline[];
}

const keyFor = (userId: string) => `ga-squad-challenge-${userId || 'local-user'}`;

function isValidParticipant(value: unknown): value is ChallengeParticipantBaseline {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return typeof p.id === 'string' && typeof p.name === 'string' && !!p.baseline;
}

function isValidChallenge(value: unknown): value is SquadChallenge {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.id === 'string' &&
    typeof c.metric === 'string' &&
    typeof c.durationDays === 'number' &&
    typeof c.startedAt === 'string' &&
    typeof c.endsAt === 'string' &&
    Array.isArray(c.participants) &&
    c.participants.every(isValidParticipant)
  );
}

export function getActiveChallenge(userId: string): SquadChallenge | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidChallenge(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveChallenge(userId: string, challenge: SquadChallenge | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (challenge) {
      localStorage.setItem(keyFor(userId), JSON.stringify(challenge));
    } else {
      localStorage.removeItem(keyFor(userId));
    }
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function startChallenge(
  userId: string,
  metric: ChallengeMetric,
  durationDays: number,
  participants: { id: string; name: string; baseline: VersusSnapshot }[]
): SquadChallenge {
  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const challenge: SquadChallenge = {
    id: `${startedAt.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    metric,
    durationDays,
    startedAt: startedAt.toISOString(),
    endsAt: endsAt.toISOString(),
    participants,
  };
  saveChallenge(userId, challenge);
  return challenge;
}

export function clearChallenge(userId: string): void {
  saveChallenge(userId, null);
}

export interface ChallengeStanding {
  id: string;
  name: string;
  isMe: boolean;
  baselineValue: number;
  currentValue: number;
  delta: number;
  formattedDelta: string;
  rank: number;
  isLeader: boolean;
}

export function getChallengeStatus(challenge: SquadChallenge): { daysLeft: number; isOver: boolean } {
  const msLeft = new Date(challenge.endsAt).getTime() - Date.now();
  return {
    daysLeft: Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000))),
    isOver: msLeft <= 0,
  };
}

/**
 * Computes ranked, delta-based standings. `current` should include the
 * latest known snapshot for every challenge participant — for squad
 * members who haven't refreshed their code since the challenge started,
 * pass their baseline back as "current" so they simply show a 0 delta
 * rather than disappearing from the board.
 */
export function computeChallengeStandings(
  challenge: SquadChallenge,
  current: { id: string; snapshot: VersusSnapshot }[]
): ChallengeStanding[] {
  const metric = getChallengeMetric(challenge.metric);
  const currentById = new Map(current.map(c => [c.id, c.snapshot]));

  const rows = challenge.participants.map(p => {
    const currentSnapshot = currentById.get(p.id) ?? p.baseline;
    const baselineValue = metric.value(p.baseline);
    const currentValue = metric.value(currentSnapshot);
    const delta = currentValue - baselineValue;
    return { id: p.id, name: p.name, isMe: p.id === 'me', baselineValue, currentValue, delta };
  });

  const sorted = [...rows].sort((a, b) => (metric.lowerBetter ? a.delta - b.delta : b.delta - a.delta));
  const bestDelta = sorted.length > 0 ? sorted[0].delta : 0;

  return sorted.map((row, idx) => ({
    ...row,
    formattedDelta: metric.formatDelta(row.delta),
    rank: idx + 1,
    isLeader: row.delta === bestDelta,
  }));
}
