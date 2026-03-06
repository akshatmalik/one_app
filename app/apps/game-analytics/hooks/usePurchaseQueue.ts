'use client';

import { useState, useEffect, useCallback } from 'react';
import { PurchaseQueueEntry } from '../lib/types';
import { purchaseQueueRepository } from '../lib/purchase-queue-storage';

export function usePurchaseQueue(userId: string | null) {
  const [entries, setEntries] = useState<PurchaseQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await purchaseQueueRepository.getAll();
      // Sort by priority ascending, then by addedAt
      data.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
      });
      setEntries(data);
    } catch (e) {
      console.error('Failed to load purchase queue', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    purchaseQueueRepository.setUserId(userId || 'local-user');
    refresh();
  }, [userId, refresh]);

  const addEntry = useCallback(async (
    data: Omit<PurchaseQueueEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<PurchaseQueueEntry> => {
    const entry = await purchaseQueueRepository.create(data);
    await refresh();
    return entry;
  }, [refresh]);

  const updateEntry = useCallback(async (
    id: string,
    updates: Partial<PurchaseQueueEntry>
  ): Promise<void> => {
    await purchaseQueueRepository.update(id, updates);
    await refresh();
  }, [refresh]);

  const deleteEntry = useCallback(async (id: string): Promise<void> => {
    await purchaseQueueRepository.delete(id);
    await refresh();
  }, [refresh]);

  const markPurchased = useCallback(async (id: string, purchasePrice?: number): Promise<void> => {
    await purchaseQueueRepository.update(id, {
      purchased: true,
      purchasedAt: new Date().toISOString(),
      purchasePrice,
    });
    await refresh();
  }, [refresh]);

  // Derived: entries split into upcoming vs released/price-watch
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeEntries = entries.filter(e => !e.purchased);
  const purchasedEntries = entries.filter(e => e.purchased);

  const upcomingEntries = activeEntries.filter(e => {
    if (!e.releaseDate) return false;
    const rel = new Date(e.releaseDate);
    return rel > today;
  });

  const availableEntries = activeEntries.filter(e => {
    if (!e.releaseDate) return true;
    const rel = new Date(e.releaseDate);
    return rel <= today;
  });

  // Quick stats
  const plannedSpend = activeEntries.reduce((sum, e) => {
    const price = e.targetPrice ?? e.currentPrice ?? e.msrpEstimate ?? 0;
    return sum + price;
  }, 0);

  const releasingSoon = upcomingEntries.filter(e => {
    if (!e.releaseDate) return false;
    const rel = new Date(e.releaseDate);
    const diff = (rel.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 90;
  }).length;

  return {
    entries,
    activeEntries,
    upcomingEntries,
    availableEntries,
    purchasedEntries,
    loading,
    plannedSpend,
    releasingSoon,
    addEntry,
    updateEntry,
    deleteEntry,
    markPurchased,
    refresh,
  };
}
