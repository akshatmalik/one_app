'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Settings, X, Plus, RotateCcw } from 'lucide-react';
import { TasteProfile } from '../lib/types';
import clsx from 'clsx';

interface TasteProfilePanelProps {
  profile: TasteProfile;
  autoProfile: TasteProfile;
  overrides: Partial<TasteProfile>;
  onUpdateOverrides: (overrides: Partial<TasteProfile>) => void;
  onReset: () => void;
  userPrompt: string;
  onUserPromptChange: (prompt: string) => void;
}

export function TasteProfilePanel({
  profile,
  autoProfile,
  overrides,
  onUpdateOverrides,
  onReset,
  userPrompt,
  onUserPromptChange,
}: TasteProfilePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [addingGenre, setAddingGenre] = useState(false);
  const [newGenre, setNewGenre] = useState('');

  const hasOverrides = Object.keys(overrides).length > 0;

  const removeGenre = (genre: string) => {
    const updated = profile.topGenres.filter(g => g !== genre);
    onUpdateOverrides({ ...overrides, topGenres: updated });
  };

  const addGenre = () => {
    if (!newGenre.trim()) return;
    const updated = [...profile.topGenres, newGenre.trim()];
    onUpdateOverrides({ ...overrides, topGenres: updated });
    setNewGenre('');
    setAddingGenre(false);
  };

  const removeAvoidGenre = (genre: string) => {
    const updated = profile.avoidGenres.filter(g => g !== genre);
    onUpdateOverrides({ ...overrides, avoidGenres: updated });
  };

  const removePlatform = (platform: string) => {
    const updated = profile.platforms.filter(p => p !== platform);
    onUpdateOverrides({ ...overrides, platforms: updated });
  };

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings size={14} className="text-white/40" />
          <span className="text-sm font-medium text-white/70">Your Taste Profile</span>
          {hasOverrides && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">Edited</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/30">
            {profile.topGenres.slice(0, 3).join(', ')}
          </span>
          {isOpen ? <ChevronUp size={14} className="text-white/40" /> : <ChevronDown size={14} className="text-white/40" />}
        </div>
      </button>

      {/* Expandable content */}
      {isOpen && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/5">
          {/* Top Genres */}
          <div className="pt-3">
            <div className="text-xs text-white/40 mb-2">Top Genres (by enjoyment × time)</div>
            <div className="flex flex-wrap gap-1.5">
              {profile.topGenres.map(genre => (
                <span
                  key={genre}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/15 text-purple-300 text-xs"
                >
                  {genre}
                  <button onClick={() => removeGenre(genre)} className="hover:text-red-400 transition-colors">
                    <X size={10} />
                  </button>
                </span>
              ))}
              {addingGenre ? (
                <span className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    value={newGenre}
                    onChange={(e) => setNewGenre(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addGenre(); if (e.key === 'Escape') setAddingGenre(false); }}
                    placeholder="Genre name"
                    className="w-24 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/30 outline-none focus:border-purple-500/50"
                    autoFocus
                  />
                  <button onClick={addGenre} className="text-purple-400 hover:text-purple-300 text-xs">Add</button>
                </span>
              ) : (
                <button
                  onClick={() => setAddingGenre(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 text-white/40 text-xs hover:text-white/60 hover:bg-white/10 transition-colors"
                >
                  <Plus size={10} /> Add
                </button>
              )}
            </div>
          </div>

          {/* Avoid Genres */}
          {profile.avoidGenres.length > 0 && (
            <div>
              <div className="text-xs text-white/40 mb-2">Tend to Avoid</div>
              <div className="flex flex-wrap gap-1.5">
                {profile.avoidGenres.map(genre => (
                  <span
                    key={genre}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/10 text-red-400/70 text-xs"
                  >
                    {genre}
                    <button onClick={() => removeAvoidGenre(genre)} className="hover:text-red-300 transition-colors">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Platforms */}
          <div>
            <div className="text-xs text-white/40 mb-2">Platforms</div>
            <div className="flex flex-wrap gap-1.5">
              {profile.platforms.map(platform => (
                <span
                  key={platform}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 text-blue-300/70 text-xs"
                >
                  {platform}
                  <button onClick={() => removePlatform(platform)} className="hover:text-red-400 transition-colors">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-white/[0.03] rounded-lg p-2.5">
              <div className="text-[10px] text-white/30 mb-0.5">Avg Session</div>
              <div className="text-sm text-white/80">{profile.avgSessionHours}h</div>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-2.5">
              <div className="text-[10px] text-white/30 mb-0.5">Game Length</div>
              <div className="text-sm text-white/80">{profile.preferredGameLength}</div>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-2.5">
              <div className="text-[10px] text-white/30 mb-0.5">Price Range</div>
              <div className="text-sm text-white/80">{profile.priceRange}</div>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-2.5">
              <div className="text-[10px] text-white/30 mb-0.5">Avg Rating</div>
              <div className="text-sm text-white/80">{profile.avgRating}/10</div>
            </div>
          </div>

          {/* Top Games */}
          <div>
            <div className="text-xs text-white/40 mb-2">Your Top Rated</div>
            <div className="space-y-1">
              {profile.topGames.slice(0, 3).map(game => (
                <div key={game.name} className="flex items-center justify-between text-xs">
                  <span className="text-white/60">{game.name}</span>
                  <span className="text-white/40">{game.rating}/10 · {game.hours}h</span>
                </div>
              ))}
            </div>
          </div>

          {/* User Prompt */}
          <div>
            <div className="text-xs text-white/40 mb-2">Your Request (optional)</div>
            <textarea
              value={userPrompt}
              onChange={(e) => onUserPromptChange(e.target.value)}
              placeholder="e.g., &quot;I want open world games with a good story&quot; or &quot;something short and chill for weeknights&quot;"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/25 outline-none focus:border-purple-500/50 resize-none"
              rows={2}
            />
          </div>

          {/* Reset button */}
          {hasOverrides && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              <RotateCcw size={10} />
              Reset to auto-detected profile
            </button>
          )}
        </div>
      )}
    </div>
  );
}
