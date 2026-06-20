'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  CalendarClock, X, Gamepad2, RefreshCw, Trash2, Download, Play, ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import { Game } from '../lib/types';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { downloadFile } from '../lib/export-service';
import {
  ScheduleSlot,
  ScheduleCandidate,
  loadSavedAvailability,
  saveAvailability,
  loadDefaultStartTime,
  saveDefaultStartTime,
  getScheduleCandidates,
  buildWeeklyPlan,
  cycleSlotGame,
  clearSlotGame,
  generateICS,
} from '../lib/schedule-service';

const GRADE_STYLE: Record<string, { color: string; bg: string }> = {
  S: { color: '#fde047', bg: 'rgba(253,224,71,0.15)' },
  A: { color: '#6ee7b7', bg: 'rgba(110,231,183,0.15)' },
  B: { color: '#93c5fd', bg: 'rgba(147,197,253,0.15)' },
  C: { color: '#c4b5fd', bg: 'rgba(196,181,253,0.15)' },
  D: { color: '#fdba74', bg: 'rgba(253,186,116,0.15)' },
};

const QUICK_HOURS = [0, 1, 2, 3, 4];

interface SchedulePlannerModalProps {
  games: Game[];
  gamesWithMetrics: GameWithMetrics[];
  queuedGames: Game[];
  onClose: () => void;
  onOpenGame: (game: GameWithMetrics) => void;
  onStartTimer: (game: GameWithMetrics) => void;
}

