'use client';

import { useState, useMemo, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { v4 as uuidv4 } from 'uuid';
import { LayoutGrid, X, RotateCcw, Save, FolderOpen, Trash2, Gamepad2 } from 'lucide-react';
import clsx from 'clsx';
import { Game } from '../lib/types';
import { TierLetter, getAutoTierRank } from '../lib/calculations';
import { TierListBoard, TierBoardTiers, getTierListBoards, saveTierListBoard, deleteTierListBoard } from '../lib/tierlist-storage';
import { useAuthContext } from '@/lib/AuthContext';
import { ShareButton } from './ShareButton';

interface TierListMakerProps {
  games: Game[];
  onClose: () => void;
}

const TIER_ORDER: TierLetter[] = ['S', 'A', 'B', 'C', 'D', 'F'];

const TIER_STYLES: Record<TierLetter, { label: string; rowClass: string; chipClass: string }> = {
  S: { label: 'S', rowClass: 'bg-amber-500/10 border-amber-500/30', chipClass: 'border-amber-400/40' },
  A: { label: 'A', rowClass: 'bg-purple-500/10 border-purple-500/30', chipClass: 'border-purple-400/40' },
  B: { label: 'B', rowClass: 'bg-blue-500/10 border-blue-500/30', chipClass: 'border-blue-400/40' },
  C: { label: 'C', rowClass: 'bg-emerald-500/10 border-emerald-500/30', chipClass: 'border-emerald-400/40' },
  D: { label: 'D', rowClass: 'bg-orange-500/10 border-orange-500/30', chipClass: 'border-orange-400/40' },
  F: { label: 'F', rowClass: 'bg-red-500/10 border-red-500/30', chipClass: 'border-red-400/40' },
};

function emptyTiers(): TierBoardTiers {
  return { S: [], A: [], B: [], C: [], D: [], F: [] };
}

function autoSeedTiers(games: Game[]): TierBoardTiers {
  const tiers = emptyTiers();
  const ranked = games
    .map(g => ({ game: g, rank: getAutoTierRank(g) }))
    .sort((a, b) => b.rank.score - a.rank.score);
  ranked.forEach(({ game, rank }) => {
    tiers[rank.tier].push(game.id);
  });
  return tiers;
}

function GameChip({ game, tierLetter }: { game: Game; tierLetter: TierLetter }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: game.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        'flex flex-col items-center gap-1 w-20 shrink-0 cursor-grab active:cursor-grabbing select-none touch-none',
        isDragging && 'opacity-30'
      )}
      title={game.name}
    >
      <div className={clsx(
        'w-16 h-16 rounded-lg overflow-hidden border-2 bg-white/5 flex items-center justify-center',
        TIER_STYLES[tierLetter].chipClass
      )}>
        {game.thumbnail ? (
          <img src={game.thumbnail} alt={game.name} className="w-full h-full object-cover" loading="lazy" draggable={false} />
        ) : (
          <Gamepad2 size={20} className="text-white/20" />
        )}
      </div>
      <span className="text-[10px] text-white/60 text-center leading-tight line-clamp-2 w-full">{game.name}</span>
    </div>
  );
}

