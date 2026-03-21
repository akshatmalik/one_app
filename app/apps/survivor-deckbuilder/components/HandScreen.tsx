'use client';

import { useState } from 'react';
import { CardInstance, Encounter } from '../lib/types';
import { detectSynergies } from '../lib/synergies';

interface HandScreenProps {
  hand: CardInstance[];
  encounter: Encounter;
  activeSurvivors: CardInstance[];
  onPlayCards: (cards: CardInstance[]) => void;
}

export function HandScreen({
  hand,
  encounter,
  activeSurvivors,
  onPlayCards,
}: HandScreenProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectedCards = hand.filter(c => selectedIds.has(c.id));
  const synergies = detectSynergies(selectedCards);
  const hasSelection = selectedIds.size > 0;

  const toggleCard = (cardId: string) => {
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

  const getCardTypeIcon = (card: CardInstance) => {
    if (card.type === 'survivor') {
      const roleIcons: Record<string, string> = {
        healer: '💚', fighter: '⚔️', scout: '🔍', mechanic: '🔧', scientist: '🔬',
      };
      return roleIcons[card.role ?? ''] ?? '👤';
    }
    if (card.itemType === 'equipment') return '🛡️';
    if (card.itemType === 'consumable') return '💊';
    if (card.itemType === 'action') return '⚡';
    return '📦';
  };

  const getCardColor = (card: CardInstance, isSelected: boolean) => {
    if (!isSelected) return 'border-slate-600 bg-slate-800';
    if (card.type === 'survivor') return 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50';
    if (card.type === 'item') return 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/50';
    return 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/50';
  };

  const getStatBars = (card: CardInstance) => {
    const stats: { label: string; value: number; color: string }[] = [];
    if (card.type === 'survivor' && card.attributes) {
      if (card.attributes.combat > 0) stats.push({ label: 'ATK', value: card.attributes.combat, color: 'bg-red-500' });
      if (card.attributes.defense > 0) stats.push({ label: 'DEF', value: card.attributes.defense, color: 'bg-blue-500' });
      if (card.attributes.healing > 0) stats.push({ label: 'HEAL', value: card.attributes.healing, color: 'bg-green-500' });
      if (card.attributes.speed > 0) stats.push({ label: 'SPD', value: card.attributes.speed, color: 'bg-yellow-500' });
      if (card.attributes.perception > 0) stats.push({ label: 'PER', value: card.attributes.perception, color: 'bg-purple-500' });
    }
    if (card.bonusAttributes) {
      if (card.bonusAttributes.combat) stats.push({ label: 'ATK', value: card.bonusAttributes.combat, color: 'bg-red-500' });
      if (card.bonusAttributes.defense) stats.push({ label: 'DEF', value: card.bonusAttributes.defense, color: 'bg-blue-500' });
      if (card.bonusAttributes.healing) stats.push({ label: 'HEAL', value: card.bonusAttributes.healing, color: 'bg-green-500' });
    }
    return stats;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Enemy status bar */}
      <div className="px-6 pt-6 pb-4">
        <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">
          Enemies
        </h3>
        <div className="flex gap-2">
          {(encounter.enemies ?? []).map((enemy, i) => (
            <div key={i} className="flex-1 bg-slate-800 rounded-lg p-2 border border-slate-700">
              <p className="text-xs font-semibold truncate">{enemy.name}</p>
              <div className="flex items-center gap-1 mt-1">
                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${(enemy.health / enemy.maxHealth) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-red-400 font-mono">{enemy.health}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Survivor HP */}
      <div className="px-6 pb-4">
        <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">
          Your Survivors
        </h3>
        <div className="flex gap-2">
          {activeSurvivors.map(survivor => (
            <div key={survivor.id} className="flex-1 bg-slate-800 rounded-lg p-2 border border-slate-700">
              <p className="text-xs font-semibold truncate">{survivor.name}</p>
              <div className="flex items-center gap-1 mt-1">
                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${((survivor.currentHealth ?? 100) / (survivor.maxHealth ?? 100)) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-green-400 font-mono">
                  {survivor.currentHealth ?? 100}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-700 my-2" />

      {/* Hand header */}
      <div className="px-6 py-3">
        <h2 className="text-lg font-bold">Choose Your Cards</h2>
        <p className="text-sm text-slate-400">
          Select 1 or 2 cards to play this encounter
        </p>
      </div>

      {/* Cards in hand */}
      <div className="flex-1 px-6 space-y-3">
        {hand.map(card => {
          const isSelected = selectedIds.has(card.id);
          const stats = getStatBars(card);

          return (
            <button
              key={card.id}
              onClick={() => toggleCard(card.id)}
              className={`w-full text-left rounded-xl border-2 p-4 transition-all ${getCardColor(card, isSelected)}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{getCardTypeIcon(card)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{card.name}</h3>
                    {isSelected && (
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-semibold">
                        SELECTED
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mt-0.5">{card.description}</p>

                  {/* Stats */}
                  {stats.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {stats.map((stat, i) => (
                        <span
                          key={i}
                          className="text-xs bg-slate-700/50 rounded px-2 py-0.5 font-mono"
                        >
                          {stat.label} +{stat.value}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Special ability */}
                  {card.special && (
                    <p className="text-xs text-amber-400 mt-2">
                      ✨ {card.special.name}: {card.special.description}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {/* Synergy indicator */}
        {synergies.length > 0 && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg px-4 py-3">
            <p className="text-purple-400 text-sm font-semibold mb-1">⚡ Synergy Detected!</p>
            {synergies.map(syn => (
              <p key={syn.id} className="text-purple-300 text-xs">
                {syn.name}: {syn.description}
                {syn.damageBonus > 0 && ` (+${syn.damageBonus} DMG)`}
                {syn.defenseBonus > 0 && ` (+${syn.defenseBonus} DEF)`}
                {syn.healingBonus > 0 && ` (+${syn.healingBonus} HEAL)`}
              </p>
            ))}
          </div>
        )}

        {/* Empty hand warning */}
        {hand.length === 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-6 text-center">
            <p className="text-red-400 text-lg font-bold">Deck Exhausted!</p>
            <p className="text-red-300 text-sm mt-1">
              No cards left to draw. Your team must face this encounter unarmed.
            </p>
          </div>
        )}
      </div>

      {/* Action button */}
      <div className="px-6 pb-8 pt-4">
        <button
          onClick={() => onPlayCards(selectedCards)}
          disabled={!hasSelection}
          className={`w-full py-4 font-bold text-lg rounded-xl transition-all active:scale-[0.98] ${
            hasSelection
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {hasSelection
            ? `⚔️ PLAY ${selectedIds.size} CARD${selectedIds.size > 1 ? 'S' : ''}`
            : 'SELECT CARDS TO PLAY'}
        </button>
      </div>
    </div>
  );
}
