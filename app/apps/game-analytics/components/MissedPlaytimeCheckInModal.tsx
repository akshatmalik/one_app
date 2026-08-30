'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Gamepad2,
  Library,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { Game } from '../lib/types';
import { getSuggestedCheckInGames, parseCheckInDate } from '../lib/missed-check-in';

export interface CatchUpSessionInput {
  id: string;
  date: string;
  gameId?: string;
  newGameName?: string;
  newGamePlatform?: string;
  hours: number;
  notes?: string;
}

export interface MissedDaySubmission {
  date: string;
  sessions: CatchUpSessionInput[];
}

interface DraftSession {
  id: string;
  gameId?: string;
  newGameName?: string;
  newGamePlatform?: string;
  hours: string;
  notes: string;
}

interface DayDraft {
  date: string;
  status: 'pending' | 'complete';
  sessions: DraftSession[];
}

interface Props {
  games: Game[];
  dates: string[];
  userId: string;
  onSave: (days: MissedDaySubmission[]) => Promise<void>;
  onPostpone: () => void;
}

const DRAFT_PREFIX = 'game-analytics-missed-check-in-draft';

function draftKey(userId: string): string {
  return `${DRAFT_PREFIX}-${userId || 'local-user'}`;
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function makeDrafts(dates: string[], userId: string): DayDraft[] {
  const defaults = dates.map(date => ({ date, status: 'pending' as const, sessions: [] }));
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(draftKey(userId));
    if (!raw) return defaults;
    const saved = JSON.parse(raw) as DayDraft[];
    if (!Array.isArray(saved)) return defaults;
    return defaults.map(fallback => {
      const prior = saved.find(day => day.date === fallback.date);
      if (!prior || !Array.isArray(prior.sessions)) return fallback;
      return prior;
    });
  } catch {
    return defaults;
  }
}

function formatDate(date: string): string {
  return parseCheckInDate(date)?.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }) ?? date;
}

