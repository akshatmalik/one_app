'use client';

import { ListChecks, Pause, Play, Timer, X } from 'lucide-react';
import { WorkOrder } from '../lib/workOrders';

interface Props {
  queue: WorkOrder[];
  activeProgress: number;
  paused: boolean;
  onTogglePause: () => void;
  onCancel: (id: string) => void;
  onClear: () => void;
}

export function WorkQueuePanel({ queue, activeProgress, paused, onTogglePause, onCancel, onClear }: Props) {
  if (!queue.length) return null;

  return (
    <section
      aria-label="Work queue"
      className="fixed bottom-[4.5rem] right-3 z-30 w-[min(280px,calc(100vw-1.5rem))] overflow-hidden rounded-md border border-white/10 bg-[#0d1511]/95 text-white shadow-2xl backdrop-blur-xl"
    >
      <header className="flex h-10 items-center gap-2 border-b border-white/10 px-2">
        <ListChecks size={16} className="text-[#efd275]" />
        <span className="min-w-0 flex-1 text-[11px] font-bold">Work queue · {queue.length}</span>
        <button type="button" onClick={onTogglePause} className="grid size-8 place-items-center rounded-md text-white/65 hover:bg-white/10" aria-label={paused ? 'Resume work queue' : 'Pause work queue'}>
          {paused ? <Play size={15} /> : <Pause size={15} />}
        </button>
        <button type="button" onClick={onClear} className="grid size-8 place-items-center rounded-md text-white/45 hover:bg-white/10 hover:text-[#efa08c]" aria-label="Clear work queue">
          <X size={16} />
        </button>
      </header>

      <div className="max-h-44 overflow-y-auto">
        {queue.slice(0, 8).map((order, index) => (
          <div key={order.id} className="border-b border-white/[0.07] px-2 py-1.5 last:border-0">
            <div className="flex min-w-0 items-center gap-2">
              <Timer size={13} className={index === 0 && !paused ? 'text-[#efd275]' : 'text-white/30'} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[10px] font-semibold">{order.label}</div>
                <div className="truncate text-[8px] text-white/40">
                  {index === 0 ? paused ? 'Paused' : activeProgress > 0 ? 'Working' : 'Walking' : order.batchLabel ?? 'Queued'}
                </div>
              </div>
              <span className="text-[9px] tabular-nums text-white/35">{Math.round(order.durationMs / 100) / 10}s</span>
              <button type="button" onClick={() => onCancel(order.id)} className="grid size-7 place-items-center rounded-md text-white/40 hover:bg-white/10 hover:text-[#efa08c]" aria-label={`Cancel action ${index + 1}: ${order.label}`}>
                <X size={14} />
              </button>
            </div>
            {index === 0 ? (
              <div className="ml-5 mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-[#efd275]" style={{ width: `${Math.round(activeProgress * 100)}%` }} />
              </div>
            ) : null}
          </div>
        ))}
        {queue.length > 8 ? <div className="px-3 py-2 text-center text-[9px] text-white/40">+{queue.length - 8} more actions</div> : null}
      </div>
    </section>
  );
}
