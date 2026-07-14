'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useFarmGame } from './hooks/useFarmGame';
import { PlayerAction, CropId } from './lib/types';
import { HudBar } from './components/HudBar';
import { GameCanvas } from './components/GameCanvas';
import { MarketPanel } from './components/MarketPanel';
import { BuildPanel, BuildTool } from './components/BuildPanel';
import { DayRecap } from './components/DayRecap';
import { MenuScreen } from './components/MenuScreen';
import { PlayerState, facingTileIdx, CAN_MAX_CHARGES } from './lib/realtime/player';
import type { ToolId } from './lib/realtime/player';
import { GRID_SIZE } from './lib/balance';

export default function FarmSimPage() {
  const game = useFarmGame();
  const { state } = game;

  const [menuOpen, setMenuOpen]       = useState(false);
  const [showMarket, setShowMarket]   = useState(false);
  const [showBuild, setShowBuild]     = useState(false);
  const [buildTool, setBuildTool]     = useState<BuildTool | null>(null);

  const [currentTool, setCurrentTool]   = useState<ToolId>('hoe');
  const [selectedCrop, setSelectedCrop] = useState<CropId | null>(null);
  const [waterCharges, setWaterCharges] = useState(CAN_MAX_CHARGES);
  const [playerState, setPlayerState]   = useState<PlayerState | null>(null);

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
    else setShowBuild(false);
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
    setPlayerState(player);
    setCurrentTool(player.tool);
    setWaterCharges(player.waterCharges);
  }, []);

  const facingIdx = playerState ? facingTileIdx(playerState, GRID_SIZE) : null;
  const showMenu = menuOpen || !state;

  return (
    <div className="fixed inset-0 bg-black select-none overflow-hidden">

      {/* Canvas is always full-screen, HUD floats above it */}
      {state && (
        <GameCanvas
          state={state}
          selectedCrop={selectedCrop}
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
          onMarket={() => { setShowMarket(true); setShowBuild(false); }}
          onEndDay={handleEndDay}
        />
      )}

      {/* Toasts */}
      {state && game.error && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-30 rounded-xl
                        bg-red-600/90 backdrop-blur-sm px-4 py-2 text-sm font-bold
                        shadow-xl border border-red-400/30 pointer-events-none">
          {game.error}
        </div>
      )}
      {state && game.info && !game.error && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-30 rounded-xl
                        bg-emerald-600/90 backdrop-blur-sm px-4 py-2 text-sm font-bold
                        shadow-xl border border-emerald-400/30 pointer-events-none">
          {game.info}
        </div>
      )}

      {/* Build panel — slides up from bottom, above HUD */}
      {state && showBuild && (
        <div className="absolute bottom-36 left-0 right-0 z-20
                        bg-slate-900/95 backdrop-blur-md border-t border-slate-700 rounded-t-2xl shadow-2xl">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <span className="text-sm font-bold text-white">🔨 Build Mode</span>
            <button onClick={() => { setShowBuild(false); setCurrentTool('hoe'); }}
              className="text-slate-400 text-lg px-2">✕</button>
          </div>
          <BuildPanel state={state} tool={buildTool} onPick={setBuildTool} />
        </div>
      )}

      {/* Market — full-screen overlay */}
      {state && showMarket && (
        <div className="absolute inset-0 z-30 bg-slate-950/95 backdrop-blur-md flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <span className="text-base font-bold text-white">🛒 Market</span>
            <button onClick={() => setShowMarket(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full
                         bg-slate-800 text-slate-400 hover:text-white transition-colors">
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-auto">
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

      {game.recap && <DayRecap recap={game.recap} onClose={game.dismissRecap} />}

      <Link href="/" className="sr-only">Back to hub</Link>
    </div>
  );
}
