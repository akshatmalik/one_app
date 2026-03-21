'use client';

import { CardInstance } from '../lib/types';
import { clsx } from 'clsx';

interface PlayingCardProps {
  card: CardInstance;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ROLE_CONFIG: Record<string, { icon: string; color: string; bgFrom: string; bgTo: string; accent: string }> = {
  healer: { icon: '✚', color: 'text-emerald-400', bgFrom: 'from-emerald-950', bgTo: 'to-emerald-900/60', accent: 'border-emerald-500' },
  fighter: { icon: '⚔', color: 'text-red-400', bgFrom: 'from-red-950', bgTo: 'to-red-900/60', accent: 'border-red-500' },
  scout: { icon: '◎', color: 'text-sky-400', bgFrom: 'from-sky-950', bgTo: 'to-sky-900/60', accent: 'border-sky-500' },
  mechanic: { icon: '⚙', color: 'text-amber-400', bgFrom: 'from-amber-950', bgTo: 'to-amber-900/60', accent: 'border-amber-500' },
  scientist: { icon: '⚗', color: 'text-violet-400', bgFrom: 'from-violet-950', bgTo: 'to-violet-900/60', accent: 'border-violet-500' },
};

const TYPE_CONFIG: Record<string, { icon: string; color: string; bgFrom: string; bgTo: string; accent: string; label: string }> = {
  equipment: { icon: '🛡', color: 'text-blue-400', bgFrom: 'from-slate-900', bgTo: 'to-blue-950/60', accent: 'border-blue-500', label: 'EQUIP' },
  consumable: { icon: '◈', color: 'text-orange-400', bgFrom: 'from-slate-900', bgTo: 'to-orange-950/60', accent: 'border-orange-500', label: 'USE' },
  action: { icon: '⚡', color: 'text-purple-400', bgFrom: 'from-slate-900', bgTo: 'to-purple-950/60', accent: 'border-purple-500', label: 'ACT' },
};

const SIZES = {
  sm: { w: 'w-[100px]', h: 'h-[140px]', icon: 'text-2xl', name: 'text-[9px]', stat: 'text-[7px]', pad: 'p-1.5' },
  md: { w: 'w-[120px]', h: 'h-[170px]', icon: 'text-3xl', name: 'text-[10px]', stat: 'text-[8px]', pad: 'p-2' },
  lg: { w: 'w-[140px]', h: 'h-[200px]', icon: 'text-4xl', name: 'text-xs', stat: 'text-[9px]', pad: 'p-2.5' },
};

export function PlayingCard({ card, selected, disabled, onClick, size = 'md', className }: PlayingCardProps) {
  const isSurvivor = card.type === 'survivor';
  const roleConf = isSurvivor ? ROLE_CONFIG[card.role ?? ''] : null;
  const typeConf = !isSurvivor ? TYPE_CONFIG[card.itemType ?? 'equipment'] : null;

  const bgFrom = roleConf?.bgFrom ?? typeConf?.bgFrom ?? 'from-slate-900';
  const bgTo = roleConf?.bgTo ?? typeConf?.bgTo ?? 'to-slate-800/60';
  const accent = roleConf?.accent ?? typeConf?.accent ?? 'border-slate-600';
  const iconColor = roleConf?.color ?? typeConf?.color ?? 'text-white/60';
  const icon = roleConf?.icon ?? typeConf?.icon ?? '?';
  const s = SIZES[size];

  // Stat pills
  const stats: { label: string; value: number; color: string }[] = [];
  if (isSurvivor && card.attributes) {
    if (card.attributes.combat > 0) stats.push({ label: 'ATK', value: card.attributes.combat, color: 'text-red-400' });
    if (card.attributes.defense > 0) stats.push({ label: 'DEF', value: card.attributes.defense, color: 'text-blue-400' });
    if (card.attributes.healing > 0) stats.push({ label: 'HLG', value: card.attributes.healing, color: 'text-emerald-400' });
    if (card.attributes.speed > 0) stats.push({ label: 'SPD', value: card.attributes.speed, color: 'text-yellow-400' });
    if (card.attributes.perception > 0) stats.push({ label: 'PER', value: card.attributes.perception, color: 'text-purple-400' });
  }
  if (card.bonusAttributes) {
    if (card.bonusAttributes.combat && card.bonusAttributes.combat > 0) stats.push({ label: 'ATK', value: card.bonusAttributes.combat, color: 'text-red-400' });
    if (card.bonusAttributes.defense && card.bonusAttributes.defense > 0) stats.push({ label: 'DEF', value: card.bonusAttributes.defense, color: 'text-blue-400' });
    if (card.bonusAttributes.healing && card.bonusAttributes.healing > 0) stats.push({ label: 'HLG', value: card.bonusAttributes.healing, color: 'text-emerald-400' });
    if (card.bonusAttributes.speed && card.bonusAttributes.speed > 0) stats.push({ label: 'SPD', value: card.bonusAttributes.speed, color: 'text-yellow-400' });
    if (card.bonusAttributes.perception && card.bonusAttributes.perception > 0) stats.push({ label: 'PER', value: card.bonusAttributes.perception, color: 'text-purple-400' });
  }

  // Show top 3 stats max
  const displayStats = stats.slice(0, 3);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'relative flex-shrink-0 flex flex-col rounded-xl border-2 overflow-hidden transition-all duration-200',
        `bg-gradient-to-b ${bgFrom} ${bgTo}`,
        s.w, s.h,
        selected
          ? `${accent} ring-2 ring-white/30 shadow-lg shadow-white/10 -translate-y-3 scale-105`
          : 'border-white/15 hover:border-white/30',
        disabled && 'opacity-30 cursor-not-allowed grayscale',
        !disabled && !selected && 'active:scale-95',
        className
      )}
    >
      {/* Top label */}
      <div className={clsx('flex items-center justify-between', s.pad, 'pb-0')}>
        <span className={clsx('font-bold uppercase tracking-wider text-white/30', size === 'sm' ? 'text-[6px]' : 'text-[7px]')}>
          {isSurvivor ? card.role : typeConf?.label}
        </span>
        {card.exhausted && (
          <span className="text-[6px] bg-red-500/30 text-red-300 px-1 rounded font-bold">{card.recoveryTime}d</span>
        )}
      </div>

      {/* Icon area — the card art */}
      <div className="flex-1 flex items-center justify-center">
        <div className={clsx(
          'flex items-center justify-center rounded-lg',
          iconColor,
          s.icon,
          size === 'sm' ? 'w-10 h-10' : size === 'md' ? 'w-12 h-12' : 'w-14 h-14',
          'bg-white/5'
        )}>
          {icon}
        </div>
      </div>

      {/* Name */}
      <div className={clsx(s.pad, 'pt-0 text-center')}>
        <p className={clsx('font-bold text-white leading-tight truncate', s.name)}>
          {card.name}
        </p>
      </div>

      {/* Stats row */}
      {displayStats.length > 0 && (
        <div className={clsx('flex items-center justify-center gap-1 px-1 pb-1', size === 'sm' ? 'gap-0.5' : 'gap-1')}>
          {displayStats.map((stat, i) => (
            <span
              key={i}
              className={clsx(
                'font-mono font-bold rounded bg-black/40 px-1',
                stat.color,
                s.stat
              )}
            >
              {stat.label[0]}{stat.value}
            </span>
          ))}
        </div>
      )}

      {/* HP bar for survivors / ammo for weapons */}
      {isSurvivor ? (
        <div className="px-2 pb-1.5">
          <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all',
                (card.currentHealth ?? 100) / (card.maxHealth ?? 100) > 0.6 ? 'bg-emerald-500' :
                (card.currentHealth ?? 100) / (card.maxHealth ?? 100) > 0.3 ? 'bg-amber-500' : 'bg-red-600'
              )}
              style={{ width: `${((card.currentHealth ?? 100) / (card.maxHealth ?? 100)) * 100}%` }}
            />
          </div>
        </div>
      ) : card.maxAmmo !== undefined ? (
        <div className={clsx('px-2 pb-1.5 text-center', size === 'sm' ? 'text-[6px]' : 'text-[7px]')}>
          <span className={clsx(
            'font-mono font-bold',
            (card.ammo ?? card.maxAmmo) === 0 ? 'text-red-500' :
            (card.ammo ?? card.maxAmmo) <= 2 ? 'text-amber-400' : 'text-white/40'
          )}>
            {card.ammo ?? card.maxAmmo}/{card.maxAmmo}
          </span>
        </div>
      ) : null}

      {/* Selected checkmark */}
      {selected && (
        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold shadow-lg">
          ✓
        </div>
      )}
    </button>
  );
}