export function SchedulePlannerModal({
  games,
  gamesWithMetrics,
  queuedGames,
  onClose,
  onOpenGame,
  onStartTimer,
}: SchedulePlannerModalProps) {
  const [hoursByOffset, setHoursByOffset] = useState<Record<number, number>>({});
  const [startTime, setStartTime] = useState('19:00');
  const [slots, setSlots] = useState<ScheduleSlot[] | null>(null);

  useEffect(() => {
    const saved = loadSavedAvailability();
    setHoursByOffset(Object.keys(saved).length > 0 ? saved : { 0: 2, 1: 2, 2: 0, 3: 2, 4: 0, 5: 3, 6: 3 });
    setStartTime(loadDefaultStartTime());
  }, []);

  const candidates = useMemo<ScheduleCandidate[]>(
    () => getScheduleCandidates(games, queuedGames),
    [games, queuedGames],
  );

  const totalPlannedHours = Object.values(hoursByOffset).reduce((sum, h) => sum + (h || 0), 0);

  const setHours = (offset: number, hours: number) => {
    const next = { ...hoursByOffset, [offset]: Math.max(0, hours) };
    setHoursByOffset(next);
    saveAvailability(next);
  };

  const handleStartTimeChange = (time: string) => {
    setStartTime(time);
    saveDefaultStartTime(time);
  };

  const handleGenerate = () => {
    setSlots(buildWeeklyPlan(candidates, hoursByOffset, startTime));
  };

  const handleSwap = (index: number) => {
    if (!slots) return;
    const next = [...slots];
    next[index] = cycleSlotGame(next[index], candidates);
    setSlots(next);
  };

  const handleClear = (index: number) => {
    if (!slots) return;
    const next = [...slots];
    next[index] = clearSlotGame(next[index]);
    setSlots(next);
  };

  const handleExport = () => {
    if (!slots) return;
    const ics = generateICS(slots);
    const today = new Date();
    const filename = `game-schedule-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}.ics`;
    downloadFile(ics, filename, 'text/calendar');
  };

  const plannedEvents = slots?.filter(s => s.gameId && s.durationHours > 0) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full sm:max-w-lg bg-[#0e0e1a] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0e0e1a] px-5 pt-5 pb-3 border-b border-white/5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <CalendarClock size={18} className="text-cyan-400" />
              <h2 className="text-base font-bold text-white">Plan My Week</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
            >
              <X size={16} />
            </button>
          </div>
          <p className="text-xs text-white/35">
            Set your free hours, get a chemistry-ranked play schedule, export it to your calendar
          </p>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Availability editor */}
          <div className="bg-white/[0.03] rounded-xl border border-white/5 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-white/60">This week&apos;s availability</p>
              <p className="text-[11px] text-white/30">{totalPlannedHours}h planned</p>
            </div>
            <div className="space-y-1.5">
              {slotDates().map(({ offset, label }) => (
                <div key={offset} className="flex items-center gap-2">
                  <span className="text-xs text-white/50 w-16 shrink-0">{label}</span>
                  <div className="flex gap-1 flex-1">
                    {QUICK_HOURS.map(h => (
                      <button
                        key={h}
                        onClick={() => setHours(offset, h)}
                        className={clsx(
                          'flex-1 py-1 rounded-lg text-[11px] font-medium transition-all',
                          (hoursByOffset[offset] ?? 0) === h
                            ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/35'
                            : 'bg-white/[0.03] text-white/30 border border-transparent hover:text-white/55',
                        )}
                      >
                        {h === 0 ? 'Off' : `${h}h`}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
              <span className="text-xs text-white/50">Default start time</span>
              <input
                type="time"
                value={startTime}
                onChange={e => handleStartTimeChange(e.target.value)}
                className="ml-auto bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/80"
              />
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={candidates.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-500/15 hover:bg-cyan-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-cyan-300 rounded-xl text-sm font-semibold transition-all"
          >
            <RefreshCw size={14} />
            {slots ? 'Regenerate Plan' : 'Generate Plan'}
          </button>

          {candidates.length === 0 && (
            <div className="text-center py-6">
              <Gamepad2 size={32} className="mx-auto mb-2 text-white/10" />
              <p className="text-white/30 text-sm">No eligible games found</p>
              <p className="text-white/20 text-xs mt-1">Owned games that aren&apos;t finished can be scheduled</p>
            </div>
          )}

          {/* Weekly grid */}
          {slots && (
            <div className="space-y-2">
              {slots.map((slot, i) => (
                <ScheduleSlotRow
                  key={slot.dayOffset}
                  slot={slot}
                  isToday={slot.dayOffset === 0}
                  onSwap={() => handleSwap(i)}
                  onClear={() => handleClear(i)}
                  onOpen={() => {
                    if (!slot.gameId) return;
                    const game = gamesWithMetrics.find(g => g.id === slot.gameId);
                    if (game) onOpenGame(game);
                  }}
                  onStart={() => {
                    if (!slot.gameId) return;
                    const game = gamesWithMetrics.find(g => g.id === slot.gameId);
                    if (game) onStartTimer(game);
                  }}
                />
              ))}

              <button
                onClick={handleExport}
                disabled={plannedEvents.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 mt-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white/70 rounded-xl text-sm font-semibold transition-all"
              >
                <Download size={14} />
                Export to Calendar (.ics)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function slotDates(): { offset: number; label: string }[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const label = offset === 0
      ? 'Today'
      : d.toLocaleDateString('en-US', { weekday: 'short' });
    return { offset, label };
  });
}

function ScheduleSlotRow({
  slot,
  isToday,
  onSwap,
  onClear,
  onOpen,
  onStart,
}: {
  slot: ScheduleSlot;
  isToday: boolean;
  onSwap: () => void;
  onClear: () => void;
  onOpen: () => void;
  onStart: () => void;
}) {
  const hasGame = !!slot.gameId && slot.durationHours > 0;
  const gradeStyle = slot.chemistryGrade ? GRADE_STYLE[slot.chemistryGrade] ?? GRADE_STYLE.C : null;

  return (
    <div
      className={clsx(
        'rounded-xl border p-3 transition-all',
        isToday ? 'border-cyan-500/25 bg-cyan-500/[0.04]' : 'border-white/5 bg-white/[0.02]',
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className={clsx('text-xs font-semibold', isToday ? 'text-cyan-300' : 'text-white/50')}>
          {slot.dateLabel}
        </span>
        {slot.durationHours > 0 && (
          <span className="text-[11px] text-white/25">
            {slot.startTime} · {slot.durationHours}h
          </span>
        )}
      </div>

      {!hasGame ? (
        <p className="text-xs text-white/20">
          {slot.durationHours <= 0 ? 'No availability set' : 'No game assigned'}
        </p>
      ) : (
        <div className="flex items-center gap-3">
          <div className="relative shrink-0 cursor-pointer" onClick={onOpen}>
            {slot.thumbnail ? (
              <img src={slot.thumbnail} alt={slot.gameName ?? ''} className="w-11 h-11 rounded-lg object-cover" />
            ) : (
              <div className="w-11 h-11 rounded-lg bg-white/5 flex items-center justify-center">
                <Gamepad2 size={18} className="text-white/20" />
              </div>
            )}
            {gradeStyle && (
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border-[1.5px] border-[#0e0e1a]"
                style={{ backgroundColor: gradeStyle.bg, color: gradeStyle.color }}
              >
                {slot.chemistryGrade}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
            <p className="text-sm font-semibold text-white/85 truncate leading-tight">{slot.gameName}</p>
            {slot.justification && (
              <p className="text-[11px] text-white/35 truncate leading-snug mt-0.5">{slot.justification}</p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isToday && (
              <button
                onClick={onStart}
                title="Start timer"
                className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-all"
              >
                <Play size={14} />
              </button>
            )}
            <button
              onClick={onSwap}
              title="Swap game"
              className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
            >
              <RefreshCw size={13} />
            </button>
            <button
              onClick={onClear}
              title="Clear"
              className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <Trash2 size={13} />
            </button>
            <ChevronRight size={14} className="text-white/10" />
          </div>
        </div>
      )}
    </div>
  );
}
