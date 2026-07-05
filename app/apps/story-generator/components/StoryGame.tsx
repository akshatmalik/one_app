'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Dices,
  FolderOpen,
  Heart,
  Loader2,
  Lock,
  Package,
  Play,
  RotateCcw,
  Save,
  Send,
  Skull,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { useStoryGame } from '../hooks/useStoryGame';
import { parseNarration, narrationLength, NarrationParagraph } from '../lib/narration';
import { ArchivedStory, FateRoll, StorySave, TranscriptEntry, TurnEffect } from '../lib/types';
import { ZOMBIE_ARC } from '../lib/arc-zombie';

// ── Small helpers ────────────────────────────────────────────────────

/** 34.75 → "34¾" — the clock reads like a watch, not a float. */
function formatHours(h: number): string {
  const whole = Math.floor(h);
  const frac = h - whole;
  const glyph = frac >= 0.75 ? '¾' : frac >= 0.5 ? '½' : frac >= 0.25 ? '¼' : '';
  return `${whole}${glyph}`;
}

const FATE_STYLE: Record<FateRoll['band'], { label: string; cls: string }> = {
  disaster: { label: 'Disaster', cls: 'text-red-400 border-red-500/40 bg-red-500/10' },
  setback: { label: 'Setback', cls: 'text-orange-400 border-orange-500/30 bg-orange-500/10' },
  mixed: { label: 'At a cost', cls: 'text-amber-300 border-amber-500/30 bg-amber-500/10' },
  clean: { label: 'Clean', cls: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  triumph: { label: 'Triumph', cls: 'text-yellow-300 border-yellow-400/40 bg-yellow-400/10' },
};

function trustColor(t: number): string {
  return t <= 3 ? 'text-red-400' : t <= 6 ? 'text-amber-300' : 'text-emerald-400';
}

// The sky tracks the in-game clock: grey morning → flat day → rust dusk →
// deep night → the final amber dawn. Pure atmosphere, zero text.
type SkyPhase = 'morning' | 'day' | 'dusk' | 'night' | 'dawn';

function skyPhase(hoursLeft: number): SkyPhase {
  if (hoursLeft > 28) return 'morning';
  if (hoursLeft > 20) return 'day';
  if (hoursLeft > 14) return 'dusk';
  if (hoursLeft > 6) return 'night';
  return 'dawn';
}

const SKY_GRADIENTS: Record<SkyPhase, string> = {
  morning: 'radial-gradient(ellipse 120% 70% at 50% -10%, rgba(148,163,184,0.16), transparent 60%)',
  day: 'radial-gradient(ellipse 120% 70% at 50% -10%, rgba(203,213,225,0.11), transparent 55%)',
  dusk: 'radial-gradient(ellipse 120% 70% at 50% -10%, rgba(217,119,6,0.18), transparent 62%)',
  night: 'radial-gradient(ellipse 120% 70% at 50% -10%, rgba(30,58,138,0.26), transparent 65%)',
  dawn: 'radial-gradient(ellipse 120% 70% at 50% -10%, rgba(245,158,11,0.22), transparent 60%)',
};

// ── Narration rendering ──────────────────────────────────────────────
// Narration is markdown-lite (short paragraphs, **bold**, *italics*,
// quoted dialogue). We pre-parse into segments and reveal by character
// budget so the typewriter never shows a half-open `**` marker.

function NarrationBody({ paragraphs, budget, showCaret }: { paragraphs: NarrationParagraph[]; budget: number; showCaret: boolean }) {
  let remaining = budget;
  const out: ReactNode[] = [];
  for (let pi = 0; pi < paragraphs.length && remaining > 0; pi++) {
    const p = paragraphs[pi];
    const nodes: ReactNode[] = [];
    for (let si = 0; si < p.segments.length && remaining > 0; si++) {
      const seg = p.segments[si];
      const take = seg.text.slice(0, remaining);
      remaining -= take.length;
      if (!take) continue;
      if (seg.bold) nodes.push(<strong key={si} className="font-semibold text-white">{take}</strong>);
      else if (seg.italic) nodes.push(<em key={si} className="italic text-amber-100/85">{take}</em>);
      else nodes.push(<span key={si}>{take}</span>);
    }
    const isLastRendered = remaining <= 0 || pi === paragraphs.length - 1;
    out.push(
      <p
        key={pi}
        className={clsx(
          'mb-2.5 last:mb-0',
          p.isDialogue && 'border-l-2 border-red-500/40 pl-3 text-red-100/90',
        )}
      >
        {nodes}
        {showCaret && isLastRendered && <span className="story-caret text-red-400">▌</span>}
      </p>,
    );
    if (remaining <= 0) break;
  }
  return <>{out}</>;
}

function TypewriterNarration({
  text,
  animate,
  onProgress,
  onDone,
}: {
  text: string;
  animate: boolean;
  onProgress: () => void;
  onDone: () => void;
}) {
  const paragraphs = parseNarration(text);
  const total = narrationLength(paragraphs);
  const [count, setCount] = useState(animate ? 0 : total);
  const doneRef = useRef(!animate);

  useEffect(() => {
    if (!animate) {
      setCount(total);
      return;
    }
    doneRef.current = false;
    setCount(0);
    const iv = setInterval(() => {
      setCount(c => {
        const next = Math.min(total, c + 5);
        if (next >= total) clearInterval(iv);
        return next;
      });
    }, 24);
    return () => clearInterval(iv);
  }, [text, animate, total]);

  useEffect(() => {
    if (!animate) return;
    onProgress();
    if (count >= total && !doneRef.current) {
      doneRef.current = true;
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const typing = animate && count < total;
  return (
    <div onClick={() => typing && setCount(total)} className={typing ? 'cursor-pointer' : undefined}>
      <NarrationBody paragraphs={paragraphs} budget={count} showCaret={typing} />
    </div>
  );
}

const EFFECT_TONE: Record<TurnEffect['tone'], string> = {
  good: 'text-emerald-300 border-emerald-500/25 bg-emerald-500/10',
  bad: 'text-red-300 border-red-500/25 bg-red-500/10',
  neutral: 'text-white/50 border-white/10 bg-white/5',
};

function EffectChips({ effects }: { effects: TurnEffect[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5 story-fade-up">
      {effects.map((fx, i) => (
        <span key={i} className={clsx('text-[10px] px-2 py-0.5 rounded-full border font-medium', EFFECT_TONE[fx.tone])}>
          {fx.text}
        </span>
      ))}
    </div>
  );
}

// ── Act title card ───────────────────────────────────────────────────

function TitleCard({ act, actTitle, beatTitle }: { act: number; actTitle: string; beatTitle: string }) {
  return (
    <div className="story-title-card fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none px-6 text-center">
      <p className="story-title-text text-red-500/90 text-xs font-semibold uppercase tracking-[0.5em] mb-4">Act {act}</p>
      <h2 className="story-title-text text-3xl sm:text-4xl font-bold text-white uppercase">{actTitle}</h2>
      <div className="story-title-text h-px w-24 bg-red-500/40 my-5" />
      <p className="story-title-text text-white/50 text-sm tracking-[0.3em] uppercase">{beatTitle}</p>
    </div>
  );
}

// ── Journal ──────────────────────────────────────────────────────────

function Journal({ save, onClose }: { save: StorySave; onClose: () => void }) {
  const arc = ZOMBIE_ARC;
  const beat = arc.beats[save.beatIndex];
  const elapsed = arc.openingState.hoursLeft - save.state.hoursLeft;
  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-sm h-full bg-[#0d0d0f] border-l border-white/10 overflow-y-auto p-5 story-fade-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold flex items-center gap-2"><BookOpen size={16} className="text-red-400" /> Journal</h2>
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white/80 rounded-lg hover:bg-white/5" aria-label="Close journal">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6 text-center">
          <div className="rounded-xl bg-white/[0.04] border border-white/5 py-2.5">
            <p className="text-lg font-bold text-white">{formatHours(elapsed)}h</p>
            <p className="text-[10px] uppercase tracking-wider text-white/35">On the road</p>
          </div>
          <div className="rounded-xl bg-white/[0.04] border border-white/5 py-2.5">
            <p className="text-lg font-bold text-white">{save.state.health}</p>
            <p className="text-[10px] uppercase tracking-wider text-white/35">Health</p>
          </div>
          <div className="rounded-xl bg-white/[0.04] border border-white/5 py-2.5">
            <p className="text-lg font-bold text-white">{save.deathCount}</p>
            <p className="text-[10px] uppercase tracking-wider text-white/35">Deaths</p>
          </div>
        </div>

        <p className="text-[10px] uppercase tracking-[0.2em] text-red-400/70 font-semibold mb-2">The story so far</p>
        <ol className="space-y-2.5 mb-6">
          {save.beatRecaps.map((r, i) => (
            <li key={i} className="text-sm text-white/60 leading-relaxed flex gap-2.5">
              <span className="text-red-500/60 font-semibold shrink-0">{i + 1}.</span>
              {r}
            </li>
          ))}
          <li className="text-sm text-white/85 leading-relaxed flex gap-2.5">
            <span className="text-red-400 font-semibold shrink-0">▸</span>
            <span><span className="text-red-300/90">Now:</span> {beat.title} — Act {beat.act}, {beat.actTitle}</span>
          </li>
        </ol>

        {save.state.companions.length > 0 && (
          <>
            <p className="text-[10px] uppercase tracking-[0.2em] text-blue-400/70 font-semibold mb-2">Companions</p>
            <div className="space-y-2 mb-6">
              {save.state.companions.map(c => {
                const t = save.state.trust[c] ?? 5;
                return (
                  <div key={c} className="flex items-center justify-between rounded-xl bg-white/[0.04] border border-white/5 px-3 py-2">
                    <span className="text-sm text-white/80">{c}</span>
                    <span className={clsx('flex items-center gap-1 text-xs font-semibold', trustColor(t))}>
                      <Heart size={12} className="fill-current" /> {t}/10
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {save.state.inventory.length > 0 && (
          <>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold mb-2">Pack</p>
            <div className="flex flex-wrap gap-1.5 mb-6">
              {save.state.inventory.map(i => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-white/60 border border-white/10">{i}</span>
              ))}
            </div>
          </>
        )}

        {save.state.conditions.length > 0 && (
          <>
            <p className="text-[10px] uppercase tracking-[0.2em] text-red-400/70 font-semibold mb-2">Wounds & afflictions</p>
            <div className="flex flex-wrap gap-1.5">
              {save.state.conditions.map(c => (
                <span key={c} className="text-xs px-2.5 py-1 rounded-full bg-red-500/10 text-red-300 border border-red-500/20">{c}</span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Load menu (in-game) ──────────────────────────────────────────────

function LoadMenu({
  library,
  onResume,
  onDelete,
  onClose,
}: {
  library: ArchivedStory[];
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[80dvh] overflow-y-auto bg-[#0d0d0f] border border-white/10 rounded-t-2xl sm:rounded-2xl p-5 story-fade-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-white font-semibold flex items-center gap-2"><FolderOpen size={16} className="text-red-400" /> Load a story</h2>
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white/80 rounded-lg hover:bg-white/5" aria-label="Close load menu">
            <X size={16} />
          </button>
        </div>
        <p className="text-white/35 text-xs mb-4">Loading shelves your current run into the library first — nothing is lost.</p>
        {library.length === 0 ? (
          <p className="text-white/40 text-sm py-6 text-center">No saved stories yet. Use the save button to shelve this run.</p>
        ) : (
          <div className="space-y-2">
            {library.map(a => (
              <LibraryCard
                key={a.id}
                story={a}
                disabled={false}
                onResume={() => onResume(a.id)}
                onDelete={() => onDelete(a.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Start screen ─────────────────────────────────────────────────────

function LibraryCard({
  story,
  onResume,
  onDelete,
  disabled,
}: {
  story: ArchivedStory;
  onResume: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const arc = ZOMBIE_ARC;
  const s = story.save;
  const beat = arc.beats[s.beatIndex];
  const endingTitle = s.endingId ? arc.endings.find(e => e.id === s.endingId)?.title : undefined;
  const statusLine =
    s.status === 'ended' ? `Finished — ${endingTitle ?? 'The Crossing'}` :
    s.status === 'dead' ? `Died in Act ${beat?.act ?? '?'} — retry waiting` :
    `Act ${beat?.act ?? 1} · ${beat?.title ?? ''} · ${formatHours(s.state.hoursLeft)}h left`;

  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-left">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white/85 font-medium truncate">
          {s.playerName ? `${s.playerName}'s run` : 'Unnamed run'}
          <span className="text-white/30 font-normal"> · {new Date(story.archivedAt).toLocaleDateString()}</span>
        </p>
        <p className={clsx('text-xs truncate mt-0.5', s.status === 'ended' ? 'text-amber-300/80' : s.status === 'dead' ? 'text-red-400/80' : 'text-white/45')}>
          {statusLine}
        </p>
      </div>
      <button
        onClick={onResume}
        disabled={disabled}
        className="p-2 rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/25 hover:text-white transition-colors disabled:opacity-40"
        aria-label="Resume story"
      >
        <Play size={15} />
      </button>
      <button
        onClick={onDelete}
        className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-white/5 transition-colors"
        aria-label="Delete story"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function StartScreen({
  loading,
  error,
  library,
  unlockedEndingIds,
  onStart,
  onResume,
  onDelete,
}: {
  loading: boolean;
  error: string | null;
  library: ArchivedStory[];
  unlockedEndingIds: string[];
  onStart: (name: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const arc = ZOMBIE_ARC;
  const [name, setName] = useState('');
  const [showEndings, setShowEndings] = useState(false);

  return (
    <div className="min-h-dvh bg-[#0a0a0a] flex flex-col">
      <div className="px-4 py-3">
        <Link href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors">
          <ArrowLeft size={16} /> Hub
        </Link>
      </div>
      <div className="flex-1 flex flex-col items-center px-6 pb-12 text-center">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-red-900/40 to-amber-900/20 border border-red-500/20 mb-6 mt-4">
          <Skull size={40} className="text-red-400" />
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight mb-2">{arc.title}</h1>
        <p className="text-red-400/90 font-medium mb-6">{arc.tagline}</p>
        <p className="text-white/60 text-sm leading-relaxed max-w-md mb-8">{arc.premise}</p>

        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onStart(name); }}
          placeholder="Your name (optional — companions will use it)"
          maxLength={24}
          className="w-full max-w-xs px-4 py-3 mb-4 bg-white/5 border border-white/10 rounded-xl text-white text-sm text-center placeholder-white/25 focus:outline-none focus:border-red-500/50 transition-colors"
        />
        <button
          onClick={() => onStart(name)}
          disabled={loading}
          className="px-8 py-4 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 disabled:opacity-50 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-red-900/30 flex items-center gap-2"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : null}
          {loading ? 'The city wakes...' : 'Begin'}
        </button>
        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
        <p className="text-white/25 text-xs mt-6 max-w-sm">
          Type anything — the story reacts to what you say. Every action rolls fate. Choices cost time, noise draws the dead, and death sends you back to the start of the scene.
        </p>

        {library.length > 0 && (
          <div className="w-full max-w-md mt-10 text-left">
            <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-semibold mb-3">Your stories</p>
            <div className="space-y-2">
              {library.map(a => (
                <LibraryCard
                  key={a.id}
                  story={a}
                  disabled={loading}
                  onResume={() => onResume(a.id)}
                  onDelete={() => onDelete(a.id)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="w-full max-w-md mt-10 text-left">
          <button
            onClick={() => setShowEndings(v => !v)}
            className="w-full flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/40 font-semibold mb-3 hover:text-white/70 transition-colors"
          >
            <span className="flex items-center gap-2"><Trophy size={13} className="text-amber-400/70" /> Endings discovered — {unlockedEndingIds.length}/{arc.endings.length}</span>
            <span>{showEndings ? '−' : '+'}</span>
          </button>
          {showEndings && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 story-fade-up">
              {arc.endings.map(e => {
                const unlocked = unlockedEndingIds.includes(e.id);
                return (
                  <div
                    key={e.id}
                    className={clsx(
                      'rounded-xl border px-3.5 py-2.5',
                      unlocked ? 'bg-amber-500/[0.07] border-amber-500/25' : 'bg-white/[0.03] border-white/5',
                    )}
                  >
                    <p className={clsx('text-xs font-semibold flex items-center gap-1.5', unlocked ? 'text-amber-300' : 'text-white/35')}>
                      {!unlocked && <Lock size={10} />}
                      {unlocked ? e.title : '???'}
                    </p>
                    <p className="text-[11px] text-white/35 mt-1 leading-snug italic">
                      {unlocked ? e.epitaph : e.hint}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────

export function StoryGame() {
  const {
    arc,
    save,
    library,
    unlockedEndingIds,
    ending,
    hydrated,
    loading,
    error,
    currentBeat,
    startNewGame,
    sendAction,
    retry,
    restartFromCheckpoint,
    saveAndRestart,
    resumeStory,
    deleteStory,
  } = useStoryGame();

  const [input, setInput] = useState('');
  const [journalOpen, setJournalOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [titleCard, setTitleCard] = useState<{ act: number; actTitle: string; beatTitle: string; key: string } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef<number | null>(null);

  // Watch the transcript: new narrator entries get the typewriter, new
  // act-headers get the cinematic title card. Restored entries get neither.
  useEffect(() => {
    if (!save) {
      prevLenRef.current = 0;
      return;
    }
    const len = save.transcript.length;
    const prev = prevLenRef.current;
    prevLenRef.current = len;
    if (prev === null || len <= prev) return;
    // A normal turn appends 1-3 entries; a bigger jump means a whole run was
    // loaded/resumed — restore it silently, no typewriter, no title card.
    if (len - prev > 4) return;
    const fresh = save.transcript.slice(prev);
    const last = fresh[fresh.length - 1];
    if (last.role === 'narrator') setAnimatingId(last.id);
    const actEntry = fresh.find(e => e.role === 'system' && /^ACT \d+ — /.test(e.text));
    if (actEntry) {
      const m = actEntry.text.match(/^ACT (\d+) — (.+) · (.+)$/);
      if (m) setTitleCard({ act: Number(m[1]), actTitle: m[2], beatTitle: m[3], key: actEntry.id });
    }
  }, [save]);

  useEffect(() => {
    if (!titleCard) return;
    const t = setTimeout(() => setTitleCard(null), 3050);
    return () => clearTimeout(t);
  }, [titleCard]);

  const scrollToEnd = useCallback((smooth = false) => {
    endRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
  }, []);

  useEffect(() => {
    scrollToEnd(true);
  }, [save?.transcript.length, loading, error, scrollToEnd]);

  const handleSend = (text?: string) => {
    const action = (text ?? input).trim();
    if (!action || loading) return;
    sendAction(action);
    setInput('');
  };

  if (!hydrated) {
    return (
      <div className="h-dvh bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 size={24} className="text-red-500 animate-spin" />
      </div>
    );
  }

  if (!save) {
    return (
      <StartScreen
        loading={loading}
        error={error}
        library={library}
        unlockedEndingIds={unlockedEndingIds}
        onStart={name => startNewGame(name)}
        onResume={resumeStory}
        onDelete={id => { if (confirm('Delete this saved story forever?')) deleteStory(id); }}
      />
    );
  }

  const { state } = save;
  const healthColor = state.health > 60 ? 'bg-emerald-500' : state.health > 30 ? 'bg-amber-500' : 'bg-red-500';
  const isTerminal = save.status !== 'playing';
  const phase = skyPhase(state.hoursLeft);

  // Hurt = the screen itself bleeds at the edges. Threat feeds in a little too.
  const hurtFactor = state.health < 35 ? (35 - state.health) / 35 : 0;
  const threatFactor = state.threat >= 7 ? 0.35 : 0;
  const vignette = Math.min(1, Math.max(hurtFactor, threatFactor));

  return (
    <div className="h-dvh bg-[#0a0a0a] flex flex-col relative overflow-hidden">
      {/* Living sky — tracks the in-game clock */}
      {(Object.keys(SKY_GRADIENTS) as SkyPhase[]).map(p => (
        <div
          key={p}
          aria-hidden
          className={clsx('absolute inset-0 pointer-events-none transition-opacity duration-[3000ms]', p === phase ? 'opacity-100' : 'opacity-0')}
          style={{ background: SKY_GRADIENTS[p] }}
        />
      ))}
      {/* Blood vignette when hurt or hunted */}
      {vignette > 0 && (
        <div
          aria-hidden
          className={clsx('absolute inset-0 pointer-events-none z-[45]', state.health < 20 && 'story-vignette-pulse')}
          style={{ boxShadow: `inset 0 0 120px 30px rgba(185, 28, 28, ${(0.12 + vignette * 0.3).toFixed(2)})` }}
        />
      )}

      {titleCard && <TitleCard act={titleCard.act} actTitle={titleCard.actTitle} beatTitle={titleCard.beatTitle} />}
      {journalOpen && <Journal save={save} onClose={() => setJournalOpen(false)} />}
      {loadOpen && (
        <LoadMenu
          library={library}
          onResume={id => { setLoadOpen(false); resumeStory(id); }}
          onDelete={id => { if (confirm('Delete this saved story forever?')) deleteStory(id); }}
          onClose={() => setLoadOpen(false)}
        />
      )}

      {/* Header + HUD */}
      <div className="relative z-10 border-b border-white/10 bg-gradient-to-r from-red-950/40 to-transparent">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="p-1.5 -ml-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors" aria-label="Back to hub">
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-red-400/70 font-semibold">
                Act {currentBeat?.act} — {currentBeat?.actTitle}
              </p>
              <h1 className="text-white font-semibold truncate">{currentBeat?.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setJournalOpen(true)}
              className="p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
              aria-label="Open journal"
            >
              <BookOpen size={17} />
            </button>
            <button
              onClick={() => setLoadOpen(true)}
              disabled={loading}
              className="p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors disabled:opacity-40"
              aria-label="Load a story"
            >
              <FolderOpen size={17} />
            </button>
            <button
              onClick={() => { if (confirm('Save this story to your library and return to the title screen? You can resume it any time.')) saveAndRestart(); }}
              className="p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
              aria-label="Save and restart"
            >
              <Save size={17} />
            </button>
          </div>
        </div>
        {/* Scene progress — one segment per beat */}
        <div className="px-4 pb-2 flex items-center gap-1" aria-label={`Scene ${save.beatIndex + 1} of ${arc.beats.length}`}>
          {arc.beats.map((b, i) => (
            <div
              key={b.id}
              className={clsx(
                'h-[3px] flex-1 rounded-full transition-colors duration-500',
                i < save.beatIndex ? 'bg-red-500/70' : i === save.beatIndex ? 'bg-red-400 story-vignette-pulse' : 'bg-white/10',
              )}
            />
          ))}
        </div>
        <div className="px-4 pb-3 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 flex-1 min-w-0 max-w-[160px]">
            <Heart size={13} className="text-red-400 shrink-0" />
            <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
              <div className={clsx('h-full rounded-full transition-all duration-500', healthColor)} style={{ width: `${state.health}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-1 text-amber-300/90 font-medium shrink-0">
            <Clock size={13} />
            {formatHours(state.hoursLeft)}h left
          </div>
          <div className="flex items-center gap-1 shrink-0" title={`Threat ${state.threat}/10`}>
            <Skull size={13} className={state.threat >= 7 ? 'text-red-400' : state.threat >= 4 ? 'text-amber-400' : 'text-white/30'} />
            <span className={clsx('font-medium', state.threat >= 7 ? 'text-red-400' : state.threat >= 4 ? 'text-amber-400' : 'text-white/40')}>
              {state.threat}/10
            </span>
          </div>
        </div>
        {(state.inventory.length > 0 || state.companions.length > 0 || state.conditions.length > 0) && (
          <div className="px-4 pb-2.5 flex flex-wrap gap-1.5">
            {state.companions.map(c => {
              const t = state.trust[c] ?? 5;
              return (
                <span key={c} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20">
                  <Users size={10} /> {c}
                  <Heart size={9} className={clsx('fill-current', trustColor(t))} />
                  <span className={trustColor(t)}>{t}</span>
                </span>
              );
            })}
            {state.conditions.map(c => (
              <span key={c} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/20">
                {c}
              </span>
            ))}
            {state.inventory.map(i => (
              <span key={i} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/10">
                <Package size={10} /> {i}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Transcript */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {save.transcript.map((e: TranscriptEntry) => {
          if (e.role === 'system') {
            return (
              <div key={e.id} className="flex items-center gap-3 py-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-red-500/30" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-red-400/80 font-semibold whitespace-nowrap">{e.text}</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-red-500/30" />
              </div>
            );
          }
          if (e.role === 'player') {
            return (
              <div key={e.id} className="flex flex-col items-end gap-1">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2.5 bg-gradient-to-r from-red-800 to-red-700 text-white text-sm">
                  {e.text}
                </div>
                {e.fate && (
                  <span className={clsx('inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-semibold', FATE_STYLE[e.fate.band].cls)}>
                    <Dices size={10} /> {e.fate.roll} — {FATE_STYLE[e.fate.band].label}
                  </span>
                )}
              </div>
            );
          }
          return (
            <div key={e.id} className="flex flex-col items-start">
              <div className="max-w-[92%] rounded-2xl rounded-bl-sm px-4 py-3 bg-white/[0.06] border border-white/5 text-white/90 text-sm leading-relaxed">
                <TypewriterNarration
                  text={e.text}
                  animate={e.id === animatingId}
                  onProgress={() => scrollToEnd(false)}
                  onDone={() => setAnimatingId(null)}
                />
              </div>
              {e.effects && e.effects.length > 0 && e.id !== animatingId && <EffectChips effects={e.effects} />}
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 bg-white/[0.06] border border-white/5 flex items-center gap-2">
              <Loader2 size={14} className="text-red-400 animate-spin" />
              <span className="text-xs text-white/50">
                {['The world responds...', 'The dead listen...', 'Fate settles...', 'The city shifts...'][save.transcript.length % 4]}
              </span>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-start gap-2">
            <div className="rounded-xl px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>
            <button onClick={retry} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-1">
              <RotateCcw size={12} /> Retry
            </button>
          </div>
        )}

        {/* Death screen */}
        {save.status === 'dead' && (
          <div className="rounded-2xl border border-red-500/30 bg-gradient-to-b from-red-950/60 to-[#140505] p-6 text-center story-fade-up">
            <Skull size={36} className="text-red-500 mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-red-400 mb-2">You didn&apos;t make it</h2>
            <p className="text-white/60 text-sm mb-6">{save.deathCause}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={restartFromCheckpoint}
                disabled={loading}
                className="px-6 py-3 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} /> Retry this scene
              </button>
              <button
                onClick={saveAndRestart}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white/70 font-medium rounded-xl transition-colors"
              >
                Shelve it & start fresh
              </button>
            </div>
            {save.deathCount > 0 && (
              <p className="text-white/25 text-xs mt-4">Deaths this run: {save.deathCount + 1}</p>
            )}
          </div>
        )}

        {/* Ending screen */}
        {save.status === 'ended' && (
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-950/40 to-[#0f0a02] p-6 text-center story-fade-up">
            <p className="text-[10px] uppercase tracking-[0.25em] text-amber-400/80 font-semibold mb-2">Ending discovered</p>
            <h2 className="text-3xl font-bold text-amber-300 mb-2">{ending?.title ?? arc.title}</h2>
            {ending && <p className="text-white/50 text-sm italic mb-5">&ldquo;{ending.epitaph}&rdquo;</p>}
            <div className="text-white/50 text-xs space-y-1 mb-5">
              <p>Survived with {state.health} health · {formatHours(state.hoursLeft)}h to spare</p>
              <p>{state.companions.length > 0 ? `Made it with: ${state.companions.join(', ')}` : 'Made it alone'}</p>
              {save.deathCount > 0 && <p>Deaths along the way: {save.deathCount}</p>}
            </div>
            <p className="text-amber-400/60 text-xs mb-6 flex items-center justify-center gap-1.5">
              <Trophy size={12} /> {unlockedEndingIds.length}/{arc.endings.length} endings discovered
            </p>
            <button
              onClick={saveAndRestart}
              className="px-8 py-3 bg-amber-700 hover:bg-amber-600 text-white font-medium rounded-xl transition-colors"
            >
              Play again
            </button>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Suggested actions + input */}
      {!isTerminal && (
        <div className="relative z-10 border-t border-white/10 bg-[#0a0a0a]/90 backdrop-blur px-4 pt-3 pb-5">
          {save.suggestedActions.length > 0 && !loading && animatingId === null && (
            <div className="flex flex-wrap gap-2 mb-3 story-fade-up">
              {save.suggestedActions.map((a, i) => (
                <button
                  key={`${a}-${i}`}
                  onClick={() => handleSend(a)}
                  className="text-xs px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-200/90 hover:text-white rounded-full border border-red-500/20 transition-colors"
                >
                  {a}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-end">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
              placeholder="What do you do?"
              disabled={loading}
              className="flex-1 px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500/50 focus:bg-white/[0.08] transition-colors"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="p-3.5 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-2xl transition-all"
              aria-label="Send action"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
