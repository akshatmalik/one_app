'use client';

import { Gamepad2, RotateCcw, Settings2, Sparkles, X } from 'lucide-react';
import clsx from 'clsx';
import { ExperiencePreferences } from '../lib/experience-preferences';
import { SubscriptionTier } from '../lib/types';

interface ExperiencePreferencesModalProps {
  preferences: ExperiencePreferences;
  onChange: (changes: Partial<ExperiencePreferences>) => void;
  onReset: () => void;
  onClose: () => void;
}

const TIERS: SubscriptionTier[] = ['Essential', 'Extra', 'Premium'];

function ToggleRow({
  title,
  description,
  enabled,
  onToggle,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3.5 text-left"
      aria-pressed={enabled}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-white/85">{title}</div>
        <div className="mt-0.5 text-xs leading-relaxed text-white/35">{description}</div>
      </div>
      <span className={clsx(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors',
        enabled ? 'bg-blue-500' : 'bg-white/10',
      )}>
        <span className={clsx(
          'absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform',
          enabled ? 'translate-x-6' : 'translate-x-1',
        )} />
      </span>
    </button>
  );
}

export function ExperiencePreferencesModal({
  preferences,
  onChange,
  onReset,
  onClose,
}: ExperiencePreferencesModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="experience-preferences-title">
      <button className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} aria-label="Close experience preferences" />
      <section className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#101018] sm:max-w-lg sm:rounded-3xl">
        <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300"><Settings2 size={17} /></div>
            <div>
              <h2 id="experience-preferences-title" className="text-base font-semibold text-white">Your game experience</h2>
              <p className="text-[11px] text-white/35">PlayStation-first, tuned to how you actually log.</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl text-white/45 hover:bg-white/5 hover:text-white" aria-label="Close"><X size={18} /></button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-4 pb-8 sm:p-5">
          <div className="rounded-2xl border border-blue-400/10 bg-gradient-to-br from-blue-500/10 to-indigo-500/[0.04] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-300/70"><Gamepad2 size={13} /> Primary ecosystem</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(['PlayStation', 'Multi-platform'] as const).map(ecosystem => (
                <button
                  key={ecosystem}
                  onClick={() => onChange({ ecosystem })}
                  className={clsx(
                    'min-h-11 rounded-xl border px-3 text-sm font-medium transition-colors',
                    preferences.ecosystem === ecosystem
                      ? 'border-blue-400/25 bg-blue-500/15 text-blue-200'
                      : 'border-white/[0.06] bg-black/10 text-white/40',
                  )}
                >
                  {ecosystem}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white/35">
              New games default to {preferences.ecosystem === 'PlayStation' ? 'PS5 and PlayStation Store' : 'your last-used platform'}.
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-white/60"><Sparkles size={13} className="text-indigo-300" /> PS Plus tier</div>
            <div className="grid grid-cols-3 gap-2">
              {TIERS.map(tier => (
                <button
                  key={tier}
                  onClick={() => onChange({ psPlusTier: tier })}
                  className={clsx(
                    'min-h-10 rounded-xl border text-xs font-medium',
                    preferences.psPlusTier === tier
                      ? 'border-indigo-400/25 bg-indigo-500/15 text-indigo-200'
                      : 'border-white/[0.06] bg-white/[0.02] text-white/35',
                  )}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <ToggleRow
              title="Show live timers"
              description="Off by default. Check in with a date and hours instead."
              enabled={preferences.showTimers}
              onToggle={() => onChange({ showTimers: !preferences.showTimers })}
            />
            <ToggleRow
              title="Show mood, vibe, and context"
              description="Keep session logging compact, or reveal the optional detail tags."
              enabled={preferences.showSessionDetails}
              onToggle={() => onChange({ showSessionDetails: !preferences.showSessionDetails })}
            />
          </div>

          <button onClick={onReset} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-medium text-white/35 hover:bg-white/5 hover:text-white/60">
            <RotateCcw size={13} /> Restore PlayStation-first defaults
          </button>
        </div>
      </section>
    </div>
  );
}
