'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ZOMBIE_ARC } from '../lib/arc-zombie';
import { applyDelta, playTurn } from '../lib/story-service';
import { StoryBeat, StorySave, TranscriptEntry, WorldState } from '../lib/types';

const STORAGE_KEY = 'story-generator-save-v1';
const RECENT_WINDOW = 10; // transcript entries sent to the model each turn

function loadSave(): StorySave | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StorySave;
    return parsed.version === 1 && parsed.arcId === ZOMBIE_ARC.id ? parsed : null;
  } catch {
    return null;
  }
}

function persist(save: StorySave | null) {
  if (typeof window === 'undefined') return;
  if (save === null) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
}

function entry(role: TranscriptEntry['role'], text: string, beatId: string): TranscriptEntry {
  return { id: uuidv4(), role, text, beatId };
}

function beatHeader(beat: StoryBeat, actChanged: boolean): string {
  return actChanged ? `ACT ${beat.act} — ${beat.actTitle.toUpperCase()} · ${beat.title}` : beat.title;
}

export function useStoryGame() {
  const arc = ZOMBIE_ARC;
  const [save, setSave] = useState<StorySave | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastActionRef = useRef<string | null>(null);

  useEffect(() => {
    setSave(loadSave());
    setHydrated(true);
  }, []);

  const commit = useCallback((next: StorySave | null) => {
    setSave(next);
    persist(next);
  }, []);

  const currentBeat: StoryBeat | null = save ? arc.beats[save.beatIndex] ?? null : null;

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

  const startNewGame = useCallback(async () => {
    setError(null);
    setLoading(true);
    const firstBeat = arc.beats[0];
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
    async (base: StorySave, action: string) => {
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
          commit({ ...next, status: 'ended', suggestedActions: [] });
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
    [arc, commit, openBeat],
  );

  const sendAction = useCallback(
    async (text: string) => {
      const action = text.trim();
      if (!save || save.status !== 'playing' || loading || !action) return;
      setError(null);
      setLoading(true);
      lastActionRef.current = action;
      const beat = arc.beats[save.beatIndex];
      const withPlayer: StorySave = {
        ...save,
        transcript: [...save.transcript, entry('player', action, beat.id)],
        updatedAt: new Date().toISOString(),
      };
      commit(withPlayer);
      try {
        await runAction(withPlayer, action);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'The narrator stumbled. Try again.');
      } finally {
        setLoading(false);
      }
    },
    [arc, save, loading, commit, runAction],
  );

  /** Re-run the last action after an error, without duplicating the player message. */
  const retry = useCallback(async () => {
    const action = lastActionRef.current;
    if (!save || save.status !== 'playing' || loading || !action) return;
    setError(null);
    setLoading(true);
    try {
      await runAction(save, action);
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

  const abandonGame = useCallback(() => {
    commit(null);
    setError(null);
    lastActionRef.current = null;
  }, [commit]);

  return {
    arc,
    save,
    hydrated,
    loading,
    error,
    currentBeat,
    startNewGame,
    sendAction,
    retry,
    restartFromCheckpoint,
    abandonGame,
  };
}
