'use client';

import { useState, useEffect, useRef } from 'react';
import { Game } from '../lib/types';
import { generateNarrationScript, NARRATION_PERSONAS, NarrationPersona } from '../lib/idea-ai';
import { Mic, Play, Pause, Square, Loader2 } from 'lucide-react';

interface NarrationPanelProps {
  games: Game[];
}

// NewIdeas100-June2026 — #91/#92 AI Narration (recap voice layer).
// AI scripts a recap in a host persona; the browser reads it aloud via the
// Web Speech API (no extra API cost). Gracefully no-ops if TTS is unavailable.
export function NarrationPanel({ games }: NarrationPanelProps) {
  const [persona, setPersona] = useState<NarrationPersona>('documentary');
  const [script, setScript] = useState<{ text: string; ai: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [ttsAvailable, setTtsAvailable] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setTtsAvailable(typeof window !== 'undefined' && 'speechSynthesis' in window);
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  // Re-generating for a new persona stops any current playback.
  const generate = async () => {
    stop();
    setLoading(true);
    try {
      const result = await generateNarrationScript(games, persona);
      setScript(result);
    } finally {
      setLoading(false);
    }
  };

  const speak = (text: string) => {
    if (!ttsAvailable) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    // Tune the voice a touch per persona for flavor.
    u.rate = persona === 'sportscaster' ? 1.15 : persona === 'noir' ? 0.9 : 1;
    u.pitch = persona === 'wholesome' ? 1.15 : persona === 'noir' ? 0.8 : 1;
    u.onend = () => { setSpeaking(false); setPaused(false); };
    u.onerror = () => { setSpeaking(false); setPaused(false); };
    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
    setSpeaking(true);
    setPaused(false);
  };

  const togglePlay = () => {
    if (!script) return;
    if (!speaking) {
      speak(script.text);
    } else if (paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    } else {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  };

  const stop = () => {
    if (ttsAvailable) window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
  };

  return (
    <div className="rounded-xl border border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-500/10 to-purple-500/10 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/80">
        <Mic size={16} className="text-fuchsia-400" /> Narrate My Year
        <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-normal text-white/50">AI voiceover</span>
      </div>

      {/* Persona picker */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        {NARRATION_PERSONAS.map((p) => (
          <button
            key={p.id}
            onClick={() => { setPersona(p.id); setScript(null); stop(); }}
            className={`rounded-lg border px-2.5 py-2 text-left transition-all ${
              persona === p.id
                ? 'border-fuchsia-400/50 bg-fuchsia-500/15'
                : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
            }`}
          >
            <div className="text-xs font-medium text-white">{p.emoji} {p.label}</div>
            <div className="text-[10px] text-white/40">{p.desc}</div>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 disabled:opacity-50"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : null}
          {script ? 'Re-script' : 'Generate'}
        </button>
        {script && ttsAvailable && (
          <>
            <button
              onClick={togglePlay}
              className="flex items-center gap-1.5 rounded-lg bg-fuchsia-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-fuchsia-500"
            >
              {speaking && !paused ? <Pause size={13} /> : <Play size={13} />}
              {speaking && !paused ? 'Pause' : paused ? 'Resume' : 'Play'}
            </button>
            {speaking && (
              <button onClick={stop} className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/20">
                <Square size={12} /> Stop
              </button>
            )}
          </>
        )}
      </div>

      {script && (
        <p className="mt-3 text-sm italic text-white/75">
          “{script.text}”
          {!script.ai && <span className="ml-1 not-italic text-[10px] text-white/30">(offline script)</span>}
        </p>
      )}
      {script && !ttsAvailable && (
        <p className="mt-2 text-[11px] text-white/40">Your browser can’t read this aloud, but you can read the script above.</p>
      )}
    </div>
  );
}
