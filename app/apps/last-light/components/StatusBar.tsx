'use client';

import { GameState } from '../lib/types';

interface StatusBarProps {
  gameState: GameState;
  onReset?: () => void;
}

export function StatusBar({ gameState, onReset }: StatusBarProps) {
  const handleReset = () => {
    if (window.confirm('Start a new game? Your current progress will be lost.')) {
      onReset?.();
    }
  };

  return (
    <div className="border-b border-gray-700 bg-gray-800 px-4 py-3">
      {/* Top row: Stats */}
      <div className="flex items-center justify-between text-xs text-gray-300 mb-2">
        <div className="flex items-center gap-3 md:gap-6">
          <div className="hidden sm:block">
            <span className="font-medium text-gray-200">{gameState.currentLocation}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>❤️</span>
            <span>{gameState.health}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🍎</span>
            <span>{gameState.hunger}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>⚡</span>
            <span>{gameState.energy}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-gray-500 text-xs">
            Turn {gameState.turnCount}
          </div>
          {onReset && (
            <button
              onClick={handleReset}
              className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-gray-700 transition-colors"
              title="Reset game"
            >
              🔄 Reset
            </button>
          )}
        </div>
      </div>

      {/* Bottom row: Arc info */}
      <div className="text-xs text-gray-400 border-t border-gray-700 pt-2">
        <span className="font-medium text-purple-400">Arc {gameState.currentArc.arcNumber}:</span>{' '}
        <span className="text-gray-300">{gameState.currentArc.arcName}</span>
        <span className="text-gray-500 ml-2">• Turn {gameState.currentArc.turnsInArc} in arc</span>
      </div>
    </div>
  );
}
