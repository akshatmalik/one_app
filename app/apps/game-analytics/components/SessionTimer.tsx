'use client';

import { useState, useCallback, useMemo } from 'react';
import { Play, Square, X, Search, Clock, Flame } from 'lucide-react';
import { Game, SessionMood } from '../lib/types';
import { useSessionTimer } from '../hooks/useSessionTimer';
import clsx from 'clsx';

const MOOD_OPTIONS: { value: SessionMood; label: string; emoji: string }[] = [
  { value: 'great', label: 'Great', emoji: '🔥' },
  { value: 'good',  label: 'Good',  emoji: '👍' },
  { value: 'meh',   label: 'Meh',   emoji: '😐' },
  { value: 'grind', label: 'Grind', emoji: '😤' },
];

interface SessionTimerProps {
  games: Game[];
  onLog: (gameId: string, hours: number, notes: string, mood?: SessionMood) => Promise<void>;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function SessionTimer({ games, onLog }: SessionTimerProps) {
  const { session, elapsedSecs, elapsedHours, displayH, displayM, displayS, startSession, clearSession } =
    useSessionTimer();

  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [customHours, setCustomHours] = useState('');
  const [notes, setNotes] = useState('');
  const [mood, setMood] = useState<SessionMood | undefined>();
  const [saving, setSaving] = useState(false);

  // Games available to track: not wishlist
  const trackableGames = useMemo(() => {
    return games
      .filter(g => g.status !== 'Wishlist')
      .sort((a, b) => {
        // Currently playing first, then by recently played
        if (a.status === 'In Progress' && b.status !== 'In Progress') return -1;
        if (b.status === 'In Progress' && a.status !== 'In Progress') return 1;
        const aLast = [...(a.playLogs ?? [])].sort((x, y) => y.date.localeCompare(x.date))[0]?.date ?? '';
        const bLast = [...(b.playLogs ?? [])].sort((x, y) => y.date.localeCompare(x.date))[0]?.date ?? '';
        return bLast.localeCompare(aLast);
      });
  }, [games]);

  const filteredGames = useMemo(() => {
    const q = pickerSearch.toLowerCase();
    if (!q) return trackableGames;
    return trackableGames.filter(g =>
      g.name.toLowerCase().includes(q) ||
      (g.platform ?? '').toLowerCase().includes(q) ||
      (g.genre ?? '').toLowerCase().includes(q)
    );
  }, [trackableGames, pickerSearch]);

  const handleStartPick = useCallback((game: Game) => {
    startSession({ id: game.id, name: game.name, thumbnail: game.thumbnail });
    setShowPicker(false);
    setPickerSearch('');
  }, [startSession]);

  const handleStopClick = useCallback(() => {
    if (!session) return;
    const rounded = Math.max(0.1, Math.round(elapsedHours * 10) / 10);
    setCustomHours(String(rounded));
    setNotes('');
    setMood(undefined);
    setShowStopDialog(true);
  }, [session, elapsedHours]);

  const handleConfirmLog = async () => {
    if (!session || saving) return;
    const hours = parseFloat(customHours);
    if (isNaN(hours) || hours <= 0) return;
    setSaving(true);
    try {
      await onLog(session.gameId, hours, notes, mood);
      clearSession();
      setShowStopDialog(false);
    } catch {
      // Non-critical — user can try again
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    clearSession();
    setShowStopDialog(false);
  };

  // ─── Timer display ────────────────────────────────────────────────────────
  const timerStr = displayH > 0
    ? `${displayH}:${pad2(displayM)}:${pad2(displayS)}`
    : `${pad2(displayM)}:${pad2(displayS)}`;

  // ─── Render: nothing when idle and picker closed ──────────────────────────
  return (
    <>
      {/* ── Start-session FAB (shown only when idle) ── */}
      {!session && (
        <div className="fixed bottom-6 right-4 z-40">
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#0e1a12]/95 border border-emerald-500/25 text-emerald-400/80 text-xs font-medium shadow-lg shadow-black/40 backdrop-blur-md hover:border-emerald-500/40 hover:text-emerald-300 active:scale-95 transition-all"
            title="Start a live session timer"
          >
            <Play size={13} className="shrink-0" />
            Track session
          </button>
        </div>
      )}

      {/* ── Active session floating bar ────────────────────────────────────── */}
      {session && !showStopDialog && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none pb-safe">
          <div
            className="pointer-events-auto mx-4 mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl border border-emerald-500/30 bg-[#0d1a14]/95 backdrop-blur-md shadow-xl shadow-black/50 w-full max-w-md"
            style={{ boxShadow: '0 0 20px rgba(16,185,129,0.15)' }}
          >
            {/* Pulsing dot */}
            <span className="relative shrink-0 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>

            {/* Thumbnail */}
            {session.gameThumbnail ? (
              <img
                src={session.gameThumbnail}
                alt=""
                className="h-8 w-12 object-cover rounded-md shrink-0 opacity-90"
              />
            ) : (
              <div className="h-8 w-12 rounded-md bg-emerald-500/10 shrink-0 flex items-center justify-center">
                <Flame size={14} className="text-emerald-400/60" />
              </div>
            )}

            {/* Game name + timer */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white/90 truncate">{session.gameName}</p>
              <p className="text-[11px] text-emerald-400 font-mono tabular-nums">{timerStr}</p>
            </div>

            {/* Stop button */}
            <button
              onClick={handleStopClick}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium active:bg-emerald-500/30 transition-all"
            >
              <Square size={11} className="fill-emerald-300" />
              Stop
            </button>
          </div>
        </div>
      )}

      {/* ── Game picker modal ───────────────────────────────────────────────── */}
      {showPicker && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm"
          onClick={() => { setShowPicker(false); setPickerSearch(''); }}
        >
          <div
            className="bg-[#0e0e16] rounded-t-2xl max-h-[80dvh] flex flex-col overflow-hidden animate-bottom-sheet-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 pb-3 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Play size={13} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white/90">Start a session</p>
                    <p className="text-[11px] text-white/35">We&apos;ll track how long you play</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowPicker(false); setPickerSearch(''); }}
                  className="p-1.5 text-white/30 hover:text-white/60 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                <input
                  autoFocus
                  type="text"
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  placeholder="Search games…"
                  className="w-full pl-8 pr-3 py-2 bg-white/[0.04] border border-white/10 text-white text-sm rounded-lg placeholder:text-white/25 focus:outline-none focus:border-emerald-500/40 transition-all"
                />
              </div>
            </div>

            {/* Game list */}
            <div className="overflow-y-auto flex-1 px-5 pb-8 space-y-1.5">
              {filteredGames.length === 0 ? (
                <p className="text-center text-sm text-white/30 py-8">No games match your search</p>
              ) : (
                filteredGames.map(game => (
                  <button
                    key={game.id}
                    onClick={() => handleStartPick(game)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 active:bg-white/[0.06] hover:bg-white/[0.04] transition-all text-left"
                  >
                    {game.thumbnail ? (
                      <img src={game.thumbnail} alt="" className="h-10 w-16 object-cover rounded-md shrink-0 opacity-80" />
                    ) : (
                      <div className="h-10 w-16 rounded-md bg-white/5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/85 truncate">{game.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={clsx(
                            'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                            game.status === 'In Progress' ? 'bg-blue-500/20 text-blue-400' :
                            game.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-white/5 text-white/30'
                          )}
                        >
                          {game.status}
                        </span>
                        {game.platform && (
                          <span className="text-[10px] text-white/25">{game.platform}</span>
                        )}
                      </div>
                    </div>
                    <Play size={14} className="text-emerald-400/40 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Stop confirmation dialog ─────────────────────────────────────────── */}
      {showStopDialog && session && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleDiscard}
        >
          <div
            className="bg-[#0e0e16] rounded-t-2xl w-full max-w-md animate-bottom-sheet-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            <div className="px-5 pt-2 pb-8">
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                {session.gameThumbnail ? (
                  <img src={session.gameThumbnail} alt="" className="h-12 w-18 rounded-xl object-cover" style={{ width: '4.5rem' }} />
                ) : (
                  <div className="h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center" style={{ width: '4.5rem' }}>
                    <Clock size={20} className="text-emerald-400/50" />
                  </div>
                )}
                <div>
                  <p className="text-base font-bold text-white/90">{session.gameName}</p>
                  <p className="text-sm text-emerald-400 font-mono">{timerStr} tracked</p>
                </div>
              </div>

              {/* Hours adjustment */}
              <div className="mb-4">
                <label className="text-xs text-white/40 block mb-1.5">Hours to log</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCustomHours(h => String(Math.max(0.1, Math.round((parseFloat(h) - 0.5) * 10) / 10)))}
                    className="w-9 h-9 rounded-lg bg-white/5 text-white/50 text-base font-bold active:bg-white/10 flex items-center justify-center"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={customHours}
                    onChange={e => setCustomHours(e.target.value)}
                    className="flex-1 text-center px-3 py-2 bg-white/[0.04] border border-white/10 text-white text-base font-semibold rounded-lg focus:outline-none focus:border-emerald-500/40"
                  />
                  <button
                    onClick={() => setCustomHours(h => String(Math.round((parseFloat(h) + 0.5) * 10) / 10))}
                    className="w-9 h-9 rounded-lg bg-white/5 text-white/50 text-base font-bold active:bg-white/10 flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Mood picker */}
              <div className="mb-4">
                <label className="text-xs text-white/40 block mb-1.5">How was it?</label>
                <div className="flex gap-2">
                  {MOOD_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setMood(prev => prev === opt.value ? undefined : opt.value)}
                      className={clsx(
                        'flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border text-[11px] font-medium transition-all',
                        mood === opt.value
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          : 'bg-white/[0.02] border-white/5 text-white/35 active:bg-white/[0.06]'
                      )}
                    >
                      <span className="text-base">{opt.emoji}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="mb-5">
                <label className="text-xs text-white/40 block mb-1.5">Session notes <span className="text-white/20">(optional)</span></label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Anything worth remembering…"
                  rows={2}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 text-white text-sm rounded-lg placeholder:text-white/20 focus:outline-none focus:border-emerald-500/40 resize-none transition-all"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmLog}
                  disabled={saving || !customHours || parseFloat(customHours) <= 0}
                  className="flex-1 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold text-sm active:bg-emerald-500/30 disabled:opacity-40 transition-all"
                >
                  {saving ? 'Saving…' : '✓ Log Session'}
                </button>
                <button
                  onClick={handleDiscard}
                  className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-white/35 text-sm active:bg-white/[0.07] transition-all"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
