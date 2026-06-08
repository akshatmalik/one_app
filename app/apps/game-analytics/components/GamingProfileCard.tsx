'use client';

import { useState, useMemo } from 'react';
import { X, Copy, Check, Gamepad2 } from 'lucide-react';
import { Game, AnalyticsSummary } from '../lib/types';
import { GameWithMetrics } from '../hooks/useAnalytics';
import {
  getGamingPersonality,
  getGamingCreditScore,
  getCurrentGamingStreak,
  getLongestGamingStreak,
  GamingPersonalityType,
} from '../lib/calculations';
import clsx from 'clsx';

interface GamingProfileCardProps {
  games: Game[];
  gamesWithMetrics: GameWithMetrics[];
  summary: AnalyticsSummary;
  onClose: () => void;
}

const PERSONALITY_META: Record<GamingPersonalityType, {
  icon: string;
  color: string;
  ringColor: string;
  gradientFrom: string;
  gradientTo: string;
}> = {
  'Completionist': {
    icon: '✅',
    color: 'text-emerald-300',
    ringColor: 'ring-emerald-500/30',
    gradientFrom: 'from-emerald-900/50',
    gradientTo: 'to-emerald-950/20',
  },
  'Deep Diver': {
    icon: '🌊',
    color: 'text-blue-300',
    ringColor: 'ring-blue-500/30',
    gradientFrom: 'from-blue-900/50',
    gradientTo: 'to-blue-950/20',
  },
  'Sampler': {
    icon: '🎲',
    color: 'text-purple-300',
    ringColor: 'ring-purple-500/30',
    gradientFrom: 'from-purple-900/50',
    gradientTo: 'to-purple-950/20',
  },
  'Backlog Hoarder': {
    icon: '📚',
    color: 'text-amber-300',
    ringColor: 'ring-amber-500/30',
    gradientFrom: 'from-amber-900/50',
    gradientTo: 'to-amber-950/20',
  },
  'Balanced Gamer': {
    icon: '⚖️',
    color: 'text-teal-300',
    ringColor: 'ring-teal-500/30',
    gradientFrom: 'from-teal-900/50',
    gradientTo: 'to-teal-950/20',
  },
  'Speedrunner': {
    icon: '⚡',
    color: 'text-yellow-300',
    ringColor: 'ring-yellow-500/30',
    gradientFrom: 'from-yellow-900/50',
    gradientTo: 'to-yellow-950/20',
  },
  'Explorer': {
    icon: '🧭',
    color: 'text-orange-300',
    ringColor: 'ring-orange-500/30',
    gradientFrom: 'from-orange-900/50',
    gradientTo: 'to-orange-950/20',
  },
};

const GENRE_COLORS = [
  'bg-purple-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
] as const;

