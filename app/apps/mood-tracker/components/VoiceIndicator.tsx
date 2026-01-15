'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';

interface VoiceIndicatorProps {
  isActive: boolean;
  className?: string;
}

/**
 * Animated voice level indicator
 * Shows pulsing bars when voice is being recorded
 */
export function VoiceIndicator({ isActive, className }: VoiceIndicatorProps) {
  const [bars] = useState([1, 2, 3, 4, 5, 6, 7]);

  return (
    <div className={clsx('flex items-center justify-center gap-1 h-12', className)}>
      {bars.map((bar) => (
        <div
          key={bar}
          className={clsx(
            'w-1 rounded-full transition-all duration-300',
            isActive ? 'bg-red-500' : 'bg-white/20',
          )}
          style={{
            height: isActive ? `${Math.random() * 60 + 20}%` : '20%',
            animation: isActive ? `pulse ${0.5 + Math.random() * 0.5}s ease-in-out infinite` : 'none',
            animationDelay: `${bar * 0.1}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            transform: scaleY(0.5);
          }
          50% {
            transform: scaleY(1);
          }
        }
      `}</style>
    </div>
  );
}
