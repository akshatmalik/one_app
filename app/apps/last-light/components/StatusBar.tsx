'use client';

import { GameState } from '../lib/types';

interface StatusBarProps {
  gameState: GameState;
}

export function StatusBar({ gameState }: StatusBarProps) {
  return (
    <div className="border-b border-gray-200 bg-white px-6 py-3">
      <div className="max-w-3xl mx-auto flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center gap-6">
          <div>
            <span className="font-medium">{gameState.currentLocation}</span>
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
        <div className="text-gray-400">
          Day {gameState.day} • {gameState.timeOfDay}
        </div>
      </div>
    </div>
  );
}
