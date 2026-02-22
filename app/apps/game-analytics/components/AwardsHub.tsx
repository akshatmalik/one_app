'use client';

/**
 * Awards Hub — Unified awards center for all period tiers.
 *
 * Provides tabs for Week / Month / Quarter / Year, lists pending and
 * completed periods, and drills into the interactive GamingAwardsScreen
 * ceremony for any selected period.
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, ChevronRight, Check, Award, ChevronLeft } from 'lucide-react';
import clsx from 'clsx';
import { Game, AwardPeriodType } from '../lib/types';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { GamingAwardsScreen, AwardCategoryDef } from './GamingAwardsScreen';
import {
  useAwards,
  awardWeekKey, awardWeekLabel,
  awardMonthKey, awardMonthLabel,
  awardQuarterKey, awardQuarterLabel,
  awardYearKey,
} from '../hooks/useAwards';
import { parseLocalDate } from '../lib/calculations';
import {
  buildWeekCategories,
  buildMonthCategories,
  buildQuarterCategories,
  buildYearCategories,
} from '../lib/award-categories';

// ── Types ─────────────────────────────────────────────────────

interface AwardsHubProps {
  allGames: GameWithMetrics[];
  rawGames: Game[];
  updateGame: (id: string, updates: Partial<Game>) => Promise<Game>;
  onClose: () => void;
  /** Pre-select a specific tab on open */
  initialTab?: AwardPeriodType;
  /** Pre-select a specific period key to open ceremony immediately */
  initialPeriodKey?: string;
}

interface PeriodEntry {
  key: string;
  label: string;
  periodType: AwardPeriodType;
  assignedCount: number;
  totalCategories: number;
  year: number;
  /** For weeks: weekStart/weekEnd; for months: month num; for quarters: quarter num */
  meta: Record<string, number | Date>;
}

// ── Style constants ────────────────────────────────────────────

const TAB_STYLES: Record<AwardPeriodType, {
  accent: string;
  bg: string;
  border: string;
  pill: string;
  iconColor: string;
}> = {
  week: {
    accent: 'text-blue-300',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    pill: 'bg-blue-500/20 text-blue-300',
    iconColor: 'text-blue-400',
  },
  month: {
    accent: 'text-yellow-300',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    pill: 'bg-yellow-500/20 text-yellow-300',
    iconColor: 'text-yellow-400',
  },
  quarter: {
    accent: 'text-purple-300',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    pill: 'bg-purple-500/20 text-purple-300',
    iconColor: 'text-purple-400',
  },
  year: {
    accent: 'text-amber-300',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    pill: 'bg-amber-500/20 text-amber-300',
    iconColor: 'text-amber-400',
  },
};

const CATEGORY_COUNTS: Record<AwardPeriodType, number> = {
  week: 3,
  month: 7,
  quarter: 8,
  year: 9,
};

// ── Helpers — period discovery ─────────────────────────────────

function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return { year: d.getFullYear(), week: weekNum };
}

