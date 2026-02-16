'use client';

import { useState, useCallback } from 'react';
import { Sparkles, RefreshCw, Loader2, Bookmark, Eye, EyeOff, Undo2, Trash2, AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Game } from '../lib/types';
import { useRecommendations } from '../hooks/useRecommendations';
import { TasteProfilePanel } from './TasteProfilePanel';
import { RecommendationCard } from './RecommendationCard';
import { AskAboutGame } from './AskAboutGame';
import clsx from 'clsx';

interface DiscoverTabProps {
  games: Game[];
  userId: string | null;
  onAddGame: (data: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Game>;
}

export function DiscoverTab({ games, userId, onAddGame }: DiscoverTabProps) {
  const {
    suggested,
    interested,
    dismissed,
    loading,
    generating,
    analyzing,
    error,
    tasteProfile,
    autoProfile,
    profileOverrides,
    updateProfileOverrides,
    resetProfileOverrides,
    generate,
    analyzeGame,
    markInterested,
    markDismissed,
    markWishlisted,
    markPlayed,
    undoDismiss,
    deleteRecommendation,
  } = useRecommendations(userId, games);

  const [userPrompt, setUserPrompt] = useState('');
  const [showDismissed, setShowDismissed] = useState(false);
  const [section, setSection] = useState<'recommendations' | 'interested'>('recommendations');
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [errorExpanded, setErrorExpanded] = useState(false);

  // Reset error dismissed state when a new error comes in
  const [lastError, setLastError] = useState<Error | null>(null);
  if (error && error !== lastError) {
    setLastError(error);
    setErrorDismissed(false);
    setErrorExpanded(false);
  }

  const handleGenerate = useCallback(() => {
    generate(userPrompt || undefined);
  }, [generate, userPrompt]);

  const handleAddToLibraryAsWishlist = useCallback(async (recId: string, name: string, genre?: string, platform?: string) => {
    try {
      await onAddGame({
        name,
        price: 0,
        hours: 0,
        rating: 0,
        status: 'Wishlist',
        genre: genre || undefined,
        platform: platform || undefined,
      } as Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>);
      markWishlisted(recId);
    } catch (e) {
      console.error('Failed to add wishlist game:', e);
    }
  }, [onAddGame, markWishlisted]);

  const handleAddToLibraryAsPlayed = useCallback(async (
    recId: string,
    data: { name: string; rating: number; hours?: number; price?: number; datePurchased?: string; genre?: string; platform?: string }
  ) => {
    try {
      await onAddGame({
        name: data.name,
        price: data.price || 0,
        hours: data.hours || 0,
        rating: data.rating,
        status: 'Completed',
        genre: data.genre || undefined,
        platform: data.platform || undefined,
        datePurchased: data.datePurchased || undefined,
      } as Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>);
      markPlayed(recId);
    } catch (e) {
      console.error('Failed to add played game:', e);
    }
  }, [onAddGame, markPlayed]);

  const hasNoRecommendations = suggested.length === 0 && interested.length === 0 && !generating;

  return (
    <div className="space-y-5">
      {/* Error Banner */}
      {error && !errorDismissed && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
              <div className="text-xs text-red-300/80">
                Something went wrong. Tap &quot;Details&quot; to see the full error.
              </div>
            </div>
            <button
              onClick={() => setErrorDismissed(true)}
              className="text-red-400/50 hover:text-red-400 shrink-0"
            >
              <X size={14} />
            </button>
          </div>
          <button
            onClick={() => setErrorExpanded(!errorExpanded)}
            className="flex items-center gap-1 text-[10px] text-red-400/50 hover:text-red-400/80 transition-colors"
          >
            {errorExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            {errorExpanded ? 'Hide' : 'Details'}
          </button>
          {errorExpanded && (
            <pre className="text-[10px] text-red-300/60 bg-black/20 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          )}
        </div>
      )}

      {/* Ask About a Game */}
      <AskAboutGame onAnalyze={analyzeGame} analyzing={analyzing} />

      {/* Taste Profile Panel (collapsible) */}
      <TasteProfilePanel
        profile={tasteProfile}
        autoProfile={autoProfile}
        overrides={profileOverrides}
        onUpdateOverrides={updateProfileOverrides}
        onReset={resetProfileOverrides}
        userPrompt={userPrompt}
        onUserPromptChange={setUserPrompt}
      />

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={generating || games.length === 0}
        className={clsx(
          'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all',
          generating || games.length === 0
            ? 'bg-white/5 text-white/20 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-300 hover:from-purple-500/30 hover:to-blue-500/30 border border-purple-500/10 hover:border-purple-500/20'
        )}
      >
        {generating ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Finding games you&apos;d love...
          </>
        ) : (
          <>
            <Sparkles size={14} />
            {suggested.length > 0 || interested.length > 0 ? 'Get More Recommendations' : 'Generate Recommendations'}
          </>
        )}
      </button>

      {games.length === 0 && (
        <p className="text-center text-xs text-white/25 -mt-2">
          Add some games to your library first so we can learn your taste
        </p>
      )}

      {/* Section toggle */}
      {(suggested.length > 0 || interested.length > 0) && (
        <div className="flex items-center gap-1 bg-white/[0.02] rounded-lg p-1">
          <button
            onClick={() => setSection('recommendations')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all',
              section === 'recommendations'
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/60'
            )}
          >
            <Sparkles size={12} />
            Suggestions{suggested.length > 0 && ` (${suggested.length})`}
          </button>
          <button
            onClick={() => setSection('interested')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all',
              section === 'interested'
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/60'
            )}
          >
            <Bookmark size={12} />
            Watching{interested.length > 0 && ` (${interested.length})`}
          </button>
        </div>
      )}

      {/* Suggestions Grid */}
      {section === 'recommendations' && suggested.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {suggested.map(rec => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onInterested={() => markInterested(rec.id)}
              onWishlist={() => handleAddToLibraryAsWishlist(rec.id, rec.gameName, rec.genre, rec.platform)}
              onPlayed={() => markPlayed(rec.id)}
              onDismiss={() => markDismissed(rec.id)}
              onAddToLibrary={(data) => handleAddToLibraryAsPlayed(rec.id, data)}
            />
          ))}
        </div>
      )}

      {/* Interested / Watching List */}
      {section === 'interested' && (
        <div>
          {interested.length === 0 ? (
            <div className="text-center py-12">
              <Bookmark size={32} className="mx-auto mb-3 text-white/10" />
              <p className="text-white/30 text-sm">No saved recommendations yet</p>
              <p className="text-white/20 text-xs mt-1">Mark games as &quot;Interested&quot; to save them here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {interested.map(rec => (
                <div key={rec.id} className="bg-white/[0.03] border border-blue-500/10 rounded-xl overflow-hidden">
                  {/* Thumbnail */}
                  <div className="relative h-28 bg-gradient-to-br from-blue-900/30 to-purple-900/30">
                    {rec.thumbnail ? (
                      <img src={rec.thumbnail} alt={rec.gameName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-3xl opacity-20">🎮</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="text-white font-semibold text-sm">{rec.gameName}</h3>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-white/50">
                        {rec.genre && <span>{rec.genre}</span>}
                        {rec.platform && <><span className="text-white/20">·</span><span>{rec.platform}</span></>}
                      </div>
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="text-xs text-white/40 italic">&ldquo;{rec.aiReason}&rdquo;</p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAddToLibraryAsWishlist(rec.id, rec.gameName, rec.genre, rec.platform)}
                        className="flex-1 py-1.5 rounded-lg bg-purple-500/10 text-purple-400/70 text-xs font-medium hover:bg-purple-500/20 transition-colors"
                      >
                        Add to Wishlist
                      </button>
                      <button
                        onClick={() => markDismissed(rec.id)}
                        className="py-1.5 px-2.5 rounded-lg bg-white/5 text-white/25 text-xs hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {section === 'recommendations' && suggested.length === 0 && !generating && games.length > 0 && (
        <div className="text-center py-12">
          <Sparkles size={32} className="mx-auto mb-3 text-white/10" />
          <p className="text-white/30 text-sm">No recommendations yet</p>
          <p className="text-white/20 text-xs mt-1">Hit the button above to get personalized game suggestions</p>
        </div>
      )}

      {/* Dismissed section */}
      {dismissed.length > 0 && (
        <div>
          <button
            onClick={() => setShowDismissed(!showDismissed)}
            className="flex items-center gap-1.5 text-xs text-white/20 hover:text-white/40 transition-colors"
          >
            {showDismissed ? <EyeOff size={10} /> : <Eye size={10} />}
            {showDismissed ? 'Hide' : 'Show'} dismissed ({dismissed.length})
          </button>
          {showDismissed && (
            <div className="mt-2 space-y-1.5">
              {dismissed.map(rec => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between px-3 py-2 bg-white/[0.02] rounded-lg"
                >
                  <span className="text-xs text-white/25 line-through">{rec.gameName}</span>
                  <button
                    onClick={() => undoDismiss(rec.id)}
                    className="flex items-center gap-1 text-[10px] text-white/20 hover:text-white/50 transition-colors"
                  >
                    <Undo2 size={10} /> Undo
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
