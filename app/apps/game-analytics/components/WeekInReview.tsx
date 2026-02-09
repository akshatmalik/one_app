'use client';

import { useState, useEffect } from 'react';
import { Calendar, Sparkles, ChevronDown } from 'lucide-react';
import { WeekInReviewData } from '../lib/calculations';
import { Game } from '../lib/types';
import { WeekStoryMode } from './WeekStoryMode';
import { generateMultipleBlurbs, AIBlurbType, AIBlurbResult } from '../lib/ai-service';
import { generateWeekTitles } from '../lib/ai-game-service';
import clsx from 'clsx';

interface WeekInReviewProps {
  data: WeekInReviewData;
  allGames: Game[];
  weekOffset: number;
  maxWeeksBack: number;
  onWeekChange: (offset: number) => void;
}

export function WeekInReview({ data, allGames, weekOffset, maxWeeksBack, onWeekChange }: WeekInReviewProps) {
  const [showStory, setShowStory] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [aiBlurbs, setAiBlurbs] = useState<Partial<Record<AIBlurbType, AIBlurbResult>>>({});
  const [isLoadingAI, setIsLoadingAI] = useState(true);
  const [weekTitle, setWeekTitle] = useState<string>('');

  // Prefetch AI blurbs as soon as data is available
  useEffect(() => {
    // Only prefetch if there's gaming activity
    if (data.totalHours === 0) {
      setIsLoadingAI(false);
      return;
    }

    const prefetchBlurbs = async () => {
      try {
        setIsLoadingAI(true);

        // 2 AI blurb slots: opening + closing bookends
        const blurbTypes: AIBlurbType[] = [
          'opening-personality',
          'closing-reflection',
        ];

        const generatedBlurbs = await generateMultipleBlurbs(data, blurbTypes);
        setAiBlurbs(generatedBlurbs);
      } catch (error) {
        console.error('Failed to prefetch AI blurbs:', error);
      } finally {
        setIsLoadingAI(false);
      }
    };

    prefetchBlurbs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset, data.weekLabel]); // Re-fetch when week changes or when actual week data changes

  // Generate AI week title
  useEffect(() => {
    if (data.totalHours === 0) {
      setWeekTitle('');
      return;
    }

    const loadWeekTitle = async () => {
      try {
        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() - 7 - (weekOffset * 7));
        const end = new Date(now);
        end.setDate(end.getDate() - (weekOffset * 7));

        const titles = await generateWeekTitles(allGames, [{
          key: `week-recap-${weekOffset}`,
          label: data.weekLabel,
          startDate: start.toISOString().substring(0, 10),
          endDate: end.toISOString().substring(0, 10),
        }]);
        setWeekTitle(titles[`week-recap-${weekOffset}`] || '');
      } catch {
        // ignore
      }
    };

    loadWeekTitle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset, data.weekLabel]);

  // Generate week options - including current week
  const weekOptions = [];

  // Add "This Week" option
  weekOptions.push({ offset: -1, label: 'This Week' });

  // Add past weeks
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
      {showStory && (
        <WeekStoryMode
          data={data}
          allGames={allGames}
          onClose={() => setShowStory(false)}
          prefetchedBlurbs={aiBlurbs}
          isLoadingPrefetch={isLoadingAI}
          weekTitle={weekTitle}
        />
      )}

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
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm text-white/50">
                  {data.daysActive} active day{data.daysActive !== 1 ? 's' : ''}
                  {data.topGame && ` • Top: ${data.topGame.game.name}`}
                </p>
                {weekTitle && (
                  <span className="inline-flex items-center gap-1 text-xs text-cyan-400/70 italic">
                    <Sparkles size={10} className="shrink-0" />
                    {weekTitle}
                  </span>
                )}
              </div>
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
