'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, ChevronDown, Gamepad2, Shield, Sparkles, X } from 'lucide-react';
import clsx from 'clsx';
import { Game } from '../lib/types';
import { ShareButton } from './ShareButton';
import { LoveBadge } from './LovePicker';
import { isLovedGame } from '../lib/love';

type SnapshotRange = 'week' | 'month' | 'year' | 'all';
type SnapshotFormat = 'story' | 'portrait' | 'square';

interface PlaySnapshotModalProps {
  games: Game[];
  defaultPrivacy?: 'highlights' | 'hide-spending' | 'everything';
  onClose: () => void;
}

const RANGE_LABELS: Record<SnapshotRange, string> = {
  week: 'This week',
  month: 'This month',
  year: 'This year',
  all: 'All time',
};

const FORMAT_STYLES: Record<SnapshotFormat, string> = {
  story: 'aspect-[9/16]',
  portrait: 'aspect-[4/5]',
  square: 'aspect-square',
};

function rangeStart(range: SnapshotRange): Date | null {
  if (range === 'all') return null;
  const now = new Date();
  if (range === 'week') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return start;
  }
  if (range === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date(now.getFullYear(), 0, 1);
}

function defaultSnapshotRange(games: Game[]): SnapshotRange {
  const hasLogsSince = (start: Date) => games.some(game => (game.playLogs || []).some(log => new Date(`${log.date}T12:00:00`) >= start));
  const now = new Date();
  if (hasLogsSince(new Date(now.getFullYear(), now.getMonth(), 1))) return 'month';
  if (hasLogsSince(new Date(now.getFullYear(), 0, 1))) return 'year';
  return 'all';
}

