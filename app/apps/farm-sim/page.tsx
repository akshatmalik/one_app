'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ClipboardList, X } from 'lucide-react';
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
  const waterCapacity = state?.upgrades.includes('bigCan') ? BIG_CAN_MAX_CHARGES : CAN_MAX_CHARGES;

  useEffect(() => { if (!state) setMenuOpen(true); }, [state]);

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
    if (dispatch({ type: 'refillCan', charges: missing })) {
      setWaterCharges(waterCapacity);
      game.flashInfo(`Watering can refilled · ${waterCapacity}/${waterCapacity}`);
      return true;
    }
    return false;
  }, [dispatch, game, waterCapacity, waterCharges]);

  const handleTileSelect = useCallback((idx: number | null, player: PlayerState, anchor?: { x: number; y: number }) => {
    setPlayerState(player);
    setSelectedIdx(idx);
    if (anchor) setSelectionAnchor(anchor);
  }, []);

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
          onAction={handleAction}
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
          dispatch={handleAction}
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
