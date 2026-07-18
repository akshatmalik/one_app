'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DayRecap, GameState, PlayerAction, SaveSlotInfo } from '../lib/types';
import { applyAction } from '../lib/engine/actions';
import { endDay as endDayEngine } from '../lib/engine/resolveDay';
import { newGame as newGameEngine, randomSeed } from '../lib/engine/newGame';
import { farmRepo, AUTOSAVE_SLOT } from '../lib/storage';
import { advanceClock, FORCED_SLEEP_MINUTES } from '../lib/realtime/clock';
import { buildForecast, normalizeSeasonWeather } from '../lib/engine/weather';
import { advanceOpening } from '../lib/engine/opening';

interface UseFarmGame {
  state: GameState | null;
  error: string | null;
  info: string | null;
  recap: DayRecap | null;
  hasSave: boolean;
  slots: SaveSlotInfo[];
  dispatch: (action: PlayerAction) => boolean;
  dispatchMany: (actions: PlayerAction[]) => number;
  flashInfo: (msg: string) => void;
  endDay: () => void;
  advanceTime: (realElapsedMs: number) => void;
  dismissRecap: () => void;
  startNewGame: (seed?: number) => void;
  continueGame: () => boolean;
  loadSlot: (slot: number) => boolean;
  saveToSlot: (slot: number) => void;
  deleteSlot: (slot: number) => void;
  advanceTutorial: (step: number) => void;
}

export function useFarmGame(): UseFarmGame {
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [recap, setRecap] = useState<DayRecap | null>(null);
  const [slots, setSlots] = useState<SaveSlotInfo[]>([]);
  const [hasSave, setHasSave] = useState(false);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const infoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount, discover existing saves (don't auto-load — show the menu).
  useEffect(() => {
    setSlots(farmRepo.listSlots());
    setHasSave(farmRepo.load(AUTOSAVE_SLOT) !== null);
  }, []);

  useEffect(() => {
    if (!state) return;
    const weatherTruth = normalizeSeasonWeather(state.seed, state.day, state.weatherTruth);
    if (!weatherTruth.some((weather, index) => weather !== state.weatherTruth[index])) return;
    const repaired = { ...state, weatherTruth, forecast: buildForecast(state.seed, state.day, weatherTruth) };
    setState(repaired);
    farmRepo.save(AUTOSAVE_SLOT, repaired);
  }, [state]);

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

  const flashInfo = useCallback((msg: string) => {
    setInfo(msg);
    if (infoTimer.current) clearTimeout(infoTimer.current);
    infoTimer.current = setTimeout(() => setInfo(null), 2200);
  }, []);

  const dispatch = useCallback(
    (action: PlayerAction): boolean => {
      if (!state) return false;
      const result = applyAction(state, action);
      if (!result.ok) {
        flashError(result.error ?? 'That did not work.');
        return false;
      }
      const opening = advanceOpening(result.state, action);
      setState(opening.state);
      autosave(opening.state);
      if (opening.completed) flashInfo(`${opening.completed.title} complete · ${opening.completed.reward}`);
      return true;
    },
    [state, autosave, flashError, flashInfo]
  );

  // Apply a batch of actions, threading state through one render. Returns how
  // many applied. Used by multi-select bulk actions.
  const dispatchMany = useCallback(
    (actions: PlayerAction[]): number => {
      if (!state) return 0;
      let cur = state;
      let applied = 0;
      let lastError: string | undefined;
      for (const a of actions) {
        const res = applyAction(cur, a);
        if (res.ok) {
          cur = res.state;
          applied++;
        } else {
          lastError = res.error;
        }
      }
      if (applied > 0) {
        setState(cur);
        autosave(cur);
      } else if (lastError) {
        flashError(lastError);
      }
      return applied;
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

  const advanceTime = useCallback((realElapsedMs: number) => {
    if (!state) return;
    const nextTime = advanceClock(state.time, realElapsedMs);
    if (nextTime >= FORCED_SLEEP_MINUTES) {
      const { state: next, recap: dayRecap } = endDayEngine(state);
      setState(next);
      setRecap(dayRecap);
      autosave(next);
      return;
    }

    const next = { ...state, time: nextTime, lastTickMs: Date.now() };
    setState(next);
    if (Math.floor(state.time / 60) !== Math.floor(nextTime / 60)) autosave(next);
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

  const continueGame = useCallback((): boolean => {
    try {
      const s = farmRepo.load(AUTOSAVE_SLOT);
      if (!s) {
        flashError('Unable to continue: save is missing or incompatible.');
        return false;
      }
      setState(s);
      return true;
    } catch {
      flashError('Unable to continue: save is missing or incompatible.');
      return false;
    }
  }, [flashError]);

  const loadSlot = useCallback((slot: number): boolean => {
    try {
      const s = farmRepo.load(slot);
      if (!s) {
        flashError(`Unable to load slot ${slot}: save is missing or incompatible.`);
        return false;
      }
      setState(s);
      setRecap(null);
      return true;
    } catch {
      flashError(`Unable to load slot ${slot}: save is missing or incompatible.`);
      return false;
    }
  }, [flashError]);

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
    info,
    recap,
    hasSave,
    slots,
    dispatch,
    dispatchMany,
    flashInfo,
    endDay,
    advanceTime,
    dismissRecap,
    startNewGame,
    continueGame,
    loadSlot,
    saveToSlot,
    deleteSlot,
    advanceTutorial,
  };
}
