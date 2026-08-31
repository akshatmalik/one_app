'use client';

import { motion } from 'framer-motion';
import { Heart, Star } from 'lucide-react';
import { Game } from '../../lib/types';
import { getEffectiveLoveLevel, getLoveMeta } from '../../lib/love';

export function MostLovedScreen({ games, periodLabel }: { games: Game[]; periodLabel: string }) {
  const loved = games
    .map(game => ({ game, love: getEffectiveLoveLevel(game) }))
    .filter((entry): entry is { game: Game; love: 3 | 4 } => !!entry.love && entry.love >= 3)
    .sort((a, b) => b.love - a.love || b.game.rating - a.game.rating)
    .slice(0, 3);
  if (loved.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-lg text-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold uppercase tracking-widest text-rose-300/60">Most Loved · {periodLabel}</motion.div>
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: 'spring' }} className="my-5 text-6xl">💗</motion.div>
      <h1 className="text-3xl font-black text-white">The games that became yours</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-white/35">Not a second quality ranking. These are the ones you felt attached to.</p>

      <div className="mt-7 space-y-3 text-left">
        {loved.map(({ game, love }, index) => (
          <motion.div key={game.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + index * 0.15 }} className="flex items-center gap-3 rounded-2xl border border-rose-300/10 bg-rose-500/[0.06] p-3">
            {game.thumbnail ? <img src={game.thumbnail} alt="" className="h-16 w-16 rounded-xl object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-rose-500/10"><Heart className="text-rose-300" /></div>}
            <div className="min-w-0 flex-1"><div className="truncate text-base font-bold text-white/85">{game.name}</div><div className="mt-1 flex items-center gap-3 text-xs"><span className="flex items-center gap-1 text-amber-200/60"><Star size={11} /> {game.rating}/10</span><span className="flex items-center gap-1 font-semibold text-rose-200"><Heart size={11} className="fill-rose-400 text-rose-400" /> {getLoveMeta(love)?.label}</span></div></div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
