'use client';

import { useState } from 'react';
import { RefreshCw, Settings, Wifi, WifiOff, TrendingUp } from 'lucide-react';
import { useTracker } from './hooks/useTracker';
import { TRACKED_GAMES } from './lib/games';
import { GameSignals } from './lib/types';
import { CompositeScore } from './lib/calculations';
import { ScoreChart } from './components/ScoreChart';
import { SignalRow } from './components/SignalRow';
import { WeightSliders } from './components/WeightSliders';
import { APIKeyModal } from './components/APIKeyModal';

export default function GameInterestTrackerPage() {
  const {
    signals,
    settings,
    scores,
    fetchState,
    fetchError,
    mounted,
    refreshAutoSignals,
    updateManualSignal,
    updateSettings,
  } = useTracker();

  const [showApiModal, setShowApiModal] = useState(false);
  const [showWeights, setShowWeights] = useState(false);

  const handleSaveKey = (key: string) => {
    const newSettings = { ...settings, youtubeApiKey: key };
    updateSettings(newSettings);
    refreshAutoSignals(key);
  };

  const hasApiKey = !!settings.youtubeApiKey;

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-600 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <h1 className="text-xl font-bold text-white">Game Interest Tracker</h1>
            </div>
            <p className="text-gray-500 text-sm">Composite buzz scores · State of Play June 2, 2026</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowWeights(v => !v)}
              className={`p-2 rounded-lg border transition-colors text-sm ${
                showWeights
                  ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                  : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20'
              }`}
              title="Signal weights"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => hasApiKey ? refreshAutoSignals() : setShowApiModal(true)}
              disabled={fetchState === 'fetching'}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetchState === 'fetching' ? 'animate-spin' : ''}`} />
              {fetchState === 'fetching' ? 'Fetching…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* API key nudge */}
        {!hasApiKey && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
            <p className="text-amber-300 text-sm">
              Add a YouTube API key to auto-fetch trailer views.
            </p>
            <button
              onClick={() => setShowApiModal(true)}
              className="text-amber-300 hover:text-amber-200 text-sm font-medium underline underline-offset-2 transition-colors"
            >
              Add key
            </button>
          </div>
        )}

        {/* Fetch error */}
        {fetchState === 'error' && fetchError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <p className="text-red-300 text-sm">Fetch error: {fetchError}</p>
          </div>
        )}

        {/* Fetch success */}
        {fetchState === 'done' && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
            <p className="text-green-300 text-sm">Signals refreshed successfully.</p>
          </div>
        )}

        {/* Signal legend */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-green-400" />
            <span>Auto-fetched</span>
          </div>
          <div className="flex items-center gap-1.5">
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span>Manual input</span>
          </div>
        </div>

        {/* Score chart */}
        <ScoreChart scores={scores} games={TRACKED_GAMES} />

        {/* Weight sliders */}
        {showWeights && (
          <WeightSliders
            weights={settings.weights}
            onChange={weights => updateSettings({ ...settings, weights })}
          />
        )}

        {/* Signal rows */}
        <div className="space-y-3">
          {TRACKED_GAMES.map(game => {
            const gameSignals = (signals as GameSignals[]).find(s => s.gameId === game.id);
            const gameScore = (scores as CompositeScore[]).find(s => s.gameId === game.id);
            if (!gameSignals) return null;
            return (
              <SignalRow
                key={game.id}
                game={game}
                signals={gameSignals}
                score={gameScore}
                onManualChange={(field, value): void => { updateManualSignal(game.id, field, value); }}
              />
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 text-xs text-gray-600">
          <span>Scores normalize signals across all tracked games.</span>
          {hasApiKey && (
            <button
              onClick={() => setShowApiModal(true)}
              className="hover:text-gray-400 transition-colors"
            >
              Change API key
            </button>
          )}
        </div>

      </div>

      {showApiModal && (
        <APIKeyModal
          apiKey={settings.youtubeApiKey}
          onSave={handleSaveKey}
          onClose={() => setShowApiModal(false)}
        />
      )}
    </div>
  );
}
