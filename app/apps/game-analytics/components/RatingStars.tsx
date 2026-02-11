'use client';

import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number; // 1-10 scale
  size?: number;
}

export function RatingStars({ rating, size = 12 }: RatingStarsProps) {
  // Convert 1-10 to 5 stars
  const starValue = rating / 2; // e.g., 8 = 4 stars
  const color = rating >= 8 ? '#fbbf24' : rating >= 5 ? '#9ca3af' : '#6b7280';

  return (
    <div className="flex items-center gap-px">
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = starValue >= i ? 1 : starValue >= i - 0.5 ? 0.5 : 0;
        return (
          <div key={i} className="relative" style={{ width: size, height: size }}>
            {/* Empty star */}
            <Star size={size} className="text-white/10 absolute inset-0" />
            {/* Filled star */}
            {fill > 0 && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: fill === 1 ? '100%' : '50%' }}
              >
                <Star size={size} style={{ color, fill: color }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
