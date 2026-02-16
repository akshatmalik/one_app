'use client';

import { useState } from 'react';
import { Search, ThumbsUp, ThumbsDown, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { GameAnalysis } from '../lib/ai-recommendation-service';
import clsx from 'clsx';

interface AskAboutGameProps {
  onAnalyze: (gameName: string) => Promise<GameAnalysis>;
  analyzing: boolean;
}

export function AskAboutGame({ onAnalyze, analyzing }: AskAboutGameProps) {
  const [gameName, setGameName] = useState('');
  const [result, setResult] = useState<GameAnalysis | null>(null);
  const [askedGame, setAskedGame] = useState('');

  const handleAsk = async () => {
    if (!gameName.trim() || analyzing) return;
    setAskedGame(gameName.trim());
    setResult(null);
    const analysis = await onAnalyze(gameName.trim());
    setResult(analysis);
  };

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-purple-400" />
        <span className="text-sm font-medium text-white/70">Would I like this game?</span>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={gameName}
          onChange={(e) => setGameName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAsk(); }}
          placeholder="Type a game name... e.g., Hades, Baldur's Gate 3"
          className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/25 outline-none focus:border-purple-500/50"
        />
        <button
          onClick={handleAsk}
          disabled={!gameName.trim() || analyzing}
          className={clsx(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            gameName.trim() && !analyzing
              ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
              : 'bg-white/5 text-white/20 cursor-not-allowed'
          )}
        >
          {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
        </button>
      </div>

      {/* Analyzing state */}
      {analyzing && (
        <div className="flex items-center gap-2 text-xs text-white/30">
          <Loader2 size={12} className="animate-spin" />
          Analyzing {askedGame} against your library...
        </div>
      )}

      {/* Result */}
      {result && !analyzing && (
        <div className={clsx(
          'rounded-lg border p-4 space-y-3',
          result.wouldLike
            ? 'bg-emerald-500/5 border-emerald-500/15'
            : 'bg-orange-500/5 border-orange-500/15'
        )}>
          {/* Verdict header */}
          <div className="flex items-center gap-2">
            {result.wouldLike ? (
              <ThumbsUp size={16} className="text-emerald-400" />
            ) : (
              <ThumbsDown size={16} className="text-orange-400" />
            )}
            <span className={clsx(
              'text-sm font-semibold',
              result.wouldLike ? 'text-emerald-400' : 'text-orange-400'
            )}>
              {result.wouldLike ? "You'd probably like this!" : "Might not be for you"}
            </span>
            <span className="ml-auto text-xs text-white/30">
              Confidence: {result.confidence}/10
            </span>
          </div>

          {/* Confidence bar */}
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all',
                result.wouldLike ? 'bg-emerald-500/50' : 'bg-orange-500/50'
              )}
              style={{ width: `${result.confidence * 10}%` }}
            />
          </div>

          {/* Reason */}
          <p className="text-xs text-white/60 leading-relaxed">
            {result.reason}
          </p>

          {/* Concerns */}
          {result.concerns && (
            <div className="flex items-start gap-1.5 text-xs text-orange-400/60">
              <AlertTriangle size={10} className="mt-0.5 shrink-0" />
              <span>{result.concerns}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
