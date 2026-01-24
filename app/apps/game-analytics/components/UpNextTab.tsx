'use client';

import { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ListOrdered, Search, Plus, Gamepad2 } from 'lucide-react';
import { QueueGameCard } from './QueueGameCard';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { Game } from '../lib/types';
import clsx from 'clsx';

interface UpNextTabProps {
  queuedGames: GameWithMetrics[];
  availableGames: Game[];
  hideFinished: boolean;
  onToggleHideFinished: () => void;
  onAddToQueue: (gameId: string) => Promise<void>;
  onRemoveFromQueue: (gameId: string) => Promise<void>;
  onReorderQueue: (gameId: string, newPosition: number) => Promise<void>;
}

export function UpNextTab({
  queuedGames,
  availableGames,
  hideFinished,
  onToggleHideFinished,
  onAddToQueue,
  onRemoveFromQueue,
  onReorderQueue,
}: UpNextTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingGames, setIsAddingGames] = useState(false);

  // Configure sensors for drag and drop - optimized for mobile
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms hold before drag starts on touch
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter available games by search
  const filteredAvailableGames = useMemo(() => {
    if (!searchQuery.trim()) return availableGames;

    const query = searchQuery.toLowerCase();
    return availableGames.filter(game =>
      game.name.toLowerCase().includes(query) ||
      game.genre?.toLowerCase().includes(query) ||
      game.platform?.toLowerCase().includes(query)
    );
  }, [availableGames, searchQuery]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = queuedGames.findIndex(g => g.id === active.id);
    const newIndex = queuedGames.findIndex(g => g.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      // Calculate new position (1-based)
      const newPosition = newIndex + 1;
      await onReorderQueue(active.id as string, newPosition);
    }
  };

  const handleAddGame = async (gameId: string) => {
    await onAddToQueue(gameId);
    setSearchQuery(''); // Clear search after adding
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ListOrdered size={24} className="text-purple-400" />
          <div>
            <h2 className="text-xl font-semibold text-white">Up Next</h2>
            <p className="text-xs text-white/40">Your gaming queue</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Hide Finished */}
          <button
            onClick={onToggleHideFinished}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all',
              hideFinished
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-white/5 text-white/60 border border-white/5 hover:bg-white/10'
            )}
          >
            Hide Finished
          </button>

          {/* Add Games Button */}
          <button
            onClick={() => setIsAddingGames(!isAddingGames)}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all',
              isAddingGames
                ? 'bg-purple-600 text-white'
                : 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/30'
            )}
          >
            <Plus size={16} />
            Add Games
          </button>
        </div>
      </div>

      {/* Add Games Section */}
      {isAddingGames && (
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your library..."
              className="flex-1 px-3 py-2 bg-white/[0.03] border border-white/5 text-white rounded-lg text-sm focus:outline-none focus:bg-white/[0.05] focus:border-purple-500/50 transition-all placeholder:text-white/30"
              autoFocus
            />
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredAvailableGames.length === 0 ? (
              <div className="text-center py-8">
                <Gamepad2 size={32} className="mx-auto mb-2 text-white/10" />
                <p className="text-white/30 text-sm">
                  {searchQuery ? 'No games found' : 'All games are in your queue'}
                </p>
              </div>
            ) : (
              filteredAvailableGames.map((game) => (
                <button
                  key={game.id}
                  onClick={() => handleAddGame(game.id)}
                  className="w-full flex items-center gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-purple-500/30 rounded-lg transition-all text-left group"
                >
                  {/* Thumbnail */}
                  {game.thumbnail && (
                    <img
                      src={game.thumbnail}
                      alt={game.name}
                      className="w-12 h-12 object-cover rounded-lg shrink-0"
                      loading="lazy"
                    />
                  )}

                  {/* Game Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-white/90 truncate group-hover:text-purple-400 transition-colors">
                      {game.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {game.platform && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded text-white/40">
                          {game.platform}
                        </span>
                      )}
                      {game.genre && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded text-white/40">
                          {game.genre}
                        </span>
                      )}
                      <span className={clsx(
                        'text-[10px] px-1.5 py-0.5 rounded font-medium',
                        game.status === 'Completed' && 'bg-emerald-500/20 text-emerald-400',
                        game.status === 'In Progress' && 'bg-blue-500/20 text-blue-400',
                        game.status === 'Not Started' && 'bg-white/10 text-white/50',
                        game.status === 'Wishlist' && 'bg-purple-500/20 text-purple-400',
                        game.status === 'Abandoned' && 'bg-red-500/20 text-red-400'
                      )}>
                        {game.status === 'Not Started' ? 'Backlog' : game.status}
                      </span>
                    </div>
                  </div>

                  {/* Add Icon */}
                  <Plus size={20} className="text-white/30 group-hover:text-purple-400 transition-colors shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Queue List */}
      {queuedGames.length === 0 ? (
        <div className="text-center py-16">
          <ListOrdered size={48} className="mx-auto mb-4 text-white/10" />
          <p className="text-white/30 text-sm">Your queue is empty</p>
          <p className="text-white/20 text-xs mt-1">Add games to plan your gaming journey!</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={queuedGames.map(g => g.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {queuedGames.map((game, index) => (
                <QueueGameCard
                  key={game.id}
                  game={game}
                  position={index + 1}
                  onRemove={() => onRemoveFromQueue(game.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
