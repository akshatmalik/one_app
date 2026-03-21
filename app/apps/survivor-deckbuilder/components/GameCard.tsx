'use client';

import { CardInstance } from '../lib/types';
import { clsx } from 'clsx';

interface GameCardProps {
  card: CardInstance;
  selected?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onClick?: () => void;
  className?: string;
}

const ROLE_CONFIG: Record<string, { icon: string; gradient: string; accent: string }> = {
  healer: { icon: '✚', gradient: 'from-emerald-900 to-emerald-950', accent: 'border-emerald-500' },
  fighter: { icon: '⚔', gradient: 'from-red-900 to-red-950', accent: 'border-red-500' },
  scout: { icon: '◎', gradient: 'from-sky-900 to-sky-950', accent: 'border-sky-500' },
  mechanic: { icon: '⚙', gradient: 'from-amber-900 to-amber-950', accent: 'border-amber-500' },
  scientist: { icon: '⚗', gradient: 'from-violet-900 to-violet-950', accent: 'border-violet-500' },
};

const TYPE_CONFIG: Record<string, { icon: string; gradient: string; accent: string; label: string }> = {
  equipment: { icon: '🛡', gradient: 'from-slate-800 to-slate-900', accent: 'border-blue-400', label: 'EQUIPMENT' },
  consumable: { icon: '◈', gradient: 'from-orange-900/80 to-slate-900', accent: 'border-orange-400', label: 'CONSUMABLE' },
  action: { icon: '⚡', gradient: 'from-purple-900/80 to-slate-900', accent: 'border-purple-400', label: 'ACTION' },
};

export function GameCard({ card, selected, disabled, compact, onClick, className }: GameCardProps) {
  const isSurvivor = card.type === 'survivor';
  const roleConf = isSurvivor ? ROLE_CONFIG[card.role ?? ''] : null;
  const typeConf = !isSurvivor ? TYPE_CONFIG[card.itemType ?? 'equipment'] : null;

  const gradient = roleConf?.gradient ?? typeConf?.gradient ?? 'from-slate-800 to-slate-900';
  const accent = roleConf?.accent ?? typeConf?.accent ?? 'border-slate-600';
  const icon = roleConf?.icon ?? typeConf?.icon ?? '?';

  // Stat pills for the card
  const stats: { label: string; value: number; color: string }[] = [];
  if (isSurvivor && card.attributes) {
    if (card.attributes.combat > 0) stats.push({ label: 'ATK', value: card.attributes.combat, color: 'text-red-400' });
    if (card.attributes.defense > 0) stats.push({ label: 'DEF', value: card.attributes.defense, color: 'text-blue-400' });
    if (card.attributes.healing > 0) stats.push({ label: 'HLG', value: card.attributes.healing, color: 'text-emerald-400' });
    if (card.attributes.speed > 0) stats.push({ label: 'SPD', value: card.attributes.speed, color: 'text-yellow-400' });
    if (card.attributes.perception > 0) stats.push({ label: 'PER', value: card.attributes.perception, color: 'text-purple-400' });
  }
  if (card.bonusAttributes) {
    if (card.bonusAttributes.combat) stats.push({ label: 'ATK', value: card.bonusAttributes.combat, color: 'text-red-400' });
    if (card.bonusAttributes.defense) stats.push({ label: 'DEF', value: card.bonusAttributes.defense, color: 'text-blue-400' });
    if (card.bonusAttributes.healing) stats.push({ label: 'HLG', value: card.bonusAttributes.healing, color: 'text-emerald-400' });
    if (card.bonusAttributes.perception) stats.push({ label: 'PER', value: card.bonusAttributes.perception, color: 'text-purple-400' });
    if (card.bonusAttributes.speed) stats.push({ label: 'SPD', value: card.bonusAttributes.speed, color: 'text-yellow-400' });
  }

  if (compact) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={clsx(
          'text-left rounded-lg border-2 px-3 py-2 transition-all',
          `bg-gradient-to-br ${gradient}`,
          selected ? `${accent} ring-2 ring-white/20 scale-[1.02]` : 'border-white/10',
          disabled && 'opacity-40 cursor-not-allowed grayscale',
          !disabled && 'hover:border-white/30 active:scale-[0.98]',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg opacity-60">{icon}</span>
          <span className="font-semibold text-sm text-white/90">{card.name}</span>
          {selected && <span className="ml-auto text-xs text-green-400 font-bold">✓</span>}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'relative text-left rounded-2xl border-2 overflow-hidden transition-all w-full',
        `bg-gradient-to-b ${gradient}`,
        selected
          ? `${accent} ring-2 ring-white/30 shadow-lg shadow-white/5 scale-[1.02]`
          : 'border-white/10 hover:border-white/20',
        disabled && 'opacity-40 cursor-not-allowed grayscale',
        !disabled && 'active:scale-[0.97]',
        className
      )}
    >
      {/* Card top — type label */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
          {isSurvivor ? card.role : typeConf?.label}
        </span>
        {card.exhausted && (
          <span className="text-[10px] bg-red-500/30 text-red-300 px-2 py-0.5 rounded-full font-semibold">
            {card.recoveryTime}d
          </span>
        )}
      </div>

      {/* Card icon + name */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-3">
          <div className={clsx(
            'w-12 h-12 rounded-xl flex items-center justify-center text-2xl',
            'bg-white/5 border border-white/10'
          )}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-lg leading-tight">{card.name}</h3>
            <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{card.description}</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      {stats.length > 0 && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-1.5">
            {stats.map((stat, i) => (
              <span
                key={i}
                className={clsx(
                  'text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-black/30',
                  stat.color
                )}
              >
                {stat.label} +{stat.value}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Special ability */}
      {card.special && (
        <div className="px-4 pb-3">
          <p className="text-[10px] text-amber-400/80 italic">
            ✦ {card.special.name} — {card.special.description}
          </p>
        </div>
      )}

      {/* Bottom bar — HP for survivors, type indicator for items */}
      <div className="border-t border-white/5 px-4 py-2 flex items-center justify-between">
        {isSurvivor ? (
          <>
            <span className="text-[10px] text-white/30 uppercase font-semibold">HP</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-black/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${((card.currentHealth ?? 100) / (card.maxHealth ?? 100)) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-white/40">
                {card.currentHealth ?? 100}/{card.maxHealth ?? 100}
              </span>
            </div>
          </>
        ) : (
          <>
            <span className="text-[10px] text-white/30 uppercase font-semibold">
              {card.itemType === 'consumable' ? 'Single use' : 'Reusable'}
            </span>
            {!card.exhausted && (
              <span className="text-[10px] text-green-400/60 font-semibold">Ready</span>
            )}
          </>
        )}
      </div>

      {/* Selected overlay */}
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold shadow-lg">
          ✓
        </div>
      )}
    </button>
  );
}
