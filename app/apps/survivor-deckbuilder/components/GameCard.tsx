'use client';

import { CardInstance, CardCategory } from '../lib/types';
import { clsx } from 'clsx';

interface GameCardProps {
  card: CardInstance;
  selected?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onClick?: () => void;
  className?: string;
}

const ROLE_CONFIG: Record<string, { icon: string; gradient: string; accent: string; color: string }> = {
  healer:    { icon: '✚', gradient: 'from-emerald-900 to-emerald-950', accent: 'border-emerald-500', color: 'text-emerald-400' },
  fighter:   { icon: '⚔', gradient: 'from-red-900 to-red-950',         accent: 'border-red-500',     color: 'text-red-400'     },
  scout:     { icon: '◎', gradient: 'from-sky-900 to-sky-950',         accent: 'border-sky-500',     color: 'text-sky-400'     },
  mechanic:  { icon: '⚙', gradient: 'from-amber-900 to-amber-950',     accent: 'border-amber-500',   color: 'text-amber-400'   },
  scientist: { icon: '⚗', gradient: 'from-violet-900 to-violet-950',   accent: 'border-violet-500',  color: 'text-violet-400'  },
};

// Category-based visual tinge for non-survivor cards
const CATEGORY_CONFIG: Partial<Record<CardCategory, { icon: string; gradient: string; accent: string; label: string; color: string }>> = {
  weapon:   { icon: '⚔', gradient: 'from-red-950 to-slate-900',      accent: 'border-red-700',     label: 'WEAPON',    color: 'text-red-500'     },
  gear:     { icon: '🛡', gradient: 'from-slate-800 to-slate-900',    accent: 'border-blue-700',    label: 'GEAR',      color: 'text-blue-400'    },
  medical:  { icon: '✚', gradient: 'from-emerald-950 to-slate-900',  accent: 'border-emerald-700', label: 'MEDICAL',   color: 'text-emerald-400' },
  food:     { icon: '◆', gradient: 'from-amber-950 to-slate-900',    accent: 'border-amber-700',   label: 'FOOD',      color: 'text-amber-400'   },
  action:   { icon: '⚡', gradient: 'from-purple-950 to-slate-900',  accent: 'border-purple-700',  label: 'ACTION',    color: 'text-purple-400'  },
  upgrade:  { icon: '▲', gradient: 'from-teal-950 to-slate-900',     accent: 'border-teal-700',    label: 'UPGRADE',   color: 'text-teal-400'    },
  building: { icon: '⬡', gradient: 'from-orange-950 to-slate-900',   accent: 'border-orange-700',  label: 'BUILDING',  color: 'text-orange-400'  },
  seed:     { icon: '🌱', gradient: 'from-lime-950 to-slate-900',     accent: 'border-lime-700',    label: 'SEED',      color: 'text-lime-400'    },
};

// Legacy item type fallback
const TYPE_CONFIG: Record<string, { icon: string; gradient: string; accent: string; label: string; color: string }> = {
  equipment:  { icon: '🛡', gradient: 'from-slate-800 to-slate-900',      accent: 'border-blue-400',   label: 'EQUIPMENT',  color: 'text-blue-400'   },
  consumable: { icon: '◈',  gradient: 'from-orange-900/80 to-slate-900',  accent: 'border-orange-400', label: 'CONSUMABLE', color: 'text-orange-400' },
  action:     { icon: '⚡', gradient: 'from-purple-900/80 to-slate-900',  accent: 'border-purple-400', label: 'ACTION',     color: 'text-purple-400' },
};

function AmmoDots({ current, max }: { current: number; max: number }) {
  return (
    <div className="flex gap-0.5 items-center">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`${i < current ? 'text-red-400' : 'text-stone-700'} text-[9px]`}>
          {i < current ? '●' : '○'}
        </span>
      ))}
    </div>
  );
}

