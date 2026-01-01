'use client';

import { useState, useEffect } from 'react';
import { notesRepository } from '../lib/notes-storage';
import { DayNote } from '../lib/types';

export function useDayNotes(date: string, userId: string | null) {
  const [note, setNote] = useState<DayNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      notesRepository.setUserId(userId || 'local-user');
      const data = await notesRepository.getByDate(date);
      setNote(data);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, userId]);

  const saveNote = async (content: string): Promise<DayNote> => {
    try {
      notesRepository.setUserId(userId || 'local-user');

      let savedNote: DayNote;
      if (note) {
        savedNote = await notesRepository.update(note.id, { content });
      } else {
        savedNote = await notesRepository.create({ date, content });
      }

      await refresh();
      return savedNote;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const deleteNote = async (): Promise<void> => {
    if (!note) return;
    try {
      notesRepository.setUserId(userId || 'local-user');
      await notesRepository.delete(note.id);
      await refresh();
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  return {
    note,
    loading,
    error,
    saveNote,
    deleteNote,
    refresh,
  };
}
