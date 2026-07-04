'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  Heart,
  Loader2,
  Package,
  RotateCcw,
  Send,
  Skull,
  Users,
} from 'lucide-react';
import clsx from 'clsx';
import { useStoryGame } from '../hooks/useStoryGame';

export function StoryGame() {
  const {
    arc,
    save,
    hydrated,
    loading,
    error,
    currentBeat,
    startNewGame,
    sendAction,
    retry,
    restartFromCheckpoint,
    abandonGame,
  } = useStoryGame();

  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [save?.transcript.length, loading, error]);

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

  // ── Start screen ─────────────────────────────────────────────────
  if (!save) {
    return (
      <div className="h-dvh bg-[#0a0a0a] flex flex-col">
        <div className="px-4 py-3">
          <Link href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors">
            <ArrowLeft size={16} /> Hub
          </Link>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-red-900/40 to-amber-900/20 border border-red-500/20 mb-6">
            <Skull size={40} className="text-red-400" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">{arc.title}</h1>
          <p className="text-red-400/90 font-medium mb-6">{arc.tagline}</p>
          <p className="text-white/60 text-sm leading-relaxed max-w-md mb-10">{arc.premise}</p>
          <button
            onClick={startNewGame}
            disabled={loading}
            className="px-8 py-4 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 disabled:opacity-50 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-red-900/30 flex items-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? 'The city wakes...' : 'Begin'}
          </button>
          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
          <p className="text-white/25 text-xs mt-8 max-w-sm">
            Type anything — the story reacts to what you say. Choices cost time, noise draws the dead, and death sends you back to the start of the scene.
          </p>
        </div>
      </div>
    );
  }

  const { state } = save;
  const healthColor = state.health > 60 ? 'bg-emerald-500' : state.health > 30 ? 'bg-amber-500' : 'bg-red-500';
  const isTerminal = save.status !== 'playing';

  return (
    <div className="h-dvh bg-[#0a0a0a] flex flex-col">
      {/* Header + HUD */}
      <div className="border-b border-white/10 bg-gradient-to-r from-red-950/40 to-[#0a0a0a]">
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
          <button
            onClick={() => { if (confirm('Abandon this story and start over?')) abandonGame(); }}
            className="text-xs text-white/30 hover:text-white/60 transition-colors px-2 py-1"
          >
            New story
          </button>
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
            {state.hoursLeft}h left
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
            {state.companions.map(c => (
              <span key={c} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20">
                <Users size={10} /> {c}
              </span>
            ))}
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
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {save.transcript.map(e => {
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
              <div key={e.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2.5 bg-gradient-to-r from-red-800 to-red-700 text-white text-sm">
                  {e.text}
                </div>
              </div>
            );
          }
          return (
            <div key={e.id} className="flex justify-start">
              <div className="max-w-[92%] rounded-2xl rounded-bl-sm px-4 py-3 bg-white/[0.06] border border-white/5 text-white/90 text-sm leading-relaxed whitespace-pre-wrap">
                {e.text}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 bg-white/[0.06] border border-white/5 flex items-center gap-2">
              <Loader2 size={14} className="text-red-400 animate-spin" />
              <span className="text-xs text-white/50">The world responds...</span>
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
          <div className="rounded-2xl border border-red-500/30 bg-gradient-to-b from-red-950/60 to-[#140505] p-6 text-center">
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
                onClick={abandonGame}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white/70 font-medium rounded-xl transition-colors"
              >
                Start over
              </button>
            </div>
            {save.deathCount > 0 && (
              <p className="text-white/25 text-xs mt-4">Deaths this run: {save.deathCount + 1}</p>
            )}
          </div>
        )}

        {/* Ending screen */}
        {save.status === 'ended' && (
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-950/40 to-[#0f0a02] p-6 text-center">
            <p className="text-[10px] uppercase tracking-[0.25em] text-amber-400/80 font-semibold mb-2">The End</p>
            <h2 className="text-2xl font-bold text-amber-300 mb-4">{arc.title}</h2>
            <div className="text-white/50 text-xs space-y-1 mb-6">
              <p>Survived with {state.health} health · {state.hoursLeft}h to spare</p>
              <p>{state.companions.length > 0 ? `Made it with: ${state.companions.join(', ')}` : 'Made it alone'}</p>
              {save.deathCount > 0 && <p>Deaths along the way: {save.deathCount}</p>}
            </div>
            <button
              onClick={abandonGame}
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
        <div className="border-t border-white/10 bg-[#0a0a0a] px-4 pt-3 pb-5">
          {save.suggestedActions.length > 0 && !loading && (
            <div className="flex flex-wrap gap-2 mb-3">
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
