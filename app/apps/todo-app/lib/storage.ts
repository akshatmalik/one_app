import { v4 as uuidv4 } from 'uuid';
import { Task, TaskRepository } from './types';

const STORAGE_KEY = 'todo-app-tasks';

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

export const repository = new LocalStorageRepository();
