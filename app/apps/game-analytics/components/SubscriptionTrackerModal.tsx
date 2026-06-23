'use client';

import { useMemo, useState } from 'react';
import { X, Repeat, Plus, Gamepad2, Trash2, Ban } from 'lucide-react';
import clsx from 'clsx';
import { Game, SubscriptionSource } from '../lib/types';
import { getSubscriptionValueReport, SubscriptionValueEntry } from '../lib/calculations';
import { formatCurrency, formatHours } from '../lib/format';
import { BillingCycle } from '../lib/subscription-tracker-storage';
import { useSubscriptionTracker } from '../hooks/useSubscriptionTracker';

interface SubscriptionTrackerModalProps {
  games: Game[];
  userId: string | null;
  onOpenGame: (gameId: string) => void;
  onClose: () => void;
}

const SERVICES: SubscriptionSource[] = ['PS Plus', 'Game Pass', 'Epic Free', 'Prime Gaming', 'Humble Choice', 'Other'];

const VERDICT_STYLE: Record<SubscriptionValueEntry['verdict'], { color: string; bg: string }> = {
  'Crushing It': { color: '#34d399', bg: 'rgba(52, 211, 153, 0.12)' },
  'Worth It': { color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.12)' },
  'Break Even': { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)' },
  'Losing Money': { color: '#f87171', bg: 'rgba(248, 113, 113, 0.12)' },
  'No Data Yet': { color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.1)' },
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function SubscriptionCard({
  entry,
  onCancel,
  onRemove,
  onOpenGame,
}: {
  entry: SubscriptionValueEntry;
  onCancel: () => void;
  onRemove: () => void;
  onOpenGame: (gameId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const style = VERDICT_STYLE[entry.verdict];

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[13px] text-white/85 font-medium truncate">
            {entry.label || entry.service}
            {entry.label && <span className="text-white/35 font-normal"> · {entry.service}</span>}
          </div>
          <div className="text-[11px] text-white/35 mt-0.5">
            {formatCurrency(entry.cost)}/{entry.billingCycle === 'monthly' ? 'mo' : 'yr'}
            {!entry.isActive && <span className="text-white/25"> · cancelled</span>}
          </div>
        </div>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap shrink-0"
          style={{ color: style.color, backgroundColor: style.bg }}
        >
          {entry.verdict}
        </span>
      </div>

      <div className="text-[11px] text-white/50 leading-relaxed">{entry.verdictLine}</div>

      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <div className="text-[13px] text-white/85 font-bold">{formatCurrency(entry.totalCostToDate)}</div>
          <div className="text-[9px] uppercase tracking-wide text-white/25 font-semibold mt-0.5">Paid so far</div>
        </div>
        <div className="text-center">
          <div className="text-[13px] text-white/85 font-bold">{formatCurrency(entry.totalValueClaimed)}</div>
          <div className="text-[9px] uppercase tracking-wide text-white/25 font-semibold mt-0.5">Value claimed</div>
        </div>
        <div className="text-center">
          <div className="text-[13px] text-white/85 font-bold">{formatHours(entry.totalHoursPlayed)}</div>
          <div className="text-[9px] uppercase tracking-wide text-white/25 font-semibold mt-0.5">Played</div>
        </div>
      </div>

      {entry.claimedGames.length > 0 && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-[11px] text-white/40 hover:text-white/65 transition-colors"
        >
          {expanded ? 'Hide' : 'Show'} {entry.claimedGames.length} claimed game{entry.claimedGames.length === 1 ? '' : 's'}
        </button>
      )}

      {expanded && (
        <div className="space-y-1.5 pt-1">
          {entry.claimedGames.map(g => (
            <button
              key={g.gameId}
              onClick={() => onOpenGame(g.gameId)}
              className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-left"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <Gamepad2 size={12} className="text-white/25 shrink-0" />
                <span className="text-[11px] text-white/70 truncate">{g.name}</span>
              </span>
              <span className="text-[10px] text-white/35 shrink-0">
                {formatHours(g.hoursPlayed)} · {formatCurrency(g.estimatedValue)} value
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        {entry.isActive && (
          <button
            onClick={onCancel}
            className="flex items-center gap-1 text-[11px] text-white/35 hover:text-amber-300 transition-colors"
          >
            <Ban size={12} /> Mark cancelled
          </button>
        )}
        <button
          onClick={onRemove}
          className="flex items-center gap-1 text-[11px] text-white/35 hover:text-red-300 transition-colors ml-auto"
        >
          <Trash2 size={12} /> Remove
        </button>
      </div>
    </div>
  );
}

export function SubscriptionTrackerModal({ games, userId, onOpenGame, onClose }: SubscriptionTrackerModalProps) {
  const { subscriptions, add, cancel, remove } = useSubscriptionTracker(userId);
  const [showForm, setShowForm] = useState(subscriptions.length === 0);
  const [service, setService] = useState<SubscriptionSource>('Game Pass');
  const [label, setLabel] = useState('');
  const [cost, setCost] = useState('');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [startedAt, setStartedAt] = useState(todayStr());

  const report = useMemo(() => getSubscriptionValueReport(games, subscriptions), [games, subscriptions]);

  const submit = () => {
    const amount = parseFloat(cost);
    if (!Number.isFinite(amount) || amount <= 0) return;
    add({ service, label: service === 'Other' ? label : undefined, cost: amount, billingCycle, startedAt });
    setCost('');
    setLabel('');
    setShowForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <Repeat size={18} className="text-teal-400" />
            <h3 className="text-lg font-bold text-white/90">Subscription Value Tracker</h3>
          </div>
          <button onClick={onClose} className="p-1 text-white/30 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {subscriptions.length === 0 && !showForm ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <Repeat size={28} className="text-white/15" />
              <div className="text-[13px] text-white/40">No subscriptions tracked yet</div>
              <div className="text-[11px] text-white/25 max-w-xs">
                Add Game Pass, PS Plus, Prime Gaming, or anything else you pay for, and see if it&apos;s actually
                paying for itself.
              </div>
            </div>
          ) : (
            <>
              {subscriptions.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                    <div className="text-[10px] uppercase tracking-wide text-white/30 font-semibold">Monthly cost</div>
                    <div className="text-[14px] text-white/85 font-bold mt-0.5">{formatCurrency(report.totalMonthlyCost)}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                    <div className="text-[10px] uppercase tracking-wide text-white/30 font-semibold">Value claimed</div>
                    <div className="text-[14px] text-white/85 font-bold mt-0.5">{formatCurrency(report.totalValueClaimed)}</div>
                  </div>
                  <div
                    className={clsx(
                      'p-3 rounded-xl border',
                      report.netValue >= 0 ? 'bg-emerald-500/[0.06] border-emerald-500/20' : 'bg-red-500/[0.06] border-red-500/20'
                    )}
                  >
                    <div className="text-[10px] uppercase tracking-wide text-white/30 font-semibold">Net value</div>
                    <div
                      className={clsx('text-[14px] font-bold mt-0.5', report.netValue >= 0 ? 'text-emerald-300' : 'text-red-300')}
                    >
                      {report.netValue >= 0 ? '+' : ''}
                      {formatCurrency(report.netValue)}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {report.entries.map(entry => (
                  <SubscriptionCard
                    key={entry.id}
                    entry={entry}
                    onCancel={() => cancel(entry.id)}
                    onRemove={() => remove(entry.id)}
                    onOpenGame={onOpenGame}
                  />
                ))}
              </div>
            </>
          )}

          {showForm ? (
            <div className="space-y-3 p-3 rounded-xl bg-teal-500/[0.06] border border-teal-500/20">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={service}
                  onChange={e => setService(e.target.value as SubscriptionSource)}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/90 text-[13px] focus:outline-none focus:border-teal-500/40"
                >
                  {SERVICES.map(s => (
                    <option key={s} value={s} className="bg-[#15151c]">
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={billingCycle}
                  onChange={e => setBillingCycle(e.target.value as BillingCycle)}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/90 text-[13px] focus:outline-none focus:border-teal-500/40"
                >
                  <option value="monthly" className="bg-[#15151c]">Monthly</option>
                  <option value="yearly" className="bg-[#15151c]">Yearly</option>
                </select>
              </div>
              {service === 'Other' && (
                <input
                  type="text"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="What's it called? e.g. EA Play"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/90 text-[13px] placeholder:text-white/25 focus:outline-none focus:border-teal-500/40"
                />
              )}
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  value={cost}
                  onChange={e => setCost(e.target.value)}
                  placeholder="Cost, e.g. 16.99"
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/90 text-[13px] placeholder:text-white/25 focus:outline-none focus:border-teal-500/40"
                />
                <input
                  type="date"
                  value={startedAt}
                  onChange={e => setStartedAt(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/90 text-[13px] focus:outline-none focus:border-teal-500/40"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={submit}
                  className="px-4 py-2 rounded-lg bg-teal-600/80 hover:bg-teal-600 text-white text-[12px] font-medium transition-colors"
                >
                  Add subscription
                </button>
                {subscriptions.length > 0 && (
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-[12px] font-medium transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-dashed border-white/15 text-white/40 hover:text-white/65 hover:border-white/25 transition-colors text-[12px] font-medium"
            >
              <Plus size={14} /> Track another subscription
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
