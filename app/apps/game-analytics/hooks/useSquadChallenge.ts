'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  SquadChallenge,
  ChallengeMetric,
  getActiveChallenge,
  startChallenge,
  clearChallenge,
} from '../lib/squad-challenges';
import { VersusSnapshot } from '../lib/versus-codes';

export function useSquadChallenge(userId: string | null) {
  const uid = userId ?? 'local-user';
  const [challenge, setChallenge] = useState<SquadChallenge | null>(null);

  const refresh = useCallback(() => {
    setChallenge(getActiveChallenge(uid));
  }, [uid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const start = useCallback(
    (metric: ChallengeMetric, durationDays: number, participants: { id: string; name: string; baseline: VersusSnapshot }[]) => {
      const created = startChallenge(uid, metric, durationDays, participants);
      setChallenge(created);
      return created;
    },
    [uid]
  );

  const end = useCallback(() => {
    clearChallenge(uid);
    setChallenge(null);
  }, [uid]);

  return { challenge, start, end };
}
