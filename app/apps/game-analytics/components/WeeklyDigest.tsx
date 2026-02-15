'use client';

import { useState, useMemo } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { Game } from '../lib/types';
import { getWeekStatsForOffset, getAvailableWeeksCount, WeekInReviewData } from '../lib/calculations';
import clsx from 'clsx';

interface WeeklyDigestProps {
  games: Game[];
  weekOffset?: number; // 0 = last completed week, -1 = current week
}

/**
 * Generates a narrative weekly digest paragraph from week stats data.
 * All text is template-driven from data — no AI involved.
 */
function generateDigestNarrative(data: WeekInReviewData): string[] {
  const lines: string[] = [];

  if (data.totalHours === 0) {
    lines.push('A quiet week on the gaming front — no sessions logged.');
    lines.push('Sometimes a break is exactly what you need. On to next week.');
    return lines;
  }

  // Opening line based on activity level
  if (data.totalHours >= 20) {
    lines.push('Big week!');
  } else if (data.totalHours >= 10) {
    lines.push('Solid gaming week.');
  } else if (data.totalHours >= 5) {
    lines.push('Steady gaming week.');
  } else if (data.totalHours >= 2) {
    lines.push('A quiet week.');
  } else {
    lines.push('You took it easy this week.');
  }

  // Games played + hours
  if (data.uniqueGames === 1 && data.topGame) {
    lines.push(
      `You focused entirely on ${data.topGame.game.name}, putting in ${data.totalHours.toFixed(1)} hours across ${data.totalSessions} session${data.totalSessions !== 1 ? 's' : ''}.`
    );
  } else {
    lines.push(
      `You played ${data.uniqueGames} game${data.uniqueGames !== 1 ? 's' : ''} totaling ${data.totalHours.toFixed(1)} hours across ${data.totalSessions} session${data.totalSessions !== 1 ? 's' : ''}.`
    );
  }

  // Top game (if multiple games played)
  if (data.topGame && data.uniqueGames > 1) {
    lines.push(
      `Most time went to ${data.topGame.game.name} (${data.topGame.hours.toFixed(1)}h across ${data.topGame.sessions} session${data.topGame.sessions !== 1 ? 's' : ''}).`
    );
  }

  // Completions
  if (data.completedGames.length > 0) {
    const completedNames = data.completedGames.map(g => g.name);
    if (completedNames.length === 1) {
      lines.push(`You completed ${completedNames[0]} — congrats!`);
    } else {
      lines.push(`You completed ${completedNames.join(' and ')} — congrats!`);
    }
  }

  // New games started
  if (data.newGamesStarted.length > 0) {
    const startedNames = data.newGamesStarted.map(g => g.name);
    if (startedNames.length === 1) {
      lines.push(`You kicked off ${startedNames[0]} for the first time.`);
    } else {
      lines.push(`You kicked off ${startedNames.join(' and ')} for the first time.`);
    }
  }

  // Longest session insight
  if (data.longestSession && data.totalSessions > 1) {
    lines.push(
      `Your longest session was ${data.longestSession.hours.toFixed(1)}h on ${data.longestSession.game.name} (${data.longestSession.day}).`
    );
  }

  // Average session
  if (data.avgSessionLength > 0 && data.totalSessions > 1) {
    lines.push(`Average session: ${data.avgSessionLength.toFixed(1)}h.`);
  }

  // Streak mention
  if (data.currentStreak >= 3) {
    lines.push(`Current streak: ${data.currentStreak} days!`);
  }

  // Velocity comparison vs last week
  if (data.vsLastWeek.trend !== 'same') {
    const diff = Math.abs(data.vsLastWeek.hoursDiff);
    if (diff >= 0.5) {
      const percentChange = data.totalHours - data.vsLastWeek.hoursDiff > 0
        ? Math.round((diff / (data.totalHours - data.vsLastWeek.hoursDiff)) * 100)
        : 100;
      if (data.vsLastWeek.trend === 'up') {
        lines.push(`That's ${percentChange}% more than last week.`);
      } else {
        lines.push(`That's ${percentChange}% less than last week.`);
      }
    }
  }

  // Cost insight
  if (data.bestValueGame && data.bestValueGame.costPerHour > 0 && data.bestValueGame.costPerHour < 5) {
    lines.push(
      `Best active value: ${data.bestValueGame.game.name} at $${data.bestValueGame.costPerHour.toFixed(2)}/hr.`
    );
  }

  // Milestones
  if (data.milestonesReached.length > 0) {
    const milestone = data.milestonesReached[0];
    lines.push(`Milestone: ${milestone.milestone} on ${milestone.game.name}!`);
  }

  // Closing line
  if (data.totalHours >= 15) {
    lines.push('Impressive week. Keep it up!');
  } else if (data.totalHours >= 5) {
    lines.push('On to next week.');
  } else if (data.daysActive >= 3) {
    lines.push('Consistent effort this week.');
  } else {
    lines.push('A well-deserved lighter week.');
  }

  return lines;
}

