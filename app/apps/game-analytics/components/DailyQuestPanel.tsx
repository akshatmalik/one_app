'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Flame, Sparkles } from 'lucide-react';
import { Game } from '../lib/types';
import { useDailyQuests } from '../hooks/useDailyQuests';
import { TrophyToast } from './TrophyToast';

interface DailyQuestPanelProps {
  games: Game[];
  userId: string;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function DailyQuestPanel({ games, userId }: DailyQuestPanelProps) {
  const { questSet, streak, last7Days, showPerfectDayToast, dismissPerfectDayToast } = useDailyQuests(games, userId);
  const [expanded, setExpanded] = useState(false);

  if (questSet.quests.length === 0) return null;

  const { quests, completedCount, allComplete } = questSet;

  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 overflow-hidden">
      {showPerfectDayToast && (
        <TrophyToast
          name={`Perfect Day! ${streak > 1 ? `${streak}-Day Streak` : 'Quests Complete'}`}
          icon="🎯"
          tier="milestone"
          isUpgrade={false}
          onDismiss={dismissPerfectDayToast}
        />
      )}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span className="text-xl shrink-0">{allComplete ? '🎉' : '🗓️'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Daily Quests</span>
            {streak > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-orange-300">
                <Flame size={10} />
                {streak}
              </span>
            )}
          </div>
          <p className="text-sm text-white/70">
            {allComplete ? 'Perfect day — all quests complete.' : `${completedCount}/${quests.length} quests complete today`}
          </p>
        </div>
        <ChevronDown
          size={16}
          className={`text-white/40 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-2">
              {quests.map(quest => (
                <div
                  key={quest.type}
                  className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 ${
                    quest.completed ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-white/10 bg-white/5'
                  }`}
                >
                  <span className="text-base shrink-0 mt-0.5">{quest.completed ? '✅' : quest.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${quest.completed ? 'text-emerald-300 line-through' : 'text-white/80'}`}>
                      {quest.title}
                    </p>
                    <p className="text-xs text-white/40">{quest.description}</p>
                    <p className="text-[10px] text-white/25 mt-0.5">{quest.progressLabel}</p>
                  </div>
                </div>
              ))}
              {allComplete && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-300 pt-1">
                  <Sparkles size={12} />
                  Perfect day — {streak}-day streak!
                </div>
              )}

              <div className="pt-2 border-t border-white/10">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1.5">Last 7 days</p>
                <div className="flex items-center gap-1.5">
                  {last7Days.map(day => {
                    const isPerfect = day.total > 0 && day.completed === day.total;
                    const isPartial = day.completed > 0 && day.completed < day.total;
                    const weekday = WEEKDAY_LABELS[new Date(`${day.date}T00:00:00`).getDay()];
                    return (
                      <div key={day.date} className="flex flex-col items-center gap-1" title={`${day.date}: ${day.completed}/${day.total} quests`}>
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center text-[9px] ${
                            isPerfect
                              ? 'bg-emerald-500/80 border-emerald-400 text-white'
                              : isPartial
                              ? 'bg-amber-500/40 border-amber-400/60 text-amber-200'
                              : 'bg-white/5 border-white/10 text-white/20'
                          } ${day.isToday ? 'ring-1 ring-white/40' : ''}`}
                        >
                          {isPerfect ? '✓' : day.total > 0 ? day.completed : ''}
                        </div>
                        <span className={`text-[8px] ${day.isToday ? 'text-white/60 font-semibold' : 'text-white/25'}`}>{weekday}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
