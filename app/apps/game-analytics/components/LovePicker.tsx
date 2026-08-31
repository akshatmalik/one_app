'use client';

import { Heart, X } from 'lucide-react';
import clsx from 'clsx';
import { LoveLevel } from '../lib/types';
import type { Game } from '../lib/types';
import { getEffectiveLoveLevel, getLoveMeta, LOVE_LEVELS } from '../lib/love';

interface LovePickerProps {
  value?: LoveLevel;
  onChange: (value: LoveLevel | undefined) => void;
  compact?: boolean;
}

export function LovePicker({ value, onChange, compact = false }: LovePickerProps) {
  const selected = LOVE_LEVELS.find(option => option.level === value);
  return (
    <div className={clsx('rounded-2xl border border-rose-400/10 bg-rose-500/[0.035]', compact ? 'p-3' : 'p-4')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-200/85"><Heart size={13} className={value && value >= 3 ? 'fill-rose-400 text-rose-400' : 'text-rose-300'} /> Love</div>
          {!compact && <p className="mt-1 text-[11px] leading-relaxed text-white/35">How personally attached are you? This stays separate from the quality rating.</p>}
        </div>
        {value && <button type="button" onClick={() => onChange(undefined)} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/25 hover:bg-white/5 hover:text-white/50" aria-label="Clear Love"><X size={13} /></button>}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="How much did you love this game?">
        {LOVE_LEVELS.map(option => {
          const active = value === option.level;
          return (
            <button
              key={option.level}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={option.label}
              onClick={() => onChange(option.level)}
              className={clsx(
                'flex min-h-12 flex-col items-center justify-center rounded-xl border transition-all',
                active ? 'border-rose-300/35 bg-rose-500/18 text-rose-100' : 'border-white/[0.06] bg-white/[0.025] text-white/30',
              )}
            >
              <Heart size={compact ? 14 : 16} className={clsx(active && 'fill-rose-400 text-rose-400')} />
              <span className="mt-1 text-[8px] font-bold uppercase tracking-wide">{option.shortLabel}</span>
            </button>
          );
        })}
      </div>
      {selected && !compact && <p className="mt-2 text-[10px] text-rose-100/45"><span className="font-semibold text-rose-200/70">{selected.label}.</span> {selected.description}</p>}
    </div>
  );
}

export function LoveBadge({ game, className }: { game: Pick<Game, 'loveLevel' | 'isSpecial'>; className?: string }) {
  const level = getEffectiveLoveLevel(game);
  if (!level || level < 3) return null;
  const meta = getLoveMeta(level);
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-md border border-rose-300/15 bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold text-rose-200 backdrop-blur-sm', className)}>
      <Heart size={9} className="fill-rose-400 text-rose-400" /> {meta?.shortLabel}
    </span>
  );
}
