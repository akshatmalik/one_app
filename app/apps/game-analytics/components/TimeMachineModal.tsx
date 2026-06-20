'use client';

import { useMemo, useState } from 'react';
import {
  X, History, Clock, Plus, Minus, Pencil, RotateCcw, Trash2, Loader2,
  ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, ShieldCheck,
} from 'lucide-react';
import clsx from 'clsx';
import { LibrarySnapshot, SnapshotDiff } from '../lib/snapshot-storage';
import { formatCurrency, formatHours, formatRelativeTime, formatDate } from '../lib/format';

interface TimeMachineModalProps {
  snapshots: LibrarySnapshot[];
  getDiff: (snapshot: LibrarySnapshot) => SnapshotDiff;
  restoring: boolean;
  onSaveManual: () => void;
  onDelete: (id: string) => void;
  onRestore: (snapshot: LibrarySnapshot, exact: boolean) => Promise<void>;
  onClose: () => void;
}

function DiffSummary({ diff }: { diff: SnapshotDiff }) {
  if (diff.added.length === 0 && diff.removed.length === 0 && diff.modified.length === 0) {
    return <span className="text-[11px] text-emerald-400/70">No changes since — library matches this point</span>;
  }
  return (
    <span className="text-[11px] text-white/40 flex items-center gap-2 flex-wrap">
      {diff.added.length > 0 && <span className="text-emerald-400/80">+{diff.added.length} added</span>}
      {diff.removed.length > 0 && <span className="text-red-400/80">-{diff.removed.length} removed</span>}
      {diff.modified.length > 0 && <span className="text-amber-400/80">{diff.modified.length} changed</span>}
    </span>
  );
}

