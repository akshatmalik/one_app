'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  X, Play, RotateCcw, Wind, Zap, BookOpen, Gamepad2,
  Target, Shuffle, ChevronRight,
} from 'lucide-react';
import { Game } from '../lib/types';
import {
  getSessionPlannerRecs,
  SessionPlannerPrefs,
  SessionPlannerRec,
  SessionVibeType,
  SessionContinuationMode,
} from '../lib/calculations';
import clsx from 'clsx';

interface SessionPlannerProps {
  games: Game[];
  onClose: () => void;
  onSelectGame: (game: Game) => void;
}

type PlannerStep = 'prefs' | 'results';

const TIME_OPTIONS: { value: number; label: string; sublabel: string }[] = [
  { value: 0.5, label: '30 min',  sublabel: 'Quick hit'    },
  { value: 1,   label: '1 hour',  sublabel: 'Standard'     },
  { value: 2,   label: '2 hours', sublabel: 'Good session' },
  { value: 3,   label: '3 hours', sublabel: 'Long haul'    },
  { value: 4,   label: '4h+',     sublabel: 'All night'    },
];

interface VibeOption {
  value: SessionVibeType;
  label: string;
  desc: string;
  icon: React.ReactNode;
  selectedClass: string;
}

const VIBE_OPTIONS: VibeOption[] = [
  {
    value: 'chill',
    label: 'Chill',
    desc: 'Relaxed, low stress',
    icon: <Wind size={15} />,
    selectedClass: 'bg-blue-500/15 border-blue-500/40 text-blue-300',
  },
  {
    value: 'action',
    label: 'Action',
    desc: 'Fast-paced, intense',
    icon: <Zap size={15} />,
    selectedClass: 'bg-orange-500/15 border-orange-500/40 text-orange-300',
  },
  {
    value: 'story',
    label: 'Story',
    desc: 'Deep narrative',
    icon: <BookOpen size={15} />,
    selectedClass: 'bg-purple-500/15 border-purple-500/40 text-purple-300',
  },
  {
    value: 'quick',
    label: 'Quick',
    desc: 'Pick up & play',
    icon: <Gamepad2 size={15} />,
    selectedClass: 'bg-green-500/15 border-green-500/40 text-green-300',
  },
  {
    value: 'challenge',
    label: 'Challenge',
    desc: 'Push your limits',
    icon: <Target size={15} />,
    selectedClass: 'bg-red-500/15 border-red-500/40 text-red-300',
  },
  {
    value: 'any',
    label: 'Surprise',
    desc: "I don't mind",
    icon: <Shuffle size={15} />,
    selectedClass: 'bg-white/10 border-white/30 text-white/80',
  },
];

const CONT_OPTIONS: { value: SessionContinuationMode; label: string; desc: string }[] = [
  { value: 'continue', label: 'Continue a game',    desc: 'Pick up where you left off'           },
  { value: 'fresh',    label: 'Start something new', desc: 'Unplayed or revisit a classic'        },
  { value: 'either',   label: 'Either works',        desc: 'Best match from the whole library'    },
];

// Circular match-score gauge
function ScoreRing({ score }: { score: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color =
    score >= 80 ? '#34d399' :
    score >= 60 ? '#60a5fa' :
    score >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <svg width="48" height="48" className="flex-shrink-0">
      <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3.5" />
      <circle
        cx="24" cy="24" r={r}
        fill="none"
        stroke={color}
        strokeWidth="3.5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
      />
      <text
        x="24" y="24"
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize="12"
        fontWeight="700"
      >
        {score}
      </text>
    </svg>
  );
}