function getWeekStartEnd(year: number, weekNum: number): { start: Date; end: Date } {
  // Jan 4 is always in ISO week 1
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = (jan4.getDay() + 6) % 7; // Mon=0
  const weekStart = new Date(jan4);
  weekStart.setDate(jan4.getDate() - dayOfWeek + (weekNum - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return { start: weekStart, end: weekEnd };
}

/** Discover which weeks have play logs */
function discoverWeeks(games: Game[], maxWeeks: number = 8): PeriodEntry[] {
  const weekSet = new Map<string, { year: number; week: number }>();

  for (const game of games) {
    for (const log of (game.playLogs || [])) {
      const d = parseLocalDate(log.date);
      const { year, week } = getISOWeek(d);
      const key = awardWeekKey(d);
      if (!weekSet.has(key)) {
        weekSet.set(key, { year, week });
      }
    }
  }

  // Also add current week
  const now = new Date();
  const { year: cy, week: cw } = getISOWeek(now);
  const currentKey = awardWeekKey(now);
  if (!weekSet.has(currentKey)) {
    weekSet.set(currentKey, { year: cy, week: cw });
  }

  return Array.from(weekSet.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, maxWeeks)
    .map(([key, { year, week }]) => {
      const { start, end } = getWeekStartEnd(year, week);
      return {
        key,
        label: awardWeekLabel(start, end),
        periodType: 'week' as AwardPeriodType,
        assignedCount: 0, // filled later
        totalCategories: CATEGORY_COUNTS.week,
        year,
        meta: { week, weekStart: start.getTime(), weekEnd: end.getTime() },
      };
    });
}

/** Discover which months have play logs */
function discoverMonths(games: Game[], maxMonths: number = 6): PeriodEntry[] {
  const monthSet = new Map<string, { year: number; month: number }>();

  for (const game of games) {
    for (const log of (game.playLogs || [])) {
      const d = parseLocalDate(log.date);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const key = awardMonthKey(new Date(year, month - 1, 1));
      if (!monthSet.has(key)) {
        monthSet.set(key, { year, month });
      }
    }
  }

  // Add current month
  const now = new Date();
  const curKey = awardMonthKey(now);
  if (!monthSet.has(curKey)) {
    monthSet.set(curKey, { year: now.getFullYear(), month: now.getMonth() + 1 });
  }

  return Array.from(monthSet.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, maxMonths)
    .map(([key, { year, month }]) => ({
      key,
      label: awardMonthLabel(year, month),
      periodType: 'month' as AwardPeriodType,
      assignedCount: 0,
      totalCategories: CATEGORY_COUNTS.month,
      year,
      meta: { month },
    }));
}

/** Discover quarters */
function discoverQuarters(games: Game[], maxQuarters: number = 4): PeriodEntry[] {
  const qSet = new Map<string, { year: number; quarter: number }>();

  for (const game of games) {
    for (const log of (game.playLogs || [])) {
      const d = parseLocalDate(log.date);
      const year = d.getFullYear();
      const quarter = Math.ceil((d.getMonth() + 1) / 3);
      const key = awardQuarterKey(new Date(year, (quarter - 1) * 3, 1));
      if (!qSet.has(key)) {
        qSet.set(key, { year, quarter });
      }
    }
  }

  const now = new Date();
  const curQ = Math.ceil((now.getMonth() + 1) / 3);
  const curKey = awardQuarterKey(now);
  if (!qSet.has(curKey)) {
    qSet.set(curKey, { year: now.getFullYear(), quarter: curQ });
  }

  return Array.from(qSet.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, maxQuarters)
    .map(([key, { year, quarter }]) => ({
      key,
      label: awardQuarterLabel(year, quarter),
      periodType: 'quarter' as AwardPeriodType,
      assignedCount: 0,
      totalCategories: CATEGORY_COUNTS.quarter,
      year,
      meta: { quarter },
    }));
}

/** Discover years */
function discoverYears(games: Game[]): PeriodEntry[] {
  const yearSet = new Set<number>();

  for (const game of games) {
    for (const log of (game.playLogs || [])) {
      yearSet.add(parseLocalDate(log.date).getFullYear());
    }
  }

  yearSet.add(new Date().getFullYear());

  return Array.from(yearSet)
    .sort((a, b) => b - a)
    .map(year => ({
      key: awardYearKey(new Date(year, 0, 1)),
      label: `${year}`,
      periodType: 'year' as AwardPeriodType,
      assignedCount: 0,
      totalCategories: CATEGORY_COUNTS.year,
      year,
      meta: {},
    }));
}

// ── Main component ─────────────────────────────────────────────

export function AwardsHub({
  allGames,
  rawGames,
  updateGame,
  onClose,
  initialTab = 'week',
  initialPeriodKey,
}: AwardsHubProps) {
  const [activeTab, setActiveTab] = useState<AwardPeriodType>(initialTab);
  const [activePeriodKey, setActivePeriodKey] = useState<string | null>(initialPeriodKey ?? null);
  const { getPicksForPeriod } = useAwards(rawGames, updateGame);

  // Build period lists
  const weekPeriods = useMemo(() => discoverWeeks(rawGames), [rawGames]);
  const monthPeriods = useMemo(() => discoverMonths(rawGames), [rawGames]);
  const quarterPeriods = useMemo(() => discoverQuarters(rawGames), [rawGames]);
  const yearPeriods = useMemo(() => discoverYears(rawGames), [rawGames]);

  const allPeriods: Record<AwardPeriodType, PeriodEntry[]> = useMemo(() => ({
    week: weekPeriods,
    month: monthPeriods,
    quarter: quarterPeriods,
    year: yearPeriods,
  }), [weekPeriods, monthPeriods, quarterPeriods, yearPeriods]);

  // Enrich periods with assigned counts
  const enrichedPeriods = useMemo(() => {
    const result: Record<AwardPeriodType, PeriodEntry[]> = { week: [], month: [], quarter: [], year: [] };
    for (const tier of (['week', 'month', 'quarter', 'year'] as AwardPeriodType[])) {
      result[tier] = allPeriods[tier].map(p => {
        const picks = getPicksForPeriod(tier, p.key);
        return { ...p, assignedCount: Object.keys(picks).length };
      });
    }
    return result;
  }, [allPeriods, getPicksForPeriod]);

  const currentPeriods = enrichedPeriods[activeTab];

  // Active period entry for ceremony view
  const activePeriodEntry = useMemo(() => {
    if (!activePeriodKey) return null;
    for (const tier of (['week', 'month', 'quarter', 'year'] as AwardPeriodType[])) {
      const found = enrichedPeriods[tier].find(p => p.key === activePeriodKey);
      if (found) return found;
    }
    return null;
  }, [activePeriodKey, enrichedPeriods]);

  // Build categories for the active period
  const ceremonyData = useMemo(() => {
    if (!activePeriodEntry) return null;
    const { periodType, key, year, meta, label } = activePeriodEntry;

    const existingPicks = getPicksForPeriod(periodType, key);

    // Context winners from lower tiers
    const contextWinners: Array<{ label: string; gameName: string; icon: string }> = [];
    for (const g of rawGames) {
      for (const a of (g.awards || [])) {
        // For month → show week winners; for quarter → month winners; for year → quarter winners
        if (
          (periodType === 'month' && a.periodType === 'week') ||
          (periodType === 'quarter' && a.periodType === 'month') ||
          (periodType === 'year' && a.periodType === 'quarter')
        ) {
          if (a.periodKey.startsWith(`${year}-`)) {
            contextWinners.push({ label: a.categoryLabel, gameName: g.name, icon: a.categoryIcon });
          }
        }
      }
    }

    let categories: AwardCategoryDef[];
    let ceremonyTitle: string;

    switch (periodType) {
      case 'week': {
        const weekStart = new Date(meta.weekStart as number);
        const weekEnd = new Date(meta.weekEnd as number);
        categories = buildWeekCategories(rawGames, allGames, weekStart, weekEnd);
        ceremonyTitle = 'The Golden Controller';
        break;
      }
      case 'month': {
        const month = meta.month as number;
        categories = buildMonthCategories(rawGames, allGames, year, month, contextWinners);
        ceremonyTitle = `${label} — Awards Night`;
        break;
      }
      case 'quarter': {
        const quarter = meta.quarter as number;
        categories = buildQuarterCategories(allGames, rawGames, year, quarter, contextWinners);
        ceremonyTitle = `${label} Honours`;
        break;
      }
      case 'year': {
        categories = buildYearCategories(allGames, rawGames, year, contextWinners);
        ceremonyTitle = `The ${year} Gaming Ceremony`;
        break;
      }
    }

    return {
      categories,
      ceremonyTitle,
      existingPicks,
      contextWinners: contextWinners.slice(0, 8),
      contextBanner: contextWinners.length > 0
        ? `Prior winners: ${[...new Set(contextWinners.map(w => w.gameName))].join(', ')}`
        : undefined,
    };
  }, [activePeriodEntry, rawGames, allGames, getPicksForPeriod]);

  const handleOpenCeremony = useCallback((key: string) => {
    setActivePeriodKey(key);
  }, []);

  const handleBackToList = useCallback(() => {
    setActivePeriodKey(null);
  }, []);

  // Count pending across all tiers (for the summary banner)
  const pendingSummary = useMemo(() => {
    const result: Record<AwardPeriodType, number> = { week: 0, month: 0, quarter: 0, year: 0 };
    for (const tier of (['week', 'month', 'quarter', 'year'] as AwardPeriodType[])) {
      result[tier] = enrichedPeriods[tier].filter(p => p.assignedCount < p.totalCategories).length;
    }
    return result;
  }, [enrichedPeriods]);

  const tabs: AwardPeriodType[] = ['week', 'month', 'quarter', 'year'];

  // ─── Ceremony drill-down view ─────────────────────────────────

  if (activePeriodKey && activePeriodEntry && ceremonyData) {
    const style = TAB_STYLES[activePeriodEntry.periodType];
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-[#0a0a0f] flex flex-col"
      >
        {/* Sticky header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0 bg-[#0a0a0f]">
          <button
            onClick={handleBackToList}
            className="flex items-center gap-1.5 text-white/50 hover:text-white/80 transition-colors"
          >
            <ChevronLeft size={18} />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <Trophy size={14} className={style.iconColor} />
            <span className="font-bold text-white text-sm">{activePeriodEntry.label}</span>
            <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-bold', style.pill)}>
              {activePeriodEntry.periodType.toUpperCase()}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 active:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable ceremony content */}
        <div className="flex-1 overflow-y-auto overscroll-contain py-4">
          <GamingAwardsScreen
            periodType={activePeriodEntry.periodType}
            periodKey={activePeriodEntry.key}
            periodLabel={activePeriodEntry.label}
            ceremonyTitle={ceremonyData.ceremonyTitle}
            categories={ceremonyData.categories}
            existingPicks={ceremonyData.existingPicks}
            onPick={() => {}}
            contextBanner={ceremonyData.contextBanner}
            contextWinners={ceremonyData.contextWinners}
            allGames={rawGames}
            updateGame={updateGame}
          />
        </div>
      </motion.div>
    );
  }

  // ─── Period list view ──────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className="fixed inset-0 z-[60] bg-[#0a0a0f] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0 bg-[#0a0a0f]">
        <div className="flex items-center gap-2.5">
          <Trophy size={18} className="text-amber-400" />
          <span className="font-bold text-white text-base">Awards Hub</span>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 active:bg-white/10"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-3 border-b border-white/5 bg-[#0a0a0f]">
        {tabs.map(tab => {
          const style = TAB_STYLES[tab];
          const isActive = activeTab === tab;
          const pending = pendingSummary[tab];

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all relative',
                isActive
                  ? clsx(style.bg, style.accent, style.border, 'border')
                  : 'text-white/30 hover:text-white/50 bg-white/[0.02]',
              )}
            >
              {tab}
              {pending > 0 && (
                <span className={clsx(
                  'absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center',
                  isActive ? 'bg-red-500 text-white' : 'bg-white/10 text-white/40',
                )}>
                  {pending}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Period list */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="px-4 py-4 space-y-2">
          {currentPeriods.length === 0 && (
            <div className="text-center py-12 text-white/20">
              <Award size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No {activeTab}ly periods with games found</p>
            </div>
          )}

          {currentPeriods.map((period, i) => {
            const style = TAB_STYLES[period.periodType];
            const isComplete = period.assignedCount >= period.totalCategories;
            const isPending = period.assignedCount === 0;
            const isPartial = !isComplete && !isPending;

            return (
              <motion.button
                key={period.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => handleOpenCeremony(period.key)}
                className={clsx(
                  'w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all active:scale-[0.98]',
                  isComplete
                    ? 'bg-white/[0.03] border-white/8 hover:border-white/15'
                    : clsx(`bg-gradient-to-r ${TAB_STYLES[period.periodType].bg.replace('bg-', 'from-')} to-transparent`, style.border),
                )}
              >
                {/* Status indicator */}
                <div className={clsx(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  isComplete
                    ? 'bg-emerald-500/15'
                    : isPending
                      ? `${style.bg}`
                      : 'bg-amber-500/15',
                )}>
                  {isComplete ? (
                    <Check size={18} className="text-emerald-400" />
                  ) : (
                    <Trophy size={18} className={isPending ? style.accent : 'text-amber-400'} />
                  )}
                </div>

                {/* Period info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white">{period.label}</div>
                  <div className="text-xs text-white/30 mt-0.5">
                    {isComplete
                      ? `All ${period.totalCategories} awards given ✓`
                      : isPending
                        ? `${period.totalCategories} categories waiting`
                        : `${period.assignedCount}/${period.totalCategories} awarded`
                    }
                  </div>
                </div>

                {/* Progress + arrow */}
                <div className="flex items-center gap-2 shrink-0">
                  {!isPending && (
                    <div className="flex gap-0.5">
                      {Array.from({ length: period.totalCategories }).map((_, j) => (
                        <div
                          key={j}
                          className={clsx(
                            'w-1.5 h-1.5 rounded-full',
                            j < period.assignedCount
                              ? isComplete ? 'bg-emerald-400' : 'bg-amber-400'
                              : 'bg-white/10',
                          )}
                        />
                      ))}
                    </div>
                  )}
                  <ChevronRight size={16} className="text-white/20" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
