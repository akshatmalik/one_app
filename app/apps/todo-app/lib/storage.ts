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

// Firebase Repository - schemaless, just write data
export class FirebaseRepository implements TaskRepository {
  private get db() {
    return getFirebaseDb();
  }

  private get tasksCollection() {
    return collection(this.db, COLLECTION_NAME);
  }

  async getAll(): Promise<Task[]> {
    const q = query(this.tasksCollection, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Task);
  }

  async getByDate(date: string): Promise<Task[]> {
    const q = query(
      this.tasksCollection,
      where('date', '==', date),
      orderBy('order', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Task);
  }

  async getIncompleteBefore(date: string): Promise<Task[]> {
    const q = query(
      this.tasksCollection,
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
    return snapshot.exists() ? (snapshot.data() as Task) : null;
  }

  async create(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const now = new Date().toISOString();
    const task: Task = {
      ...taskData,
      id: uuidv4(),
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

// Use Firebase if configured, otherwise fall back to localStorage
export const repository: TaskRepository = isFirebaseConfigured()
  ? new FirebaseRepository()
  : new LocalStorageRepository();
