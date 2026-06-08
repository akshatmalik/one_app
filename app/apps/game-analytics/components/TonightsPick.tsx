'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, Sparkles, Clock, Gamepad2, ChevronRight, Play } from 'lucide-react';
import { Game } from '../lib/types';
import {
  getTonightsPick,
  TonightsPickTime,
  TonightsPickMood,
  TonightsPickResult,
} from '../lib/calculations';
import clsx from 'clsx';

interface TonightsPickProps {
  games: Game[];
  onClose: () => void;
  onPlay: (game: Game) => void; // triggers quick check-in
}

const TIME_OPTIONS: { value: TonightsPickTime; label: string; sub: string }[] = [
  { value: '30min', label: '30 min', sub: 'Quick session' },
  { value: '1hr',   label: '1 hour', sub: 'Focused play' },
  { value: '2hr',   label: '2 hours', sub: 'Good session' },
  { value: '4hr+',  label: '4 hours+', sub: 'Deep dive' },
];

const MOOD_OPTIONS: { value: TonightsPickMood; icon: string; label: string; desc: string }[] = [
  { value: 'anything',    icon: '🎲', label: 'Anything',    desc: 'Surprise me' },
  { value: 'chill',       icon: '😌', label: 'Chill',       desc: 'Relaxed pace' },
  { value: 'story',       icon: '📖', label: 'Story',       desc: 'Narrative-driven' },
  { value: 'action',      icon: '💥', label: 'Action',      desc: 'High energy' },
  { value: 'competitive', icon: '⚔️', label: 'Competitive', desc: 'Challenge mode' },
];

