'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CardInstance, Encounter } from '../lib/types';
import { detectSynergies } from '../lib/synergies';
import { RunStatusBar } from './RunStatusBar';

// Bare fists — always available, never exhausted
const BARE_FISTS: CardInstance = {
  id: 'bare_fists',
  type: 'action',
  name: 'BARE FISTS',
  description: 'No ammo. No gear. Just knuckles.',
  itemType: 'action',
  bonusAttributes: { combat: 18, defense: 0, healing: 0, speed: 0, perception: 0 },
  status: 'healthy',
  exhausted: false,
  recoveryTime: 0,
  currentHealth: 100,
};

interface HandScreenProps {
  hand: CardInstance[];
  encounter: Encounter;
  activeSurvivors: CardInstance[];
  cardsRemaining: number;
  totalCards: number;
  stageNumber: number;
  totalStages: number;
  isBarricaded?: boolean;
  onPlayCards: (cards: CardInstance[]) => void;
}

// Render ammo as filled/empty dots
function AmmoDots({ current, max }: { current: number; max: number }) {
  return (
    <div className="flex gap-0.5 items-center">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`text-[8px] ${i < current ? 'text-red-400' : 'text-stone-700'}`}
        >
          {i < current ? '●' : '○'}
        </span>
      ))}
    </div>
  );
}

// Compact stats for a card shown in the detail panel
function CardDetailPanel({ card, isSelected }: { card: CardInstance; isSelected: boolean }) {
  const isSurvivor = card.type === 'survivor';
  const isWeapon = card.maxAmmo !== undefined;
  const ammo = card.ammo ?? card.maxAmmo;

  const ROLE_COLOR: Record<string, string> = {
    healer: 'text-emerald-400',
    fighter: 'text-red-400',
    scout: 'text-sky-400',
    mechanic: 'text-amber-400',
    scientist: 'text-violet-400',
  };
  const ROLE_BG: Record<string, string> = {
    healer: 'bg-emerald-950 border-emerald-800',
    fighter: 'bg-red-950 border-red-800',
    scout: 'bg-sky-950 border-sky-800',
    mechanic: 'bg-amber-950 border-amber-800',
    scientist: 'bg-violet-950 border-violet-800',
  };
  const TYPE_BG: Record<string, string> = {
    equipment: 'bg-slate-900 border-slate-700',
    consumable: 'bg-orange-950 border-orange-800',
    action: 'bg-purple-950 border-purple-800',
  };

  const bgClass = isSurvivor
    ? (ROLE_BG[card.role ?? ''] ?? 'bg-stone-900 border-stone-700')
    : (TYPE_BG[card.itemType ?? 'equipment'] ?? 'bg-stone-900 border-stone-700');

  const roleColor = isSurvivor ? (ROLE_COLOR[card.role ?? ''] ?? 'text-stone-300') : 'text-stone-300';

  return (
    <div className={`border rounded-lg px-4 py-3 ${bgClass} ${isSelected ? 'ring-1 ring-amber-500/40' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className={`text-[10px] font-mono uppercase tracking-widest ${roleColor} opacity-70`}>
            {isSurvivor ? card.role : card.itemType}
          </p>
          <h3 className="text-lg font-bold text-white uppercase tracking-wide leading-tight">
            {card.name}
          </h3>
        </div>
        {isSelected && (
          <span className="text-[10px] text-amber-500 font-mono tracking-wider mt-0.5">✓ IN</span>
        )}
      </div>

      {/* Key stat — BIG and obvious */}
      <div className="flex items-center gap-4 mb-2">
        {isSurvivor && card.attributes && (
          <>
            {card.attributes.combat > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400 font-mono leading-none">+{card.attributes.combat}%</p>
                <p className="text-[9px] text-stone-600 font-mono">ATK</p>
              </div>
            )}
            {card.attributes.defense > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400 font-mono leading-none">+{card.attributes.defense}%</p>
                <p className="text-[9px] text-stone-600 font-mono">DEF</p>
              </div>
            )}
            {card.attributes.healing > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400 font-mono leading-none">+{card.attributes.healing}%</p>
                <p className="text-[9px] text-stone-600 font-mono">HLG</p>
              </div>
            )}
          </>
        )}
        {card.bonusAttributes && (
          <>
            {(card.bonusAttributes.combat ?? 0) > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400 font-mono leading-none">+{card.bonusAttributes.combat}</p>
                <p className="text-[9px] text-stone-600 font-mono">DMG</p>
              </div>
            )}
            {(card.bonusAttributes.defense ?? 0) > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400 font-mono leading-none">+{card.bonusAttributes.defense}%</p>
                <p className="text-[9px] text-stone-600 font-mono">DEF</p>
              </div>
            )}
            {(card.bonusAttributes.healing ?? 0) > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400 font-mono leading-none">+{card.bonusAttributes.healing}</p>
                <p className="text-[9px] text-stone-600 font-mono">HLG</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* HP bar for survivors */}
      {isSurvivor && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-black/40 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                (card.currentHealth ?? 100) / (card.maxHealth ?? 100) > 0.6
                  ? 'bg-emerald-500'
                  : (card.currentHealth ?? 100) / (card.maxHealth ?? 100) > 0.3
                    ? 'bg-amber-500'
                    : 'bg-red-600'
              }`}
              style={{ width: `${((card.currentHealth ?? 100) / (card.maxHealth ?? 100)) * 100}%` }}
            />
          </div>
          <span className="text-[9px] font-mono text-stone-500">
            {card.currentHealth ?? 100}/{card.maxHealth ?? 100} HP
          </span>
        </div>
      )}

      {/* Ammo dots for weapons */}
      {isWeapon && ammo !== undefined && card.maxAmmo !== undefined && (
        <div className="flex items-center gap-2">
          <AmmoDots current={ammo} max={card.maxAmmo} />
          <span className={`text-[9px] font-mono ${ammo === 0 ? 'text-red-500' : ammo <= 2 ? 'text-amber-400' : 'text-stone-500'}`}>
            {ammo}/{card.maxAmmo} ammo
          </span>
        </div>
      )}

      {/* Special */}
      {card.special && (
        <p className="text-[9px] text-amber-700 font-mono mt-1.5">
          ✦ {card.special.name}
        </p>
      )}

      <p className="text-[10px] text-stone-700 font-mono mt-1.5">
        {isSelected ? 'TAP TO DESELECT' : 'TAP TO SELECT'}
      </p>
    </div>
  );
}

