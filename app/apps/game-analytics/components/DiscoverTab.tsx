'use client';

import { useState, useCallback } from 'react';
import {
  Sparkles, RefreshCw, Loader2, Bookmark, Eye, EyeOff, Undo2, Trash2,
  AlertTriangle, X, ChevronDown, ChevronUp, Clock, Rocket, Compass, Calendar,
} from 'lucide-react';
import { Game, GameRecommendation, RecommendationCategory } from '../lib/types';
import { useRecommendations } from '../hooks/useRecommendations';
import { TasteProfilePanel } from './TasteProfilePanel';
import { RecommendationCard } from './RecommendationCard';
import { AskAboutGame } from './AskAboutGame';
import clsx from 'clsx';

type DiscoverSection = 'coming-soon' | 'for-you' | 'interested';

const CATEGORY_SECTION_TITLES: Record<RecommendationCategory, string> = {
  'because-you-loved': 'Because You Loved',
  'hidden-gem': 'Hidden Gems You Missed',
  'popular-in-genre': 'Popular in Your Genres',
  'try-something-different': 'Try Something Different',
  'general': 'Recommended For You',
};

const CATEGORY_ORDER: RecommendationCategory[] = [
  'because-you-loved',
  'hidden-gem',
  'popular-in-genre',
  'try-something-different',
  'general',
];

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
    watching,
    loading,
    generating,
    generatingUpcoming,
    analyzing,
    error,
    tasteProfile,
    autoProfile,
    profileOverrides,
    updateProfileOverrides,
    resetProfileOverrides,
    generate,
    generateUpcoming,
    analyzeGame,
    markInterested,
    markWatching,
    markDismissed,
    markWishlisted,
    markPlayed,
    undoDismiss,
    deleteRecommendation,
    upcomingSuggested,
    upcomingThisMonth,
    upcomingNextFewMonths,
    upcomingLater,
    categorizedSuggested,
  } = useRecommendations(userId, games);

  const [userPrompt, setUserPrompt] = useState('');
  const [showDismissed, setShowDismissed] = useState(false);
  const [section, setSection] = useState<DiscoverSection>('for-you');
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

  const handleGenerateUpcoming = useCallback(() => {
    generateUpcoming();
  }, [generateUpcoming]);

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

  const totalInterested = interested.length + watching.length;

  // Render an upcoming games time section
  const renderUpcomingSection = (
    title: string,
    icon: React.ReactNode,
    recs: GameRecommendation[]
  ) => {
    if (recs.length === 0) return null;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-xs font-medium text-white/50">{title}</h3>
          <span className="text-[10px] text-white/20">{recs.length}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {recs.sort((a, b) => (b.hypeScore || 5) - (a.hypeScore || 5)).map(rec => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              variant="upcoming"
              onInterested={() => markInterested(rec.id)}
              onWatch={() => markWatching(rec.id)}
              onWishlist={() => handleAddToLibraryAsWishlist(rec.id, rec.gameName, rec.genre, rec.platform)}
              onPlayed={() => markPlayed(rec.id)}
              onDismiss={() => markDismissed(rec.id)}
              onAddToLibrary={(data) => handleAddToLibraryAsPlayed(rec.id, data)}
            />
          ))}
        </div>
      </div>
    );
  };

  // Render a categorized "For You" section
  const renderCategorySection = (category: RecommendationCategory, recs: GameRecommendation[]) => {
    if (!recs || recs.length === 0) return null;

    let title = CATEGORY_SECTION_TITLES[category];
    // For "because-you-loved", show the specific game name if available
    if (category === 'because-you-loved' && recs[0]?.categoryContext) {
      title = `Because You Loved ${recs[0].categoryContext}`;
    }

    return (
      <div key={category} className="space-y-3">
        <h3 className="text-xs font-medium text-white/50">{title}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {recs.map(rec => (
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
      </div>
    );
  };

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

      {/* Sub-tab navigation */}
      <div className="flex items-center gap-1 bg-white/[0.02] rounded-lg p-1">
        <button
          onClick={() => setSection('coming-soon')}
          className={clsx(
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all',
            section === 'coming-soon'
              ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
              : 'text-white/40 hover:text-white/60'
          )}
        >
          <Rocket size={12} />
          Coming Soon
          {upcomingSuggested.length > 0 && (
            <span className="text-[10px] opacity-60">({upcomingSuggested.length})</span>
          )}
        </button>
        <button
          onClick={() => setSection('for-you')}
          className={clsx(
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all',
            section === 'for-you'
              ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
              : 'text-white/40 hover:text-white/60'
          )}
        >
          <Sparkles size={12} />
          For You
          {suggested.length > 0 && (
            <span className="text-[10px] opacity-60">({suggested.length})</span>
          )}
        </button>
        <button
          onClick={() => setSection('interested')}
          className={clsx(
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all',
            section === 'interested'
              ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
              : 'text-white/40 hover:text-white/60'
          )}
        >
          <Bookmark size={12} />
          Saved
          {totalInterested > 0 && (
            <span className="text-[10px] opacity-60">({totalInterested})</span>
          )}
        </button>
      </div>

      {/* ── Coming Soon Tab ─────────────────────────────────── */}
      {section === 'coming-soon' && (
        <div className="space-y-6">
          {/* Generate upcoming button */}
          <button
            onClick={handleGenerateUpcoming}
            disabled={generatingUpcoming || games.length === 0}
            className={clsx(
              'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all',
              generatingUpcoming || games.length === 0
                ? 'bg-white/5 text-white/20 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/10 hover:border-cyan-500/20'
            )}
          >
            {generatingUpcoming ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Scanning upcoming releases...
              </>
            ) : (
              <>
                <Rocket size={14} />
                {upcomingSuggested.length > 0 ? 'Refresh Upcoming Games' : 'Find Upcoming Games'}
              </>
            )}
          </button>

          {/* Upcoming game sections by time window */}
          {upcomingSuggested.length > 0 ? (
            <>
              {renderUpcomingSection(
                'This Month',
                <Calendar size={12} className="text-cyan-400" />,
                upcomingThisMonth
              )}
              {renderUpcomingSection(
                'Next Few Months',
                <Clock size={12} className="text-blue-400" />,
                upcomingNextFewMonths
              )}
              {renderUpcomingSection(
                'Later This Year',
                <Compass size={12} className="text-purple-400" />,
                upcomingLater
              )}
            </>
          ) : !generatingUpcoming && games.length > 0 ? (
            <div className="text-center py-12">
              <Rocket size={32} className="mx-auto mb-3 text-white/10" />
              <p className="text-white/30 text-sm">No upcoming games found yet</p>
              <p className="text-white/20 text-xs mt-1">
                Hit the button above to discover upcoming releases matching your taste
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* ── For You Tab ─────────────────────────────────── */}
      {section === 'for-you' && (
        <div className="space-y-6">
          {/* Generate button */}
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
                {suggested.length > 0 ? 'Get More Recommendations' : 'Generate Recommendations'}
              </>
            )}
          </button>

          {games.length === 0 && (
            <p className="text-center text-xs text-white/25 -mt-2">
              Add some games to your library first so we can learn your taste
            </p>
          )}

          {/* Categorized sections */}
          {Object.keys(categorizedSuggested).length > 0 ? (
            CATEGORY_ORDER.map(cat =>
              categorizedSuggested[cat]
                ? renderCategorySection(cat, categorizedSuggested[cat])
                : null
            )
          ) : suggested.length > 0 ? (
            // Fallback: uncategorized grid
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
          ) : !generating && games.length > 0 ? (
            <div className="text-center py-12">
              <Sparkles size={32} className="mx-auto mb-3 text-white/10" />
              <p className="text-white/30 text-sm">No recommendations yet</p>
              <p className="text-white/20 text-xs mt-1">Hit the button above to get personalized game suggestions</p>
            </div>
          ) : null}
        </div>
      )}

      {/* ── Interested / Saved Tab ─────────────────────────── */}
      {section === 'interested' && (
        <div className="space-y-6">
          {/* Watching section (upcoming games being tracked) */}
          {watching.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Eye size={12} className="text-cyan-400" />
                <h3 className="text-xs font-medium text-white/50">Watching Releases</h3>
                <span className="text-[10px] text-white/20">{watching.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {watching.map(rec => (
                  <div key={rec.id} className="bg-white/[0.03] border border-cyan-500/10 rounded-xl overflow-hidden">
                    {/* Thumbnail */}
                    <div className="relative h-28 bg-gradient-to-br from-cyan-900/30 to-blue-900/30">
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
                          {rec.releaseDate && <span>{rec.releaseDate}</span>}
                          {rec.genre && <><span className="text-white/20">·</span><span>{rec.genre}</span></>}
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
            </div>
          )}

          {/* Interested section (released games saved) */}
          {interested.length > 0 && (
            <div className="space-y-3">
              {watching.length > 0 && (
                <div className="flex items-center gap-2">
                  <Bookmark size={12} className="text-blue-400" />
                  <h3 className="text-xs font-medium text-white/50">Interested</h3>
                  <span className="text-[10px] text-white/20">{interested.length}</span>
                </div>
              )}
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
            </div>
          )}

          {/* Empty state */}
          {totalInterested === 0 && (
            <div className="text-center py-12">
              <Bookmark size={32} className="mx-auto mb-3 text-white/10" />
              <p className="text-white/30 text-sm">No saved recommendations yet</p>
              <p className="text-white/20 text-xs mt-1">
                Mark games as &quot;Interested&quot; or &quot;Watch&quot; to save them here
              </p>
            </div>
          )}
        </div>
      )}

      {/* Dismissed section (always visible at bottom, any tab) */}
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
