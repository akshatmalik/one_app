import { v4 as uuidv4 } from 'uuid';
import { Task, TaskRepository } from './types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

const STORAGE_KEY = 'todo-app-tasks';

// Supabase Repository - uses cloud database
export class SupabaseRepository implements TaskRepository {
  private get supabase() {
    return getSupabase();
  }

  async getAll(): Promise<Task[]> {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .order('order', { ascending: true });

    if (error) throw error;
    return (data || []).map(this.mapFromDb);
  }

  async getByDate(date: string): Promise<Task[]> {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('date', date)
      .order('order', { ascending: true });

    if (error) throw error;
    return (data || []).map(this.mapFromDb);
  }

  async getIncompleteBefore(date: string): Promise<Task[]> {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('completed', false)
      .lt('date', date)
      .order('date', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapFromDb);
  }

  async getById(id: string): Promise<Task | null> {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data ? this.mapFromDb(data) : null;
  }

  async create(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const now = new Date().toISOString();
    const task = {
      id: uuidv4(),
      text: taskData.text,
      completed: taskData.completed,
      date: taskData.date,
      order: taskData.order,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await this.supabase
      .from('tasks')
      .insert(task)
      .select()
      .single();

    if (error) throw error;
    return this.mapFromDb(data);
  }

  async update(id: string, updates: Partial<Task>): Promise<Task> {
    const dbUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.text !== undefined) dbUpdates.text = updates.text;
    if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.order !== undefined) dbUpdates.order = updates.order;

    const { data, error } = await this.supabase
      .from('tasks')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapFromDb(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  private mapFromDb(row: Record<string, unknown>): Task {
    return {
      id: row.id as string,
      text: row.text as string,
      completed: row.completed as boolean,
      date: row.date as string,
      order: row.order as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}

// LocalStorage Repository - fallback for local development
export class LocalStorageRepository implements TaskRepository {
  async getAll(): Promise<Task[]> {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  async getByDate(date: string): Promise<Task[]> {
    const allTasks = await this.getAll();
    return allTasks.filter(task => task.date === date);
  }

  async getIncompleteBefore(date: string): Promise<Task[]> {
    const allTasks = await this.getAll();
    return allTasks.filter(task => !task.completed && task.date < date);
  }

  async getById(id: string): Promise<Task | null> {
    const allTasks = await this.getAll();
    return allTasks.find(task => task.id === id) || null;
  }

  async create(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const allTasks = await this.getAll();
    const now = new Date().toISOString();
    const task: Task = {
      ...taskData,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    allTasks.push(task);
    this.save(allTasks);
    return task;
  }

  async update(id: string, updates: Partial<Task>): Promise<Task> {
    const allTasks = await this.getAll();
    const index = allTasks.findIndex(task => task.id === id);
    if (index === -1) {
      throw new Error(`Task with id ${id} not found`);
    }
    const updatedTask = {
      ...allTasks[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    allTasks[index] = updatedTask;
    this.save(allTasks);
    return updatedTask;
  }

  async delete(id: string): Promise<void> {
    const allTasks = await this.getAll();
    const filtered = allTasks.filter(task => task.id !== id);
    this.save(filtered);
  }

  private save(tasks: Task[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }
  }
}

// Use Supabase if configured, otherwise fall back to localStorage
export const repository: TaskRepository = isSupabaseConfigured()
  ? new SupabaseRepository()
  : new LocalStorageRepository();
