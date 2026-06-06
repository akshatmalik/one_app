'use client';

import { useState, useMemo, useCallback } from 'react';
import { X, Sparkles, Shuffle, Clock, Zap, ChevronRight } from 'lucide-react';
import { Game } from '../lib/types';
import {
  getPlayAdvisorPicks,
  SessionLength,
  PlayAdvisorPick,
  getTotalHours,
  getRelationshipStatus,
} from '../lib/calculations';
import clsx from 'clsx';

interface PlayAdvisorProps {
  games: Game[];
  onLogTime: (game: Game, hours?: number) => void;
  onOpenGame: (game: Game) => void;
  onClose: () => void;
}

const SESSION_OPTIONS: { value: SessionLength; label: string; sublabel: string }[] = [
  { value: '30m', label: '30m',  sublabel: 'Quick' },
  { value: '1h',  label: '1 hr', sublabel: 'Short' },
  { value: '2h',  label: '2 hr', sublabel: 'Medium' },
  { value: '3h',  label: '3 hr', sublabel: 'Long' },
  { value: '4h+', label: '4h+',  sublabel: 'Marathon' },
  { value: 'any', label: 'Any',  sublabel: 'No limit' },
];

function fmtHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h % 1 === 0) return `${h}h`;
  return `${h.toFixed(1)}h`;
}

