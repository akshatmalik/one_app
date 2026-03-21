'use client';

import { useState } from 'react';
import { useGame } from './hooks/useGame';
import { CardInstance } from './lib/types';
import { RunScreen } from './components/RunScreen';
import { PrepareRunScreen } from './components/PrepareRunScreen';

type View = 'home' | 'prepare' | 'run';

const MATERIAL_ICONS: Record<string, string> = {
  scrapMetal: '⚙',
  wood: '▤',
  cloth: '◫',
  medicalSupplies: '✚',
};

const MATERIAL_LABELS: Record<string, string> = {
  scrapMetal: 'Scrap',
  wood: 'Wood',
  cloth: 'Cloth',
  medicalSupplies: 'Meds',
};

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
    advanceDay,
    retreatFromExpedition,
    buildHomeBarricade,
    canBuildHomeBarricade,
    resetGame,
  } = useGame();

  const [view, setView] = useState<View>('home');

  const activeView = currentRun ? 'run' : view;

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
    return (
      <div className="fixed inset-0 z-[9999] bg-stone-950 overflow-y-auto">
        <PrepareRunScreen
          survivors={getSurvivors()}
          items={getItems()}
          actions={getActions()}
          onLaunch={async (deck: CardInstance[]) => {
            await startRun(deck);
          }}
          onBack={() => setView('home')}
        />
      </div>
    );
  }

  // === HOME BASE ===
  const availableCards = getAvailableCards();
  const exhaustedCards = gameState.deck.filter(c => c.exhausted);
  const completedRuns = gameState.homeBase.completedRuns;
  const survivors = getSurvivors();
  const items = getItems();
  const actions = getActions();

  const availableSurvivors = availableCards.filter(c => c.type === 'survivor');
  const canLaunch = availableSurvivors.length >= 2
    && availableCards.filter(c => c.type !== 'survivor').length >= 2;

  const totalRuns = completedRuns.length;
  const successfulRuns = completedRuns.filter(r => r.status === 'completed').length;

  const rawMats = gameState.homeBase.rawMaterials;
  const hasMats = rawMats && (Object.values(rawMats) as number[]).some(v => v > 0);
  const barricadeBuilt = (gameState.homeBase.homeBarricadeLevel ?? 0) > 0;
  const canBarricade = canBuildHomeBarricade();

  // Last run info for post-run debrief
  const lastRun = completedRuns[completedRuns.length - 1];
  type MatAcc = { scrapMetal: number; wood: number; cloth: number; medicalSupplies: number };
  const lastRunMatsGained: MatAcc | null = lastRun
    ? (Object.values(lastRun.stagedLoot ?? {}) as Array<{ materials: MatAcc }>).reduce(
        (acc: MatAcc, loot: { materials: MatAcc }) => {
          acc.scrapMetal += loot.materials.scrapMetal;
          acc.wood += loot.materials.wood;
          acc.cloth += loot.materials.cloth;
          acc.medicalSupplies += loot.materials.medicalSupplies;
          return acc;
        },
        { scrapMetal: 0, wood: 0, cloth: 0, medicalSupplies: 0 }
      )
    : null;
  const lastRunHasMats = lastRunMatsGained && Object.values(lastRunMatsGained).some((v: number) => v > 0);
  // Show debrief only if last run was recent (exhausted cards exist — means run just completed)
  const showDebrief = exhaustedCards.length > 0 && lastRun;

  return (
    <div className="fixed inset-0 z-[9999] bg-stone-950 text-stone-300 overflow-y-auto">
      <div className="min-h-full flex flex-col">

        {/* Header */}
        <div className="px-5 pt-8 pb-4 border-b border-stone-900">
          <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-1">
            SAFE HOUSE
          </p>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold text-stone-200 uppercase tracking-wider font-mono">
                SURVIVOR
              </h1>
              <p className="text-stone-700 text-xs font-mono">
                Day {totalRuns + 1}
              </p>
            </div>
            {/* Materials — subtle pill row */}
            {hasMats && (
              <div className="flex gap-1.5 flex-wrap justify-end">
                {Object.entries(rawMats).map(([key, val]) => {
                  if (val === 0) return null;
                  return (
                    <span key={key} className="text-[10px] font-mono text-stone-500 flex items-center gap-0.5">
                      <span className="text-stone-600">{MATERIAL_ICONS[key]}</span>
                      {val}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Status grid */}
        <div className="px-5 py-3 border-b border-stone-900">
          <div className="grid grid-cols-3 gap-2">
            <div className="border border-stone-800 bg-stone-900 p-2.5 text-center">
              <p className="text-xl font-bold text-stone-300 font-mono">{availableCards.length}</p>
              <p className="text-[8px] text-stone-700 font-mono tracking-widest uppercase mt-0.5">READY</p>
            </div>
            <div className="border border-stone-800 bg-stone-900 p-2.5 text-center">
              <p className="text-xl font-bold text-stone-300 font-mono">{exhaustedCards.length}</p>
              <p className="text-[8px] text-stone-700 font-mono tracking-widest uppercase mt-0.5">RECOVERING</p>
            </div>
            <div className="border border-stone-800 bg-stone-900 p-2.5 text-center">
              <p className="text-xl font-bold text-stone-300 font-mono">{successfulRuns}/{totalRuns}</p>
              <p className="text-[8px] text-stone-700 font-mono tracking-widest uppercase mt-0.5">RUNS</p>
            </div>
          </div>
        </div>

        {/* === POST-RUN DEBRIEF === */}
        {showDebrief && (
          <div className="px-5 py-4 border-b border-stone-900 bg-stone-900/30">
            <p className="text-[9px] text-amber-800 font-mono tracking-widest uppercase mb-3">
              ── BACK AT BASE ───────────────────────
            </p>

            {/* Materials brought back */}
            {lastRunHasMats && (
              <div className="mb-3">
                <p className="text-[9px] text-stone-700 font-mono uppercase mb-1.5">SALVAGED</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(lastRunMatsGained!).map(([key, val]) => {
                    if (val === 0) return null;
                    return (
                      <div key={key} className="flex items-center gap-1 border border-stone-800 bg-stone-900 px-2 py-1 rounded">
                        <span className="text-stone-600 text-xs">{MATERIAL_ICONS[key]}</span>
                        <span className="text-[10px] text-stone-400 font-mono">{MATERIAL_LABELS[key]}</span>
                        <span className="text-[10px] text-stone-300 font-mono font-bold ml-0.5">+{val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Building tasks */}
            <p className="text-[9px] text-stone-700 font-mono uppercase mb-1.5">PENDING TASKS</p>

            {/* Barricade */}
            {!barricadeBuilt && (
              <div className="border border-stone-800 bg-stone-900 rounded mb-2">
                <div className="px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-xs text-stone-300 font-mono font-bold">BUILD BARRICADE</p>
                      <p className="text-[9px] text-stone-600 font-mono">+30 defense on next run · costs ▤2 ⚙1</p>
                    </div>
                    <button
                      onClick={buildHomeBarricade}
                      disabled={!canBarricade}
                      className={`px-3 py-1.5 font-mono text-[10px] tracking-widest uppercase border transition-colors ${
                        canBarricade
                          ? 'border-amber-800 text-amber-700 hover:bg-amber-900/20 active:scale-[0.97]'
                          : 'border-stone-800 text-stone-700 cursor-not-allowed'
                      }`}
                    >
                      {canBarricade ? 'BUILD' : 'NEED MATS'}
                    </button>
                  </div>
                  {!canBarricade && (
                    <p className="text-[9px] text-stone-700 font-mono">
                      Need: 2 wood ({rawMats.wood} available) · 1 scrap ({rawMats.scrapMetal} available)
                    </p>
                  )}
                </div>
              </div>
            )}

            {barricadeBuilt && (
              <div className="border border-amber-900/50 bg-amber-950/20 px-3 py-2 rounded mb-2 flex items-center gap-2">
                <span className="text-amber-700 text-sm">▦</span>
                <div>
                  <p className="text-[10px] text-amber-700 font-mono font-bold">BARRICADE READY</p>
                  <p className="text-[9px] text-stone-600 font-mono">Next run starts fortified (+30 DEF)</p>
                </div>
              </div>
            )}

            {/* Rest — advance day */}
            {exhaustedCards.length > 0 && (
              <div className="border border-stone-800 bg-stone-900 rounded">
                <div className="px-3 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-stone-300 font-mono font-bold">REST TEAM</p>
                    <p className="text-[9px] text-stone-600 font-mono">{exhaustedCards.length} recovering · advance day</p>
                  </div>
                  <button
                    onClick={advanceDay}
                    className="px-3 py-1.5 font-mono text-[10px] tracking-widest uppercase border border-stone-700 text-stone-500 hover:text-stone-400 hover:border-stone-600 transition-colors active:scale-[0.97]"
                  >
                    REST
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Survivors roster */}
        <div className="px-5 py-4 border-b border-stone-900">
          <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-2">SURVIVORS</p>
          <div className="space-y-1">
            {survivors.map(s => {
              const hp = s.currentHealth ?? s.maxHealth ?? 100;
              const maxHp = s.maxHealth ?? 100;
              const pct = (hp / maxHp) * 100;
              return (
                <div key={s.id} className={`flex items-center gap-3 border border-stone-800 px-3 py-2 ${s.exhausted ? 'bg-stone-900/40 opacity-50' : 'bg-stone-900'}`}>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-mono uppercase font-bold ${s.exhausted ? 'text-stone-600' : 'text-stone-300'}`}>
                      {s.name}
                    </p>
                    <p className="text-[9px] text-stone-600 font-mono uppercase">
                      {s.role}{s.exhausted ? ` · ${s.recoveryTime}d` : ' · READY'}
                    </p>
                  </div>
                  <div className="w-14 h-0.5 bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${pct > 60 ? 'bg-stone-500' : pct > 30 ? 'bg-amber-700' : 'bg-red-800'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-stone-600 font-mono w-10 text-right tabular-nums">{hp}/{maxHp}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gear inventory */}
        <div className="px-5 py-4 border-b border-stone-900">
          <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-2">
            GEAR ({availableCards.filter(c => c.type !== 'survivor').length} ready)
          </p>
          <div className="flex flex-wrap gap-1">
            {[...items, ...actions].map(card => {
              const isWeapon = card.maxAmmo !== undefined;
              return (
                <div
                  key={card.id}
                  className={`text-[10px] font-mono border px-2 py-1 rounded ${
                    card.exhausted
                      ? 'border-stone-900 text-stone-700 bg-stone-900/30'
                      : 'border-stone-800 text-stone-500 bg-stone-900'
                  }`}
                >
                  <span>{card.name}</span>
                  {isWeapon && card.maxAmmo && (
                    <span className="ml-1 text-stone-600">
                      {Array.from({ length: card.maxAmmo }).map((_, i) => (
                        <span key={i} className="text-[8px]">●</span>
                      ))}
                    </span>
                  )}
                  {card.exhausted && <span className="text-stone-700 ml-1">({card.recoveryTime}d)</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Materials store — full breakdown when not in debrief */}
        {hasMats && !showDebrief && (
          <div className="px-5 py-4 border-b border-stone-900">
            <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-2">MATERIALS</p>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(rawMats).map(([key, val]) => {
                if (val === 0) return null;
                return (
                  <div key={key} className="border border-stone-800 bg-stone-900 px-3 py-2 flex items-center gap-2 rounded">
                    <span className="text-stone-600 text-xs">{MATERIAL_ICONS[key]}</span>
                    <span className="text-[10px] text-stone-500 font-mono">{MATERIAL_LABELS[key]}</span>
                    <span className="ml-auto text-xs font-mono font-bold text-stone-300">{val}</span>
                  </div>
                );
              })}
            </div>

            {/* Barricade option when debrief isn't showing */}
            {!barricadeBuilt && (
              <button
                onClick={buildHomeBarricade}
                disabled={!canBarricade}
                className={`mt-2 w-full py-2 font-mono text-xs tracking-widest uppercase border transition-colors ${
                  canBarricade
                    ? 'border-amber-800 text-amber-700 hover:bg-amber-900/20'
                    : 'border-stone-900 text-stone-700 cursor-not-allowed'
                }`}
              >
                {canBarricade ? '▦ BUILD BARRICADE (▤2 ⚙1)' : '▦ BARRICADE — NEED ▤2 ⚙1'}
              </button>
            )}
            {barricadeBuilt && (
              <div className="mt-2 border border-amber-900/40 px-3 py-1.5 rounded flex items-center gap-2">
                <span className="text-amber-700 text-xs">▦</span>
                <span className="text-[10px] text-amber-700 font-mono">FORTIFIED — next run +30 DEF</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="px-5 py-4 space-y-2">
          <button
            onClick={() => setView('prepare')}
            disabled={!canLaunch}
            className={`w-full py-3.5 font-mono font-bold text-sm tracking-widest uppercase border transition-colors ${
              canLaunch
                ? 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-200 active:scale-[0.98]'
                : 'bg-stone-900 border-stone-900 text-stone-700 cursor-not-allowed'
            }`}
          >
            {canLaunch ? 'PREPARE EXPEDITION →' : 'CARDS RECOVERING...'}
          </button>

          {!canLaunch && (
            <p className="text-[9px] text-stone-700 font-mono text-center">
              Need 2 survivors + 2 gear ready.
            </p>
          )}

          {exhaustedCards.length > 0 && !showDebrief && (
            <button
              onClick={advanceDay}
              className="w-full py-2.5 font-mono text-xs tracking-widest uppercase border border-stone-900 text-stone-600 hover:text-stone-500 hover:border-stone-800 transition-colors"
            >
              ADVANCE DAY ({exhaustedCards.length} recovering)
            </button>
          )}
        </div>

        {/* Run log */}
        {completedRuns.length > 0 && (
          <div className="px-5 pb-4 border-t border-stone-900 mt-2">
            <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-2 mt-4">
              EXPEDITION LOG
            </p>
            <div className="border border-stone-800">
              {completedRuns.slice(-5).reverse().map((run, i) => {
                const stages = run.stages.filter(s => s.result === 'completed').length;
                return (
                  <div
                    key={run.runId}
                    className={`flex items-center gap-3 px-3 py-2 bg-stone-900 ${i > 0 ? 'border-t border-stone-800' : ''}`}
                  >
                    <span className={`text-[10px] font-mono w-3 ${run.status === 'completed' ? 'text-stone-400' : 'text-stone-700'}`}>
                      {run.status === 'completed' ? '✓' : run.isRetreat ? '→' : '✕'}
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono">
                      Run #{completedRuns.length - i}
                    </span>
                    <span className="text-[9px] text-stone-700 font-mono ml-auto">
                      {stages}/{run.totalStages} stages
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reset */}
        <div className="px-5 pb-8 mt-auto">
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
