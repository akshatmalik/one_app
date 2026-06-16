'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Target, ChevronDown, ChevronUp, Check, Zap, Play } from 'lucide-react';
import { Game } from '../lib/types';
import { getDailyChallenges, DailyChallenge, DailyChallengeType } from '../lib/calculations';
import clsx from 'clsx';

interface DailyChallengesProps {
  games: Game[];
  userId?: string;
  onLogTime?: (game: Game) => void;
}

const TYPE_STYLE: Record<DailyChallengeType, { icon: string; bg: string; border: string; text: string }> = {
  'session-focus': { icon: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    text: 'text-blue-400' },
  'genre-explorer':{ icon: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    text: 'text-cyan-400' },
  'backlog-buster':{ icon: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  text: 'text-orange-400' },
  'closer':        { icon: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  'streak-keeper': { icon: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     text: 'text-red-400' },
  'value-hunter':  { icon: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/20',  text: 'text-yellow-400' },
  'reunion':       { icon: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  text: 'text-purple-400' },
};

const STORAGE_KEY = 'ga-daily-challenges-v1';

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadCompletedData(uid: string): Record<string, string[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}-completed-${uid}`);
    return raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
  } catch { return {}; }
}

function saveCompletedData(uid: string, data: Record<string, string[]>): void {
  try { localStorage.setItem(`${STORAGE_KEY}-completed-${uid}`, JSON.stringify(data)); } catch {}
}

function loadChallengeStreak(uid: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}-streak-${uid}`);
    if (!raw) return 0;
    const { days, lastDate } = JSON.parse(raw) as { days: number; lastDate: string };
    const today = getTodayKey();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    if (lastDate === today || lastDate === yStr) return days;
    return 0;
  } catch { return 0; }
}

function maybeUpdateChallengeStreak(uid: string): number {
  try {
    const today = getTodayKey();
    const raw = localStorage.getItem(`${STORAGE_KEY}-streak-${uid}`);
    let days = 1;
    if (raw) {
      const parsed = JSON.parse(raw) as { days: number; lastDate: string };
      if (parsed.lastDate === today) return parsed.days; // already done today
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().slice(0, 10);
      days = parsed.lastDate === yStr ? parsed.days + 1 : 1;
    }
    localStorage.setItem(`${STORAGE_KEY}-streak-${uid}`, JSON.stringify({ days, lastDate: today }));
    return days;
  } catch { return 1; }
}

function loadExpanded(uid: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const v = localStorage.getItem(`${STORAGE_KEY}-expanded-${uid}`);
    return v === null ? true : v === '1';
  } catch { return true; }
}

function saveExpanded(uid: string, v: boolean): void {
  try { localStorage.setItem(`${STORAGE_KEY}-expanded-${uid}`, v ? '1' : '0'); } catch {}
}

