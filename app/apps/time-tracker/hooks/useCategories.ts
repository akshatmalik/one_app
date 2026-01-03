'use client';

import { useState, useEffect } from 'react';
import { Category } from '../lib/types';
import { categoryRepository } from '../lib/storage';
import { useAuthContext } from '@/lib/AuthContext';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuthContext();

  // Set userId when user changes
  useEffect(() => {
    categoryRepository.setUserId(user?.uid || 'local-user');
  }, [user]);

  const refresh = async () => {
    try {
      setLoading(true);
      const data = await categoryRepository.getAll();
      setCategories(data);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [user]);

  const addCategory = async (data: Omit<Category, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    try {
      const category = await categoryRepository.create({ ...data, userId: user?.uid || 'local-user' });
      await refresh();
      return category;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      const category = await categoryRepository.update(id, updates);
      await refresh();
      return category;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await categoryRepository.delete(id);
      await refresh();
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const getCategoryById = (id: string): Category | undefined => {
    return categories.find(c => c.id === id);
  };

  return {
    categories,
    loading,
    error,
    refresh,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
  };
}
