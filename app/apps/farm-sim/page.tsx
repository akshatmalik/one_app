'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useFarmGame } from './hooks/useFarmGame';
import { PlayerAction, CropId } from './lib/types';
import { HudBar } from './components/HudBar';
import { ForecastStrip } from './components/ForecastStrip';
import { WaterBar } from './components/WaterBar';
import { GameCanvas } from './components/GameCanvas';
import { TileSheet } from './components/TileSheet';
import { MarketPanel } from './components/MarketPanel';
import { BuildPanel, BuildTool } from './components/BuildPanel';
import { DayRecap } from './components/DayRecap';
import { TutorialHint } from './components/TutorialHint';
import { MenuScreen } from './components/MenuScreen';
import { ToolBar } from './components/ToolBar';
import { validActions } from './lib/engine/actions';
import { CROPS } from './data/crops';
import { PlayerState, facingTileIdx, CAN_MAX_CHARGES } from './lib/realtime/player';
import type { ToolId } from './lib/realtime/player';
import { GRID_SIZE } from './lib/balance';

export default function FarmSimPage() {
  const game = useFarmGame();
  const { state } = game;

  // ── UI state ──────────────────────────────────────────────────────────────
  const [menuOpen, setMenuOpen]       = useState(false);
  const [showMarket, setShowMarket]   = useState(false);
  const [showBuild, setShowBuild]     = useState(false);
  const [buildTool, setBuildTool]     = useState<BuildTool | null>(null);
  const [tileSheetIdx, setTileSheetIdx] = useState<number | null>(null);

  // ── Player / tool state (lifted so ToolBar + TileSheet can read it) ───────
  const [currentTool, setCurrentTool]   = useState<ToolId>('hoe');
  const [selectedCrop, setSelectedCrop] = useState<CropId | null>(null);
  const [waterCharges, setWaterCharges] = useState(CAN_MAX_CHARGES);
  const [playerState, setPlayerState]   = useState<PlayerState | null>(null);

  // Show menu automatically when no game is loaded.
  useEffect(() => {
    if (!state) setMenuOpen(true);
  }, [state]);

  // Advance tutorial when the player performs the expected action.
  const dispatch = useCallback((action: PlayerAction): boolean => {
    const ok = game.dispatch(action);
    if (ok && state) {
      const expected: Record<number, PlayerAction['type']> = {
        0: 'till',
        1: 'plant',
        2: 'water',
        4: 'sell',
      };
      if (expected[state.tutorialStep] === action.type) {
        game.advanceTutorial(state.tutorialStep);
      }
    }
    return ok;
  }, [game, state]);

  const handleEndDay = () => {
    if (state && state.tutorialStep === 3) game.advanceTutorial(3);
    game.endDay();
  };

  // ── Tool callbacks for GameCanvas ─────────────────────────────────────────
  const handleToolChange = useCallback((tool: ToolId) => {
    setCurrentTool(tool);
    if (tool !== 'builder') setShowBuild(false);
    if (tool === 'builder') setShowBuild(true);
  }, []);

  const handleAction = useCallback((action: PlayerAction): boolean => {
    // In build mode, intercept build-related actions.
    if (action.type === 'buildChannel' || action.type === 'digWell' || action.type === 'demolish' || action.type === 'expand') {
      return dispatch(action);
    }
    // Water can tracking: decrement charge on successful water
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

  // Derive facing tile for the tile sheet (long-press / info view)
  const facingIdx = playerState ? facingTileIdx(playerState, GRID_SIZE) : null;
  const facingTileHasActions =
    state && facingIdx !== null && validActions(state, facingIdx).length > 0;

  const showMenu = menuOpen || !state;

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-900 text-white select-none">
      {state && (
        <>
          <HudBar state={state} onMenu={() => setMenuOpen(true)} />
          <ForecastStrip state={state} />
          {state.tutorialStep >= 0 && <TutorialHint state={state} />}

          {/* Canvas fills available space */}
          <GameCanvas
            state={state}
            selectedCrop={selectedCrop}
            onAction={handleAction}
            onToolChange={handleToolChange}
            onPlayerMove={handlePlayerMove}
          />

          {/* Error / info toasts */}
          {game.error && (
            <div className="absolute bottom-52 left-1/2 -translate-x-1/2 z-30 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold shadow-lg pointer-events-none">
              {game.error}
            </div>
          )}
          {game.info && !game.error && (
            <div className="absolute bottom-64 left-1/2 -translate-x-1/2 z-30 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold shadow-lg pointer-events-none">
              {game.info}
            </div>
          )}

          <WaterBar state={state} />

          {/* Tool bar */}
          <ToolBar
            tool={currentTool}
            waterCharges={waterCharges}
            onPick={(t) => {
              handleToolChange(t);
              // When switching to seeds, keep last selected crop
            }}
          />

          {/* Seeds picker — shown when seeds tool is active */}
          {currentTool === 'seeds' && (
            <div className="flex gap-1 px-2 pb-1 bg-slate-800">
              {(Object.keys(CROPS) as CropId[]).map((cropId) => {
                const def = CROPS[cropId];
                const qty = state.seeds[cropId] ?? 0;
                return (
                  <button
                    key={cropId}
                    disabled={qty === 0}
                    onClick={() => setSelectedCrop(cropId)}
                    className={`flex-1 flex flex-col items-center py-1 rounded text-base leading-none ${
                      selectedCrop === cropId
                        ? 'bg-green-600/40 ring-1 ring-green-400'
                        : qty === 0
                          ? 'opacity-30 bg-slate-700/30'
                          : 'bg-slate-700/50 active:bg-slate-600'
                    }`}
                  >
                    <span>{def.emoji}</span>
                    <span className="text-[9px] text-slate-300">{qty}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Build panel overlay */}
          {showBuild && (
            <div className="bg-slate-900 border-t border-slate-700">
              <BuildPanel
                state={state}
                tool={buildTool}
                onPick={setBuildTool}
              />
            </div>
          )}

          {/* Facing tile sheet — tap tile info button */}
          {!showBuild && facingTileHasActions && facingIdx !== null && tileSheetIdx !== null && (
            <TileSheet
              state={state}
              idx={tileSheetIdx}
              dispatch={dispatch}
              onClose={() => setTileSheetIdx(null)}
            />
          )}

          {/* Market overlay */}
          {showMarket && (
            <div className="absolute inset-0 z-20 bg-slate-900/95 flex flex-col">
              <div className="flex items-center justify-between p-3 border-b border-slate-700">
                <span className="font-bold">Market</span>
                <button onClick={() => setShowMarket(false)} className="text-slate-400 text-xl px-2">✕</button>
              </div>
              <div className="flex-1 overflow-auto">
                <MarketPanel state={state} dispatch={dispatch} />
              </div>
            </div>
          )}

          {/* Bottom action bar */}
          <div className="flex gap-2 p-3 bg-slate-900 border-t border-slate-800">
            <button
              onClick={() => { setShowMarket(true); setShowBuild(false); }}
              className="flex-1 rounded-lg bg-amber-700 py-2.5 text-sm font-bold active:bg-amber-800"
            >
              🛒 Market
            </button>
            {facingTileHasActions && facingIdx !== null && (
              <button
                onClick={() => setTileSheetIdx(facingIdx)}
                className="flex-1 rounded-lg bg-slate-600 py-2.5 text-sm font-bold active:bg-slate-700"
              >
                🔍 Tile Info
              </button>
            )}
            <button
              onClick={handleEndDay}
              className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-bold active:bg-indigo-700"
            >
              🌙 End Day
            </button>
          </div>
        </>
      )}

      {/* Menu overlay */}
      {showMenu && (
        <MenuScreen
          hasSave={game.hasSave}
          slots={game.slots}
          inGame={!!state}
          onNewGame={(seed) => {
            game.startNewGame(seed);
            setMenuOpen(false);
          }}
          onContinue={() => {
            game.continueGame();
            setMenuOpen(false);
          }}
          onLoadSlot={(slot) => {
            game.loadSlot(slot);
            setMenuOpen(false);
          }}
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
