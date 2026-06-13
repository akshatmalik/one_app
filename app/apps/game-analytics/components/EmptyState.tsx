'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';

interface EmptyStateProps {
  icon?: ReactNode;
  title?: ReactNode;
  message?: ReactNode;
  className?: string;
}

/**
 * Shared "not enough data yet" placeholder for stats panels, so empty states
 * read consistently instead of each panel rolling its own one-off markup.
 */
export function EmptyState({ icon, title, message = 'Not enough data yet', className }: EmptyStateProps) {
  return (
    <div className={clsx('text-center py-6 text-white/40', className)}>
      {icon && <div className="flex justify-center mb-2 text-white/30">{icon}</div>}
      {title && <div className="text-sm font-medium text-white/60 mb-1">{title}</div>}
      <div className="text-sm">{message}</div>
    </div>
  );
}
