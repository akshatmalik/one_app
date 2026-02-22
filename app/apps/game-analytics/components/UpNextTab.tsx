'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  ListOrdered, Search, Plus, Gamepad2, Swords, Sparkles, Brain,
  MessageSquare, TrendingUp, ChevronDown, ChevronUp, RefreshCw,
  Flame, Zap, Map, BookOpen,
} from 'lucide-react';
import { QueueGameCard } from './QueueGameCard';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { Game } from '../lib/types';
import {
  getQueueSmartChirps, getQueueRivalry, getEstimatedHoursToReach,
  buildQueueAIContext, SmartChirp, RivalryData,
} from '../lib/calculations';
import {
  generateHypeChirps, generateNarrativeThread, generateQueueRoast,
  generateQueueHype, generateQueueAdvice, clearQueueAICache,
} from '../lib/ai-queue-service';
import clsx from 'clsx';

interface UpNextTabProps {
  queuedGames: GameWithMetrics[];
  availableGames: Game[];
  allGames: Game[];
  hideFinished: boolean;
  onToggleHideFinished: () => void;
  onAddToQueue: (gameId: string) => Promise<void>;
  onRemoveFromQueue: (gameId: string) => Promise<void>;
  onReorderQueue: (gameId: string, newPosition: number) => Promise<void>;
  onLogTime?: (game: GameWithMetrics) => void;
}

type AIMode = 'hype' | 'roast' | 'narrative' | 'advisor' | null;

