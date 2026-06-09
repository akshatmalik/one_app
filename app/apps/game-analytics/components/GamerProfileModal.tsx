'use client';

import { useMemo } from 'react';
import {
  X, Trophy, Layers, Shuffle, Package, Scale, Zap, Compass, Clock,
  TrendingUp, Flame, Star, Gamepad2, Award, type LucideProps,
} from 'lucide-react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { Game } from '../lib/types';
import {
  getGamingPersonality,
  getLibraryDNA,
  getPersonalityEvolution,
  getSessionAnalysis,
  getLongestSession,
  getFastestCompletion,
  getValueChampion,
  getCenturyClubGames,
  getCurrentGamingStreak,
  getLongestGamingStreak,
  getMostInvestedFranchise,
  getTotalHours,
  GamingPersonalityType,
} from '../lib/calculations';
import clsx from 'clsx';

interface GamerProfileModalProps {
  games: Game[];
  onClose: () => void;
}

type ArchetypeKey = GamingPersonalityType;

type LucideIconComponent = ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>;

const ARCHETYPE_META: Record<ArchetypeKey, {
  emoji: string;
  color: string;
  bgClass: string;
  borderClass: string;
  Icon: LucideIconComponent;
}> = {
  Completionist: {
    emoji: '🏆',
    color: '#fbbf24',
    bgClass: 'bg-gradient-to-br from-yellow-500/20 via-amber-500/10 to-transparent',
    borderClass: 'border-yellow-500/30',
    Icon: Trophy,
  },
  'Deep Diver': {
    emoji: '🌊',
    color: '#6366f1',
    bgClass: 'bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent',
    borderClass: 'border-indigo-500/30',
    Icon: Layers,
  },
  Sampler: {
    emoji: '🎲',
    color: '#06b6d4',
    bgClass: 'bg-gradient-to-br from-cyan-500/20 via-teal-500/10 to-transparent',
    borderClass: 'border-cyan-500/30',
    Icon: Shuffle,
  },
  'Backlog Hoarder': {
    emoji: '📦',
    color: '#f97316',
    bgClass: 'bg-gradient-to-br from-orange-500/20 via-red-500/10 to-transparent',
    borderClass: 'border-orange-500/30',
    Icon: Package,
  },
  'Balanced Gamer': {
    emoji: '⚖️',
    color: '#10b981',
    bgClass: 'bg-gradient-to-br from-emerald-500/20 via-green-500/10 to-transparent',
    borderClass: 'border-emerald-500/30',
    Icon: Scale,
  },
  Speedrunner: {
    emoji: '⚡',
    color: '#facc15',
    bgClass: 'bg-gradient-to-br from-yellow-500/20 via-lime-500/10 to-transparent',
    borderClass: 'border-yellow-500/30',
    Icon: Zap,
  },
  Explorer: {
    emoji: '🧭',
    color: '#a855f7',
    bgClass: 'bg-gradient-to-br from-purple-500/20 via-violet-500/10 to-transparent',
    borderClass: 'border-purple-500/30',
    Icon: Compass,
  },
};

const SESSION_STYLE_META: Record<string, { emoji: string; color: string }> = {
  'Marathon Runner':   { emoji: '🏃', color: '#ef4444' },
  'Snack Gamer':       { emoji: '🍿', color: '#f59e0b' },
  'Consistent Player': { emoji: '📅', color: '#3b82f6' },
  'Weekend Warrior':   { emoji: '⚔️', color: '#8b5cf6' },
  'Binge & Rest':      { emoji: '🌙', color: '#6366f1' },
};