export function TonightsPick({ games, onClose, onPlay }: TonightsPickProps) {
  const [selectedTime, setSelectedTime] = useState<TonightsPickTime | null>(null);
  const [selectedMood, setSelectedMood] = useState<TonightsPickMood | null>(null);
  const [step, setStep] = useState<'time' | 'mood' | 'results'>('time');
  const [highlightIdx, setHighlightIdx] = useState(0);

  const picks = useMemo(() => {
    if (!selectedTime || !selectedMood) return [];
    return getTonightsPick(games, selectedTime, selectedMood);
  }, [games, selectedTime, selectedMood]);

  // Cycle the top pick highlight glow
  useEffect(() => {
    if (step !== 'results' || picks.length === 0) return;
    const t = setTimeout(() => setHighlightIdx(1), 800);
    return () => clearTimeout(t);
  }, [step, picks.length]);

  const handleTimeSelect = (t: TonightsPickTime) => {
    setSelectedTime(t);
    setStep('mood');
  };

  const handleMoodSelect = (m: TonightsPickMood) => {
    setSelectedMood(m);
    setStep('results');
  };

  const handleBack = () => {
    if (step === 'mood') setStep('time');
    if (step === 'results') setStep('mood');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative z-10 w-full sm:max-w-md bg-[#0e0e18] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-bottom-sheet-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Sparkles size={16} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Tonight&apos;s Pick</h2>
              <p className="text-[11px] text-white/40">
                {step === 'time' && 'How much time do you have?'}
                {step === 'mood' && 'What mood are you in?'}
                {step === 'results' && `Top picks for tonight`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {step !== 'time' && (
              <button
                onClick={handleBack}
                className="text-xs text-white/30 hover:text-white/60 transition-colors px-2 py-1"
              >
                ← Back
              </button>
            )}
            <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors p-1">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1.5 px-5 py-3 flex-shrink-0">
          {(['time', 'mood', 'results'] as const).map((s, i) => (
            <div
              key={s}
              className={clsx(
                'h-1 rounded-full transition-all',
                step === s ? 'bg-purple-400 flex-1' : 'bg-white/10',
                i < ['time', 'mood', 'results'].indexOf(step) ? 'bg-purple-400/40 flex-1' : 'w-4',
              )}
            />
          ))}
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {/* ── Step 1: Time ── */}
          {step === 'time' && (
            <div className="space-y-3 pt-2">
              {TIME_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleTimeSelect(opt.value)}
                  className={clsx(
                    'w-full flex items-center justify-between p-4 rounded-xl border transition-all',
                    'bg-white/[0.02] border-white/8 hover:bg-white/[0.05] hover:border-purple-500/30',
                    'active:scale-[0.98]',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Clock size={18} className="text-white/40" />
                    <div className="text-left">
                      <div className="text-sm font-semibold text-white/90">{opt.label}</div>
                      <div className="text-xs text-white/40">{opt.sub}</div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-white/30" />
                </button>
              ))}
            </div>
          )}

          {/* ── Step 2: Mood ── */}
          {step === 'mood' && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              {MOOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleMoodSelect(opt.value)}
                  className={clsx(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                    'bg-white/[0.02] border-white/8 hover:bg-purple-500/10 hover:border-purple-500/30',
                    'active:scale-[0.98]',
                    opt.value === 'anything' && 'col-span-2',
                  )}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-white/90">{opt.label}</div>
                    <div className="text-[11px] text-white/40">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ── Step 3: Results ── */}
          {step === 'results' && (
            <div className="space-y-3 pt-2">
              {picks.length === 0 ? (
                <div className="text-center py-8">
                  <Gamepad2 size={32} className="mx-auto mb-3 text-white/20" />
                  <p className="text-white/40 text-sm">No games match right now</p>
                  <p className="text-white/20 text-xs mt-1">Try adding some games to your library</p>
                </div>
              ) : (
                <>
                  {/* Selected context pill */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] text-white/30">
                      {TIME_OPTIONS.find(t => t.value === selectedTime)?.label}
                    </span>
                    <span className="text-white/20">·</span>
                    <span className="text-[11px] text-white/30">
                      {MOOD_OPTIONS.find(m => m.value === selectedMood)?.label} mood
                    </span>
                  </div>

                  {picks.map((pick, idx) => (
                    <PickCard
                      key={pick.game.id}
                      pick={pick}
                      idx={idx}
                      onPlay={() => onPlay(pick.game)}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PickCard({
  pick,
  idx,
  onPlay,
}: {
  pick: TonightsPickResult;
  idx: number;
  onPlay: () => void;
}) {
  const [expanded, setExpanded] = useState(idx === 0);

  const isTop = idx === 0;

  return (
    <div
      className={clsx(
        'rounded-xl border overflow-hidden transition-all',
        isTop
          ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent'
          : 'border-white/8 bg-white/[0.02]',
      )}
    >
      {/* Card header */}
      <button
        className="w-full flex items-center gap-3 p-3 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Thumbnail */}
        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
          {pick.game.thumbnail ? (
            <img
              src={pick.game.thumbnail}
              alt={pick.game.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Gamepad2 size={20} className="text-white/20" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white/95 truncate">{pick.game.name}</span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0"
              style={{
                color: pick.matchColor,
                borderColor: `${pick.matchColor}50`,
                backgroundColor: `${pick.matchColor}18`,
              }}
            >
              {pick.matchLabel}
            </span>
          </div>
          {/* Top reason preview */}
          {!expanded && pick.reasons.length > 0 && (
            <p className="text-[11px] text-white/40 mt-0.5 truncate">{pick.reasons[0]}</p>
          )}
        </div>

        {/* Play button — top pick only shows it prominently */}
        {isTop && (
          <button
            onClick={(e) => { e.stopPropagation(); onPlay(); }}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-lg transition-all active:scale-95"
          >
            <Play size={12} className="fill-current" />
            Play
          </button>
        )}
      </button>

      {/* Expanded reasons + play button for non-top */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <div className="space-y-1.5">
            {pick.reasons.map((reason, ri) => (
              <div key={ri} className="flex items-start gap-2">
                <span className="text-xs text-white/60 leading-relaxed">{reason}</span>
              </div>
            ))}
          </div>

          {!isTop && (
            <button
              onClick={onPlay}
              className="mt-2 w-full flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs font-medium rounded-lg transition-all active:scale-95"
            >
              <Play size={12} className="fill-current" />
              Play This
            </button>
          )}
        </div>
      )}
    </div>
  );
}