function RecCard({
  rec,
  onSelect,
  isTop,
}: {
  rec: SessionPlannerRec;
  onSelect: () => void;
  isTop: boolean;
}) {
  const { game, score, reasons, heroStat, timeFit } = rec;

  const timeBadge =
    timeFit === 'perfect' ? { text: 'Perfect fit',    cls: 'text-emerald-400 bg-emerald-500/10' } :
    timeFit === 'short'   ? { text: 'Quick sessions', cls: 'text-blue-400 bg-blue-500/10'       } :
    timeFit === 'long'    ? { text: 'Needs more time',cls: 'text-amber-400 bg-amber-500/10'     } :
    null;

  return (
    <div>
      {isTop && (
        <div className="text-[9px] text-emerald-400/70 font-bold tracking-widest uppercase px-1 mb-1">
          Top Pick
        </div>
      )}
      <button
        onClick={onSelect}
        className="w-full flex items-center gap-3 p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/20 rounded-xl transition-all text-left group"
      >
        {/* Thumbnail */}
        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
          {game.thumbnail ? (
            <img src={game.thumbnail} alt={game.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20">
              <Gamepad2 size={20} />
            </div>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-[13px] font-semibold text-white leading-tight truncate max-w-[180px]">
              {game.name}
            </span>
            {timeBadge && (
              <span className={clsx('text-[9px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0', timeBadge.cls)}>
                {timeBadge.text}
              </span>
            )}
          </div>
          {reasons.length > 0 && (
            <p className="text-[10px] text-white/35 leading-snug mb-0.5">
              {reasons.join(' · ')}
            </p>
          )}
          {heroStat && (
            <span className="text-[10px] text-purple-400/60">{heroStat}</span>
          )}
        </div>

        {/* Score ring + arrow */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <ScoreRing score={score} />
          <ChevronRight
            size={13}
            className="text-white/15 group-hover:text-white/45 transition-colors"
          />
        </div>
      </button>
    </div>
  );
}

export function SessionPlanner({ games, onClose, onSelectGame }: SessionPlannerProps) {
  const [step, setStep] = useState<PlannerStep>('prefs');
  const [timeAvailable, setTimeAvailable] = useState<number>(2);
  const [vibe, setVibe] = useState<SessionVibeType>('any');
  const [continuationMode, setContinuationMode] = useState<SessionContinuationMode>('either');

  const prefs: SessionPlannerPrefs = useMemo(
    () => ({ timeAvailableHours: timeAvailable, vibe, continuationMode }),
    [timeAvailable, vibe, continuationMode],
  );

  const recs = useMemo(
    () => (step === 'results' ? getSessionPlannerRecs(games, prefs, 5) : []),
    [games, prefs, step],
  );

  const eligibleCount = useMemo(() =>
    games.filter(g => {
      if (g.status === 'Wishlist' || g.status === 'Abandoned') return false;
      if (continuationMode === 'continue') return g.status === 'In Progress';
      if (continuationMode === 'fresh') return g.status === 'Not Started' || g.status === 'Completed';
      return true;
    }).length,
    [games, continuationMode],
  );

  const handleFind = useCallback(() => {
    if (eligibleCount > 0) setStep('results');
  }, [eligibleCount]);

  const handleSelect = useCallback((game: Game) => {
    onSelectGame(game);
    onClose();
  }, [onSelectGame, onClose]);

  const selectedVibeOption = VIBE_OPTIONS.find(v => v.value === vibe);

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0f0f1a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.05]">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Play size={12} className="text-purple-400 ml-0.5" />
            </div>
            <h2 className="font-semibold text-white text-[13px]">Play Now</h2>
            {step === 'results' && recs.length > 0 && (
              <span className="text-[11px] text-white/25">
                — {recs.length} match{recs.length !== 1 ? 'es' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {step === 'results' && (
              <button
                onClick={() => setStep('prefs')}
                className="p-1.5 text-white/30 hover:text-white/60 transition-colors rounded-lg hover:bg-white/5"
                title="Back to preferences"
              >
                <RotateCcw size={12} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-white/30 hover:text-white/60 transition-colors rounded-lg hover:bg-white/5"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── Step 1: Preferences ── */}
        {step === 'prefs' && (
          <div className="px-5 py-4 space-y-4">

            {/* Time available */}
            <div>
              <p className="text-[10px] text-white/35 uppercase tracking-widest font-semibold mb-2">
                How long do you have?
              </p>
              <div className="flex gap-1.5">
                {TIME_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setTimeAvailable(opt.value)}
                    className={clsx(
                      'flex-1 py-2.5 rounded-lg transition-all border text-center',
                      timeAvailable === opt.value
                        ? 'bg-purple-500/20 border-purple-500/40 text-purple-200'
                        : 'bg-white/[0.02] border-white/[0.08] text-white/35 hover:text-white/55',
                    )}
                  >
                    <div className="text-[11px] font-semibold">{opt.label}</div>
                    <div className="text-[9px] opacity-50 mt-0.5">{opt.sublabel}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Vibe */}
            <div>
              <p className="text-[10px] text-white/35 uppercase tracking-widest font-semibold mb-2">
                What&apos;s your vibe?
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {VIBE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setVibe(opt.value)}
                    className={clsx(
                      'py-2.5 px-2 rounded-xl text-center transition-all border',
                      vibe === opt.value
                        ? opt.selectedClass
                        : 'bg-white/[0.02] border-white/[0.07] text-white/35 hover:text-white/55 hover:bg-white/[0.04]',
                    )}
                  >
                    <div className="flex justify-center mb-1 opacity-80">{opt.icon}</div>
                    <div className="text-[11px] font-semibold leading-none">{opt.label}</div>
                    <div className="text-[9px] mt-1 opacity-45 leading-tight">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Continuation */}
            <div>
              <p className="text-[10px] text-white/35 uppercase tracking-widest font-semibold mb-2">
                Continue or start fresh?
              </p>
              <div className="space-y-1.5">
                {CONT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setContinuationMode(opt.value)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all border text-left',
                      continuationMode === opt.value
                        ? 'bg-white/[0.07] border-white/20 text-white'
                        : 'bg-white/[0.02] border-white/[0.07] text-white/40 hover:text-white/60',
                    )}
                  >
                    <div
                      className={clsx(
                        'w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition-all',
                        continuationMode === opt.value
                          ? 'border-purple-400 bg-purple-400'
                          : 'border-white/20',
                      )}
                    />
                    <div>
                      <div className="text-[12px] font-medium">{opt.label}</div>
                      <div className="text-[10px] text-white/30">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handleFind}
              disabled={eligibleCount === 0}
              className={clsx(
                'w-full py-3 rounded-xl font-semibold text-sm transition-all',
                eligibleCount > 0
                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30'
                  : 'bg-white/5 text-white/20 cursor-not-allowed',
              )}
            >
              {eligibleCount === 0
                ? 'No games match this filter'
                : `Find My Game — ${eligibleCount} in pool`}
            </button>
          </div>
        )}

        {/* ── Step 2: Results ── */}
        {step === 'results' && (
          <div className="px-5 py-4">
            {recs.length === 0 ? (
              <div className="text-center py-10">
                <Gamepad2 size={26} className="mx-auto mb-3 text-white/15" />
                <p className="text-sm text-white/35">No matches found</p>
                <button
                  onClick={() => setStep('prefs')}
                  className="mt-3 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Adjust preferences →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Context line */}
                <p className="text-[10px] text-white/25 mb-3">
                  For your{' '}
                  <span className="text-white/45">
                    {timeAvailable < 1 ? '30-min' : `${timeAvailable}h`}
                  </span>{' '}
                  window
                  {vibe !== 'any' && selectedVibeOption && (
                    <> · <span className="text-white/45">{selectedVibeOption.label}</span> vibe</>
                  )}
                  {' '}· ranked by match score
                </p>

                {recs.map((rec, i) => (
                  <RecCard
                    key={rec.game.id}
                    rec={rec}
                    onSelect={() => handleSelect(rec.game)}
                    isTop={i === 0}
                  />
                ))}

                <button
                  onClick={() => setStep('prefs')}
                  className="w-full mt-1 py-2 text-[11px] text-white/20 hover:text-white/45 transition-colors"
                >
                  ← Adjust preferences
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
