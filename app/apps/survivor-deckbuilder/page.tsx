'use client';

import { useState, useCallback } from 'react';
import { useGame } from './hooks/useGame';
import { CardInstance, SurvivorAssignment, RunMode } from './lib/types';
import { RunScreen } from './components/RunScreen';
import { PrepareRunScreen } from './components/PrepareRunScreen';
import { CompoundView } from './components/CompoundView';

type View = 'home' | 'prepare' | 'run' | 'compound';

const MAT_ICONS: Record<string, string> = {
  scrapMetal: '⚙',
  wood: '▤',
  cloth: '◫',
  medicalSupplies: '✚',
  food: '◆',
};

const ASSIGNMENT_CONFIG: Record<NonNullable<SurvivorAssignment>, { label: string; icon: string; color: string }> = {
  guard:     { label: 'Guard',     icon: '🛡', color: 'text-red-600 border-red-900/60' },
  garden:    { label: 'Garden',    icon: '🌱', color: 'text-green-600 border-green-900/60' },
  workshop:  { label: 'Workshop',  icon: '⚙', color: 'text-amber-600 border-amber-900/60' },
  infirmary: { label: 'Infirmary', icon: '✚', color: 'text-emerald-600 border-emerald-900/60' },
  scavenge:  { label: 'Scavenge',  icon: '◎', color: 'text-sky-600 border-sky-900/60' },
  rest:      { label: 'Rest',      icon: '◒', color: 'text-stone-500 border-stone-700' },
};

const CONDITION_CONFIG = {
  healthy:  { icon: '', color: '' },
  hungry:   { icon: '⚠', color: 'text-amber-600' },
  starving: { icon: '☠', color: 'text-red-600' },
};

interface NightReport {
  day: number;
  foodConsumed: number;
  shortfall: number;
  raidHappened: boolean;
  raidResult: 'none' | 'defended' | 'damaged';
  productionsCompleted: number;
  scavengeGain: number;
}

