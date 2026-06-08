'use client';

import { useState, useMemo } from 'react';
import { X, Zap, Clock, Gamepad2, ChevronRight, Flame, Star, TrendingUp, Sparkles, Target } from 'lucide-react';
import { Game } from '../lib/types';
import {
  getPlayAdvisorRecommendations,
  PlayTimeSlot,
  PlayMood,
  PlayAdvisorRecommendation,
} from '../lib/calculations';
import { RatingStars } from './RatingStars';
import clsx from 'clsx';

interface PlayAdvisorModalProps {
  games: Game[];
  onClose: () => void;
  onLogTime?: (game: Game) => void;
}

const TIME_SLOTS: { id: PlayTimeSlot; label: string; sublabel: string; icon: string }[] = [
  { id: 'quick',    label: 'Quick',    sublabel: '<1 hour',   icon: '⚡' },
  { id: 'medium',   label: 'Medium',   sublabel: '1–2.5 hrs', icon: '🎯' },
  { id: 'long',     label: 'Long',     sublabel: '2–4 hrs',   icon: '🔥' },
  { id: 'marathon', label: 'Marathon', sublabel: '4+ hrs',    icon: '🏔️' },
];

const MOODS: { id: PlayMood; label: string; sublabel: string; icon: string }[] = [
  { id: 'anything',    label: 'Anything',    sublabel: 'Surprise me',      icon: '🎲' },
  { id: 'chill',       label: 'Chill',       sublabel: 'Easy, relaxed',    icon: '😌' },
  { id: 'focused',     label: 'Focused',     sublabel: 'Deep, immersive',  icon: '🎮' },
  { id: 'story',       label: 'Story',       sublabel: 'Narrative-driven', icon: '📖' },
  { id: 'competitive', label: 'Compete',     sublabel: 'Win, rank up',     icon: '⚔️' },
  { id: 'explore',     label: 'Explore',     sublabel: 'Something new',    icon: '🗺️' },
];

const MOOD_FIT_COLORS = {
  perfect: 'text-emerald-400',
  good:    'text-blue-400',
  ok:      'text-white/40',
};

const TIME_FIT_LABEL = {
  perfect: 'Perfect fit',
  good:    'Good fit',
  ok:      'Manageable',
};

