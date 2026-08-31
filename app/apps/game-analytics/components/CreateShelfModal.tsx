'use client';

import { useMemo, useState } from 'react';
import { Check, Layers3, Sparkles, X } from 'lucide-react';
import clsx from 'clsx';
import { Game } from '../lib/types';
import { inferShelfFromSelection } from '../lib/game-shelves';
import { CreateShelfInput } from '../hooks/useGameShelves';

interface CreateShelfModalProps {
  games: Game[];
  onCreate: (input: CreateShelfInput) => void;
  onClose: () => void;
}

export function CreateShelfModal({ games, onCreate, onClose }: CreateShelfModalProps) {
  const suggestion = useMemo(() => inferShelfFromSelection(games), [games]);
  const [name, setName] = useState(suggestion.name);
  const [description, setDescription] = useState(suggestion.description);
  const [mode, setMode] = useState<'static' | 'smart'>(suggestion.rules ? 'smart' : 'static');

  const submit = () => {
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      description: description.trim(),
      mode,
      gameIds: games.map(game => game.id),
      rules: mode === 'smart' ? suggestion.rules : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="create-shelf-title">
      <button className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} aria-label="Close shelf creator" />
      <section className="relative w-full rounded-t-3xl border border-white/10 bg-[#101018] p-4 pb-7 sm:max-w-md sm:rounded-3xl sm:p-5">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/12 text-purple-300"><Layers3 size={18} /></div>
            <div>
              <h2 id="create-shelf-title" className="text-base font-semibold text-white">Build a shelf</h2>
              <p className="text-xs text-white/35">{games.length} selected game{games.length === 1 ? '' : 's'}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl text-white/40 hover:bg-white/5" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="mb-4 flex -space-x-3 overflow-hidden pl-1">
          {games.slice(0, 6).map(game => (
            game.thumbnail
              ? <img key={game.id} src={game.thumbnail} alt="" className="h-14 w-11 rounded-lg border-2 border-[#101018] object-cover" />
              : <div key={game.id} className="flex h-14 w-11 items-center justify-center rounded-lg border-2 border-[#101018] bg-purple-500/15 text-xs text-purple-200">{game.name.slice(0, 1)}</div>
          ))}
        </div>

        <label className="mb-1.5 block text-[11px] font-medium text-white/45">Shelf name</label>
        <input value={name} onChange={event => setName(event.target.value)} maxLength={48} className="min-h-12 w-full rounded-xl border border-white/10 bg-white/[0.035] px-3 text-sm text-white outline-none focus:border-purple-400/35" />

        <label className="mb-1.5 mt-3 block text-[11px] font-medium text-white/45">Description</label>
        <textarea value={description} onChange={event => setDescription(event.target.value)} rows={2} className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5 text-sm text-white outline-none focus:border-purple-400/35" />

        <div className="mt-4 grid grid-cols-2 gap-2">
          {([
            { id: 'smart', title: 'Smart', body: 'Updates from the inferred rule', icon: Sparkles },
            { id: 'static', title: 'Hand-picked', body: 'Keeps exactly this selection', icon: Check },
          ] as const).map(option => (
            <button key={option.id} onClick={() => setMode(option.id)} disabled={option.id === 'smart' && !suggestion.rules} className={clsx(
              'rounded-xl border p-3 text-left disabled:opacity-30',
              mode === option.id ? 'border-purple-400/25 bg-purple-500/10' : 'border-white/[0.06] bg-white/[0.02]',
            )}>
              <option.icon size={14} className={mode === option.id ? 'text-purple-300' : 'text-white/30'} />
              <div className="mt-1.5 text-xs font-semibold text-white/75">{option.title}</div>
              <div className="mt-0.5 text-[10px] leading-relaxed text-white/30">{option.body}</div>
            </button>
          ))}
        </div>

        <button onClick={submit} disabled={!name.trim()} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 text-sm font-semibold text-white disabled:opacity-40">
          <Layers3 size={16} /> Create Shelf
        </button>
      </section>
    </div>
  );
}

