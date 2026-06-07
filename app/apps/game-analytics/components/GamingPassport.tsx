'use client';

import { useMemo } from 'react';
import {
  X, Trophy, Star, Zap, Clock, DollarSign, Flame, Shield,
  Gamepad2, TrendingUp, Award, User,
} from 'lucide-react';
import { Game } from '../lib/types';
import {
  getGamingPersonality,
  getGamingCreditScore,
  getLifetimeStats,
  getLibraryDNA,
  getSessionAnalysis,
  getCurrentGamingStreak,
  getLongestGamingStreak,
  getBestGamingMonth,
  getLongestSession,
  getFastestCompletion,
  getEntertainmentComparison,
  getGamingAchievements,
  getTotalHours,
  calculateSummary,
} from '../lib/calculations';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from 'recharts';
import clsx from 'clsx';

interface Props {
  games: Game[];
  onClose: () => void;
}

// ─── Personality visual config ────────────────────────────────────────────────
const PERSONALITY_EMOJI: Record<string, string> = {
  'Completionist':   '🏆',
  'Deep Diver':      '🌊',
  'Sampler':         '🎲',
  'Backlog Hoarder': '📦',
  'Balanced Gamer':  '⚖️',
  'Speedrunner':     '⚡',
  'Explorer':        '🗺️',
};

const PERSONALITY_GRADIENT: Record<string, string> = {
  'Completionist':   'from-emerald-600/25 via-emerald-900/10 to-transparent',
  'Deep Diver':      'from-blue-600/25 via-blue-900/10 to-transparent',
  'Sampler':         'from-purple-600/25 via-purple-900/10 to-transparent',
  'Backlog Hoarder': 'from-amber-600/25 via-amber-900/10 to-transparent',
  'Balanced Gamer':  'from-cyan-600/25 via-cyan-900/10 to-transparent',
  'Speedrunner':     'from-yellow-600/25 via-yellow-900/10 to-transparent',
  'Explorer':        'from-pink-600/25 via-pink-900/10 to-transparent',
};

const PERSONALITY_ACCENT: Record<string, string> = {
  'Completionist':   'text-emerald-400',
  'Deep Diver':      'text-blue-400',
  'Sampler':         'text-purple-400',
  'Backlog Hoarder': 'text-amber-400',
  'Balanced Gamer':  'text-cyan-400',
  'Speedrunner':     'text-yellow-400',
  'Explorer':        'text-pink-400',
};

const PERSONALITY_BORDER: Record<string, string> = {
  'Completionist':   'border-emerald-500/25',
  'Deep Diver':      'border-blue-500/25',
  'Sampler':         'border-purple-500/25',
  'Backlog Hoarder': 'border-amber-500/25',
  'Balanced Gamer':  'border-cyan-500/25',
  'Speedrunner':     'border-yellow-500/25',
  'Explorer':        'border-pink-500/25',
};

const PERSONALITY_SCORE_COLOR: Record<string, string> = {
  'Completionist':   '#10b981',
  'Deep Diver':      '#3b82f6',
  'Sampler':         '#a855f7',
  'Backlog Hoarder': '#f59e0b',
  'Balanced Gamer':  '#06b6d4',
  'Speedrunner':     '#eab308',
  'Explorer':        '#ec4899',
};

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtHours(h: number): string {
  if (h >= 1000) return `${(h / 1000).toFixed(1)}k`;
  return Math.round(h).toLocaleString();
}

