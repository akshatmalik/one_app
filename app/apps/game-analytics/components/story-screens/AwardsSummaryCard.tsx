'use client';

import { motion } from 'framer-motion';
import { Trophy, ChevronRight, Award, Check, Gamepad2 } from 'lucide-react';
import { Game, AwardPeriodType } from '../../lib/types';
import clsx from 'clsx';

interface AwardsSummaryCardProps {
  periodType: AwardPeriodType;
  periodLabel: string;
  /** Record<categoryId, { gameId, gameName, gameThumb?, categoryLabel, categoryIcon }> */
  picks: AwardPickInfo[];
  /** Total number of categories for this period type */
  totalCategories: number;
  /** Callback when user taps the CTA to go assign awards */
  onOpenAwardsHub: () => void;
}

export interface AwardPickInfo {
  categoryId: string;
  categoryLabel: string;
  categoryIcon: string;
  gameId?: string;
  gameName?: string;
  gameThumbnail?: string;
}

const TIER_STYLES: Record<AwardPeriodType, {
  accent: string;
  bg: string;
  border: string;
  gradient: string;
  ctaBg: string;
  ctaText: string;
}> = {
  week: {
    accent: 'text-blue-300',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    ctaBg: 'bg-blue-500/20 hover:bg-blue-500/30',
    ctaText: 'text-blue-300',
  },
  month: {
    accent: 'text-yellow-300',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    gradient: 'from-yellow-500/20 to-amber-500/20',
    ctaBg: 'bg-yellow-500/20 hover:bg-yellow-500/30',
    ctaText: 'text-yellow-300',
  },
  quarter: {
    accent: 'text-purple-300',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    gradient: 'from-purple-500/20 to-pink-500/20',
    ctaBg: 'bg-purple-500/20 hover:bg-purple-500/30',
    ctaText: 'text-purple-300',
  },
  year: {
    accent: 'text-amber-300',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    gradient: 'from-amber-500/20 to-orange-500/20',
    ctaBg: 'bg-amber-500/20 hover:bg-amber-500/30',
    ctaText: 'text-amber-300',
  },
};

const PERIOD_LABEL: Record<AwardPeriodType, string> = {
  week: 'Week',
  month: 'Month',
  quarter: 'Quarter',
  year: 'Year',
};

export function AwardsSummaryCard({
  periodType,
  periodLabel,
  picks,
  totalCategories,
  onOpenAwardsHub,
}: AwardsSummaryCardProps) {
  const style = TIER_STYLES[periodType];
  const assignedCount = picks.filter(p => p.gameId).length;
  const allAssigned = assignedCount === totalCategories && totalCategories > 0;
  const noneAssigned = assignedCount === 0;

  return (
    <div
      className="w-full max-w-lg mx-auto px-4"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-5"
      >
        <div className={clsx(
          'inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-3 border',
          `bg-gradient-to-r ${style.gradient}`,
          style.border,
        )}>
          <Trophy size={14} className={style.accent} />
          <span className={clsx('font-bold text-xs uppercase tracking-widest', style.accent)}>
            {PERIOD_LABEL[periodType]} Awards
          </span>
        </div>
        <h2 className="text-2xl font-bold text-white">
          {allAssigned ? 'The Winners' : noneAssigned ? 'Awards Ceremony' : 'Awards In Progress'}
        </h2>
        <p className="text-xs text-white/30 mt-1">
          {periodLabel} · {assignedCount}/{totalCategories} awarded
        </p>
      </motion.div>

      {/* Award rows */}
      <div className="space-y-2.5">
        {picks.map((pick, i) => (
          <motion.div
            key={pick.categoryId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.06, type: 'spring', stiffness: 200 }}
            className={clsx(
              'flex items-center gap-3 p-3 rounded-xl border',
              pick.gameId
                ? 'bg-white/[0.04] border-white/10'
                : 'bg-white/[0.02] border-white/5',
            )}
          >
            {/* Category icon */}
            <span className="text-lg shrink-0">{pick.categoryIcon}</span>

            {/* Game thumbnail or placeholder */}
            {pick.gameId && pick.gameThumbnail ? (
              <img
                src={pick.gameThumbnail}
                alt={pick.gameName}
                className="w-9 h-9 rounded-lg object-cover shrink-0"
                loading="lazy"
              />
            ) : pick.gameId ? (
              <div className="w-9 h-9 rounded-lg bg-white/5 shrink-0 flex items-center justify-center">
                <Gamepad2 size={14} className="text-white/20" />
              </div>
            ) : null}

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
                {pick.categoryLabel}
              </div>
              {pick.gameId ? (
                <div className="text-sm font-semibold text-white truncate">
                  {pick.gameName}
                </div>
              ) : (
                <div className="text-sm text-white/20 italic">Not awarded yet</div>
              )}
            </div>

            {/* Status */}
            {pick.gameId ? (
              <Check size={14} className={clsx('shrink-0', style.accent)} />
            ) : (
              <div className="w-3 h-3 rounded-full bg-white/10 shrink-0" />
            )}
          </motion.div>
        ))}
      </div>

      {/* CTA Button */}
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onOpenAwardsHub();
        }}
        className={clsx(
          'w-full mt-5 flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold text-sm transition-all',
          style.border,
          style.ctaBg,
          style.ctaText,
        )}
      >
        {allAssigned ? (
          <>
            <Award size={16} />
            See full ceremony
            <ChevronRight size={16} />
          </>
        ) : noneAssigned ? (
          <>
            <Trophy size={16} />
            Go assign awards
            <ChevronRight size={16} />
          </>
        ) : (
          <>
            <Trophy size={16} />
            Complete the ceremony ({totalCategories - assignedCount} left)
            <ChevronRight size={16} />
          </>
        )}
      </motion.button>
    </div>
  );
}
