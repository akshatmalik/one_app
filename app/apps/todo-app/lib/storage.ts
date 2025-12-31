import { v4 as uuidv4 } from 'uuid';
import { Task, TaskRepository } from './types';
import { getFirebaseDb, isFirebaseConfigured } from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';

const STORAGE_KEY = 'todo-app-tasks';
const COLLECTION_NAME = 'tasks';

// Firebase Repository - filters by userId
export class FirebaseRepository implements TaskRepository {
  private userId: string = '';

  private get db() {
    return getFirebaseDb();
  }

  private get tasksCollection() {
    return collection(this.db, COLLECTION_NAME);
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  async getAll(): Promise<Task[]> {
    if (!this.userId) return [];
    const q = query(
      this.tasksCollection,
      where('userId', '==', this.userId),
      orderBy('order', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Task);
  }

  async getByDate(date: string): Promise<Task[]> {
    if (!this.userId) return [];
    const q = query(
      this.tasksCollection,
      where('userId', '==', this.userId),
      where('date', '==', date),
      orderBy('order', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Task);
  }

  async getIncompleteBefore(date: string): Promise<Task[]> {
    if (!this.userId) return [];
    const q = query(
      this.tasksCollection,
      where('userId', '==', this.userId),
      where('completed', '==', false),
      where('date', '<', date),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Task);
  }

  async getById(id: string): Promise<Task | null> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const task = snapshot.data() as Task;
    // Only return if belongs to current user
    return task.userId === this.userId ? task : null;
  }

  async create(taskData: Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    if (!this.userId) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const task: Task = {
      ...taskData,
      id: uuidv4(),
      userId: this.userId,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(this.db, COLLECTION_NAME, task.id), task);
    return task;
  }

  async update(id: string, updates: Partial<Task>): Promise<Task> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(docRef, updateData);

    const updated = await getDoc(docRef);
    return updated.data() as Task;
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.db, COLLECTION_NAME, id));
  }
}

// LocalStorage Repository - for local dev (no auth needed)
export class LocalStorageRepository implements TaskRepository {
  private userId: string = 'local-user';

  setUserId(userId: string): void {
    this.userId = userId;
  }

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

  async create(taskData: Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const allTasks = await this.getAll();
    const now = new Date().toISOString();
    const task: Task = {
      ...taskData,
      id: uuidv4(),
      userId: this.userId,
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

// Export singleton
export const repository: TaskRepository = isFirebaseConfigured()
  ? new FirebaseRepository()
  : new LocalStorageRepository();
