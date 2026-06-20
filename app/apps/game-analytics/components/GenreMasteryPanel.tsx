'use client';

import { useMemo } from 'react';
import { Swords, Trophy, Sparkles } from 'lucide-react';
import { Game } from '../lib/types';
import { getGenreMastery, GenreMasteryClass } from '../lib/calculations';
import { ProgressRing } from './ProgressRing';
import clsx from 'clsx';

interface GenreMasteryPanelProps {
  games: Game[];
}

const RANK_COLORS: Record<string, string> = {
  Novice: '#9ca3af',
  Apprentice: '#22c55e',
  Adept: '#3b82f6',
  Expert: '#a855f7',
  Master: '#f59e0b',
  Legend: '#f43f5e',
};

function rankColor(rank: string): string {
  return RANK_COLORS[rank] ?? '#9ca3af';
}

export function GenreMasteryPanel({ games }: GenreMasteryPanelProps) {
  const mastery = useMemo(() => getGenreMastery(games), [games]);

  if (mastery.classes.length === 0) return null;

  const { mainClass, hybridWith, classes, playerLevel, playerTitle } = mastery;
  const otherClasses = classes.filter(c => c.genre !== mainClass?.genre);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-white/50 flex items-center gap-2">
        <Swords size={14} className="text-rose-400" />
        Genre Mastery
      </h3>

      {/* Player summary */}
      <div className="p-4 bg-gradient-to-br from-rose-500/15 to-amber-500/15 border border-rose-500/20 rounded-xl flex items-center gap-4">
        <ProgressRing progress={100} color="#f59e0b" size={56} strokeWidth={3}>
          <span className="text-sm font-bold text-white">{playerLevel}</span>
        </ProgressRing>
        <div className="min-w-0">
          <div className="text-xs text-white/40">Player Level {playerLevel}</div>
          <div className="text-base font-semibold text-white truncate">{playerTitle}</div>
          <div className="text-[11px] text-white/40 mt-0.5">{mastery.totalXP.toLocaleString()} total XP across {classes.length} genre{classes.length === 1 ? '' : 's'}</div>
        </div>
      </div>

      {/* Main class hero card */}
      {mainClass && (
        <GenreClassCard cls={mainClass} hero secondaryGenre={hybridWith?.genre} />
      )}

      {/* Remaining classes grid */}
      {otherClasses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {otherClasses.map(cls => (
            <GenreClassCard key={cls.genre} cls={cls} />
          ))}
        </div>
      )}
    </div>
  );
}

function GenreClassCard({ cls, hero = false, secondaryGenre }: { cls: GenreMasteryClass; hero?: boolean; secondaryGenre?: string }) {
  const color = rankColor(cls.rank);

  return (
    <div
      className={clsx(
        'rounded-xl border p-4',
        hero ? 'bg-gradient-to-br from-white/[0.06] to-white/[0.02] border-white/10' : 'bg-white/[0.03] border-white/5'
      )}
    >
      <div className="flex items-start gap-3">
        <ProgressRing progress={cls.progressPercent} color={color} size={hero ? 52 : 40} strokeWidth={hero ? 3 : 2.5}>
          <span className={clsx('font-bold text-white', hero ? 'text-sm' : 'text-xs')}>{cls.level}</span>
        </ProgressRing>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={clsx('font-semibold text-white truncate', hero ? 'text-base' : 'text-sm')}>{cls.genre}</span>
            {hero && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${color}22`, color }}>
                <Trophy size={9} /> Main Class
              </span>
            )}
            {secondaryGenre && (
              <span className="text-[10px] text-white/30">+ {secondaryGenre} hybrid</span>
            )}
          </div>
          <div className="text-[11px] font-medium mt-0.5" style={{ color }}>{cls.rank}</div>
        </div>
      </div>

      {/* XP bar */}
      <div className="mt-3">
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${cls.progressPercent}%`, backgroundColor: color }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-white/30 mt-1">
          <span>{cls.xpIntoLevel.toLocaleString()} / {cls.xpForNextLevel.toLocaleString()} XP</span>
          <span>Lvl {cls.level + 1}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div>
          <div className="text-xs font-semibold text-white">{cls.gameCount}</div>
          <div className="text-[9px] text-white/30">games</div>
        </div>
        <div>
          <div className="text-xs font-semibold text-white">{cls.totalHours}h</div>
          <div className="text-[9px] text-white/30">played</div>
        </div>
        <div>
          <div className="text-xs font-semibold text-white">{cls.avgRating > 0 ? cls.avgRating.toFixed(1) : '—'}</div>
          <div className="text-[9px] text-white/30">avg rating</div>
        </div>
      </div>

      {/* Perk + insight */}
      <div className="mt-3 text-[11px] text-white/50 flex items-start gap-1.5">
        <Sparkles size={11} className="mt-0.5 shrink-0 text-white/30" />
        <span>{cls.perk}</span>
      </div>
      {cls.nextPerk && cls.nextPerkLevel && (
        <div className="mt-1 text-[10px] text-white/30 pl-[18px]">
          Lvl {cls.nextPerkLevel}: {cls.nextPerk}
        </div>
      )}
      <div className="mt-2 text-[10px] text-white/40 italic pl-[18px]">{cls.insight}</div>
    </div>
  );
}