function fmtHours(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

export function GamingProfileCard({
  games,
  gamesWithMetrics,
  summary,
  onClose,
}: GamingProfileCardProps) {
  const [copied, setCopied] = useState(false);

  const personality = useMemo(() => getGamingPersonality(games), [games]);
  const creditScore = useMemo(() => getGamingCreditScore(games), [games]);
  const currentStreak = useMemo(() => getCurrentGamingStreak(games), [games]);
  const longestStreak = useMemo(() => getLongestGamingStreak(games), [games]);

  const topGames = useMemo(
    () =>
      [...gamesWithMetrics]
        .filter(g => g.status !== 'Wishlist' && g.totalHours > 0)
        .sort((a, b) => b.totalHours - a.totalHours)
        .slice(0, 3),
    [gamesWithMetrics],
  );

  const genreDNA = useMemo(() => {
    const entries = Object.entries(summary.hoursByGenre)
      .filter(([, h]) => h > 0)
      .sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, h]) => s + h, 0);
    if (total === 0) return [];
    return entries.slice(0, 4).map(([genre, hours]) => ({
      genre,
      hours,
      pct: Math.round((hours / total) * 100),
    }));
  }, [summary.hoursByGenre]);

  const meta = PERSONALITY_META[personality.type];
  const avgCph = summary.averageCostPerHour;
  const year = new Date().getFullYear();

  const shareText = useMemo(() => {
    const medals = ['🥇', '🥈', '🥉'];
    const gamesSection = topGames
      .map((g, i) => `${medals[i]} ${g.name} — ${Math.round(g.totalHours)}h, ⭐${g.rating}/10`)
      .join('\n');
    const dnaSection = genreDNA.map(g => `  ${g.genre}: ${g.pct}%`).join('\n');
    const streakLine =
      currentStreak > 0 ? `• 🔥 ${currentStreak}-day streak (best: ${longestStreak}d)` : '';

    return [
      `🎮 My Gaming Profile ${year}`,
      '━━━━━━━━━━━━━━━━━━━━',
      `${meta.icon} ${personality.type}`,
      `"${personality.description}"`,
      '',
      '📊 Stats',
      `• ${fmtHours(summary.totalHours)}h played across ${summary.totalGames} games`,
      `• $${avgCph.toFixed(2)}/hr average cost`,
      `• ${Math.round(summary.completionRate)}% completion rate`,
      `• Gaming Score: ${creditScore.score}/850 — ${creditScore.label}`,
      streakLine,
      '',
      '🏆 Top Games',
      gamesSection,
      '',
      '🧬 Genre DNA',
      dnaSection,
      '',
      '━━━━━━━━━━━━━━━━━━━━',
      'Tracked with Game Analytics',
    ]
      .filter(l => l !== null && l !== undefined && l !== '')
      .join('\n');
  }, [personality, creditScore, summary, topGames, genreDNA, currentStreak, longestStreak, avgCph, meta.icon, year]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard API not available — silently fail
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={clsx(
          'relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl',
          'border border-white/10 bg-[#0c0c18]',
          'max-h-[92vh] overflow-y-auto',
        )}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
        >
          <X size={16} />
        </button>

        {/* ── PERSONALITY HEADER ───────────────────────────────── */}
        <div
          className={clsx(
            'px-6 pt-7 pb-6 relative overflow-hidden',
            `bg-gradient-to-br ${meta.gradientFrom} ${meta.gradientTo}`,
          )}
        >
          {/* Decorative glow */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-15 blur-3xl bg-purple-400 pointer-events-none" />

          {/* Badge row */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/30 border border-white/10">
              <Gamepad2 size={10} className="text-white/40" />
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                Gaming Profile
              </span>
            </div>
            <span className="text-[10px] text-white/25">{year}</span>
          </div>

          {/* Personality row */}
          <div className="flex items-start gap-4">
            <div
              className={clsx(
                'flex-shrink-0 w-14 h-14 rounded-xl bg-black/40 flex items-center justify-center text-3xl ring-2',
                meta.ringColor,
              )}
            >
              {meta.icon}
            </div>
            <div className="min-w-0">
              <h2 className={clsx('text-xl font-bold leading-tight', meta.color)}>
                {personality.type}
              </h2>
              <p className="text-white/55 text-sm mt-0.5 leading-snug line-clamp-2">
                {personality.description}
              </p>
              {personality.traits.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {personality.traits.slice(0, 2).map(t => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-full bg-black/30 text-[10px] text-white/50 border border-white/10"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── GAMING SCORE + STREAK ─────────────────────────────── */}
        <div className="px-6 py-4 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <div className="text-[9px] uppercase tracking-widest text-white/25 font-bold mb-0.5">
                  Gaming Score
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold" style={{ color: creditScore.color }}>
                    {creditScore.score}
                  </span>
                  <span className="text-white/25 text-sm">/850</span>
                </div>
              </div>
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold border"
                style={{
                  color: creditScore.color,
                  borderColor: `${creditScore.color}40`,
                  background: `${creditScore.color}18`,
                }}
              >
                {creditScore.label}
              </span>
            </div>

            {currentStreak > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <span className="text-xl leading-none">🔥</span>
                <div>
                  <div className="text-white/80 font-bold text-sm leading-none">
                    {currentStreak}d
                  </div>
                  <div className="text-white/30 text-[9px] mt-0.5">best: {longestStreak}d</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── HALL OF FAME ──────────────────────────────────────── */}
        {topGames.length > 0 && (
          <div className="px-6 py-4 border-b border-white/5">
            <div className="text-[9px] uppercase tracking-widest text-white/25 font-bold mb-3">
              Hall of Fame
            </div>
            <div className="grid grid-cols-3 gap-3">
              {topGames.map((game, idx) => {
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <div key={game.id} className="flex flex-col items-center gap-1.5">
                    <div className="relative w-full">
                      {game.thumbnail ? (
                        <img
                          src={game.thumbnail}
                          alt={game.name}
                          className="w-full aspect-square object-cover rounded-xl"
                        />
                      ) : (
                        <div className="w-full aspect-square rounded-xl bg-white/5 flex items-center justify-center text-2xl border border-white/10">
                          {medals[idx]}
                        </div>
                      )}
                      {game.thumbnail && (
                        <div className="absolute -top-2 -right-2 text-base leading-none">
                          {medals[idx]}
                        </div>
                      )}
                    </div>
                    <div className="text-center w-full px-0.5">
                      <div className="text-white/80 text-[10px] font-medium leading-tight line-clamp-2">
                        {game.name}
                      </div>
                      <div className="text-white/35 text-[9px] mt-0.5">
                        {fmtHours(game.totalHours)}h · ⭐{game.rating}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── BY THE NUMBERS ────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-white/5">
          <div className="text-[9px] uppercase tracking-widest text-white/25 font-bold mb-3">
            By the Numbers
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { icon: '⏱️', value: `${fmtHours(summary.totalHours)}h`, label: 'Hours' },
              { icon: '🎮', value: String(summary.totalGames), label: 'Games' },
              { icon: '💰', value: `$${avgCph.toFixed(2)}/hr`, label: 'Cost/Hr' },
              {
                icon: '✅',
                value: `${Math.round(summary.completionRate)}%`,
                label: 'Finished',
              },
              {
                icon: '⭐',
                value:
                  summary.averageRating > 0
                    ? summary.averageRating.toFixed(1)
                    : '—',
                label: 'Avg Rating',
              },
              { icon: '💸', value: `$${Math.round(summary.totalSpent)}`, label: 'Spent' },
            ].map(stat => (
              <div
                key={stat.label}
                className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/5"
              >
                <div className="text-[17px] leading-none mb-1">{stat.icon}</div>
                <div className="text-white text-sm font-bold leading-none">{stat.value}</div>
                <div className="text-white/25 text-[9px] mt-0.5 uppercase tracking-wide">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── GENRE DNA ─────────────────────────────────────────── */}
        {genreDNA.length > 0 && (
          <div className="px-6 py-4 border-b border-white/5">
            <div className="text-[9px] uppercase tracking-widest text-white/25 font-bold mb-3">
              Genre DNA
            </div>
            <div className="space-y-2.5">
              {genreDNA.map((g, i) => (
                <div key={g.genre}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white/65 text-xs">{g.genre}</span>
                    <span className="text-white/35 text-[10px] font-medium">{g.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full', GENRE_COLORS[i % GENRE_COLORS.length])}
                      style={{ width: `${g.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FOOTER ────────────────────────────────────────────── */}
        <div className="px-6 py-5">
          <button
            onClick={handleCopy}
            className={clsx(
              'w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold text-sm transition-all',
              copied
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10',
            )}
          >
            {copied ? (
              <>
                <Check size={15} />
                Copied to clipboard!
              </>
            ) : (
              <>
                <Copy size={15} />
                Copy Profile Text
              </>
            )}
          </button>
          <p className="text-center text-[10px] text-white/20 mt-2.5">
            Tip: Screenshot this card to share your gaming identity
          </p>
        </div>
      </div>
    </div>
  );
}
