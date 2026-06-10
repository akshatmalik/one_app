'use client';

import { Check, X, AlertTriangle, Loader2, ShoppingCart, Heart, Layers } from 'lucide-react';
import clsx from 'clsx';
import { Game } from '../lib/types';
import {
  PendingAction,
  InterestedDestination,
  summarizeAction,
  validateAction,
  isDestructive,
} from '../lib/ai-actions';

interface AIActionCardProps {
  actions: PendingAction[];
  games: Game[];
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onChange: (actions: PendingAction[]) => void;
}

const DEST_OPTIONS: { value: InterestedDestination; label: string; icon: typeof ShoppingCart }[] = [
  { value: 'queue', label: 'Queue', icon: ShoppingCart },
  { value: 'wishlist', label: 'Wishlist', icon: Heart },
  { value: 'both', label: 'Both', icon: Layers },
];

export function AIActionCard({ actions, games, isLoading, onConfirm, onCancel, onChange }: AIActionCardProps) {
  if (actions.length === 0) return null;

  const hasDestructive = actions.some(a => isDestructive(a.kind));

  // Remove a whole action from the batch.
  const removeAction = (index: number) => {
    onChange(actions.filter((_, i) => i !== index));
  };

  // Edit one game within an addGames action.
  const setGameDestination = (actionIndex: number, gameIndex: number, dest: InterestedDestination) => {
    onChange(actions.map((a, i) => {
      if (i !== actionIndex || a.kind !== 'addGames') return a;
      return {
        ...a,
        args: { games: a.args.games.map((g, gi) => (gi === gameIndex ? { ...g, destination: dest } : g)) },
      };
    }));
  };

  const removeGame = (actionIndex: number, gameIndex: number) => {
    const next = actions
      .map((a, i) => {
        if (i !== actionIndex || a.kind !== 'addGames') return a;
        return { ...a, args: { games: a.args.games.filter((_, gi) => gi !== gameIndex) } };
      })
      // Drop the action entirely if it has no games left.
      .filter(a => !(a.kind === 'addGames' && a.args.games.length === 0));
    onChange(next);
  };

  return (
    <div className="flex justify-start">
      <div
        className={clsx(
          'max-w-[92%] w-full rounded-2xl border p-4',
          hasDestructive ? 'border-red-500/30 bg-red-500/5' : 'border-purple-500/30 bg-purple-500/5',
        )}
      >
        <div className="flex items-center gap-2 mb-3">
          {hasDestructive ? (
            <AlertTriangle size={16} className="text-red-400" />
          ) : (
            <Check size={16} className="text-purple-400" />
          )}
          <span className={clsx('text-xs font-semibold', hasDestructive ? 'text-red-300' : 'text-purple-300')}>
            {hasDestructive ? 'Confirm — this is permanent' : 'Confirm these changes'}
          </span>
        </div>

        <div className="space-y-2">
          {actions.map((action, ai) => (
            <div
              key={ai}
              className={clsx(
                'rounded-lg px-3 py-2.5 text-sm',
                isDestructive(action.kind) ? 'bg-red-500/10 text-red-100' : 'bg-white/5 text-white/90',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="leading-snug">{summarizeAction(action, games)}</span>
                {actions.length > 1 && (
                  <button
                    onClick={() => removeAction(ai)}
                    disabled={isLoading}
                    className="text-white/30 hover:text-white/70 shrink-0"
                    aria-label="Remove this action"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Non-blocking warnings: duplicates, out-of-range values, missing refs */}
              {validateAction(action, games).map((warning, wi) => (
                <div key={wi} className="flex items-start gap-1.5 mt-1.5 text-[11px] text-amber-300/90">
                  <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                  <span className="leading-snug">{warning}</span>
                </div>
              ))}

              {/* Per-game destination editing for the interested-games batch */}
              {action.kind === 'addGames' && (
                <div className="mt-2 space-y-1.5">
                  {action.args.games.map((g, gi) => (
                    <div key={gi} className="flex items-center gap-2 flex-wrap bg-black/20 rounded-md px-2 py-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-white/90 truncate">{g.name}</p>
                        <p className="text-[10px] text-white/40">
                          {g.releaseDate ? `Releases ${g.releaseDate}` : 'Release date: TBA'}
                          {g.metacritic ? ` · MC ${g.metacritic}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 bg-black/30 rounded-md p-0.5">
                        {DEST_OPTIONS.map(opt => {
                          const Icon = opt.icon;
                          const active = g.destination === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => setGameDestination(ai, gi, opt.value)}
                              disabled={isLoading}
                              className={clsx(
                                'flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-medium transition-colors',
                                active ? 'bg-purple-600 text-white' : 'text-white/50 hover:text-white/80',
                              )}
                            >
                              <Icon size={11} />
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => removeGame(ai, gi)}
                        disabled={isLoading}
                        className="text-white/30 hover:text-white/70 shrink-0"
                        aria-label="Remove this game"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={onConfirm}
            disabled={isLoading || actions.length === 0}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50',
              hasDestructive
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white',
            )}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {hasDestructive ? 'Yes, do it' : 'Confirm'}
          </button>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/10 text-white/70 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
