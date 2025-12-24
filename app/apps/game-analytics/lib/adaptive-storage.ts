import { Game, GameRepository } from './types';
import { LocalStorageGameRepository } from './storage';
import { SupabaseGameRepository } from './supabase-storage';
import { supabase } from '@/lib/supabase';

/**
 * Adaptive repository that switches between localStorage and Supabase
 * based on authentication state.
 *
 * - Not logged in: Uses localStorage (local-only data)
 * - Logged in: Uses Supabase (cloud-synced data)
 */
class AdaptiveGameRepository implements GameRepository {
  private localStorage = new LocalStorageGameRepository();
  private supabaseStorage = new SupabaseGameRepository();

  private async getRepository(): Promise<GameRepository> {
    const { data: { user } } = await supabase.auth.getUser();
    return user ? this.supabaseStorage : this.localStorage;
  }

  async getAll(): Promise<Game[]> {
    const repo = await this.getRepository();
    return repo.getAll();
  }

  async getById(id: string): Promise<Game | null> {
    const repo = await this.getRepository();
    return repo.getById(id);
  }

  async create(game: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>): Promise<Game> {
    const repo = await this.getRepository();
    return repo.create(game);
  }

  async update(id: string, updates: Partial<Game>): Promise<Game> {
    const repo = await this.getRepository();
    return repo.update(id, updates);
  }

  async delete(id: string): Promise<void> {
    const repo = await this.getRepository();
    return repo.delete(id);
  }
}

export const gameRepository = new AdaptiveGameRepository();
