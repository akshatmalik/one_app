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

  async getCompletedInRange(startDate: string, endDate: string): Promise<Task[]> {
    if (!this.userId) return [];
    const q = query(
      this.tasksCollection,
      where('userId', '==', this.userId),
      where('completed', '==', true),
      where('completedAt', '>=', startDate),
      where('completedAt', '<=', endDate),
      orderBy('completedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Task);
  }

  async getAllCompleted(): Promise<Task[]> {
    if (!this.userId) return [];
    const q = query(
      this.tasksCollection,
      where('userId', '==', this.userId),
      where('completed', '==', true),
      orderBy('completedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Task);
  }

  async create(taskData: Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    if (!this.userId) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const task: Task = {
      ...taskData,
      priority: taskData.priority ?? 4,
      points: taskData.points ?? 1,
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

    // Filter out undefined values - Firestore doesn't accept them
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }
    cleanUpdates.updatedAt = new Date().toISOString();

    // Set completedAt when task is marked as completed
    if (updates.completed === true && !cleanUpdates.completedAt) {
      cleanUpdates.completedAt = new Date().toISOString();
    }
    // Clear completedAt when task is uncompleted
    if (updates.completed === false) {
      cleanUpdates.completedAt = null;
    }

    await updateDoc(docRef, cleanUpdates);

    const updated = await getDoc(docRef);
    return updated.data() as Task;
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.db, COLLECTION_NAME, id));
  }
}

// LocalStorage Repository - for local mode (no auth needed)
export class LocalStorageRepository implements TaskRepository {
  private userId: string = 'local-user';

  setUserId(userId: string): void {
    this.userId = userId || 'local-user';
  }

  private getStorageKey(): string {
    return `${STORAGE_KEY}-${this.userId}`;
  }

  async getAll(): Promise<Task[]> {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.getStorageKey());
    return data ? JSON.parse(data) : [];
  }

  async getByDate(date: string): Promise<Task[]> {
    const allTasks = await this.getAll();
    return allTasks
      .filter(task => task.date === date)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  async getIncompleteBefore(date: string): Promise<Task[]> {
    const allTasks = await this.getAll();
    return allTasks.filter(task => !task.completed && task.date < date);
  }

  async getById(id: string): Promise<Task | null> {
    const allTasks = await this.getAll();
    return allTasks.find(task => task.id === id) || null;
  }

  async getCompletedInRange(startDate: string, endDate: string): Promise<Task[]> {
    const allTasks = await this.getAll();
    return allTasks.filter(task =>
      task.completed &&
      task.completedAt &&
      task.completedAt >= startDate &&
      task.completedAt <= endDate
    ).sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
  }

  async getAllCompleted(): Promise<Task[]> {
    const allTasks = await this.getAll();
    return allTasks.filter(task => task.completed)
      .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
  }

  async create(taskData: Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const allTasks = await this.getAll();
    const now = new Date().toISOString();
    const task: Task = {
      ...taskData,
      priority: taskData.priority ?? 4,
      points: taskData.points ?? 1,
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

    const now = new Date().toISOString();
    const updatedFields = { ...updates, updatedAt: now };

    // Set completedAt when task is marked as completed
    if (updates.completed === true && !allTasks[index].completedAt) {
      updatedFields.completedAt = now;
    }
    // Clear completedAt when task is uncompleted
    if (updates.completed === false) {
      updatedFields.completedAt = undefined;
    }

    const updatedTask = {
      ...allTasks[index],
      ...updatedFields,
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
      localStorage.setItem(this.getStorageKey(), JSON.stringify(tasks));
    }
  }
}

// Hybrid Repository - uses Firebase when authenticated, localStorage otherwise
class HybridRepository implements TaskRepository {
  private firebaseRepo = new FirebaseRepository();
  private localRepo = new LocalStorageRepository();
  private useFirebase = false;

  setUserId(userId: string): void {
    // Only use Firebase for real user IDs, not 'local-user'
    const isRealUser = !!userId && userId !== 'local-user';
    this.useFirebase = isRealUser && isFirebaseConfigured();
    this.firebaseRepo.setUserId(userId);
    this.localRepo.setUserId(userId || 'local-user');
  }

  private get repo(): TaskRepository {
    return this.useFirebase ? this.firebaseRepo : this.localRepo;
  }

  getAll(): Promise<Task[]> {
    return this.repo.getAll();
  }

  getByDate(date: string): Promise<Task[]> {
    return this.repo.getByDate(date);
  }

  getIncompleteBefore(date: string): Promise<Task[]> {
    return this.repo.getIncompleteBefore(date);
  }

  getById(id: string): Promise<Task | null> {
    return this.repo.getById(id);
  }

  getCompletedInRange(startDate: string, endDate: string): Promise<Task[]> {
    return this.repo.getCompletedInRange(startDate, endDate);
  }

  getAllCompleted(): Promise<Task[]> {
    return this.repo.getAllCompleted();
  }

  create(taskData: Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    return this.repo.create(taskData);
  }

  update(id: string, updates: Partial<Task>): Promise<Task> {
    return this.repo.update(id, updates);
  }

  delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}

// Export singleton
export const repository: TaskRepository = new HybridRepository();
