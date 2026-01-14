import { DayData, ViewMode, Tag } from '../lib/types';
import { MOOD_COLORS, BLOCK_SIZE } from '../lib/constants';
import { getTodayDate } from '../lib/utils';
import clsx from 'clsx';

interface DayBlockProps {
  dayData: DayData;
  viewMode: ViewMode;
  filteredTags: Tag[];
  onClick: () => void;
  className?: string;
}

export function DayBlock({
  dayData,
  viewMode,
  filteredTags,
  onClick,
  className,
}: DayBlockProps) {
  const isToday = dayData.date === getTodayDate();
  const isFutureDate = dayData.date > getTodayDate();

  // Mood view - show color based on mood
  if (viewMode === 'mood') {
    const backgroundColor = dayData.mood
      ? MOOD_COLORS[dayData.mood]
      : isFutureDate
      ? '#1a1a1f' // dark gray for future dates
      : '#0a0a0f'; // very dark for no mood

    return (
      <button
        onClick={onClick}
        className={clsx(
          'transition-all hover:scale-110 hover:shadow-md rounded-sm',
          'border',
          isToday && 'ring-2 ring-purple-500 ring-offset-1 ring-offset-[#0a0a0f]',
          isFutureDate && 'cursor-default opacity-50',
          !dayData.mood && !isFutureDate && 'border-white/10',
          dayData.mood && 'border-transparent',
          className
        )}
        style={{
          width: `${BLOCK_SIZE}px`,
          height: `${BLOCK_SIZE}px`,
          backgroundColor,
        }}
        title={`${dayData.date}${dayData.mood ? ` - Mood: ${dayData.mood}` : ''}`}
        disabled={isFutureDate}
      />
    );
  }

  // Tags view - show emojis
  const displayTags = filteredTags.length > 0 ? filteredTags : dayData.tags;
  const hasVisibleTags = displayTags.length > 0;

  return (
    <button
      onClick={onClick}
      className={clsx(
        'transition-all hover:scale-110 hover:shadow-md rounded-sm',
        'border border-white/10 bg-white/[0.02]',
        'flex items-center justify-center',
        isToday && 'ring-2 ring-purple-500 ring-offset-1 ring-offset-[#0a0a0f]',
        isFutureDate && 'cursor-default opacity-50',
        className
      )}
      style={{
        width: `${BLOCK_SIZE}px`,
        height: `${BLOCK_SIZE}px`,
      }}
      title={`${dayData.date}${displayTags.length > 0 ? ` - ${displayTags.map(t => t.name).join(', ')}` : ''}`}
      disabled={isFutureDate}
    >
      {hasVisibleTags && (
        <div className="flex items-center justify-center gap-0.5 text-xs overflow-hidden">
          {displayTags.slice(0, 2).map((tag) => (
            <span key={tag.id}>{tag.emoji}</span>
          ))}
          {displayTags.length > 2 && <span className="text-[8px] text-white/40">+{displayTags.length - 2}</span>}
        </div>
      )}
    </button>
  );
}
