import { ViewMode } from '../lib/types';
import clsx from 'clsx';

interface ViewModeToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

export function ViewModeToggle({ mode, onChange, className }: ViewModeToggleProps) {
  return (
    <div className={clsx('inline-flex rounded-lg border border-white/10 bg-white/[0.02] p-1', className)}>
      <button
        onClick={() => onChange('mood')}
        className={clsx(
          'px-4 py-2 rounded-md text-sm font-medium transition-colors',
          mode === 'mood'
            ? 'bg-purple-600 text-white'
            : 'text-white/60 hover:text-white/80'
        )}
      >
        Mood View
      </button>
      <button
        onClick={() => onChange('tags')}
        className={clsx(
          'px-4 py-2 rounded-md text-sm font-medium transition-colors',
          mode === 'tags'
            ? 'bg-purple-600 text-white'
            : 'text-white/60 hover:text-white/80'
        )}
      >
        Tag View
      </button>
    </div>
  );
}
