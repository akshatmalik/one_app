'use client';

import { useState } from 'react';
import { Game } from '../lib/types';
import { generateLibraryRoast, generateGamingHoroscope, generateTonightsForecast } from '../lib/idea-ai';
import { NarrationPanel } from './NarrationPanel';
import { Flame, Sparkles, Moon, Loader2 } from 'lucide-react';

interface AICompanionPanelProps {
  games: Game[];
}

type Result = { text: string; ai: boolean } | null;

function AICard({
  title,
  icon,
  accent,
  loading,
  result,
  onGenerate,
}: {
  title: string;
  icon: React.ReactNode;
  accent: string;
  loading: boolean;
  result: Result;
  onGenerate: () => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className={`flex items-center gap-2 text-sm font-semibold ${accent}`}>
          {icon} {title}
        </div>
        <button
          onClick={onGenerate}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : null}
          {result ? 'Again' : 'Reveal'}
        </button>
      </div>
      {result ? (
        <p className="text-sm text-white/80">
          {result.text}
          {!result.ai && <span className="ml-1 text-[10px] text-white/30">(offline)</span>}
        </p>
      ) : (
        <p className="text-xs text-white/30">Tap reveal to generate.</p>
      )}
    </div>
  );
}

// NewIdeas100-June2026 — AI batch (#79, #80, #87).
export function AICompanionPanel({ games }: AICompanionPanelProps) {
  const [roast, setRoast] = useState<Result>(null);
  const [horoscope, setHoroscope] = useState<Result>(null);
  const [forecast, setForecast] = useState<Result>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<Result>, set: (r: Result) => void) => {
    setLoading(key);
    try {
      set(await fn());
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/40">
        <Sparkles size={14} /> AI Companion
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <AICard
          title="Roast My Library"
          icon={<Flame size={16} />}
          accent="text-orange-400"
          loading={loading === 'roast'}
          result={roast}
          onGenerate={() => run('roast', () => generateLibraryRoast(games), setRoast)}
        />
        <AICard
          title="Gaming Horoscope"
          icon={<Sparkles size={16} />}
          accent="text-purple-400"
          loading={loading === 'horoscope'}
          result={horoscope}
          onGenerate={() => run('horoscope', () => generateGamingHoroscope(games), setHoroscope)}
        />
        <AICard
          title="Tonight's Forecast"
          icon={<Moon size={16} />}
          accent="text-blue-400"
          loading={loading === 'forecast'}
          result={forecast}
          onGenerate={() => run('forecast', () => generateTonightsForecast(games), setForecast)}
        />
      </div>
      <NarrationPanel games={games} />
    </div>
  );
}
