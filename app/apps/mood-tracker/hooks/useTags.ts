'use client';

import { useState, useEffect } from 'react';
import { Tag } from '../lib/types';
import { tagRepository } from '../lib/storage';
import { useAuthContext } from '@/lib/AuthContext';

export function useTags() {
  const { user } = useAuthContext();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Set user ID on repository when user changes
  useEffect(() => {
    tagRepository.setUserId(user?.uid || 'local-user');
  }, [user]);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tagRepository.getAll();
      setTags(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [user]);

  const getByCategoryId = async (categoryId: string): Promise<Tag[]> => {
    try {
      setError(null);
      return await tagRepository.getByCategoryId(categoryId);
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const createTag = async (
    tagData: Omit<Tag, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<Tag> => {
    try {
      setError(null);
      const tag = await tagRepository.create({
        ...tagData,
        userId: user?.uid || 'local-user',
      });
      await refresh();
      return tag;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const updateTag = async (id: string, updates: Partial<Tag>): Promise<Tag> => {
    try {
      setError(null);
      const tag = await tagRepository.update(id, updates);
      await refresh();
      return tag;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const deleteTag = async (id: string): Promise<void> => {
    try {
      setError(null);
      await tagRepository.delete(id);
      await refresh();
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  return {
    tags,
    loading,
    error,
    refresh,
    getByCategoryId,
    createTag,
    updateTag,
    deleteTag,
  };
}