/**
 * Renders a highlighted narrative paragraph from the lines array.
 * Numbers and game names are highlighted in cyan.
 */
function NarrativeText({ lines }: { lines: string[] }) {
  const text = lines.join(' ');

  // Highlight numbers (with units like h, %, $) and key phrases
  const highlighted = text.replace(
    /(\d+\.?\d*h|\$\d+\.?\d*(?:\/hr)?|\d+\.?\d*%|\d+ days?|\d+ games?|\d+ sessions?|\d+ hours?)/g,
    '<highlight>$1</highlight>'
  );

  const parts = highlighted.split(/(<highlight>.*?<\/highlight>)/g);

  return (
    <p className="text-sm text-white/70 leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith('<highlight>') && part.endsWith('</highlight>')) {
          const content = part.replace(/<\/?highlight>/g, '');
          return (
            <span key={i} className="text-cyan-400 font-medium">
              {content}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

function DigestCard({ data, isCompact = false }: { data: WeekInReviewData; isCompact?: boolean }) {
  const narrativeLines = useMemo(() => generateDigestNarrative(data), [data]);

  return (
    <div
      className={clsx(
        'rounded-xl border',
        isCompact
          ? 'p-3 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border-cyan-500/10'
          : 'p-5 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20'
      )}
    >
      {/* Header */}
      <div className={clsx('flex items-center gap-2', isCompact ? 'mb-2' : 'mb-3')}>
        <BookOpen size={isCompact ? 14 : 16} className="text-cyan-400 shrink-0" />
        <span className={clsx('font-medium text-white/80', isCompact ? 'text-xs' : 'text-sm')}>
          {data.weekLabel}
        </span>
        {data.totalHours > 0 && (
          <span className={clsx('text-cyan-400/60 ml-auto', isCompact ? 'text-[10px]' : 'text-xs')}>
            {data.totalHours.toFixed(1)}h &middot; {data.uniqueGames} game{data.uniqueGames !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Narrative */}
      <div className={isCompact ? 'text-xs' : ''}>
        <NarrativeText lines={narrativeLines} />
      </div>
    </div>
  );
}

export function WeeklyDigest({ games, weekOffset = 0 }: WeeklyDigestProps) {
  const [showPastWeeks, setShowPastWeeks] = useState(false);

  const availableWeeks = useMemo(() => getAvailableWeeksCount(games), [games]);

  // Current week data
  const currentWeekData = useMemo(
    () => getWeekStatsForOffset(games, weekOffset),
    [games, weekOffset]
  );

  // Past week data (up to 4 past weeks after the current one)
  const pastWeeksData = useMemo(() => {
    const weeks: WeekInReviewData[] = [];
    const startOffset = weekOffset + 1;
    const maxWeeks = Math.min(4, availableWeeks - startOffset);
    for (let i = 0; i < maxWeeks; i++) {
      weeks.push(getWeekStatsForOffset(games, startOffset + i));
    }
    return weeks;
  }, [games, weekOffset, availableWeeks]);

  // Don't show if there's no gaming data at all
  if (availableWeeks === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BookOpen size={18} className="text-cyan-400" />
        <h2 className="text-base font-semibold text-white">Weekly Digest</h2>
      </div>

      {/* Current Week Digest */}
      <DigestCard data={currentWeekData} />

      {/* Past Weeks Toggle */}
      {pastWeeksData.length > 0 && (
        <div>
          <button
            onClick={() => setShowPastWeeks(!showPastWeeks)}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors"
          >
            {showPastWeeks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span>
              {showPastWeeks ? 'Hide' : 'Show'} past weeks ({pastWeeksData.length})
            </span>
          </button>

          {showPastWeeks && (
            <div className="mt-3 space-y-2">
              {pastWeeksData.map((weekData, i) => (
                <DigestCard key={weekData.weekLabel} data={weekData} isCompact />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
