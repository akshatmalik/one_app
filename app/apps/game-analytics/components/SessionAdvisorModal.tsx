'use client';

import { useState, useMemo } from 'react';
import { X, Clock, Zap, ChevronRight, Play, Sparkles, RotateCcw } from 'lucide-react';
import {
  getSessionAdvisorPicks,
  SessionTimeSlot,
  SessionMoodType,
  SessionAdvisorPick,
} from '../lib/calculations';
import { Game } from '../lib/types';
import clsx from 'clsx';

interface SessionAdvisorModalProps {
  games: Game[];
  onClose: () => void;
  onStartSession: (game: Game) => void;
}

const TIME_OPTIONS: { slot: SessionTimeSlot; label: string; sub: string; emoji: string; color: string }[] = [
  { slot: '30m', label: '30 min',  sub: 'Quick burst',       emoji: '⚡', color: '#f97316' },
  { slot: '1h',  label: '1 hour',  sub: 'Nice and focused',  emoji: '🎯', color: '#3b82f6' },
  { slot: '2h',  label: '2 hours', sub: 'Proper session',    emoji: '🎮', color: '#8b5cf6' },
  { slot: '3h+', label: '3h+',     sub: 'Full deep dive',    emoji: '🔥', color: '#ec4899' },
];

const MOOD_OPTIONS: { mood: SessionMoodType; label: string; sub: string; emoji: string; color: string }[] = [
  { mood: 'chill',       label: 'Chill',       sub: 'Relax, no stress',       emoji: '😌', color: '#10b981' },
  { mood: 'story',       label: 'Story Mode',  sub: 'Narrative & immersion',  emoji: '📖', color: '#6366f1' },
  { mood: 'competitive', label: 'Sweaty',      sub: 'Full focus, compete',    emoji: '💪', color: '#ef4444' },
  { mood: 'explore',     label: 'Explore',     sub: 'Discovery & adventure',  emoji: '🗺️', color: '#f59e0b' },
  { mood: 'anything',    label: 'Surprise Me', sub: 'Open to anything',       emoji: '🎲', color: '#a855f7' },
];

const CHEM_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  S: { text: '#fde047', bg: 'rgba(253,224,71,0.12)', border: 'rgba(253,224,71,0.30)' },
  A: { text: '#6ee7b7', bg: 'rgba(110,231,183,0.10)', border: 'rgba(110,231,183,0.30)' },
  B: { text: '#93c5fd', bg: 'rgba(147,197,253,0.10)', border: 'rgba(147,197,253,0.30)' },
  C: { text: '#c4b5fd', bg: 'rgba(196,181,253,0.10)', border: 'rgba(196,181,253,0.30)' },
  D: { text: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.30)' },
};

