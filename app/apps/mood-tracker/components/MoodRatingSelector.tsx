import { MOOD_SCALE, MOOD_COLORS, MOOD_LABELS } from '../lib/constants';
import clsx from 'clsx';

interface MoodRatingSelectorProps {
  value: number | null;
  onChange: (mood: number | null) => void;
  className?: string;
}

export function MoodRatingSelector({ value, onChange, className }: MoodRatingSelectorProps) {
  const moodValues = Array.from(
    { length: MOOD_SCALE.MAX - MOOD_SCALE.MIN + 1 },
    (_, i) => i + MOOD_SCALE.MIN
  );

  return (
    <div className={clsx('space-y-2', className)}>
      <label className="block text-sm font-medium text-gray-700">
        How was your day?
      </label>
      <div className="flex gap-2">
        {moodValues.map((mood) => (
          <button
            key={mood}
            onClick={() => onChange(value === mood ? null : mood)}
            className={clsx(
              'flex-1 py-3 px-2 rounded-lg font-medium text-sm transition-all',
              'border-2 hover:scale-105',
              value === mood
                ? 'border-gray-900 shadow-md scale-105'
                : 'border-gray-200 hover:border-gray-300'
            )}
            style={{
              backgroundColor: value === mood ? MOOD_COLORS[mood] : '#ffffff',
              color: value === mood ? '#ffffff' : '#000000',
            }}
            title={MOOD_LABELS[mood]}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg font-bold">{mood}</span>
              <span className="text-xs">{MOOD_LABELS[mood]}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