export default function SurvivorDeckBuilder() {
  const {
    gameState,
    currentRun,
    loading,
    getSurvivors,
    getItems,
    getActions,
    getAvailableCards,
    startRun,
    enterCombat,
    playCards,
    continueAfterCombat,
    advanceToNextStage,
    completeRun,
    retreatFromExpedition,
    buildHomeBarricade,
    canBuildHomeBarricade,
    endDay,
    assignSurvivor,
    startGarden,
    activateMomentumCard,
    splitParty,
    resetGame,
  } = useGame();

  const [view, setView] = useState<View>('home');
  const [nightReport, setNightReport] = useState<NightReport | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [gardenSurvivorId, setGardenSurvivorId] = useState<string | null>(null);

  const activeView = currentRun ? 'run' : view;

  const handleEndDay = useCallback(async () => {
    const report = await endDay();
    setNightReport(report);
    setAssigningId(null);
  }, [endDay]);

  const handleAssign = useCallback(async (survivorId: string, assignment: SurvivorAssignment) => {
    await assignSurvivor(survivorId, assignment);
    setAssigningId(null);
  }, [assignSurvivor]);

  const handleStartGarden = useCallback(async (survivorId: string, seedId: string) => {
    await startGarden(survivorId, seedId);
    setGardenSurvivorId(null);
  }, [startGarden]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-stone-950 flex items-center justify-center">
        <p className="text-stone-700 font-mono text-xs tracking-widest uppercase animate-pulse">
          LOADING...
        </p>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="fixed inset-0 z-[9999] bg-stone-950 flex flex-col items-center justify-center px-8">
        <p className="text-red-900 font-mono text-sm mb-4">SYSTEM FAILURE</p>
        <button
          onClick={resetGame}
          className="px-6 py-2 border border-stone-700 text-stone-400 font-mono text-xs tracking-widest uppercase hover:bg-stone-900 transition-colors"
        >
          RESET
        </button>
      </div>
    );
  }

  // === RUN VIEW ===
  if (activeView === 'run' && currentRun) {
    return (
      <div className="fixed inset-0 z-[9999] bg-stone-950 overflow-y-auto">
        <RunScreen
          run={currentRun}
          onEnterCombat={enterCombat}
          onPlayCards={async (cards: CardInstance[]) => {
            await playCards(cards);
          }}
          onContinueAfterCombat={continueAfterCombat}
          onAdvanceStage={async () => {
            await advanceToNextStage();
          }}
          onCompleteRun={async () => {
            await completeRun();
            setView('home');
          }}
          onRetreat={async () => {
            await retreatFromExpedition();
          }}
        />
      </div>
    );
  }

  // === PREPARE VIEW ===
  if (activeView === 'prepare') {
    const unassignedSurvivors = getSurvivors().filter(s => !s.assignment || s.assignment === null);
    const unassignedItems = getItems().filter(c => !c.exhausted);
    const unassignedActions = getActions().filter(c => !c.exhausted);
    return (
      <div className="fixed inset-0 z-[9999] bg-stone-950 overflow-y-auto">
        <PrepareRunScreen
          survivors={unassignedSurvivors}
          items={unassignedItems}
          actions={unassignedActions}
          onLaunch={async (deck: CardInstance[], mode: RunMode) => {
            await startRun(deck, mode);
          }}
          onBack={() => setView('home')}
          momentumCard={gameState.homeBase.momentumCard}
          onActivateMomentum={activateMomentumCard}
        />
      </div>
    );
  }

  // === COMPOUND VIEW ===
  if (activeView === 'compound') {
    return (
      <div className="fixed inset-0 z-[9999] bg-stone-950 overflow-y-auto">
        <CompoundView
          deck={gameState.deck}
          rawMaterials={gameState.homeBase.rawMaterials}
          onBack={() => setView('home')}
        />
      </div>
    );
  }

  // === HOME BASE ===
  const hb = gameState.homeBase;
  const survivors = getSurvivors();
  const items = getItems();
  const actions = getActions();
  const availableCards = getAvailableCards();
  const exhaustedCards = gameState.deck.filter(c => c.exhausted);
  const completedRuns = hb.completedRuns;
  const rawMats = hb.rawMaterials;
  const barricadeBuilt = (hb.homeBarricadeLevel ?? 0) > 0;
  const canBarricade = canBuildHomeBarricade();

  // Seeds in inventory
  const seedCards = gameState.deck.filter(c => c.category === 'seed' && !c.exhausted);

  // Survivors available for expedition (not assigned)
  const freeSurvivors = survivors.filter(s => !s.assignment && !s.exhausted);
  const freeItems = availableCards.filter(c => c.type !== 'survivor');
  const canLaunch = freeSurvivors.length >= 2 && freeItems.length >= 2;

  // Active production
  const activeProductions = hb.productionChains.filter(p => !p.completed);
  const totalRuns = completedRuns.length;
  const successfulRuns = completedRuns.filter(r => r.status === 'completed').length;

  const moralePct = hb.morale ?? 70;
  const basePct = hb.baseHP ?? 100;
  const foodCount = hb.food ?? 0;
  const currentDay = hb.day ?? 1;
  const foodNeeded = survivors.length;
  const foodColor = foodCount >= foodNeeded * 2 ? 'text-green-500' : foodCount >= foodNeeded ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="fixed inset-0 z-[9999] bg-stone-950 text-stone-300 overflow-y-auto">
      <div className="min-h-full flex flex-col pb-6">

        {/* ── HEADER ── */}
        <div className="px-5 pt-6 pb-3 border-b border-stone-900">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[8px] text-stone-700 font-mono tracking-widest uppercase">SAFE HOUSE</p>
              <h1 className="text-xl font-bold text-stone-200 uppercase tracking-wider font-mono leading-none mt-0.5">
                DAY {currentDay}
              </h1>
              <p className="text-[9px] text-stone-600 font-mono mt-0.5">
                {successfulRuns}/{totalRuns} expeditions
              </p>
            </div>
            {/* Food — prominent */}
            <div className="text-right">
              <p className={`text-3xl font-bold font-mono leading-none ${foodColor}`}>{foodCount}</p>
              <p className="text-[9px] text-stone-600 font-mono">FOOD</p>
              <p className="text-[8px] text-stone-700 font-mono">needs {foodNeeded}/day</p>
            </div>
          </div>

          {/* Vital bars */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[8px] text-stone-700 font-mono uppercase">BASE</span>
                <span className="text-[8px] text-stone-600 font-mono">{basePct}</span>
              </div>
              <div className="h-0.5 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${basePct > 60 ? 'bg-stone-500' : basePct > 30 ? 'bg-amber-700' : 'bg-red-700'}`}
                  style={{ width: `${basePct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[8px] text-stone-700 font-mono uppercase">MORALE</span>
                <span className="text-[8px] text-stone-600 font-mono">{moralePct}</span>
              </div>
              <div className="h-0.5 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${moralePct > 60 ? 'bg-emerald-700' : moralePct > 30 ? 'bg-amber-700' : 'bg-red-700'}`}
                  style={{ width: `${moralePct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── NIGHT REPORT ── */}
        {nightReport && (
          <div className="mx-5 mt-3 border border-stone-700 bg-stone-900/60 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] text-stone-500 font-mono uppercase tracking-widest">
                NIGHT REPORT — Day {nightReport.day}
              </p>
              <button
                onClick={() => setNightReport(null)}
                className="text-[9px] text-stone-700 font-mono hover:text-stone-500"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1 text-[10px] font-mono">
              <p className={nightReport.shortfall > 0 ? 'text-amber-600' : 'text-stone-500'}>
                ◆ Food: {nightReport.shortfall > 0 ? `−${nightReport.shortfall} short` : `−${nightReport.foodConsumed} consumed`}
              </p>
              {nightReport.raidHappened && (
                <p className={nightReport.raidResult === 'defended' ? 'text-green-600' : 'text-red-600'}>
                  {nightReport.raidResult === 'defended' ? '🛡 Raid repelled' : '💥 Raid hit base −15 HP'}
                </p>
              )}
              {nightReport.productionsCompleted > 0 && (
                <p className="text-green-600">🌱 {nightReport.productionsCompleted} item(s) harvested</p>
              )}
              {nightReport.scavengeGain > 0 && (
                <p className="text-sky-600">◎ Scavenged +{nightReport.scavengeGain} food</p>
              )}
            </div>
          </div>
        )}

        {/* ── DAILY EVENT CARD ── */}
        {hb.currentEvent && (
          <div className={`mx-5 mt-3 border rounded p-3 ${
            hb.currentEvent.type === 'threat' ? 'border-red-900/60 bg-red-950/20' :
            hb.currentEvent.type === 'opportunity' ? 'border-amber-900/60 bg-amber-950/20' :
            'border-violet-900/60 bg-violet-950/20'
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className={`text-[8px] font-mono tracking-widest uppercase mb-1 ${
                  hb.currentEvent.type === 'threat' ? 'text-red-800' :
                  hb.currentEvent.type === 'opportunity' ? 'text-amber-800' :
                  'text-violet-800'
                }`}>
                  {hb.currentEvent.type === 'threat' ? '⚠ THREAT' :
                   hb.currentEvent.type === 'opportunity' ? '◆ OPPORTUNITY' :
                   '? CHOICE'} · TODAY ONLY
                </p>
                <p className="text-xs font-mono font-bold text-stone-300 uppercase">{hb.currentEvent.title}</p>
                <p className="text-[9px] text-stone-600 font-mono mt-0.5">{hb.currentEvent.description}</p>
              </div>
              {hb.currentEvent.actionLabel && (
                <button className={`text-[9px] font-mono border px-2 py-1 transition-colors whitespace-nowrap ${
                  hb.currentEvent.type === 'threat' ? 'border-red-900 text-red-600 hover:text-red-400' :
                  hb.currentEvent.type === 'opportunity' ? 'border-amber-900 text-amber-600 hover:text-amber-400' :
                  'border-violet-900 text-violet-600 hover:text-violet-400'
                }`}>
                  {hb.currentEvent.actionLabel}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── MOMENTUM CARD ── */}
        {hb.momentumCard && !hb.momentumCard.used && (
          <div className="mx-5 mt-2 border border-stone-700/60 bg-stone-900/40 rounded px-3 py-2 flex items-center gap-3">
            <span className="text-base opacity-70">{hb.momentumCard.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[8px] font-mono tracking-widest uppercase text-stone-700 mb-0.5">TODAY'S BONUS</p>
              <p className="text-xs font-mono font-bold text-stone-300 uppercase">{hb.momentumCard.title}</p>
              <p className="text-[9px] text-stone-600 font-mono">{hb.momentumCard.description}</p>
            </div>
            <span className="text-[8px] font-mono text-stone-700 uppercase">ACTIVATE IN PREP</span>
          </div>
        )}

        {/* ── SURVIVORS + ASSIGNMENTS ── */}
        <div className="px-5 pt-4">
          <p className="text-[8px] text-stone-700 font-mono tracking-widest uppercase mb-2">SURVIVORS</p>
          <div className="space-y-1.5">
            {survivors.map(s => {
              const hp = s.currentHealth ?? s.maxHealth ?? 100;
              const maxHp = s.maxHealth ?? 100;
              const pct = (hp / maxHp) * 100;
              const assignment = s.assignment as NonNullable<SurvivorAssignment> | null;
              const assConf = assignment ? ASSIGNMENT_CONFIG[assignment] : null;
              const condConf = CONDITION_CONFIG[(s.condition ?? 'healthy') as keyof typeof CONDITION_CONFIG];
              const isExpanded = assigningId === s.id;
              const isGardenSetup = gardenSurvivorId === s.id;
              const inProduction = !!s.assignedToProduction;

              return (
                <div key={s.id}>
                  <div
                    className={`border rounded overflow-hidden ${
                      s.exhausted ? 'border-stone-800 bg-stone-900/30 opacity-60' : 'border-stone-800 bg-stone-900'
                    }`}
                  >
                    <div className="px-3 py-2 flex items-center gap-3">
                      {/* Name + role */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-mono font-bold text-stone-300 uppercase truncate">
                            {s.name?.split(' ')[0]}
                          </p>
                          {condConf.icon && (
                            <span className={`text-[10px] ${condConf.color}`}>{condConf.icon}</span>
                          )}
                        </div>
                        <p className="text-[8px] text-stone-600 font-mono uppercase">
                          {s.role} {s.exhausted ? `· ${s.recoveryTime}d` : ''}
                        </p>
                      </div>

                      {/* HP bar */}
                      <div className="w-12 h-0.5 bg-stone-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${pct > 60 ? 'bg-stone-500' : pct > 30 ? 'bg-amber-700' : 'bg-red-800'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-stone-600 font-mono tabular-nums w-8 text-right">{hp}</span>

                      {/* Assignment badge / button */}
                      {!s.exhausted && !inProduction && (
                        <button
                          onClick={() => setAssigningId(isExpanded ? null : s.id)}
                          className={`text-[9px] font-mono border px-2 py-0.5 rounded transition-colors ${
                            assConf
                              ? assConf.color
                              : 'border-stone-800 text-stone-600 hover:border-stone-700'
                          }`}
                        >
                          {assConf ? `${assConf.icon} ${assConf.label}` : '+ ASSIGN'}
                        </button>
                      )}
                      {inProduction && (
                        <span className="text-[9px] font-mono text-green-700 border border-green-900/40 px-2 py-0.5 rounded">
                          🌱 WORKING
                        </span>
                      )}
                    </div>

                    {/* Assignment panel */}
                    {isExpanded && !s.exhausted && !inProduction && (
                      <div className="border-t border-stone-800 bg-stone-950/40 px-3 py-2">
                        <div className="flex flex-wrap gap-1.5">
                          {(Object.keys(ASSIGNMENT_CONFIG) as NonNullable<SurvivorAssignment>[]).map(asgn => {
                            const conf = ASSIGNMENT_CONFIG[asgn];
                            const isGarden = asgn === 'garden';
                            const hasSeed = seedCards.length > 0;
                            const isActive = s.assignment === asgn;
                            return (
                              <button
                                key={asgn}
                                disabled={isGarden && !hasSeed}
                                onClick={() => {
                                  if (isActive) {
                                    handleAssign(s.id, null);
                                  } else if (isGarden && hasSeed) {
                                    setGardenSurvivorId(s.id);
                                    setAssigningId(null);
                                  } else {
                                    handleAssign(s.id, asgn);
                                  }
                                }}
                                className={`text-[9px] font-mono border px-2 py-1 rounded transition-colors ${
                                  isActive
                                    ? conf.color + ' bg-stone-800'
                                    : isGarden && !hasSeed
                                      ? 'border-stone-900 text-stone-700 cursor-not-allowed'
                                      : 'border-stone-800 text-stone-500 hover:text-stone-300 hover:border-stone-600'
                                }`}
                              >
                                {conf.icon} {conf.label}
                                {isGarden && !hasSeed && ' (no seeds)'}
                              </button>
                            );
                          })}
                          {s.assignment && (
                            <button
                              onClick={() => handleAssign(s.id, null)}
                              className="text-[9px] font-mono border border-stone-800 text-stone-600 px-2 py-1 rounded hover:text-stone-400"
                            >
                              ✕ CLEAR
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Garden seed selection */}
                    {isGardenSetup && (
                      <div className="border-t border-stone-800 bg-stone-950/40 px-3 py-2">
                        <p className="text-[8px] text-stone-600 font-mono uppercase mb-1.5">CHOOSE SEED</p>
                        <div className="flex flex-wrap gap-1.5">
                          {seedCards.map(seed => (
                            <button
                              key={seed.id}
                              onClick={() => handleStartGarden(s.id, seed.id)}
                              className="text-[9px] font-mono border border-green-900/50 text-green-700 px-2 py-1 rounded hover:bg-green-950/20"
                            >
                              🌱 {seed.name}
                            </button>
                          ))}
                          <button
                            onClick={() => setGardenSurvivorId(null)}
                            className="text-[9px] font-mono border border-stone-800 text-stone-600 px-2 py-1 rounded"
                          >
                            CANCEL
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── ACTIVE PRODUCTION ── */}
        {activeProductions.length > 0 && (
          <div className="px-5 pt-4">
            <p className="text-[8px] text-stone-700 font-mono tracking-widest uppercase mb-2">PRODUCTION</p>
            <div className="space-y-1.5">
              {activeProductions.map(chain => {
                const elapsed = currentDay - chain.startDay;
                const pct = Math.min(100, (elapsed / chain.daysRequired) * 100);
                const remaining = Math.max(0, chain.daysRequired - elapsed);
                const producer = survivors.find(s => s.id === chain.survivorId);
                return (
                  <div key={chain.id} className="border border-green-900/40 bg-green-950/10 px-3 py-2 rounded">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] text-green-700 font-mono font-bold uppercase">
                        🌱 {chain.type} · {producer?.name?.split(' ')[0] ?? '?'}
                      </p>
                      <p className="text-[9px] text-stone-600 font-mono">{remaining}d left</p>
                    </div>
                    <div className="h-0.5 bg-stone-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-800 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── BARRICADE STATUS ── */}
        {barricadeBuilt && (
          <div className="px-5 pt-3">
            <div className="border border-amber-900/40 bg-amber-950/10 px-3 py-2 rounded flex items-center gap-2">
              <span className="text-amber-700 text-sm">▦</span>
              <p className="text-[10px] text-amber-700 font-mono">FORTIFIED · next run +30 DEF</p>
            </div>
          </div>
        )}

        {/* ── MATERIALS ── */}
        <div className="px-5 pt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[8px] text-stone-700 font-mono tracking-widest uppercase">STORES</p>
            <button
              onClick={() => setView('compound')}
              className="text-[8px] text-stone-600 font-mono uppercase hover:text-stone-400 transition-colors"
            >
              COMPOUND →
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(rawMats).map(([key, val]) => {
              if ((val ?? 0) === 0) return null;
              return (
                <div key={key} className="flex items-center gap-1 border border-stone-800 bg-stone-900 px-2 py-1.5 rounded">
                  <span className="text-stone-600 text-xs">{MAT_ICONS[key] ?? '?'}</span>
                  <span className="text-xs font-mono font-bold text-stone-300">{val}</span>
                </div>
              );
            })}
            {Object.values(rawMats).every(v => (v ?? 0) === 0) && (
              <p className="text-[9px] text-stone-700 font-mono">No materials</p>
            )}
          </div>

          {/* Barricade build option */}
          {!barricadeBuilt && canBarricade && (
            <button
              onClick={buildHomeBarricade}
              className="mt-2 w-full py-2 font-mono text-xs tracking-widest uppercase border border-amber-900/60 text-amber-800 hover:bg-amber-950/20 transition-colors rounded"
            >
              ▦ BUILD BARRICADE (▤2 ⚙1)
            </button>
          )}
        </div>

        {/* ── GEAR OVERVIEW ── */}
        {(items.length > 0 || actions.length > 0) && (
          <div className="px-5 pt-4">
            <p className="text-[8px] text-stone-700 font-mono tracking-widest uppercase mb-2">
              GEAR ({freeItems.length} ready)
            </p>
            <div className="flex flex-wrap gap-1">
              {[...items, ...actions].slice(0, 8).map(card => (
                <div
                  key={card.id}
                  className={`text-[9px] font-mono border px-1.5 py-0.5 rounded ${
                    card.exhausted
                      ? 'border-stone-900 text-stone-700'
                      : 'border-stone-800 text-stone-500'
                  }`}
                >
                  {card.name?.split(' ')[0]}
                  {card.exhausted && <span className="text-stone-700 ml-0.5">({card.recoveryTime}d)</span>}
                  {card.maxAmmo !== undefined && !card.exhausted && (
                    <span className="ml-0.5 text-red-900">
                      {Array.from({ length: Math.min(card.ammo ?? card.maxAmmo, 6) }).map((_, i) => (
                        <span key={i} className="text-[7px]">●</span>
                      ))}
                    </span>
                  )}
                </div>
              ))}
              {[...items, ...actions].length > 8 && (
                <span className="text-[9px] text-stone-700 font-mono px-1.5 py-0.5">
                  +{[...items, ...actions].length - 8} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── ACTIONS ── */}
        <div className="px-5 pt-5 space-y-2">
          {/* End Day — primary CTA */}
          <button
            onClick={handleEndDay}
            className="w-full py-3.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-mono font-bold text-sm tracking-widest uppercase transition-colors active:scale-[0.98]"
          >
            END DAY →
          </button>

          {/* Launch expedition */}
          <button
            onClick={() => setView('prepare')}
            disabled={!canLaunch}
            className={`w-full py-3 font-mono font-bold text-sm tracking-widest uppercase border transition-colors ${
              canLaunch
                ? 'border-stone-600 text-stone-400 hover:bg-stone-900 active:scale-[0.98]'
                : 'border-stone-900 text-stone-700 cursor-not-allowed'
            }`}
          >
            {canLaunch ? 'LAUNCH EXPEDITION' : 'EXPEDITION UNAVAILABLE'}
          </button>

          {!canLaunch && (
            <p className="text-[8px] text-stone-700 font-mono text-center">
              {freeSurvivors.length < 2
                ? `${freeSurvivors.length}/2 survivors free (${survivors.filter(s => s.assignment).length} assigned)`
                : 'Need 2 gear cards ready'}
            </p>
          )}
        </div>

        {/* ── RUN LOG ── */}
        {completedRuns.length > 0 && (
          <div className="px-5 pt-5 border-t border-stone-900 mt-5">
            <p className="text-[8px] text-stone-700 font-mono tracking-widest uppercase mb-2">LOG</p>
            <div className="border border-stone-800">
              {completedRuns.slice(-4).reverse().map((run, i) => {
                const stages = run.stages.filter(s => s.result === 'completed').length;
                return (
                  <div
                    key={run.runId}
                    className={`flex items-center gap-3 px-3 py-2 bg-stone-900 ${i > 0 ? 'border-t border-stone-800' : ''}`}
                  >
                    <span className={`text-[10px] font-mono ${run.status === 'completed' ? 'text-stone-400' : 'text-stone-700'}`}>
                      {run.status === 'completed' ? '✓' : run.isRetreat ? '→' : '✕'}
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono">Run #{completedRuns.length - i}</span>
                    <span className="text-[9px] text-stone-700 font-mono ml-auto">{stages}/{run.totalStages}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reset */}
        <div className="px-5 pt-4 mt-auto">
          <button
            onClick={resetGame}
            className="w-full py-2 text-[9px] text-stone-800 hover:text-stone-700 font-mono tracking-widest uppercase transition-colors"
          >
            RESET GAME
          </button>
        </div>

      </div>
    </div>
  );
}
