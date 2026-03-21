'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { CardInstance } from '../lib/types';
import { validateDeck } from '../lib/combat-engine';
import { detectSynergies } from '../lib/synergies';
import { PlayingCard } from './PlayingCard';

type Phase = 'survivors' | 'gear' | 'review';

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
  const [phase, setPhase] = useState<Phase>('survivors');
  const [selectedSurvivorIds, setSelectedSurvivorIds] = useState<Set<string>>(new Set());
  const [selectedGearIds, setSelectedGearIds] = useState<Set<string>>(new Set());
  const [launching, setLaunching] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset scroll on phase change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [phase]);

  const allGear = useMemo(() => [...items, ...actions], [items, actions]);
  const availableSurvivors = survivors.filter(c => !c.exhausted);
  const availableGear = allGear.filter(c => !c.exhausted);

  const selectedSurvivors = availableSurvivors.filter(c => selectedSurvivorIds.has(c.id));
  const selectedGear = availableGear.filter(c => selectedGearIds.has(c.id));
  const allSelected = [...selectedSurvivors, ...selectedGear];

  const validation = validateDeck(allSelected);
  const synergies = detectSynergies(allSelected);

  const toggleSurvivor = (card: CardInstance) => {
    if (card.exhausted) return;
    setSelectedSurvivorIds(prev => {
      const next = new Set(prev);
      if (next.has(card.id)) {
        next.delete(card.id);
      } else {
        if (next.size >= 2) return prev;
        next.add(card.id);
      }
      return next;
    });
  };

  const toggleGear = (card: CardInstance) => {
    if (card.exhausted) return;
    setSelectedGearIds(prev => {
      const next = new Set(prev);
      if (next.has(card.id)) {
        next.delete(card.id);
      } else {
        if (next.size >= 5) return prev;
        next.add(card.id);
      }
      return next;
    });
  };

  const handleNext = () => {
    if (phase === 'survivors' && selectedSurvivorIds.size === 2) {
      setPhase('gear');
    } else if (phase === 'gear' && selectedGearIds.size >= 2) {
      setPhase('review');
    }
  };

  const handleBack = () => {
    if (phase === 'gear') {
      setPhase('survivors');
    } else if (phase === 'review') {
      setPhase('gear');
    } else {
      onBack();
    }
  };

  const handleLaunch = () => {
    if (!validation.valid) return;
    setLaunching(true);
    setTimeout(() => onLaunch(allSelected), 400);
  };

  // Phase config
  const phaseConfig = {
    survivors: {
      title: 'Choose Your Survivors',
      subtitle: 'Pick 2 people for the expedition',
      count: `${selectedSurvivorIds.size}/2`,
      ready: selectedSurvivorIds.size === 2,
      buttonText: 'Next: Choose Gear',
      accentColor: 'blue',
    },
    gear: {
      title: 'Choose Your Gear',
      subtitle: 'Pick 2-5 items & actions',
      count: `${selectedGearIds.size}/2-5`,
      ready: selectedGearIds.size >= 2,
      buttonText: 'Review Expedition',
      accentColor: 'amber',
    },
    review: {
      title: 'Ready to Launch',
      subtitle: `${allSelected.length} cards in your deck`,
      count: '',
      ready: validation.valid,
      buttonText: 'Launch Expedition',
      accentColor: 'green',
    },
  };

  const cfg = phaseConfig[phase];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <button onClick={handleBack} className="text-white/30 hover:text-white/60 text-sm mb-4 transition-colors">
          ← {phase === 'survivors' ? 'Home' : 'Back'}
        </button>

        {/* Phase indicators */}
        <div className="flex items-center gap-2 mb-4">
          {(['survivors', 'gear', 'review'] as Phase[]).map((p, i) => {
            const isActive = p === phase;
            const isDone = (p === 'survivors' && (phase === 'gear' || phase === 'review'))
              || (p === 'gear' && phase === 'review');
            return (
              <div key={p} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isDone ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : isActive ? 'bg-white/10 text-white border border-white/20 scale-110'
                  : 'bg-white/5 text-white/20 border border-white/5'
                }`}>
                  {isDone ? '✓' : i + 1}
                </div>
                {i < 2 && <div className={`w-6 h-px ${isDone ? 'bg-green-500/30' : 'bg-white/10'}`} />}
              </div>
            );
          })}
        </div>

        <h1 className="text-2xl font-bold text-white">{cfg.title}</h1>
        <p className="text-white/30 text-sm mt-1">{cfg.subtitle}</p>
      </div>

      {/* SURVIVOR PHASE — horizontal scrollable hand */}
      {phase === 'survivors' && (
        <div className="flex-1 flex flex-col justify-center">
          {/* Selected summary */}
          {selectedSurvivorIds.size > 0 && (
            <div className="px-5 mb-4">
              <div className="flex gap-2">
                {selectedSurvivors.map(s => (
                  <div key={s.id} className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5 flex items-center gap-2">
                    <span className="text-xs font-semibold text-blue-300">{s.name}</span>
                    <button onClick={() => toggleSurvivor(s)} className="text-blue-400/50 hover:text-blue-300 text-xs">✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Card hand — horizontal scroll */}
          <div className="px-2">
            <div
              ref={scrollRef}
              className="flex gap-3 overflow-x-auto pb-4 pt-2 px-3 snap-x snap-mandatory scrollbar-hide"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {availableSurvivors.map(card => (
                <div key={card.id} className="snap-center">
                  <PlayingCard
                    card={card}
                    size="lg"
                    selected={selectedSurvivorIds.has(card.id)}
                    disabled={card.exhausted || (selectedSurvivorIds.size >= 2 && !selectedSurvivorIds.has(card.id))}
                    onClick={() => toggleSurvivor(card)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Card detail — show selected card info */}
          {selectedSurvivors.length > 0 && (
            <div className="px-5 mt-4 space-y-2">
              {selectedSurvivors.map(card => (
                <div key={card.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{card.name}</span>
                    <span className="text-[9px] text-white/30 uppercase font-bold">{card.role}</span>
                  </div>
                  <p className="text-[11px] text-white/40 mt-0.5">{card.description}</p>
                  {card.special && (
                    <p className="text-[10px] text-amber-400/70 mt-1 italic">✦ {card.special.name}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* GEAR PHASE — horizontal scrollable hand */}
      {phase === 'gear' && (
        <div className="flex-1 flex flex-col justify-center">
          {/* Selected gear chips */}
          {selectedGearIds.size > 0 && (
            <div className="px-5 mb-4">
              <div className="flex flex-wrap gap-2">
                {selectedGear.map(g => (
                  <div key={g.id} className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 flex items-center gap-2">
                    <span className="text-xs font-semibold text-amber-300">{g.name}</span>
                    <button onClick={() => toggleGear(g)} className="text-amber-400/50 hover:text-amber-300 text-xs">✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Card hand — horizontal scroll */}
          <div className="px-2">
            <div
              ref={scrollRef}
              className="flex gap-3 overflow-x-auto pb-4 pt-2 px-3 snap-x snap-mandatory scrollbar-hide"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {availableGear.map(card => (
                <div key={card.id} className="snap-center">
                  <PlayingCard
                    card={card}
                    size="lg"
                    selected={selectedGearIds.has(card.id)}
                    disabled={card.exhausted || (selectedGearIds.size >= 5 && !selectedGearIds.has(card.id))}
                    onClick={() => toggleGear(card)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Synergy hints */}
          {synergies.length > 0 && (
            <div className="px-5 mt-3">
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-2">
                <p className="text-[11px] text-purple-300 font-semibold">
                  ⚡ {synergies.map(s => `${s.name}: +${s.damageBonus || s.defenseBonus || s.healingBonus}`).join(' · ')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* REVIEW PHASE — show full deck as a hand */}
      {phase === 'review' && (
        <div className="flex-1 flex flex-col">
          {/* Your team */}
          <div className="px-5 mb-3">
            <p className="text-[10px] text-blue-400/50 uppercase tracking-wider font-semibold mb-2">Team</p>
            <div className="flex gap-2">
              {selectedSurvivors.map(s => (
                <div key={s.id} className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2.5 flex-1">
                  <p className="text-sm font-bold text-white">{s.name}</p>
                  <p className="text-[10px] text-white/30 uppercase">{s.role}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Full deck hand — horizontal scroll */}
          <div className="px-2">
            <p className="text-[10px] text-amber-400/50 uppercase tracking-wider font-semibold mb-2 px-3">Gear ({selectedGear.length})</p>
            <div
              className="flex gap-3 overflow-x-auto pb-4 pt-2 px-3 snap-x snap-mandatory scrollbar-hide"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {selectedGear.map(card => (
                <div key={card.id} className="snap-center">
                  <PlayingCard card={card} size="md" selected />
                </div>
              ))}
            </div>
          </div>

          {/* Synergies */}
          {synergies.length > 0 && (
            <div className="px-5 mt-2">
              <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl px-4 py-2.5">
                <p className="text-[10px] text-purple-400/60 uppercase tracking-wider font-semibold mb-1">
                  ⚡ Synergies Active
                </p>
                {synergies.map(syn => (
                  <p key={syn.id} className="text-[11px] text-purple-300/70">
                    {syn.name}: {syn.description}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Run summary */}
          <div className="px-5 mt-3">
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold text-white">{allSelected.length}</p>
                  <p className="text-[9px] text-white/30 uppercase">Total Cards</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">3</p>
                  <p className="text-[9px] text-white/30 uppercase">Stages</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-purple-400">{synergies.length}</p>
                  <p className="text-[9px] text-white/30 uppercase">Synergies</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom action */}
      <div className="px-5 pb-8 pt-4 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
        {phase !== 'review' && !cfg.ready && (
          <p className="text-center text-xs text-white/20 mb-2">
            {phase === 'survivors'
              ? `Select ${2 - selectedSurvivorIds.size} more survivor${2 - selectedSurvivorIds.size !== 1 ? 's' : ''}`
              : `Select at least ${Math.max(0, 2 - selectedGearIds.size)} more item${Math.max(0, 2 - selectedGearIds.size) !== 1 ? 's' : ''}`
            }
          </p>
        )}

        {phase === 'review' ? (
          <button
            onClick={handleLaunch}
            disabled={!validation.valid || launching}
            className={`w-full py-4 font-bold text-lg rounded-2xl transition-all active:scale-[0.97] ${
              launching
                ? 'bg-green-800 text-green-200 scale-[0.98]'
                : validation.valid
                  ? 'bg-green-700 hover:bg-green-600 text-white shadow-lg shadow-green-900/30'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'
            }`}
          >
            {launching ? 'Launching...' : 'Launch Expedition'}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={!cfg.ready}
            className={`w-full py-4 font-bold text-lg rounded-2xl transition-all active:scale-[0.97] ${
              cfg.ready
                ? phase === 'survivors'
                  ? 'bg-blue-700 hover:bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'bg-amber-700 hover:bg-amber-600 text-white shadow-lg shadow-amber-900/30'
                : 'bg-white/5 text-white/20 cursor-not-allowed'
            }`}
          >
            {cfg.buttonText}
          </button>
        )}
      </div>
    </div>
  );
}