function ConfirmRestore({
  snapshot,
  diff,
  restoring,
  onCancel,
  onConfirm,
}: {
  snapshot: LibrarySnapshot;
  diff: SnapshotDiff;
  restoring: boolean;
  onCancel: () => void;
  onConfirm: (exact: boolean) => void;
}) {
  const [exact, setExact] = useState(false);

  return (
    <div className="space-y-3 p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/20">
      <div className="flex items-start gap-2">
        <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="text-[12px] text-amber-100/80 leading-relaxed">
          This will restore your library to how it looked {formatRelativeTime(snapshot.createdAt)}
          {diff.removed.length > 0 && <> — bringing back <span className="text-white/90">{diff.removed.length}</span> deleted game{diff.removed.length === 1 ? '' : 's'}</>}
          {diff.modified.length > 0 && <> and reverting <span className="text-white/90">{diff.modified.length}</span> changed game{diff.modified.length === 1 ? '' : 's'}</>}.
        </div>
      </div>

      {diff.added.length > 0 && (
        <label className="flex items-start gap-2 text-[11px] text-white/50 cursor-pointer">
          <input type="checkbox" checked={exact} onChange={e => setExact(e.target.checked)} className="mt-0.5 accent-amber-500" />
          <span>
            Also remove the <span className="text-white/80">{diff.added.length}</span> game{diff.added.length === 1 ? '' : 's'} added since this snapshot
            (exact restore — otherwise they&apos;re left alone).
          </span>
        </label>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={onCancel}
          disabled={restoring}
          className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-[12px] font-medium transition-colors disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(exact)}
          disabled={restoring}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white text-[12px] font-medium transition-colors disabled:opacity-50"
        >
          {restoring ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
          {restoring ? 'Restoring…' : 'Restore'}
        </button>
      </div>
    </div>
  );
}

function SnapshotRow({
  snapshot,
  diff,
  restoring,
  onDelete,
  onRestore,
}: {
  snapshot: LibrarySnapshot;
  diff: SnapshotDiff;
  restoring: boolean;
  onDelete: () => void;
  onRestore: (exact: boolean) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const hasChanges = diff.added.length > 0 || diff.removed.length > 0 || diff.modified.length > 0;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        {expanded ? <ChevronDown size={14} className="text-white/30 shrink-0" /> : <ChevronRight size={14} className="text-white/30 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] text-white/85 font-medium capitalize">{formatRelativeTime(snapshot.createdAt)}</span>
            <span
              className={clsx(
                'text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wide font-semibold',
                snapshot.reason === 'manual' ? 'bg-cyan-500/15 text-cyan-300' : 'bg-white/10 text-white/40'
              )}
            >
              {snapshot.reason}
            </span>
          </div>
          <div className="text-[11px] text-white/30 mt-0.5">
            {formatDate(snapshot.createdAt)} · {snapshot.gameCount} games · {formatCurrency(snapshot.totalSpent)} · {formatHours(snapshot.totalHours)}
          </div>
        </div>
        <DiffSummary diff={diff} />
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/5 pt-3">
          {!hasChanges && (
            <div className="flex items-center gap-2 text-[11px] text-emerald-400/70">
              <ShieldCheck size={13} /> Your library hasn&apos;t changed since this snapshot.
            </div>
          )}

          {diff.removed.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wide text-red-400/70 font-semibold flex items-center gap-1"><Minus size={10} /> Removed since</div>
              {diff.removed.map(g => (
                <div key={g.id} className="text-[12px] text-white/60 pl-4">{g.name}</div>
              ))}
            </div>
          )}

          {diff.added.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wide text-emerald-400/70 font-semibold flex items-center gap-1"><Plus size={10} /> Added since</div>
              {diff.added.map(g => (
                <div key={g.id} className="text-[12px] text-white/60 pl-4">{g.name}</div>
              ))}
            </div>
          )}

          {diff.modified.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wide text-amber-400/70 font-semibold flex items-center gap-1"><Pencil size={10} /> Changed since</div>
              {diff.modified.map(m => (
                <div key={m.id} className="pl-4">
                  <div className="text-[12px] text-white/70">{m.name}</div>
                  {m.changes.map((c, i) => (
                    <div key={i} className="text-[11px] text-white/35 pl-2">
                      {c.label}: <span className="text-white/50">{c.from}</span> → <span className="text-white/50">{c.to}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {confirming ? (
            <ConfirmRestore
              snapshot={snapshot}
              diff={diff}
              restoring={restoring}
              onCancel={() => setConfirming(false)}
              onConfirm={async exact => {
                await onRestore(exact);
                setConfirming(false);
              }}
            />
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/15 text-white/40 hover:text-red-300 text-[11px] font-medium transition-colors"
              >
                <Trash2 size={12} /> Delete
              </button>
              <button
                onClick={() => setConfirming(true)}
                disabled={!hasChanges}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 disabled:bg-white/[0.03] disabled:text-white/20 text-white/80 text-[11px] font-medium transition-colors"
              >
                <RotateCcw size={12} /> Restore this snapshot
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TimeMachineModal({ snapshots, getDiff, restoring, onSaveManual, onDelete, onRestore, onClose }: TimeMachineModalProps) {
  const [justSaved, setJustSaved] = useState(false);

  const sorted = useMemo(() => [...snapshots].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [snapshots]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <History size={18} className="text-cyan-400" />
            <h3 className="text-lg font-bold text-white/90">Time Machine</h3>
          </div>
          <button onClick={onClose} className="p-1 text-white/30 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          <p className="text-[12px] text-white/40 leading-relaxed">
            Your library is automatically snapshotted every so often. If you delete the wrong game, a bulk
            import goes sideways, or you just want to see how things looked before — restore from any point below.
          </p>

          <button
            onClick={() => {
              onSaveManual();
              setJustSaved(true);
              setTimeout(() => setJustSaved(false), 2000);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cyan-600/80 hover:bg-cyan-600 text-white text-sm font-medium transition-colors"
          >
            {justSaved ? <CheckCircle2 size={14} /> : <Clock size={14} />}
            {justSaved ? 'Snapshot saved' : 'Save a snapshot now'}
          </button>

          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <History size={28} className="text-white/15" />
              <div className="text-[13px] text-white/40">No snapshots yet</div>
              <div className="text-[11px] text-white/25 max-w-xs">
                One will be taken automatically as you use the app, or tap the button above to create one right now.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {sorted.map(snapshot => (
                <SnapshotRow
                  key={snapshot.id}
                  snapshot={snapshot}
                  diff={getDiff(snapshot)}
                  restoring={restoring}
                  onDelete={() => onDelete(snapshot.id)}
                  onRestore={exact => onRestore(snapshot, exact)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
