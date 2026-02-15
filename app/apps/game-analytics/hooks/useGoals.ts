'use client';

import { useState, useEffect, useCallback } from 'react';
import { GamingGoal } from '../lib/types';
import { goalRepository } from '../lib/goals-storage';

export function useGoals(userId: string | null) {
  const [goals, setGoals] = useState<GamingGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      goalRepository.setUserId(userId || '');
      const data = await goalRepository.getAll();
      setGoals(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addGoal = async (data: Omit<GamingGoal, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      goalRepository.setUserId(userId || '');
      const goal = await goalRepository.create(data);
      await refresh();
      return goal;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const updateGoal = async (id: string, updates: Partial<GamingGoal>) => {
    try {
      goalRepository.setUserId(userId || '');
      const goal = await goalRepository.update(id, updates);
      await refresh();
      return goal;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      goalRepository.setUserId(userId || '');
      await goalRepository.delete(id);
      await refresh();
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  return {
    goals,
    loading,
    error,
    addGoal,
    updateGoal,
    deleteGoal,
    refresh,
  };
}
