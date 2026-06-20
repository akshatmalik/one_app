'use client';

import { useCallback, useEffect, useState } from 'react';
import { Game } from '../lib/types';
import {
  LibrarySnapshot,
  SnapshotDiff,
  buildRestorePlan,
  deleteSnapshot as deleteSnapshotFromStorage,
  diffSnapshot,
  getSnapshots,
  maybeAutoSnapshot,
  saveSnapshot,
  toCreatePayload,
} from '../lib/snapshot-storage';

interface UseLibrarySnapshotsCallbacks {
  addGame: (gameData: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Game>;
  updateGame: (id: string, updates: Partial<Game>) => Promise<Game>;
  deleteGame: (id: string) => Promise<void>;
}

// Debounce before considering an auto-snapshot, so a burst of edits (e.g. a
// bulk import) settles before we write a new snapshot.
const AUTO_SNAPSHOT_DEBOUNCE_MS = 4000;

export function useLibrarySnapshots(
  userId: string | null,
  games: Game[],
  loading: boolean,
  callbacks: UseLibrarySnapshotsCallbacks
) {
  const uid = userId || 'local-user';
  const [snapshots, setSnapshots] = useState<LibrarySnapshot[]>([]);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    setSnapshots(getSnapshots(uid));
  }, [uid]);

  useEffect(() => {
    if (loading || games.length === 0) return;
    const timer = setTimeout(() => {
      const created = maybeAutoSnapshot(uid, games);
      if (created) setSnapshots(getSnapshots(uid));
    }, AUTO_SNAPSHOT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [uid, games, loading]);

  const saveManualSnapshot = useCallback((): LibrarySnapshot => {
    const snap = saveSnapshot(uid, games, 'manual');
    setSnapshots(getSnapshots(uid));
    return snap;
  }, [uid, games]);

  const removeSnapshot = useCallback((id: string) => {
    deleteSnapshotFromStorage(uid, id);
    setSnapshots(getSnapshots(uid));
  }, [uid]);

  const getDiff = useCallback((snapshot: LibrarySnapshot): SnapshotDiff => diffSnapshot(snapshot.games, games), [games]);

  const restoreSnapshot = useCallback(
    async (snapshot: LibrarySnapshot, exact: boolean) => {
      setRestoring(true);
      try {
        const plan = buildRestorePlan(snapshot, games, { exact });
        for (const game of plan.toReAdd) {
          await callbacks.addGame(toCreatePayload(game));
        }
        for (const revert of plan.toRevert) {
          await callbacks.updateGame(revert.id, revert.changes);
        }
        if (exact) {
          for (const id of plan.toRemove) {
            await callbacks.deleteGame(id);
          }
        }
      } finally {
        setRestoring(false);
      }
    },
    [games, callbacks]
  );

  return { snapshots, saveManualSnapshot, removeSnapshot, getDiff, restoreSnapshot, restoring };
}
