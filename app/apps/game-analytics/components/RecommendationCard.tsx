'use client';

import { useState } from 'react';
import { Bookmark, Heart, Check, X, Star, ChevronDown, ChevronUp, Calendar, DollarSign } from 'lucide-react';
import { GameRecommendation } from '../lib/types';
import clsx from 'clsx';

interface RecommendationCardProps {
  recommendation: GameRecommendation;
  onInterested: () => void;
  onWishlist: () => void;
  onPlayed: () => void;
  onDismiss: () => void;
  onAddToLibrary: (data: { name: string; rating: number; hours?: number; price?: number; datePurchased?: string; genre?: string; platform?: string }) => void;
}

export function RecommendationCard({
  recommendation,
  onInterested,
  onWishlist,
  onPlayed,
  onDismiss,
  onAddToLibrary,
}: RecommendationCardProps) {
  const [showPlayedForm, setShowPlayedForm] = useState(false);
  const [rating, setRating] = useState(7);
  const [hours, setHours] = useState('');
  const [price, setPrice] = useState('');
  const [datePurchased, setDatePurchased] = useState('');

  const handleSubmitPlayed = () => {
    onAddToLibrary({
      name: recommendation.gameName,
      rating,
      hours: hours ? parseFloat(hours) : undefined,
      price: price ? parseFloat(price) : undefined,
      datePurchased: datePurchased || undefined,
      genre: recommendation.genre,
      platform: recommendation.platform,
    });
    onPlayed();
    setShowPlayedForm(false);
  };

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all">
      {/* Thumbnail */}
      <div className="relative h-32 sm:h-40 bg-gradient-to-br from-purple-900/30 to-blue-900/30">
        {recommendation.thumbnail ? (
          <img
            src={recommendation.thumbnail}
            alt={recommendation.gameName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl opacity-20">🎮</span>
          </div>
        )}
        {/* Gradient overlay for text */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        {/* Game name on image */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-white font-semibold text-sm leading-tight">{recommendation.gameName}</h3>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-white/50">
            {recommendation.genre && <span>{recommendation.genre}</span>}
            {recommendation.platform && (
              <>
                <span className="text-white/20">·</span>
                <span>{recommendation.platform}</span>
              </>
            )}
            {recommendation.releaseDate && (
              <>
                <span className="text-white/20">·</span>
                <span>{recommendation.releaseDate.slice(0, 4)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-3">
        {/* Metacritic + RAWG rating */}
        {(recommendation.metacritic || recommendation.rawgRating) && (
          <div className="flex items-center gap-3 text-xs">
            {recommendation.metacritic && (
              <span className={clsx(
                'px-1.5 py-0.5 rounded font-medium',
                recommendation.metacritic >= 75 ? 'bg-emerald-500/15 text-emerald-400' :
                recommendation.metacritic >= 50 ? 'bg-yellow-500/15 text-yellow-400' :
                'bg-red-500/15 text-red-400'
              )}>
                MC {recommendation.metacritic}
              </span>
            )}
            {recommendation.rawgRating && (
              <span className="flex items-center gap-0.5 text-white/40">
                <Star size={10} className="text-yellow-500" />
                {recommendation.rawgRating.toFixed(1)}/5
              </span>
            )}
          </div>
        )}

        {/* AI Reason — "Why you'd love this" */}
        <p className="text-xs text-white/50 italic leading-relaxed">
          &ldquo;{recommendation.aiReason}&rdquo;
        </p>

        {/* Already Played Form */}
        {showPlayedForm ? (
          <div className="space-y-2.5 bg-white/[0.03] rounded-lg p-3 border border-white/5">
            <div className="text-xs text-white/50 font-medium">Already played this?</div>

            {/* Rating */}
            <div>
              <div className="text-[10px] text-white/30 mb-1">Your Rating</div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 10 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setRating(i + 1)}
                    className={clsx(
                      'w-6 h-6 rounded text-xs font-medium transition-all',
                      i + 1 <= rating
                        ? 'bg-purple-500/30 text-purple-300 border border-purple-500/30'
                        : 'bg-white/5 text-white/20 border border-white/5 hover:bg-white/10'
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Hours + Price row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] text-white/30 mb-1">Hours Played (optional)</div>
                <input
                  type="number"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="~25"
                  className="w-full px-2 py-1.5 rounded-md bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/20 outline-none focus:border-purple-500/50"
                />
              </div>
              <div>
                <div className="text-[10px] text-white/30 mb-1">Price Paid (optional)</div>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="$39.99"
                  className="w-full px-2 py-1.5 rounded-md bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/20 outline-none focus:border-purple-500/50"
                />
              </div>
            </div>

            {/* Date purchased */}
            <div>
              <div className="text-[10px] text-white/30 mb-1">When Bought (optional)</div>
              <input
                type="date"
                value={datePurchased}
                onChange={(e) => setDatePurchased(e.target.value)}
                className="w-full px-2 py-1.5 rounded-md bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-purple-500/50 [color-scheme:dark]"
              />
            </div>

            {/* Submit / Cancel */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSubmitPlayed}
                className="flex-1 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-medium hover:bg-purple-500/30 transition-colors"
              >
                Add to Library
              </button>
              <button
                onClick={() => setShowPlayedForm(false)}
                className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs hover:text-white/60 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Action Buttons */
          <div className="flex items-center gap-1.5">
            <button
              onClick={onInterested}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-blue-500/10 text-blue-400/70 text-xs font-medium hover:bg-blue-500/20 transition-colors"
              title="Interested — save for later"
            >
              <Bookmark size={12} />
              Interested
            </button>
            <button
              onClick={onWishlist}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-purple-500/10 text-purple-400/70 text-xs font-medium hover:bg-purple-500/20 transition-colors"
              title="Add to Wishlist in your library"
            >
              <Heart size={12} />
              Wishlist
            </button>
            <button
              onClick={() => setShowPlayedForm(true)}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-emerald-500/10 text-emerald-400/70 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
              title="Already played — add to library with rating"
            >
              <Check size={12} />
              Played
            </button>
            <button
              onClick={onDismiss}
              className="py-2 px-2.5 rounded-lg bg-white/5 text-white/25 text-xs hover:bg-red-500/10 hover:text-red-400/70 transition-colors"
              title="Not for me"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
