'use client';

import { useState, useMemo } from 'react';
import { CardInstance } from '../lib/types';
import { validateDeck } from '../lib/combat-engine';
import { checkPotentialSynergies, detectSynergies } from '../lib/synergies';

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
        // Enforce limits
        if (card.type === 'survivor' && selectedSurvivors.length >= 2 && !next.has(card.id)) {
          return prev; // Can't select more than 2 survivors
        }
        if (card.type !== 'survivor' && selectedNonSurvivors.length >= 5 && !next.has(card.id)) {
          return prev; // Max 5 non-survivors
        }
        next.add(card.id);
      }
      return next;
    });
  };

  const renderCard = (card: CardInstance) => {
    const isSelected = selectedIds.has(card.id);
    const isExhausted = card.exhausted;
    const potentialSynergies = isSelected ? [] : checkPotentialSynergies(selectedCards, card);

    let borderColor = 'border-slate-600';
    if (isExhausted) borderColor = 'border-red-800';
    else if (isSelected) {
      borderColor = card.type === 'survivor' ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-amber-500 ring-2 ring-amber-500/30';
    }

    const roleIcons: Record<string, string> = {
      healer: '💚', fighter: '⚔️', scout: '🔍', mechanic: '🔧', scientist: '🔬',
    };

    const typeIcon = card.type === 'survivor'
      ? (roleIcons[card.role ?? ''] ?? '👤')
      : card.itemType === 'equipment' ? '🛡️'
      : card.itemType === 'consumable' ? '💊'
      : card.itemType === 'action' ? '⚡'
      : '📦';

    return (
      <button
        key={card.id}
        onClick={() => toggleCard(card)}
        disabled={isExhausted}
        className={`w-full text-left rounded-xl border-2 p-3 transition-all ${borderColor} ${
          isExhausted ? 'opacity-40 bg-slate-800/30 cursor-not-allowed' : 'bg-slate-800/50 hover:bg-slate-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{typeIcon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm">{card.name}</h4>
              {isSelected && (
                <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded font-bold">
                  ✓
                </span>
              )}
              {isExhausted && (
                <span className="text-[10px] bg-red-500/30 text-red-400 px-1.5 py-0.5 rounded">
                  {card.recoveryTime}d recovery
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate">{card.description}</p>
            {/* Stats preview */}
            <div className="flex flex-wrap gap-1 mt-1">
              {card.type === 'survivor' && card.attributes && (
                <>
                  {card.attributes.combat > 0 && <span className="text-[10px] text-red-400 bg-red-400/10 px-1.5 rounded">ATK +{card.attributes.combat}</span>}
                  {card.attributes.defense > 0 && <span className="text-[10px] text-blue-400 bg-blue-400/10 px-1.5 rounded">DEF +{card.attributes.defense}</span>}
                  {card.attributes.healing > 0 && <span className="text-[10px] text-green-400 bg-green-400/10 px-1.5 rounded">HEAL +{card.attributes.healing}</span>}
                </>
              )}
              {card.bonusAttributes && (
                <>
                  {card.bonusAttributes.combat && <span className="text-[10px] text-red-400 bg-red-400/10 px-1.5 rounded">ATK +{card.bonusAttributes.combat}</span>}
                  {card.bonusAttributes.defense && <span className="text-[10px] text-blue-400 bg-blue-400/10 px-1.5 rounded">DEF +{card.bonusAttributes.defense}</span>}
                  {card.bonusAttributes.healing && <span className="text-[10px] text-green-400 bg-green-400/10 px-1.5 rounded">HEAL +{card.bonusAttributes.healing}</span>}
                </>
              )}
            </div>
            {/* Potential synergies hint */}
            {potentialSynergies.length > 0 && (
              <p className="text-[10px] text-purple-400 mt-1">
                ⚡ {potentialSynergies.map(s => s.name).join(', ')}
              </p>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <button onClick={onBack} className="text-slate-400 hover:text-white text-sm mb-3">
          ← Back to Home Base
        </button>
        <h1 className="text-2xl font-bold">Prepare Expedition</h1>
        <p className="text-slate-400 text-sm mt-1">
          Select 2 survivors + 2-5 items/actions for your deck
        </p>
      </div>

      {/* Selection summary */}
      <div className="px-6 pb-3">
        <div className="flex gap-3 text-sm">
          <span className={`px-3 py-1 rounded-full ${
            selectedSurvivors.length === 2
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            {selectedSurvivors.length}/2 Survivors
          </span>
          <span className={`px-3 py-1 rounded-full ${
            selectedNonSurvivors.length >= 2
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            {selectedNonSurvivors.length}/2-5 Items
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            {selectedCards.length} total
          </span>
        </div>
      </div>

      {/* Card selection */}
      <div className="flex-1 px-6 space-y-4 overflow-y-auto pb-4">
        {/* Survivors */}
        <div>
          <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-2">
            Survivors (pick 2)
          </h3>
          <div className="space-y-2">
            {survivors.map(renderCard)}
          </div>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-2">
              Equipment & Consumables
            </h3>
            <div className="space-y-2">
              {items.map(renderCard)}
            </div>
          </div>
        )}

        {/* Actions */}
        {actions.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-2">
              Actions
            </h3>
            <div className="space-y-2">
              {actions.map(renderCard)}
            </div>
          </div>
        )}

        {/* Synergy preview */}
        {synergies.length > 0 && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-purple-400 mb-2">⚡ Active Synergies</h3>
            {synergies.map(syn => (
              <div key={syn.id} className="text-sm text-purple-300 mb-1">
                <span className="font-semibold">{syn.name}:</span> {syn.description}
                <span className="text-purple-400/70 text-xs ml-1">
                  {syn.damageBonus > 0 && `+${syn.damageBonus} DMG `}
                  {syn.defenseBonus > 0 && `+${syn.defenseBonus} DEF `}
                  {syn.healingBonus > 0 && `+${syn.healingBonus} HEAL`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Launch button */}
      <div className="px-6 pb-8 pt-4 space-y-2">
        {!validation.valid && selectedCards.length > 0 && (
          <p className="text-xs text-red-400 text-center">{validation.error}</p>
        )}
        <button
          onClick={() => validation.valid && onLaunch(selectedCards)}
          disabled={!validation.valid}
          className={`w-full py-4 font-bold text-lg rounded-xl transition-all active:scale-[0.98] ${
            validation.valid
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {validation.valid ? '🚀 LAUNCH EXPEDITION' : 'SELECT YOUR DECK'}
        </button>
      </div>
    </div>
  );
}
