'use client';

import { useMemo, useState } from 'react';
import {
  X, Sparkles, Lock, Unlock, Trash2, PlusCircle, Calendar, Gamepad2,
  ArrowUp, ArrowDown, Minus as MinusIcon, ChevronDown, ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import { Game } from '../lib/types';
import { TimeCapsule, CapsuleOutcome } from '../lib/timecapsule-storage';
import { formatRelativeTime, formatDate, formatHours } from '../lib/format';

interface TimeCapsuleModalProps {
  games: Game[];
  sealed: TimeCapsule[];
  opened: TimeCapsule[];
  due: TimeCapsule[];
  onSeal: (note: string, openDate: string, taggedGames: Game[]) => void;
  onOpenCapsule: (id: string) => void;
  onDelete: (id: string) => void;
  getOutcomes: (capsule: TimeCapsule) => CapsuleOutcome[];
  onClose: () => void;
}

const PRESETS: { label: string; months: number }[] = [
  { label: '1 month', months: 1 },
  { label: '3 months', months: 3 },
  { label: '6 months', months: 6 },
  { label: '1 year', months: 12 },
];

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function SealForm({ games, onSeal }: { games: Game[]; onSeal: TimeCapsuleModalProps['onSeal'] }) {
  const [note, setNote] = useState('');
  const [openDate, setOpenDate] = useState(() => addMonths(new Date(), 3).toISOString().slice(0, 10));
  const [taggedIds, setTaggedIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [justSealed, setJustSealed] = useState(false);

  const taggedGames = games.filter(g => taggedIds.includes(g.id));
  const candidates = useMemo(
    () => [...games].sort((a, b) => a.name.localeCompare(b.name)),
    [games]
  );

  const handleSeal = () => {
    if (!note.trim() || !openDate) return;
    const iso = new Date(openDate + 'T00:00:00').toISOString();
    onSeal(note.trim(), iso, taggedGames);
    setNote('');
    setTaggedIds([]);
    setJustSealed(true);
    setTimeout(() => setJustSealed(false), 2000);
  };

  return (
    <div className="space-y-3 p-3 rounded-xl bg-white/[0.02] border border-white/10">
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Write a prediction or note to future-you... e.g. &quot;I bet I finish Elden Ring before the DLC drops&quot;"
        rows={3}
        maxLength={500}
        className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white/85 text-[13px] placeholder:text-white/25 focus:outline-none focus:border-violet-500/40 resize-none"
      />

      <div className="flex items-center gap-1.5 flex-wrap">
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => setOpenDate(addMonths(new Date(), p.months).toISOString().slice(0, 10))}
            className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 text-[11px] font-medium transition-colors"
          >
            {p.label}
          </button>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <Calendar size={12} className="text-white/30" />
          <input
            type="date"
            value={openDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={e => setOpenDate(e.target.value)}
            className="bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white/70 focus:outline-none focus:border-violet-500/40"
          />
        </div>
      </div>

      <div>
        <button
          onClick={() => setPickerOpen(v => !v)}
          className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/60 transition-colors"
        >
          {pickerOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <Gamepad2 size={12} />
          {taggedGames.length > 0 ? `${taggedGames.length} game${taggedGames.length === 1 ? '' : 's'} tagged` : 'Tag games (optional)'}
        </button>
        {pickerOpen && (
          <div className="mt-2 max-h-32 overflow-y-auto rounded-lg bg-black/20 border border-white/5 p-1.5 space-y-0.5">
            {candidates.map(g => {
              const checked = taggedIds.includes(g.id);
              return (
                <label
                  key={g.id}
                  className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 cursor-pointer text-[12px]"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setTaggedIds(prev => (checked ? prev.filter(id => id !== g.id) : [...prev, g.id]))
                    }
                    className="accent-violet-500"
                  />
                  <span className="text-white/60 truncate">{g.name}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={handleSeal}
        disabled={!note.trim() || !openDate}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-violet-600/80 hover:bg-violet-600 disabled:bg-white/[0.03] disabled:text-white/20 text-white text-sm font-medium transition-colors"
      >
        {justSealed ? <Sparkles size={14} /> : <Lock size={14} />}
        {justSealed ? 'Capsule sealed!' : `Seal until ${formatDate(new Date(openDate + 'T00:00:00').toISOString())}`}
      </button>
    </div>
  );
}

function DeltaBadge({ value, unit }: { value: number; unit: string }) {
  if (Math.abs(value) < 0.05) {
    return (
      <span className="inline-flex items-center gap-0.5 text-white/30">
        <MinusIcon size={10} /> No change
      </span>
    );
  }
  const up = value > 0;
  return (
    <span className={clsx('inline-flex items-center gap-0.5', up ? 'text-emerald-400' : 'text-red-400')}>
      {up ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
      {up ? '+' : ''}{value.toFixed(unit === 'h' ? 1 : 0)}{unit}
    </span>
  );
}

function CapsuleRow({
  capsule,
  outcomes,
  isDue,
  onOpenCapsule,
  onDelete,
}: {
  capsule: TimeCapsule;
  outcomes: CapsuleOutcome[];
  isDue: boolean;
  onOpenCapsule: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(isDue);

  return (
    <div
      className={clsx(
        'rounded-xl border overflow-hidden transition-colors',
        isDue ? 'border-amber-400/30 bg-amber-500/[0.05]' : 'border-white/10 bg-white/[0.02]'
      )}
    >
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        {capsule.opened ? (
          <Unlock size={14} className="text-emerald-400/70 shrink-0" />
        ) : isDue ? (
          <Sparkles size={14} className="text-amber-400 shrink-0" />
        ) : (
          <Lock size={14} className="text-white/30 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] text-white/80 line-clamp-1">{capsule.note}</div>
          <div className="text-[11px] text-white/30 mt-0.5">
            {capsule.opened
              ? `Opened ${formatRelativeTime(capsule.openedAt!)}`
              : isDue
                ? 'Ready to open!'
                : `Opens ${formatDate(capsule.openDate)}`}
            {capsule.games.length > 0 && ` · ${capsule.games.length} game${capsule.games.length === 1 ? '' : 's'} tagged`}
          </div>
        </div>
        {expanded ? <ChevronDown size={14} className="text-white/30 shrink-0" /> : <ChevronRight size={14} className="text-white/30 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-white/5 pt-3">
          <div className="text-[12px] text-white/60 leading-relaxed italic">&ldquo;{capsule.note}&rdquo;</div>
          <div className="text-[10px] text-white/25">Sealed {formatDate(capsule.createdAt)}</div>

          {capsule.opened && outcomes.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wide text-white/30 font-semibold">Then vs. now</div>
              {outcomes.map(o => (
                <div key={o.snapshot.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-black/20">
                  <span className="text-[12px] text-white/70 truncate">{o.snapshot.name}</span>
                  {o.current ? (
                    <div className="flex items-center gap-3 text-[11px] shrink-0">
                      <DeltaBadge value={o.hoursDelta} unit="h" />
                      {o.statusChanged && (
                        <span className="text-violet-300/80">{o.snapshot.status} → {o.current.status}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-white/25 shrink-0">Removed from library</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/15 text-white/40 hover:text-red-300 text-[11px] font-medium transition-colors"
            >
              <Trash2 size={12} /> Delete
            </button>
            {!capsule.opened && isDue && (
              <button
                onClick={onOpenCapsule}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white text-[11px] font-medium transition-colors"
              >
                <Sparkles size={12} /> Open capsule
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function TimeCapsuleModal({ games, sealed, opened, due, onSeal, onOpenCapsule, onDelete, getOutcomes, onClose }: TimeCapsuleModalProps) {
  const [showForm, setShowForm] = useState(sealed.length === 0 && opened.length === 0);
  const dueIds = new Set(due.map(c => c.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-violet-400" />
            <h3 className="text-lg font-bold text-white/90">Time Capsule</h3>
          </div>
          <button onClick={onClose} className="p-1 text-white/30 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          <p className="text-[12px] text-white/40 leading-relaxed">
            Write a prediction or note to future-you, seal it until a date you choose, and tag a few games to
            track. When it&apos;s time, come back and see how it played out.
          </p>

          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-violet-600/80 hover:bg-violet-600 text-white text-sm font-medium transition-colors"
            >
              <PlusCircle size={14} /> Seal a new capsule
            </button>
          )}
          {showForm && <SealForm games={games} onSeal={(note, date, tagged) => { onSeal(note, date, tagged); setShowForm(false); }} />}

          {due.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wide text-amber-400/70 font-semibold">Ready to open</div>
              {due.map(c => (
                <CapsuleRow
                  key={c.id}
                  capsule={c}
                  outcomes={getOutcomes(c)}
                  isDue
                  onOpenCapsule={() => onOpenCapsule(c.id)}
                  onDelete={() => onDelete(c.id)}
                />
              ))}
            </div>
          )}

          {sealed.filter(c => !dueIds.has(c.id)).length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wide text-white/30 font-semibold">Still sealed</div>
              {sealed.filter(c => !dueIds.has(c.id)).map(c => (
                <CapsuleRow
                  key={c.id}
                  capsule={c}
                  outcomes={[]}
                  isDue={false}
                  onOpenCapsule={() => onOpenCapsule(c.id)}
                  onDelete={() => onDelete(c.id)}
                />
              ))}
            </div>
          )}

          {opened.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wide text-white/30 font-semibold">Opened</div>
              {opened.map(c => (
                <CapsuleRow
                  key={c.id}
                  capsule={c}
                  outcomes={getOutcomes(c)}
                  isDue={false}
                  onOpenCapsule={() => onOpenCapsule(c.id)}
                  onDelete={() => onDelete(c.id)}
                />
              ))}
            </div>
          )}

          {sealed.length === 0 && opened.length === 0 && !showForm && (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <Sparkles size={28} className="text-white/15" />
              <div className="text-[13px] text-white/40">No capsules yet</div>
              <div className="text-[11px] text-white/25 max-w-xs">
                Seal a prediction about your gaming future and check back when it&apos;s due.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
