'use client';

import { useState, useMemo } from 'react';
import { Plus, ShoppingCart, Calendar, TrendingDown, Clock, PackageCheck, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';
import { Game } from '../lib/types';
import { usePurchaseQueue } from '../hooks/usePurchaseQueue';
import { AddToBuyQueueModal } from './AddToBuyQueueModal';
import { BuyQueueCard } from './BuyQueueCard';

interface Props {
  userId: string | null;
  wishlistGames: Game[];
}

function formatMoney(n: number): string {
  return `$${n.toFixed(0)}`;
}

export function BuyQueueTab({ userId, wishlistGames }: Props) {
  const {
    activeEntries,
    upcomingEntries,
    availableEntries,
    purchasedEntries,
    loading,
    plannedSpend,
    releasingSoon,
    addEntry,
    updateEntry,
    deleteEntry,
    markPurchased,
  } = usePurchaseQueue(userId);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showPurchased, setShowPurchased] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Stats
  const stats = useMemo(() => {
    const dayOneBuys = activeEntries.filter(e => e.isDayOneBuy).length;
    const priceWatchers = activeEntries.filter(e => !e.isDayOneBuy && e.targetPrice).length;
    const atTarget = activeEntries.filter(e =>
      e.currentPrice != null && e.targetPrice != null && e.currentPrice <= e.targetPrice
    ).length;
    const totalSavingsPotential = activeEntries.reduce((sum, e) => {
      if (!e.msrpEstimate || !e.targetPrice) return sum;
      return sum + Math.max(0, e.msrpEstimate - e.targetPrice);
    }, 0);
    const genreBreakdown = activeEntries.reduce<Record<string, number>>((acc, e) => {
      if (e.genre) acc[e.genre] = (acc[e.genre] || 0) + 1;
      return acc;
    }, {});
    const topGenre = Object.entries(genreBreakdown).sort((a, b) => b[1] - a[1])[0];
    const platformBreakdown = activeEntries.reduce<Record<string, number>>((acc, e) => {
      if (e.platform) acc[e.platform] = (acc[e.platform] || 0) + 1;
      return acc;
    }, {});
    const avgWait = activeEntries.filter(e => e.releaseDate && new Date(e.releaseDate) > new Date()).length;

    return { dayOneBuys, priceWatchers, atTarget, totalSavingsPotential, topGenre, platformBreakdown, avgWait };
  }, [activeEntries]);

  const wishlistForModal = wishlistGames.map(g => ({
    name: g.name,
    platform: g.platform,
    genre: g.genre,
    thumbnail: g.thumbnail,
  }));

  const handleDelete = (id: string) => {
    if (window.confirm('Remove this game from your buy queue?')) {
      deleteEntry(id);
    }
  };

  const handleMarkPurchased = async (id: string, price?: number) => {
    await markPurchased(id, price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-white/30 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-emerald-400" />
            <span className="text-white/70 text-sm">
              <span className="text-white font-medium">{activeEntries.length}</span> game{activeEntries.length !== 1 ? 's' : ''} in queue
            </span>
          </div>
          {releasingSoon > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-purple-400">
              <Calendar size={12} />
              <span>{releasingSoon} releasing in 90 days</span>
            </div>
          )}
          {plannedSpend > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <TrendingDown size={12} />
              <span>~{formatMoney(plannedSpend)} planned</span>
            </div>
          )}
          {stats.atTarget > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {stats.atTarget} at target price
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStats(!showStats)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white/60 text-xs transition-all"
          >
            <BarChart2 size={13} />
            Stats
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all"
          >
            <Plus size={14} />
            Add Game
          </button>
        </div>
      </div>

      {/* Stats panel */}
      {showStats && activeEntries.length > 0 && (
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-4">
          <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Buy Queue Stats</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-lg font-semibold text-white/90">{activeEntries.length}</div>
              <div className="text-[11px] text-white/30">Total watching</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-amber-400">{stats.dayOneBuys}</div>
              <div className="text-[11px] text-white/30">Day 1 buys</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-white/90">{formatMoney(plannedSpend)}</div>
              <div className="text-[11px] text-white/30">Planned spend</div>
            </div>
            {stats.totalSavingsPotential > 0 && (
              <div>
                <div className="text-lg font-semibold text-emerald-400">{formatMoney(stats.totalSavingsPotential)}</div>
                <div className="text-[11px] text-white/30">Potential savings</div>
              </div>
            )}
          </div>

          {/* Genre breakdown */}
          {Object.keys(stats.platformBreakdown).length > 0 && (
            <div>
              <div className="text-[11px] text-white/30 mb-2">By platform</div>
              <div className="flex items-center gap-2 flex-wrap">
                {Object.entries(stats.platformBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([plat, count]) => (
                    <div key={plat} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 text-xs">
                      <span className="text-white/60">{plat}</span>
                      <span className="text-white/30">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Purchased history */}
          {purchasedEntries.length > 0 && (
            <div className="pt-2 border-t border-white/5">
              <div className="flex items-center gap-1.5 text-[11px] text-white/30">
                <PackageCheck size={11} />
                {purchasedEntries.length} game{purchasedEntries.length !== 1 ? 's' : ''} purchased from queue
                {purchasedEntries.length > 0 && (() => {
                  const totalPaid = purchasedEntries.reduce((s, e) => s + (e.purchasePrice || 0), 0);
                  const totalMSRP = purchasedEntries.reduce((s, e) => s + (e.msrpEstimate || 0), 0);
                  const saved = totalMSRP - totalPaid;
                  return saved > 0 ? ` · saved ${formatMoney(saved)} vs MSRP` : '';
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {activeEntries.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <ShoppingCart size={40} className="mx-auto text-white/10" />
          <div>
            <p className="text-white/30 text-sm">No games in your buy queue</p>
            <p className="text-white/20 text-xs mt-1">
              Track upcoming releases and price-watch games you want to buy
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 text-sm transition-all"
          >
            <Plus size={14} />
            Add your first game
          </button>
        </div>
      )}

      {/* Upcoming section */}
      {upcomingEntries.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-purple-400" />
            <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Upcoming</h3>
            <span className="text-[11px] text-white/25">{upcomingEntries.length}</span>
          </div>
          <div className="space-y-2">
            {upcomingEntries.map(entry => (
              <BuyQueueCard
                key={entry.id}
                entry={entry}
                onUpdate={updateEntry}
                onMarkPurchased={handleMarkPurchased}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Released / Price Watch section */}
      {availableEntries.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock size={13} className="text-emerald-400" />
            <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">
              {upcomingEntries.length > 0 ? 'Released — Price Watch' : 'Watching'}
            </h3>
            <span className="text-[11px] text-white/25">{availableEntries.length}</span>
          </div>
          <div className="space-y-2">
            {availableEntries.map(entry => (
              <BuyQueueCard
                key={entry.id}
                entry={entry}
                onUpdate={updateEntry}
                onMarkPurchased={handleMarkPurchased}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Purchased history (collapsible) */}
      {purchasedEntries.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowPurchased(!showPurchased)}
            className="flex items-center gap-2 text-xs text-white/30 hover:text-white/50 transition-colors"
          >
            {showPurchased ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            <PackageCheck size={12} className="text-white/25" />
            <span>{purchasedEntries.length} purchased</span>
          </button>
          {showPurchased && (
            <div className="space-y-2 opacity-60">
              {purchasedEntries.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  {entry.thumbnail && (
                    <img src={entry.thumbnail} alt="" className="w-10 h-7 rounded object-cover flex-shrink-0 grayscale" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white/50 truncate">{entry.gameName}</div>
                    {entry.purchasePrice != null && (
                      <div className="text-[11px] text-white/25">Paid ${entry.purchasePrice}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-emerald-400/60 text-[11px]">
                    <PackageCheck size={11} />
                    Bought
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add modal */}
      {showAddModal && (
        <AddToBuyQueueModal
          onAdd={addEntry}
          onClose={() => setShowAddModal(false)}
          nextPriority={activeEntries.length + 1}
          wishlistGames={wishlistForModal}
        />
      )}
    </div>
  );
}
