'use client';

/**
 * Squad Leaderboard — saved Rival Check codes, kept around so a head-to-head
 * comparison can become an ongoing N-way leaderboard instead of a one-shot
 * paste. Device-local only (localStorage, no Firestore rule) — same precedent
 * as queue-preferences.ts/estimator-settings.ts: this is personal planning
 * data, not core game data, and each rival's code is just a re-paste of their
 * own Rival Check export (no server, no accounts).
 */

import { VersusSnapshot, decodeVersusCode } from './versus-codes';

export interface SquadMember {
  id: string;
  code: string;          // the raw pasted Rival Check code (re-decoded on load so stats stay in sync if re-pasted)
  snapshot: VersusSnapshot;
  addedAt: string;        // ISO date
}

const keyFor = (userId: string) => `ga-squad-rivals-${userId || 'local-user'}`;

function isValidMember(value: unknown): value is SquadMember {
  if (!value || typeof value !== 'object') return false;
  const m = value as Record<string, unknown>;
  return typeof m.id === 'string' && typeof m.code === 'string' && typeof m.addedAt === 'string' && !!m.snapshot;
}

export function getSquadMembers(userId: string): SquadMember[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidMember);
  } catch {
    return [];
  }
}

function saveSquadMembers(userId: string, members: SquadMember[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(members));
  } catch {
    /* ignore quota / disabled storage */
  }
}

/** Adds a rival from a pasted code. Returns null if the code is invalid. */
export function addSquadMember(userId: string, code: string): SquadMember | null {
  const snapshot = decodeVersusCode(code);
  if (!snapshot) return null;
  const members = getSquadMembers(userId);
  const member: SquadMember = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    code: code.trim(),
    snapshot,
    addedAt: new Date().toISOString(),
  };
  saveSquadMembers(userId, [...members, member]);
  return member;
}

/** Re-decodes a member's stored code against a freshly pasted (presumably updated) code. */
export function refreshSquadMember(userId: string, id: string, newCode: string): SquadMember | null {
  const snapshot = decodeVersusCode(newCode);
  if (!snapshot) return null;
  const members = getSquadMembers(userId);
  const idx = members.findIndex(m => m.id === id);
  if (idx === -1) return null;
  const updated: SquadMember = { ...members[idx], code: newCode.trim(), snapshot };
  const next = [...members];
  next[idx] = updated;
  saveSquadMembers(userId, next);
  return updated;
}

export function removeSquadMember(userId: string, id: string): void {
  const members = getSquadMembers(userId);
  saveSquadMembers(userId, members.filter(m => m.id !== id));
}
