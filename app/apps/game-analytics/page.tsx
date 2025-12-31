'use client';

import { useState, useEffect } from 'react';
import { Cloud, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useGames } from './hooks/useGames';
import { useAnalytics, GameWithMetrics } from './hooks/useAnalytics';
import { GameTable } from './components/GameTable';
import { StatsPanel } from './components/StatsPanel';
import { GameForm } from './components/GameForm';
import { BlendScoreChart } from './components/BlendScoreChart';
import { Game } from './lib/types';
import { gameRepository } from './lib/storage';
import { BASELINE_GAMES_2025 } from './data/baseline-games';
import { useAuthContext } from '@/lib/AuthContext';
import { useToast } from '@/components/Toast';

export default function GameAnalyticsPage() {
  const { user, loading: authLoading } = useAuthContext();
  const { showToast } = useToast();
  const { games, loading, error, addGame, updateGame, deleteGame } = useGames(user?.uid ?? null);
  const { gamesWithMetrics, summary } = useAnalytics(games);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameWithMetrics | null>(null);
  const [hasLoadedBaseline, setHasLoadedBaseline] = useState(false);

  // Check if we should show seed data button
  useEffect(() => {
    if (games.length === 0) {
      setHasLoadedBaseline(false);
    }
  }, [games.length]);

  const handleAddGame = async (gameData: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingGame) {
        await updateGame(editingGame.id, gameData);
        setEditingGame(null);
        showToast('Game updated', 'success');
      } else {
        await addGame(gameData);
        showToast('Game added', 'success');
      }
      setIsFormOpen(false);
    } catch (e) {
      showToast(`Failed to save game: ${(e as Error).message}`, 'error');
    }
  };

  const handleEdit = (game: GameWithMetrics) => {
    setEditingGame(game);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingGame(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGame(id);
      showToast('Game deleted', 'success');
    } catch (e) {
      showToast(`Failed to delete game: ${(e as Error).message}`, 'error');
    }
  };

  const handleSeedData = async () => {
    try {
      // Set userId on repository before seeding
      gameRepository.setUserId(user?.uid || '');
      for (const gameData of BASELINE_GAMES_2025) {
        await gameRepository.create(gameData);
      }
      setHasLoadedBaseline(true);
      showToast('Sample data loaded', 'success');
      window.location.reload();
    } catch (e) {
      showToast(`Failed to seed data: ${(e as Error).message}`, 'error');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold text-gray-900">Game Analytics Dashboard</h1>
            {/* Cloud sync indicator */}
            {user ? (
              <span className="text-green-600" title="Syncing to cloud">
                <Cloud size={24} />
              </span>
            ) : (
              <span className="text-gray-400" title="Local only - sign in to sync">
                <CloudOff size={24} />
              </span>
            )}
          </div>
          <p className="text-gray-600 mt-2">Track your game library and analyze value</p>
        </div>
        <div className="flex gap-2">
          {games.length === 0 && !hasLoadedBaseline && (
            <Button onClick={handleSeedData} variant="secondary">
              Load 2025 Data
            </Button>
          )}
          <Button onClick={() => setIsFormOpen(true)}>Add Game</Button>
        </div>
      </div>

      {/* Local mode banner */}
      {!user && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700">
          Local mode - games saved on this device only. Sign in to sync across devices.
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
          Error: {error.message}
        </div>
      )}

      <StatsPanel summary={summary} />

      {games.length > 0 && (
        <>
          <GameTable
            games={gamesWithMetrics}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          <BlendScoreChart games={gamesWithMetrics} />
        </>
      )}

      {games.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No games yet. Start by adding your first game!</p>
        </div>
      )}

      {isFormOpen && (
        <GameForm
          onSubmit={handleAddGame}
          onClose={handleCloseForm}
          initialGame={editingGame || undefined}
        />
      )}
    </div>
  );
}