function formatHours(hours: number): string {
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

export function MissedPlaytimeCheckInModal({ games, dates, userId, onSave, onPostpone }: Props) {
  const [drafts, setDrafts] = useState<DayDraft[]>(() => makeDrafts(dates, userId));
  const [step, setStep] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [newGameOpen, setNewGameOpen] = useState(false);
  const [newGameName, setNewGameName] = useState('');
  const [newGamePlatform, setNewGamePlatform] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReview = step >= dates.length;
  const current = !isReview ? drafts[step] : null;
  const ownedGames = useMemo(
    () => games.filter(game => game.status !== 'Wishlist').sort((a, b) => a.name.localeCompare(b.name)),
    [games],
  );
  const suggestions = useMemo(
    () => current ? getSuggestedCheckInGames(games, current.date) : [],
    [current, games],
  );
  const filteredGames = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return ownedGames.slice(0, 8);
    return ownedGames.filter(game => game.name.toLowerCase().includes(query)).slice(0, 8);
  }, [ownedGames, search]);

  useEffect(() => {
    try {
      localStorage.setItem(draftKey(userId), JSON.stringify(drafts));
    } catch {
      // Draft recovery is best-effort.
    }
  }, [drafts, userId]);

  const updateCurrent = (updater: (day: DayDraft) => DayDraft) => {
    if (!current) return;
    setDrafts(previous => previous.map((day, index) => index === step ? updater(day) : day));
  };

  const addTrackedSession = (gameId: string, suggestedHours?: number | null) => {
    const hours = suggestedHours && suggestedHours > 0
      ? String(Math.max(0.5, Math.round(suggestedHours * 2) / 2))
      : '1';
    updateCurrent(day => ({
      ...day,
      status: 'complete',
      sessions: [...day.sessions, { id: newId(), gameId, hours, notes: '' }],
    }));
    setSearchOpen(false);
    setSearch('');
  };

  const addNewGameSession = () => {
    const name = newGameName.trim();
    if (!name) return;
    const existing = ownedGames.find(game => game.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      addTrackedSession(existing.id);
    } else {
      updateCurrent(day => ({
        ...day,
        status: 'complete',
        sessions: [...day.sessions, {
          id: newId(),
          newGameName: name,
          newGamePlatform: newGamePlatform.trim() || undefined,
          hours: '1',
          notes: '',
        }],
      }));
    }
    setNewGameName('');
    setNewGamePlatform('');
    setNewGameOpen(false);
  };

  const updateSession = (id: string, changes: Partial<DraftSession>) => {
    updateCurrent(day => ({
      ...day,
      sessions: day.sessions.map(session => session.id === id ? { ...session, ...changes } : session),
    }));
  };

  const removeSession = (id: string) => {
    updateCurrent(day => {
      const sessions = day.sessions.filter(session => session.id !== id);
      return { ...day, sessions, status: sessions.length > 0 ? 'complete' : 'pending' };
    });
  };

  const currentValid = current
    ? current.status === 'complete' &&
      current.sessions.length > 0 &&
      current.sessions.every(session => Number(session.hours) > 0)
    : false;

  const goNext = () => {
    if (!currentValid) return;
    setSearchOpen(false);
    setNewGameOpen(false);
    setStep(value => value + 1);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(drafts.map(day => ({
        date: day.date,
        sessions: day.sessions.map(session => ({
          id: session.id,
          date: day.date,
          gameId: session.gameId,
          newGameName: session.newGameName,
          newGamePlatform: session.newGamePlatform,
          hours: Number(session.hours),
          notes: session.notes.trim() || undefined,
        })),
      })));
      localStorage.removeItem(draftKey(userId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save your catch-up. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#12121a] shadow-2xl">
        <div className="border-b border-white/5 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-purple-500/15 p-2 text-purple-400">
                <Gamepad2 size={19} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {isReview ? 'Review play time' : 'Catch up your play time'}
                </h2>
                <p className="mt-0.5 text-xs text-white/40">
                  {isReview
                    ? 'Nothing is saved until you confirm below.'
                    : `${formatDate(current!.date)} · ${step + 1} of ${dates.length}`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onPostpone}
              className="rounded-lg p-1.5 text-white/40 transition-all hover:bg-white/5 hover:text-white/70"
              aria-label="Not now"
              title="Not now"
            >
              <X size={20} />
            </button>
          </div>
          <div className="mt-4 flex gap-1">
            {dates.map((date, index) => (
              <div
                key={date}
                className={clsx(
                  'h-1 flex-1 rounded-full transition-colors',
                  index < step ? 'bg-purple-500' : index === step && !isReview ? 'bg-purple-500/60' : 'bg-white/10',
                )}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {isReview ? (
            <ReviewStep drafts={drafts} games={games} />
          ) : (
            <div className="space-y-4">
                  {current!.sessions.length === 0 && suggestions.length > 0 && (
                    <section>
                      <div className="mb-2.5 flex items-center gap-2">
                        <Gamepad2 size={15} className="text-purple-400" />
                        <h3 className="text-xs font-medium text-white/50">What did you play?</h3>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {suggestions.map(suggestion => (
                          <button
                            key={suggestion.game.id}
                            type="button"
                            onClick={() => addTrackedSession(suggestion.game.id, suggestion.averageSessionHours)}
                            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition-all hover:border-purple-500/40 hover:bg-purple-500/10"
                          >
                            {suggestion.game.thumbnail ? (
                              <div
                                role="img"
                                aria-label={`${suggestion.game.name} cover`}
                                className="h-11 w-11 shrink-0 rounded-lg bg-cover bg-center"
                                style={{ backgroundImage: `url(${suggestion.game.thumbnail})` }}
                              />
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/5 text-white/25"><Gamepad2 size={18} /></div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-white/85">{suggestion.game.name}</p>
                              <p className="mt-0.5 truncate text-[11px] text-white/35">{suggestion.context}</p>
                            </div>
                            <Plus size={15} className="shrink-0 text-purple-400" />
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {current!.sessions.length > 0 && (
                    <section className="space-y-3">
                      <h3 className="text-xs font-medium text-white/50">Sessions to add</h3>
                      {current!.sessions.map(session => (
                        <SessionEditor
                          key={session.id}
                          session={session}
                          game={games.find(game => game.id === session.gameId)}
                          onChange={changes => updateSession(session.id, changes)}
                          onRemove={() => removeSession(session.id)}
                        />
                      ))}
                    </section>
                  )}

                  <section className="grid gap-2 sm:grid-cols-2">
                    <button type="button" onClick={() => { setSearchOpen(value => !value); setNewGameOpen(false); }} className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs font-medium text-white/60 transition-all hover:bg-white/[0.06] hover:text-white">
                      <Library size={15} /> Something else
                    </button>
                    <button type="button" onClick={() => { setNewGameOpen(value => !value); setSearchOpen(false); }} className="flex items-center justify-center gap-2 rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-2.5 text-xs font-medium text-purple-400 transition-all hover:bg-purple-500/20">
                      <Sparkles size={15} /> Started something new
                    </button>
                  </section>

                  {searchOpen && (
                    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                        <input autoFocus value={search} onChange={event => setSearch(event.target.value)} placeholder="Search your library" className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-white outline-none transition-all placeholder:text-white/25 focus:border-purple-500/50 focus:bg-white/[0.05]" />
                      </div>
                      <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
                        {filteredGames.map(game => (
                          <button key={game.id} type="button" onClick={() => addTrackedSession(game.id)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-white/65 hover:bg-white/5 hover:text-white">
                            <span className="truncate">{game.name}</span><Plus size={14} className="text-purple-400" />
                          </button>
                        ))}
                        {filteredGames.length === 0 && <p className="px-3 py-3 text-center text-xs text-white/30">No matching library game.</p>}
                      </div>
                    </section>
                  )}

                  {newGameOpen && (
                    <section className="rounded-xl border border-purple-500/20 bg-purple-500/[0.06] p-4">
                      <p className="text-sm font-medium text-white">Add the game and this session</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_160px_auto]">
                        <input autoFocus value={newGameName} onChange={event => setNewGameName(event.target.value)} placeholder="Game name" className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none transition-all placeholder:text-white/25 focus:border-purple-500/50 focus:bg-white/[0.05]" />
                        <input value={newGamePlatform} onChange={event => setNewGamePlatform(event.target.value)} placeholder="Platform (optional)" className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none transition-all placeholder:text-white/25 focus:border-purple-500/50 focus:bg-white/[0.05]" />
                        <button type="button" disabled={!newGameName.trim()} onClick={addNewGameSession} className="rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-40">Add</button>
                      </div>
                      <p className="mt-2 text-[11px] text-white/30">It will be marked In Progress. You can add price, genre, and artwork later.</p>
                    </section>
                  )}
            </div>
          )}
        </div>

        <div className="border-t border-white/5 bg-white/[0.01] p-4 sm:px-5">
          {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => step === 0 ? onPostpone() : setStep(value => value - 1)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-white/50 transition-all hover:bg-white/5 hover:text-white/75"
            >
              {step === 0 ? 'Not now' : <><ArrowLeft size={15} /> Back</>}
            </button>
            {isReview ? (
              <button type="button" disabled={saving} onClick={handleSave} className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-purple-500 disabled:cursor-wait disabled:opacity-60">
                <Check size={16} /> {saving ? 'Saving…' : `Save ${dates.length} day${dates.length === 1 ? '' : 's'}`}
              </button>
            ) : (
              <button type="button" disabled={!currentValid} onClick={goNext} className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-35">
                {step === dates.length - 1 ? 'Review' : 'Next day'} <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionEditor({ session, game, onChange, onRemove }: {
  session: DraftSession;
  game?: Game;
  onChange: (changes: Partial<DraftSession>) => void;
  onRemove: () => void;
}) {
  const label = game?.name ?? session.newGameName ?? 'New game';
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white/85">{label}</p>
          {session.newGameName && <p className="mt-0.5 text-[11px] text-purple-400/70">New game · {session.newGamePlatform || 'Platform not set'}</p>}
        </div>
        <button type="button" onClick={onRemove} className="rounded-lg p-1.5 text-white/25 hover:bg-red-500/10 hover:text-red-300" aria-label={`Remove ${label}`}><Trash2 size={15} /></button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {[0.5, 1, 2, 3].map(value => (
          <button key={value} type="button" onClick={() => onChange({ hours: String(value) })} className={clsx('rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all', Number(session.hours) === value ? 'border-purple-500/30 bg-purple-500/15 text-purple-400' : 'border-white/10 bg-white/[0.02] text-white/40 hover:bg-white/5 hover:text-white/70')}>
            {value === 0.5 ? '30m' : `${value}h`}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs text-white/35">
          Custom
          <input type="number" min="0.1" step="0.1" value={session.hours} onChange={event => onChange({ hours: event.target.value })} className="w-20 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-right text-sm text-white outline-none focus:border-purple-500/50" />
        </label>
      </div>
      <input value={session.notes} onChange={event => onChange({ notes: event.target.value })} placeholder="Session note (optional)" className="mt-3 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70 outline-none placeholder:text-white/20 focus:border-purple-500/50" />
    </div>
  );
}

function ReviewStep({ drafts, games }: {
  drafts: DayDraft[];
  games: Game[];
}) {
  return (
    <div className="space-y-3">
      {drafts.map(day => {
        const additions = day.sessions.reduce((sum, session) => sum + Number(session.hours || 0), 0);
        return (
          <div key={day.date} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">{formatDate(day.date)}</p>
                <p className="mt-0.5 text-xs text-white/35">
                  {day.sessions.length} new session{day.sessions.length === 1 ? '' : 's'}
                </p>
              </div>
              <span className="rounded-lg bg-purple-500/15 px-2.5 py-1 text-xs font-semibold text-purple-400">
                +{formatHours(additions)}
              </span>
            </div>
            {day.sessions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {day.sessions.map(session => (
                  <span key={session.id} className="rounded-lg bg-black/20 px-2.5 py-1.5 text-xs text-white/55">
                    {games.find(game => game.id === session.gameId)?.name ?? session.newGameName} · {formatHours(Number(session.hours))}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
