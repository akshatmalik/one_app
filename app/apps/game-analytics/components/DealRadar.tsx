'use client';

import { useState } from 'react';
import {
  Zap, RefreshCw, ChevronDown, ChevronUp, Clock, Tag, ShoppingCart, Loader2,
} from 'lucide-react';
import { PurchaseQueueEntry } from '../lib/types';
import { LiveDealInfo } from '../hooks/useDealWatch';
import clsx from 'clsx';

interface DealRadarProps {
  entries: PurchaseQueueEntry[];
  deals: Record<string, LiveDealInfo>;
  loading: boolean;
  lastChecked: Date | null;
  hasActiveDeals: boolean;
  activeDealsCount: number;
  onRefresh: () => void;
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  return `${diffH}h ago`;
}

export function DealRadar({
  entries,
  deals,
  loading,
  lastChecked,
  hasActiveDeals,
  activeDealsCount,
  onRefresh,
}: DealRadarProps) {
  const [expanded, setExpanded] = useState(true);

  // Games currently at or below target price
  const dealEntries = entries
    .filter(e => {
      const d = deals[e.gameName];
      return d?.isAtTarget;
    })
    .map(e => ({ entry: e, deal: deals[e.gameName] }));

  // Games with any price data (for the "no deal" list)
  const pricedEntries = entries
    .filter(e => deals[e.gameName] && !deals[e.gameName].isAtTarget)
    .slice(0, 4);

  const trackedCount = entries.filter(e => !e.purchased).length;

  if (trackedCount === 0) return null;

  return (
    <div
      className={clsx(
        'rounded-xl border transition-all',
        hasActiveDeals
          ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/8 border-emerald-500/25'
          : 'bg-white/[0.02] border-white/8',
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        {loading ? (
          <Loader2 size={14} className="text-white/40 animate-spin shrink-0" />
        ) : hasActiveDeals ? (
          <div className="relative shrink-0">
            <Zap size={14} className="text-emerald-400" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        ) : (
          <Tag size={14} className="text-white/30 shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          {loading ? (
            <span className="text-xs text-white/40">
              Scanning {trackedCount} game{trackedCount !== 1 ? 's' : ''} for deals…
            </span>
          ) : hasActiveDeals ? (
            <span className="text-xs font-semibold text-emerald-400">
              {activeDealsCount} game{activeDealsCount !== 1 ? 's' : ''} below target price!
            </span>
          ) : lastChecked ? (
            <span className="text-xs text-white/40">
              {Object.keys(deals).length > 0
                ? `${Object.keys(deals).length} of ${trackedCount} found on PC — none below target`
                : `No PC prices found for your tracked games`}
            </span>
          ) : (
            <span className="text-xs text-white/30">Deal Radar ready</span>
          )}
        </div>

        {/* Last checked */}
        {lastChecked && !loading && (
          <span className="text-[10px] text-white/20 flex items-center gap-1 shrink-0">
            <Clock size={9} />
            {formatRelativeTime(lastChecked)}
          </span>
        )}

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={loading}
          title="Refresh deal prices"
          className="p-1 text-white/20 hover:text-white/50 transition-colors disabled:opacity-30 shrink-0"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>

        {/* Expand toggle */}
        {(dealEntries.length > 0 || pricedEntries.length > 0) && !loading && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1 text-white/20 hover:text-white/50 transition-colors shrink-0"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {/* Deal list */}
      {expanded && !loading && dealEntries.length > 0 && (
        <div className="px-4 pb-3 space-y-2 border-t border-emerald-500/10">
          <p className="text-[10px] text-white/30 pt-2 uppercase tracking-wide">On sale now</p>
          {dealEntries.map(({ entry, deal }) => (
            <DealRow key={entry.id} entry={entry} deal={deal} highlight />
          ))}
        </div>
      )}

      {/* Priced but not at target */}
      {expanded && !loading && dealEntries.length === 0 && pricedEntries.length > 0 && (
        <div className="px-4 pb-3 space-y-2 border-t border-white/5">
          <p className="text-[10px] text-white/20 pt-2 uppercase tracking-wide">Current PC prices</p>
          {pricedEntries.map(e => {
            const deal = deals[e.gameName];
            return <DealRow key={e.id} entry={e} deal={deal} highlight={false} />;
          })}
          {Object.keys(deals).length > 4 && (
            <p className="text-[10px] text-white/20">
              +{Object.keys(deals).length - 4} more tracked
            </p>
          )}
        </div>
      )}

      {/* PC-only disclaimer */}
      {lastChecked && !loading && (
        <div className="px-4 pb-2.5 flex items-center gap-1.5">
          <ShoppingCart size={9} className="text-white/15 shrink-0" />
          <span className="text-[9px] text-white/15">
            PC/Steam prices only via CheapShark — console prices not included
          </span>
        </div>
      )}
    </div>
  );
}

// ── Single deal row ─────────────────────────────────────────────────────────

function DealRow({
  entry,
  deal,
  highlight,
}: {
  entry: PurchaseQueueEntry;
  deal: LiveDealInfo;
  highlight: boolean;
}) {
  const savings =
    deal.savingsPercent != null && deal.savingsPercent > 0
      ? `${deal.savingsPercent}% off`
      : null;

  return (
    <div
      className={clsx(
        'flex items-center gap-3 px-3 py-2 rounded-lg',
        highlight
          ? 'bg-emerald-500/8 border border-emerald-500/15'
          : 'bg-white/[0.02] border border-white/5',
      )}
    >
      {entry.thumbnail ? (
        <img
          src={entry.thumbnail}
          alt=""
          className="w-8 h-8 object-cover rounded shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="w-8 h-8 rounded bg-white/5 shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white/80 truncate">{entry.gameName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {entry.targetPrice != null && (
            <span className="text-[10px] text-white/30">target ${entry.targetPrice}</span>
          )}
          {savings && (
            <span
              className={clsx(
                'text-[10px] font-semibold px-1 py-0.5 rounded',
                highlight
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-white/5 text-white/30',
              )}
            >
              {savings}
            </span>
          )}
        </div>
      </div>

      {/* Current price */}
      <div className="text-right shrink-0">
        <p
          className={clsx(
            'text-sm font-bold tabular-nums',
            highlight ? 'text-emerald-400' : 'text-white/50',
          )}
        >
          ${deal.price}
        </p>
        {highlight && entry.targetPrice != null && (
          <p className="text-[9px] text-emerald-400/60">
            ${(entry.targetPrice - deal.price).toFixed(0)} under
          </p>
        )}
      </div>
    </div>
  );
}
