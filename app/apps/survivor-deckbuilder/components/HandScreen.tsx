'use client';

import { useState } from 'react';
import { CardInstance, Encounter } from '../lib/types';
import { detectSynergies } from '../lib/synergies';
import { PlayingCard } from './PlayingCard';
import { RunStatusBar } from './RunStatusBar';

interface HandScreenProps {
  hand: CardInstance[];
  encounter: Encounter;
  activeSurvivors: CardInstance[];
  cardsRemaining: number;
  totalCards: number;
  stageNumber: number;
  totalStages: number;
  onPlayCards: (cards: CardInstance[]) => void;
}

export function HandScreen({
  hand,
  encounter,
  activeSurvivors,
  cardsRemaining,
  totalCards,
  stageNumber,
  totalStages,
  onPlayCards,
}: HandScreenProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  const selectedCards = hand.filter(c => selectedIds.has(c.id));

  // Detect synergies across all selected cards + active survivors
  const synergies = selectedCards.length > 0
    ? detectSynergies([...selectedCards, ...activeSurvivors])
    : [];

  const handleToggle = (cardId: string) => {
    if (confirming) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    if (selectedCards.length === 0) return;
    setConfirming(true);
    setTimeout(() => {
      onPlayCards(selectedCards);
    }, 300);
  };

  // How many cards will be left after this encounter
  const cardsAfter = cardsRemaining - selectedCards.length;
  const stagesLeft = totalStages - stageNumber;

  // Location-based background
  const locationBg = getLocationBackground(encounter.location ?? '');

  return (
    <div className={`min-h-screen flex flex-col ${locationBg}`}>
      {/* Status bar */}
      <RunStatusBar
        stageNumber={stageNumber}
        totalStages={totalStages}
        survivors={activeSurvivors}
        cardsRemaining={cardsRemaining}
        totalCards={totalCards}
        location={encounter.location}
      />

      {/* Enemy threat reminder */}
      <div className="px-5 pt-4 pb-2">
        <p className="text-white/40 text-xs uppercase tracking-wider font-semibold mb-2">
          Facing: {encounter.name}
        </p>
        <div className="flex gap-2">
          {(encounter.enemies ?? []).map((enemy, i) => (
            <div key={i} className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2 flex-1 border border-red-500/20">
              <p className="text-[11px] font-semibold text-white/80 truncate">{enemy.name}</p>
              <div className="flex gap-2 mt-1">
                <span className="text-[9px] text-red-400 font-mono">HP {enemy.health}</span>
                <span className="text-[9px] text-orange-400 font-mono">ATK {enemy.damage}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Divider + section header */}
      <div className="px-5 py-3">
        <div className="border-t border-white/10" />
      </div>

      <div className="flex-1 flex flex-col justify-end">
        {/* Selected cards info panel */}
        {selectedCards.length > 0 && (
          <div className="px-5 mb-3 space-y-2">
            {selectedCards.map(card => (
              <div key={card.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-white">{card.name}</span>
                  {card.special && (
                    <span className="text-[10px] text-amber-400/70 ml-2 italic">✦ {card.special.name}</span>
                  )}
                </div>
                <button
                  onClick={() => handleToggle(card.id)}
                  className="text-white/30 hover:text-white/60 text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Synergy hint */}
        {synergies.length > 0 && (
          <div className="px-5 mb-2">
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-2">
              <p className="text-[11px] text-purple-300 font-semibold">
                ⚡ {synergies.map(s => `${s.name}: +${s.damageBonus || s.defenseBonus || s.healingBonus}`).join(' · ')}
              </p>
            </div>
          </div>
        )}

        {/* Resource warning */}
        {selectedCards.length > 0 && stagesLeft > 0 && (
          <div className="px-5 mb-2">
            <div className={`rounded-xl px-4 py-2 border ${
              cardsAfter === 0
                ? 'bg-red-500/10 border-red-500/20'
                : cardsAfter <= stagesLeft
                  ? 'bg-amber-500/10 border-amber-500/20'
                  : 'bg-white/5 border-white/10'
            }`}>
              <p className={`text-[11px] font-medium ${
                cardsAfter === 0
                  ? 'text-red-300'
                  : cardsAfter <= stagesLeft
                    ? 'text-amber-300'
                    : 'text-white/40'
              }`}>
                {cardsAfter === 0
                  ? `⚠ No cards left for ${stagesLeft} remaining encounter${stagesLeft > 1 ? 's' : ''}!`
                  : `${cardsAfter} card${cardsAfter !== 1 ? 's' : ''} remaining for ${stagesLeft} more encounter${stagesLeft > 1 ? 's' : ''}`
                }
              </p>
            </div>
          </div>
        )}

        {/* Card hand label */}
        <div className="px-5 mb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white/60">Your Hand</h2>
            <span className="text-xs text-white/30 bg-white/5 px-3 py-1 rounded-full">
              {selectedCards.length}/{hand.length}
            </span>
          </div>
        </div>

        {/* The hand — horizontal scrollable playing cards */}
        {hand.length > 0 ? (
          <div className="px-2 mb-2">
            <div
              className="flex gap-3 overflow-x-auto pb-2 pt-2 px-3 snap-x snap-mandatory scrollbar-hide"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {hand.map(card => {
                const isSelected = selectedIds.has(card.id);
                return (
                  <div
                    key={card.id}
                    className={`snap-center transition-all duration-200 ${
                      confirming && !isSelected ? 'opacity-20 scale-90' : ''
                    } ${confirming && isSelected ? 'scale-105' : ''}`}
                  >
                    <PlayingCard
                      card={card}
                      size="lg"
                      selected={isSelected}
                      onClick={() => handleToggle(card.id)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="px-5 mb-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
              <p className="text-2xl mb-2">💀</p>
              <p className="text-red-300 font-bold">No Cards Left</p>
              <p className="text-red-300/60 text-sm mt-1">All cards spent. Your team faces this unarmed.</p>
            </div>
          </div>
        )}
      </div>

      {/* Action area */}
      <div className="px-5 pb-8 pt-3">
        {selectedCards.length > 0 ? (
          <div className="space-y-2">
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className={`w-full py-4 font-bold text-lg rounded-2xl transition-all active:scale-[0.97] ${
                confirming
                  ? 'bg-amber-700 text-amber-200 scale-[0.98]'
                  : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20'
              }`}
            >
              {confirming
                ? 'Deploying...'
                : `Deploy ${selectedCards.length} Card${selectedCards.length !== 1 ? 's' : ''}`
              }
            </button>
          </div>
        ) : (
          <button
            disabled
            className="w-full py-4 font-bold text-lg rounded-2xl bg-white/5 text-white/20 cursor-not-allowed"
          >
            Tap cards to select
          </button>
        )}
      </div>
    </div>
  );
}

function getLocationBackground(location: string): string {
  const loc = location.toLowerCase();
  if (loc.includes('pharmacy') || loc.includes('hospital')) return 'bg-gradient-to-b from-teal-950 via-slate-900 to-slate-950';
  if (loc.includes('gas') || loc.includes('highway')) return 'bg-gradient-to-b from-amber-950/80 via-slate-900 to-slate-950';
  if (loc.includes('school')) return 'bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950';
  if (loc.includes('warehouse') || loc.includes('military')) return 'bg-gradient-to-b from-green-950/60 via-slate-900 to-slate-950';
  if (loc.includes('police')) return 'bg-gradient-to-b from-blue-950/60 via-slate-900 to-slate-950';
  if (loc.includes('subway') || loc.includes('tunnel')) return 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950';
  if (loc.includes('bridge') || loc.includes('river')) return 'bg-gradient-to-b from-cyan-950/50 via-slate-900 to-slate-950';
  if (loc.includes('lab') || loc.includes('research')) return 'bg-gradient-to-b from-violet-950/60 via-slate-900 to-slate-950';
  return 'bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950';
}
