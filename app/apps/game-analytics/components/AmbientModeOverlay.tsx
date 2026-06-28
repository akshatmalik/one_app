'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { X, Pause, Play, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Game, AnalyticsSummary } from '../lib/types';
import {
  getGamingCreditScore,
  getActivityPulse,
  getGamingPersonality,
  getLifetimeStats,
  getDailyFortune,
  getValueChampion,
  getIfYouStoppedToday,
  getCurrentGamingStreak,
} from '../lib/calculations';
import { formatCurrency, formatHours, formatCostPerHour, formatNumber } from '../lib/format';

interface AmbientModeOverlayProps {
  games: Game[];
  summary: AnalyticsSummary;
  onClose: () => void;
}

interface Scene {
  id: string;
  eyebrow: string;
  gradient: string;
  render: () => React.ReactNode;
}

const SLIDE_DURATION_MS = 8000;

/**
 * Full-screen, auto-rotating "ambient" showcase of the library — meant to be
 * left running on a second screen/TV while idle, like a screensaver built
 * from your own stats instead of stock art. Pure composition over existing
 * read-only calculations; no new data or storage.
 */
export function AmbientModeOverlay({ games, summary, onClose }: AmbientModeOverlayProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const scenes = useMemo<Scene[]>(() => {
    const owned = games.filter(g => g.status !== 'Wishlist');
    const list: Scene[] = [];

    list.push({
      id: 'welcome',
      eyebrow: 'Ambient Mode',
      gradient: 'from-purple-900 via-slate-900 to-indigo-950',
      render: () => (
        <>
          <Sparkles size={40} className="text-purple-300 mb-6" />
          <div className="text-6xl sm:text-7xl font-bold text-white tracking-tight">
            {summary.totalGames}
          </div>
          <div className="text-xl sm:text-2xl text-white/50 mt-3">games in your collection</div>
        </>
      ),
    });

    if (owned.length > 0) {
      const pulse = getActivityPulse(games);
      list.push({
        id: 'pulse',
        eyebrow: 'Right Now',
        gradient: 'from-slate-900 via-slate-900 to-rose-950',
        render: () => (
          <>
            <span
              className="w-4 h-4 rounded-full mb-6"
              style={{ backgroundColor: pulse.color, boxShadow: `0 0 24px ${pulse.color}` }}
            />
            <div className="text-5xl sm:text-6xl font-bold text-white tracking-tight">{pulse.level}</div>
            <div className="text-xl sm:text-2xl text-white/50 mt-3">
              {pulse.daysActive} active day{pulse.daysActive === 1 ? '' : 's'} this week
            </div>
          </>
        ),
      });

      const credit = getGamingCreditScore(games);
      list.push({
        id: 'credit',
        eyebrow: 'Gaming Credit Score',
        gradient: 'from-slate-900 via-slate-900 to-emerald-950',
        render: () => (
          <>
            <div className="text-7xl sm:text-8xl font-bold tracking-tight" style={{ color: credit.color }}>
              {credit.score}
            </div>
            <div className="text-xl sm:text-2xl text-white/50 mt-3">{credit.label}</div>
          </>
        ),
      });

      const lifetime = getLifetimeStats(games);
      list.push({
        id: 'lifetime',
        eyebrow: 'Lifetime Hours',
        gradient: 'from-slate-900 via-slate-900 to-blue-950',
        render: () => (
          <>
            <div className="text-6xl sm:text-7xl font-bold text-white tracking-tight">
              {formatNumber(lifetime.totalHours)}
            </div>
            <div className="text-xl sm:text-2xl text-white/50 mt-3">
              hours — {formatNumber(lifetime.equivalentDays)} days, or {lifetime.moviesEquivalent.toLocaleString()} movies
            </div>
          </>
        ),
      });

      if (summary.mostPlayed) {
        list.push({
          id: 'most-played',
          eyebrow: 'Most Played',
          gradient: 'from-slate-900 via-slate-900 to-amber-950',
          render: () => (
            <>
              <div className="text-5xl sm:text-6xl font-bold text-white tracking-tight text-center px-4">
                {summary.mostPlayed!.name}
              </div>
              <div className="text-xl sm:text-2xl text-white/50 mt-3">
                {formatHours(summary.mostPlayed!.hours)} of your life
              </div>
            </>
          ),
        });
      }

      const champion = getValueChampion(games);
      if (champion) {
        list.push({
          id: 'value-champion',
          eyebrow: 'Best Value',
          gradient: 'from-slate-900 via-slate-900 to-teal-950',
          render: () => (
            <>
              <div className="text-5xl sm:text-6xl font-bold text-white tracking-tight text-center px-4">
                {champion.game.name}
              </div>
              <div className="text-xl sm:text-2xl text-white/50 mt-3">
                {formatCostPerHour(champion.costPerHour)} per hour
              </div>
            </>
          ),
        });
      }

      const personality = getGamingPersonality(games);
      if (personality.score > 0) {
        list.push({
          id: 'personality',
          eyebrow: 'You Are A',
          gradient: 'from-slate-900 via-slate-900 to-fuchsia-950',
          render: () => (
            <>
              <div className="text-5xl sm:text-6xl font-bold text-white tracking-tight text-center px-4">
                {personality.type}
              </div>
              <div className="text-xl sm:text-2xl text-white/50 mt-3 text-center px-6 max-w-2xl">
                {personality.description}
              </div>
            </>
          ),
        });
      }

      const streak = getCurrentGamingStreak(games);
      if (streak > 0) {
        list.push({
          id: 'streak',
          eyebrow: 'Current Streak',
          gradient: 'from-slate-900 via-slate-900 to-orange-950',
          render: () => (
            <>
              <div className="text-7xl sm:text-8xl font-bold text-orange-400 tracking-tight">{streak}</div>
              <div className="text-xl sm:text-2xl text-white/50 mt-3">
                day{streak === 1 ? '' : 's'} in a row
              </div>
            </>
          ),
        });
      }

      const stopped = getIfYouStoppedToday(games);
      list.push({
        id: 'if-stopped',
        eyebrow: 'If You Stopped Today',
        gradient: 'from-slate-900 via-slate-900 to-indigo-950',
        render: () => (
          <>
            <div className="text-5xl sm:text-6xl font-bold text-white tracking-tight">
              {formatCurrency(stopped.totalSpent)}
            </div>
            <div className="text-xl sm:text-2xl text-white/50 mt-3">
              {formatNumber(stopped.totalHours)} hours, {formatCostPerHour(stopped.costPerHour)}/hr, {Math.round(stopped.completionRate)}% completed
            </div>
          </>
        ),
      });

      const fortune = getDailyFortune(games);
      list.push({
        id: 'fortune',
        eyebrow: "Today's Fortune",
        gradient: 'from-slate-900 via-slate-900 to-violet-950',
        render: () => (
          <>
            <div className="text-3xl sm:text-4xl text-white/40 mb-4">{fortune.icon}</div>
            <div className="text-3xl sm:text-4xl font-semibold text-white tracking-tight text-center px-6 max-w-3xl leading-snug">
              {fortune.text}
            </div>
          </>
        ),
      });
    }

    return list;
  }, [games, summary]);

  const sceneCount = scenes.length;

  const goTo = useCallback((next: number) => {
    setIndex(((next % sceneCount) + sceneCount) % sceneCount);
  }, [sceneCount]);

  useEffect(() => {
    if (paused || sceneCount <= 1) return;
    const timer = setInterval(() => goTo(index + 1), SLIDE_DURATION_MS);
    return () => clearInterval(timer);
  }, [paused, index, goTo, sceneCount]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') goTo(index + 1);
      else if (e.key === 'ArrowLeft') goTo(index - 1);
      else if (e.key === ' ') { e.preventDefault(); setPaused(p => !p); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [index, goTo, onClose]);

  if (sceneCount === 0) {
    return null;
  }

  const scene = scenes[index];

  return (
    <div className={`fixed inset-0 z-[80] bg-gradient-to-br ${scene.gradient} transition-colors duration-1000 flex flex-col`}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-5">
        <div className="text-sm uppercase tracking-[0.2em] text-white/40 font-medium">{scene.eyebrow}</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPaused(p => !p)}
            className="p-2 rounded-lg bg-white/5 text-white/60 hover:text-white/90 hover:bg-white/10 transition-all"
            title={paused ? 'Play' : 'Pause'}
          >
            {paused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 text-white/60 hover:text-white/90 hover:bg-white/10 transition-all"
            title="Exit Ambient Mode (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Scene */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        {scene.render()}
      </div>

      {/* Nav + dots */}
      <div className="flex items-center justify-center gap-6 pb-8">
        <button
          onClick={() => goTo(index - 1)}
          className="p-3 rounded-full bg-white/5 text-white/50 hover:text-white/90 hover:bg-white/10 transition-all"
          title="Previous"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-1.5">
          {scenes.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-white/80' : 'w-1.5 bg-white/20 hover:bg-white/40'}`}
              title={s.eyebrow}
            />
          ))}
        </div>
        <button
          onClick={() => goTo(index + 1)}
          className="p-3 rounded-full bg-white/5 text-white/50 hover:text-white/90 hover:bg-white/10 transition-all"
          title="Next"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
