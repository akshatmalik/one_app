'use client';

import { useState } from 'react';
import { Calendar, Sparkles, ChevronDown } from 'lucide-react';
import { WeekInReviewData } from '../lib/calculations';
import { WeekStoryMode } from './WeekStoryMode';
import clsx from 'clsx';

interface WeekInReviewProps {
  data: WeekInReviewData;
  weekOffset: number;
  maxWeeksBack: number;
  onWeekChange: (offset: number) => void;
}

export function WeekInReview({ data, weekOffset, maxWeeksBack, onWeekChange }: WeekInReviewProps) {
  const [showStory, setShowStory] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Generate week options
  const weekOptions = [];
  for (let i = 0; i < maxWeeksBack; i++) {
    let label = '';
    if (i === 0) label = 'Last Week';
    else if (i === 1) label = '2 Weeks Ago';
    else label = `${i + 1} Weeks Ago`;
    weekOptions.push({ offset: i, label });
  }

  if (data.totalHours === 0) {
    return (
      <div className="p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl border border-purple-500/20 text-center">
        <Calendar size={40} className="mx-auto mb-3 text-white/20" />
        <h3 className="text-lg font-bold text-white mb-2">No Gaming Activity</h3>
        <p className="text-white/50 text-sm">{data.weekLabel}</p>

        {/* Week Dropdown */}
        <div className="relative inline-block mt-4">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm text-white/70 transition-all"
          >
            <span>{weekOptions.find(w => w.offset === weekOffset)?.label || 'Select Week'}</span>
            <ChevronDown size={16} className={clsx('transition-transform', showDropdown && 'rotate-180')} />
          </button>

          {showDropdown && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-[#2a2a3a] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
              {weekOptions.map((week) => (
                <button
                  key={week.offset}
                  onClick={() => {
                    onWeekChange(week.offset);
                    setShowDropdown(false);
                  }}
                  className={clsx(
                    'w-full px-4 py-2.5 text-left text-sm transition-colors',
                    week.offset === weekOffset
                      ? 'bg-purple-600 text-white'
                      : 'text-white/70 hover:bg-white/5'
                  )}
                >
                  {week.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Story Mode Modal */}
      {showStory && <WeekStoryMode data={data} onClose={() => setShowStory(false)} />}

      <div className="relative overflow-hidden p-6 bg-gradient-to-br from-purple-600/20 via-blue-600/20 to-cyan-600/20 rounded-2xl border border-purple-500/30">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a24] via-transparent to-transparent opacity-50" />

        <div className="relative z-10">
          <div className="flex items-center justify-between gap-4 mb-4">
            {/* Week Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-xl text-white transition-all"
              >
                <Calendar size={18} className="text-purple-300" />
                <span className="font-medium">{data.weekLabel}</span>
                <ChevronDown size={16} className={clsx('text-white/50 transition-transform', showDropdown && 'rotate-180')} />
              </button>

              {showDropdown && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-[#2a2a3a] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden max-h-64 overflow-y-auto">
                  {weekOptions.map((week) => (
                    <button
                      key={week.offset}
                      onClick={() => {
                        onWeekChange(week.offset);
                        setShowDropdown(false);
                      }}
                      className={clsx(
                        'w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center justify-between',
                        week.offset === weekOffset
                          ? 'bg-purple-600 text-white'
                          : 'text-white/70 hover:bg-white/5'
                      )}
                    >
                      <span>{week.label}</span>
                      {week.offset === weekOffset && <span className="text-xs">Selected</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <div className="text-center">
                <div className="text-xl font-bold text-blue-400">{data.totalHours.toFixed(1)}h</div>
                <div className="text-xs text-white/40">played</div>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="text-center">
                <div className="text-xl font-bold text-purple-400">{data.uniqueGames}</div>
                <div className="text-xs text-white/40">games</div>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="text-center">
                <div className="text-xl font-bold text-cyan-400">{data.totalSessions}</div>
                <div className="text-xs text-white/40">sessions</div>
              </div>
            </div>
          </div>

          {/* Title and CTA */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                {data.weekVibe}
              </h2>
              <p className="text-sm text-white/50">
                {data.daysActive} active day{data.daysActive !== 1 ? 's' : ''}
                {data.topGame && ` • Top: ${data.topGame.game.name}`}
              </p>
            </div>

            {/* View Week Recap Button */}
            <button
              onClick={() => setShowStory(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-purple-500/30 shrink-0"
            >
              <Sparkles size={18} />
              <span>View Recap</span>
            </button>
          </div>

          {/* Mobile Stats */}
          <div className="flex sm:hidden items-center justify-center gap-6 mt-4 pt-4 border-t border-white/10">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-400">{data.totalHours.toFixed(1)}h</div>
              <div className="text-xs text-white/40">played</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-400">{data.uniqueGames}</div>
              <div className="text-xs text-white/40">games</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-cyan-400">{data.totalSessions}</div>
              <div className="text-xs text-white/40">sessions</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
