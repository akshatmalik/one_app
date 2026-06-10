'use client';

import { useMemo } from 'react';
import { CalendarClock, Flag, ArrowRight } from 'lucide-react';
import { Game } from '../lib/types';
import { buildPlaythroughTimeline } from '../lib/timeline-estimator';

interface QueueTimelineStripProps {
  /** The active queue in play order (finished games already excluded by caller). */
  activeQueue: Game[];
  allGames: Game[];
  weeklyHours: number;
  onOpenEstimator?: () => void;
}

function fmtShort(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Compact, horizontally-scrollable completion timeline that lives inside Up Next.
 * It re-flows live as the queue is reordered (it's derived straight from the
 * queue order), so the queue *is* the estimate — the core synergy with the
 * Timeline Estimator tab, which shares the same pace and calculations.
 */
export function QueueTimelineStrip({
  activeQueue, allGames, weeklyHours, onOpenEstimator,
}: QueueTimelineStripProps) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  const segments = useMemo(
    () => buildPlaythroughTimeline(activeQueue, weeklyHours, today, allGames),
    [activeQueue, weeklyHours, today, allGames]
  );

  if (segments.length === 0) return null;

  const finishDate = segments[segments.length - 1].endDate;

  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-white/55 flex items-center gap-1.5 uppercase tracking-wide">
          <CalendarClock size={13} className="text-purple-400" /> Projected completion
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/40">all done {fmtShort(finishDate)}</span>
          {onOpenEstimator && (
            <button
              onClick={onOpenEstimator}
              className="text-[11px] text-purple-300/80 hover:text-purple-200 flex items-center gap-0.5 transition-colors"
            >
              Full timeline <ArrowRight size={11} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1 -mb-1">
        {segments.map((seg, i) => (
          <div key={seg.game.id} className="flex items-center gap-1.5 shrink-0">
            <div className="flex flex-col items-center gap-1 w-24 shrink-0 px-1.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-1 w-full">
                <span className="w-4 h-4 rounded-full bg-purple-500/15 text-purple-300 text-[9px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-[10px] font-medium text-white/80 truncate flex-1">{seg.game.name}</span>
              </div>
              <span className="text-[9px] text-white/40 w-full text-center">
                {fmtShort(seg.endDate)}{seg.isEstimatedLength ? ' · est' : ''}
              </span>
            </div>
            {i < segments.length - 1 && <ArrowRight size={12} className="text-white/15 shrink-0" />}
          </div>
        ))}
        <div className="flex items-center gap-1.5 shrink-0">
          <ArrowRight size={12} className="text-white/15 shrink-0" />
          <div className="flex flex-col items-center justify-center w-16 px-1.5 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
            <Flag size={12} className="text-emerald-400" />
            <span className="text-[9px] text-emerald-400/80 mt-0.5">done</span>
          </div>
        </div>
      </div>
    </div>
  );
}
