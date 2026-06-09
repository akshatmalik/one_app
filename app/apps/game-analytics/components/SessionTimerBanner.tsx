'use client';

import { useState, useEffect } from 'react';
import { Play, Square, X, Search, ChevronRight, Flame, Check, Clock } from 'lucide-react';
import { Game, SessionMood } from '../lib/types';
import clsx from 'clsx';

const SESSION_KEY = 'ga-active-session';

interface SessionData {
  gameId: string;
  gameName: string;
  thumbnail?: string;
  startTime: number; // Unix ms
}

function loadSession(): SessionData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionData) : null;
  } catch { return null; }
}

function saveSession(data: SessionData | null): void {
  if (typeof window === 'undefined') return;
  if (data) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function roundToQuarter(ms: number): number {
  return Math.max(0.25, Math.round((ms / 3_600_000) * 4) / 4);
}

const MOODS = [
  { value: 'great' as SessionMood, emoji: '🔥', label: 'Great' },
  { value: 'good' as SessionMood, emoji: '👍', label: 'Good' },
  { value: 'meh' as SessionMood, emoji: '😐', label: 'Meh' },
  { value: 'grind' as SessionMood, emoji: '💪', label: 'Grind' },
];

export interface SessionTimerBannerProps {
  games: Game[];
  onLog: (gameId: string, hours: number, mood?: SessionMood) => Promise<void>;
}

export function SessionTimerBanner({ games, onLog }: SessionTimerBannerProps) {
  type Phase = 'idle' | 'picking' | 'running' | 'ending';

  const [session, setSession] = useState<SessionData | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [query, setQuery] = useState('');
  const [mood, setMood] = useState<SessionMood | undefined>();
  const [endHours, setEndHours] = useState(0);
  const [logging, setLogging] = useState(false);

  // Restore active session from localStorage on mount
  useEffect(() => {
    const stored = loadSession();
    if (stored) {
      setSession(stored);
      setPhase('running');
    }
  }, []);

  // Tick the timer every second while running
  useEffect(() => {
    if (phase !== 'running' || !session) return;
    const tick = () => setElapsed(Date.now() - session.startTime);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, session]);

  // Games sorted by most recently played, wishlist excluded
  const sortedGames = [...games]
    .filter(g => g.status !== 'Wishlist')
    .sort((a, b) => {
      const lastA = a.playLogs?.length
        ? Math.max(...a.playLogs.map(l => new Date(l.date).getTime()))
        : new Date(a.createdAt).getTime();
      const lastB = b.playLogs?.length
        ? Math.max(...b.playLogs.map(l => new Date(l.date).getTime()))
        : new Date(b.createdAt).getTime();
      return lastB - lastA;
    });

  const displayGames = query.trim()
    ? sortedGames.filter(g => g.name.toLowerCase().includes(query.toLowerCase()))
    : sortedGames.slice(0, 15);

  function startSession(game: Game) {
    const s: SessionData = {
      gameId: game.id,
      gameName: game.name,
      thumbnail: game.thumbnail,
      startTime: Date.now(),
    };
    saveSession(s);
    setSession(s);
    setElapsed(0);
    setPhase('running');
    setQuery('');
  }

  function initiateEnd() {
    setEndHours(roundToQuarter(elapsed));
    setMood(undefined);
    setPhase('ending');
  }

  async function confirmLog() {
    if (!session || logging) return;
    setLogging(true);
    try {
      await onLog(session.gameId, endHours, mood);
    } finally {
      saveSession(null);
      setSession(null);
      setElapsed(0);
      setPhase('idle');
      setLogging(false);
    }
  }

  function discard() {
    saveSession(null);
    setSession(null);
    setElapsed(0);
    setPhase('idle');
  }

  // ── IDLE ─────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <button
        onClick={() => setPhase('picking')}
        className="w-full flex items-center gap-3 px-4 py-3 mb-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-purple-500/20 rounded-xl transition-all group"
        aria-label="Start a gaming session"
      >
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/20 transition-all">
          <Play size={14} className="text-purple-400/50 group-hover:text-purple-400 ml-px transition-colors" />
        </div>
        <span className="text-sm text-white/30 group-hover:text-white/50 transition-colors">
          Start a session…
        </span>
        <Clock size={13} className="ml-auto text-white/15 group-hover:text-white/30 transition-colors" />
      </button>
    );
  }

  // ── PICKING ───────────────────────────────────────────────────────
  if (phase === 'picking') {
    return (
      <div className="mb-4 bg-[#0f0f1a] border border-white/10 rounded-xl overflow-hidden shadow-xl">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
          <Play size={14} className="text-purple-400 flex-shrink-0" />
          <span className="text-sm font-medium text-white/70">What are you playing?</span>
          <button
            onClick={() => { setPhase('idle'); setQuery(''); }}
            className="ml-auto p-1 text-white/30 hover:text-white/60 rounded transition-colors"
            aria-label="Cancel"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-3 py-2 border-b border-white/5">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
            <Search size={13} className="text-white/30 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Search your library…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white/80 placeholder-white/25 outline-none"
            />
          </div>
        </div>

        <div className="max-h-60 overflow-y-auto">
          {displayGames.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-white/25">No games found</p>
          ) : displayGames.map(game => (
            <button
              key={game.id}
              onClick={() => startSession(game)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors text-left"
            >
              {game.thumbnail ? (
                <img src={game.thumbnail} alt="" className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0 text-sm">
                  🎮
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/75 truncate">{game.name}</p>
                {game.platform && (
                  <p className="text-[11px] text-white/25">{game.platform}</p>
                )}
              </div>
              <ChevronRight size={14} className="text-white/20 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── RUNNING ───────────────────────────────────────────────────────
  if (phase === 'running' && session) {
    return (
      <div className="mb-4">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-600/10 to-indigo-600/8">
          {session.thumbnail ? (
            <img
              src={session.thumbnail}
              alt=""
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 ring-1 ring-white/10"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Flame size={18} className="text-purple-300" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-px">
              <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Live Session</span>
            </div>
            <p className="text-sm font-semibold text-white/90 truncate">{session.gameName}</p>
          </div>

          <div className="font-mono text-xl font-bold text-white tabular-nums tracking-tight flex-shrink-0">
            {formatTime(elapsed)}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={initiateEnd}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 rounded-lg text-xs font-semibold transition-all"
            >
              <Square size={11} fill="currentColor" />
              End
            </button>
            <button
              onClick={discard}
              title="Discard without logging"
              className="p-1.5 text-white/20 hover:text-white/50 transition-colors rounded"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── ENDING ────────────────────────────────────────────────────────
  if (phase === 'ending' && session) {
    return (
      <div className="mb-4 bg-[#0f0f1a] border border-white/10 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4">
          {/* Summary */}
          <div className="flex items-center gap-3 mb-5">
            {session.thumbnail ? (
              <img
                src={session.thumbnail}
                alt=""
                className="w-12 h-12 rounded-xl object-cover ring-1 ring-white/10"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Check size={20} className="text-purple-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/40 mb-0.5">Session complete</p>
              <p className="text-sm font-bold text-white/90 truncate">{session.gameName}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white font-mono">{endHours}h</p>
              <p className="text-[11px] text-white/30">to log</p>
            </div>
          </div>

          {/* Mood */}
          <p className="text-xs text-white/35 mb-2">How was it? <span className="text-white/20">(optional)</span></p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {MOODS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setMood(mood === opt.value ? undefined : opt.value)}
                className={clsx(
                  'flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-all',
                  mood === opt.value
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-white/[0.03] text-white/35 border border-transparent hover:bg-white/[0.06]'
                )}
              >
                <span className="text-lg leading-none">{opt.emoji}</span>
                <span className="text-[10px]">{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setPhase('running')}
              className="px-4 py-2.5 text-sm text-white/40 hover:text-white/60 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl transition-all"
            >
              Keep going
            </button>
            <button
              onClick={confirmLog}
              disabled={logging}
              className="flex-1 py-2.5 bg-purple-600/25 hover:bg-purple-600/35 text-purple-300 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            >
              {logging ? 'Logging…' : 'Log Session'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