export function GamerProfileModal({ games, onClose }: GamerProfileModalProps) {
  const personality     = useMemo(() => getGamingPersonality(games), [games]);
  const dna             = useMemo(() => getLibraryDNA(games), [games]);
  const evolution       = useMemo(() => getPersonalityEvolution(games), [games]);
  const sessionStyle    = useMemo(() => getSessionAnalysis(games), [games]);
  const longestSession  = useMemo(() => getLongestSession(games), [games]);
  const fastCompletion  = useMemo(() => getFastestCompletion(games), [games]);
  const valueChampion   = useMemo(() => getValueChampion(games), [games]);
  const centuryClub     = useMemo(() => getCenturyClubGames(games), [games]);
  const currentStreak   = useMemo(() => getCurrentGamingStreak(games), [games]);
  const longestStreak   = useMemo(() => getLongestGamingStreak(games), [games]);
  const topFranchise    = useMemo(() => getMostInvestedFranchise(games), [games]);

  const totalHours = useMemo(
    () => games.filter(g => g.status !== 'Wishlist').reduce((s, g) => s + getTotalHours(g), 0),
    [games],
  );

  const meta        = ARCHETYPE_META[personality.type] ?? ARCHETYPE_META['Balanced Gamer'];
  const { Icon }    = meta;
  const sessionMeta = SESSION_STYLE_META[sessionStyle.style] ?? { emoji: '🎮', color: '#8b5cf6' };

  const radarData = dna.axes.map(axis => ({
    subject: axis.label,
    value: axis.value,
    fullMark: 100,
  }));

  interface RecordCard { label: string; value: string; sub: string; icon: React.ReactNode; color: string }

  const rawRecords: Array<RecordCard | null> = [
    longestSession
      ? { label: 'Longest Session', value: `${longestSession.hours.toFixed(1)}h`, sub: longestSession.game.name, icon: <Clock size={14} />, color: '#ef4444' }
      : null,
    fastCompletion
      ? { label: 'Speed Finish', value: `${fastCompletion.days}d`, sub: fastCompletion.game.name, icon: <Zap size={14} />, color: '#facc15' }
      : null,
    valueChampion
      ? { label: 'Best Value', value: `$${valueChampion.costPerHour.toFixed(2)}/hr`, sub: valueChampion.game.name, icon: <TrendingUp size={14} />, color: '#10b981' }
      : null,
    centuryClub.length > 0
      ? { label: 'Century Club', value: `${centuryClub.length} game${centuryClub.length !== 1 ? 's' : ''}`, sub: '100+ hours each', icon: <Trophy size={14} />, color: '#fbbf24' }
      : null,
    longestStreak > 0
      ? { label: 'Best Streak', value: `${longestStreak}d`, sub: 'consecutive days', icon: <Flame size={14} />, color: '#f97316' }
      : null,
    topFranchise
      ? { label: 'Top Franchise', value: `${topFranchise.hours.toFixed(0)}h`, sub: topFranchise.franchise, icon: <Star size={14} />, color: '#a855f7' }
      : { label: 'Total Hours', value: `${totalHours.toFixed(0)}h`, sub: 'all time', icon: <Gamepad2 size={14} />, color: '#3b82f6' },
  ];
  const records: RecordCard[] = rawRecords.filter((r): r is RecordCard => r !== null);

  const ownedGames     = games.filter(g => g.status !== 'Wishlist');
  const completedCount = games.filter(g => g.status === 'Completed').length;
  const inProgressCount= games.filter(g => g.status === 'In Progress').length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-[#0d0d12] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl">

        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-5 pb-4 bg-[#0d0d12]/95 backdrop-blur-sm border-b border-white/5">
          <h2 className="text-sm font-bold text-white/90 flex items-center gap-2">
            <Award size={15} className="text-white/40" />
            Your Gamer Profile
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X size={15} className="text-white/50" />
          </button>
        </div>

        <div className="p-5 space-y-4 pb-10">

          {/* ── 1. Archetype Hero ── */}
          <div className={clsx('relative overflow-hidden rounded-2xl border p-5', meta.borderClass, meta.bgClass)}>
            {/* Watermark emoji */}
            <div className="absolute -right-3 -top-3 text-[72px] opacity-[0.08] select-none pointer-events-none leading-none">
              {meta.emoji}
            </div>

            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"
                style={{ backgroundColor: `${meta.color}20`, border: `1px solid ${meta.color}35` }}
              >
                <Icon size={26} style={{ color: meta.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-0.5">
                  Gaming Archetype
                </div>
                <h3 className="text-xl font-black leading-tight" style={{ color: meta.color }}>
                  The {personality.type}
                </h3>
                <p className="text-xs text-white/55 mt-1 leading-relaxed">{personality.description}</p>
              </div>
            </div>

            {/* Traits */}
            {personality.traits.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {personality.traits.map(trait => (
                  <span
                    key={trait}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                    style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
                  >
                    {trait}
                  </span>
                ))}
              </div>
            )}

            {/* Confidence bar */}
            {personality.score > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-white/30">Archetype match</span>
                  <span className="font-medium" style={{ color: meta.color }}>
                    {Math.round(Math.min(100, personality.score))}%
                  </span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, personality.score)}%`, backgroundColor: meta.color }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── 2. Gaming DNA Radar ── */}
          {radarData.length > 2 && (
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
              <h4 className="text-sm font-semibold text-white/65 mb-1 flex items-center gap-2">
                <span className="text-base">🧬</span>
                Gaming DNA
              </h4>
              <p className="text-[11px] text-white/30 mb-3">Your library fingerprint across 7 dimensions</p>

              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} margin={{ top: 5, right: 24, bottom: 5, left: 24 }}>
                    <PolarGrid stroke="rgba(255,255,255,0.06)" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: 'rgba(255,255,255,0.40)', fontSize: 9.5 }}
                    />
                    <Radar
                      dataKey="value"
                      stroke={meta.color}
                      fill={meta.color}
                      fillOpacity={0.13}
                      strokeWidth={1.5}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload?.[0]) {
                          return (
                            <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-xs">
                              <p className="text-white/70">{payload[0].payload.subject}</p>
                              <p className="font-bold mt-0.5" style={{ color: meta.color }}>
                                {payload[0].value} / 100
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Axis mini-table */}
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {dna.axes.map(axis => (
                  <div key={axis.label} className="p-1.5 bg-white/[0.03] rounded-lg text-center">
                    <div
                      className="text-xs font-bold"
                      style={{ color: axis.value >= 70 ? meta.color : axis.value >= 40 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)' }}
                    >
                      {axis.value}
                    </div>
                    <div className="text-[9px] text-white/25 leading-tight mt-0.5">{axis.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 3. Session Style ── */}
          {sessionStyle.totalSessions > 0 && (
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
              <h4 className="text-sm font-semibold text-white/65 mb-3 flex items-center gap-2">
                <span className="text-base">🎯</span>
                Session Style
              </h4>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ backgroundColor: `${sessionMeta.color}15`, border: `1px solid ${sessionMeta.color}25` }}
                >
                  {sessionMeta.emoji}
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: sessionMeta.color }}>
                    {sessionStyle.style}
                  </div>
                  <div className="text-xs text-white/45 mt-0.5">{sessionStyle.description}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Avg Session', value: `${sessionStyle.avgSessionLength.toFixed(1)}h` },
                  { label: 'Sessions', value: sessionStyle.totalSessions.toLocaleString() },
                  { label: 'Per Week', value: sessionStyle.sessionsPerWeek.toFixed(1) },
                ].map(s => (
                  <div key={s.label} className="p-2 bg-white/[0.03] rounded-xl text-center">
                    <div className="text-sm font-bold text-white/80">{s.value}</div>
                    <div className="text-[10px] text-white/30 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 4. Personal Records ── */}
          {records.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-white/65 mb-3 flex items-center gap-2">
                <span className="text-base">🏅</span>
                Personal Records
              </h4>
              <div className="grid grid-cols-2 gap-2.5">
                {records.slice(0, 6).map(rec => (
                  <div
                    key={rec.label}
                    className="p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <span style={{ color: rec.color }}>{rec.icon}</span>
                      <span className="text-[10px] text-white/35 font-medium">{rec.label}</span>
                    </div>
                    <div className="text-base font-black" style={{ color: rec.color }}>
                      {rec.value}
                    </div>
                    <div className="text-[10px] text-white/30 mt-0.5 truncate">{rec.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 5. Personality Evolution ── */}
          {evolution.length >= 2 && (
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
              <h4 className="text-sm font-semibold text-white/65 mb-1 flex items-center gap-2">
                <span className="text-base">📈</span>
                Personality Evolution
              </h4>
              <p className="text-[11px] text-white/30 mb-4">How your gaming style has shifted over time</p>

              <div className="overflow-x-auto pb-2">
                <div className="flex items-center gap-2 min-w-max">
                  {evolution.map((snap, i) => {
                    const snapMeta = ARCHETYPE_META[snap.personality as GamingPersonalityType] ?? ARCHETYPE_META['Balanced Gamer'];
                    const isLatest = i === evolution.length - 1;
                    return (
                      <div key={snap.period} className="flex items-center gap-2">
                        <div
                          className={clsx(
                            'flex flex-col items-center p-2.5 rounded-xl border min-w-[68px]',
                            isLatest ? snapMeta.borderClass : 'border-white/5',
                            isLatest ? snapMeta.bgClass : 'bg-white/[0.02]',
                          )}
                        >
                          <span className="text-base mb-1">{snapMeta.emoji}</span>
                          <div
                            className="text-[9px] font-bold text-center leading-tight"
                            style={{ color: isLatest ? snapMeta.color : 'rgba(255,255,255,0.45)' }}
                          >
                            {snap.personality.replace(' Gamer', '')}
                          </div>
                          <div className="text-[8px] text-white/22 mt-1 whitespace-nowrap">
                            {snap.periodLabel}
                          </div>
                        </div>
                        {i < evolution.length - 1 && (
                          <span className="text-white/15 text-xs shrink-0">›</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {evolution[0].personality !== evolution[evolution.length - 1].personality && (
                <p className="text-[11px] text-white/30 mt-3 text-center leading-relaxed">
                  {evolution[0].personality}{' '}
                  <span className="text-white/20">→</span>{' '}
                  <span style={{ color: ARCHETYPE_META[evolution[evolution.length - 1].personality as GamingPersonalityType]?.color ?? '#a855f7' }}>
                    {evolution[evolution.length - 1].personality}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* ── 6. Lifetime Summary ── */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
            <h4 className="text-sm font-semibold text-white/65 mb-3 flex items-center gap-2">
              <span className="text-base">📊</span>
              Lifetime at a Glance
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Hours Played', value: `${totalHours.toFixed(0)}h` },
                { label: 'Games Owned',  value: ownedGames.length.toString() },
                { label: 'Completed',    value: completedCount.toString() },
                { label: 'Current Streak', value: currentStreak > 0 ? `${currentStreak}d 🔥` : '—' },
                { label: 'Best Streak',    value: longestStreak > 0 ? `${longestStreak}d` : '—' },
                { label: 'In Progress',    value: inProgressCount.toString() },
              ].map(s => (
                <div key={s.label} className="p-2 bg-white/[0.03] rounded-xl text-center">
                  <div className="text-sm font-bold text-white/80">{s.value}</div>
                  <div className="text-[10px] text-white/30 mt-0.5 leading-tight">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
