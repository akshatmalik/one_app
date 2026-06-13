'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';

interface StatPanelCardProps {
  /** Already-colored icon element, e.g. <Flame size={16} className="text-amber-400" />. */
  icon?: ReactNode;
  title: ReactNode;
  /** Optional muted subtitle shown after the title. */
  subtitle?: ReactNode;
  /**
   * Gradient + border classes for the card surface, e.g.
   * "from-amber-500/10 to-orange-500/10 border-amber-500/20".
   */
  gradient: string;
  /** Optional element rendered on the right side of the header row. */
  headerRight?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Shared stat-card chrome used across the stats panels (FunStats, Insights,
 * Analytics, Expanded). Captures the repeated
 * "gradient surface + icon + title + subtitle" header so cards stop
 * re-declaring the same markup. Each card keeps its own accent via `gradient`.
 */
export function StatPanelCard({ icon, title, subtitle, gradient, headerRight, className, children }: StatPanelCardProps) {
  return (
    <div className={clsx('p-4 bg-gradient-to-br border rounded-xl', gradient, className)}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h4 className="text-sm font-medium text-white">{title}</h4>
        {subtitle && <span className="text-xs text-white/30">{subtitle}</span>}
        {headerRight && <span className="ml-auto">{headerRight}</span>}
      </div>
      {children}
    </div>
  );
}
