'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { useGames } from './hooks/useGames';
import { useAnalytics, GameWithMetrics } from './hooks/useAnalytics';
import { GameTable } from './components/GameTable';
import { StatsPanel } from './components/StatsPanel';
import { GameForm } from './components/GameForm';
import { BlendScoreChart } from './components/BlendScoreChart';
import { YearFilter } from './components/YearFilter';
import { YearlyStatsChart } from './components/YearlyStatsChart';
import { Game } from './lib/types';
import { gameRepository } from './lib/storage';
import { BASELINE_GAMES_2025 } from './data/baseline-games';
import { filterGamesByYear, getAvailableYears, getCurrentYear } from './lib/calculations';

export default function GameAnalyticsPage() {
  const { games, loading, addGame, updateGame, deleteGame } = useGames();
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(getCurrentYear());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameWithMetrics | null>(null);
  const [hasLoadedBaseline, setHasLoadedBaseline] = useState(false);

  // Get available years and filtered games
  const availableYears = useMemo(() => getAvailableYears(games), [games]);
  const filteredGames = useMemo(() => filterGamesByYear(games, selectedYear), [games, selectedYear]);
  const { gamesWithMetrics, summary } = useAnalytics(filteredGames);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Game Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">Track your game library and analyze value</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {games.length === 0 && !hasLoadedBaseline && (
            <Button onClick={handleSeedData} variant="secondary" size="sm">
              Load Sample Data
            </Button>
          )}
          <Button onClick={() => setIsFormOpen(true)}>Add Game</Button>
        </div>
      </div>

      {games.length > 0 && availableYears.length > 0 && (
        <YearFilter
          selectedYear={selectedYear}
          availableYears={availableYears}
          onYearChange={setSelectedYear}
        />
      )}

      <StatsPanel summary={summary} selectedYear={selectedYear} />

      {games.length > 0 && (
        <>
          {availableYears.length > 1 && selectedYear === 'all' && (
            <YearlyStatsChart games={games} />
          )}

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