function fmtMonth(ym: string): string {
  // format "YYYY-MM" → "Jan 2025"
  try {
    const [year, month] = ym.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch {
    return ym;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GamingPassport({ games, onClose }: Props) {
  // Derived data — all memoised
  const personality    = useMemo(() => getGamingPersonality(games), [games]);
  const creditScore    = useMemo(() => getGamingCreditScore(games), [games]);
  const lifetime       = useMemo(() => getLifetimeStats(games), [games]);
  const dna            = useMemo(() => getLibraryDNA(games), [games]);
  const session        = useMemo(() => getSessionAnalysis(games), [games]);
  const currentStreak  = useMemo(() => getCurrentGamingStreak(games), [games]);
  const longestStreak  = useMemo(() => getLongestGamingStreak(games), [games]);
  const bestMonth      = useMemo(() => getBestGamingMonth(games), [games]);
  const longestSession = useMemo(() => getLongestSession(games), [games]);
  const fastest        = useMemo(() => getFastestCompletion(games), [games]);
  const summary        = useMemo(() => calculateSummary(games), [games]);
  const achievements   = useMemo(
    () => getGamingAchievements(games).filter(a => a.unlocked),
    [games],
  );

  const entertainment = useMemo(() => {
    if (lifetime.totalHours === 0 || lifetime.avgCostPerHour === 0) return null;
    return getEntertainmentComparison(lifetime.avgCostPerHour, lifetime.totalHours);
  }, [lifetime]);

  // Top 3 games by total hours
  const top3 = useMemo(
    () =>
      [...games]
        .filter(g => g.status !== 'Wishlist' && getTotalHours(g) > 0)
        .sort((a, b) => getTotalHours(b) - getTotalHours(a))
        .slice(0, 3),
    [games],
  );

  // Visual config
  const emoji         = PERSONALITY_EMOJI[personality.type]     ?? '🎮';
  const gradientClass = PERSONALITY_GRADIENT[personality.type]  ?? 'from-purple-600/25 via-purple-900/10 to-transparent';
  const accentClass   = PERSONALITY_ACCENT[personality.type]    ?? 'text-purple-400';
  const borderClass   = PERSONALITY_BORDER[personality.type]    ?? 'border-purple-500/25';
  const pColor        = PERSONALITY_SCORE_COLOR[personality.type] ?? '#8b5cf6';

  // Credit-score gauge marker position (0-100%)
  const scorePercent  = Math.max(0, Math.min(96, ((creditScore.score - 300) / 550) * 100));

  // Radar data
  const radarData = dna.axes;

  // Empty state
  if (games.length === 0) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-[#0f0f13] border border-white/10 rounded-2xl p-8 max-w-sm w-full text-center">
          <Gamepad2 size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/50 text-sm mb-6">Add some games to see your passport!</p>
          <button onClick={onClose} className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-all">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-start justify-center p-4 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg my-4 pb-4">
        {/* ── PASSPORT CARD ──────────────────────────────────────── */}
        <div className={clsx('relative bg-[#0c0c10] border rounded-2xl overflow-hidden shadow-2xl', borderClass)}>

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-1.5 bg-black/50 text-white/40 hover:text-white rounded-lg transition-colors"
          >
            <X size={16} />
          </button>

          {/* ══ 1. HERO BANNER ═══════════════════════════════════════ */}
          <div className={clsx('relative px-6 pt-8 pb-6 bg-gradient-to-b', gradientClass)}>
            {/* Passport label */}
            <div className="flex items-center gap-1.5 mb-5">
              <Shield size={10} className="text-white/20" />
              <span className="text-[9px] text-white/20 tracking-[0.2em] uppercase font-semibold">
                Gamer Passport
              </span>
            </div>

            {/* Personality */}
            <div className="flex items-start gap-4">
              <div className="text-5xl leading-none select-none">{emoji}</div>
              <div className="flex-1 min-w-0">
                <p className={clsx('text-[11px] font-bold uppercase tracking-widest mb-0.5', accentClass)}>
                  The {personality.type}
                </p>
                <p className="text-white/55 text-sm leading-relaxed pr-6">
                  {personality.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {personality.traits.map(trait => (
                    <span
                      key={trait}
                      className={clsx(
                        'text-[10px] px-2 py-0.5 rounded-full border bg-white/[0.03]',
                        accentClass, borderClass,
                      )}
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Badges strip */}
            <div className="flex flex-wrap items-center gap-1.5 mt-4">
              {lifetime.firstGameDate && (
                <span className="text-[11px] text-white/30 bg-white/[0.03] border border-white/5 px-2.5 py-1 rounded-full">
                  🎮 Since {new Date(lifetime.firstGameDate + 'T00:00:00').getFullYear()}
                </span>
              )}
              <span className="text-[11px] text-white/30 bg-white/[0.03] border border-white/5 px-2.5 py-1 rounded-full">
                {session.style}
              </span>
              {currentStreak > 1 && (
                <span className="text-[11px] text-orange-400/80 bg-orange-500/10 border border-orange-500/15 px-2.5 py-1 rounded-full">
                  🔥 {currentStreak}-day streak
                </span>
              )}
            </div>
          </div>

          {/* ══ 2. KEY STATS STRIP ═══════════════════════════════════ */}
          <div className="px-6 py-5 border-t border-white/5">
            <div className="grid grid-cols-4 gap-3 text-center">
              {[
                {
                  icon: <Clock size={12} />,
                  label: 'Hours',
                  value: fmtHours(lifetime.totalHours),
                  sub:   `${Math.round(lifetime.equivalentDays)}d of life`,
                },
                {
                  icon: <Gamepad2 size={12} />,
                  label: 'Library',
                  value: lifetime.totalGames.toString(),
                  sub:   'games',
                },
                {
                  icon: <Trophy size={12} />,
                  label: 'Completed',
                  value: `${Math.round(summary.completionRate)}%`,
                  sub:   `${summary.completedCount} done`,
                },
                {
                  icon: <DollarSign size={12} />,
                  label: '$/hr',
                  value: lifetime.avgCostPerHour > 0 ? `$${lifetime.avgCostPerHour.toFixed(2)}` : 'N/A',
                  sub:   'avg value',
                },
              ].map(stat => (
                <div key={stat.label}>
                  <div className="flex items-center justify-center gap-1 text-white/20 mb-1.5">
                    {stat.icon}
                    <span className="text-[9px] uppercase tracking-wider">{stat.label}</span>
                  </div>
                  <div className="text-lg font-bold text-white leading-none">{stat.value}</div>
                  <div className="text-[10px] text-white/25 mt-0.5">{stat.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ══ 3. GAMING CREDIT SCORE ═══════════════════════════════ */}
          <div className="px-6 py-4 border-t border-white/5">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <TrendingUp size={12} className="text-white/25" />
                <span className="text-[10px] text-white/25 uppercase tracking-wider">Gaming Credit Score</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tabular-nums" style={{ color: creditScore.color }}>
                  {creditScore.score}
                </span>
                <span className="text-xs font-semibold" style={{ color: creditScore.color }}>
                  {creditScore.label}
                </span>
              </div>
            </div>

            {/* Gauge track */}
            <div className="relative h-2 bg-gradient-to-r from-red-600/35 via-yellow-500/35 to-emerald-500/35 rounded-full mb-3">
              {/* Marker */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-lg ring-2 ring-black/50 transition-all"
                style={{ left: `${scorePercent}%`, transform: 'translateY(-50%) translateX(-50%)' }}
              />
            </div>

            {/* Factor bars */}
            <div className="grid grid-cols-2 gap-x-5 gap-y-1.5">
              {[
                { label: 'Play Rate',   value: creditScore.factors.played },
                { label: 'Value',       value: creditScore.factors.value },
                { label: 'Completion',  value: creditScore.factors.completion },
                { label: 'No Regrets',  value: creditScore.factors.regret },
              ].map(f => (
                <div key={f.label} className="flex items-center gap-2">
                  <span className="text-[10px] text-white/25 w-16 shrink-0">{f.label}</span>
                  <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${f.value}%`, backgroundColor: `${creditScore.color}70` }}
                    />
                  </div>
                  <span className="text-[10px] text-white/35 w-5 text-right tabular-nums">{f.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ══ 4. MOUNT OLYMPUS – TOP 3 ═════════════════════════════ */}
          {top3.length > 0 && (
            <div className="px-6 py-4 border-t border-white/5">
              <div className="flex items-center gap-1.5 mb-3">
                <Star size={12} className="text-amber-400/50" />
                <span className="text-[10px] text-white/25 uppercase tracking-wider">Mount Olympus</span>
                <span className="text-[10px] text-white/15 ml-auto">your top games by hours</span>
              </div>

              <div className="space-y-2">
                {top3.map((game, idx) => {
                  const medal  = ['🥇', '🥈', '🥉'][idx];
                  const hours  = getTotalHours(game);
                  return (
                    <div key={game.id} className="flex items-center gap-3">
                      <span className="text-base leading-none select-none w-5 text-center">{medal}</span>

                      {game.thumbnail ? (
                        <img
                          src={game.thumbnail}
                          alt={game.name}
                          className="w-10 h-8 rounded object-cover opacity-80 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-8 rounded bg-white/5 flex items-center justify-center shrink-0">
                          <Gamepad2 size={12} className="text-white/20" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/85 truncate leading-none">{game.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-white/30">{fmtHours(hours)}h</span>
                          {game.rating > 0 && (
                            <span className="text-[10px] text-amber-400/55">★ {game.rating}/10</span>
                          )}
                          {game.status === 'Completed' && (
                            <span className="text-[10px] text-emerald-400/55">Completed</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══ 5. LIBRARY DNA ═══════════════════════════════════════ */}
          {radarData.length > 0 && (
            <div className="px-6 py-4 border-t border-white/5">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap size={12} className="text-white/25" />
                <span className="text-[10px] text-white/25 uppercase tracking-wider">Library DNA</span>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                    <PolarGrid stroke="rgba(255,255,255,0.07)" />
                    <PolarAngleAxis
                      dataKey="label"
                      tick={{ fill: 'rgba(255,255,255,0.30)', fontSize: 9 }}
                    />
                    <Radar
                      dataKey="value"
                      stroke={pColor}
                      fill={pColor}
                      fillOpacity={0.18}
                      strokeWidth={1.5}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ══ 6. HALL OF RECORDS ═══════════════════════════════════ */}
          {(bestMonth || longestSession || longestStreak > 0 || fastest) && (
            <div className="px-6 py-4 border-t border-white/5">
              <div className="flex items-center gap-1.5 mb-3">
                <Award size={12} className="text-white/25" />
                <span className="text-[10px] text-white/25 uppercase tracking-wider">Hall of Records</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {bestMonth && (
                  <RecordCard
                    label="Best Month"
                    value={`${Math.round(bestMonth.hours)}h`}
                    sub={fmtMonth(bestMonth.month)}
                  />
                )}
                {longestSession && (
                  <RecordCard
                    label="Longest Session"
                    value={`${longestSession.hours}h`}
                    sub={longestSession.game.name}
                  />
                )}
                {longestStreak > 0 && (
                  <RecordCard
                    label="Best Streak"
                    value={`${longestStreak}d`}
                    sub="consecutive days"
                  />
                )}
                {fastest && (
                  <RecordCard
                    label="Fastest Clear"
                    value={`${fastest.days}d`}
                    sub={fastest.game.name}
                  />
                )}
              </div>
            </div>
          )}

          {/* ══ 7. VALUE STORY ═══════════════════════════════════════ */}
          {entertainment && entertainment.cheapestVs && lifetime.avgCostPerHour > 0 && (
            <div className="px-6 py-4 border-t border-white/5">
              <div className="flex items-center gap-1.5 mb-3">
                <DollarSign size={12} className="text-white/25" />
                <span className="text-[10px] text-white/25 uppercase tracking-wider">The Value Story</span>
              </div>
              <div className="bg-emerald-500/8 border border-emerald-500/15 rounded-xl p-4">
                <p className="text-sm text-white/65 leading-relaxed">
                  Your gaming costs{' '}
                  <span className="text-emerald-400 font-semibold">${lifetime.avgCostPerHour.toFixed(2)}/hr</span>
                  {' '}—{' '}
                  <span className="text-emerald-400 font-semibold">
                    {entertainment.cheapestVs.multiplier}× cheaper
                  </span>{' '}
                  than {entertainment.cheapestVs.name}.
                  Your {fmtHours(lifetime.totalHours)} hours saved you{' '}
                  <span className="text-emerald-400 font-semibold">
                    ${Math.round(entertainment.savedVsMovies).toLocaleString()}
                  </span>{' '}
                  compared to the movies.
                </p>
              </div>
            </div>
          )}

          {/* ══ 8. ACHIEVEMENTS ══════════════════════════════════════ */}
          {achievements.length > 0 && (
            <div className="px-6 py-4 border-t border-white/5">
              <div className="flex items-center gap-1.5 mb-3">
                <Flame size={12} className="text-white/25" />
                <span className="text-[10px] text-white/25 uppercase tracking-wider">Achievements</span>
                <span className="text-[10px] text-white/15 bg-white/5 px-1.5 py-0.5 rounded-full ml-auto">
                  {achievements.length} earned
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {achievements.slice(0, 12).map(a => (
                  <div
                    key={a.id}
                    title={a.description}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.03] border border-white/6 rounded-lg hover:border-white/10 transition-colors cursor-default"
                  >
                    <span className="text-sm leading-none">{a.icon}</span>
                    <span className="text-[11px] text-white/45">{a.name}</span>
                  </div>
                ))}
                {achievements.length > 12 && (
                  <div className="flex items-center px-2.5 py-1.5 text-[11px] text-white/20">
                    +{achievements.length - 12} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-3.5 border-t border-white/5 flex items-center justify-between">
            <span className="text-[9px] text-white/15 uppercase tracking-[0.15em]">One App · Game Analytics</span>
            <button
              onClick={onClose}
              className="text-[11px] text-white/20 hover:text-white/45 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tiny sub-component for Hall of Records cards ────────────────────────────
function RecordCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
      <div className="text-[9px] text-white/20 uppercase tracking-wider mb-1.5">{label}</div>
      <div className="text-xl font-bold text-white tabular-nums leading-none">{value}</div>
      <div className="text-[10px] text-white/30 mt-1 truncate">{sub}</div>
    </div>
  );
}
