import { supabase } from '@/lib/supabase';
import { Game, GameRepository } from './types';

export class SupabaseGameRepository implements GameRepository {
  async getAll(): Promise<Game[]> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching games:', error);
      return [];
    }

    // Transform snake_case to camelCase
    return (data || []).map(game => ({
      id: game.id,
      name: game.name,
      price: parseFloat(game.price),
      hours: parseFloat(game.hours),
      rating: game.rating,
      status: game.status,
      notes: game.notes,
      datePurchased: game.date_purchased,
      imageUrl: game.image_url,
      createdAt: game.created_at,
      updatedAt: game.updated_at,
    }));
  }

  async getById(id: string): Promise<Game | null> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      console.error('Error fetching game:', error);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      price: parseFloat(data.price),
      hours: parseFloat(data.hours),
      rating: data.rating,
      status: data.status,
      notes: data.notes,
      datePurchased: data.date_purchased,
      imageUrl: data.image_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async create(game: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>): Promise<Game> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Transform camelCase to snake_case for database
    const { data, error } = await supabase
      .from('games')
      .insert([{
        user_id: user.id,
        name: game.name,
        price: game.price,
        hours: game.hours,
        rating: game.rating,
        status: game.status,
        notes: game.notes,
        date_purchased: game.datePurchased,
        image_url: game.imageUrl,
      }])
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating game:', error);
      throw new Error('Failed to create game');
    }

    return {
      id: data.id,
      name: data.name,
      price: parseFloat(data.price),
      hours: parseFloat(data.hours),
      rating: data.rating,
      status: data.status,
      notes: data.notes,
      datePurchased: data.date_purchased,
      imageUrl: data.image_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async update(id: string, updates: Partial<Game>): Promise<Game> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Transform camelCase to snake_case
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.hours !== undefined) dbUpdates.hours = updates.hours;
    if (updates.rating !== undefined) dbUpdates.rating = updates.rating;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.datePurchased !== undefined) dbUpdates.date_purchased = updates.datePurchased;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;

    const { data, error } = await supabase
      .from('games')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating game:', error);
      throw new Error('Failed to update game');
    }

    return {
      id: data.id,
      name: data.name,
      price: parseFloat(data.price),
      hours: parseFloat(data.hours),
      rating: data.rating,
      status: data.status,
      notes: data.notes,
      datePurchased: data.date_purchased,
      imageUrl: data.image_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async delete(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('games')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting game:', error);
      throw new Error('Failed to delete game');
    }
  }
}

export const supabaseGameRepository = new SupabaseGameRepository();