function ChemistryPip({ grade }: { grade: 'S' | 'A' | 'B' | 'C' | 'D' }) {
  const colors: Record<typeof grade, { text: string; bg: string }> = {
    S: { text: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
    A: { text: '#ec4899', bg: 'rgba(236,72,153,0.15)' },
    B: { text: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
    C: { text: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
    D: { text: '#9ca3af', bg: 'rgba(156,163,175,0.12)' },
  };
  const c = colors[grade];
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{ color: c.text, backgroundColor: c.bg }}
    >
      {grade} chem
    </span>
  );
}

function HeroPickCard({
  pick,
  onLogTime,
  onOpenGame,
}: {
  pick: PlayAdvisorPick;
  onLogTime: (game: Game, hours?: number) => void;
  onOpenGame: (game: Game) => void;
}) {
  const [logging, setLogging] = useState(false);
  const relationship = useMemo(() => getRelationshipStatus(pick.game, [pick.game]), [pick.game]);
  const totalH = getTotalHours(pick.game);

  const handleQuickLog = async () => {
    setLogging(true);
    const sessionH = pick.avgSessionHours ?? 1;
    onLogTime(pick.game, sessionH);
    setLogging(false);
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.02]">
      {/* Thumbnail hero */}
      <div className="relative h-36 overflow-hidden">
        {pick.game.thumbnail ? (
          <img
            src={pick.game.thumbnail}
            alt={pick.game.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900/40 to-blue-900/30" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Score pill in corner */}
        <div className="absolute top-2.5 right-2.5">
          <span className="text-xs font-bold px-2 py-1 rounded-lg bg-black/50 text-white/80 backdrop-blur-sm">
            {pick.score}%
          </span>
        </div>

        {/* Relationship label */}
        {relationship && (
          <div
            className="absolute top-2.5 left-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm"
            style={{ backgroundColor: relationship.bgColor, color: relationship.color }}
          >
            {relationship.label}
          </div>
        )}

        {/* Game name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-base font-bold text-white leading-tight line-clamp-2">
            {pick.game.name}
          </h3>
          {pick.game.genre && (
            <span className="text-[11px] text-white/40">{pick.game.genre}</span>
          )}
        </div>
      </div>

      {/* Info section */}
      <div className="p-3 space-y-2.5">
        {/* Primary reason */}
        <p className="text-sm text-white/70 leading-snug">{pick.primaryReason}</p>

        {/* Badges */}
        {pick.badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pick.badges.map((b, i) => (
              <span
                key={i}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ color: b.color, backgroundColor: b.bg }}
              >
                <span>{b.icon}</span>
                <span>{b.label}</span>
              </span>
            ))}
          </div>
        )}

        {/* Milestone note */}
        {pick.milestoneNote && (
          <p className="text-[11px] text-emerald-400/70 flex items-center gap-1">
            <span>🎯</span>
            <span>{pick.milestoneNote}</span>
          </p>
        )}

        {/* Quick stats row */}
        <div className="flex items-center gap-3 text-[11px] text-white/30">
          <span>{totalH.toFixed(1)}h played</span>
          {pick.avgSessionHours !== null && (
            <>
              <span>·</span>
              <span>avg {fmtHours(pick.avgSessionHours)} session</span>
            </>
          )}
          {pick.game.rating > 0 && (
            <>
              <span>·</span>
              <span>{pick.game.rating}/10</span>
            </>
          )}
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleQuickLog}
            disabled={logging}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60"
          >
            <Zap size={14} />
            {logging ? 'Logging…' : 'Quick Log Session'}
          </button>
          <button
            onClick={() => onOpenGame(pick.game)}
            className="flex items-center justify-center px-3 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90 rounded-xl transition-all"
            title="Open game detail"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function AlternativeCard({
  pick,
  rank,
  onLogTime,
  onOpenGame,
}: {
  pick: PlayAdvisorPick;
  rank: number;
  onLogTime: (game: Game, hours?: number) => void;
  onOpenGame: (game: Game) => void;
}) {
  const totalH = getTotalHours(pick.game);

  return (
    <button
      className="w-full text-left flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 transition-all group"
      onClick={() => onOpenGame(pick.game)}
    >
      {/* Rank */}
      <span className="text-xs text-white/20 font-mono w-4 shrink-0">{rank}</span>

      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white/5">
        {pick.game.thumbnail ? (
          <img src={pick.game.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900/30 to-blue-900/20" />
        )}
      </div>

      {/* Name + reason */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white/80 truncate group-hover:text-white transition-colors">
          {pick.game.name}
        </div>
        <div className="text-[11px] text-white/35 truncate mt-0.5">{pick.primaryReason}</div>
      </div>

      {/* Chemistry grade + hours */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <ChemistryPip grade={pick.chemistryGrade} />
        <span className="text-[10px] text-white/25">{totalH.toFixed(0)}h</span>
      </div>

      {/* Quick log */}
      <button
        onClick={e => { e.stopPropagation(); onLogTime(pick.game, pick.avgSessionHours ?? 1); }}
        className="shrink-0 p-1.5 rounded-lg bg-white/5 hover:bg-purple-500/20 text-white/30 hover:text-purple-400 transition-all"
        title="Quick log session"
      >
        <Zap size={13} />
      </button>
    </button>
  );
}

export function PlayAdvisor({ games, onLogTime, onOpenGame, onClose }: PlayAdvisorProps) {
  const [sessionLength, setSessionLength] = useState<SessionLength>('any');
  const [shuffleSeed, setShuffleSeed] = useState(0);

  const result = useMemo(() => {
    // shuffleSeed triggers a re-pick with slight scoring randomization
    const eligible = games.filter(
      g => g.status !== 'Wishlist' && g.status !== 'Completed' && g.status !== 'Abandoned',
    );
    if (eligible.length === 0) return null;
    return getPlayAdvisorPicks(games, sessionLength, 4);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games, sessionLength, shuffleSeed]);

  const handleShuffle = useCallback(() => {
    setShuffleSeed(s => s + 1);
  }, []);

  const [hero, ...alternatives] = result?.picks ?? [];

  const eligibleCount = games.filter(
    g => g.status !== 'Wishlist' && g.status !== 'Completed' && g.status !== 'Abandoned',
  ).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md mx-auto bg-[#0e0e16] rounded-t-2xl sm:rounded-2xl border border-white/10 shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden animate-bottom-sheet-up sm:animate-none"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-purple-400" />
            <div>
              <h2 className="text-base font-bold text-white">Tonight&apos;s Pick</h2>
              <p className="text-[11px] text-white/35">{eligibleCount} games eligible</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Session length selector */}
        <div className="px-4 pb-3 shrink-0">
          <p className="text-[11px] text-white/40 mb-2 flex items-center gap-1.5">
            <Clock size={11} />
            How long do you have?
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
            {SESSION_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSessionLength(opt.value)}
                className={clsx(
                  'shrink-0 flex flex-col items-center px-3 py-2 rounded-xl text-xs font-medium transition-all',
                  sessionLength === opt.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-white/50 hover:bg-white/8 hover:text-white/70',
                )}
              >
                <span className="font-bold text-[13px]">{opt.label}</span>
                <span className={clsx('text-[9px] mt-0.5', sessionLength === opt.value ? 'text-purple-200/70' : 'text-white/25')}>
                  {opt.sublabel}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/5 mx-4 shrink-0" />

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0 overscroll-contain">
          {!result || eligibleCount === 0 ? (
            <div className="py-12 text-center">
              <div className="text-3xl mb-3">🎮</div>
              <p className="text-sm text-white/40">No eligible games found.</p>
              <p className="text-xs text-white/25 mt-1">Add games or check your library.</p>
            </div>
          ) : (
            <>
              {/* Hero pick */}
              {hero && (
                <div>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
                    Top Pick
                  </p>
                  <HeroPickCard
                    pick={hero}
                    onLogTime={onLogTime}
                    onOpenGame={onOpenGame}
                  />
                </div>
              )}

              {/* Alternatives */}
              {alternatives.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
                    Also Consider
                  </p>
                  <div className="space-y-2">
                    {alternatives.map((pick, i) => (
                      <AlternativeCard
                        key={pick.game.id}
                        pick={pick}
                        rank={i + 2}
                        onLogTime={onLogTime}
                        onOpenGame={onOpenGame}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Session length hint */}
              {sessionLength !== 'any' && result && (
                <p className="text-[11px] text-white/25 text-center">
                  Picks optimised for a {result.sessionLabel} session
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer: shuffle + session note */}
        <div className="px-4 pb-4 pt-2 shrink-0 space-y-2">
          <div className="h-px bg-white/5" />
          <button
            onClick={handleShuffle}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-white/40 hover:text-white/70 text-sm transition-all"
          >
            <Shuffle size={14} />
            Give me different picks
          </button>
        </div>
      </div>
    </div>
  );
}
