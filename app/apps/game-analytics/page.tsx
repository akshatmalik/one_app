'use client';

import { useState, useEffect } from 'react';
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

export default function GameAnalyticsPage() {
  const { games, loading, addGame, updateGame, deleteGame } = useGames();
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

  const handleAddGame = async (gameData: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingGame) {
      await updateGame(editingGame.id, gameData);
      setEditingGame(null);
    } else {
      await addGame(gameData);
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

  const handleSeedData = async () => {
    try {
      for (const gameData of BASELINE_GAMES_2025) {
        await gameRepository.create(gameData);
      }
      setHasLoadedBaseline(true);
      window.location.reload();
    } catch (error) {
      console.error('Failed to seed data:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Game Analytics Dashboard</h1>
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

      <StatsPanel summary={summary} />

      {games.length > 0 && (
        <>
          <GameTable
            games={gamesWithMetrics}
            onEdit={handleEdit}
            onDelete={deleteGame}
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
