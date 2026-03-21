'use client';

import { useGame } from './hooks/useGame';
import { Button } from '@/components/ui/Button';

export default function SurvivorDeckBuilder() {
  const { gameState, currentRun, loading, getSurvivors, getItems, startRun } =
    useGame();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div>Loading survivor deck...</div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div>Error loading game state</div>
      </div>
    );
  }

  const survivors = getSurvivors();
  const items = getItems();

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Survivor Deck-Builder</h1>
          <p className="text-slate-400">
            A tactical zombie survival game with card-based expeditions
          </p>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Game Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Status */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-bold mb-4">Status</h2>
              {currentRun ? (
                <div>
                  <p className="text-green-400 mb-2">
                    📍 Expedition in progress - Stage {currentRun.currentStage}/
                    {currentRun.totalStages}
                  </p>
                  <Button variant="outline" size="sm">
                    Continue Expedition
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="text-slate-400 mb-4">Ready for new expedition</p>
                  <Button
                    onClick={() => {
                      // Will implement proper deck selection
                      const defaultDeck = [
                        survivors[0],
                        survivors[1],
                        items[0],
                        items[1],
                      ].filter(Boolean);
                      if (defaultDeck.length > 0) {
                        startRun(defaultDeck);
                      }
                    }}
                  >
                    Launch Expedition
                  </Button>
                </div>
              )}
            </div>

            {/* Survivors Card */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-bold mb-4">Survivors</h3>
              <div className="grid grid-cols-2 gap-4">
                {survivors.map((survivor) => (
                  <div
                    key={survivor.id}
                    className={`p-4 rounded border ${
                      survivor.exhausted
                        ? 'bg-slate-700 border-red-500 opacity-60'
                        : 'bg-slate-700 border-green-500'
                    }`}
                  >
                    <p className="font-bold">{survivor.name}</p>
                    <p className="text-sm text-slate-400 capitalize">
                      {survivor.role}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      {survivor.exhausted ? '🔴 Exhausted' : '🟢 Ready'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Items Card */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-bold mb-4">Equipment & Items</h3>
              <div className="grid grid-cols-2 gap-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded border ${
                      item.exhausted
                        ? 'bg-slate-700 border-red-500 opacity-60'
                        : 'bg-slate-700 border-blue-500'
                    }`}
                  >
                    <p className="font-bold text-sm">{item.name}</p>
                    <p className="text-xs text-slate-500 mt-1 capitalize">
                      {item.itemType}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      {item.exhausted ? '🔴 Exhausted' : '🟢 Ready'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Quick Info */}
          <div className="space-y-6">
            {/* Design Document */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-bold mb-4">📖 Game Design</h3>
              <p className="text-sm text-slate-400 mb-4">
                This is Version 1 of the Survivor Deck-Builder game. See the
                design document for full details on mechanics, card types, and
                game flow.
              </p>
              <Button variant="outline" size="sm" className="w-full">
                View Design Document
              </Button>
            </div>

            {/* Features */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-bold mb-3">V1 Features</h3>
              <ul className="text-sm text-slate-400 space-y-2">
                <li>✓ Card-based combat system</li>
                <li>✓ 5 survivor characters</li>
                <li>✓ Equipment & action cards</li>
                <li>✓ 5-stage expeditions</li>
                <li>✓ Item exhaustion & recovery</li>
                <li>✓ Card synergies</li>
                <li>⏳ Home base management</li>
                <li>⏳ Combat encounters</li>
              </ul>
            </div>

            {/* Development Status */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-bold mb-3">Development</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Core Combat</span>
                  <span className="text-green-400">70%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Run Structure</span>
                  <span className="text-yellow-400">40%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Home Base</span>
                  <span className="text-yellow-400">20%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-12 p-6 bg-slate-800 rounded-lg border border-slate-700">
          <p className="text-sm text-slate-400">
            <strong>Note:</strong> This is V1 of the Survivor Deck-Builder game.
            Implementation is in progress. See the design document for full
            specifications.
          </p>
        </div>
      </div>
    </div>
  );
}
