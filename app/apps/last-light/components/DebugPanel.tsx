'use client';

import { useState } from 'react';
import { GameState } from '../lib/types';

interface DebugPanelProps {
  gameState: GameState | null;
  errors: string[];
  logs: string[];
}

export function DebugPanel({ gameState, errors, logs }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'errors' | 'logs' | 'state'>(
    'errors'
  );

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 bg-gray-800 text-white px-4 py-2 rounded-full text-xs shadow-lg hover:bg-gray-700 transition-colors z-50"
      >
        🐛 Debug ({errors.length})
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 w-96 bg-gray-900 text-white rounded-lg shadow-2xl z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold">Debug Panel</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white text-sm"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('errors')}
          className={`flex-1 px-4 py-2 text-xs ${
            activeTab === 'errors'
              ? 'bg-gray-800 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Errors ({errors.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 px-4 py-2 text-xs ${
            activeTab === 'logs'
              ? 'bg-gray-800 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Logs ({logs.length})
        </button>
        <button
          onClick={() => setActiveTab('state')}
          className={`flex-1 px-4 py-2 text-xs ${
            activeTab === 'state'
              ? 'bg-gray-800 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          State
        </button>
      </div>

      {/* Content */}
      <div className="h-64 overflow-y-auto p-4">
        {activeTab === 'errors' && (
          <div className="space-y-2">
            {errors.length === 0 ? (
              <p className="text-gray-500 text-xs">No errors</p>
            ) : (
              errors.map((error, i) => (
                <div key={i} className="bg-red-900/50 border border-red-700 rounded p-2">
                  <p className="text-xs text-red-200 font-mono">{error}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-1">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-xs">No logs</p>
            ) : (
              logs.map((log, i) => (
                <p key={i} className="text-xs text-gray-300 font-mono">
                  {log}
                </p>
              ))
            )}
          </div>
        )}

        {activeTab === 'state' && (
          <div className="space-y-2">
            {gameState ? (
              <>
                <div className="space-y-1">
                  <p className="text-xs text-gray-400">Location:</p>
                  <p className="text-xs text-white font-mono">
                    {gameState.currentLocation}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-gray-400">Stats:</p>
                  <p className="text-xs text-white font-mono">
                    Health: {gameState.health} | Hunger: {gameState.hunger} |
                    Energy: {gameState.energy}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-gray-400">Behavior:</p>
                  <p className="text-xs text-white font-mono">
                    Stealth: {gameState.playerBehavior.stealthScore} | Turns:{' '}
                    {gameState.playerBehavior.turnsInLocation}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-gray-400">Inventory:</p>
                  <p className="text-xs text-white font-mono">
                    {gameState.inventory.length > 0
                      ? gameState.inventory.map((i) => i.name).join(', ')
                      : 'Empty'}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-gray-400">Encounter:</p>
                  <p className="text-xs text-white font-mono">
                    {gameState.currentEncounter
                      ? `Active: ${gameState.currentEncounter.npc.name}`
                      : 'None'}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-xs">No game state</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