function PickCard({
  pick,
  rank,
  onChoose,
}: {
  pick: SessionAdvisorPick;
  rank: number;
  onChoose: () => void;
}) {
  const game = pick.game;
  const chem = CHEM_COLORS[pick.chemistryGrade] || CHEM_COLORS.C;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.025] group cursor-pointer hover:border-white/15 hover:bg-white/[0.04] transition-all duration-200"
      style={{ animationDelay: `${(rank - 1) * 80}ms` }}
      onClick={onChoose}
    >
      {/* Banner image */}
      {game.thumbnail ? (
        <div className="relative h-20 overflow-hidden">
          <img
            src={game.thumbnail}
            alt={game.name}
            className="w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-opacity"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0d0d15]" />
          {/* Rank badge */}
          <div className="absolute top-2 left-2 w-6 h-6 rounded-lg bg-black/50 flex items-center justify-center text-[11px] font-black text-white/70">
            {rank}
          </div>
          {/* Chemistry badge */}
          <div
            className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold border"
            style={{ color: chem.text, backgroundColor: chem.bg, borderColor: chem.border }}
          >
            ⚗️ {pick.chemistryGrade}
          </div>
        </div>
      ) : (
        <div className="h-14 bg-white/[0.03] flex items-center justify-between px-4">
          <span className="text-2xl font-black text-white/8">{rank}</span>
          <div
            className="px-2 py-0.5 rounded-md text-[10px] font-bold border"
            style={{ color: chem.text, backgroundColor: chem.bg, borderColor: chem.border }}
          >
            ⚗️ {pick.chemistryGrade}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-3 pb-3 pt-2">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white/90 truncate leading-tight">{game.name}</h3>
            {game.genre && (
              <span className="text-[10px] text-white/35">{game.genre}</span>
            )}
          </div>
          <div className="shrink-0 flex items-center gap-1 text-[10px] text-white/30">
            <Clock size={9} />
            <span>~{pick.expectedHours < 1 ? `${Math.round(pick.expectedHours * 60)}m` : `${pick.expectedHours.toFixed(1)}h`}</span>
          </div>
        </div>

        {/* Reasoning */}
        <p className="text-[11px] text-white/50 leading-snug mb-2">{pick.reasoning}</p>

        {/* Key fact + score + CTA */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {pick.keyFact && (
              <span className="text-[10px] text-white/30">{pick.keyFact}</span>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onChoose(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-500 text-white text-[11px] font-semibold transition-all shrink-0"
          >
            <Play size={10} fill="currentColor" />
            Let&apos;s Go
          </button>
        </div>
      </div>
    </div>
  );
}

export function SessionAdvisorModal({ games, onClose, onStartSession }: SessionAdvisorModalProps) {
  const [step, setStep] = useState<'time' | 'mood' | 'picks'>('time');
  const [selectedTime, setSelectedTime] = useState<SessionTimeSlot | null>(null);
  const [selectedMood, setSelectedMood] = useState<SessionMoodType | null>(null);

  const picks = useMemo(() => {
    if (!selectedTime || !selectedMood) return [];
    return getSessionAdvisorPicks(games, selectedTime, selectedMood);
  }, [games, selectedTime, selectedMood]);

  const handleTimeSelect = (slot: SessionTimeSlot) => {
    setSelectedTime(slot);
    setStep('mood');
  };

  const handleMoodSelect = (mood: SessionMoodType) => {
    setSelectedMood(mood);
    setStep('picks');
  };

  const handleReset = () => {
    setStep('time');
    setSelectedTime(null);
    setSelectedMood(null);
  };

  const selectedTimeOption = TIME_OPTIONS.find(t => t.slot === selectedTime);
  const selectedMoodOption = MOOD_OPTIONS.find(m => m.mood === selectedMood);

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0d0d15] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-purple-400" />
            <span className="text-sm font-semibold text-white">Smart Session Pick</span>
          </div>
          <div className="flex items-center gap-2">
            {step !== 'time' && (
              <button onClick={handleReset} className="text-white/30 hover:text-white/60 transition-colors" title="Start over">
                <RotateCcw size={14} />
              </button>
            )}
            <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Step breadcrumb */}
        {step !== 'time' && (
          <div className="flex items-center gap-2 px-5 pt-3 text-[10px] text-white/25">
            {selectedTimeOption && (
              <>
                <span className="text-white/50">{selectedTimeOption.emoji} {selectedTimeOption.label}</span>
                <ChevronRight size={10} />
              </>
            )}
            {selectedMoodOption && step === 'picks' && (
              <span className="text-white/50">{selectedMoodOption.emoji} {selectedMoodOption.label}</span>
            )}
          </div>
        )}

        {/* Step: Time */}
        {step === 'time' && (
          <div className="p-5 space-y-3">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-white">How long do you have?</h2>
              <p className="text-xs text-white/40 mt-0.5">I&apos;ll match games to your window</p>
            </div>
            {TIME_OPTIONS.map(opt => (
              <button
                key={opt.slot}
                onClick={() => handleTimeSelect(opt.slot)}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/8 hover:border-white/15 transition-all text-left group"
              >
                <span className="text-2xl">{opt.emoji}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white group-hover:text-white/90">{opt.label}</div>
                  <div className="text-[11px] text-white/40">{opt.sub}</div>
                </div>
                <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* Step: Mood */}
        {step === 'mood' && (
          <div className="p-5 space-y-2">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-white">What&apos;s your vibe?</h2>
              <p className="text-xs text-white/40 mt-0.5">Narrow it down to exactly what you&apos;re feeling</p>
            </div>
            {MOOD_OPTIONS.map(opt => (
              <button
                key={opt.mood}
                onClick={() => handleMoodSelect(opt.mood)}
                className="w-full flex items-center gap-4 p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/8 hover:border-white/15 transition-all text-left group"
              >
                <span className="text-xl">{opt.emoji}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white group-hover:text-white/90">{opt.label}</div>
                  <div className="text-[11px] text-white/40">{opt.sub}</div>
                </div>
                <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* Step: Picks */}
        {step === 'picks' && (
          <div className="p-5 space-y-3">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-white">
                {picks.length > 0 ? 'Your top picks' : 'No matches found'}
              </h2>
              {picks.length > 0 ? (
                <p className="text-xs text-white/40 mt-0.5">
                  Ranked by time fit, mood match, and live chemistry
                </p>
              ) : (
                <p className="text-xs text-white/40 mt-0.5">
                  Add more in-progress games to your library to get picks
                </p>
              )}
            </div>

            {picks.length > 0 ? (
              picks.map((pick, i) => (
                <PickCard
                  key={pick.game.id}
                  pick={pick}
                  rank={i + 1}
                  onChoose={() => {
                    onStartSession(pick.game);
                    onClose();
                  }}
                />
              ))
            ) : (
              <div className="text-center py-8">
                <Sparkles size={32} className="mx-auto mb-3 text-white/10" />
                <p className="text-white/30 text-sm">No active games to recommend</p>
                <button
                  onClick={handleReset}
                  className="mt-4 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Try different settings
                </button>
              </div>
            )}

            {picks.length > 0 && (
              <button
                onClick={handleReset}
                className="w-full text-center text-xs text-white/25 hover:text-white/50 transition-colors pt-2"
              >
                Try different time / mood
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
