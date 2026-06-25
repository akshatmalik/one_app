'use client';

import { useCallback, useEffect, useState } from 'react';
import { Game } from '../lib/types';
import {
  TimeCapsule,
  CapsuleOutcome,
  deleteCapsule as deleteCapsuleFromStorage,
  getCapsuleOutcomes,
  getCapsules,
  markOpened,
  sealCapsule,
} from '../lib/timecapsule-storage';

export function useTimeCapsules(userId: string | null, games: Game[]) {
  const uid = userId || 'local-user';
  const [capsules, setCapsules] = useState<TimeCapsule[]>([]);

  useEffect(() => {
    setCapsules(getCapsules(uid));
  }, [uid]);

  const seal = useCallback(
    (note: string, openDate: string, taggedGames: Game[]): TimeCapsule => {
      const capsule = sealCapsule(uid, note, openDate, taggedGames);
      setCapsules(getCapsules(uid));
      return capsule;
    },
    [uid]
  );

  const openCapsule = useCallback(
    (id: string) => {
      markOpened(uid, id);
      setCapsules(getCapsules(uid));
    },
    [uid]
  );

  const removeCapsule = useCallback(
    (id: string) => {
      deleteCapsuleFromStorage(uid, id);
      setCapsules(getCapsules(uid));
    },
    [uid]
  );

  const getOutcomes = useCallback(
    (capsule: TimeCapsule): CapsuleOutcome[] => getCapsuleOutcomes(capsule, games),
    [games]
  );

  const now = new Date().toISOString();
  const sealed = capsules.filter(c => !c.opened).sort((a, b) => a.openDate.localeCompare(b.openDate));
  const opened = capsules
    .filter(c => c.opened)
    .sort((a, b) => (b.openedAt ?? '').localeCompare(a.openedAt ?? ''));
  const due = sealed.filter(c => c.openDate <= now);

  return { capsules, sealed, opened, due, seal, openCapsule, removeCapsule, getOutcomes };
}
