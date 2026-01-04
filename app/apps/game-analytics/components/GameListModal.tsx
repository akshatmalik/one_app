'use client';

import { X } from 'lucide-react';
import { Game } from '../lib/types';
import { getTotalHours } from '../lib/calculations';

interface GameListModalProps {
  title: string;
  games: Game[];
  isOpen: boolean;
  onClose: () => void;
  renderGameInfo?: (game: Game) => React.ReactNode;
}

export function GameListModal({ title, games, isOpen, onClose, renderGameInfo }: GameListModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a24] border border-white/10 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white/80 hover:bg-white/10 rounded-lg transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Game List */}
        <div className="flex-1 overflow-y-auto p-4">
          {games.length === 0 ? (
            <p className="text-white/40 text-center py-8">No games found</p>
          ) : (
            <div className="space-y-2">
              {games.map((game, idx) => (
                <div
                  key={game.id}
                  className="p-3 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-lg transition-all"
                >
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 text-sm font-bold shrink-0">
                      {idx + 1}
                    </div>

                    {/* Thumbnail */}
                    {game.thumbnail && (
                      <img
                        src={game.thumbnail}
                        alt={game.name}
                        className="w-12 h-12 object-cover rounded"
                        loading="lazy"
                      />
                    )}

                    {/* Game Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white/90 truncate">{game.name}</div>
                      {renderGameInfo ? (
                        renderGameInfo(game)
                      ) : (
                        <div className="text-xs text-white/40 mt-0.5">
                          ${game.price} • {getTotalHours(game).toFixed(1)}h • {game.rating}/10
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-white/40 text-center">
            {games.length} game{games.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