function TierRow({ tier, gameIds, gamesById }: { tier: TierLetter; gameIds: string[]; gamesById: Map<string, Game> }) {
  const { setNodeRef } = useDroppable({ id: tier });
  const style = TIER_STYLES[tier];

  return (
    <div className={clsx('flex border rounded-xl overflow-hidden', style.rowClass)}>
      <div className="w-12 sm:w-14 flex items-center justify-center shrink-0 text-2xl font-bold text-white/80 border-r border-white/10">
        {style.label}
      </div>
      <SortableContext items={gameIds} strategy={horizontalListSortingStrategy}>
        <div ref={setNodeRef} className="flex-1 flex flex-wrap gap-2 p-2 min-h-[88px]">
          {gameIds.map(id => {
            const game = gamesById.get(id);
            if (!game) return null;
            return <GameChip key={id} game={game} tierLetter={tier} />;
          })}
          {gameIds.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-[11px] text-white/20">Drop here</div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function TierListMaker({ games, onClose }: TierListMakerProps) {
  const { user } = useAuthContext();
  const userId = user?.uid || 'local-user';

  const rankableGames = useMemo(() => games.filter(g => g.status !== 'Wishlist'), [games]);
  const gamesById = useMemo(() => new Map(rankableGames.map(g => [g.id, g])), [rankableGames]);

  const [tiers, setTiers] = useState<TierBoardTiers>(() => autoSeedTiers(rankableGames));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [boards, setBoards] = useState<TierListBoard[]>(() => getTierListBoards(userId));
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [showLoadMenu, setShowLoadMenu] = useState(false);

  const boardRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findContainer = (id: string): TierLetter | undefined => {
    if ((TIER_ORDER as string[]).includes(id)) return id as TierLetter;
    return TIER_ORDER.find(t => tiers[t].includes(id));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over.id as string);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setTiers(prev => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      const overIndex = overItems.indexOf(over.id as string);
      const newIndex = overIndex >= 0 ? overIndex : overItems.length;
      return {
        ...prev,
        [activeContainer]: activeItems.filter(id => id !== active.id),
        [overContainer]: [
          ...overItems.slice(0, newIndex),
          active.id as string,
          ...overItems.slice(newIndex),
        ],
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over.id as string);
    if (!activeContainer || !overContainer || activeContainer !== overContainer) return;

    const items = tiers[overContainer];
    const activeIndex = items.indexOf(active.id as string);
    const overIndex = items.indexOf(over.id as string);
    if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
      setTiers(prev => ({ ...prev, [overContainer]: arrayMove(prev[overContainer], activeIndex, overIndex) }));
    }
  };

  const handleReset = () => {
    setTiers(autoSeedTiers(rankableGames));
    setActiveBoardId(null);
  };

  const handleSave = () => {
    const name = boardName.trim() || 'My Tier List';
    const now = new Date().toISOString();
    const board: TierListBoard = {
      id: activeBoardId || uuidv4(),
      name,
      createdAt: activeBoardId ? (boards.find(b => b.id === activeBoardId)?.createdAt || now) : now,
      updatedAt: now,
      tiers,
    };
    const updated = saveTierListBoard(userId, board);
    setBoards(updated);
    setActiveBoardId(board.id);
    setShowSaveInput(false);
    setBoardName('');
  };

  const handleLoad = (board: TierListBoard) => {
    // Only restore games that still exist in the library; anything new auto-seeds into the unranked slot it belongs in.
    const knownIds = new Set<string>();
    const restored = emptyTiers();
    TIER_ORDER.forEach(t => {
      board.tiers[t]?.forEach(id => {
        if (gamesById.has(id)) {
          restored[t].push(id);
          knownIds.add(id);
        }
      });
    });
    rankableGames.forEach(g => {
      if (!knownIds.has(g.id)) {
        restored[getAutoTierRank(g).tier].push(g.id);
      }
    });
    setTiers(restored);
    setActiveBoardId(board.id);
    setShowLoadMenu(false);
  };

  const handleDelete = (boardId: string) => {
    const updated = deleteTierListBoard(userId, boardId);
    setBoards(updated);
    if (activeBoardId === boardId) setActiveBoardId(null);
  };

  const activeGame = activeId ? gamesById.get(activeId) : null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#12121a] border border-white/10 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <LayoutGrid size={20} className="text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Tier List Maker</h2>
          </div>
          <button onClick={onClose} className="p-1 text-white/40 hover:text-white/80 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-white/10 shrink-0">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
          >
            <RotateCcw size={13} /> Auto-Rank
          </button>
          <button
            onClick={() => { setShowSaveInput(s => !s); setShowLoadMenu(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
          >
            <Save size={13} /> Save
          </button>
          <div className="relative">
            <button
              onClick={() => { setShowLoadMenu(s => !s); setShowSaveInput(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
            >
              <FolderOpen size={13} /> Load ({boards.length})
            </button>
            {showLoadMenu && (
              <div className="absolute left-0 top-full mt-1 w-56 bg-[#1a1a24] border border-white/10 rounded-lg shadow-xl z-10 max-h-64 overflow-y-auto">
                {boards.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-white/30">No saved tier lists yet</div>
                ) : (
                  boards.map(b => (
                    <div key={b.id} className="flex items-center justify-between px-3 py-2 hover:bg-white/5 group">
                      <button onClick={() => handleLoad(b)} className="text-xs text-white/70 text-left truncate flex-1">
                        {b.name}
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="ml-auto">
            <ShareButton targetRef={boardRef} filename="tier-list" variant="compact" shareText="My game tier list" />
          </div>
        </div>

        {showSaveInput && (
          <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 shrink-0 bg-white/[0.02]">
            <input
              type="text"
              value={boardName}
              onChange={e => setBoardName(e.target.value)}
              placeholder="Name this tier list..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/80 placeholder:text-white/20"
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
              autoFocus
            />
            <button
              onClick={handleSave}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
            >
              Save
            </button>
          </div>
        )}

        {/* Board */}
        <div className="flex-1 overflow-y-auto p-5">
          <div ref={boardRef} className="bg-[#0a0a0f] p-3 rounded-xl space-y-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              {TIER_ORDER.map(tier => (
                <TierRow key={tier} tier={tier} gameIds={tiers[tier]} gamesById={gamesById} />
              ))}
              <DragOverlay>
                {activeGame ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-white/40 bg-white/10 flex items-center justify-center shadow-2xl">
                    {activeGame.thumbnail ? (
                      <img src={activeGame.thumbnail} alt={activeGame.name} className="w-full h-full object-cover" />
                    ) : (
                      <Gamepad2 size={20} className="text-white/40" />
                    )}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
          <p className="text-[11px] text-white/20 text-center mt-3">
            Auto-ranked from rating, value, hours, and completion. Drag any game to re-rank it.
          </p>
        </div>
      </div>
    </div>
  );
}
