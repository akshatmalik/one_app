'use client';

import { Layers3, Sparkles, Trash2, X } from 'lucide-react';
import clsx from 'clsx';
import { Game } from '../lib/types';
import { GameShelf, getShelfGames } from '../lib/game-shelves';

interface GameShelfRailProps {
  shelves: GameShelf[];
  games: Game[];
  activeShelfId: string | null;
  onSelect: (shelfId: string | null) => void;
  onDelete: (shelfId: string) => void;
}

export function GameShelfRail({ shelves, games, activeShelfId, onSelect, onDelete }: GameShelfRailProps) {
  if (shelves.length === 0) return null;
  return (
    <section className="mb-5">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers3 size={14} className="text-purple-300" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">Your Shelves</h2>
        </div>
        {activeShelfId && <button onClick={() => onSelect(null)} className="flex min-h-9 items-center gap-1 rounded-lg px-2 text-[11px] text-white/40"><X size={12} /> Show all</button>}
      </div>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {shelves.map(shelf => {
          const shelfGames = getShelfGames(shelf, games);
          const covers = shelfGames.filter(game => game.thumbnail).slice(0, 3);
          return (
            <article key={shelf.id} className={clsx(
              'relative min-w-[76vw] snap-start overflow-hidden rounded-2xl border sm:min-w-[280px]',
              activeShelfId === shelf.id ? 'border-purple-400/35 bg-purple-500/[0.08]' : 'border-white/[0.07] bg-white/[0.025]',
            )}>
              <button onClick={() => onSelect(activeShelfId === shelf.id ? null : shelf.id)} className="block w-full text-left">
                <div className="relative h-24 overflow-hidden bg-gradient-to-br from-purple-950/80 to-blue-950/60">
                  {covers.length > 0 && <div className="grid h-full grid-cols-3">
                    {covers.map(game => <img key={game.id} src={game.thumbnail} alt="" className="h-full w-full object-cover opacity-65" />)}
                  </div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111118] via-[#111118]/20 to-transparent" />
                  <span className="absolute bottom-2 left-3 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[9px] font-medium text-white/60 backdrop-blur-sm">
                    {shelf.mode === 'smart' && <Sparkles size={9} className="text-purple-300" />} {shelf.isSystem ? 'Automatic' : shelf.mode === 'smart' ? 'Smart shelf' : 'Hand-picked'}
                  </span>
                </div>
                <div className="p-3.5 pr-11">
                  <h3 className="truncate text-sm font-semibold text-white/85">{shelf.name}</h3>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/35">{shelf.description}</p>
                  <p className="mt-2 text-[10px] font-medium text-purple-300/65">{shelfGames.length} game{shelfGames.length === 1 ? '' : 's'}</p>
                </div>
              </button>
              {!shelf.isSystem && <button onClick={() => onDelete(shelf.id)} className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-white/25 hover:bg-red-500/10 hover:text-red-300" aria-label={`Delete ${shelf.name}`}><Trash2 size={13} /></button>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
