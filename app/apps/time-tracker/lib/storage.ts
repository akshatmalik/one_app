'use client';

import { v4 as uuidv4 } from 'uuid';
import {
  Category,
  CategoryRepository,
  SchedulePreset,
  SchedulePresetRepository,
  TimeEntry,
  TimeEntryRepository,
  DayOfWeek,
} from './types';
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

// Storage keys
const CATEGORIES_KEY = 'time-tracker-categories';
const PRESETS_KEY = 'time-tracker-presets';
const ENTRIES_KEY = 'time-tracker-entries';

// Firestore collection names
const CATEGORIES_COLLECTION = 'timeTrackerCategories';
const PRESETS_COLLECTION = 'timeTrackerPresets';
const ENTRIES_COLLECTION = 'timeTrackerEntries';

// Helper to clean undefined values (Firestore doesn't accept undefined)
function cleanUndefinedValues<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefinedValues(item)) as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanUndefinedValues(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

// ============================================
// CATEGORY REPOSITORIES
// ============================================

export class FirebaseCategoryRepository implements CategoryRepository {
  private userId: string = '';

  private get db() {
    return getFirebaseDb();
  }

  private get categoriesCollection() {
    return collection(this.db, CATEGORIES_COLLECTION);
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  async getAll(): Promise<Category[]> {
    if (!this.userId) return [];
    const q = query(
      this.categoriesCollection,
      where('userId', '==', this.userId),
      orderBy('name', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Category);
  }

  async getById(id: string): Promise<Category | null> {
    const docRef = doc(this.db, CATEGORIES_COLLECTION, id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const category = snapshot.data() as Category;
    return category.userId === this.userId ? category : null;
  }

  async create(categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    if (!this.userId) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const cleanData = cleanUndefinedValues(categoryData);

    const category: Category = {
      ...cleanData,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    } as Category;

    await setDoc(doc(this.db, CATEGORIES_COLLECTION, category.id), category);
    return category;
  }

  async update(id: string, updates: Partial<Category>): Promise<Category> {
    const docRef = doc(this.db, CATEGORIES_COLLECTION, id);
    const cleanUpdates = cleanUndefinedValues(updates) as Record<string, unknown>;
    cleanUpdates.updatedAt = new Date().toISOString();

    await updateDoc(docRef, cleanUpdates);
    const updated = await getDoc(docRef);
    return updated.data() as Category;
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.db, CATEGORIES_COLLECTION, id));
  }
}

export class LocalStorageCategoryRepository implements CategoryRepository {
  private userId: string = 'local-user';

  setUserId(userId: string): void {
    this.userId = userId || 'local-user';
  }

  private getStorageKey(): string {
    return `${CATEGORIES_KEY}-${this.userId}`;
  }

  async getAll(): Promise<Category[]> {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.getStorageKey());
    return data ? JSON.parse(data) : [];
  }

  async getById(id: string): Promise<Category | null> {
    const categories = await this.getAll();
    return categories.find(c => c.id === id) || null;
  }

  async create(categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    const category: Category = {
      ...categoryData,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const categories = await this.getAll();
    categories.push(category);
    this.save(categories);
    return category;
  }

  async update(id: string, updates: Partial<Category>): Promise<Category> {
    const categories = await this.getAll();
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Category not found');

    categories[index] = {
      ...categories[index],
      ...updates,
      id,
      createdAt: categories[index].createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.save(categories);
    return categories[index];
  }

  async delete(id: string): Promise<void> {
    const categories = await this.getAll();
    const filtered = categories.filter(c => c.id !== id);
    this.save(filtered);
  }

  private save(categories: Category[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(categories));
    }
  }
}

class HybridCategoryRepository implements CategoryRepository {
  private firebaseRepo = new FirebaseCategoryRepository();
  private localRepo = new LocalStorageCategoryRepository();
  private useFirebase = false;

  setUserId(userId: string): void {
    const isRealUser = !!userId && userId !== 'local-user';
    this.useFirebase = isRealUser && isFirebaseConfigured();
    this.firebaseRepo.setUserId(userId);
    this.localRepo.setUserId(userId || 'local-user');
  }

  private get repo(): CategoryRepository {
    return this.useFirebase ? this.firebaseRepo : this.localRepo;
  }

  getAll(): Promise<Category[]> {
    return this.repo.getAll();
  }

  getById(id: string): Promise<Category | null> {
    return this.repo.getById(id);
  }

  create(categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    return this.repo.create(categoryData);
  }

  update(id: string, updates: Partial<Category>): Promise<Category> {
    return this.repo.update(id, updates);
  }

  delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}

// ============================================
// SCHEDULE PRESET REPOSITORIES
// ============================================

export class FirebaseSchedulePresetRepository implements SchedulePresetRepository {
  private userId: string = '';

  private get db() {
    return getFirebaseDb();
  }

  private get presetsCollection() {
    return collection(this.db, PRESETS_COLLECTION);
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  async getAll(): Promise<SchedulePreset[]> {
    if (!this.userId) return [];
    const q = query(
      this.presetsCollection,
      where('userId', '==', this.userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as SchedulePreset);
  }

  async getById(id: string): Promise<SchedulePreset | null> {
    const docRef = doc(this.db, PRESETS_COLLECTION, id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const preset = snapshot.data() as SchedulePreset;
    return preset.userId === this.userId ? preset : null;
  }

  async getByDayOfWeek(day: DayOfWeek): Promise<SchedulePreset[]> {
    if (!this.userId) return [];
    const q = query(
      this.presetsCollection,
      where('userId', '==', this.userId),
      where('daysOfWeek', 'array-contains', day),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as SchedulePreset);
  }

  async create(presetData: Omit<SchedulePreset, 'id' | 'createdAt' | 'updatedAt'>): Promise<SchedulePreset> {
    if (!this.userId) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const cleanData = cleanUndefinedValues(presetData);

    const preset: SchedulePreset = {
      ...cleanData,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    } as SchedulePreset;

    await setDoc(doc(this.db, PRESETS_COLLECTION, preset.id), preset);
    return preset;
  }

  async update(id: string, updates: Partial<SchedulePreset>): Promise<SchedulePreset> {
    const docRef = doc(this.db, PRESETS_COLLECTION, id);
    const cleanUpdates = cleanUndefinedValues(updates) as Record<string, unknown>;
    cleanUpdates.updatedAt = new Date().toISOString();

    await updateDoc(docRef, cleanUpdates);
    const updated = await getDoc(docRef);
    return updated.data() as SchedulePreset;
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.db, PRESETS_COLLECTION, id));
  }
}

export class LocalStorageSchedulePresetRepository implements SchedulePresetRepository {
  private userId: string = 'local-user';

  setUserId(userId: string): void {
    this.userId = userId || 'local-user';
  }

  private getStorageKey(): string {
    return `${PRESETS_KEY}-${this.userId}`;
  }

  async getAll(): Promise<SchedulePreset[]> {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.getStorageKey());
    return data ? JSON.parse(data) : [];
  }

  async getById(id: string): Promise<SchedulePreset | null> {
    const presets = await this.getAll();
    return presets.find(p => p.id === id) || null;
  }

  async getByDayOfWeek(day: DayOfWeek): Promise<SchedulePreset[]> {
    const presets = await this.getAll();
    return presets.filter(p => p.isActive && p.daysOfWeek.includes(day));
  }

  async create(presetData: Omit<SchedulePreset, 'id' | 'createdAt' | 'updatedAt'>): Promise<SchedulePreset> {
    const preset: SchedulePreset = {
      ...presetData,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const presets = await this.getAll();
    presets.push(preset);
    this.save(presets);
    return preset;
  }

  async update(id: string, updates: Partial<SchedulePreset>): Promise<SchedulePreset> {
    const presets = await this.getAll();
    const index = presets.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Preset not found');

    presets[index] = {
      ...presets[index],
      ...updates,
      id,
      createdAt: presets[index].createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.save(presets);
    return presets[index];
  }

  async delete(id: string): Promise<void> {
    const presets = await this.getAll();
    const filtered = presets.filter(p => p.id !== id);
    this.save(filtered);
  }

  private save(presets: SchedulePreset[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(presets));
    }
  }
}

class HybridSchedulePresetRepository implements SchedulePresetRepository {
  private firebaseRepo = new FirebaseSchedulePresetRepository();
  private localRepo = new LocalStorageSchedulePresetRepository();
  private useFirebase = false;

  setUserId(userId: string): void {
    const isRealUser = !!userId && userId !== 'local-user';
    this.useFirebase = isRealUser && isFirebaseConfigured();
    this.firebaseRepo.setUserId(userId);
    this.localRepo.setUserId(userId || 'local-user');
  }

  private get repo(): SchedulePresetRepository {
    return this.useFirebase ? this.firebaseRepo : this.localRepo;
  }

  getAll(): Promise<SchedulePreset[]> {
    return this.repo.getAll();
  }

  getById(id: string): Promise<SchedulePreset | null> {
    return this.repo.getById(id);
  }

  getByDayOfWeek(day: DayOfWeek): Promise<SchedulePreset[]> {
    return this.repo.getByDayOfWeek(day);
  }

  create(presetData: Omit<SchedulePreset, 'id' | 'createdAt' | 'updatedAt'>): Promise<SchedulePreset> {
    return this.repo.create(presetData);
  }

  update(id: string, updates: Partial<SchedulePreset>): Promise<SchedulePreset> {
    return this.repo.update(id, updates);
  }

  delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}

// ============================================
// TIME ENTRY REPOSITORIES
// ============================================

export class FirebaseTimeEntryRepository implements TimeEntryRepository {
  private userId: string = '';

  private get db() {
    return getFirebaseDb();
  }

  private get entriesCollection() {
    return collection(this.db, ENTRIES_COLLECTION);
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  async getAll(): Promise<TimeEntry[]> {
    if (!this.userId) return [];
    const q = query(
      this.entriesCollection,
      where('userId', '==', this.userId),
      orderBy('startTime', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as TimeEntry);
  }

  async getById(id: string): Promise<TimeEntry | null> {
    const docRef = doc(this.db, ENTRIES_COLLECTION, id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const entry = snapshot.data() as TimeEntry;
    return entry.userId === this.userId ? entry : null;
  }

  async getByDate(date: string): Promise<TimeEntry[]> {
    if (!this.userId) return [];
    const q = query(
      this.entriesCollection,
      where('userId', '==', this.userId),
      where('date', '==', date),
      orderBy('startTime', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as TimeEntry);
  }

  async getByDateRange(startDate: string, endDate: string): Promise<TimeEntry[]> {
    if (!this.userId) return [];
    const q = query(
      this.entriesCollection,
      where('userId', '==', this.userId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'asc'),
      orderBy('startTime', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as TimeEntry);
  }

  async create(entryData: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<TimeEntry> {
    if (!this.userId) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const cleanData = cleanUndefinedValues(entryData);

    const entry: TimeEntry = {
      ...cleanData,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    } as TimeEntry;

    await setDoc(doc(this.db, ENTRIES_COLLECTION, entry.id), entry);
    return entry;
  }

  async update(id: string, updates: Partial<TimeEntry>): Promise<TimeEntry> {
    const docRef = doc(this.db, ENTRIES_COLLECTION, id);
    const cleanUpdates = cleanUndefinedValues(updates) as Record<string, unknown>;
    cleanUpdates.updatedAt = new Date().toISOString();

    await updateDoc(docRef, cleanUpdates);
    const updated = await getDoc(docRef);
    return updated.data() as TimeEntry;
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.db, ENTRIES_COLLECTION, id));
  }
}

export class LocalStorageTimeEntryRepository implements TimeEntryRepository {
  private userId: string = 'local-user';

  setUserId(userId: string): void {
    this.userId = userId || 'local-user';
  }

  private getStorageKey(): string {
    return `${ENTRIES_KEY}-${this.userId}`;
  }

  async getAll(): Promise<TimeEntry[]> {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.getStorageKey());
    return data ? JSON.parse(data) : [];
  }

  async getById(id: string): Promise<TimeEntry | null> {
    const entries = await this.getAll();
    return entries.find(e => e.id === id) || null;
  }

  async getByDate(date: string): Promise<TimeEntry[]> {
    const entries = await this.getAll();
    return entries.filter(e => e.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  async getByDateRange(startDate: string, endDate: string): Promise<TimeEntry[]> {
    const entries = await this.getAll();
    return entries
      .filter(e => e.date >= startDate && e.date <= endDate)
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        return dateCompare !== 0 ? dateCompare : a.startTime.localeCompare(b.startTime);
      });
  }

  async create(entryData: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<TimeEntry> {
    const entry: TimeEntry = {
      ...entryData,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const entries = await this.getAll();
    entries.push(entry);
    this.save(entries);
    return entry;
  }

  async update(id: string, updates: Partial<TimeEntry>): Promise<TimeEntry> {
    const entries = await this.getAll();
    const index = entries.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Time entry not found');

    entries[index] = {
      ...entries[index],
      ...updates,
      id,
      createdAt: entries[index].createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.save(entries);
    return entries[index];
  }

  async delete(id: string): Promise<void> {
    const entries = await this.getAll();
    const filtered = entries.filter(e => e.id !== id);
    this.save(filtered);
  }

  private save(entries: TimeEntry[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(entries));
    }
  }
}

class HybridTimeEntryRepository implements TimeEntryRepository {
  private firebaseRepo = new FirebaseTimeEntryRepository();
  private localRepo = new LocalStorageTimeEntryRepository();
  private useFirebase = false;

  setUserId(userId: string): void {
    const isRealUser = !!userId && userId !== 'local-user';
    this.useFirebase = isRealUser && isFirebaseConfigured();
    this.firebaseRepo.setUserId(userId);
    this.localRepo.setUserId(userId || 'local-user');
  }

  private get repo(): TimeEntryRepository {
    return this.useFirebase ? this.firebaseRepo : this.localRepo;
  }

  getAll(): Promise<TimeEntry[]> {
    return this.repo.getAll();
  }

  getById(id: string): Promise<TimeEntry | null> {
    return this.repo.getById(id);
  }

  getByDate(date: string): Promise<TimeEntry[]> {
    return this.repo.getByDate(date);
  }

  getByDateRange(startDate: string, endDate: string): Promise<TimeEntry[]> {
    return this.repo.getByDateRange(startDate, endDate);
  }

  create(entryData: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<TimeEntry> {
    return this.repo.create(entryData);
  }

  update(id: string, updates: Partial<TimeEntry>): Promise<TimeEntry> {
    return this.repo.update(id, updates);
  }

  delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}

// ============================================
// EXPORT SINGLETONS
// ============================================

export const categoryRepository: CategoryRepository = new HybridCategoryRepository();
export const schedulePresetRepository: SchedulePresetRepository = new HybridSchedulePresetRepository();
export const timeEntryRepository: TimeEntryRepository = new HybridTimeEntryRepository();
