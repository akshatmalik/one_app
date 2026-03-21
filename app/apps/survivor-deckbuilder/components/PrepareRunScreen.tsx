'use client';

import { useState, useMemo } from 'react';
import { CardInstance } from '../lib/types';
import { validateDeck } from '../lib/combat-engine';
import { detectSynergies, checkPotentialSynergies } from '../lib/synergies';
import { GameCard } from './GameCard';

interface PrepareRunScreenProps {
  survivors: CardInstance[];
  items: CardInstance[];
  actions: CardInstance[];
  onLaunch: (deck: CardInstance[]) => void;
  onBack: () => void;
}

export function PrepareRunScreen({
  survivors,
  items,
  actions,
  onLaunch,
  onBack,
}: PrepareRunScreenProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allCards = useMemo(() => [...survivors, ...items, ...actions], [survivors, items, actions]);
  const selectedCards = allCards.filter(c => selectedIds.has(c.id));
  const selectedSurvivors = selectedCards.filter(c => c.type === 'survivor');
  const selectedNonSurvivors = selectedCards.filter(c => c.type !== 'survivor');
  const validation = validateDeck(selectedCards);
  const synergies = detectSynergies(selectedCards);

  const toggleCard = (card: CardInstance) => {
    if (card.exhausted) return;

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(card.id)) {
        next.delete(card.id);
      } else {
        if (card.type === 'survivor' && selectedSurvivors.length >= 2 && !next.has(card.id)) return prev;
        if (card.type !== 'survivor' && selectedNonSurvivors.length >= 5 && !next.has(card.id)) return prev;
        next.add(card.id);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="bg-black/40 backdrop-blur-md border-b border-white/10 px-5 pt-6 pb-4">
        <button onClick={onBack} className="text-white/30 hover:text-white/60 text-sm mb-3 transition-colors">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-white">Prepare Expedition</h1>
        <p className="text-white/30 text-sm mt-1">
          Pick 2 survivors + 2-5 items for your deck
        </p>

        {/* Selection pills */}
        <div className="flex gap-2 mt-3">
          <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${
            selectedSurvivors.length === 2
              ? 'bg-green-500/10 text-green-400 border-green-500/20'
              : 'bg-white/5 text-white/30 border-white/10'
          }`}>
            {selectedSurvivors.length}/2 Survivors
          </span>
          <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${
            selectedNonSurvivors.length >= 2
              ? 'bg-green-500/10 text-green-400 border-green-500/20'
              : 'bg-white/5 text-white/30 border-white/10'
          }`}>
            {selectedNonSurvivors.length}/2-5 Gear
          </span>
          <span className="text-xs px-3 py-1.5 rounded-full font-semibold bg-white/5 text-white/30 border border-white/10">
            {selectedCards.length} total
          </span>
        </div>
      </div>

      {/* Card selection */}
      <div className="flex-1 px-5 py-4 space-y-5 overflow-y-auto">
        {/* Survivors */}
        <div>
          <p className="text-[10px] text-blue-400/60 uppercase tracking-wider font-semibold mb-2">
            Survivors — pick 2
          </p>
          <div className="space-y-2">
            {survivors.map(card => (
              <GameCard
                key={card.id}
                card={card}
                selected={selectedIds.has(card.id)}
                disabled={card.exhausted}
                onClick={() => toggleCard(card)}
              />
            ))}
          </div>
        </div>

        {/* Equipment */}
        {items.length > 0 && (
          <div>
            <p className="text-[10px] text-amber-400/60 uppercase tracking-wider font-semibold mb-2">
              Equipment & Consumables
            </p>
            <div className="space-y-2">
              {items.map(card => (
                <GameCard
                  key={card.id}
                  card={card}
                  selected={selectedIds.has(card.id)}
                  disabled={card.exhausted}
                  onClick={() => toggleCard(card)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {actions.length > 0 && (
          <div>
            <p className="text-[10px] text-purple-400/60 uppercase tracking-wider font-semibold mb-2">
              Actions
            </p>
            <div className="space-y-2">
              {actions.map(card => (
                <GameCard
                  key={card.id}
                  card={card}
                  selected={selectedIds.has(card.id)}
                  disabled={card.exhausted}
                  onClick={() => toggleCard(card)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Synergies */}
        {synergies.length > 0 && (
          <div className="bg-purple-500/5 border border-purple-500/10 rounded-2xl px-4 py-3">
            <p className="text-[10px] text-purple-400/60 uppercase tracking-wider font-semibold mb-2">
              ⚡ Synergies Active
            </p>
            {synergies.map(syn => (
              <p key={syn.id} className="text-xs text-purple-300/70">
                {syn.name}: {syn.description}
                <span className="text-purple-400/50 ml-1">
                  {syn.damageBonus > 0 && `+${syn.damageBonus} DMG `}
                  {syn.defenseBonus > 0 && `+${syn.defenseBonus} DEF `}
                  {syn.healingBonus > 0 && `+${syn.healingBonus} HEAL`}
                </span>
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Launch */}
      <div className="px-5 pb-8 pt-4 bg-gradient-to-t from-slate-950 to-transparent">
        {!validation.valid && selectedCards.length > 0 && (
          <p className="text-xs text-red-400/60 text-center mb-2">{validation.error}</p>
        )}
        <button
          onClick={() => validation.valid && onLaunch(selectedCards)}
          disabled={!validation.valid}
          className={`w-full py-4 font-bold text-lg rounded-2xl transition-all active:scale-[0.97] ${
            validation.valid
              ? 'bg-green-700 hover:bg-green-600 text-white shadow-lg shadow-green-900/30'
              : 'bg-white/5 text-white/20 cursor-not-allowed'
          }`}
        >
          {validation.valid ? 'Launch Expedition' : 'Select Your Deck'}
        </button>
      </div>
    </div>
  );
}
