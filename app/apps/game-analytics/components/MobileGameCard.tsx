'use client';

import { ArrowRight, Clock3, Play, Plus, Star } from 'lucide-react';
import clsx from 'clsx';
import { Game } from '../lib/types';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { getGameSmartOneLiner, getRelationshipStatus, getTotalHours, parseLocalDate } from '../lib/calculations';
import { LoveBadge } from './LovePicker';

interface MobileGameCardProps {
  game: GameWithMetrics;
  allGames: Game[];
  onOpen: () => void;
  onLogTime: () => void;
  onStart?: () => void;
  active?: boolean;
}

export function MobileGameCard({ game, allGames, onOpen, onLogTime, onStart, active = false }: MobileGameCardProps) {
  const relationship = getRelationshipStatus(game, allGames);
  const hours = getTotalHours(game);
  const storyLine = getGameSmartOneLiner(game, allGames);
  const releaseDays = game.releaseDate
    ? Math.ceil((parseLocalDate(game.releaseDate).getTime() - Date.now()) / 86_400_000)
    : null;
  const canLog = game.status !== 'Wishlist' && game.status !== 'Not Started';
  const canStart = game.status === 'Not Started' && onStart;

  return (
    <article className={clsx('overflow-hidden rounded-3xl border bg-[#111118]', active ? 'border-purple-300/20 shadow-lg shadow-purple-950/20' : 'border-white/[0.08]')}>
      <button onClick={onOpen} className="block w-full text-left">
        <div className="relative h-44 overflow-hidden">
          {game.thumbnail ? (
            <img src={game.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-purple-950 to-blue-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/20 to-[#0d0d14]" />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
            <span className="rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[10px] font-bold backdrop-blur-md" style={{ color: relationship.color }}>{relationship.label}</span>
            <div className="flex items-center gap-1.5">
              {game.acquiredFree && game.subscriptionSource === 'PS Plus' && <span className="rounded-full border border-blue-300/15 bg-blue-500/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-blue-100 backdrop-blur-md">PS Plus</span>}
              <LoveBadge game={game} className="border border-pink-300/15 bg-black/45 backdrop-blur-md" />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">{active ? 'Now playing' : game.status}</p>
            <h3 className="mt-1 line-clamp-2 text-xl font-black leading-tight text-white">{game.name}</h3>
            {storyLine && <p className="mt-1.5 line-clamp-1 text-xs text-white/55">{storyLine}</p>}
          </div>
        </div>
      </button>

      <div className="p-4">
        <div className="flex items-center gap-4 text-xs text-white/50">
          {hours > 0 && <span className="flex items-center gap-1.5"><Clock3 size={13} className="text-blue-300" />{hours.toFixed(hours % 1 ? 1 : 0)}h</span>}
          {game.rating > 0 && <span className="flex items-center gap-1.5"><Star size={13} className="text-amber-300" fill="currentColor" />{game.rating}/10</span>}
          {releaseDays !== null && game.status === 'Wishlist' && releaseDays >= 0 && <span className="text-blue-300">{releaseDays === 0 ? 'Out today' : `${releaseDays}d to release`}</span>}
          {game.platform && <span className="ml-auto rounded-full bg-white/[0.05] px-2 py-1 text-[10px] text-white/35">{game.platform}</span>}
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          {canLog ? (
            <button onClick={onLogTime} className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white text-xs font-bold text-black"><Plus size={15} /> Log time</button>
          ) : canStart ? (
            <button onClick={onStart} className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white text-xs font-bold text-black"><Play size={15} fill="currentColor" /> Start this game</button>
          ) : (
            <button onClick={onOpen} className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white text-xs font-bold text-black">Open game</button>
          )}
          <button onClick={onOpen} aria-label={`Open ${game.name}`} className="flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-white/45"><ArrowRight size={16} /></button>
        </div>
      </div>
    </article>
  );
}
