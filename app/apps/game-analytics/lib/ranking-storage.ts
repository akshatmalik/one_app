'use client';

import { v4 as uuidv4 } from 'uuid';
import { GameRanking, RatingBattle, RankingPeriod, RankingRepository, BattleRepository } from './types';
import { getFirebaseDb, isFirebaseConfigured } from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';

// ── Helper ──────────────────────────────────────────────────────────

function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(cleanUndefined) as T;
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) out[k] = cleanUndefined(v);
    }
    return out as T;
  }
  return obj;
}

// ═══════════════════════════════════════════════════════════════════
//  RANKING REPOSITORY
// ═══════════════════════════════════════════════════════════════════

const RANKING_COLLECTION = 'gameRankings';
const RANKING_LOCAL_KEY = 'game-analytics-rankings';

// Firebase ──────────────────────────────────────────────────────────

class FirebaseRankingRepository implements RankingRepository {
  private userId = '';
  private get db() { return getFirebaseDb(); }
  private get col() { return collection(this.db, RANKING_COLLECTION); }

  setUserId(userId: string) { this.userId = userId; }

  async getForPeriod(period: RankingPeriod, periodKey: string): Promise<GameRanking[]> {
    if (!this.userId) return [];
    const q = query(
      this.col,
      where('userId', '==', this.userId),
      where('period', '==', period),
      where('periodKey', '==', periodKey),
      orderBy('eloScore', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as GameRanking);
  }

  async upsert(data: Omit<GameRanking, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<GameRanking> {
    if (!this.userId) throw new Error('Not authenticated');
    // Find existing by gameId + period + periodKey
    const q = query(
      this.col,
      where('userId', '==', this.userId),
      where('gameId', '==', data.gameId),
      where('period', '==', data.period),
      where('periodKey', '==', data.periodKey),
    );
    const snap = await getDocs(q);
    const now = new Date().toISOString();

    if (!snap.empty) {
      const existing = snap.docs[0].data() as GameRanking;
      const updated: GameRanking = {
        ...existing,
        ...data,
        id: existing.id,
        userId: this.userId,
        createdAt: existing.createdAt,
        updatedAt: now,
      };
      await updateDoc(doc(this.db, RANKING_COLLECTION, existing.id), cleanUndefined({ ...data, updatedAt: now }));
      return updated;
    }

    const ranking: GameRanking = {
      ...data,
      id: uuidv4(),
      userId: this.userId,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(this.db, RANKING_COLLECTION, ranking.id), cleanUndefined(ranking));
    return ranking;
  }

  async deleteForGame(gameId: string): Promise<void> {
    if (!this.userId) return;
    const q = query(
      this.col,
      where('userId', '==', this.userId),
      where('gameId', '==', gameId),
    );
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  }
}

// LocalStorage ──────────────────────────────────────────────────────

class LocalStorageRankingRepository implements RankingRepository {
  private userId = 'local-user';
  private get key() { return `${RANKING_LOCAL_KEY}-${this.userId}`; }

  setUserId(userId: string) { this.userId = userId || 'local-user'; }

  private load(): GameRanking[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  private save(items: GameRanking[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.key, JSON.stringify(items));
  }

  async getForPeriod(period: RankingPeriod, periodKey: string): Promise<GameRanking[]> {
    return this.load()
      .filter(r => r.period === period && r.periodKey === periodKey)
      .sort((a, b) => b.eloScore - a.eloScore);
  }

  async upsert(data: Omit<GameRanking, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<GameRanking> {
    const all = this.load();
    const idx = all.findIndex(r =>
      r.gameId === data.gameId && r.period === data.period && r.periodKey === data.periodKey
    );
    const now = new Date().toISOString();

    if (idx >= 0) {
      all[idx] = { ...all[idx], ...data, updatedAt: now };
      this.save(all);
      return all[idx];
    }

    const ranking: GameRanking = {
      ...data,
      id: uuidv4(),
      userId: this.userId,
      createdAt: now,
      updatedAt: now,
    };
    all.push(ranking);
    this.save(all);
    return ranking;
  }

  async deleteForGame(gameId: string): Promise<void> {
    const all = this.load().filter(r => r.gameId !== gameId);
    this.save(all);
  }
}

// Hybrid ─────────────────────────────────────────────────────────────

class HybridRankingRepository implements RankingRepository {
  private fb = new FirebaseRankingRepository();
  private ls = new LocalStorageRankingRepository();
  private useFirebase = false;

  setUserId(userId: string) {
    const real = !!userId && userId !== 'local-user';
    this.useFirebase = real && isFirebaseConfigured();
    this.fb.setUserId(userId);
    this.ls.setUserId(userId || 'local-user');
  }

  private get repo(): RankingRepository { return this.useFirebase ? this.fb : this.ls; }

  getForPeriod(period: RankingPeriod, periodKey: string) { return this.repo.getForPeriod(period, periodKey); }
  upsert(data: Omit<GameRanking, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) { return this.repo.upsert(data); }
  deleteForGame(gameId: string) { return this.repo.deleteForGame(gameId); }
}

// ═══════════════════════════════════════════════════════════════════
//  BATTLE REPOSITORY
// ═══════════════════════════════════════════════════════════════════

const BATTLE_COLLECTION = 'ratingBattles';
const BATTLE_LOCAL_KEY = 'game-analytics-battles';

// Firebase ──────────────────────────────────────────────────────────

class FirebaseBattleRepository implements BattleRepository {
  private userId = '';
  private get db() { return getFirebaseDb(); }
  private get col() { return collection(this.db, BATTLE_COLLECTION); }

  setUserId(userId: string) { this.userId = userId; }

  async getForPeriod(period: RankingPeriod, periodKey: string): Promise<RatingBattle[]> {
    if (!this.userId) return [];
    const q = query(
      this.col,
      where('userId', '==', this.userId),
      where('period', '==', period),
      where('periodKey', '==', periodKey),
      orderBy('battleDate', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as RatingBattle);
  }

  async getPairHistory(id1: string, id2: string): Promise<RatingBattle[]> {
    if (!this.userId) return [];
    // Fetch battles where this user was involved with either game as winner
    const q1 = query(
      this.col,
      where('userId', '==', this.userId),
      where('winnerId', '==', id1),
    );
    const q2 = query(
      this.col,
      where('userId', '==', this.userId),
      where('winnerId', '==', id2),
    );
    const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const all = [
      ...s1.docs.map(d => d.data() as RatingBattle),
      ...s2.docs.map(d => d.data() as RatingBattle),
    ];
    // Filter to pairs involving both ids
    return all.filter(b =>
      (b.winnerId === id1 && b.loserId === id2) ||
      (b.winnerId === id2 && b.loserId === id1)
    );
  }

  async create(data: Omit<RatingBattle, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<RatingBattle> {
    if (!this.userId) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const battle: RatingBattle = {
      ...data,
      id: uuidv4(),
      userId: this.userId,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(this.db, BATTLE_COLLECTION, battle.id), cleanUndefined(battle));
    return battle;
  }
}

// LocalStorage ──────────────────────────────────────────────────────

class LocalStorageBattleRepository implements BattleRepository {
  private userId = 'local-user';
  private get key() { return `${BATTLE_LOCAL_KEY}-${this.userId}`; }

  setUserId(userId: string) { this.userId = userId || 'local-user'; }

  private load(): RatingBattle[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  private save(items: RatingBattle[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.key, JSON.stringify(items));
  }

  async getForPeriod(period: RankingPeriod, periodKey: string): Promise<RatingBattle[]> {
    return this.load()
      .filter(b => b.period === period && b.periodKey === periodKey)
      .sort((a, b) => b.battleDate.localeCompare(a.battleDate));
  }

  async getPairHistory(id1: string, id2: string): Promise<RatingBattle[]> {
    return this.load().filter(b =>
      (b.winnerId === id1 && b.loserId === id2) ||
      (b.winnerId === id2 && b.loserId === id1)
    );
  }

  async create(data: Omit<RatingBattle, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<RatingBattle> {
    const all = this.load();
    const now = new Date().toISOString();
    const battle: RatingBattle = {
      ...data,
      id: uuidv4(),
      userId: this.userId,
      createdAt: now,
      updatedAt: now,
    };
    all.push(battle);
    this.save(all);
    return battle;
  }
}

// Hybrid ─────────────────────────────────────────────────────────────

class HybridBattleRepository implements BattleRepository {
  private fb = new FirebaseBattleRepository();
  private ls = new LocalStorageBattleRepository();
  private useFirebase = false;

  setUserId(userId: string) {
    const real = !!userId && userId !== 'local-user';
    this.useFirebase = real && isFirebaseConfigured();
    this.fb.setUserId(userId);
    this.ls.setUserId(userId || 'local-user');
  }

  private get repo(): BattleRepository { return this.useFirebase ? this.fb : this.ls; }

  getForPeriod(period: RankingPeriod, periodKey: string) { return this.repo.getForPeriod(period, periodKey); }
  getPairHistory(id1: string, id2: string) { return this.repo.getPairHistory(id1, id2); }
  create(data: Omit<RatingBattle, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) { return this.repo.create(data); }
}

// ── Singletons ──────────────────────────────────────────────────────

export const rankingRepository: RankingRepository = new HybridRankingRepository();
export const battleRepository: BattleRepository = new HybridBattleRepository();
