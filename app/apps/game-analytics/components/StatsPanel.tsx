'use client';

import { AnalyticsSummary } from '../lib/types';

interface StatsPanelProps {
  summary: AnalyticsSummary;
}

// Legacy component - stats are now displayed directly in the page
export function StatsPanel({ summary }: StatsPanelProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
        <p className="text-xs text-white/40 mb-1">Total Spent</p>
        <p className="text-lg font-semibold text-white/90">${summary.totalSpent.toFixed(0)}</p>
      </div>

      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
        <p className="text-xs text-white/40 mb-1">Games</p>
        <p className="text-lg font-semibold text-white/90">{summary.gameCount}</p>
      </div>

      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
        <p className="text-xs text-white/40 mb-1">Total Hours</p>
        <p className="text-lg font-semibold text-white/90">{summary.totalHours.toFixed(0)}</p>
      </div>

      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
        <p className="text-xs text-white/40 mb-1">Avg $/Hour</p>
        <p className="text-lg font-semibold text-white/90">
          ${summary.averageCostPerHour.toFixed(2)}
        </p>
      </div>

      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
        <p className="text-xs text-white/40 mb-1">Avg Rating</p>
        <p className="text-lg font-semibold text-white/90">
          {summary.averageRating.toFixed(1)}/10
        </p>
      </div>

      <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
        <p className="text-xs text-white/40 mb-1">Wishlist</p>
        <p className="text-lg font-semibold text-purple-400">{summary.wishlistCount}</p>
      </div>
    </div>
  );
}
