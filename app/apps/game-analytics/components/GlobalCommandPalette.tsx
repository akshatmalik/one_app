'use client';

import { useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { Search, Gamepad2, CornerDownLeft, ArrowUp, ArrowDown } from 'lucide-react';
import { GameWithMetrics } from '../hooks/useAnalytics';

export interface PaletteCommand {
  id: string;
  label: string;
  subtitle?: string;
  keywords?: string;
  group: 'Navigate' | 'Actions' | 'Recap & Share' | 'Data';
  icon: ReactNode;
  onRun: () => void;
}

interface GlobalCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: PaletteCommand[];
  games: GameWithMetrics[];
  onSelectGame: (game: GameWithMetrics) => void;
  userId: string | null;
}

type ResultItem =
  | { kind: 'command'; command: PaletteCommand }
  | { kind: 'game'; game: GameWithMetrics };

const RECENTS_LIMIT = 6;

function recentsKey(userId: string | null) {
  return `ga-command-palette-recents-${userId || 'local-user'}`;
}

function loadRecents(userId: string | null): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(recentsKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function saveRecents(userId: string | null, ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(recentsKey(userId), JSON.stringify(ids.slice(0, RECENTS_LIMIT)));
  } catch {
    /* ignore quota / disabled storage */
  }
}

/** Lightweight fuzzy score: exact > prefix > substring > subsequence. 0 = no match. */
function scoreMatch(text: string, query: string): number {
  if (!query) return 0;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 50;
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length ? 20 : 0;
}

function commandScore(cmd: PaletteCommand, query: string): number {
  return Math.max(
    scoreMatch(cmd.label, query),
    cmd.subtitle ? scoreMatch(cmd.subtitle, query) * 0.7 : 0,
    cmd.keywords ? scoreMatch(cmd.keywords, query) * 0.6 : 0
  );
}

function gameScore(game: GameWithMetrics, query: string): number {
  return Math.max(
    scoreMatch(game.name, query),
    game.genre ? scoreMatch(game.genre, query) * 0.5 : 0,
    game.platform ? scoreMatch(game.platform, query) * 0.5 : 0
  );
}

