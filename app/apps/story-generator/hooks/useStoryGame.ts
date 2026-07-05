'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ZOMBIE_ARC } from '../lib/arc-zombie';
import { applyDelta, playTurn, resolveEnding, rollFate } from '../lib/story-service';
import { ArchivedStory, FateRoll, StoryBeat, StorySave, TranscriptEntry, WorldState } from '../lib/types';

const STORAGE_KEY = 'story-generator-save-v1';
const LIBRARY_KEY = 'story-generator-library-v1';
const ENDINGS_KEY = 'story-generator-endings-v1';
const RECENT_WINDOW = 10; // transcript entries sent to the model each turn
const LIBRARY_CAP = 10;

/** Older saves predate trust — patch the state shape in place of a version bump. */
function normalizeSave(save: StorySave): StorySave {
  const fix = (s: WorldState): WorldState => ({ ...s, trust: s.trust ?? {} });
  return {
    ...save,
    state: fix(save.state),
    checkpoint: { ...save.checkpoint, state: fix(save.checkpoint.state) },
  };
}

function loadSave(): StorySave | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StorySave;
    return parsed.version === 1 && parsed.arcId === ZOMBIE_ARC.id ? normalizeSave(parsed) : null;
  } catch {
    return null;
  }
}

function persist(save: StorySave | null) {
  if (typeof window === 'undefined') return;
  if (save === null) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
}

function loadLibrary(): ArchivedStory[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ArchivedStory[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(a => a?.save?.version === 1 && a.save.arcId === ZOMBIE_ARC.id)
      .map(a => ({ ...a, save: normalizeSave(a.save) }));
  } catch {
    return [];
  }
}

