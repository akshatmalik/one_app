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

function getCardTypeLabel(card: CardInstance): string {
  if (card.type === 'survivor') return card.role?.toUpperCase() ?? 'SURVIVOR';
  if (card.id === 'bare_fists') return 'ALWAYS AVAILABLE';
  return (card.itemType ?? 'ITEM').toUpperCase();
}

function getCardStatLines(card: CardInstance): { label: string; value: string; color: string }[] {
  const lines: { label: string; value: string; color: string }[] = [];
  if (card.type === 'survivor' && card.attributes) {
    const a = card.attributes;
    if (a.combat > 0) lines.push({ label: 'COMBAT', value: `+${a.combat}%`, color: 'text-red-700' });
    if (a.defense > 0) lines.push({ label: 'DEFENSE', value: `+${a.defense}%`, color: 'text-stone-500' });
    if (a.healing > 0) lines.push({ label: 'HEALING', value: `+${a.healing}%`, color: 'text-stone-500' });
  }
  if (card.bonusAttributes) {
    const b = card.bonusAttributes;
    if (b.combat && b.combat > 0) lines.push({ label: 'DAMAGE', value: `+${b.combat}`, color: 'text-red-700' });
    if (b.defense && b.defense > 0) lines.push({ label: 'DEFENSE', value: `+${b.defense}%`, color: 'text-stone-500' });
    if (b.healing && b.healing > 0) lines.push({ label: 'HEALING', value: `+${b.healing}`, color: 'text-stone-500' });
  }
  if (card.maxHealth) {
    lines.push({ label: 'HP', value: `${card.currentHealth ?? card.maxHealth}/${card.maxHealth}`, color: 'text-stone-600' });
  }
  return lines;
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
  // Always append bare fists as fallback
  const allCards = [...hand, BARE_FISTS];

  const [cursor, setCursor] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  const currentCard = allCards[Math.min(cursor, allCards.length - 1)];
  const selectedCards = allCards.filter(c => selectedIds.has(c.id));

  const synergies = selectedCards.length > 0
    ? detectSynergies([...selectedCards.filter(c => c.type !== 'action' || c.id === 'bare_fists'), ...activeSurvivors])
    : [];

  const goLeft = useCallback(() => {
    setCursor(prev => Math.max(0, prev - 1));
  }, []);

  const goRight = useCallback(() => {
    setCursor(prev => Math.min(allCards.length - 1, prev + 1));
  }, [allCards.length]);

  const toggleCurrent = useCallback(() => {
    if (!currentCard || confirming) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(currentCard.id)) {
        next.delete(currentCard.id);
      } else {
        next.add(currentCard.id);
      }
      return next;
    });
  }, [currentCard, confirming]);

  // Keyboard navigation
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goLeft(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goRight(); }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCurrent(); }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [goLeft, goRight, toggleCurrent]);

  const handleConfirm = () => {
    if (selectedCards.length === 0 || confirming) return;
    setConfirming(true);
    setTimeout(() => onPlayCards(selectedCards), 300);
  };

  const isCurrentSelected = selectedIds.has(currentCard?.id ?? '');
  const isBareHands = allCards.length === 1 && allCards[0].id === 'bare_fists';

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

      {/* Facing */}
      <div className="px-5 pt-4 pb-2">
        <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase">
          FACING: {encounter.name.toUpperCase()}
        </p>
        <div className="flex gap-2 mt-1">
          {(encounter.enemies ?? []).map((e, i) => (
            <span key={i} className="text-[9px] text-red-900 font-mono border border-stone-800 px-1.5 py-0.5">
              {e.name} ({e.health}hp)
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-stone-900 mx-5 mt-2" />

      {/* Card browser */}
      <div className="flex-1 flex flex-col justify-center px-5 py-4">
        <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-3 text-center">
          SELECT YOUR ACTION — {cursor + 1}/{allCards.length}
          {isBareHands ? ' · NO GEAR REMAINING' : ''}
        </p>

        {/* Navigation arrows + current card */}
        <div className="flex items-center gap-3">
          {/* Left arrow */}
          <button
            onClick={goLeft}
            disabled={cursor === 0}
            className="w-8 h-8 flex items-center justify-center text-stone-700 hover:text-stone-400 disabled:opacity-20 transition-colors flex-shrink-0 font-mono text-lg"
          >
            ←
          </button>

          {/* Current card display */}
          <div
            className={`flex-1 border transition-all duration-200 cursor-pointer ${
              isCurrentSelected
                ? 'border-amber-700 bg-stone-900'
                : currentCard?.id === 'bare_fists'
                  ? 'border-stone-800 bg-stone-900/50'
                  : 'border-stone-800 bg-stone-900'
            }`}
            onClick={toggleCurrent}
          >
            {/* Card header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-stone-800">
              <span className="text-[9px] text-stone-600 font-mono tracking-widest uppercase">
                {getCardTypeLabel(currentCard)}
              </span>
              {isCurrentSelected && (
                <span className="text-[9px] text-amber-600 font-mono tracking-wider">
                  ✓ SELECTED
                </span>
              )}
              {currentCard?.id === 'bare_fists' && (
                <span className="text-[9px] text-stone-700 font-mono">FALLBACK</span>
              )}
            </div>

            {/* Card body */}
            <div className="px-4 py-3">
              <h2 className="text-lg font-bold text-stone-200 uppercase tracking-wide mb-1">
                {currentCard?.name}
              </h2>
              <p className="text-sm text-stone-500 leading-relaxed mb-3">
                {currentCard?.description}
              </p>

              {/* Stats */}
              <div className="space-y-1">
                {getCardStatLines(currentCard).map((stat, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[9px] text-stone-700 font-mono tracking-widest uppercase">
                      {stat.label}
                    </span>
                    <span className={`text-[11px] font-mono font-bold ${stat.color}`}>
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Special ability */}
              {currentCard?.special && (
                <div className="mt-2 pt-2 border-t border-stone-800">
                  <p className="text-[9px] text-amber-800 font-mono">
                    ✦ {currentCard.special.name}: {currentCard.special.description}
                  </p>
                </div>
              )}
            </div>

            <div className="px-4 pb-3">
              <p className="text-[9px] text-stone-700 font-mono text-center">
                {isCurrentSelected ? 'TAP TO DESELECT' : 'TAP TO SELECT · ENTER'}
              </p>
            </div>
          </div>

          {/* Right arrow */}
          <button
            onClick={goRight}
            disabled={cursor === allCards.length - 1}
            className="w-8 h-8 flex items-center justify-center text-stone-700 hover:text-stone-400 disabled:opacity-20 transition-colors flex-shrink-0 font-mono text-lg"
          >
            →
          </button>
        </div>

        {/* Card dots indicator */}
        <div className="flex justify-center gap-1 mt-3">
          {allCards.map((c, i) => (
            <div
              key={c.id}
              onClick={() => setCursor(i)}
              className={`cursor-pointer transition-all ${
                i === cursor
                  ? 'w-4 h-1 bg-stone-500'
                  : selectedIds.has(c.id)
                    ? 'w-1.5 h-1 bg-amber-700'
                    : c.id === 'bare_fists'
                      ? 'w-1.5 h-1 bg-stone-800'
                      : 'w-1.5 h-1 bg-stone-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Selected cards summary */}
      {selectedCards.length > 0 && (
        <div className="px-5 pb-2">
          <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-1">
            DEPLOYING
          </p>
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
      <div className="px-5 pb-8 pt-2">
        {selectedCards.length > 0 ? (
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className={`w-full py-3.5 font-mono font-bold text-sm tracking-widest uppercase border transition-colors ${
              confirming
                ? 'bg-stone-800 border-stone-700 text-stone-500'
                : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-200 active:scale-[0.98]'
            }`}
          >
            {confirming
              ? 'MOVING OUT...'
              : `DEPLOY (${selectedCards.length} SELECTED)`
            }
          </button>
        ) : (
          <button
            disabled
            className="w-full py-3.5 font-mono text-sm tracking-widest uppercase border border-stone-900 text-stone-700 cursor-not-allowed"
          >
            SELECT A CARD TO DEPLOY
          </button>
        )}
        <p className="text-center text-[9px] text-stone-800 font-mono mt-1.5 tracking-wider">
          ← → NAVIGATE · ENTER SELECT · ↵ DEPLOY
        </p>
      </div>
    </div>
  );
}