export function GlobalCommandPalette({ open, onClose, commands, games, onSelectGame, userId }: GlobalCommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recents, setRecents] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setRecents(loadRecents(userId));
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, userId]);

  const matchedCommands = useMemo(() => {
    if (!query.trim()) return commands;
    return commands
      .map(cmd => ({ cmd, score: commandScore(cmd, query) }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(r => r.cmd);
  }, [commands, query]);

  const matchedGames = useMemo(() => {
    if (!query.trim()) return [];
    return games
      .map(game => ({ game, score: gameScore(game, query) }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(r => r.game);
  }, [games, query]);

  const recentCommands = useMemo(() => {
    if (query.trim()) return [];
    const byId = new Map(commands.map(c => [c.id, c]));
    return recents.map(id => byId.get(id)).filter((c): c is PaletteCommand => !!c);
  }, [recents, commands, query]);

  const groupedCommands = useMemo(() => {
    if (query.trim()) {
      return [{ label: 'Results', items: matchedCommands }];
    }
    const order: PaletteCommand['group'][] = ['Navigate', 'Actions', 'Recap & Share', 'Data'];
    return order
      .map(group => ({ label: group, items: matchedCommands.filter(c => c.group === group) }))
      .filter(g => g.items.length > 0);
  }, [matchedCommands, query]);

  // Flat ordered list driving keyboard navigation: recents -> games -> grouped commands.
  const flatResults: ResultItem[] = useMemo(() => {
    const items: ResultItem[] = [];
    if (!query.trim()) {
      for (const cmd of recentCommands) items.push({ kind: 'command', command: cmd });
    }
    for (const game of matchedGames) items.push({ kind: 'game', game });
    for (const group of groupedCommands) {
      for (const cmd of group.items) items.push({ kind: 'command', command: cmd });
    }
    return items;
  }, [recentCommands, matchedGames, groupedCommands, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector('[data-active="true"]');
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const runCommand = (cmd: PaletteCommand) => {
    const next = [cmd.id, ...recents.filter(id => id !== cmd.id)].slice(0, RECENTS_LIMIT);
    setRecents(next);
    saveRecents(userId, next);
    cmd.onRun();
    onClose();
  };

  const runActive = () => {
    const item = flatResults[activeIndex];
    if (!item) return;
    if (item.kind === 'command') runCommand(item.command);
    else {
      onSelectGame(item.game);
      onClose();
    }
  };

  if (!open) return null;

  let runningIndex = -1;
  const nextIndex = () => { runningIndex += 1; return runningIndex; };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-[12vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[70vh] flex flex-col bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
          <Search size={18} className="text-white/40 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex(i => Math.min(i + 1, flatResults.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex(i => Math.max(i - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                runActive();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              }
            }}
            placeholder="Search games, jump to a tab, or run an action…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
          />
          <kbd className="hidden sm:inline-block text-[10px] text-white/30 border border-white/10 rounded px-1.5 py-0.5">esc</kbd>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto py-1.5">
          {flatResults.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-white/30">No matches for &ldquo;{query}&rdquo;</div>
          )}

          {!query.trim() && recentCommands.length > 0 && (
            <div className="px-2 pb-1.5">
              <div className="px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-white/30">Recent</div>
              {recentCommands.map(cmd => {
                const idx = nextIndex();
                return <CommandRow key={`recent-${cmd.id}`} cmd={cmd} active={idx === activeIndex} onHover={() => setActiveIndex(idx)} onClick={() => runCommand(cmd)} />;
              })}
            </div>
          )}

          {matchedGames.length > 0 && (
            <div className="px-2 pb-1.5">
              <div className="px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-white/30">Games</div>
              {matchedGames.map(game => {
                const idx = nextIndex();
                return <GameRow key={`game-${game.id}`} game={game} active={idx === activeIndex} onHover={() => setActiveIndex(idx)} onClick={() => { onSelectGame(game); onClose(); }} />;
              })}
            </div>
          )}

          {groupedCommands.map(group => (
            <div key={group.label} className="px-2 pb-1.5">
              <div className="px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-white/30">{group.label}</div>
              {group.items.map(cmd => {
                const idx = nextIndex();
                return <CommandRow key={cmd.id} cmd={cmd} active={idx === activeIndex} onHover={() => setActiveIndex(idx)} onClick={() => runCommand(cmd)} />;
              })}
            </div>
          ))}
        </div>

        <div className="hidden sm:flex items-center gap-3 px-4 py-2 border-t border-white/10 text-[10px] text-white/30 shrink-0">
          <span className="flex items-center gap-1"><ArrowUp size={10} /><ArrowDown size={10} /> navigate</span>
          <span className="flex items-center gap-1"><CornerDownLeft size={10} /> select</span>
          <span className="ml-auto">⌘K to toggle</span>
        </div>
      </div>
    </div>
  );
}

function CommandRow({ cmd, active, onHover, onClick }: { cmd: PaletteCommand; active: boolean; onHover: () => void; onClick: () => void }) {
  return (
    <button
      data-active={active}
      onMouseEnter={onHover}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors ${active ? 'bg-white/10' : 'hover:bg-white/5'}`}
    >
      <span className="shrink-0 text-white/60">{cmd.icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] text-white/85 truncate">{cmd.label}</span>
        {cmd.subtitle && <span className="block text-[11px] text-white/35 truncate">{cmd.subtitle}</span>}
      </span>
    </button>
  );
}

function GameRow({ game, active, onHover, onClick }: { game: GameWithMetrics; active: boolean; onHover: () => void; onClick: () => void }) {
  return (
    <button
      data-active={active}
      onMouseEnter={onHover}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors ${active ? 'bg-white/10' : 'hover:bg-white/5'}`}
    >
      {game.thumbnail ? (
        <img src={game.thumbnail} alt={game.name} className="w-7 h-7 object-cover rounded shrink-0" loading="lazy" />
      ) : (
        <div className="w-7 h-7 rounded bg-white/5 flex items-center justify-center shrink-0">
          <Gamepad2 size={13} className="text-white/20" />
        </div>
      )}
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] text-white/85 truncate">{game.name}</span>
        <span className="block text-[11px] text-white/35 truncate">{game.status}{game.genre ? ` · ${game.genre}` : ''}</span>
      </span>
    </button>
  );
}