function persistLibrary(library: ArchivedStory[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
}

function loadUnlockedEndings(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ENDINGS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function entry(role: TranscriptEntry['role'], text: string, beatId: string, fate?: FateRoll): TranscriptEntry {
  return { id: uuidv4(), role, text, beatId, ...(fate ? { fate } : {}) };
}

function beatHeader(beat: StoryBeat, actChanged: boolean): string {
  return actChanged ? `ACT ${beat.act} — ${beat.actTitle.toUpperCase()} · ${beat.title}` : beat.title;
}

export function useStoryGame() {
  const arc = ZOMBIE_ARC;
  const [save, setSave] = useState<StorySave | null>(null);
  const [library, setLibrary] = useState<ArchivedStory[]>([]);
  const [unlockedEndingIds, setUnlockedEndingIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastActionRef = useRef<{ action: string; fate: FateRoll } | null>(null);

  useEffect(() => {
    setSave(loadSave());
    setLibrary(loadLibrary());
    setUnlockedEndingIds(loadUnlockedEndings());
    setHydrated(true);
  }, []);

  const commit = useCallback((next: StorySave | null) => {
    setSave(next);
    persist(next);
  }, []);

  const commitLibrary = useCallback((next: ArchivedStory[]) => {
    setLibrary(next);
    persistLibrary(next);
  }, []);

  const unlockEnding = useCallback((endingId: string) => {
    setUnlockedEndingIds(prev => {
      if (prev.includes(endingId)) return prev;
      const next = [...prev, endingId];
      if (typeof window !== 'undefined') localStorage.setItem(ENDINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const currentBeat: StoryBeat | null = save ? arc.beats[save.beatIndex] ?? null : null;
  const ending = save?.status === 'ended' && save.endingId
    ? arc.endings.find(e => e.id === save.endingId) ?? null
    : null;

  /** Run a beat's opening narration and return the updated save. */
  const openBeat = useCallback(
    async (base: StorySave): Promise<StorySave> => {
      const beat = arc.beats[base.beatIndex];
      const result = await playTurn({
        arc,
        state: base.state,
        beat,
        beatNumber: base.beatIndex + 1,
        totalBeats: arc.beats.length,
        turnInBeat: 0,
        beatRecaps: base.beatRecaps,
        recentTranscript: base.transcript.slice(-RECENT_WINDOW),
        playerAction: null,
        fate: null,
        playerName: base.playerName,
      });
      return {
        ...base,
        state: applyDelta(base.state, result.delta),
        transcript: [...base.transcript, entry('narrator', result.narration, beat.id)],
        suggestedActions: result.suggestedActions,
        updatedAt: new Date().toISOString(),
      };
    },
    [arc],
  );

  const startNewGame = useCallback(async (playerName?: string) => {
    setError(null);
    setLoading(true);
    const firstBeat = arc.beats[0];
    const name = playerName?.trim().slice(0, 24) || undefined;
    const base: StorySave = {
      version: 1,
      arcId: arc.id,
      state: arc.openingState,
      beatIndex: 0,
      turnInBeat: 0,
      transcript: [entry('system', beatHeader(firstBeat, true), firstBeat.id)],
      checkpoint: { state: arc.openingState, transcriptLength: 0 },
      beatRecaps: [],
      status: 'playing',
      suggestedActions: [],
      deathCount: 0,
      playerName: name,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    commit(base);
    try {
      commit(await openBeat(base));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong starting the story.');
      commit(null);
    } finally {
      setLoading(false);
    }
  }, [arc, commit, openBeat]);

  const runAction = useCallback(
    async (base: StorySave, action: string, fate: FateRoll) => {
      const beat = arc.beats[base.beatIndex];
      const result = await playTurn({
        arc,
        state: base.state,
        beat,
        beatNumber: base.beatIndex + 1,
        totalBeats: arc.beats.length,
        turnInBeat: base.turnInBeat,
        beatRecaps: base.beatRecaps,
        recentTranscript: base.transcript.slice(-RECENT_WINDOW),
        playerAction: action,
        fate,
        playerName: base.playerName,
      });

      const newState: WorldState = applyDelta(base.state, result.delta);
      let next: StorySave = {
        ...base,
        state: newState,
        transcript: [...base.transcript, entry('narrator', result.narration, beat.id)],
        suggestedActions: result.suggestedActions,
        updatedAt: new Date().toISOString(),
      };

      // Death — from the model, from health, or from the clock.
      const clockRanOut = newState.hoursLeft <= 0 && !beat.isEnding;
      if (result.outcome === 'player-death' || newState.health <= 0 || clockRanOut) {
        const cause = clockRanOut
          ? 'The clock ran out. Somewhere across the city, the last convoy pulled away without you.'
          : `Your story ends here — ${beat.title.toLowerCase()}.`;
        commit({
          ...next,
          state: { ...newState, health: clockRanOut ? newState.health : 0 },
          status: 'dead',
          deathCause: cause,
          suggestedActions: [],
        });
        return;
      }

      if (result.outcome === 'objective-complete') {
        if (beat.isEnding) {
          const earned = resolveEnding(arc, newState, base.deathCount);
          unlockEnding(earned.id);
          commit({ ...next, status: 'ended', endingId: earned.id, suggestedActions: [] });
          return;
        }
        // Advance: recap the finished beat, checkpoint at the new beat's entry.
        const nextBeat = arc.beats[base.beatIndex + 1];
        const actChanged = nextBeat.act !== beat.act;
        next = {
          ...next,
          beatIndex: base.beatIndex + 1,
          turnInBeat: 0,
          beatRecaps: [...base.beatRecaps, beat.summary],
          checkpoint: { state: newState, transcriptLength: next.transcript.length },
          transcript: [...next.transcript, entry('system', beatHeader(nextBeat, actChanged), nextBeat.id)],
          suggestedActions: [],
        };
        commit(next);
        commit(await openBeat(next));
        return;
      }

      commit({ ...next, turnInBeat: base.turnInBeat + 1 });
    },
    [arc, commit, openBeat, unlockEnding],
  );

  const sendAction = useCallback(
    async (text: string) => {
      const action = text.trim();
      if (!save || save.status !== 'playing' || loading || !action) return;
      setError(null);
      setLoading(true);
      const fate = rollFate();
      lastActionRef.current = { action, fate };
      const beat = arc.beats[save.beatIndex];
      const withPlayer: StorySave = {
        ...save,
        transcript: [...save.transcript, entry('player', action, beat.id, fate)],
        updatedAt: new Date().toISOString(),
      };
      commit(withPlayer);
      try {
        await runAction(withPlayer, action, fate);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'The narrator stumbled. Try again.');
      } finally {
        setLoading(false);
      }
    },
    [arc, save, loading, commit, runAction],
  );

  /** Re-run the last action after an error — same fate roll, no duplicate player message. */
  const retry = useCallback(async () => {
    const last = lastActionRef.current;
    if (!save || save.status !== 'playing' || loading || !last) return;
    setError(null);
    setLoading(true);
    try {
      await runAction(save, last.action, last.fate);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The narrator stumbled. Try again.');
    } finally {
      setLoading(false);
    }
  }, [save, loading, runAction]);

  /** Death → restore the snapshot taken when the current beat began. */
  const restartFromCheckpoint = useCallback(async () => {
    if (!save || save.status !== 'dead' || loading) return;
    setError(null);
    setLoading(true);
    const beat = arc.beats[save.beatIndex];
    const prevBeat = save.beatIndex > 0 ? arc.beats[save.beatIndex - 1] : null;
    const actChanged = !prevBeat || prevBeat.act !== beat.act;
    const base: StorySave = {
      ...save,
      state: save.checkpoint.state,
      turnInBeat: 0,
      transcript: [
        ...save.transcript.slice(0, save.checkpoint.transcriptLength),
        entry('system', beatHeader(beat, actChanged), beat.id),
      ],
      status: 'playing',
      deathCause: undefined,
      suggestedActions: [],
      deathCount: save.deathCount + 1,
      updatedAt: new Date().toISOString(),
    };
    commit(base);
    try {
      commit(await openBeat(base));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong reviving the story.');
    } finally {
      setLoading(false);
    }
  }, [arc, save, loading, commit, openBeat]);

  /** Park the current run in the story library and return to the start screen. */
  const saveAndRestart = useCallback(() => {
    if (!save) return;
    // Don't archive a run that never really began.
    if (save.transcript.filter(e => e.role !== 'system').length > 0) {
      const archived: ArchivedStory = { id: uuidv4(), archivedAt: new Date().toISOString(), save };
      commitLibrary([archived, ...library].slice(0, LIBRARY_CAP));
    }
    commit(null);
    setError(null);
    lastActionRef.current = null;
  }, [save, library, commit, commitLibrary]);

  /** Pull an archived run back into play. Any active run is archived first — nothing is lost. */
  const resumeStory = useCallback(
    (id: string) => {
      const target = library.find(a => a.id === id);
      if (!target || loading) return;
      let nextLibrary = library.filter(a => a.id !== id);
      if (save && save.transcript.filter(e => e.role !== 'system').length > 0) {
        nextLibrary = [{ id: uuidv4(), archivedAt: new Date().toISOString(), save }, ...nextLibrary].slice(0, LIBRARY_CAP);
      }
      commitLibrary(nextLibrary);
      commit(target.save);
      setError(null);
      lastActionRef.current = null;
    },
    [library, save, loading, commit, commitLibrary],
  );

  const deleteStory = useCallback(
    (id: string) => {
      commitLibrary(library.filter(a => a.id !== id));
    },
    [library, commitLibrary],
  );

  /** Hard discard — no archive. */
  const discardGame = useCallback(() => {
    commit(null);
    setError(null);
    lastActionRef.current = null;
  }, [commit]);

  return {
    arc,
    save,
    library,
    unlockedEndingIds,
    ending,
    hydrated,
    loading,
    error,
    currentBeat,
    startNewGame,
    sendAction,
    retry,
    restartFromCheckpoint,
    saveAndRestart,
    resumeStory,
    deleteStory,
    discardGame,
  };
}
