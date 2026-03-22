'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { CardInstance, RunMode, MomentumCard } from '../lib/types';
import { validateDeck } from '../lib/combat-engine';
import { detectSynergies } from '../lib/synergies';

type Phase = 'survivors' | 'gear' | 'review';

interface PrepareRunScreenProps {
  survivors: CardInstance[];
  items: CardInstance[];
  actions: CardInstance[];
  onLaunch: (deck: CardInstance[], mode: RunMode) => void;
  onBack: () => void;
  momentumCard?: MomentumCard;
  onActivateMomentum?: () => void;
}

function getCardStatLines(card: CardInstance): string {
  const parts: string[] = [];
  if (card.type === 'survivor' && card.attributes) {
    const a = card.attributes;
    if (a.combat > 0) parts.push(`ATK+${a.combat}%`);
    if (a.defense > 0) parts.push(`DEF+${a.defense}%`);
    if (a.healing > 0) parts.push(`HLG+${a.healing}%`);
  }
  if (card.bonusAttributes) {
    const b = card.bonusAttributes;
    if (b.combat && b.combat > 0) parts.push(`DMG+${b.combat}`);
    if (b.defense && b.defense > 0) parts.push(`DEF+${b.defense}%`);
    if (b.healing && b.healing > 0) parts.push(`HLG+${b.healing}`);
  }
  return parts.join(' · ');
}

