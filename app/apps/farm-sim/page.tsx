'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ClipboardList, Hammer, X } from 'lucide-react';
import { useFarmGame } from './hooks/useFarmGame';
import { PlayerAction, CropId } from './lib/types';
import { HudBar } from './components/HudBar';
import { GameCanvas } from './components/GameCanvas';
import { MarketPanel } from './components/MarketPanel';
import { BuildPanel, BuildTool } from './components/BuildPanel';
import { DayRecap } from './components/DayRecap';
import { MenuScreen } from './components/MenuScreen';
import { DevOverlay } from './components/DevOverlay';
import { PlayerState, facingTileIdx, CAN_MAX_CHARGES } from './lib/realtime/player';
import type { ToolId } from './lib/realtime/player';
import { GRID_SIZE } from './lib/balance';

export default function FarmSimPage() {
  const game = useFarmGame();
  const { state, advanceTime, recap } = game;

  const [menuOpen, setMenuOpen]       = useState(false);
  const [showMarket, setShowMarket]   = useState(false);
  const [showBuild, setShowBuild]     = useState(false);
  const [buildTool, setBuildTool]     = useState<BuildTool | null>(null);

  const [currentTool, setCurrentTool]   = useState<ToolId>('hoe');
  const [selectedCrop, setSelectedCrop] = useState<CropId | null>(null);
  const [waterCharges, setWaterCharges] = useState(CAN_MAX_CHARGES);
  const [playerState, setPlayerState]   = useState<PlayerState | null>(null);
  const [fps, setFps]                   = useState(60);

  useEffect(() => { if (!state) setMenuOpen(true); }, [state]);

  const dispatch = useCallback((action: PlayerAction): boolean => {
    const ok = game.dispatch(action);
    if (ok && state) {
      const expected: Record<number, PlayerAction['type']> = {
        0: 'till', 1: 'plant', 2: 'water', 4: 'sell',
      };
      if (expected[state.tutorialStep] === action.type)
        game.advanceTutorial(state.tutorialStep);
    }
    return ok;
  }, [game, state]);

  const handleEndDay = useCallback(() => {
    if (state?.tutorialStep === 3) game.advanceTutorial(3);
    game.endDay();
  }, [game, state]);

  const handleToolChange = useCallback((tool: ToolId) => {
    setCurrentTool(tool);
    if (tool === 'builder') setShowBuild(true);
    else {
      setShowBuild(false);
      setBuildTool(null);
    }
  }, []);

  const handleAction = useCallback((action: PlayerAction): boolean => {
    if (action.type === 'water') {
      const ok = dispatch(action);
      if (ok) setWaterCharges((c) => Math.max(0, c - 1));
      return ok;
    }
    return dispatch(action);
  }, [dispatch]);

  const handlePlayerMove = useCallback((player: PlayerState) => {
    setPlayerState({ ...player }); // shallow clone so DevOverlay sees fresh object
    setWaterCharges(player.waterCharges);
    // Pull FPS from the console API if available
    if (typeof window !== 'undefined' && (window as any).__farm) {
      setFps((window as any).__farm.getFps());
    }
  }, []);

  const facingIdx = playerState ? facingTileIdx(playerState, GRID_SIZE) : null;
  const showMenu = menuOpen || !state;

  useEffect(() => {
    const paused = showMenu || showMarket || showBuild || !!recap || !state;
    if (paused) return;

    let lastTick = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      advanceTime(now - lastTick);
      lastTick = now;
    }, 250);
    return () => window.clearInterval(timer);
  }, [showMenu, showMarket, showBuild, recap, advanceTime, state]);

  return (
    <div className="w-full h-full bg-black select-none overflow-hidden relative">

      {/* Canvas is always full-screen, HUD floats above it */}
      {state && (
        <GameCanvas
          state={state}
          selectedCrop={selectedCrop}
          activeTool={currentTool}
          buildTool={buildTool}
          onAction={handleAction}
          onToolChange={handleToolChange}
          onPlayerMove={handlePlayerMove}
        />
      )}

      {/* HUD overlay — floats over canvas */}
      {state && (
        <HudBar
          state={state}
          tool={currentTool}
          waterCharges={waterCharges}
          selectedCrop={selectedCrop}
          onMenu={() => setMenuOpen(true)}
          onToolPick={handleToolChange}
          onCropPick={setSelectedCrop}
          onMarket={() => { setShowMarket(true); setShowBuild(false); setBuildTool(null); }}
          onEndDay={handleEndDay}
          facingIdx={facingIdx}
        />
      )}

      {/* Toasts */}
      {state && game.error && (
        <div className="absolute bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-md
                        bg-red-600/90 backdrop-blur-sm px-4 py-2 text-sm font-bold
                        shadow-xl border border-red-400/30 pointer-events-none">
          {game.error}
        </div>
      )}
      {state && game.info && !game.error && (
        <div className="absolute bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-md
                        bg-emerald-600/90 backdrop-blur-sm px-4 py-2 text-sm font-bold
                        shadow-xl border border-emerald-400/30 pointer-events-none">
          {game.info}
        </div>
      )}

      {/* Build panel — slides up from bottom, above HUD */}
      {state && showBuild && (
        <div className="absolute bottom-16 left-2 right-2 z-20 border border-white/10 bg-[#111a15]/97 shadow-2xl backdrop-blur-md md:bottom-20 md:left-4 md:right-auto md:w-[380px]">
          <div className="flex h-12 items-center justify-between border-b border-white/10 px-3">
            <span className="flex items-center gap-2 text-sm font-bold text-white"><Hammer size={16} className="text-[#d9b95f]" /> Build</span>
            <button type="button" aria-label="Close build panel" onClick={() => { setShowBuild(false); setBuildTool(null); setCurrentTool('hoe'); }}
              className="grid h-8 w-8 place-items-center rounded-md text-white/50 hover:bg-white/10 hover:text-white"><X size={16} /></button>
          </div>
          <BuildPanel state={state} tool={buildTool} onPick={setBuildTool} />
        </div>
      )}

      {/* Farm operations — bottom sheet on mobile, side panel on desktop */}
      {state && showMarket && (
        <div className="absolute inset-x-0 bottom-0 top-16 z-30 flex flex-col border-t border-white/10 bg-[#111a15]/97 shadow-2xl backdrop-blur-md md:inset-y-0 md:left-auto md:right-0 md:top-0 md:w-[440px] md:border-l md:border-t-0">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
            <span className="flex items-center gap-2 text-sm font-bold text-white"><ClipboardList size={18} className="text-[#d9b95f]" /> Farm operations</span>
            <button type="button" onClick={() => setShowMarket(false)} aria-label="Close farm operations"
              className="grid h-9 w-9 place-items-center rounded-md text-white/50 hover:bg-white/10 hover:text-white">
              <X size={18} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <MarketPanel state={state} dispatch={dispatch} />
          </div>
        </div>
      )}

      {/* Menu overlay */}
      {showMenu && (
        <MenuScreen
          hasSave={game.hasSave}
          slots={game.slots}
          inGame={!!state}
          onNewGame={(seed) => { game.startNewGame(seed); setMenuOpen(false); }}
          onContinue={() => { game.continueGame(); setMenuOpen(false); }}
          onLoadSlot={(slot) => { game.loadSlot(slot); setMenuOpen(false); }}
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