export function PlaySnapshotModal({ games, defaultPrivacy = 'hide-spending', onClose }: PlaySnapshotModalProps) {
  const [range, setRange] = useState<SnapshotRange>(() => defaultSnapshotRange(games));
  const [format, setFormat] = useState<SnapshotFormat>('story');
  const [includeHours, setIncludeHours] = useState(true);
  const [includeCompletions, setIncludeCompletions] = useState(true);
  const [includeSpending, setIncludeSpending] = useState(defaultPrivacy === 'everything');
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const snapshot = useMemo(() => {
    const start = rangeStart(range);
    const played = games.map(game => {
      const logs = (game.playLogs || []).filter(log => !start || new Date(`${log.date}T12:00:00`).getTime() >= start.getTime());
      return { game, logs, hours: logs.reduce((sum, log) => sum + log.hours, 0) };
    }).filter(item => item.logs.length > 0).sort((a, b) => b.hours - a.hours);
    const completed = games.filter(game => game.status === 'Completed' && game.endDate && (!start || new Date(`${game.endDate}T12:00:00`).getTime() >= start.getTime()));
    const purchased = games.filter(game => !game.acquiredFree && game.datePurchased && (!start || new Date(`${game.datePurchased}T12:00:00`).getTime() >= start.getTime()));
    return {
      played,
      completed,
      hours: played.reduce((sum, item) => sum + item.hours, 0),
      sessions: played.reduce((sum, item) => sum + item.logs.length, 0),
      psPlus: played.filter(item => item.game.acquiredFree && item.game.subscriptionSource === 'PS Plus').length,
      spent: purchased.reduce((sum, game) => sum + (game.price || 0), 0),
      loved: played.filter(item => isLovedGame(item.game)).length,
    };
  }, [games, range]);

  const featured = snapshot.played.slice(0, 4);
  const now = new Date();
  const periodLine = range === 'year'
    ? `${now.getFullYear()}`
    : range === 'month'
      ? now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : RANGE_LABELS[range];

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-5" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="share-studio-title">
      <div className="flex max-h-[96dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#101017] shadow-2xl sm:rounded-3xl" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3 sm:px-6">
          <div>
            <div id="share-studio-title" className="flex items-center gap-2 text-sm font-semibold text-white"><Sparkles size={16} className="text-purple-300" /> Share Studio</div>
            <p className="text-[11px] text-white/35">A private-by-default snapshot of what you played.</p>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/50" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(300px,420px)_1fr]">
          <div className="bg-black/20 p-4 sm:p-6">
            <div ref={captureRef} className={clsx('relative mx-auto w-full max-w-[360px] overflow-hidden rounded-[28px] border border-white/10 bg-[#130f20] p-5 text-white shadow-2xl', FORMAT_STYLES[format])}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(124,58,237,.55),transparent_42%),radial-gradient(circle_at_100%_80%,rgba(37,99,235,.3),transparent_45%)]" />
              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-purple-200/70">My Play Chronicle</p>
                    <h2 className="mt-1 text-2xl font-black leading-tight">What I Played</h2>
                    <p className="text-xs text-white/50">{periodLine}</p>
                  </div>
                  <div className="rounded-full border border-white/15 bg-white/10 p-2"><Gamepad2 size={18} /></div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  {featured.map(({ game }, index) => (
                    <div key={game.id} className={clsx('relative overflow-hidden rounded-2xl bg-white/5', featured.length === 1 && 'col-span-2')}>
                      {game.thumbnail ? <img src={game.thumbnail} alt="" className="aspect-[4/3] h-full w-full object-cover" /> : <div className="aspect-[4/3]" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-2.5">
                        <div className="line-clamp-1 text-[11px] font-bold">{index === 0 && '★ '}{game.name}</div>
                        {game.acquiredFree && game.subscriptionSource === 'PS Plus' && <div className="mt-0.5 text-[8px] font-bold uppercase tracking-widest text-yellow-200">PS Plus</div>}
                        <LoveBadge game={game} className="mt-1" />
                      </div>
                    </div>
                  ))}
                  {featured.length === 0 && (
                    <div className="col-span-2 flex aspect-[4/3] items-center justify-center rounded-2xl border border-dashed border-white/15 text-center text-xs text-white/35">Log a play session to fill this chapter.</div>
                  )}
                </div>

                <div className="mt-auto grid grid-cols-3 gap-2 pt-4">
                  <SnapshotStat value={`${snapshot.played.length}`} label="games" />
                  <SnapshotStat value={includeHours ? `${snapshot.hours.toFixed(1)}h` : `${snapshot.sessions}`} label={includeHours ? 'played' : 'sessions'} />
                  <SnapshotStat value={includeCompletions ? `${snapshot.completed.length}` : `${snapshot.psPlus}`} label={includeCompletions ? 'finished' : 'PS Plus'} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-[9px] uppercase tracking-[0.18em] text-white/35">
                  <span>{snapshot.loved > 0 ? `${snapshot.loved} loved · ` : ''}{includeSpending ? `$${snapshot.spent.toFixed(0)} spent · ` : ''}Remembered</span><span>Game Chronicle</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-4 sm:p-6">
            <Control label="Time period">
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(RANGE_LABELS) as SnapshotRange[]).map(option => <ChoiceButton key={option} active={range === option} onClick={() => setRange(option)}>{RANGE_LABELS[option]}</ChoiceButton>)}
              </div>
            </Control>
            <Control label="Share shape">
              <div className="grid grid-cols-3 gap-2">
                {(['story', 'portrait', 'square'] as SnapshotFormat[]).map(option => <ChoiceButton key={option} active={format === option} onClick={() => setFormat(option)}>{option === 'story' ? '9:16' : option === 'portrait' ? '4:5' : '1:1'}</ChoiceButton>)}
              </div>
            </Control>
            <Control label="What appears">
              <Toggle checked={includeHours} onChange={setIncludeHours} label="Show hours" />
              <Toggle checked={includeCompletions} onChange={setIncludeCompletions} label="Show completions" />
              <Toggle checked={includeSpending} onChange={setIncludeSpending} label="Show spending" />
            </Control>
            <div className="flex gap-2 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-3 text-xs text-emerald-100/65"><Shield size={16} className="shrink-0 text-emerald-300" /><span>Spending, ratings, notes, and moods stay private. You choose what leaves the app.</span></div>
            <ShareButton targetRef={captureRef} filename={`what-i-played-${range}`} shareText={`What I played · ${periodLine}`} className="w-full justify-center" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SnapshotStat({ value, label }: { value: string; label: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/7 p-2 text-center"><div className="text-lg font-black">{value}</div><div className="text-[8px] uppercase tracking-wider text-white/40">{label}</div></div>;
}

function Control({ label, children }: { label: string; children: ReactNode }) {
  return <div><div className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/35">{label}<ChevronDown size={11} /></div><div className="space-y-2">{children}</div></div>;
}

function ChoiceButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button onClick={onClick} className={clsx('min-h-10 rounded-xl border px-3 text-xs font-semibold capitalize', active ? 'border-purple-400/35 bg-purple-500/15 text-purple-100' : 'border-white/8 bg-white/[0.025] text-white/45')}>{children}</button>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <button onClick={() => onChange(!checked)} className="flex min-h-11 w-full items-center justify-between rounded-xl border border-white/8 bg-white/[0.025] px-3 text-xs text-white/65"><span>{label}</span><span className={clsx('flex h-6 w-6 items-center justify-center rounded-full border', checked ? 'border-purple-400 bg-purple-500 text-white' : 'border-white/15 text-transparent')}>{checked && <Check size={13} />}</span></button>;
}
