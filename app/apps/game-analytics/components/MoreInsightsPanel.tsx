'use client';

import { Game } from '../lib/types';
import {
  getRegretRefund,
  getPersonalRecords,
  getStatOfTheDay,
  getRealWorldUnits,
  getTasteTwinGenres,
  getDeadlineGames,
} from '../lib/idea-stats';
import { Trophy, Wallet, Sparkles, Coffee, Heart, Clock } from 'lucide-react';

interface MoreInsightsPanelProps {
  games: Game[];
}

// NewIdeas100-June2026 — Wave 1 stats surfaced together.
export function MoreInsightsPanel({ games }: MoreInsightsPanelProps) {
  const refund = getRegretRefund(games);
  const records = getPersonalRecords(games);
  const sotd = getStatOfTheDay(games);
  const realWorld = getRealWorldUnits(games);
  const twins = getTasteTwinGenres(games);
  const deadlines = getDeadlineGames(games);

  return (
    <div className="space-y-4">
      {/* Beat the Clock deadlines (#74) */}
      {deadlines.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/80">
            <Clock size={16} className="text-orange-400" /> Beat the Clock
          </div>
          <div className="space-y-1.5">
            {deadlines.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <span className="truncate pr-2 text-white/80">{d.name}</span>
                <span className="flex items-center gap-2 text-xs">
                  <span className={d.daysLeft < 0 ? 'text-red-400' : 'text-white/50'}>
                    {d.daysLeft < 0 ? `${-d.daysLeft}d overdue` : `${d.daysLeft}d left`}
                  </span>
                  {d.onTrack !== null && (
                    <span className={d.onTrack ? 'text-emerald-400' : 'text-red-400'}>
                      {d.onTrack ? 'on track' : 'behind'}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Stat of the Day (#24) */}
      {sotd && (
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-blue-500/10 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/50">
            <Sparkles size={14} /> Stat of the Day
          </div>
          <p className="mt-2 text-sm text-white/90">
            <span className="mr-1">{sotd.icon}</span>
            {sotd.text}
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Personal Records (#23) */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/80">
            <Trophy size={16} className="text-yellow-400" /> Personal Records
          </div>
          <div className="space-y-2">
            {records.map((r) => (
              <div key={r.label} className="flex items-center justify-between text-sm">
                <span className="text-white/50">{r.label}</span>
                <span className="text-right">
                  <span className="font-semibold text-white">{r.value}</span>
                  {r.game && <span className="ml-2 text-xs text-white/40">{r.game}</span>}
                </span>
              </div>
            ))}
            {records.length === 0 && <p className="text-xs text-white/30">Log some sessions to set records.</p>}
          </div>
        </div>

        {/* Regret Refund (#20) */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/80">
            <Wallet size={16} className="text-red-400" /> Regret Refund Estimator
          </div>
          {refund.count > 0 ? (
            <>
              <p className="text-sm text-white/70">
                <span className="text-lg font-bold text-red-400">${refund.total.toFixed(0)}</span> tied up in{' '}
                {refund.count} game{refund.count !== 1 ? 's' : ''} played under 2 hours.
              </p>
              <div className="mt-2 space-y-1">
                {refund.games.slice(0, 4).map((g) => (
                  <div key={g.name} className="flex items-center justify-between text-xs text-white/50">
                    <span className="truncate pr-2">{g.name}</span>
                    <span className="text-white/70">${g.price.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-white/30">No barely-touched purchases. Disciplined!</p>
          )}
        </div>

        {/* Real-World Units (#25) */}
        {realWorld && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/80">
              <Coffee size={16} className="text-amber-400" /> Cost in Real-World Units
            </div>
            <p className="mb-2 text-sm text-white/70">
              Your gaming runs <span className="font-semibold text-white">${realWorld.costPerHour.toFixed(2)}/hr</span>.
            </p>
            <div className="space-y-1">
              {realWorld.comparisons.map((c) => (
                <div key={c.label} className="flex items-center justify-between text-xs">
                  <span className="text-white/50">
                    {c.icon} vs {c.label}
                  </span>
                  <span className="text-emerald-400">
                    {isFinite(c.multiplier) ? `${c.multiplier.toFixed(1)}x cheaper` : '—'}
                    {c.saved > 0 && <span className="ml-1 text-white/40">(${c.saved.toFixed(0)} saved)</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Taste Twin Genres (#18) */}
        {twins.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/80">
              <Heart size={16} className="text-pink-400" /> Taste Twin Genres
            </div>
            <p className="mb-2 text-xs text-white/40">Genres you tend to treat alike.</p>
            <div className="space-y-1">
              {twins.map((t) => (
                <div key={`${t.a}-${t.b}`} className="flex items-center justify-between text-sm">
                  <span className="text-white/70">
                    {t.a} <span className="text-white/30">&amp;</span> {t.b}
                  </span>
                  <span className="font-semibold text-pink-300">{t.similarity}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
