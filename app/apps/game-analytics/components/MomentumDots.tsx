'use client';

interface MomentumDotsProps {
  sessions: number[]; // last N session hours
  maxDots?: number;
}

export function MomentumDots({ sessions, maxDots = 5 }: MomentumDotsProps) {
  if (sessions.length === 0) return null;

  const dots = sessions.slice(-maxDots);
  const maxHours = Math.max(...dots, 1);

  // Determine trend: compare avg of first half vs second half
  const mid = Math.floor(dots.length / 2);
  const firstHalf = dots.slice(0, mid || 1);
  const secondHalf = dots.slice(mid);
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  let trendColor: string;
  if (secondAvg > firstAvg * 1.15) {
    trendColor = '#10b981'; // green — trending up
  } else if (secondAvg < firstAvg * 0.85) {
    trendColor = '#ef4444'; // red — trending down
  } else {
    trendColor = '#6b7280'; // neutral
  }

  return (
    <div className="flex items-end gap-[3px] h-3">
      {dots.map((hours, i) => {
        const size = Math.max(3, Math.round((hours / maxHours) * 10));
        return (
          <div
            key={i}
            className="rounded-full shrink-0"
            style={{
              width: size,
              height: size,
              backgroundColor: trendColor,
              opacity: 0.5 + (i / dots.length) * 0.5,
            }}
          />
        );
      })}
    </div>
  );
}
