'use client';

import { useState } from 'react';
import { CardInstance, Encounter } from '../lib/types';
import { detectSynergies } from '../lib/synergies';
import { GameCard } from './GameCard';
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
  const allSelected = selectedCards.length === hand.length && hand.length > 0;

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

  const handleSelectAll = () => {
    if (confirming) return;
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(hand.map(c => c.id)));
    }
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

      {/* Divider */}
      <div className="px-5 py-3">
        <div className="border-t border-white/10" />
      </div>

      {/* Cards — select any number */}
      <div className="flex-1 px-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white">Your Cards</h2>
          <div className="flex items-center gap-2">
            {hand.length > 1 && (
              <button
                onClick={handleSelectAll}
                disabled={confirming}
                className="text-[10px] text-white/40 hover:text-white/70 bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-full transition-colors"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
            )}
            <span className="text-xs text-white/30 bg-white/5 px-3 py-1 rounded-full">
              {selectedCards.length} / {hand.length} selected
            </span>
          </div>
        </div>

        {hand.length > 0 ? (
          <div className="space-y-3 pb-2">
            {hand.map(card => {
              const isSelected = selectedIds.has(card.id);
              return (
                <div
                  key={card.id}
                  className={`transition-all duration-200 ${
                    confirming && !isSelected ? 'opacity-20 scale-95' : ''
                  } ${confirming && isSelected ? 'scale-[1.02]' : ''}`}
                >
                  <GameCard
                    card={card}
                    selected={isSelected}
                    onClick={() => handleToggle(card.id)}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
            <p className="text-2xl mb-2">💀</p>
            <p className="text-red-300 font-bold">No Cards Left</p>
            <p className="text-red-300/60 text-sm mt-1">
              All cards spent. Your team faces this unarmed.
            </p>
          </div>
        )}

        {/* Synergy hint */}
        {synergies.length > 0 && (
          <div className="mt-3 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-2">
            <p className="text-[11px] text-purple-300 font-semibold">
              ⚡ {synergies.map(s => `${s.name}: +${s.damageBonus || s.defenseBonus || s.healingBonus}`).join(' · ')}
            </p>
          </div>
        )}

        {/* Resource warning — cards remaining for future stages */}
        {selectedCards.length > 0 && stagesLeft > 0 && (
          <div className={`mt-3 rounded-xl px-4 py-2.5 border ${
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
        )}
      </div>

      {/* Action area */}
      <div className="px-5 pb-8 pt-4">
        {selectedCards.length > 0 ? (
          <div className="space-y-2">
            <p className="text-center text-xs text-white/40">
              Send <span className="text-white/80 font-semibold">
                {selectedCards.length} card{selectedCards.length !== 1 ? 's' : ''}
              </span> into combat?
            </p>
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
            Select cards to deploy
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
