'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useFarmGame } from './hooks/useFarmGame';
import { PlayerAction } from './lib/types';
import { HudBar } from './components/HudBar';
import { ForecastStrip } from './components/ForecastStrip';
import { WaterBar } from './components/WaterBar';
import { GameCanvas } from './components/GameCanvas';
import { TileSheet } from './components/TileSheet';
import { MarketPanel } from './components/MarketPanel';
import { BuildPanel, BuildTool } from './components/BuildPanel';
import { BulkActionBar } from './components/BulkActionBar';
import { DayRecap } from './components/DayRecap';
import { TutorialHint } from './components/TutorialHint';
import { MenuScreen } from './components/MenuScreen';
import { validActions } from './lib/engine/actions';

type Mode = 'farm' | 'build' | 'market';

export default function FarmSimPage() {
  const game = useFarmGame();
  const { state } = game;
  const [mode, setMode] = useState<Mode>('farm');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [buildTool, setBuildTool] = useState<BuildTool | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [multiSelect, setMultiSelect] = useState(false);
  const [selection, setSelection] = useState<Set<number>>(new Set());

  const clearMulti = () => setSelection(new Set());

  // Advance the tutorial when the player performs the expected action type.
  const dispatch = (action: PlayerAction): boolean => {
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
  };

  const handleEndDay = () => {
    setSelectedIdx(null);
    if (state && state.tutorialStep === 3) game.advanceTutorial(3);
    game.endDay();
  };

  const handleSelect = (idx: number) => {
    if (!state) return;
    // In build mode with a tool active, tapping a tile builds directly.
    if (mode === 'build' && buildTool) {
      const actionMap: Record<BuildTool, PlayerAction> = {
        channel: { type: 'buildChannel', idx },
        well: { type: 'digWell', idx },
        expand: { type: 'expand', idx },
        demolish: { type: 'demolish', idx },
      };
      dispatch(actionMap[buildTool]);
      return;
    }
    // Farm multi-select: tapping toggles membership.
    if (mode === 'farm' && multiSelect) {
      setSelection((prev) => {
        const next = new Set(prev);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        return next;
      });
      return;
    }
    setSelectedIdx((cur) => (cur === idx ? null : idx));
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setSelectedIdx(null);
    setBuildTool(null);
    setMultiSelect(false);
    clearMulti();
  };

  // Show the menu automatically when there's no game loaded yet.
  useEffect(() => {
    if (!state) setMenuOpen(true);
  }, [state]);

  const showMenu = menuOpen || !state;

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-900 text-white select-none">
      {/* Top bar: back link */}
      {state && (
        <>
          <HudBar state={state} onMenu={() => setMenuOpen(true)} />
          <ForecastStrip state={state} />
          {state.tutorialStep >= 0 && <TutorialHint state={state} />}

          <GameCanvas
            state={state}
            selectedIdx={multiSelect ? null : selectedIdx}
            selectedSet={multiSelect ? selection : undefined}
            onSelect={handleSelect}
          />

          {/* Error toast */}
          {game.error && (
            <div className="absolute bottom-40 left-1/2 -translate-x-1/2 z-30 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold shadow-lg">
              {game.error}
            </div>
          )}
          {/* Info toast */}
          {game.info && !game.error && (
            <div className="absolute bottom-52 left-1/2 -translate-x-1/2 z-30 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold shadow-lg">
              {game.info}
            </div>
          )}

          <WaterBar state={state} />

          {/* Mode tabs */}
          <div className="flex gap-1 px-3 pt-2 bg-slate-900">
            {(['farm', 'build', 'market'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 rounded-t-lg py-1.5 text-xs font-semibold capitalize ${
                  mode === m ? 'bg-slate-800 text-white' : 'bg-slate-950 text-slate-400'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Multi-select toggle (Farm mode only) */}
          {mode === 'farm' && (
            <div className="flex justify-end px-3 pt-1 bg-slate-800">
              <button
                onClick={() => {
                  setMultiSelect((v) => !v);
                  clearMulti();
                  setSelectedIdx(null);
                }}
                className={`text-[11px] rounded px-2 py-1 font-semibold ${
                  multiSelect ? 'bg-yellow-500 text-yellow-950' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {multiSelect ? '☑︎ Multi-select' : '☐ Multi-select'}
              </button>
            </div>
          )}

          {/* Contextual bottom area */}
          <div className="bg-slate-900">
            {mode === 'market' ? (
              <MarketPanel state={state} dispatch={dispatch} />
            ) : mode === 'farm' && multiSelect ? (
              <BulkActionBar
                state={state}
                selection={Array.from(selection)}
                dispatchMany={game.dispatchMany}
                onApplied={(n, label) =>
                  game.flashInfo(n > 0 ? `${label} ${n} tile${n === 1 ? '' : 's'}` : 'Nothing applicable')
                }
                onClear={clearMulti}
              />
            ) : mode === 'build' && !selectedIdx ? (
              <BuildPanel state={state} tool={buildTool} onPick={setBuildTool} />
            ) : selectedIdx !== null && validActions(state, selectedIdx).length > 0 ? (
              <TileSheet
                state={state}
                idx={selectedIdx}
                dispatch={dispatch}
                onClose={() => setSelectedIdx(null)}
              />
            ) : (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-800 rounded-t-xl">
                {mode === 'build'
                  ? 'Pick a build tool below or tap a tile.'
                  : 'Tap a tile to act on it.'}
              </div>
            )}

            {/* End Day — always visible */}
            <div className="p-3 bg-slate-900">
              <button
                onClick={handleEndDay}
                className="w-full rounded-lg bg-indigo-600 py-3 font-bold text-white active:bg-indigo-700"
              >
                🌙 END DAY ▸
              </button>
            </div>
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
            setMode('farm');
            setSelectedIdx(null);
          }}
          onContinue={() => {
            game.continueGame();
            setMenuOpen(false);
          }}
          onLoadSlot={(slot) => {
            game.loadSlot(slot);
            setMenuOpen(false);
            setMode('farm');
            setSelectedIdx(null);
          }}
          onSaveSlot={game.saveToSlot}
          onDeleteSlot={game.deleteSlot}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {/* Day recap */}
      {game.recap && <DayRecap recap={game.recap} onClose={game.dismissRecap} />}

      {/* Hidden back-to-hub link for navigation */}
      <Link href="/" className="sr-only">
        Back to hub
      </Link>
    </div>
  );
}