function RecommendationCard({
  rec,
  rank,
  onLogTime,
  onClose,
}: {
  rec: PlayAdvisorRecommendation;
  rank: number;
  onLogTime?: (game: Game) => void;
  onClose: () => void;
}) {
  const { game, score, headline, reasons, sessionNote, moodFit, timeFit, chemistryScore, relationship } = rec;

  const rankColors = ['from-yellow-500/20 to-amber-500/10 border-yellow-500/30',
                      'from-slate-400/15 to-slate-500/10 border-slate-400/25',
                      'from-amber-700/15 to-amber-800/10 border-amber-700/25'];
  const rankLabels = ['#1 Pick', '#2 Pick', '#3 Pick'];

  return (
    <div className={clsx('rounded-xl border bg-gradient-to-br p-4', rankColors[rank])}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Thumbnail */}
        <div className="relative shrink-0">
          {game.thumbnail ? (
            <img
              src={game.thumbnail}
              alt={game.name}
              className="w-14 h-14 rounded-xl object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center">
              <Gamepad2 size={20} className="text-white/20" />
            </div>
          )}
          {/* Rank badge */}
          <div className={clsx(
            'absolute -top-1.5 -left-1.5 text-[9px] font-bold px-1 py-0.5 rounded',
            rank === 0 ? 'bg-yellow-500 text-black' : rank === 1 ? 'bg-slate-400 text-black' : 'bg-amber-700 text-white'
          )}>
            {rankLabels[rank]}
          </div>
        </div>

        {/* Title area */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white truncate">{game.name}</h3>
          <p className="text-[11px] text-white/50 mt-0.5">{headline}</p>

          {/* Status + rating */}
          <div className="flex items-center gap-2 mt-1">
            <span className={clsx(
              'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded',
              game.status === 'In Progress' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/30'
            )}>
              {game.status}
            </span>
            {game.rating > 0 && (
              <RatingStars rating={game.rating} size={10} />
            )}
          </div>
        </div>

        {/* Score badge */}
        <div className="shrink-0 text-right">
          <div className={clsx(
            'text-xl font-black',
            score >= 80 ? 'text-emerald-400' : score >= 65 ? 'text-blue-400' : 'text-white/60'
          )}>
            {score}
          </div>
          <div className="text-[9px] text-white/30">advisor score</div>
        </div>
      </div>

      {/* Fit badges */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-1 px-2 py-0.5 bg-black/20 rounded-full">
          <span className="text-[9px] text-white/40">Mood</span>
          <span className={clsx('text-[9px] font-bold capitalize', MOOD_FIT_COLORS[moodFit])}>
            {moodFit}
          </span>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 bg-black/20 rounded-full">
          <Clock size={9} className="text-white/40" />
          <span className="text-[9px] text-white/40">{TIME_FIT_LABEL[timeFit]}</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 bg-black/20 rounded-full">
          <Zap size={9} className="text-purple-400" />
          <span className="text-[9px] text-white/40">Chemistry</span>
          <span className="text-[9px] font-bold text-purple-300">{chemistryScore}</span>
        </div>
      </div>

      {/* Relationship label */}
      {relationship.label && (
        <div className="mb-2 text-[10px] italic" style={{ color: relationship.color }}>
          {relationship.label}
        </div>
      )}

      {/* Reasons */}
      <ul className="space-y-1 mb-3">
        {reasons.map((r, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <ChevronRight size={10} className="text-white/30 mt-0.5 shrink-0" />
            <span className="text-[11px] text-white/60">{r}</span>
          </li>
        ))}
      </ul>

      {/* Session note */}
      <div className="px-2.5 py-1.5 bg-black/20 rounded-lg text-[10px] text-white/40 italic mb-3">
        {sessionNote}
      </div>

      {/* Action button */}
      {onLogTime && (
        <button
          onClick={() => { onLogTime(game); onClose(); }}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/20 text-purple-300 text-xs font-medium transition-all"
        >
          <Target size={12} />
          Start session & log time
        </button>
      )}
    </div>
  );
}

export function PlayAdvisorModal({ games, onClose, onLogTime }: PlayAdvisorModalProps) {
  const [timeSlot, setTimeSlot] = useState<PlayTimeSlot>('medium');
  const [mood, setMood] = useState<PlayMood>('anything');

  const recommendations = useMemo(
    () => getPlayAdvisorRecommendations(games, timeSlot, mood),
    [games, timeSlot, mood],
  );

  const ownedNonComplete = games.filter(
    g => g.status !== 'Wishlist' && g.status !== 'Completed' && g.status !== 'Abandoned'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg bg-[#0f0f1a] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/5 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-purple-400" />
              <h2 className="text-base font-bold text-white">Play Advisor</h2>
            </div>
            <p className="text-[11px] text-white/40 mt-0.5">
              {ownedNonComplete.length} game{ownedNonComplete.length !== 1 ? 's' : ''} in your active library
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {/* Time slot picker */}
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">
              How much time do you have?
            </p>
            <div className="grid grid-cols-4 gap-2">
              {TIME_SLOTS.map(slot => (
                <button
                  key={slot.id}
                  onClick={() => setTimeSlot(slot.id)}
                  className={clsx(
                    'flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border transition-all',
                    timeSlot === slot.id
                      ? 'bg-purple-500/15 border-purple-500/40 text-white'
                      : 'bg-white/[0.02] border-white/5 text-white/40 hover:border-white/15'
                  )}
                >
                  <span className="text-lg leading-none">{slot.icon}</span>
                  <span className="text-[10px] font-semibold">{slot.label}</span>
                  <span className="text-[9px] opacity-60">{slot.sublabel}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mood picker */}
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">
              What's your vibe?
            </p>
            <div className="grid grid-cols-3 gap-2">
              {MOODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMood(m.id)}
                  className={clsx(
                    'flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border transition-all',
                    mood === m.id
                      ? 'bg-purple-500/15 border-purple-500/40 text-white'
                      : 'bg-white/[0.02] border-white/5 text-white/40 hover:border-white/15'
                  )}
                >
                  <span className="text-lg leading-none">{m.icon}</span>
                  <span className="text-[10px] font-semibold">{m.label}</span>
                  <span className="text-[9px] opacity-60 text-center leading-tight">{m.sublabel}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-3">
              Top picks for right now
            </p>

            {recommendations.length === 0 ? (
              <div className="text-center py-8">
                <Gamepad2 size={32} className="mx-auto mb-3 text-white/10" />
                <p className="text-sm text-white/30">No active games to recommend</p>
                <p className="text-xs text-white/20 mt-1">Add some games or adjust your filters</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recommendations.map((rec, i) => (
                  <RecommendationCard
                    key={rec.game.id}
                    rec={rec}
                    rank={i}
                    onLogTime={onLogTime}
                    onClose={onClose}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer nudge */}
          {recommendations.length > 0 && (
            <p className="text-center text-[10px] text-white/20 pb-2">
              Scores update automatically as you play — the advisor learns your patterns.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
