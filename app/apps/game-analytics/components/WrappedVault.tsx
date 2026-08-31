'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { CalendarDays, ChevronRight, Film, X } from 'lucide-react';
import clsx from 'clsx';

interface WrappedVaultProps {
  monthKeys: string[];
  years: number[];
  onOpenWeek: (offset: number) => void;
  onOpenMonth: (monthKey: string) => void;
  onOpenQuarter: (year: number, quarter: number) => void;
  onOpenYear: (year: number) => void;
  onClose: () => void;
}

export function WrappedVault({ monthKeys, years, onOpenWeek, onOpenMonth, onOpenQuarter, onOpenYear, onClose }: WrappedVaultProps) {
  const quarterKeys = [...new Set(monthKeys.map(key => {
    const [year, month] = key.split('-').map(Number);
    return `${year}-Q${Math.ceil(month / 3)}`;
  }))];

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-5" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="wrapped-vault-title">
      <div className="max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-white/10 bg-[#111018] shadow-2xl sm:rounded-3xl" onClick={event => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/8 bg-[#111018]/95 px-4 py-4 backdrop-blur sm:px-6">
          <div>
            <div id="wrapped-vault-title" className="flex items-center gap-2 text-lg font-black text-white"><Film size={19} className="text-purple-300" /> Wrapped Vault</div>
            <p className="text-xs text-white/35">Every chapter of your play story, in one place.</p>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/50" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="space-y-6 p-4 sm:p-6">
          <section>
            <SectionTitle eyebrow="Fresh chapters" title="Replay the recent story" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <VaultCard accent="blue" icon="7D" title="This week" subtitle="The live chapter" onClick={() => onOpenWeek(-1)} />
              <VaultCard accent="cyan" icon="W" title="Last week" subtitle="Your weekly replay" onClick={() => onOpenWeek(0)} />
              {monthKeys[0] && <VaultCard accent="purple" icon="M" title={formatMonth(monthKeys[0])} subtitle="Monthly Wrapped" onClick={() => onOpenMonth(monthKeys[0])} />}
              {quarterKeys[0] && <VaultCard accent="amber" icon="Q" title={quarterKeys[0]} subtitle="Season recap" onClick={() => openQuarterKey(quarterKeys[0], onOpenQuarter)} />}
            </div>
          </section>

          {monthKeys.length > 0 && (
            <section>
              <SectionTitle eyebrow="Monthly chapters" title="Your play diary" />
              <div className="divide-y divide-white/6 overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02]">
                {monthKeys.map(key => <VaultRow key={key} icon={<CalendarDays size={15} />} title={formatMonth(key)} subtitle="Games, hours, discoveries, value, and your closing reflection" onClick={() => onOpenMonth(key)} />)}
              </div>
            </section>
          )}

          {years.length > 0 && (
            <section>
              <SectionTitle eyebrow="Big stories" title="Seasons and years" />
              <div className="grid gap-3 sm:grid-cols-2">
                {years.map(year => (
                  <div key={year} className="overflow-hidden rounded-2xl border border-amber-400/15 bg-gradient-to-br from-amber-500/10 to-purple-500/5">
                    <button onClick={() => onOpenYear(year)} className="flex min-h-24 w-full items-center justify-between p-4 text-left">
                      <div><div className="text-3xl font-black text-white">{year}</div><div className="text-xs text-amber-100/50">Full Year Wrapped</div></div><ChevronRight className="text-amber-300/50" />
                    </button>
                    <div className="grid grid-cols-4 border-t border-white/6">
                      {[1, 2, 3, 4].map(quarter => {
                        const exists = quarterKeys.includes(`${year}-Q${quarter}`);
                        return <button key={quarter} disabled={!exists} onClick={() => onOpenQuarter(year, quarter)} className="min-h-10 border-r border-white/6 text-[10px] font-bold text-white/45 last:border-r-0 disabled:opacity-20">Q{quarter}</button>;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {monthKeys.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/35">Your vault fills as you log play time after a session.</div>}
        </div>
      </div>
    </div>
  );
}

function openQuarterKey(key: string, onOpen: (year: number, quarter: number) => void) {
  const [year, quarter] = key.split('-Q').map(Number);
  onOpen(year, quarter);
}

function formatMonth(key: string) {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div className="mb-3"><div className="text-[9px] font-bold uppercase tracking-[0.22em] text-purple-300/55">{eyebrow}</div><h3 className="text-base font-bold text-white/85">{title}</h3></div>;
}

function VaultCard({ accent, icon, title, subtitle, onClick }: { accent: 'blue' | 'cyan' | 'purple' | 'amber'; icon: string; title: string; subtitle: string; onClick: () => void }) {
  const accents = { blue: 'from-blue-500/25 text-blue-200', cyan: 'from-cyan-500/25 text-cyan-200', purple: 'from-purple-500/25 text-purple-200', amber: 'from-amber-500/25 text-amber-200' };
  return <button onClick={onClick} className={clsx('min-h-36 rounded-2xl border border-white/8 bg-gradient-to-br to-white/[0.02] p-3 text-left', accents[accent])}><div className="mb-5 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-xs font-black">{icon}</div><div className="text-sm font-bold text-white">{title}</div><div className="mt-0.5 text-[10px] text-white/35">{subtitle}</div></button>;
}

function VaultRow({ icon, title, subtitle, onClick }: { icon: ReactNode; title: string; subtitle: string; onClick: () => void }) {
  return <button onClick={onClick} className="flex min-h-16 w-full items-center gap-3 px-4 text-left"><div className="text-purple-300/60">{icon}</div><div className="min-w-0 flex-1"><div className="text-sm font-semibold text-white/75">{title}</div><div className="truncate text-[10px] text-white/30">{subtitle}</div></div><ChevronRight size={15} className="text-white/20" /></button>;
}
