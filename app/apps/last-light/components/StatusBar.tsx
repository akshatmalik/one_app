'use client';

import { GameState } from '../lib/types';

interface StatusBarProps {
  gameState: GameState;
}

export function StatusBar({ gameState }: StatusBarProps) {
  return (
    <div className="border-b border-gray-700 bg-gray-800 px-4 py-2">
      <div className="flex items-center justify-between text-xs text-gray-300">
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
        <div className="text-gray-500 text-xs">
          D{gameState.day}
        </div>
      </div>
    </div>
  );
}