export function DailyChallenges({ games, userId, onLogTime }: DailyChallengesProps) {
  const uid = userId ?? 'local';
  const [expanded, setExpanded] = useState(true);
  const [completedData, setCompletedData] = useState<Record<string, string[]>>({});
  const [challengeStreak, setChallengeStreak] = useState(0);
  const [justCompleted, setJustCompleted] = useState<string | null>(null);

  useEffect(() => {
    setCompletedData(loadCompletedData(uid));
    setChallengeStreak(loadChallengeStreak(uid));
    setExpanded(loadExpanded(uid));
  }, [uid]);

  const today = getTodayKey();
  const challenges = useMemo(() => getDailyChallenges(games), [games]);
  const completedToday = completedData[today] ?? [];
  const completedCount = challenges.filter(c => completedToday.includes(c.id)).length;
  const allDone = challenges.length > 0 && completedCount === challenges.length;

  const handleToggleExpand = useCallback(() => {
    setExpanded(v => {
      saveExpanded(uid, !v);
      return !v;
    });
  }, [uid]);

  const markComplete = useCallback((challengeId: string) => {
    setCompletedData(prev => {
      const prevList = prev[today] ?? [];
      if (prevList.includes(challengeId)) return prev;
      const nextList = [...prevList, challengeId];
      const next = { ...prev, [today]: nextList };
      saveCompletedData(uid, next);

      // If all 3 are now done, update streak
      if (challenges.every(c => nextList.includes(c.id))) {
        const newStreak = maybeUpdateChallengeStreak(uid);
        setChallengeStreak(newStreak);
      }
      return next;
    });
    setJustCompleted(challengeId);
    setTimeout(() => setJustCompleted(null), 1500);
  }, [uid, today, challenges]);

  // Don't render with fewer than 2 library games or 0 challenges
  if (games.filter(g => g.status !== 'Wishlist').length < 2) return null;
  if (challenges.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-white/[0.06] overflow-hidden">
      {/* Header row */}
      <button
        onClick={handleToggleExpand}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-white/[0.025] hover:bg-white/[0.04] transition-colors text-left"
      >
        <Target size={13} className={allDone ? 'text-emerald-400' : 'text-purple-400'} />
        <span className="text-xs font-medium text-white/60 flex-1">Daily Challenges</span>

        {challengeStreak > 1 && (
          <div className="flex items-center gap-0.5 text-[10px] text-orange-400/80 font-medium">
            <Zap size={10} />
            <span>{challengeStreak}d streak</span>
          </div>
        )}

        {/* Progress pips */}
        <div className="flex items-center gap-2 ml-1">
          <div className="flex gap-1">
            {challenges.map((c, i) => (
              <div
                key={i}
                className={clsx(
                  'w-2 h-2 rounded-full transition-all duration-300',
                  completedToday.includes(c.id) ? 'bg-emerald-400' : 'bg-white/15',
                )}
              />
            ))}
          </div>
          <span className={clsx('text-[10px] font-medium tabular-nums', allDone ? 'text-emerald-400' : 'text-white/30')}>
            {completedCount}/{challenges.length}
          </span>
          {expanded
            ? <ChevronUp size={12} className="text-white/20" />
            : <ChevronDown size={12} className="text-white/20" />}
        </div>
      </button>

      {/* Challenge cards */}
      {expanded && (
        <div className="px-3 pb-3 pt-2 space-y-2 bg-black/10">
          {challenges.map(challenge => (
            <ChallengeRow
              key={challenge.id}
              challenge={challenge}
              game={challenge.gameId ? games.find(g => g.id === challenge.gameId) : undefined}
              isDone={completedToday.includes(challenge.id)}
              isFlashing={justCompleted === challenge.id}
              onComplete={() => markComplete(challenge.id)}
              onLogTime={onLogTime}
            />
          ))}

          {allDone && (
            <div className="pt-1 text-center">
              <span className="text-[11px] text-emerald-400 font-medium">
                🎉 All done!
                {challengeStreak > 1 ? ` ${challengeStreak}-day challenge streak.` : ' First one on the board.'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ChallengeRowProps {
  challenge: DailyChallenge;
  game?: Game;
  isDone: boolean;
  isFlashing: boolean;
  onComplete: () => void;
  onLogTime?: (game: Game) => void;
}

function ChallengeRow({ challenge, game, isDone, isFlashing, onComplete, onLogTime }: ChallengeRowProps) {
  const style = TYPE_STYLE[challenge.type];

  return (
    <div
      className={clsx(
        'flex items-center gap-3 p-3 rounded-lg border transition-all duration-300',
        isFlashing && 'scale-[1.01]',
        isDone
          ? 'bg-emerald-500/5 border-emerald-500/15 opacity-60'
          : [style.bg, style.border],
      )}
    >
      {/* Thumbnail or emoji */}
      {game?.thumbnail ? (
        <img
          src={game.thumbnail}
          alt=""
          className={clsx('w-10 h-10 rounded-lg object-cover flex-shrink-0', isDone && 'grayscale opacity-60')}
        />
      ) : (
        <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 select-none', style.bg)}>
          {isDone ? '✅' : challenge.icon}
        </div>
      )}

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={clsx('text-xs font-medium leading-snug', isDone ? 'text-white/30 line-through' : 'text-white/80')}>
          {challenge.title}
        </p>
        <p className="text-[11px] text-white/35 leading-snug mt-0.5 truncate">
          {challenge.description}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {game && onLogTime && !isDone && (
          <button
            onClick={() => onLogTime(game)}
            title="Log time"
            className={clsx(
              'flex items-center gap-1 text-[10px] px-2 py-1 rounded-md font-medium transition-colors border',
              style.bg, style.border, style.text,
              'hover:opacity-80',
            )}
          >
            <Play size={9} />
            Log
          </button>
        )}

        <button
          onClick={() => { if (!isDone) onComplete(); }}
          aria-label={isDone ? 'Done' : 'Mark complete'}
          className={clsx(
            'w-7 h-7 rounded-lg flex items-center justify-center border transition-all duration-200',
            isDone
              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
              : 'border-white/10 text-white/20 hover:border-white/25 hover:text-white/50 cursor-pointer',
          )}
        >
          <Check size={13} />
        </button>
      </div>
    </div>
  );
}
