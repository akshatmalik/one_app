'use client';

import { useState, useEffect, useCallback } from 'react';
import { BudgetSettings } from '../lib/types';
import { budgetRepository } from '../lib/budget-storage';

export function useBudget(userId: string | null) {
  const [budgets, setBudgets] = useState<BudgetSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      budgetRepository.setUserId(userId || '');
      const data = await budgetRepository.getAll();
      setBudgets(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setBudget = async (year: number, amount: number) => {
    try {
      budgetRepository.setUserId(userId || '');
      await budgetRepository.set(year, amount);
      await refresh();
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const deleteBudget = async (year: number) => {
    try {
      budgetRepository.setUserId(userId || '');
      await budgetRepository.delete(year);
      await refresh();
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const getBudgetForYear = (year: number): BudgetSettings | undefined => {
    return budgets.find(b => b.year === year);
  };

  return {
    budgets,
    loading,
    error,
    setBudget,
    deleteBudget,
    getBudgetForYear,
    refresh,
  };
}
