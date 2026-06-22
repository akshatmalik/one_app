'use client';

import { useMemo, useState } from 'react';
import { X, PiggyBank, ArrowUp, ArrowDown, Gamepad2, Wallet, CalendarCheck } from 'lucide-react';
import clsx from 'clsx';
import { Game } from '../lib/types';
import { getWishlistAffordabilityPlan, WishlistAffordabilityItem } from '../lib/calculations';
import { formatCurrency } from '../lib/format';

interface WishlistPlannerModalProps {
  wishlistGames: Game[];
  annualBudget: number | null;
  yearSpent: number;
  onReorder: (orderedIds: string[]) => void;
  onSetBudget: (amount: number) => void;
  onOpenGame: (gameId: string) => void;
  onClose: () => void;
}

function monthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function AffordabilityBadge({ item }: { item: WishlistAffordabilityItem }) {
  if (item.affordableDate === null || item.monthsFromNow === null) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/30 font-medium whitespace-nowrap">
        Beyond 3yr horizon
      </span>
    );
  }
  const tone =
    item.monthsFromNow <= 1
      ? 'bg-emerald-500/15 text-emerald-300'
      : item.monthsFromNow <= 3
      ? 'bg-amber-500/15 text-amber-300'
      : 'bg-white/8 text-white/50';
  const label = item.monthsFromNow === 0 ? 'Affordable now' : `Affordable ${monthYear(item.affordableDate)}`;
  return (
    <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap', tone)}>{label}</span>
  );
}

function WishlistRow({
  item,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onOpenGame,
}: {
  item: WishlistAffordabilityItem;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onOpenGame: (gameId: string) => void;
}) {
  const { game } = item;
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="flex flex-col gap-0.5 shrink-0">
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="p-0.5 rounded text-white/30 hover:text-white/70 disabled:opacity-20 disabled:hover:text-white/30 transition-colors"
          aria-label="Move up in priority"
        >
          <ArrowUp size={13} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="p-0.5 rounded text-white/30 hover:text-white/70 disabled:opacity-20 disabled:hover:text-white/30 transition-colors"
          aria-label="Move down in priority"
        >
          <ArrowDown size={13} />
        </button>
      </div>

      <button onClick={() => onOpenGame(game.id)} className="shrink-0">
        {game.thumbnail ? (
          <img src={game.thumbnail} alt={game.name} className="w-12 h-12 object-cover rounded-lg" loading="lazy" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
            <Gamepad2 size={18} className="text-white/20" />
          </div>
        )}
      </button>

      <button onClick={() => onOpenGame(game.id)} className="flex-1 min-w-0 text-left">
        <div className="text-[13px] text-white/85 font-medium truncate">{game.name}</div>
        <div className="text-[11px] text-white/35 mt-0.5">
          {formatCurrency(item.price)} · running total {formatCurrency(item.cumulativeCost)}
        </div>
      </button>

      <AffordabilityBadge item={item} />
    </div>
  );
}

export function WishlistPlannerModal({
  wishlistGames,
  annualBudget,
  yearSpent,
  onReorder,
  onSetBudget,
  onOpenGame,
  onClose,
}: WishlistPlannerModalProps) {
  const [budgetInput, setBudgetInput] = useState('');

  const plan = useMemo(
    () => getWishlistAffordabilityPlan(wishlistGames, annualBudget, yearSpent),
    [wishlistGames, annualBudget, yearSpent]
  );

  const move = (index: number, direction: -1 | 1) => {
    const next = [...wishlistGames];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onReorder(next.map(g => g.id));
  };

  const submitBudget = () => {
    const amount = parseFloat(budgetInput);
    if (Number.isFinite(amount) && amount > 0) {
      onSetBudget(amount);
      setBudgetInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <PiggyBank size={18} className="text-emerald-400" />
            <h3 className="text-lg font-bold text-white/90">Wishlist Planner</h3>
          </div>
          <button onClick={onClose} className="p-1 text-white/30 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {wishlistGames.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <PiggyBank size={28} className="text-white/15" />
              <div className="text-[13px] text-white/40">Your wishlist is empty</div>
              <div className="text-[11px] text-white/25 max-w-xs">
                Add games to your wishlist and come back here to see exactly when you can afford each one.
              </div>
            </div>
          ) : !plan.hasBudget ? (
            <div className="space-y-3 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20">
              <div className="flex items-start gap-2">
                <Wallet size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[12px] text-emerald-100/80 leading-relaxed">
                  Set a yearly budget to see when you&apos;ll be able to afford each game on your wishlist, in the
                  order you choose below.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  value={budgetInput}
                  onChange={e => setBudgetInput(e.target.value)}
                  placeholder="e.g. 600"
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/90 text-[13px] placeholder:text-white/25 focus:outline-none focus:border-emerald-500/40"
                />
                <button
                  onClick={submitBudget}
                  className="px-4 py-2 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white text-[12px] font-medium transition-colors"
                >
                  Set budget
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="text-[10px] uppercase tracking-wide text-white/30 font-semibold">Saving pace</div>
                <div className="text-[15px] text-white/85 font-bold mt-0.5">
                  {formatCurrency(plan.monthlyPaceThisYear)}/mo
                </div>
                <div className="text-[10px] text-white/30 mt-0.5">left this year</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="text-[10px] uppercase tracking-wide text-white/30 font-semibold">Wishlist value</div>
                <div className="text-[15px] text-white/85 font-bold mt-0.5">{formatCurrency(plan.totalWishlistValue)}</div>
                <div className="text-[10px] text-white/30 mt-0.5">{wishlistGames.length} game{wishlistGames.length === 1 ? '' : 's'}</div>
              </div>
              {plan.nextAffordable && (
                <div className="col-span-2 flex items-center gap-2 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20">
                  <CalendarCheck size={14} className="text-emerald-400 shrink-0" />
                  <div className="text-[12px] text-emerald-100/80">
                    Next up: <span className="text-white/90 font-medium">{plan.nextAffordable.game.name}</span>{' '}
                    {plan.nextAffordable.monthsFromNow === 0
                      ? 'is affordable right now'
                      : `becomes affordable ${monthYear(plan.nextAffordable.affordableDate as Date)}`}
                    {plan.fullyAffordableDate && (
                      <> — whole list cleared by {monthYear(plan.fullyAffordableDate)}</>
                    )}
                    .
                  </div>
                </div>
              )}
            </div>
          )}

          {wishlistGames.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wide text-white/30 font-semibold px-0.5">
                Priority order — reorder to change what you save up for first
              </div>
              {plan.items.map((item, index) => (
                <WishlistRow
                  key={item.game.id}
                  item={item}
                  index={index}
                  total={plan.items.length}
                  onMoveUp={() => move(index, -1)}
                  onMoveDown={() => move(index, 1)}
                  onOpenGame={onOpenGame}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
