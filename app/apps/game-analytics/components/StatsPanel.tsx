'use client';

import { Card } from '@/components/ui/Card';
import { AnalyticsSummary } from '../lib/types';

interface StatsPanelProps {
  summary: AnalyticsSummary;
}

export function StatsPanel({ summary }: StatsPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card className="p-4">
        <p className="text-sm text-gray-600 mb-1">Total Spent</p>
        <p className="text-2xl font-bold text-gray-900">${summary.totalSpent}</p>
      </Card>

      <Card className="p-4">
        <p className="text-sm text-gray-600 mb-1">Games</p>
        <p className="text-2xl font-bold text-gray-900">{summary.gameCount}</p>
      </Card>

      <Card className="p-4">
        <p className="text-sm text-gray-600 mb-1">Total Hours</p>
        <p className="text-2xl font-bold text-gray-900">{summary.totalHours}</p>
      </Card>

      <Card className="p-4">
        <p className="text-sm text-gray-600 mb-1">Avg $/Hour</p>
        <p className="text-2xl font-bold text-gray-900">
          ${summary.averageCostPerHour.toFixed(2)}
        </p>
      </Card>

      <Card className="p-4">
        <p className="text-sm text-gray-600 mb-1">Avg Rating</p>
        <p className="text-2xl font-bold text-gray-900">
          {summary.averageRating.toFixed(1)}/10
        </p>
      </Card>

      {summary.budgetRemaining !== undefined && (
        <Card className="p-4 md:col-span-2 lg:col-span-5">
          <p className="text-sm text-gray-600 mb-1">2026 Budget Remaining</p>
          <div className="flex items-center gap-4">
            <p className="text-2xl font-bold text-gray-900">
              ${summary.budgetRemaining}
            </p>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.max(0, (summary.budgetRemaining / 910) * 100)}%`,
                }}
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