export function PrepareRunScreen({
  survivors,
  items,
  actions,
  onLaunch,
  onBack,
  momentumCard,
  onActivateMomentum,
}: PrepareRunScreenProps) {
  const [phase, setPhase] = useState<Phase>('survivors');
  const [selectedSurvivorIds, setSelectedSurvivorIds] = useState<Set<string>>(new Set());
  const [selectedGearIds, setSelectedGearIds] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState(0);
  const [launching, setLaunching] = useState(false);
  const [runMode, setRunMode] = useState<RunMode>('siege');

  const allGear = useMemo(() => [...items, ...actions], [items, actions]);
  const availableSurvivors = survivors.filter(c => !c.exhausted);
  const availableGear = allGear.filter(c => !c.exhausted);

  const currentList = phase === 'survivors' ? availableSurvivors : availableGear;
  const currentCard = currentList[Math.min(cursor, currentList.length - 1)];

  const selectedSurvivors = availableSurvivors.filter(c => selectedSurvivorIds.has(c.id));
  const selectedGear = availableGear.filter(c => selectedGearIds.has(c.id));
  const allSelected = [...selectedSurvivors, ...selectedGear];

  const validation = validateDeck(allSelected, runMode);
  const synergies = detectSynergies(allSelected);

  // Reset cursor when phase changes
  useEffect(() => {
    setCursor(0);
  }, [phase]);

  const isCurrentSelected = currentCard
    ? (phase === 'survivors' ? selectedSurvivorIds.has(currentCard.id) : selectedGearIds.has(currentCard.id))
    : false;

  const toggleCurrent = useCallback(() => {
    if (!currentCard) return;
    if (phase === 'survivors') {
      setSelectedSurvivorIds(prev => {
        const next = new Set(prev);
        if (next.has(currentCard.id)) {
          next.delete(currentCard.id);
        } else {
          if (next.size >= 2) return prev;
          next.add(currentCard.id);
        }
        return next;
      });
    } else {
      setSelectedGearIds(prev => {
        const next = new Set(prev);
        if (next.has(currentCard.id)) {
          next.delete(currentCard.id);
        } else {
          const maxGear = runMode === 'sprint' ? 2 : 5;
          if (next.size >= maxGear) return prev;
          next.add(currentCard.id);
        }
        return next;
      });
    }
  }, [currentCard, phase]);

  const goLeft = useCallback(() => setCursor(prev => Math.max(0, prev - 1)), []);
  const goRight = useCallback(() => setCursor(prev => Math.min(currentList.length - 1, prev + 1)), [currentList.length]);

  // Keyboard nav (only in selection phases)
  useEffect(() => {
    if (phase === 'review') return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goLeft(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goRight(); }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCurrent(); }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [phase, goLeft, goRight, toggleCurrent]);

  const handleNext = () => {
    if (phase === 'survivors' && selectedSurvivorIds.size === 2) setPhase('gear');
    else if (phase === 'gear' && selectedGearIds.size >= 2) setPhase('review');
  };

  const handleBack = () => {
    if (phase === 'gear') setPhase('survivors');
    else if (phase === 'review') setPhase('gear');
    else onBack();
  };

  const handleLaunch = () => {
    if (!validation.valid) return;
    setLaunching(true);
    setTimeout(() => onLaunch(allSelected, runMode), 300);
  };

  const survivorReady = selectedSurvivorIds.size === 2;
  const gearReady = selectedGearIds.size >= 2;

  return (
    <div className="min-h-screen flex flex-col bg-stone-950 text-stone-300">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-stone-900">
        <button
          onClick={handleBack}
          className="text-stone-700 hover:text-stone-500 text-xs font-mono tracking-widest uppercase mb-4 transition-colors"
        >
          ← {phase === 'survivors' ? 'ABORT' : 'BACK'}
        </button>

        {/* Phase steps */}
        <div className="flex items-center gap-2 mb-3">
          {(['survivors', 'gear', 'review'] as Phase[]).map((p, i) => {
            const isActive = p === phase;
            const isDone = (p === 'survivors' && (phase === 'gear' || phase === 'review'))
              || (p === 'gear' && phase === 'review');
            return (
              <div key={p} className="flex items-center gap-2">
                <div className={`w-6 h-6 flex items-center justify-center text-[9px] font-mono border transition-all ${
                  isDone ? 'border-stone-600 text-stone-500'
                  : isActive ? 'border-stone-400 text-stone-200'
                  : 'border-stone-800 text-stone-700'
                }`}>
                  {isDone ? '✓' : i + 1}
                </div>
                {i < 2 && <div className={`w-4 h-px ${isDone ? 'bg-stone-600' : 'bg-stone-800'}`} />}
              </div>
            );
          })}
          <span className="text-[9px] text-stone-700 font-mono uppercase tracking-wider ml-2">
            {phase === 'survivors' ? 'WHO GOES' : phase === 'gear' ? 'WHAT THEY CARRY' : 'BRIEFING'}
          </span>
        </div>
      </div>

      {/* SURVIVOR / GEAR SELECTION — arrow key browser */}
      {(phase === 'survivors' || phase === 'gear') && (
        <div className="flex-1 flex flex-col px-5 py-4">
          {/* Selected summary */}
          {phase === 'survivors' && selectedSurvivors.length > 0 && (
            <div className="mb-4">
              <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-1">GOING IN</p>
              <div className="flex flex-wrap gap-1">
                {selectedSurvivors.map(s => (
                  <span key={s.id} className="text-[10px] text-stone-400 font-mono border border-stone-700 px-2 py-0.5 bg-stone-900">
                    {s.name}
                  </span>
                ))}
                <span className="text-[10px] text-stone-700 font-mono py-0.5">
                  ({selectedSurvivorIds.size}/2)
                </span>
              </div>
            </div>
          )}

          {phase === 'gear' && selectedGear.length > 0 && (
            <div className="mb-4">
              <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-1">CARRYING</p>
              <div className="flex flex-wrap gap-1">
                {selectedGear.map(g => (
                  <span key={g.id} className="text-[10px] text-stone-400 font-mono border border-stone-700 px-2 py-0.5 bg-stone-900">
                    {g.name}
                  </span>
                ))}
                <span className="text-[10px] text-stone-700 font-mono py-0.5">
                  ({selectedGearIds.size}/2-5)
                </span>
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col justify-center">
            <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-3 text-center">
              {cursor + 1}/{currentList.length} ·{' '}
              {phase === 'survivors'
                ? `SELECT 2 SURVIVORS (${2 - selectedSurvivorIds.size} remaining)`
                : runMode === 'sprint'
                    ? `SPRINT: SELECT EXACTLY 2 ITEMS (${selectedGearIds.size}/2)`
                    : `SELECT 2-5 ITEMS (${selectedGearIds.size} selected)`
              }
            </p>

            {/* Arrow key card browser */}
            <div className="flex items-center gap-3">
              <button
                onClick={goLeft}
                disabled={cursor === 0}
                className="w-8 h-8 flex items-center justify-center text-stone-700 hover:text-stone-400 disabled:opacity-20 transition-colors flex-shrink-0 font-mono text-lg"
              >
                ←
              </button>

              {currentCard ? (
                <div
                  className={`flex-1 border cursor-pointer transition-all ${
                    isCurrentSelected
                      ? 'border-amber-700 bg-stone-900'
                      : 'border-stone-800 bg-stone-900'
                  }`}
                  onClick={toggleCurrent}
                >
                  <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-stone-800">
                    <span className="text-[9px] text-stone-600 font-mono tracking-widest uppercase">
                      {currentCard.type === 'survivor' ? (currentCard.role ?? 'SURVIVOR').toUpperCase() : (currentCard.itemType ?? 'ITEM').toUpperCase()}
                    </span>
                    {isCurrentSelected && (
                      <span className="text-[9px] text-amber-600 font-mono">✓ SELECTED</span>
                    )}
                  </div>
                  <div className="px-4 py-3">
                    <h2 className="text-lg font-bold text-stone-200 uppercase tracking-wide mb-1">
                      {currentCard.name}
                    </h2>
                    <p className="text-sm text-stone-500 leading-relaxed mb-2">
                      {currentCard.description}
                    </p>
                    {getCardStatLines(currentCard) && (
                      <p className="text-[10px] text-stone-600 font-mono">
                        {getCardStatLines(currentCard)}
                      </p>
                    )}
                    {currentCard.special && (
                      <p className="text-[9px] text-amber-800 font-mono mt-1.5">
                        ✦ {currentCard.special.name}
                      </p>
                    )}
                    {currentCard.type === 'survivor' && currentCard.maxHealth && (
                      <p className="text-[9px] text-stone-600 font-mono mt-1">
                        HP {currentCard.currentHealth ?? currentCard.maxHealth}/{currentCard.maxHealth}
                      </p>
                    )}
                  </div>
                  <div className="px-4 pb-3">
                    <p className="text-[9px] text-stone-700 font-mono text-center">
                      {isCurrentSelected ? 'TAP TO REMOVE · ENTER' : 'TAP TO SELECT · ENTER'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 border border-stone-900 bg-stone-900/50 px-4 py-8 text-center">
                  <p className="text-stone-700 font-mono text-sm">NO CARDS AVAILABLE</p>
                </div>
              )}

              <button
                onClick={goRight}
                disabled={cursor === currentList.length - 1}
                className="w-8 h-8 flex items-center justify-center text-stone-700 hover:text-stone-400 disabled:opacity-20 transition-colors flex-shrink-0 font-mono text-lg"
              >
                →
              </button>
            </div>

            {/* Card position dots */}
            <div className="flex justify-center gap-1 mt-3">
              {currentList.map((c, i) => (
                <div
                  key={c.id}
                  onClick={() => setCursor(i)}
                  className={`cursor-pointer transition-all ${
                    i === cursor ? 'w-4 h-1 bg-stone-500' :
                    (phase === 'survivors' ? selectedSurvivorIds.has(c.id) : selectedGearIds.has(c.id))
                      ? 'w-1.5 h-1 bg-amber-700'
                      : 'w-1.5 h-1 bg-stone-800'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* REVIEW phase */}
      {phase === 'review' && (
        <div className="flex-1 px-5 py-5 space-y-4 overflow-y-auto">
          <div>
            <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-2">TEAM</p>
            <div className="border border-stone-800">
              {selectedSurvivors.map((s, i) => (
                <div key={s.id} className={`px-3 py-2.5 bg-stone-900 ${i > 0 ? 'border-t border-stone-800' : ''}`}>
                  <p className="text-sm text-stone-200 font-mono uppercase font-bold">{s.name}</p>
                  <p className="text-[9px] text-stone-600 font-mono">{getCardStatLines(s)}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-2">GEAR ({selectedGear.length})</p>
            <div className="border border-stone-800">
              {selectedGear.map((g, i) => (
                <div key={g.id} className={`px-3 py-2.5 bg-stone-900 ${i > 0 ? 'border-t border-stone-800' : ''}`}>
                  <p className="text-sm text-stone-200 font-mono uppercase font-bold">{g.name}</p>
                  <p className="text-[9px] text-stone-600 font-mono">{getCardStatLines(g)}</p>
                </div>
              ))}
            </div>
          </div>

          {synergies.length > 0 && (
            <div>
              <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-2">SYNERGIES</p>
              <div className="border border-amber-900 bg-stone-900 px-3 py-2">
                {synergies.map(syn => (
                  <p key={syn.id} className="text-[11px] text-amber-800 font-mono">
                    ⚡ {syn.name}: {syn.description}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Sprint / Siege toggle */}
          <div>
            <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-2">RUN MODE</p>
            <div className="flex gap-2">
              <button
                onClick={() => setRunMode('siege')}
                className={`flex-1 py-2.5 px-3 border font-mono text-xs uppercase tracking-wider transition-colors ${
                  runMode === 'siege'
                    ? 'border-stone-500 text-stone-200 bg-stone-800'
                    : 'border-stone-800 text-stone-700 bg-stone-900 hover:border-stone-700'
                }`}
              >
                SIEGE
              </button>
              <button
                onClick={() => {
                  setRunMode('sprint');
                  // Trim gear to 2 max for sprint
                  if (selectedGearIds.size > 2) {
                    const trimmed = Array.from(selectedGearIds).slice(0, 2);
                    setSelectedGearIds(new Set(trimmed));
                  }
                }}
                className={`flex-1 py-2.5 px-3 border font-mono text-xs uppercase tracking-wider transition-colors ${
                  runMode === 'sprint'
                    ? 'border-amber-700 text-amber-400 bg-stone-800'
                    : 'border-stone-800 text-stone-700 bg-stone-900 hover:border-stone-700'
                }`}
              >
                SPRINT
              </button>
            </div>
            <p className="text-[9px] text-stone-700 font-mono mt-1.5">
              {runMode === 'siege'
                ? 'Full deck · 3 stages · Normal loot · Retreat allowed'
                : 'Max 4 cards · 2 stages · +75% loot · No retreat · No exhaust'
              }
            </p>
          </div>

          {/* Momentum card if available */}
          {momentumCard && !momentumCard.used && (
            <div className="border border-amber-900/50 bg-stone-900 px-3 py-2">
              <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-1">TODAY'S BONUS</p>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-amber-400 font-mono font-bold">{momentumCard.icon} {momentumCard.title}</p>
                  <p className="text-[9px] text-stone-600 font-mono mt-0.5">{momentumCard.description}</p>
                </div>
                {onActivateMomentum && (
                  <button
                    onClick={onActivateMomentum}
                    className="text-[9px] font-mono text-amber-700 border border-amber-900 px-2 py-0.5 hover:text-amber-500 transition-colors whitespace-nowrap"
                  >
                    ACTIVATE
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="border border-stone-800 bg-stone-900 px-3 py-2">
            <div className="flex justify-between text-[10px] font-mono text-stone-600 mb-1">
              <span>TOTAL CARDS</span><span>{allSelected.length}</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-stone-600">
              <span>STAGES</span><span>{runMode === 'sprint' ? 2 : 3}</span>
            </div>
            {runMode === 'sprint' && (
              <div className="flex justify-between text-[10px] font-mono text-amber-800 mt-1">
                <span>LOOT BONUS</span><span>+75%</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom action */}
      <div className="px-5 pb-8 pt-2 bg-stone-950 border-t border-stone-900">
        {phase === 'review' ? (
          <button
            onClick={handleLaunch}
            disabled={!validation.valid || launching}
            className={`w-full py-3.5 font-mono font-bold text-sm tracking-widest uppercase border transition-colors ${
              launching
                ? 'bg-stone-800 border-stone-700 text-stone-500'
                : validation.valid
                  ? 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-200 active:scale-[0.98]'
                  : 'bg-stone-900 border-stone-900 text-stone-700 cursor-not-allowed'
            }`}
          >
            {launching ? 'MOVING OUT...' : 'MOVE OUT →'}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={phase === 'survivors' ? !survivorReady : !gearReady}
            className={`w-full py-3.5 font-mono font-bold text-sm tracking-widest uppercase border transition-colors ${
              (phase === 'survivors' ? survivorReady : gearReady)
                ? 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-200 active:scale-[0.98]'
                : 'bg-stone-900 border-stone-900 text-stone-700 cursor-not-allowed'
            }`}
          >
            {phase === 'survivors'
              ? survivorReady ? 'NEXT: GEAR →' : `NEED ${2 - selectedSurvivorIds.size} MORE`
              : gearReady ? 'REVIEW →' : `NEED ${2 - selectedGearIds.size} MORE`
            }
          </button>
        )}
        {phase !== 'review' && (
          <p className="text-center text-[9px] text-stone-800 font-mono mt-1.5 tracking-wider">
            ← → BROWSE · ENTER SELECT
          </p>
        )}
      </div>
    </div>
  );
}
