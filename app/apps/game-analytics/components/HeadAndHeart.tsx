'use client';

import { Heart, Sparkles, Star } from 'lucide-react';
import { Game } from '../lib/types';
import { getEffectiveLoveLevel, getLoveMeta } from '../lib/love';

export function HeadAndHeart({ games }: { games: Game[] }) {
  const answered = games
    .map(game => ({ game, love: getEffectiveLoveLevel(game) }))
    .filter((entry): entry is { game: Game; love: 1 | 2 | 3 | 4 } => !!entry.love);
  if (answered.length === 0) return null;

  const loved = answered.filter(entry => entry.love >= 3).sort((a, b) => b.love - a.love || b.game.rating - a.game.rating).slice(0, 3);
  const flawedFavorite = answered
    .filter(entry => entry.love >= 3 && entry.game.rating > 0 && entry.game.rating < 8.5)
    .sort((a, b) => b.love - a.love || b.game.rating - a.game.rating)[0];
  const admired = answered
    .filter(entry => entry.love <= 2 && entry.game.rating >= 8.5)
    .sort((a, b) => b.game.rating - a.game.rating)[0];

  return (
    <section className="overflow-hidden rounded-2xl border border-rose-400/12 bg-gradient-to-br from-rose-500/[0.07] via-white/[0.02] to-amber-500/[0.04] p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-300/60"><Sparkles size={11} /> Head vs Heart</div>
          <h3 className="mt-1 text-base font-bold text-white/85">Good is not the same as loved</h3>
          <p className="mt-1 text-xs text-white/35">Rating remembers quality. Love remembers what became yours.</p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-white/8 bg-black/15 px-2 py-1 text-[10px] text-white/35"><Star size={10} className="text-amber-300" /> × <Heart size={10} className="fill-rose-400 text-rose-400" /></div>
      </div>

      {loved.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {loved.map(({ game, love }) => (
            <div key={game.id} className="flex min-w-[72%] items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 sm:min-w-0 sm:flex-1">
              {game.thumbnail ? <img src={game.thumbnail} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <div className="h-12 w-12 rounded-lg bg-rose-500/10" />}
              <div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold text-white/75">{game.name}</div><div className="mt-1 flex items-center gap-2 text-[10px]"><span className="text-amber-200/60">{game.rating}/10</span><span className="text-rose-200/70">♥ {getLoveMeta(love)?.shortLabel}</span></div></div>
            </div>
          ))}
        </div>
      )}

      {(flawedFavorite || admired) && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {flawedFavorite && <Insight label="Flawed favorite" game={flawedFavorite.game} copy="Your heart outranked your score." />}
          {admired && <Insight label="Admired from a distance" game={admired.game} copy="A strong game that never became personal." />}
        </div>
      )}
    </section>
  );
}

function Insight({ label, game, copy }: { label: string; game: Game; copy: string }) {
  return <div className="rounded-xl bg-black/15 p-3"><div className="text-[9px] font-bold uppercase tracking-wider text-white/30">{label}</div><div className="mt-1 text-xs font-semibold text-white/70">{game.name}</div><div className="mt-0.5 text-[10px] text-white/30">{copy}</div></div>;
}
