'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DayRecap, GameState, PlayerAction, SaveSlotInfo } from '../lib/types';
import { applyAction } from '../lib/engine/actions';
import { endDay as endDayEngine } from '../lib/engine/resolveDay';
import { newGame as newGameEngine, randomSeed } from '../lib/engine/newGame';
import { farmRepo, AUTOSAVE_SLOT } from '../lib/storage';

interface UseFarmGame {
  state: GameState | null;
  error: string | null;
  recap: DayRecap | null;
  hasSave: boolean;
  slots: SaveSlotInfo[];
  dispatch: (action: PlayerAction) => boolean;
  endDay: () => void;
  dismissRecap: () => void;
  startNewGame: (seed?: number) => void;
  continueGame: () => void;
  loadSlot: (slot: number) => void;
  saveToSlot: (slot: number) => void;
  deleteSlot: (slot: number) => void;
  advanceTutorial: (step: number) => void;
}

export function useFarmGame(): UseFarmGame {
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recap, setRecap] = useState<DayRecap | null>(null);
  const [slots, setSlots] = useState<SaveSlotInfo[]>([]);
  const [hasSave, setHasSave] = useState(false);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount, discover existing saves (don't auto-load — show the menu).
  useEffect(() => {
    setSlots(farmRepo.listSlots());
    setHasSave(farmRepo.load(AUTOSAVE_SLOT) !== null);
  }, []);

  const autosave = useCallback((s: GameState) => {
    farmRepo.save(AUTOSAVE_SLOT, s);
    setHasSave(true);
    setSlots(farmRepo.listSlots());
  }, []);

  const flashError = useCallback((msg: string) => {
    setError(msg);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), 2600);
  }, []);

  const dispatch = useCallback(
    (action: PlayerAction): boolean => {
      if (!state) return false;
      const result = applyAction(state, action);
      if (!result.ok) {
        flashError(result.error ?? 'That did not work.');
        return false;
      }
      setState(result.state);
      autosave(result.state);
      return true;
    },
    [state, autosave, flashError]
  );

  const endDay = useCallback(() => {
    if (!state) return;
    const { state: next, recap: dayRecap } = endDayEngine(state);
    setState(next);
    setRecap(dayRecap);
    autosave(next);
  }, [state, autosave]);

  const dismissRecap = useCallback(() => setRecap(null), []);

  const startNewGame = useCallback(
    (seed?: number) => {
      const s = newGameEngine(seed ?? randomSeed());
      setState(s);
      setRecap(null);
      autosave(s);
    },
    [autosave]
  );

  const continueGame = useCallback(() => {
    const s = farmRepo.load(AUTOSAVE_SLOT);
    if (s) setState(s);
  }, []);

  const loadSlot = useCallback((slot: number) => {
    const s = farmRepo.load(slot);
    if (s) {
      setState(s);
      setRecap(null);
    }
  }, []);

  const saveToSlot = useCallback((slot: number) => {
    setState((cur) => {
      if (cur) {
        farmRepo.save(slot, cur);
        setSlots(farmRepo.listSlots());
      }
      return cur;
    });
  }, []);

  const deleteSlot = useCallback((slot: number) => {
    farmRepo.delete(slot);
    setSlots(farmRepo.listSlots());
  }, []);

  const advanceTutorial = useCallback(
    (step: number) => {
      setState((cur) => {
        if (!cur || cur.tutorialStep !== step) return cur;
        const next = { ...cur, tutorialStep: step + 1 };
        autosave(next);
        return next;
      });
    },
    [autosave]
  );

  return {
    state,
    error,
    recap,
    hasSave,
    slots,
    dispatch,
    endDay,
    dismissRecap,
    startNewGame,
    continueGame,
    loadSlot,
    saveToSlot,
    deleteSlot,
    advanceTutorial,
  };
}
