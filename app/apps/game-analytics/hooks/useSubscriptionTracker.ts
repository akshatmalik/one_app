'use client';

import { useCallback, useEffect, useState } from 'react';
import { SubscriptionSource } from '../lib/types';
import {
  BillingCycle,
  TrackedSubscription,
  addTrackedSubscription,
  cancelTrackedSubscription,
  getTrackedSubscriptions,
  removeTrackedSubscription,
  updateTrackedSubscription,
} from '../lib/subscription-tracker-storage';

export function useSubscriptionTracker(userId: string | null) {
  const uid = userId ?? 'local-user';
  const [subscriptions, setSubscriptions] = useState<TrackedSubscription[]>([]);

  const refresh = useCallback(() => {
    setSubscriptions(getTrackedSubscriptions(uid));
  }, [uid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    (input: { service: SubscriptionSource; label?: string; cost: number; billingCycle: BillingCycle; startedAt: string }) => {
      addTrackedSubscription(uid, input);
      refresh();
    },
    [uid, refresh]
  );

  const update = useCallback(
    (id: string, updates: Partial<Omit<TrackedSubscription, 'id'>>) => {
      updateTrackedSubscription(uid, id, updates);
      refresh();
    },
    [uid, refresh]
  );

  const cancel = useCallback(
    (id: string) => {
      cancelTrackedSubscription(uid, id);
      refresh();
    },
    [uid, refresh]
  );

  const remove = useCallback(
    (id: string) => {
      removeTrackedSubscription(uid, id);
      refresh();
    },
    [uid, refresh]
  );

  return { subscriptions, add, update, cancel, remove };
}
