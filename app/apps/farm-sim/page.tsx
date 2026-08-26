'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ClipboardList, ListChecks, X } from 'lucide-react';
import { useFarmGame } from './hooks/useFarmGame';
import { PlayerAction, CropId } from './lib/types';
import { HudBar } from './components/HudBar';
import { GameCanvas } from './components/GameCanvas';
import { MarketPanel } from './components/MarketPanel';
import { DayRecap } from './components/DayRecap';
import { MenuScreen } from './components/MenuScreen';
import { DevOverlay } from './components/DevOverlay';
import { TileSheet } from './components/TileSheet';
import { PlayerState, BIG_CAN_MAX_CHARGES, CAN_MAX_CHARGES, standingTileIdx } from './lib/realtime/player';
import type { ToolId } from './lib/realtime/player';
import { GRID_SIZE } from './lib/balance';
import { OpeningObjective } from './components/OpeningObjective';
import { operationsAvailable } from './lib/engine/opening';
import { rowIndices } from './lib/engine/toolProgression';
import { BulkActionBar } from './components/BulkActionBar';
import { WorkQueuePanel } from './components/WorkQueuePanel';
import { makeWorkOrder, sortWorkTargets, WorkOrder, workQueueStorageKey } from './lib/workOrders';

export default function FarmSimPage() {
  const game = useFarmGame();
  const { state, advanceTime, recap } = game;

  const [menuOpen, setMenuOpen]       = useState(false);
  const [showMarket, setShowMarket]   = useState(false);
  const [marketAtStand, setMarketAtStand] = useState(false);
  const [isPaused, setIsPaused]       = useState(false);
  const [timeScale, setTimeScale]     = useState<1 | 2 | 4>(1);

  const [currentTool, setCurrentTool]   = useState<ToolId>('hoe');
  const [selectedCrop, setSelectedCrop] = useState<CropId | null>(null);
  const [waterCharges, setWaterCharges] = useState(CAN_MAX_CHARGES);
  const [playerState, setPlayerState]   = useState<PlayerState | null>(null);
  const [fps, setFps]                   = useState(60);
  const [selectedIdx, setSelectedIdx]   = useState<number | null>(null);
  const [selectionAnchor, setSelectionAnchor] = useState({ x: 195, y: 360 });
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSet, setSelectedSet] = useState<Set<number>>(new Set());
  const [workQueue, setWorkQueue] = useState<WorkOrder[]>([]);
  const [workProgress, setWorkProgress] = useState(0);
  const [queuePaused, setQueuePaused] = useState(false);
  const queueSeedRef = useRef<number | null>(null);
  const workIdRef = useRef(0);
  const waterCapacity = state?.upgrades.includes('bigCan') ? BIG_CAN_MAX_CHARGES : CAN_MAX_CHARGES;

  useEffect(() => { if (!state) setMenuOpen(true); }, [state]);

  useEffect(() => {
    if (!state) return;
    let restored: WorkOrder[] = [];
    try {
      const parsed = JSON.parse(window.localStorage.getItem(workQueueStorageKey(state.seed)) ?? '[]');
      if (Array.isArray(parsed)) restored = parsed.filter((order) => order && typeof order.id === 'string' && Number.isInteger(order.targetIdx));
    } catch {
      restored = [];
    }
    queueSeedRef.current = state.seed;
    setWorkQueue(restored.slice(0, 100));
    setWorkProgress(0);
  }, [state?.seed]);

  useEffect(() => {
    if (!state || queueSeedRef.current !== state.seed) return;
    window.localStorage.setItem(workQueueStorageKey(state.seed), JSON.stringify(workQueue));
  }, [state?.seed, workQueue]);

  const dispatch = useCallback((action: PlayerAction): boolean => {
    return game.dispatch(action);
  }, [game]);

  const handleEndDay = useCallback(() => {
    game.endDay();
  }, [game]);

  const handleToolChange = useCallback((tool: ToolId) => {
    setCurrentTool(tool);
  }, []);

  const handleAction = useCallback((action: PlayerAction): boolean => {
    if (isPaused) {
      game.flashInfo('Resume the game to work this tile.');
      return false;
    }
    if (action.type === 'water' || action.type === 'waterRow') {
      const chargeCost = action.type === 'waterRow' && state
        ? rowIndices(action.idx).filter((idx) => state.tiles[idx].kind === 'tilled').length
        : 1;
      if (waterCharges < chargeCost) {
        game.flashInfo(`The watering can needs ${chargeCost} charges.`);
        return false;
      }
      const ok = dispatch(action);
      if (ok) setWaterCharges((c) => Math.max(0, c - chargeCost));
      return ok;
    }
    return dispatch(action);
  }, [dispatch, game, isPaused, state, waterCharges]);

  const enqueueAction = useCallback((action: PlayerAction, targetIdx: number, batch?: { id: string; label: string }): boolean => {
    if (!state) return false;
    if (workQueue.length >= 100) {
      game.flashInfo('Work queue is full · finish or cancel a task first.');
      return false;
    }
    const id = `${state.seed}-${Date.now()}-${workIdRef.current++}`;
    setWorkQueue((queue) => [...queue, makeWorkOrder(state, action, targetIdx, id, batch)].slice(0, 100));
    setSelectedIdx(null);
    game.flashInfo('Added to work queue');
    return true;
  }, [game, state, workQueue.length]);

  const enqueueMany = useCallback((actions: PlayerAction[], label: string) => {
    if (!state || !playerState || actions.length === 0) return;
    const remaining = Math.max(0, 100 - workQueue.length);
    const byTarget = new Map<number, PlayerAction>();
    actions.forEach((action) => {
      if ('idx' in action) byTarget.set(action.idx, action);
    });
    const start = standingTileIdx(playerState, GRID_SIZE);
    const ordered = sortWorkTargets([...byTarget.keys()], start).slice(0, remaining);
    const batch = { id: `batch-${state.seed}-${Date.now()}-${workIdRef.current++}`, label };
    const orders = ordered.map((idx) => makeWorkOrder(
      state,
      byTarget.get(idx)!,
      idx,
      `${state.seed}-${Date.now()}-${workIdRef.current++}`,
      batch,
    ));
    setWorkQueue((queue) => [...queue, ...orders].slice(0, 100));
    setSelectedSet(new Set());
    setSelectionMode(false);
    game.flashInfo(`${orders.length} action${orders.length === 1 ? '' : 's'} added · route optimized`);
  }, [game, playerState, state, workQueue.length]);

  const handlePlayerMove = useCallback((player: PlayerState) => {
    setPlayerState({ ...player }); // shallow clone so DevOverlay sees fresh object
    setWaterCharges(player.waterCharges);
    // Pull FPS from the console API if available
    if (typeof window !== 'undefined' && (window as any).__farm) {
      setFps((window as any).__farm.getFps());
    }
  }, []);

  const handleRefillWater = useCallback(() => {
    const missing = waterCapacity - waterCharges;
    if (missing < 1) return false;
    if (selectedIdx === null) return false;
    return enqueueAction({ type: 'refillCan', charges: missing }, selectedIdx);
  }, [enqueueAction, selectedIdx, waterCapacity, waterCharges]);

  const handleTileSelect = useCallback((idx: number | null, player: PlayerState, anchor?: { x: number; y: number }) => {
    setPlayerState(player);
    if (selectionMode && idx !== null) {
      setSelectedSet((current) => {
        const next = new Set(current);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        return next;
      });
      setSelectedIdx(null);
      return;
    }
    setSelectedIdx(idx);
    if (anchor) setSelectionAnchor(anchor);
  }, [selectionMode]);

  const handleQueuedAction = useCallback((action: PlayerAction): boolean => {
    if (selectedIdx === null) return false;
    return enqueueAction(action, selectedIdx);
  }, [enqueueAction, selectedIdx]);

  const handleWorkComplete = useCallback((order: WorkOrder) => {
    const ok = handleAction(order.action);
    if (ok && order.action.type === 'refillCan') {
      const refillCharges = order.action.charges;
      setWaterCharges((charges) => Math.min(waterCapacity, charges + refillCharges));
      game.flashInfo(`Watering can refilled · ${waterCapacity}/${waterCapacity}`);
    }
    setWorkQueue((queue) => queue.filter((candidate) => candidate.id !== order.id));
    setWorkProgress(0);
  }, [game, handleAction, waterCapacity]);

  const handleWorkFailed = useCallback((order: WorkOrder, reason: string) => {
    setWorkQueue((queue) => queue.filter((candidate) => candidate.id !== order.id));
    setWorkProgress(0);
    game.flashInfo(`${order.label} skipped · ${reason}`);
  }, [game]);

  const showMenu = menuOpen || !state;
  const simulationPaused = isPaused || showMenu || showMarket || !!recap;
  const standingIdx = playerState ? standingTileIdx(playerState, GRID_SIZE) : null;
  const selectionInRange = selectedIdx !== null && standingIdx !== null
    ? Math.max(
        Math.abs(Math.floor(selectedIdx / GRID_SIZE) - Math.floor(standingIdx / GRID_SIZE)),
        Math.abs(selectedIdx % GRID_SIZE - standingIdx % GRID_SIZE),
      ) <= 1
    : false;

  useEffect(() => {
    if (simulationPaused || !state) return;

    let lastTick = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      advanceTime((now - lastTick) * timeScale);
      lastTick = now;
    }, 250);
    return () => window.clearInterval(timer);
  }, [simulationPaused, advanceTime, state, timeScale]);

  return (
    <div className="w-full h-full bg-black select-none overflow-hidden relative">

      {/* Canvas is always full-screen, HUD floats above it */}
      {state && (
        <GameCanvas
          key={state.seed}
          state={state}
          waterCharges={waterCharges}
          waterCapacity={waterCapacity}
          selectedCrop={selectedCrop}
          activeTool={currentTool}
          buildTool={null}
          selectedIdx={selectedIdx}
          paused={simulationPaused}
          selectionMode={selectionMode}
          workOrder={workQueue[0] ?? null}
          queuedTargets={[...selectedSet, ...workQueue.map((order) => order.targetIdx)]}
          queuePaused={queuePaused}
          onAction={handleAction}
          onQueueAction={(action, targetIdx) => enqueueAction(action, targetIdx)}
          onWorkProgress={(id, progress) => {
            if (workQueue[0]?.id === id) setWorkProgress(progress);
          }}
          onWorkComplete={handleWorkComplete}
          onWorkFailed={handleWorkFailed}
          onToolChange={handleToolChange}
          onTileSelect={handleTileSelect}
          onPlayerMove={handlePlayerMove}
        />
      )}

      {/* HUD overlay — floats over canvas */}
      {state && !showMenu && !recap && (
        <HudBar
          state={state}
          tool={currentTool}
          waterCharges={waterCharges}
          waterCapacity={waterCapacity}
          selectedCrop={selectedCrop}
          paused={isPaused}
          hideDock={showMarket}
          operationsUnlocked={!state.opening || state.opening.complete}
          endDayDisabled={simulationPaused}
          timeScale={timeScale}
          onTogglePause={() => setIsPaused((value) => !value)}
          onCycleSpeed={() => setTimeScale((value) => value === 1 ? 2 : value === 2 ? 4 : 1)}
          onMenu={() => setMenuOpen(true)}
          onToolPick={handleToolChange}
          onCropPick={setSelectedCrop}
          onMarket={() => { setMarketAtStand(false); setShowMarket(true); }}
          onEndDay={handleEndDay}
        />
      )}

      {state && !showMenu && !showMarket && !recap ? <OpeningObjective state={state} /> : null}

      {state && !showMenu && !showMarket && !recap ? (
        <button
          type="button"
          onClick={() => {
            setSelectionMode((value) => !value);
            setSelectedSet(new Set());
            setSelectedIdx(null);
          }}
          className={`fixed bottom-[4.5rem] left-3 z-30 flex min-h-10 items-center gap-2 rounded-md border px-3 text-[11px] font-bold shadow-xl backdrop-blur-xl ${selectionMode ? 'border-[#efd275]/60 bg-[#efd275] text-[#17201d]' : 'border-white/10 bg-[#0d1511]/90 text-white/75'}`}
          aria-pressed={selectionMode}
        >
          <ListChecks size={16} /> {selectionMode ? 'Selecting' : 'Select'}
        </button>
      ) : null}

      {state && selectionMode && !showMenu && !showMarket && !recap ? (
        <BulkActionBar
          state={state}
          selection={[...selectedSet]}
          selectedCrop={selectedCrop}
          onQueue={enqueueMany}
          onClear={() => {
            setSelectedSet(new Set());
            setSelectionMode(false);
          }}
        />
      ) : null}

      {!selectionMode && !showMenu && !showMarket && !recap ? (
        <WorkQueuePanel
          queue={workQueue}
          activeProgress={workProgress}
          paused={queuePaused}
          onTogglePause={() => setQueuePaused((value) => !value)}
          onCancel={(id) => {
            setWorkQueue((queue) => queue.filter((order) => order.id !== id));
            setWorkProgress(0);
          }}
          onClear={() => {
            setWorkQueue([]);
            setWorkProgress(0);
          }}
        />
      ) : null}

      {state && selectedIdx !== null && !showMenu && !showMarket && !recap ? (
        <TileSheet
          state={state}
          idx={selectedIdx}
          inRange={selectionInRange}
          isWalking={!simulationPaused && !!playerState?.isMoving && !selectionInRange}
          waterCharges={waterCharges}
          waterCapacity={waterCapacity}
          selectedCrop={selectedCrop}
          paused={isPaused}
          dispatch={handleQueuedAction}
          onRefillWater={handleRefillWater}
          onOpenMarket={() => { setSelectedIdx(null); setMarketAtStand(true); setShowMarket(true); }}
          anchor={selectionAnchor}
          onClose={() => setSelectedIdx(null)}
        />
      ) : null}

      {/* Toasts */}
      {state && game.error && (
        <div className="absolute top-16 left-1/2 z-40 -translate-x-1/2 rounded-md
                        bg-red-600/90 backdrop-blur-sm px-4 py-2 text-sm font-bold
                        shadow-xl border border-red-400/30 pointer-events-none">
          {game.error}
        </div>
      )}
      {state && game.info && !game.error && (
        <div className="absolute top-16 left-1/2 z-40 -translate-x-1/2 rounded-md
                        bg-emerald-600/90 backdrop-blur-sm px-4 py-2 text-sm font-bold
                        shadow-xl border border-emerald-400/30 pointer-events-none">
          {game.info}
        </div>
      )}

      {/* Farm operations — bottom sheet on mobile, side panel on desktop */}
      {state && showMarket && operationsAvailable(state) && (
        <div className="absolute inset-x-0 bottom-0 top-16 z-30 flex flex-col border-t border-white/10 bg-[#111a15]/97 shadow-2xl backdrop-blur-md md:inset-y-0 md:left-auto md:right-0 md:top-0 md:w-[440px] md:border-l md:border-t-0">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
            <span className="flex items-center gap-2 text-sm font-bold text-white"><ClipboardList size={18} className="text-[#d9b95f]" /> {marketAtStand ? 'Farm-gate stand' : 'Farm operations'}</span>
            <button type="button" onClick={() => setShowMarket(false)} aria-label="Close farm operations"
              className="grid h-9 w-9 place-items-center rounded-md text-white/50 hover:bg-white/10 hover:text-white">
              <X size={18} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <MarketPanel state={state} dispatch={handleAction} standMode={marketAtStand} />
          </div>
        </div>
      )}

      {/* Menu overlay */}
      {showMenu && (
        <MenuScreen
          hasSave={game.hasSave}
          slots={game.slots}
          inGame={!!state}
          error={game.error}
          onNewGame={(seed) => {
            game.startNewGame(seed);
            setIsPaused(false);
            setMenuOpen(false);
            setShowMarket(false);
            setMarketAtStand(false);
            setSelectedIdx(null);
            setSelectedCrop(null);
            setCurrentTool('hoe');
            setWaterCharges(CAN_MAX_CHARGES);
          }}
          onContinue={() => {
            if (game.continueGame()) {
              setIsPaused(false);
              setMenuOpen(false);
            }
          }}
          onLoadSlot={(slot) => {
            if (game.loadSlot(slot)) {
              setIsPaused(false);
              setMenuOpen(false);
            }
          }}
          onSaveSlot={game.saveToSlot}
          onDeleteSlot={game.deleteSlot}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {/* Dev overlay — toggle with backtick ` */}
      {state && <DevOverlay state={state} player={playerState} fps={fps} />}

      {game.recap && <DayRecap recap={game.recap} onClose={game.dismissRecap} />}

      <Link href="/" className="sr-only">Back to hub</Link>
    </div>
  );
}
