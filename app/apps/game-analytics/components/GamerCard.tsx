'use client';

import { useRef } from 'react';
import { X, Trophy, Gamepad2, Clock, Star } from 'lucide-react';
import { Game } from '../lib/types';
import {
  getGamingPersonality,
  getGamingCreditScore,
  getLifetimeStats,
  getActivityPulse,
  getTotalHours,
  getGenreMastery,
} from '../lib/calculations';
import { formatHours, formatNumber, formatCostPerHour } from '../lib/format';
import { ShareButton } from './ShareButton';

interface GamerCardProps {
  games: Game[];
  displayName?: string;
  onClose: () => void;
}

/**
 * Shareable "gamer identity" card — one canonical summary of who you are as a
 * gamer (archetype + credit score + lifetime stats + top games), exported via
 * the shared ShareButton. Reuses existing calculations; no new stat logic.
 */
export function GamerCard({ games, displayName, onClose }: GamerCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const personality = getGamingPersonality(games);
  const credit = getGamingCreditScore(games);
  const lifetime = getLifetimeStats(games);
  const pulse = getActivityPulse(games);
  const mainClass = getGenreMastery(games).mainClass;

  const topGames = [...games]
    .filter(g => g.status !== 'Wishlist')
    .map(g => ({ g, hours: getTotalHours(g) }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 3);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        {/* Capture target */}
        <div
          ref={cardRef}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-purple-900 via-slate-900 to-indigo-950 p-6"
        >
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-12 w-48 h-48 rounded-full bg-indigo-500/20 blur-3xl" />

          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase tracking-widest text-white/40">Gamer Card</span>
              <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: pulse.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pulse.color }} />
                {pulse.level}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white">{displayName || 'Player One'}</h2>
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-medium text-purple-300">{personality.type}</p>
              {mainClass && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/20">
                  ⚔️ Lvl {mainClass.level} {mainClass.genre} {mainClass.rank}
                </span>
              )}
            </div>
            {personality.description && (
              <p className="text-xs text-white/50 mt-1 leading-relaxed">{personality.description}</p>
            )}

            {/* Credit score */}
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
              <div>
                <div className="text-xs text-white/40">Gaming Credit Score</div>
                <div className="text-xs font-medium" style={{ color: credit.color }}>{credit.label}</div>
              </div>
              <div className="text-3xl font-bold" style={{ color: credit.color }}>{credit.score}</div>
            </div>

            {/* Lifetime stats */}
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Stat icon={<Clock size={14} />} value={formatHours(lifetime.totalHours)} label="played" />
              <Stat icon={<Gamepad2 size={14} />} value={formatNumber(lifetime.totalGames)} label="games" />
              <Stat icon={<Star size={14} />} value={formatCostPerHour(lifetime.avgCostPerHour)} label="per hour" />
            </div>

            {/* Top games */}
            {topGames.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-1.5 text-xs text-white/40 mb-2">
                  <Trophy size={12} /> Most played
                </div>
                <div className="space-y-1.5">
                  {topGames.map(({ g, hours }, i) => (
                    <div key={g.id} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                      <span className="text-sm font-bold text-white/30 w-4">{i + 1}</span>
                      {g.thumbnail
                        ? <img src={g.thumbnail} alt="" crossOrigin="anonymous" className="w-8 h-8 rounded object-cover" />
                        : <div className="w-8 h-8 rounded bg-purple-500/30 flex items-center justify-center"><Gamepad2 size={14} className="text-white/40" /></div>}
                      <span className="flex-1 text-sm text-white truncate">{g.name}</span>
                      <span className="text-xs font-medium text-purple-300">{formatHours(hours)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 text-center text-[10px] uppercase tracking-widest text-white/25">
              Game Analytics
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between">
          <button onClick={onClose} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 text-sm transition-colors">
            <X size={15} /> Close
          </button>
          <ShareButton targetRef={cardRef} filename="my-gamer-card" shareText={`I'm a ${personality.type} with a ${credit.score} gaming credit score!`} />
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/5 px-2 py-2.5">
      <div className="flex items-center justify-center text-white/40 mb-1">{icon}</div>
      <div className="text-sm font-bold text-white">{value}</div>
      <div className="text-[10px] text-white/40">{label}</div>
    </div>
  );
}
