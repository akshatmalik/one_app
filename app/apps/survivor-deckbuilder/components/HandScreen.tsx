'use client';

import { useState, useEffect, useCallback } from 'react';
import { CardInstance, Encounter } from '../lib/types';
import { detectSynergies } from '../lib/synergies';
import { RunStatusBar } from './RunStatusBar';

// Bare fists — always available, never exhausted
const BARE_FISTS: CardInstance = {
  id: 'bare_fists',
  type: 'action',
  name: 'BARE FISTS',
  description: 'No ammo. No gear. Just knuckles. You always have this.',
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

const FAN_ROTATION_DEGREES = 6;     // degrees of tilt per card offset from center
const FAN_HORIZONTAL_SPACING = 52;  // px between card centers
const FAN_VERTICAL_ARC = 5;         // px of downward arc per offset unit (edges sit lower)
const FAN_SELECTED_LIFT = 30;       // px upward lift when a card is selected
const CARD_WIDTH = 80;              // px — must match w-[80px] in JSX

const ROLE_COLORS: Record<string, string> = {
  fighter: 'from-red-950 to-stone-950',
  healer: 'from-emerald-950 to-stone-950',
  scout: 'from-sky-950 to-stone-950',
  mechanic: 'from-amber-950 to-stone-950',
  scientist: 'from-violet-950 to-stone-950',
};

const ROLE_ICONS: Record<string, string> = {
  fighter: '⚔',
  healer: '✚',
  scout: '◎',
  mechanic: '⚙',
  scientist: '⚗',
};

function getCardGradient(card: CardInstance): string {
  if (card.id === 'bare_fists') return 'from-stone-900 to-stone-950';
  if (card.type === 'survivor') return ROLE_COLORS[card.role ?? ''] ?? 'from-stone-900 to-stone-950';
  if (card.itemType === 'equipment') return 'from-slate-800 to-stone-950';
  if (card.itemType === 'consumable') return 'from-orange-950 to-stone-950';
  return 'from-stone-900 to-stone-950';
}

function getCardIcon(card: CardInstance): string {
  if (card.id === 'bare_fists') return '✊';
  if (card.type === 'survivor') return ROLE_ICONS[card.role ?? ''] ?? '◈';
  if (card.itemType === 'equipment' && card.maxAmmo !== undefined) return '⊕';
  if (card.itemType === 'equipment') return '🛡';
  if (card.itemType === 'consumable') return '◈';
  return '⚡';
}

// Stat pills — top 2 non-zero stats only, colored dots
function getStatPills(card: CardInstance): { color: string; value: number }[] {
  const pills: { color: string; value: number }[] = [];
  if (card.type === 'survivor' && card.attributes) {
    const a = card.attributes;
    if (a.combat > 0) pills.push({ color: 'bg-red-700', value: a.combat });
    if (a.defense > 0) pills.push({ color: 'bg-blue-700', value: a.defense });
    if (a.healing > 0) pills.push({ color: 'bg-emerald-700', value: a.healing });
  }
  if (card.bonusAttributes) {
    const b = card.bonusAttributes;
    if (b.combat && b.combat > 0) pills.push({ color: 'bg-red-700', value: b.combat });
    if (b.defense && b.defense > 0) pills.push({ color: 'bg-blue-700', value: b.defense });
    if (b.healing && b.healing > 0) pills.push({ color: 'bg-emerald-700', value: b.healing });
  }
  return pills.slice(0, 2);
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
  const n = allCards.length;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  const selectedCards = allCards.filter(c => selectedIds.has(c.id));

  const synergies = selectedCards.length > 0
    ? detectSynergies([...selectedCards.filter(c => c.type !== 'action' || c.id === 'bare_fists'), ...activeSurvivors])
    : [];

  const toggleCard = useCallback((card: CardInstance) => {
    if (confirming) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(card.id)) {
        next.delete(card.id);
      } else {
        next.add(card.id);
      }
      return next;
    });
  }, [confirming]);

  // Keyboard: Enter/Space to confirm deploy
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && selectedCards.length > 0 && !confirming) {
        e.preventDefault();
        setConfirming(true);
        setTimeout(() => onPlayCards(selectedCards), 300);
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [selectedCards, confirming, onPlayCards]);

  const handleConfirm = () => {
    if (selectedCards.length === 0 || confirming) return;
    setConfirming(true);
    setTimeout(() => onPlayCards(selectedCards), 300);
  };

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

      {/* Encounter context — compact */}
      <div className="px-5 pt-3 pb-2">
        <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase">
          FACING: {encounter.name.toUpperCase()}
        </p>
        <div className="flex gap-1.5 mt-1 flex-wrap">
          {(encounter.enemies ?? []).map((e, i) => (
            <span key={i} className="text-[9px] text-red-900 font-mono border border-stone-800 px-1.5 py-0.5">
              {e.name} ({e.health}hp)
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-stone-900 mx-5" />

      {/* Spacer pushes fan to bottom */}
      <div className="flex-1" />

      {/* Selected summary + synergy */}
      {selectedCards.length > 0 && (
        <div className="px-5 pb-1.5">
          <div className="flex flex-wrap gap-1">
            {selectedCards.map(c => (
              <span key={c.id} className="text-[10px] text-stone-400 font-mono border border-stone-800 px-2 py-0.5 bg-stone-900">
                {c.name}
              </span>
            ))}
          </div>
          {synergies.length > 0 && (
            <p className="text-[9px] text-amber-800 font-mono mt-1">
              ⚡ {synergies.map(s => s.name).join(' · ')}
            </p>
          )}
        </div>
      )}

      {/* Deploy button */}
      <div className="px-5 pt-1.5 pb-2">
        {selectedCards.length > 0 ? (
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className={`w-full py-3 font-mono font-bold text-sm tracking-widest uppercase border transition-colors ${
              confirming
                ? 'bg-stone-800 border-stone-700 text-stone-500'
                : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-200 active:scale-[0.98]'
            }`}
          >
            {confirming ? 'MOVING OUT...' : `DEPLOY (${selectedCards.length})`}
          </button>
        ) : (
          <button
            disabled
            className="w-full py-3 font-mono text-sm tracking-widest uppercase border border-stone-900 text-stone-700 cursor-not-allowed"
          >
            SELECT A CARD TO DEPLOY
          </button>
        )}
      </div>

      {/* Fan card row */}
      <div className="relative overflow-hidden" style={{ height: '168px' }}>
        <div className="absolute inset-0 flex items-end justify-center pb-4">
          {allCards.map((card, i) => {
            const mid = (n - 1) / 2;
            const offset = i - mid;
            const rotateZ = offset * FAN_ROTATION_DEGREES;
            const translateX = offset * FAN_HORIZONTAL_SPACING;
            const translateY = Math.abs(offset) * FAN_VERTICAL_ARC;
            const isSelected = selectedIds.has(card.id);
            const finalY = translateY + (isSelected ? -FAN_SELECTED_LIFT : 0);
            const isBareHands = card.id === 'bare_fists';
            const pills = getStatPills(card);

            return (
              <div
                key={card.id}
                onClick={() => toggleCard(card)}
                className="absolute bottom-4 cursor-pointer select-none"
                style={{
                  transform: `translateX(${translateX}px) translateY(${finalY}px) rotate(${rotateZ}deg)`,
                  transformOrigin: 'bottom center',
                  transition: 'transform 0.2s ease',
                  zIndex: isSelected ? 20 : 10 + i,
                  left: '50%',
                  marginLeft: `-${CARD_WIDTH / 2}px`,
                }}
              >
                <div style={{ width: `${CARD_WIDTH}px`, height: '112px' }} className={`rounded-sm bg-gradient-to-b ${getCardGradient(card)} flex flex-col overflow-hidden border ${
                  isSelected
                    ? 'border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                    : isBareHands
                      ? 'border-stone-800 opacity-60'
                      : 'border-stone-700'
                }`}>
                  {/* Type label */}
                  <div className="px-1.5 pt-1.5">
                    <p className="text-[6px] text-stone-600 font-mono tracking-widest uppercase truncate">
                      {card.type === 'survivor' ? (card.role ?? 'surv') : (card.itemType ?? 'item')}
                    </p>
                  </div>

                  {/* Icon */}
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-2xl opacity-60">{getCardIcon(card)}</span>
                  </div>

                  {/* Bottom section */}
                  <div className="px-1.5 pb-1.5">
                    {/* Ammo for weapons */}
                    {card.maxAmmo !== undefined && card.ammo !== undefined && (
                      <p className="text-[7px] text-stone-500 font-mono text-right mb-0.5">
                        {card.ammo}/{card.maxAmmo}
                      </p>
                    )}
                    {/* HP bar for survivors */}
                    {card.type === 'survivor' && card.maxHealth && (
                      <div className="w-full h-0.5 bg-stone-800 mb-0.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-stone-500 rounded-full"
                          style={{ width: `${((card.currentHealth ?? card.maxHealth) / card.maxHealth) * 100}%` }}
                        />
                      </div>
                    )}
                    {/* Card name */}
                    <p className="text-[8px] text-stone-300 font-mono font-bold leading-tight truncate uppercase">
                      {card.name}
                    </p>
                    {/* Stat pills — 2 tiny colored dots */}
                    {pills.length > 0 && (
                      <div className="flex gap-1 mt-0.5">
                        {pills.map((p, pi) => (
                          <span key={pi} className={`inline-block w-1.5 h-1.5 rounded-full ${p.color} opacity-70`} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom safe area */}
      <div className="h-4" />
    </div>
  );
}
