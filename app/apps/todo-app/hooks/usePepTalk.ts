'use client';

import { useState, useEffect, useRef } from 'react';
import { generatePepTalk, PepTalkContext, PepTalkResult } from '../lib/ai-service';

const CACHE_PREFIX = 'todo-app-peptalk-';
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

interface CachedPepTalk {
  signature: string;
  result: PepTalkResult;
  timestamp: number;
}

function getSignature(ctx: PepTalkContext): string {
  const bucket =
    !ctx.viewingToday ? 'past' :
    ctx.totalTasks === 0 ? 'empty' :
    ctx.completedTasks === ctx.totalTasks ? 'done' :
    ctx.completionRate >= 60 ? 'most' :
    ctx.overdueCount > 0 ? 'overdue' :
    'start';
  return `${bucket}|${ctx.totalTasks}|${ctx.completedTasks}|${ctx.currentStreak}|${ctx.overdueCount}`;
}

export function usePepTalk(date: string, ctx: PepTalkContext | null, enabled: boolean) {
  const [talk, setTalk] = useState<PepTalkResult | null>(null);
  const [loading, setLoading] = useState(false);
  const lastSignatureRef = useRef<string>('');

  useEffect(() => {
    if (!enabled || !ctx) {
      setTalk(null);
      lastSignatureRef.current = '';
      return;
    }

    const signature = getSignature(ctx);
    const cacheKey = `${CACHE_PREFIX}${date}`;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed: CachedPepTalk = JSON.parse(cached);
        const fresh = Date.now() - parsed.timestamp < CACHE_TTL_MS;
        if (parsed.signature === signature && fresh) {
          setTalk(parsed.result);
          lastSignatureRef.current = signature;
          return;
        }
      }
    } catch { /* ignore */ }

    if (lastSignatureRef.current === signature) return;
    lastSignatureRef.current = signature;

    let cancelled = false;
    setLoading(true);
    generatePepTalk(ctx)
      .then(result => {
        if (cancelled) return;
        setTalk(result);
        try {
          const cached: CachedPepTalk = { signature, result, timestamp: Date.now() };
          localStorage.setItem(cacheKey, JSON.stringify(cached));
        } catch { /* ignore */ }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [date, enabled, ctx]);

  const regenerate = async () => {
    if (!ctx) return;
    setLoading(true);
    try {
      const result = await generatePepTalk(ctx);
      setTalk(result);
      const cached: CachedPepTalk = {
        signature: getSignature(ctx),
        result,
        timestamp: Date.now(),
      };
      try {
        localStorage.setItem(`${CACHE_PREFIX}${date}`, JSON.stringify(cached));
      } catch { /* ignore */ }
    } finally {
      setLoading(false);
    }
  };

  return { talk, loading, regenerate };
}
