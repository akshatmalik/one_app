'use client';

import { useState, useEffect } from 'react';
import { Category } from '../lib/types';
import { categoryRepository } from '../lib/storage';
import { useAuthContext } from '@/lib/AuthContext';

export function useCategories() {
  const { user } = useAuthContext();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Set user ID on repository when user changes
  useEffect(() => {
    categoryRepository.setUserId(user?.uid || 'local-user');
  }, [user]);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await categoryRepository.getAll();
      setCategories(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [user]);

  const createCategory = async (
    categoryData: Omit<Category, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<Category> => {
    try {
      setError(null);
      const category = await categoryRepository.create({
        ...categoryData,
        userId: user?.uid || 'local-user',
      });
      await refresh();
      return category;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>): Promise<Category> => {
    try {
      setError(null);
      const category = await categoryRepository.update(id, updates);
      await refresh();
      return category;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const deleteCategory = async (id: string): Promise<void> => {
    try {
      setError(null);
      await categoryRepository.delete(id);
      await refresh();
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  return {
    categories,
    loading,
    error,
    refresh,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
