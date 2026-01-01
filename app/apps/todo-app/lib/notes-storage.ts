import { v4 as uuidv4 } from 'uuid';
import { DayNote, DayNoteRepository } from './types';
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
  limit,
} from 'firebase/firestore';

const STORAGE_KEY = 'todo-app-notes';
const COLLECTION_NAME = 'dayNotes';

// Firebase Repository
export class FirebaseNotesRepository implements DayNoteRepository {
  private userId: string = '';

  private get db() {
    return getFirebaseDb();
  }

  private get notesCollection() {
    return collection(this.db, COLLECTION_NAME);
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  async getAll(): Promise<DayNote[]> {
    if (!this.userId) return [];
    const q = query(
      this.notesCollection,
      where('userId', '==', this.userId),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as DayNote);
  }

  async getByDate(date: string): Promise<DayNote | null> {
    if (!this.userId) return null;
    const q = query(
      this.notesCollection,
      where('userId', '==', this.userId),
      where('date', '==', date),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as DayNote;
  }

  async create(noteData: Omit<DayNote, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<DayNote> {
    if (!this.userId) throw new Error('Not authenticated');

    // Check if note already exists for this date
    const existing = await this.getByDate(noteData.date);
    if (existing) {
      return this.update(existing.id, { content: noteData.content });
    }

    const now = new Date().toISOString();
    const note: DayNote = {
      ...noteData,
      id: uuidv4(),
      userId: this.userId,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(this.db, COLLECTION_NAME, note.id), note);
    return note;
  }

  async update(id: string, updates: Partial<DayNote>): Promise<DayNote> {
    const docRef = doc(this.db, COLLECTION_NAME, id);

    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }
    cleanUpdates.updatedAt = new Date().toISOString();

    await updateDoc(docRef, cleanUpdates);

    const updated = await getDoc(docRef);
    return updated.data() as DayNote;
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.db, COLLECTION_NAME, id));
  }
}

// LocalStorage Repository
export class LocalStorageNotesRepository implements DayNoteRepository {
  private userId: string = 'local-user';

  setUserId(userId: string): void {
    this.userId = userId || 'local-user';
  }

  private getStorageKey(): string {
    return `${STORAGE_KEY}-${this.userId}`;
  }

  async getAll(): Promise<DayNote[]> {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.getStorageKey());
    const notes = data ? JSON.parse(data) : [];
    return notes.sort((a: DayNote, b: DayNote) => b.date.localeCompare(a.date));
  }

  async getByDate(date: string): Promise<DayNote | null> {
    const allNotes = await this.getAll();
    return allNotes.find(note => note.date === date) || null;
  }

  async create(noteData: Omit<DayNote, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<DayNote> {
    const allNotes = await this.getAll();

    // Check if note already exists for this date
    const existingIndex = allNotes.findIndex(note => note.date === noteData.date);
    if (existingIndex !== -1) {
      return this.update(allNotes[existingIndex].id, { content: noteData.content });
    }

    const now = new Date().toISOString();
    const note: DayNote = {
      ...noteData,
      id: uuidv4(),
      userId: this.userId,
      createdAt: now,
      updatedAt: now,
    };
    allNotes.push(note);
    this.save(allNotes);
    return note;
  }

  async update(id: string, updates: Partial<DayNote>): Promise<DayNote> {
    const allNotes = await this.getAll();
    const index = allNotes.findIndex(note => note.id === id);
    if (index === -1) {
      throw new Error(`Note with id ${id} not found`);
    }

    const updatedNote = {
      ...allNotes[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    allNotes[index] = updatedNote;
    this.save(allNotes);
    return updatedNote;
  }

  async delete(id: string): Promise<void> {
    const allNotes = await this.getAll();
    const filtered = allNotes.filter(note => note.id !== id);
    this.save(filtered);
  }

  private save(notes: DayNote[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(notes));
    }
  }
}

// Hybrid Repository
class HybridNotesRepository implements DayNoteRepository {
  private firebaseRepo = new FirebaseNotesRepository();
  private localRepo = new LocalStorageNotesRepository();
  private useFirebase = false;

  setUserId(userId: string): void {
    const isRealUser = !!userId && userId !== 'local-user';
    this.useFirebase = isRealUser && isFirebaseConfigured();
    this.firebaseRepo.setUserId(userId);
    this.localRepo.setUserId(userId || 'local-user');
  }

  private get repo(): DayNoteRepository {
    return this.useFirebase ? this.firebaseRepo : this.localRepo;
  }

  getAll(): Promise<DayNote[]> {
    return this.repo.getAll();
  }

  getByDate(date: string): Promise<DayNote | null> {
    return this.repo.getByDate(date);
  }

  create(noteData: Omit<DayNote, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<DayNote> {
    return this.repo.create(noteData);
  }

  update(id: string, updates: Partial<DayNote>): Promise<DayNote> {
    return this.repo.update(id, updates);
  }

  delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}

// Export singleton
export const notesRepository: DayNoteRepository = new HybridNotesRepository();
