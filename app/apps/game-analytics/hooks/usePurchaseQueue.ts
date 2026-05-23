'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { PurchaseQueueEntry, PurchaseIntent } from '../lib/types';
import { purchaseQueueRepository } from '../lib/purchase-queue-storage';

function sortEntries(data: PurchaseQueueEntry[]): PurchaseQueueEntry[] {
  return [...data].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
  });
}

// Migrate legacy `isMaybe` flag into the `intent` field so the rest of the app
// only has to reason about one source of truth.
function normalizeIntent(e: PurchaseQueueEntry): PurchaseQueueEntry {
  if (e.intent) return e;
  return { ...e, intent: e.isMaybe ? 'maybe' : 'committed' };
}

const priceOf = (e: PurchaseQueueEntry): number =>
  e.targetPrice ?? e.currentPrice ?? e.msrpEstimate ?? 0;

export function usePurchaseQueue(userId: string | null) {
  const [entries, setEntries] = useState<PurchaseQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Mirror of `entries` for snapshot/rollback inside async mutations.
  const entriesRef = useRef<PurchaseQueueEntry[]>([]);
  useEffect(() => { entriesRef.current = entries; }, [entries]);

  // `showLoading` only on the initial load so background re-syncs never blank the tab.
  const refresh = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const data = await purchaseQueueRepository.getAll();
      setEntries(sortEntries(data.map(normalizeIntent)));
    } catch (e) {
      console.error('Failed to load purchase queue', e);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    purchaseQueueRepository.setUserId(userId || 'local-user');
    refresh(true);
  }, [userId, refresh]);

  const addEntry = useCallback(async (
    data: Omit<PurchaseQueueEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<PurchaseQueueEntry> => {
    const entry = await purchaseQueueRepository.create(data);
    setEntries(prev => sortEntries([...prev, normalizeIntent(entry)]));
    return entry;
  }, []);

  // Optimistic: apply locally first, persist in the background, roll back on failure.
  const updateEntry = useCallback(async (
    id: string,
    updates: Partial<PurchaseQueueEntry>
  ): Promise<void> => {
    const snapshot = entriesRef.current;
    const now = new Date().toISOString();
    setEntries(prev => sortEntries(prev.map(e => e.id === id ? { ...e, ...updates, updatedAt: now } : e)));
    try {
      await purchaseQueueRepository.update(id, updates);
    } catch (e) {
      console.error('Failed to update purchase queue entry', e);
      setEntries(snapshot);
      throw e;
    }
  }, []);

  const deleteEntry = useCallback(async (id: string): Promise<void> => {
    const snapshot = entriesRef.current;
    setEntries(prev => prev.filter(e => e.id !== id));
    try {
      await purchaseQueueRepository.delete(id);
    } catch (e) {
      console.error('Failed to delete purchase queue entry', e);
      setEntries(snapshot);
      throw e;
    }
  }, []);

  const markPurchased = useCallback(async (id: string, purchasePrice?: number): Promise<void> => {
    await updateEntry(id, {
      purchased: true,
      purchasedAt: new Date().toISOString(),
      purchasePrice,
    });
  }, [updateEntry]);

  const setIntent = useCallback(async (id: string, intent: PurchaseIntent): Promise<void> => {
    // Keep the legacy flag in sync for any older client/data path.
    await updateEntry(id, { intent, isMaybe: intent === 'maybe' });
  }, [updateEntry]);

  // ── Derived buckets ──────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const notPurchased = entries.filter(e => !e.purchased);
  const activeEntries = notPurchased.filter(e => e.intent === 'committed');
  const maybeEntries = notPurchased.filter(e => e.intent === 'maybe');
  const deferredEntries = notPurchased.filter(e => e.intent === 'deferred');
  const purchasedEntries = entries.filter(e => e.purchased);

  const upcomingEntries = activeEntries.filter(e => {
    if (!e.releaseDate) return false;
    return new Date(e.releaseDate) > today;
  });

  const availableEntries = activeEntries.filter(e => {
    if (!e.releaseDate) return true;
    return new Date(e.releaseDate) <= today;
  });

  // Budget plan counts committed games only — maybe & deferred are excluded.
  const plannedSpend = activeEntries.reduce((sum, e) => sum + priceOf(e), 0);
  const maybeSpend = maybeEntries.reduce((sum, e) => sum + priceOf(e), 0);
  const deferredSpend = deferredEntries.reduce((sum, e) => sum + priceOf(e), 0);

  // releasingSoon is informational — includes every non-purchased intent.
  const releasingSoon = notPurchased.filter(e => {
    if (!e.releaseDate) return false;
    const diff = (new Date(e.releaseDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 90;
  }).length;

  return {
    entries,
    activeEntries,
    maybeEntries,
    deferredEntries,
    upcomingEntries,
    availableEntries,
    purchasedEntries,
    loading,
    plannedSpend,
    maybeSpend,
    deferredSpend,
    releasingSoon,
    addEntry,
    updateEntry,
    deleteEntry,
    markPurchased,
    setIntent,
    refresh,
  };
}