export function GameCard({ card, selected, disabled, compact, onClick, className }: GameCardProps) {
  const isSurvivor = card.type === 'survivor';
  const roleConf = isSurvivor ? ROLE_CONFIG[card.role ?? ''] : null;

  // Use category config first, then fall back to item type config
  const catConf = !isSurvivor && card.category ? CATEGORY_CONFIG[card.category] : null;
  const typeConf = !isSurvivor ? (catConf ?? TYPE_CONFIG[card.itemType ?? 'equipment']) : null;

  const gradient = roleConf?.gradient ?? typeConf?.gradient ?? 'from-slate-800 to-slate-900';
  const accent = roleConf?.accent ?? typeConf?.accent ?? 'border-slate-600';
  const icon = roleConf?.icon ?? typeConf?.icon ?? '?';
  const roleColor = roleConf?.color ?? typeConf?.color ?? 'text-stone-400';

  const isWeapon = card.maxAmmo !== undefined;
  const ammo = card.ammo ?? card.maxAmmo;

  // Primary stat — the big number shown prominently
  let primaryStat = { value: '', label: '', color: 'text-stone-300' };
  if (isSurvivor && card.attributes) {
    const a = card.attributes;
    if (a.combat > 0)       primaryStat = { value: `+${a.combat}%`, label: 'ATK', color: 'text-red-400' };
    else if (a.healing > 0) primaryStat = { value: `+${a.healing}%`, label: 'HLG', color: 'text-emerald-400' };
    else if (a.defense > 0) primaryStat = { value: `+${a.defense}%`, label: 'DEF', color: 'text-blue-400' };
  } else if (card.bonusAttributes) {
    const b = card.bonusAttributes;
    if (b.combat && b.combat > 0)   primaryStat = { value: `+${b.combat}`, label: 'DMG', color: 'text-red-400' };
    else if (b.healing && b.healing > 0) primaryStat = { value: `+${b.healing}`, label: 'HLG', color: 'text-emerald-400' };
    else if (b.defense && b.defense > 0) primaryStat = { value: `+${b.defense}%`, label: 'DEF', color: 'text-blue-400' };
  }

  // Secondary attributes (small icons) — for survivors
  const secondaryAttrs: { icon: string; color: string }[] = [];
  if (isSurvivor && card.attributes) {
    const a = card.attributes;
    if (a.defense > 0) secondaryAttrs.push({ icon: '🛡', color: 'text-blue-600' });
    if (a.healing > 0) secondaryAttrs.push({ icon: '✚', color: 'text-emerald-600' });
    if (a.speed > 0)   secondaryAttrs.push({ icon: '▶', color: 'text-yellow-600' });
    if (a.perception > 0) secondaryAttrs.push({ icon: '◉', color: 'text-purple-600' });
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
          <span className="text-base opacity-60">{icon}</span>
          <span className="font-semibold text-sm text-white/90 flex-1 truncate">{card.name}</span>
          {primaryStat.value && (
            <span className={`text-xs font-bold font-mono ${primaryStat.color}`}>
              {primaryStat.value}
            </span>
          )}
          {selected && <span className="text-xs text-green-400 font-bold ml-1">✓</span>}
        </div>
        {isWeapon && ammo !== undefined && card.maxAmmo !== undefined && (
          <div className="mt-1 ml-6">
            <AmmoDots current={ammo} max={card.maxAmmo} />
          </div>
        )}
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
      {/* Top row: type label + exhausted badge */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${isSurvivor ? roleColor : roleColor}`}>
          {isSurvivor ? card.role : (catConf?.label ?? typeConf?.label)}
        </span>
        {card.exhausted && (
          <span className="text-[10px] bg-red-500/30 text-red-300 px-2 py-0.5 rounded-full font-semibold">
            {card.recoveryTime}d
          </span>
        )}
      </div>

      {/* Icon + name + primary stat */}
      <div className="px-4 pb-2">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-white/5 border border-white/10 flex-shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-base leading-tight">{card.name}</h3>
            {card.special && (
              <p className="text-[10px] text-amber-400/70 mt-0.5">✦ {card.special.name}</p>
            )}
          </div>
          {/* Primary stat — big and obvious */}
          {primaryStat.value && (
            <div className="text-right flex-shrink-0">
              <p className={`text-xl font-bold font-mono leading-none ${primaryStat.color}`}>
                {primaryStat.value}
              </p>
              <p className="text-[9px] text-white/20 font-mono">{primaryStat.label}</p>
            </div>
          )}
        </div>
      </div>

      {/* Secondary attributes — subtle dots for survivors */}
      {secondaryAttrs.length > 0 && (
        <div className="px-4 pb-1.5 flex gap-1">
          {secondaryAttrs.map((a, i) => (
            <span key={i} className={`text-[10px] opacity-50 ${a.color}`}>{a.icon}</span>
          ))}
        </div>
      )}

      {/* Bottom bar — HP / ammo / use type */}
      <div className="border-t border-white/5 px-4 py-2">
        {isSurvivor ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full',
                  (card.currentHealth ?? 100) / (card.maxHealth ?? 100) > 0.6
                    ? 'bg-emerald-500'
                    : (card.currentHealth ?? 100) / (card.maxHealth ?? 100) > 0.3
                      ? 'bg-amber-500'
                      : 'bg-red-600'
                )}
                style={{ width: `${((card.currentHealth ?? 100) / (card.maxHealth ?? 100)) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-white/40 tabular-nums">
              {card.currentHealth ?? 100}/{card.maxHealth ?? 100}
            </span>
          </div>
        ) : isWeapon && ammo !== undefined && card.maxAmmo !== undefined ? (
          <div className="flex items-center justify-between">
            <AmmoDots current={ammo} max={card.maxAmmo} />
            <span className={clsx(
              'text-[10px] font-mono font-bold tabular-nums',
              ammo === 0 ? 'text-red-500' : ammo <= 2 ? 'text-amber-400' : 'text-white/40'
            )}>
              {ammo}/{card.maxAmmo}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/20 uppercase font-mono">
              {card.itemType === 'consumable' || card.itemType === 'action' ? '1× use' : 'Reusable'}
            </span>
            {!card.exhausted && (
              <span className="text-[10px] text-green-400/50 font-mono">READY</span>
            )}
          </div>
        )}
      </div>

      {/* Selected checkmark */}
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold shadow-lg">
          ✓
        </div>
      )}
    </button>
  );
}
