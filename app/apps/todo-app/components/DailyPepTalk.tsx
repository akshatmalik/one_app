'use client';

import { Sparkles, RefreshCw } from 'lucide-react';
import { PepTalkResult } from '../lib/ai-service';

interface DailyPepTalkProps {
  talk: PepTalkResult | null;
  loading: boolean;
  onRegenerate: () => void;
}

export function DailyPepTalk({ talk, loading, onRegenerate }: DailyPepTalkProps) {
  if (!talk && !loading) return null;

  return (
    <div className="mb-4 relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/15 via-indigo-500/8 to-pink-500/12 px-4 py-3 shadow-sm shadow-purple-500/10">
      {/* subtle shimmer highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="flex items-center gap-3">
        <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-purple-400/30 to-pink-400/30 ring-1 ring-white/10 flex items-center justify-center">
          {loading ? (
            <Sparkles size={15} className="text-purple-200 animate-pulse" />
          ) : (
            <span className="text-xl leading-none" aria-hidden>{talk?.emoji || '✨'}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="space-y-1.5">
              <div className="h-3 bg-white/10 rounded animate-pulse" />
              <div className="h-3 bg-white/10 rounded animate-pulse w-3/5" />
            </div>
          ) : (
            <p className="text-sm text-white/90 leading-snug">
              {talk?.text}
            </p>
          )}
        </div>

        {!loading && (
          <button
            onClick={onRegenerate}
            className="shrink-0 p-1.5 text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors rounded-md"
            aria-label="Regenerate pep talk"
            title="New pep talk"
          >
            <RefreshCw size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
