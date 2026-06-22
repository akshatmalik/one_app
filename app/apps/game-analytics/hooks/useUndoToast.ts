'use client';

import { useCallback, useRef, useState } from 'react';

export interface PendingUndo {
  id: string;
  message: string;
  durationMs: number;
  onUndo: () => Promise<void> | void;
}

const DEFAULT_DURATION_MS = 8000;

/**
 * A single transient "Action done. Undo?" slot — mirrors the
 * dismiss/auto-expire pattern already used by TrophyToast / GenreLevelUpToast,
 * but holds an actual reversal callback instead of a celebration message.
 * Only one undo can be pending at a time; queuing a new one replaces the old
 * (the previous action already committed, it just stops being undoable).
 */
export function useUndoToast() {
  const [pending, setPending] = useState<PendingUndo | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    setPending(null);
  }, [clearTimer]);

  const showUndo = useCallback((action: Omit<PendingUndo, 'id' | 'durationMs'> & { durationMs?: number }) => {
    clearTimer();
    const durationMs = action.durationMs ?? DEFAULT_DURATION_MS;
    const id = `undo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setPending({ id, message: action.message, onUndo: action.onUndo, durationMs });
    timerRef.current = setTimeout(() => {
      setPending(null);
      timerRef.current = null;
    }, durationMs);
  }, [clearTimer]);

  const confirmUndo = useCallback(async () => {
    const current = pending;
    if (!current) return;
    dismiss();
    await current.onUndo();
  }, [pending, dismiss]);

  return { pending, showUndo, dismiss, confirmUndo };
}