export function UpNextTab({
  queuedGames,
  availableGames,
  allGames,
  hideFinished,
  onToggleHideFinished,
  onAddToQueue,
  onRemoveFromQueue,
  onReorderQueue,
  onLogTime,
}: UpNextTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingGames, setIsAddingGames] = useState(false);
  const [aiMode, setAiMode] = useState<AIMode>(null);
  const [aiContent, setAiContent] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiChirps, setAiChirps] = useState<string[]>([]);
  const [aiChirpsLoading, setAiChirpsLoading] = useState(false);
  const [showAISection, setShowAISection] = useState(false);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Compute smart chirps
  const smartChirps = useMemo(() => {
    return getQueueSmartChirps(queuedGames, allGames);
  }, [queuedGames, allGames]);

  // Compute rivalry
  const rivalry = useMemo(() => {
    return getQueueRivalry(queuedGames);
  }, [queuedGames]);

  // Build AI context
  const aiContext = useMemo(() => {
    if (queuedGames.length === 0) return null;
    return buildQueueAIContext(queuedGames, allGames);
  }, [queuedGames, allGames]);

  // Load AI hype chirps on mount (if queue has games)
  useEffect(() => {
    if (aiContext && queuedGames.length >= 2) {
      setAiChirpsLoading(true);
      generateHypeChirps(aiContext)
        .then(setAiChirps)
        .catch(() => setAiChirps([]))
        .finally(() => setAiChirpsLoading(false));
    }
  }, [aiContext, queuedGames.length]);

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
      const newPosition = newIndex + 1;
      await onReorderQueue(active.id as string, newPosition);
    }
  };

  const handleAddGame = async (gameId: string) => {
    await onAddToQueue(gameId);
    setSearchQuery('');
  };

  // AI feature handlers
  const handleAIAction = useCallback(async (mode: AIMode) => {
    if (!aiContext) return;
    if (aiMode === mode) {
      setAiMode(null);
      return;
    }
    setAiMode(mode);
    setAiLoading(true);
    setAiContent('');
    setShowAISection(true);

    try {
      let result = '';
      switch (mode) {
        case 'hype':
          result = await generateQueueHype(aiContext);
          break;
        case 'roast':
          result = await generateQueueRoast(aiContext);
          break;
        case 'narrative':
          result = await generateNarrativeThread(aiContext);
          break;
        case 'advisor':
          result = await generateQueueAdvice(aiContext);
          break;
      }
      setAiContent(result);
    } catch {
      setAiContent('Could not generate content. Try again later.');
    } finally {
      setAiLoading(false);
    }
  }, [aiContext, aiMode]);

  const handleRefreshAI = useCallback(async () => {
    clearQueueAICache();
    if (aiMode && aiContext) {
      setAiLoading(true);
      try {
        let result = '';
        switch (aiMode) {
          case 'hype': result = await generateQueueHype(aiContext); break;
          case 'roast': result = await generateQueueRoast(aiContext); break;
          case 'narrative': result = await generateNarrativeThread(aiContext); break;
          case 'advisor': result = await generateQueueAdvice(aiContext); break;
        }
        setAiContent(result);
      } catch {
        setAiContent('Could not generate content.');
      } finally {
        setAiLoading(false);
      }
    }
    // Also refresh chirps
    if (aiContext) {
      setAiChirpsLoading(true);
      generateHypeChirps(aiContext)
        .then(setAiChirps)
        .catch(() => {})
        .finally(() => setAiChirpsLoading(false));
    }
  }, [aiMode, aiContext]);

  // Determine which chirp to show at which position
  const getChirpForPosition = (index: number): string | null => {
    if (aiChirps.length === 0) return null;
    // chirp[0] = after hero (before #2), chirp[1] = after #2, chirp[2] = after #4, chirp[3] = after last
    if (index === 0 && aiChirps[0]) return aiChirps[0]; // After NOW PLAYING
    if (index === 1 && aiChirps[1]) return aiChirps[1]; // After ON DECK
    if (index === 3 && aiChirps[2]) return aiChirps[2]; // Mid-queue
    if (index === queuedGames.length - 1 && aiChirps[3]) return aiChirps[3]; // End of queue
    return null;
  };

  // Smart chirp for a specific position
  const getSmartChirpForPosition = (index: number): SmartChirp | null => {
    if (index === 0) return smartChirps.find(c => c.type === 'now-playing') || null;
    if (index === 1) return smartChirps.find(c => c.type === 'on-deck') || null;
    return null;
  };

  // Find first completed game index for "Victory Lap" divider
  const firstCompletedIndex = queuedGames.findIndex(g => g.status === 'Completed');

  // Stats chirp
  const statsChirp = smartChirps.find(c => c.type === 'stats');

  // Is first game a hero?
  const isFirstGameHero = queuedGames.length > 0 && queuedGames[0].status === 'In Progress';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Map size={24} className="text-purple-400" />
          <div>
            <h2 className="text-xl font-semibold text-white">Up Next</h2>
            <p className="text-xs text-white/40">Your gaming roadmap</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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

      {/* Queue Stats Banner */}
      {statsChirp && queuedGames.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/10 rounded-xl">
          <TrendingUp size={16} className="text-purple-400 shrink-0" />
          <div>
            <span className="text-sm font-medium text-white/80">{statsChirp.text}</span>
            {statsChirp.subtext && (
              <span className="text-xs text-white/40 block sm:inline sm:ml-2">{statsChirp.subtext}</span>
            )}
          </div>
        </div>
      )}

      {/* AI Feature Buttons */}
      {queuedGames.length >= 2 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleAIAction('hype')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                aiMode === 'hype'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/5 text-white/50 hover:text-emerald-400 hover:bg-emerald-500/10'
              )}
            >
              <Flame size={14} />
              Hype Me
            </button>
            <button
              onClick={() => handleAIAction('roast')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                aiMode === 'roast'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-white/5 text-white/50 hover:text-red-400 hover:bg-red-500/10'
              )}
            >
              <Zap size={14} />
              Roast Me
            </button>
            <button
              onClick={() => handleAIAction('narrative')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                aiMode === 'narrative'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-white/5 text-white/50 hover:text-blue-400 hover:bg-blue-500/10'
              )}
            >
              <BookOpen size={14} />
              My Season
            </button>
            <button
              onClick={() => handleAIAction('advisor')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                aiMode === 'advisor'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-white/5 text-white/50 hover:text-purple-400 hover:bg-purple-500/10'
              )}
            >
              <Brain size={14} />
              Queue Advisor
            </button>
          </div>

          {/* AI Content Panel */}
          {showAISection && aiMode && (
            <div className={clsx(
              'relative p-4 rounded-xl border transition-all',
              aiMode === 'hype' && 'bg-emerald-500/5 border-emerald-500/15',
              aiMode === 'roast' && 'bg-red-500/5 border-red-500/15',
              aiMode === 'narrative' && 'bg-blue-500/5 border-blue-500/15',
              aiMode === 'advisor' && 'bg-purple-500/5 border-purple-500/15',
            )}>
              {aiLoading ? (
                <div className="ai-shimmer rounded-lg p-6 text-center">
                  <Sparkles size={20} className="mx-auto mb-2 text-white/20" />
                  <p className="text-xs text-white/30">AI is thinking...</p>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{aiContent}</p>
                    <button
                      onClick={handleRefreshAI}
                      className="shrink-0 p-1.5 text-white/20 hover:text-white/50 transition-colors"
                      title="Regenerate"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <Sparkles size={10} className="text-white/15" />
                    <span className="text-[10px] text-white/15">AI-generated</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

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
                  {game.thumbnail && (
                    <img src={game.thumbnail} alt={game.name} className="w-12 h-12 object-cover rounded-lg shrink-0" loading="lazy" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-white/90 truncate group-hover:text-purple-400 transition-colors">{game.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {game.platform && <span className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded text-white/40">{game.platform}</span>}
                      {game.genre && <span className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded text-white/40">{game.genre}</span>}
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
                  <Plus size={20} className="text-white/30 group-hover:text-purple-400 transition-colors shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Rivalry Card */}
      {rivalry && (
        <RivalryCard rivalry={rivalry} />
      )}

      {/* Queue List with Journey Path */}
      {queuedGames.length === 0 ? (
        <div className="text-center py-16">
          <Map size={48} className="mx-auto mb-4 text-white/10" />
          <p className="text-white/30 text-sm">Your queue is empty</p>
          <p className="text-white/20 text-xs mt-1">Add games to plan your gaming journey</p>
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
            <div className="journey-path space-y-2">
              {queuedGames.map((game, index) => {
                const isHero = index === 0 && isFirstGameHero;
                const estimatedHours = getEstimatedHoursToReach(queuedGames, index);
                const aiChirp = getChirpForPosition(index);
                const smartChirp = getSmartChirpForPosition(index);
                const isFirstCompleted = index === firstCompletedIndex && firstCompletedIndex > 0;

                return (
                  <div key={game.id}>
                    {/* Victory Lap divider before first completed game */}
                    {isFirstCompleted && (
                      <div className="chirp-enter flex items-center gap-3 py-3 px-2">
                        <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/30 to-transparent" />
                        <span className="text-[10px] font-bold text-emerald-400/60 tracking-widest uppercase">Victory Lap</span>
                        <div className="flex-1 h-px bg-gradient-to-l from-emerald-500/30 to-transparent" />
                      </div>
                    )}

                    {/* Game Card */}
                    <QueueGameCard
                      game={game}
                      position={index + 1}
                      isHero={isHero}
                      estimatedHoursAway={estimatedHours}
                      allGames={allGames}
                      onRemove={() => onRemoveFromQueue(game.id)}
                      onLogTime={onLogTime ? () => onLogTime(game) : undefined}
                    />

                    {/* Smart chirp after card (template-based) */}
                    {smartChirp && index <= 1 && !aiChirp && (
                      <ChirpBubble
                        text={smartChirp.text}
                        subtext={smartChirp.subtext}
                        color={smartChirp.color || '#8b5cf6'}
                        type={smartChirp.type}
                      />
                    )}

                    {/* AI chirp after card */}
                    {aiChirp && (
                      <ChirpBubble
                        text={aiChirp}
                        color="#8b5cf6"
                        type="ai"
                        isAI
                      />
                    )}

                    {/* "On Deck" label between hero and #2 */}
                    {isHero && queuedGames.length > 1 && (
                      <div className="chirp-enter flex items-center gap-3 py-2 px-2">
                        <div className="flex-1 h-px bg-gradient-to-r from-yellow-500/20 to-transparent" />
                        <span className="text-[10px] font-bold text-yellow-400/50 tracking-widest uppercase">On Deck</span>
                        <div className="flex-1 h-px bg-gradient-to-l from-yellow-500/20 to-transparent" />
                      </div>
                    )}

                    {/* Deep backlog divider */}
                    {index === 4 && queuedGames.length > 5 && (
                      <div className="chirp-enter flex items-center gap-3 py-2 px-2">
                        <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                        <span className="text-[10px] font-bold text-white/20 tracking-widest uppercase">The Deep End</span>
                        <div className="flex-1 h-px bg-gradient-to-l from-white/10 to-transparent" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Ghost Card - Add more */}
      {queuedGames.length > 0 && !isAddingGames && (
        <button
          onClick={() => setIsAddingGames(true)}
          className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-white/5 hover:border-purple-500/20 rounded-xl text-white/20 hover:text-purple-400/50 transition-all text-xs"
        >
          <Plus size={14} />
          Add another game to the queue
        </button>
      )}
    </div>
  );
}

// ===== CHIRP BUBBLE COMPONENT =====

function ChirpBubble({ text, subtext, color, type, isAI }: {
  text: string;
  subtext?: string;
  color: string;
  type: string;
  isAI?: boolean;
}) {
  return (
    <div className="chirp-enter flex items-start gap-2 pl-10 pr-4 py-1.5">
      <div
        className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
        style={{ backgroundColor: color }}
      />
      <div className="min-w-0">
        <p className="text-xs text-white/45 leading-relaxed">{text}</p>
        {subtext && (
          <p className="text-[10px] text-white/25 mt-0.5">{subtext}</p>
        )}
        {isAI && (
          <span className="inline-flex items-center gap-0.5 mt-0.5">
            <Sparkles size={8} className="text-white/10" />
            <span className="text-[8px] text-white/10">AI</span>
          </span>
        )}
      </div>
    </div>
  );
}

// ===== RIVALRY CARD COMPONENT =====

function RivalryCard({ rivalry }: { rivalry: RivalryData }) {
  return (
    <div className="p-4 bg-gradient-to-r from-red-500/5 via-white/[0.02] to-blue-500/5 border border-white/5 rounded-xl">
      <div className="text-[10px] font-bold text-white/30 tracking-widest uppercase mb-3 text-center">
        Battle for Your Attention
      </div>

      <div className="flex items-center gap-3">
        {/* Game 1 */}
        <div className="flex-1 text-center">
          {rivalry.game1.thumbnail && (
            <img src={rivalry.game1.thumbnail} alt={rivalry.game1.name} className="w-12 h-12 object-cover rounded-lg mx-auto mb-2" loading="lazy" />
          )}
          <p className="text-xs font-medium text-white/80 truncate">{rivalry.game1.name}</p>
          <p className="text-[10px] text-white/40">{rivalry.game1.hours}h · {rivalry.game1.sessions} sessions</p>
          <p className={clsx(
            'text-[10px] font-medium mt-1',
            rivalry.winnerName === rivalry.game1.name ? 'text-emerald-400' : 'text-red-400/60'
          )}>
            {rivalry.winnerName === rivalry.game1.name ? 'WINNING' : `${rivalry.game1.daysSinceLastPlay}d ago`}
          </p>
        </div>

        {/* VS */}
        <div className="vs-flash flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 shrink-0">
          <Swords size={18} className="text-white/40" />
        </div>

        {/* Game 2 */}
        <div className="flex-1 text-center">
          {rivalry.game2.thumbnail && (
            <img src={rivalry.game2.thumbnail} alt={rivalry.game2.name} className="w-12 h-12 object-cover rounded-lg mx-auto mb-2" loading="lazy" />
          )}
          <p className="text-xs font-medium text-white/80 truncate">{rivalry.game2.name}</p>
          <p className="text-[10px] text-white/40">{rivalry.game2.hours}h · {rivalry.game2.sessions} sessions</p>
          <p className={clsx(
            'text-[10px] font-medium mt-1',
            rivalry.winnerName === rivalry.game2.name ? 'text-emerald-400' : 'text-red-400/60'
          )}>
            {rivalry.winnerName === rivalry.game2.name ? 'WINNING' : `${rivalry.game2.daysSinceLastPlay}d ago`}
          </p>
        </div>
      </div>

      {/* Insight */}
      <p className="text-xs text-white/30 text-center mt-3 italic">{rivalry.insight}</p>
    </div>
  );
}
