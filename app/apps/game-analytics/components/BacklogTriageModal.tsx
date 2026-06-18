'use client';

import { useState, useMemo, useCallback } from 'react';
import { X, Gamepad2, ListPlus, HeartCrack, Hourglass, Inbox, PartyPopper } from 'lucide-react';
import { Game } from '../lib/types';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { getBacklogTriageCandidates, TriageCandidate } from '../lib/calculations';
import { formatCurrency } from '../lib/format';
import clsx from 'clsx';

const SNOOZE_DAYS = 21;
const SNOOZE_KEY = 'ga-triage-snoozed';

function readSnoozed(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(SNOOZE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeSnoozed(map: Record<string, string>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SNOOZE_KEY, JSON.stringify(map));
}

type Decision = 'queued' | 'abandoned' | 'snoozed';

interface BacklogTriageModalProps {
  games: Game[];
  gamesWithMetrics: GameWithMetrics[];
  onClose: () => void;
  onQueue: (gameId: string) => Promise<void>;
  onAbandon: (gameId: string) => Promise<void>;
  onOpenGame: (game: GameWithMetrics) => void;
}

export function BacklogTriageModal({ games, gamesWithMetrics, onClose, onQueue, onAbandon, onOpenGame }: BacklogTriageModalProps) {
  const [snoozed, setSnoozed] = useState<Record<string, string>>(() => readSnoozed());
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | 'up' | null>(null);
  const [tally, setTally] = useState<{ decision: Decision; candidate: TriageCandidate }[]>([]);

  const candidates = useMemo(() => {
    const now = Date.now();
    return getBacklogTriageCandidates(games).filter(c => {
      const until = snoozed[c.game.id];
      return !until || new Date(until).getTime() < now;
    });
  }, [games, snoozed]);

  const current = candidates[index];
  const done = index >= candidates.length;

  const act = useCallback(async (decision: Decision, direction: 'left' | 'right' | 'up') => {
    if (!current || busy) return;
    setBusy(true);
    setExitDirection(direction);

    try {
      if (decision === 'queued') {
        await onQueue(current.game.id);
      } else if (decision === 'abandoned') {
        await onAbandon(current.game.id);
      } else {
        const next = { ...snoozed, [current.game.id]: new Date(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000).toISOString() };
        writeSnoozed(next);
        setSnoozed(next);
      }
      setTally(t => [...t, { decision, candidate: current }]);
    } finally {
      setTimeout(() => {
        setIndex(i => i + 1);
        setExitDirection(null);
        setBusy(false);
      }, 220);
    }
  }, [current, busy, onQueue, onAbandon, snoozed]);

  const queuedCount = tally.filter(t => t.decision === 'queued').length;
  const abandonedCount = tally.filter(t => t.decision === 'abandoned').length;
  const snoozedCount = tally.filter(t => t.decision === 'snoozed').length;
  const hoursDecided = tally.reduce((sum, t) => sum + t.candidate.totalHours, 0);
  const moneyDecided = tally
    .filter(t => t.decision !== 'snoozed')
    .reduce((sum, t) => sum + (t.candidate.game.price || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#12121a] border border-white/10 rounded-2xl max-w-sm w-full p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Inbox size={18} className="text-amber-400" />
            <h2 className="text-base font-semibold text-white">Backlog Triage</h2>
          </div>
          <button onClick={onClose} className="p-1 text-white/40 hover:text-white/80 transition-colors" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {candidates.length === 0 ? (
          <div className="py-10 text-center">
            <PartyPopper size={32} className="mx-auto mb-3 text-emerald-400" />
            <p className="text-sm text-white/70 font-medium">Nothing needs a decision right now.</p>
            <p className="text-xs text-white/40 mt-1">Every game in progress or unstarted is in good standing.</p>
          </div>
        ) : done ? (
          <div className="py-6 text-center">
            <PartyPopper size={32} className="mx-auto mb-3 text-purple-400" />
            <p className="text-base text-white font-semibold mb-1">Triage complete</p>
            <p className="text-xs text-white/40 mb-5">You made a call on {tally.length} game{tally.length === 1 ? '' : 's'}.</p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-lg font-bold text-purple-300">{queuedCount}</div>
                <div className="text-[10px] text-white/40 mt-0.5">Queued</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-lg font-bold text-rose-300">{abandonedCount}</div>
                <div className="text-[10px] text-white/40 mt-0.5">Let go</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-lg font-bold text-amber-300">{snoozedCount}</div>
                <div className="text-[10px] text-white/40 mt-0.5">Snoozed</div>
              </div>
            </div>
            {(hoursDecided > 0 || moneyDecided > 0) && (
              <p className="text-xs text-white/40 mb-5">
                That covers {hoursDecided}h of playtime and {formatCurrency(moneyDecided)} of spend you finally made a call on.
              </p>
            )}
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-medium text-sm bg-purple-600 text-white hover:bg-purple-500 transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-[11px] text-white/40 mb-3">
              <span>{index + 1} of {candidates.length}</span>
              <span style={{ color: current.urgencyColor }}>{current.urgencyLabel}</span>
            </div>

            <button
              onClick={() => {
                const withMetrics = gamesWithMetrics.find(g => g.id === current.game.id);
                if (withMetrics) onOpenGame(withMetrics);
              }}
              className={clsx(
                'w-full text-left rounded-xl border p-4 mb-4 transition-all duration-200',
                'bg-white/[0.02] border-white/10 hover:border-white/20',
                exitDirection === 'left' && 'opacity-0 -translate-x-12 rotate-[-6deg]',
                exitDirection === 'right' && 'opacity-0 translate-x-12 rotate-[6deg]',
                exitDirection === 'up' && 'opacity-0 -translate-y-8'
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                {current.game.thumbnail ? (
                  <img
                    src={current.game.thumbnail}
                    alt={current.game.name}
                    className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-14 h-14 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Gamepad2 size={22} className="text-white/20" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{current.game.name}</div>
                  <div
                    className="text-[11px] font-medium mt-0.5 inline-block px-1.5 py-0.5 rounded"
                    style={{ color: current.relationship.color, backgroundColor: current.relationship.bgColor }}
                  >
                    {current.relationship.label}
                  </div>
                </div>
              </div>
              <p className="text-xs text-white/50 leading-relaxed">{current.contextLine}</p>
              {current.game.price > 0 && (
                <p className="text-[11px] text-white/30 mt-2">Paid {formatCurrency(current.game.price)}</p>
              )}
            </button>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => act('abandoned', 'left')}
                disabled={busy}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 active:scale-95 transition-all disabled:opacity-40"
              >
                <HeartCrack size={18} />
                <span className="text-[11px] font-medium">Let it go</span>
              </button>
              <button
                onClick={() => act('snoozed', 'up')}
                disabled={busy}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 active:scale-95 transition-all disabled:opacity-40"
              >
                <Hourglass size={18} />
                <span className="text-[11px] font-medium">Snooze</span>
              </button>
              <button
                onClick={() => act('queued', 'right')}
                disabled={busy}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 active:scale-95 transition-all disabled:opacity-40"
              >
                <ListPlus size={18} />
                <span className="text-[11px] font-medium">Queue it</span>
              </button>
            </div>
            <p className="text-center text-[10px] text-white/25 mt-3">
              Snoozed games come back to triage in {SNOOZE_DAYS} days. Tap the card to open full details.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
