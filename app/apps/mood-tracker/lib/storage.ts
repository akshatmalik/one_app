import { v4 as uuidv4 } from 'uuid';
import {
  DayEntry,
  Tag,
  Category,
  MoodTrackerSettings,
  DayEntryRepository,
  TagRepository,
  CategoryRepository,
  SettingsRepository,
} from './types';
import { STORAGE_KEYS, COLLECTIONS } from './constants';
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

// ============================================================================
// DAY ENTRY REPOSITORIES
// ============================================================================

// Firebase DayEntry Repository
export class FirebaseDayEntryRepository implements DayEntryRepository {
  private userId: string = '';

  private get db() {
    return getFirebaseDb();
  }

  private get entriesCollection() {
    return collection(this.db, COLLECTIONS.DAY_ENTRIES);
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  async getAll(): Promise<DayEntry[]> {
    if (!this.userId) return [];
    const q = query(
      this.entriesCollection,
      where('userId', '==', this.userId),
      orderBy('dayNumber', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as DayEntry);
  }

  async getById(id: string): Promise<DayEntry | null> {
    const docRef = doc(this.db, COLLECTIONS.DAY_ENTRIES, id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const entry = snapshot.data() as DayEntry;
    return entry.userId === this.userId ? entry : null;
  }

  async getByDayNumber(dayNumber: number): Promise<DayEntry | null> {
    if (!this.userId) return null;
    const q = query(
      this.entriesCollection,
      where('userId', '==', this.userId),
      where('dayNumber', '==', dayNumber)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as DayEntry;
  }

  async getByDateRange(startDate: string, endDate: string): Promise<DayEntry[]> {
    if (!this.userId) return [];
    const q = query(
      this.entriesCollection,
      where('userId', '==', this.userId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as DayEntry);
  }

  async create(entryData: Omit<DayEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<DayEntry> {
    if (!this.userId) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const entry: DayEntry = {
      ...entryData,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(this.db, COLLECTIONS.DAY_ENTRIES, entry.id), entry);
    return entry;
  }

  async update(id: string, updates: Partial<DayEntry>): Promise<DayEntry> {
    const docRef = doc(this.db, COLLECTIONS.DAY_ENTRIES, id);
    const updatedFields = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(docRef, updatedFields);
    const updated = await getDoc(docRef);
    return updated.data() as DayEntry;
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.db, COLLECTIONS.DAY_ENTRIES, id));
  }
}

// LocalStorage DayEntry Repository
export class LocalStorageDayEntryRepository implements DayEntryRepository {
  private userId: string = 'local-user';

  setUserId(userId: string): void {
    this.userId = userId || 'local-user';
  }

  private getStorageKey(): string {
    return `${STORAGE_KEYS.DAY_ENTRIES}-${this.userId}`;
  }

  async getAll(): Promise<DayEntry[]> {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.getStorageKey());
    return data ? JSON.parse(data) : [];
  }

  async getById(id: string): Promise<DayEntry | null> {
    const allEntries = await this.getAll();
    return allEntries.find(entry => entry.id === id) || null;
  }

  async getByDayNumber(dayNumber: number): Promise<DayEntry | null> {
    const allEntries = await this.getAll();
    return allEntries.find(entry => entry.dayNumber === dayNumber) || null;
  }

  async getByDateRange(startDate: string, endDate: string): Promise<DayEntry[]> {
    const allEntries = await this.getAll();
    return allEntries
      .filter(entry => entry.date >= startDate && entry.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async create(entryData: Omit<DayEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<DayEntry> {
    const allEntries = await this.getAll();
    const now = new Date().toISOString();
    const entry: DayEntry = {
      ...entryData,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    allEntries.push(entry);
    this.save(allEntries);
    return entry;
  }

  async update(id: string, updates: Partial<DayEntry>): Promise<DayEntry> {
    const allEntries = await this.getAll();
    const index = allEntries.findIndex(entry => entry.id === id);
    if (index === -1) {
      throw new Error(`Entry with id ${id} not found`);
    }

    const updatedEntry = {
      ...allEntries[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    allEntries[index] = updatedEntry;
    this.save(allEntries);
    return updatedEntry;
  }

  async delete(id: string): Promise<void> {
    const allEntries = await this.getAll();
    const filtered = allEntries.filter(entry => entry.id !== id);
    this.save(filtered);
  }

  private save(entries: DayEntry[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(entries));
    }
  }
}

// Hybrid DayEntry Repository
class HybridDayEntryRepository implements DayEntryRepository {
  private firebaseRepo = new FirebaseDayEntryRepository();
  private localRepo = new LocalStorageDayEntryRepository();
  private useFirebase = false;

  setUserId(userId: string): void {
    const isRealUser = !!userId && userId !== 'local-user';
    this.useFirebase = isRealUser && isFirebaseConfigured();
    this.firebaseRepo.setUserId(userId);
    this.localRepo.setUserId(userId || 'local-user');
  }

  private get repo(): DayEntryRepository {
    return this.useFirebase ? this.firebaseRepo : this.localRepo;
  }

  getAll(): Promise<DayEntry[]> {
    return this.repo.getAll();
  }

  getById(id: string): Promise<DayEntry | null> {
    return this.repo.getById(id);
  }

  getByDayNumber(dayNumber: number): Promise<DayEntry | null> {
    return this.repo.getByDayNumber(dayNumber);
  }

  getByDateRange(startDate: string, endDate: string): Promise<DayEntry[]> {
    return this.repo.getByDateRange(startDate, endDate);
  }

  create(entryData: Omit<DayEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<DayEntry> {
    return this.repo.create(entryData);
  }

  update(id: string, updates: Partial<DayEntry>): Promise<DayEntry> {
    return this.repo.update(id, updates);
  }

  delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}

// ============================================================================
// TAG REPOSITORIES
// ============================================================================

// Firebase Tag Repository
export class FirebaseTagRepository implements TagRepository {
  private userId: string = '';

  private get db() {
    return getFirebaseDb();
  }

  private get tagsCollection() {
    return collection(this.db, COLLECTIONS.TAGS);
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  async getAll(): Promise<Tag[]> {
    if (!this.userId) return [];
    const q = query(
      this.tagsCollection,
      where('userId', '==', this.userId),
      orderBy('name', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Tag);
  }

  async getById(id: string): Promise<Tag | null> {
    const docRef = doc(this.db, COLLECTIONS.TAGS, id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const tag = snapshot.data() as Tag;
    return tag.userId === this.userId ? tag : null;
  }

  async getByCategoryId(categoryId: string): Promise<Tag[]> {
    if (!this.userId) return [];
    const q = query(
      this.tagsCollection,
      where('userId', '==', this.userId),
      where('categoryId', '==', categoryId),
      orderBy('name', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Tag);
  }

  async create(tagData: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tag> {
    if (!this.userId) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const tag: Tag = {
      ...tagData,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(this.db, COLLECTIONS.TAGS, tag.id), tag);
    return tag;
  }

  async update(id: string, updates: Partial<Tag>): Promise<Tag> {
    const docRef = doc(this.db, COLLECTIONS.TAGS, id);
    const updatedFields = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(docRef, updatedFields);
    const updated = await getDoc(docRef);
    return updated.data() as Tag;
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.db, COLLECTIONS.TAGS, id));
  }
}

// LocalStorage Tag Repository
export class LocalStorageTagRepository implements TagRepository {
  private userId: string = 'local-user';

  setUserId(userId: string): void {
    this.userId = userId || 'local-user';
  }

  private getStorageKey(): string {
    return `${STORAGE_KEYS.TAGS}-${this.userId}`;
  }

  async getAll(): Promise<Tag[]> {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.getStorageKey());
    return data ? JSON.parse(data) : [];
  }

  async getById(id: string): Promise<Tag | null> {
    const allTags = await this.getAll();
    return allTags.find(tag => tag.id === id) || null;
  }

  async getByCategoryId(categoryId: string): Promise<Tag[]> {
    const allTags = await this.getAll();
    return allTags
      .filter(tag => tag.categoryId === categoryId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async create(tagData: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tag> {
    const allTags = await this.getAll();
    const now = new Date().toISOString();
    const tag: Tag = {
      ...tagData,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    allTags.push(tag);
    this.save(allTags);
    return tag;
  }

  async update(id: string, updates: Partial<Tag>): Promise<Tag> {
    const allTags = await this.getAll();
    const index = allTags.findIndex(tag => tag.id === id);
    if (index === -1) {
      throw new Error(`Tag with id ${id} not found`);
    }

    const updatedTag = {
      ...allTags[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    allTags[index] = updatedTag;
    this.save(allTags);
    return updatedTag;
  }

  async delete(id: string): Promise<void> {
    const allTags = await this.getAll();
    const filtered = allTags.filter(tag => tag.id !== id);
    this.save(filtered);
  }

  private save(tags: Tag[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(tags));
    }
  }
}

// Hybrid Tag Repository
class HybridTagRepository implements TagRepository {
  private firebaseRepo = new FirebaseTagRepository();
  private localRepo = new LocalStorageTagRepository();
  private useFirebase = false;

  setUserId(userId: string): void {
    const isRealUser = !!userId && userId !== 'local-user';
    this.useFirebase = isRealUser && isFirebaseConfigured();
    this.firebaseRepo.setUserId(userId);
    this.localRepo.setUserId(userId || 'local-user');
  }

  private get repo(): TagRepository {
    return this.useFirebase ? this.firebaseRepo : this.localRepo;
  }

  getAll(): Promise<Tag[]> {
    return this.repo.getAll();
  }

  getById(id: string): Promise<Tag | null> {
    return this.repo.getById(id);
  }

  getByCategoryId(categoryId: string): Promise<Tag[]> {
    return this.repo.getByCategoryId(categoryId);
  }

  create(tagData: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tag> {
    return this.repo.create(tagData);
  }

  update(id: string, updates: Partial<Tag>): Promise<Tag> {
    return this.repo.update(id, updates);
  }

  delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}

// ============================================================================
// CATEGORY REPOSITORIES
// ============================================================================

// Firebase Category Repository
export class FirebaseCategoryRepository implements CategoryRepository {
  private userId: string = '';

  private get db() {
    return getFirebaseDb();
  }

  private get categoriesCollection() {
    return collection(this.db, COLLECTIONS.CATEGORIES);
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
    const docRef = doc(this.db, COLLECTIONS.CATEGORIES, id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const category = snapshot.data() as Category;
    return category.userId === this.userId ? category : null;
  }

  async create(categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    if (!this.userId) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const category: Category = {
      ...categoryData,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(this.db, COLLECTIONS.CATEGORIES, category.id), category);
    return category;
  }

  async update(id: string, updates: Partial<Category>): Promise<Category> {
    const docRef = doc(this.db, COLLECTIONS.CATEGORIES, id);
    const updatedFields = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(docRef, updatedFields);
    const updated = await getDoc(docRef);
    return updated.data() as Category;
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.db, COLLECTIONS.CATEGORIES, id));
  }
}

// LocalStorage Category Repository
export class LocalStorageCategoryRepository implements CategoryRepository {
  private userId: string = 'local-user';

  setUserId(userId: string): void {
    this.userId = userId || 'local-user';
  }

  private getStorageKey(): string {
    return `${STORAGE_KEYS.CATEGORIES}-${this.userId}`;
  }

  async getAll(): Promise<Category[]> {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.getStorageKey());
    return data ? JSON.parse(data) : [];
  }

  async getById(id: string): Promise<Category | null> {
    const allCategories = await this.getAll();
    return allCategories.find(cat => cat.id === id) || null;
  }

  async create(categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    const allCategories = await this.getAll();
    const now = new Date().toISOString();
    const category: Category = {
      ...categoryData,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    allCategories.push(category);
    this.save(allCategories);
    return category;
  }

  async update(id: string, updates: Partial<Category>): Promise<Category> {
    const allCategories = await this.getAll();
    const index = allCategories.findIndex(cat => cat.id === id);
    if (index === -1) {
      throw new Error(`Category with id ${id} not found`);
    }

    const updatedCategory = {
      ...allCategories[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    allCategories[index] = updatedCategory;
    this.save(allCategories);
    return updatedCategory;
  }

  async delete(id: string): Promise<void> {
    const allCategories = await this.getAll();
    const filtered = allCategories.filter(cat => cat.id !== id);
    this.save(filtered);
  }

  private save(categories: Category[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(categories));
    }
  }
}

// Hybrid Category Repository
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

// ============================================================================
// SETTINGS REPOSITORIES
// ============================================================================

// Firebase Settings Repository
export class FirebaseSettingsRepository implements SettingsRepository {
  private userId: string = '';

  private get db() {
    return getFirebaseDb();
  }

  private get settingsCollection() {
    return collection(this.db, COLLECTIONS.SETTINGS);
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  async get(): Promise<MoodTrackerSettings | null> {
    if (!this.userId) return null;
    const q = query(
      this.settingsCollection,
      where('userId', '==', this.userId)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as MoodTrackerSettings;
  }

  async set(settingsData: Omit<MoodTrackerSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<MoodTrackerSettings> {
    if (!this.userId) throw new Error('Not authenticated');

    // Check if settings already exist
    const existing = await this.get();

    if (existing) {
      // Update existing
      const docRef = doc(this.db, COLLECTIONS.SETTINGS, existing.id);
      const updatedFields = {
        ...settingsData,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(docRef, updatedFields);
      const updated = await getDoc(docRef);
      return updated.data() as MoodTrackerSettings;
    } else {
      // Create new
      const now = new Date().toISOString();
      const settings: MoodTrackerSettings = {
        ...settingsData,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(doc(this.db, COLLECTIONS.SETTINGS, settings.id), settings);
      return settings;
    }
  }
}

// LocalStorage Settings Repository
export class LocalStorageSettingsRepository implements SettingsRepository {
  private userId: string = 'local-user';

  setUserId(userId: string): void {
    this.userId = userId || 'local-user';
  }

  private getStorageKey(): string {
    return `${STORAGE_KEYS.SETTINGS}-${this.userId}`;
  }

  async get(): Promise<MoodTrackerSettings | null> {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(this.getStorageKey());
    return data ? JSON.parse(data) : null;
  }

  async set(settingsData: Omit<MoodTrackerSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<MoodTrackerSettings> {
    const existing = await this.get();

    if (existing) {
      // Update existing
      const settings: MoodTrackerSettings = {
        ...existing,
        ...settingsData,
        updatedAt: new Date().toISOString(),
      };
      this.save(settings);
      return settings;
    } else {
      // Create new
      const now = new Date().toISOString();
      const settings: MoodTrackerSettings = {
        ...settingsData,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
      };
      this.save(settings);
      return settings;
    }
  }

  private save(settings: MoodTrackerSettings): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(settings));
    }
  }
}

// Hybrid Settings Repository
class HybridSettingsRepository implements SettingsRepository {
  private firebaseRepo = new FirebaseSettingsRepository();
  private localRepo = new LocalStorageSettingsRepository();
  private useFirebase = false;

  setUserId(userId: string): void {
    const isRealUser = !!userId && userId !== 'local-user';
    this.useFirebase = isRealUser && isFirebaseConfigured();
    this.firebaseRepo.setUserId(userId);
    this.localRepo.setUserId(userId || 'local-user');
  }

  private get repo(): SettingsRepository {
    return this.useFirebase ? this.firebaseRepo : this.localRepo;
  }

  get(): Promise<MoodTrackerSettings | null> {
    return this.repo.get();
  }

  set(settingsData: Omit<MoodTrackerSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<MoodTrackerSettings> {
    return this.repo.set(settingsData);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const dayEntryRepository: DayEntryRepository = new HybridDayEntryRepository();
export const tagRepository: TagRepository = new HybridTagRepository();
export const categoryRepository: CategoryRepository = new HybridCategoryRepository();
export const settingsRepository: SettingsRepository = new HybridSettingsRepository();