// Mini card for the fan — small, visual
function FanCard({
  card,
  isFocused,
  isSelected,
  onClick,
}: {
  card: CardInstance;
  isFocused: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isSurvivor = card.type === 'survivor';
  const isWeapon = card.maxAmmo !== undefined;
  const ammo = card.ammo ?? card.maxAmmo;

  const ROLE_ICON: Record<string, string> = {
    healer: '✚', fighter: '⚔', scout: '◎', mechanic: '⚙', scientist: '⚗',
  };
  const ROLE_BG: Record<string, string> = {
    healer: 'from-emerald-900 to-emerald-950',
    fighter: 'from-red-900 to-red-950',
    scout: 'from-sky-900 to-sky-950',
    mechanic: 'from-amber-900 to-amber-950',
    scientist: 'from-violet-900 to-violet-950',
  };
  const TYPE_ICON: Record<string, string> = {
    equipment: '🛡', consumable: '◈', action: '⚡',
  };
  const TYPE_BG: Record<string, string> = {
    equipment: 'from-slate-800 to-slate-900',
    consumable: 'from-orange-900/80 to-slate-900',
    action: 'from-purple-900/80 to-slate-900',
  };

  const icon = isSurvivor
    ? (ROLE_ICON[card.role ?? ''] ?? '?')
    : (TYPE_ICON[card.itemType ?? 'equipment'] ?? '?');
  const bgGrad = isSurvivor
    ? (ROLE_BG[card.role ?? ''] ?? 'from-stone-800 to-stone-900')
    : (TYPE_BG[card.itemType ?? 'equipment'] ?? 'from-stone-800 to-stone-900');

  // Key stat to show on the mini card
  let keyStat = '';
  if (isSurvivor && card.attributes) {
    const a = card.attributes;
    if (a.combat > 0) keyStat = `+${a.combat}%`;
    else if (a.healing > 0) keyStat = `+${a.healing}%`;
    else if (a.defense > 0) keyStat = `+${a.defense}%`;
  } else if (card.bonusAttributes) {
    const b = card.bonusAttributes;
    if (b.combat && b.combat > 0) keyStat = `+${b.combat}`;
    else if (b.healing && b.healing > 0) keyStat = `+${b.healing}`;
    else if (b.defense && b.defense > 0) keyStat = `+${b.defense}%`;
  }

  return (
    <button
      onClick={onClick}
      className={`
        relative flex-shrink-0 w-[72px] rounded-xl border-2 overflow-hidden
        bg-gradient-to-b ${bgGrad}
        transition-all duration-200
        ${isFocused ? 'border-amber-500 -translate-y-3 shadow-lg shadow-amber-900/30 scale-105' : 'border-white/10'}
        ${isSelected && !isFocused ? 'border-amber-600/60' : ''}
        active:scale-95
      `}
      style={{ height: '96px' }}
    >
      {/* Selected dot */}
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center z-10">
          <span className="text-[8px] text-black font-bold">✓</span>
        </div>
      )}

      {/* Icon */}
      <div className="flex items-center justify-center pt-3 pb-1">
        <span className="text-xl opacity-70">{icon}</span>
      </div>

      {/* Card name — short */}
      <p className="text-[9px] font-bold text-white/80 text-center px-1 leading-tight truncate">
        {card.name.split(' ')[0]}
      </p>

      {/* Bottom: ammo dots or key stat */}
      <div className="absolute bottom-1.5 left-0 right-0 flex justify-center">
        {isWeapon && ammo !== undefined && card.maxAmmo !== undefined ? (
          <div className="flex gap-0.5">
            {Array.from({ length: Math.min(card.maxAmmo, 6) }).map((_, i) => (
              <span key={i} className={`text-[7px] ${i < ammo ? 'text-red-400' : 'text-stone-700'}`}>
                {i < ammo ? '●' : '○'}
              </span>
            ))}
          </div>
        ) : isSurvivor ? (
          <div className="w-10 h-0.5 bg-black/40 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                (card.currentHealth ?? 100) / (card.maxHealth ?? 100) > 0.6
                  ? 'bg-emerald-500'
                  : (card.currentHealth ?? 100) / (card.maxHealth ?? 100) > 0.3
                    ? 'bg-amber-500'
                    : 'bg-red-600'
              }`}
              style={{ width: `${((card.currentHealth ?? 100) / (card.maxHealth ?? 100)) * 100}%` }}
            />
          </div>
        ) : keyStat ? (
          <span className="text-[8px] font-bold text-stone-400 font-mono">{keyStat}</span>
        ) : null}
      </div>
    </button>
  );
}

export function HandScreen({
  hand,
  encounter,
  activeSurvivors,
  cardsRemaining,
  totalCards,
  stageNumber,
  totalStages,
  isBarricaded,
  onPlayCards,
}: HandScreenProps) {
  const allCards = [...hand, BARE_FISTS];

  const [focusedIdx, setFocusedIdx] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const fanRef = useRef<HTMLDivElement>(null);

  const focusedCard = allCards[Math.min(focusedIdx, allCards.length - 1)];
  const selectedCards = allCards.filter(c => selectedIds.has(c.id));
  const synergies = selectedCards.length > 0
    ? detectSynergies([...selectedCards, ...activeSurvivors])
    : [];

  const toggleCard = useCallback((idx: number) => {
    const card = allCards[idx];
    if (!card || confirming) return;
    setFocusedIdx(idx);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(card.id)) next.delete(card.id);
      else next.add(card.id);
      return next;
    });
  }, [allCards, confirming]);

  const focusCard = useCallback((idx: number) => {
    setFocusedIdx(idx);
  }, []);

  // Keyboard nav
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); setFocusedIdx((p: number) => Math.max(0, p - 1)); }
      if (e.key === 'ArrowRight') { e.preventDefault(); setFocusedIdx((p: number) => Math.min(allCards.length - 1, p + 1)); }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCard(focusedIdx); }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [allCards.length, focusedIdx, toggleCard]);

  // Scroll focused card into view in the fan
  useEffect(() => {
    if (!fanRef.current) return;
    const cards = fanRef.current.children;
    if (cards[focusedIdx]) {
      (cards[focusedIdx] as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [focusedIdx]);

  const handleDeploy = () => {
    if (selectedCards.length === 0 || confirming) return;
    setConfirming(true);
    setTimeout(() => onPlayCards(selectedCards), 300);
  };

  const totalHP = (encounter.enemies ?? []).reduce((sum, e) => sum + e.health, 0);

  return (
    <div className="min-h-screen flex flex-col bg-stone-950 text-stone-300">
      <RunStatusBar
        stageNumber={stageNumber}
        totalStages={totalStages}
        survivors={activeSurvivors}
        cardsRemaining={cardsRemaining}
        totalCards={totalCards}
        location={encounter.location}
        isBarricaded={isBarricaded}
      />

      {/* Enemy threat — compact */}
      <div className="px-5 pt-3 pb-2 border-b border-stone-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] text-stone-700 font-mono uppercase tracking-widest">
              {encounter.location}
            </p>
            <div className="flex gap-1 mt-0.5 flex-wrap">
              {(encounter.enemies ?? []).map((e, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="text-[10px] text-stone-500 font-mono">{e.name}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: Math.min(e.health, 5) }).map((_, j) => (
                      <span key={j} className="text-[8px] text-red-800">●</span>
                    ))}
                    {e.health > 5 && <span className="text-[8px] text-red-900">+{e.health - 5}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-stone-700 font-mono">{totalHP} HP</p>
            <p className={`text-[9px] font-mono uppercase ${
              encounter.difficulty === 'easy' ? 'text-stone-600' :
              encounter.difficulty === 'medium' ? 'text-amber-800' :
              encounter.difficulty === 'hard' ? 'text-red-800' : 'text-red-600'
            }`}>
              {encounter.difficulty === 'easy' ? 'LOW' :
               encounter.difficulty === 'medium' ? 'MED' :
               encounter.difficulty === 'hard' ? 'HIGH' : '!!!'}
            </p>
          </div>
        </div>
      </div>

      {/* Focused card detail */}
      <div className="px-4 pt-3 pb-2">
        <CardDetailPanel
          card={focusedCard}
          isSelected={selectedIds.has(focusedCard?.id ?? '')}
        />
      </div>

      {/* Selected summary + synergy */}
      {selectedCards.length > 0 && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-1 flex-wrap">
            {selectedCards.map(c => (
              <span key={c.id} className="text-[10px] text-stone-400 font-mono border border-stone-800 px-1.5 py-0.5 bg-stone-900 rounded">
                {c.name.split(' ')[0]}
              </span>
            ))}
            {synergies.length > 0 && (
              <span className="text-[10px] text-amber-700 font-mono">
                ⚡ {synergies.map(s => s.name).join(' · ')}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex-1" />

      {/* Card fan — held in hand */}
      <div className="border-t border-stone-900 pt-3 pb-2">
        <p className="text-[9px] text-stone-700 font-mono uppercase tracking-widest text-center mb-2">
          YOUR HAND — {allCards.length} CARDS
        </p>
        <div
          ref={fanRef}
          className="flex gap-2 px-4 overflow-x-auto pb-1 justify-start"
          style={{ scrollbarWidth: 'none' }}
        >
          {allCards.map((card, idx) => (
            <FanCard
              key={card.id}
              card={card}
              isFocused={focusedIdx === idx}
              isSelected={Boolean(selectedIds.has(card.id))}
              onClick={() => {
                if (focusedIdx === idx) {
                  toggleCard(idx);
                } else {
                  focusCard(idx);
                }
              }}
            />
          ))}
        </div>
        <p className="text-[8px] text-stone-800 font-mono text-center mt-1">
          TAP TO FOCUS · TAP AGAIN TO SELECT
        </p>
      </div>

      {/* Deploy button */}
      <div className="px-4 pb-6 pt-2">
        <button
          onClick={handleDeploy}
          disabled={selectedCards.length === 0 || confirming}
          className={`w-full py-3.5 font-mono font-bold text-sm tracking-widest uppercase border transition-all ${
            selectedCards.length > 0 && !confirming
              ? 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-200 active:scale-[0.98]'
              : 'bg-stone-900 border-stone-900 text-stone-700 cursor-not-allowed'
          }`}
        >
          {confirming
            ? 'MOVING OUT...'
            : selectedCards.length > 0
              ? `DEPLOY (${selectedCards.length})`
              : 'TAP A CARD TO SELECT'
          }
        </button>
      </div>
    </div>
  );
}
