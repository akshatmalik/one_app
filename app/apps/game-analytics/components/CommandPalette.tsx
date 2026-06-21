'use client';

import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from 'lucide-react';
import { GameWithMetrics } from '../hooks/useAnalytics';

export interface PaletteCommand {
  id: string;
  label: string;
  section: string;
  icon: ReactNode;
  keywords?: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: PaletteCommand[];
  games: GameWithMetrics[];
  onSelectGame: (game: GameWithMetrics) => void;
  recentCommandIds: string[];
  onRunCommand: (id: string) => void;
}

type PaletteEntry =
  | { kind: 'command'; key: string; command: PaletteCommand }
  | { kind: 'game'; key: string; game: GameWithMetrics };

/** Subsequence fuzzy match. Lower score = better match. Null = no match. */
function fuzzyScore(query: string, target: string): number | null {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();
  if (!q) return 0;
  if (t.includes(q)) {
    // Reward matches that start earlier and are exact substrings.
    return t.indexOf(q);
  }
  let qi = 0;
  let lastMatch = -1;
  let gaps = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      if (lastMatch >= 0) gaps += ti - lastMatch - 1;
      lastMatch = ti;
      qi++;
    }
  }
  if (qi < q.length) return null;
  return 1000 + gaps;
}

export function CommandPalette({ open, onClose, commands, games, onSelectGame, recentCommandIds, onRunCommand }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(t);
    }
  }, [open]);

  const entries = useMemo<PaletteEntry[]>(() => {
    const q = query.trim();

    if (!q) {
      const recent = recentCommandIds
        .map((id) => commands.find((c) => c.id === id))
        .filter((c): c is PaletteCommand => !!c)
        .slice(0, 5);
      const recentIds = new Set(recent.map((c) => c.id));
      const goTo = commands.filter((c) => c.section === 'Go to' && !recentIds.has(c.id));
      const rest = commands.filter((c) => c.section !== 'Go to' && !recentIds.has(c.id));
      return [...recent, ...goTo, ...rest].map((c) => ({ kind: 'command' as const, key: `cmd:${c.id}`, command: c }));
    }

    const matchedCommands = commands
      .map((c) => ({ c, score: fuzzyScore(q, `${c.label} ${c.section} ${c.keywords ?? ''}`) }))
      .filter((x): x is { c: PaletteCommand; score: number } => x.score !== null)
      .sort((a, b) => a.score - b.score)
      .map((x) => x.c);

    const matchedGames = games
      .map((g) => ({
        g,
        score: fuzzyScore(q, `${g.name} ${g.genre ?? ''} ${g.platform ?? ''} ${g.franchise ?? ''}`),
      }))
      .filter((x): x is { g: GameWithMetrics; score: number } => x.score !== null)
      .sort((a, b) => a.score - b.score)
      .slice(0, 6)
      .map((x) => x.g);

    return [
      ...matchedCommands.map((c) => ({ kind: 'command' as const, key: `cmd:${c.id}`, command: c })),
      ...matchedGames.map((g) => ({ kind: 'game' as const, key: `game:${g.id}`, game: g })),
    ];
  }, [query, commands, games, recentCommandIds]);

  useEffect(() => {
    setActiveIndex((i) => (entries.length === 0 ? 0 : Math.min(i, entries.length - 1)));
  }, [entries.length]);

  useEffect(() => {
    const active = entries[activeIndex];
    if (active) itemRefs.current.get(active.key)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, entries]);

  const runEntry = (entry: PaletteEntry) => {
    if (entry.kind === 'command') {
      onRunCommand(entry.command.id);
      entry.command.run();
    } else {
      onSelectGame(entry.game);
    }
    onClose();
  };

  if (!open) return null;

  let sectionCursor = '';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#15151c] border border-white/10 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/10">
          <Search size={16} className="text-white/40 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((i) => (entries.length === 0 ? 0 : (i + 1) % entries.length));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((i) => (entries.length === 0 ? 0 : (i - 1 + entries.length) % entries.length));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                const entry = entries[activeIndex];
                if (entry) runEntry(entry);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              }
            }}
            placeholder="Search games, tabs, and actions..."
            className="flex-1 bg-transparent text-white placeholder:text-white/30 text-sm focus:outline-none"
          />
          <kbd className="hidden sm:inline text-[10px] text-white/30 border border-white/10 rounded px-1.5 py-0.5">esc</kbd>
        </div>

        <div className="flex-1 overflow-y-auto py-1.5">
          {entries.length === 0 && (
            <p className="text-white/30 text-sm text-center py-8">No matches for &quot;{query}&quot;</p>
          )}
          {entries.map((entry, idx) => {
            const section = entry.kind === 'command' ? entry.command.section : 'Games';
            const showHeader = section !== sectionCursor;
            sectionCursor = section;
            const isRecentHeader = showHeader && idx === 0 && !query.trim() && recentCommandIds.length > 0 && entry.kind === 'command' && recentCommandIds.includes(entry.command.id);

            return (
              <div key={entry.key}>
                {showHeader && (
                  <div className="px-4 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                    {isRecentHeader ? 'Recent' : section}
                  </div>
                )}
                <div
                  ref={(el) => {
                    if (el) itemRefs.current.set(entry.key, el);
                    else itemRefs.current.delete(entry.key);
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => runEntry(entry)}
                  className={`flex items-center gap-3 px-4 py-2.5 mx-1.5 rounded-lg cursor-pointer transition-colors ${
                    idx === activeIndex ? 'bg-purple-500/20 text-white' : 'text-white/70 hover:bg-white/5'
                  }`}
                >
                  {entry.kind === 'command' ? (
                    <>
                      <span className="shrink-0">{entry.command.icon}</span>
                      <span className="text-sm truncate">{entry.command.label}</span>
                    </>
                  ) : (
                    <>
                      {entry.game.thumbnail ? (
                        <img src={entry.game.thumbnail} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
                      ) : (
                        <span className="w-6 h-6 rounded bg-white/10 shrink-0" />
                      )}
                      <span className="text-sm truncate">{entry.game.name}</span>
                      <span className="text-[10px] text-white/30 ml-auto shrink-0">{entry.game.status}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-3 px-4 py-2 border-t border-white/10 text-[10px] text-white/30">
          <span className="flex items-center gap-1"><ArrowUp size={10} /><ArrowDown size={10} /> Navigate</span>
          <span className="flex items-center gap-1"><CornerDownLeft size={10} /> Select</span>
        </div>
      </div>
    </div>
  );
}
