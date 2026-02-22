'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, ChevronDown, ChevronUp, Gamepad2 } from 'lucide-react';
import { getGameGraveyardData, GameEulogyData } from '../lib/calculations';
import { Game } from '../lib/types';
import clsx from 'clsx';

interface GameGraveyardProps {
  games: Game[];
}

const VOICE_STYLES: Record<string, { label: string; color: string; icon: string }> = {
  tragic:   { label: 'Tragic', color: 'text-red-400',    icon: '😢' },
  peaceful: { label: 'Peaceful', color: 'text-blue-400',  icon: '😌' },
  dramatic: { label: 'Dramatic', color: 'text-purple-400', icon: '😤' },
  comic:    { label: 'Comic',   color: 'text-yellow-400', icon: '😄' },
  epic:     { label: 'Epic',    color: 'text-orange-400', icon: '⚔️' },
};

function TombstoneCard({ game, eulogy, expanded, onToggle }: {
  game: Game;
  eulogy: GameEulogyData;
  expanded: boolean;
  onToggle: () => void;
}) {
  const voice = VOICE_STYLES[eulogy.voice] ?? VOICE_STYLES.peaceful;

  return (
    <motion.div
      layout
      className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        {game.thumbnail ? (
          <img
            src={game.thumbnail}
            alt={game.name}
            className="w-10 h-10 rounded-xl object-cover grayscale opacity-50 shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-white/5 shrink-0 flex items-center justify-center">
            <Gamepad2 size={14} className="text-white/15" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white/70 truncate">{game.name}</span>
            <span className="text-xs" title={voice.label}>{voice.icon}</span>
          </div>
          <div className="text-[10px] text-white/30 mt-0.5">
            {eulogy.stats.totalHours.toFixed(1)}h played ·{' '}
            {eulogy.stats.price > 0 ? `$${eulogy.stats.price}` : 'Free'} ·{' '}
            {eulogy.stats.rating > 0 ? `${eulogy.stats.rating}/10` : 'Unrated'}
          </div>
        </div>
        <div className="text-white/20 shrink-0">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Eulogy text */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4 space-y-3"
          >
            <div className="h-px bg-white/5" />
            <p className="text-xs text-white/50 leading-relaxed italic">{eulogy.text}</p>
            {/* Epitaph */}
            <div className="p-2 bg-black/20 rounded-lg border border-white/5 text-center">
              <p className="text-[10px] text-white/25 font-mono">{eulogy.epitaph}</p>
            </div>
            {eulogy.replacedBy && (
              <p className="text-[10px] text-white/20 text-center">
                Replaced by: <span className="text-white/40">{eulogy.replacedBy}</span>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function GameGraveyard({ games }: GameGraveyardProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const graveyardData = useMemo(() => getGameGraveyardData(games), [games]);

  if (graveyardData.length === 0) return null;

  const totalLost = graveyardData.reduce((s, x) => s + x.eulogy.stats.price, 0);
  const totalHoursLost = graveyardData.reduce((s, x) => s + x.eulogy.stats.totalHours, 0);

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.015] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <Skull size={14} className="text-white/30 shrink-0" />
        <div className="flex-1 flex items-center gap-3">
          <span className="text-sm font-semibold text-white/60">Game Graveyard</span>
          <span className="text-xs text-white/25">
            {graveyardData.length} game{graveyardData.length !== 1 ? 's' : ''} laid to rest
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-white/20 mr-2">
          {totalLost > 0 && <span>${totalLost.toFixed(0)} invested</span>}
          {totalHoursLost > 0 && <span>{totalHoursLost.toFixed(0)}h played</span>}
        </div>
        {expanded ? <ChevronUp size={14} className="text-white/20" /> : <ChevronDown size={14} className="text-white/20" />}
      </button>

      {/* Tombstones */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-3 pb-3 space-y-2"
          >
            {/* Graveyard stats */}
            <div className="grid grid-cols-3 gap-2 px-1 py-2 text-center text-[10px] text-white/25">
              <div>
                <div className="text-white/50 font-bold text-sm">{graveyardData.length}</div>
                <div>abandoned</div>
              </div>
              <div>
                <div className="text-white/50 font-bold text-sm">{totalHoursLost.toFixed(0)}h</div>
                <div>total played</div>
              </div>
              <div>
                <div className="text-white/50 font-bold text-sm">${totalLost.toFixed(0)}</div>
                <div>invested</div>
              </div>
            </div>

            <div className="h-px bg-white/5" />

            {graveyardData.map(({ game, eulogy }) => (
              <TombstoneCard
                key={game.id}
                game={game}
                eulogy={eulogy}
                expanded={expandedCards.has(game.id)}
                onToggle={() => toggleCard(game.id)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
