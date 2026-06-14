'use client';

import { useState, useEffect } from 'react';
import { Bookmark, BookmarkPlus, X } from 'lucide-react';

export interface SavedFilter {
  id: string;
  name: string;
  viewMode: string;
  sortBy: string;
  searchQuery: string;
}

interface SavedFiltersBarProps {
  current: { viewMode: string; sortBy: string; searchQuery: string };
  onApply: (f: SavedFilter) => void;
}

const KEY = 'ga-saved-filters';

// NewIdeas100-June2026 — #15 Saved Filters / Smart Lists.
export function SavedFiltersBar({ current, onApply }: SavedFiltersBarProps) {
  const [filters, setFilters] = useState<SavedFilter[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setFilters(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (next: SavedFilter[]) => {
    setFilters(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const save = () => {
    const name = window.prompt('Name this view (e.g. "Cheap & Unfinished")');
    if (!name?.trim()) return;
    persist([
      ...filters,
      { id: `${Date.now()}`, name: name.trim(), viewMode: current.viewMode, sortBy: current.sortBy, searchQuery: current.searchQuery },
    ]);
  };

  const remove = (id: string) => persist(filters.filter((f) => f.id !== id));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {filters.map((f) => (
        <span key={f.id} className="group inline-flex items-center gap-1 rounded-full bg-white/[0.06] py-1 pl-2.5 pr-1 text-xs text-white/70">
          <button onClick={() => onApply(f)} className="flex items-center gap-1 hover:text-white">
            <Bookmark size={11} /> {f.name}
          </button>
          <button onClick={() => remove(f.id)} className="text-white/30 hover:text-red-400" aria-label="Delete view">
            <X size={12} />
          </button>
        </span>
      ))}
      <button
        onClick={save}
        className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/50 hover:bg-white/5 hover:text-white/80"
      >
        <BookmarkPlus size={12} /> Save view
      </button>
    </div>
  );
}
