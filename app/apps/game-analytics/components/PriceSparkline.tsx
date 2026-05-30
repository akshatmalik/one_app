'use client';

import { PriceObservation } from '../lib/types';

interface Props {
  history: PriceObservation[];
  target?: number | null;
  width?: number;
  height?: number;
}

/**
 * Tiny inline SVG sparkline of manually-tracked prices over time.
 * Renders the trend line, a target threshold, and a marker on the latest point.
 */
export function PriceSparkline({ history, target, width = 120, height = 32 }: Props) {
  if (!history || history.length < 2) return null;

  const prices = history.map(h => h.price);
  const min = Math.min(...prices, target ?? Infinity);
  const max = Math.max(...prices, target ?? -Infinity);
  const range = max - min || 1;
  const pad = 3;

  const x = (i: number) => pad + (i / (history.length - 1)) * (width - pad * 2);
  const y = (price: number) => pad + (1 - (price - min) / range) * (height - pad * 2);

  const points = history.map((h, i) => `${x(i).toFixed(1)},${y(h.price).toFixed(1)}`).join(' ');
  const last = history[history.length - 1];
  const first = history[0];
  const trendDown = last.price < first.price;
  const lineColor = trendDown ? '#34d399' : last.price > first.price ? '#f87171' : '#9ca3af';
  const targetY = target != null ? y(target) : null;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {targetY != null && (
        <line
          x1={pad} y1={targetY} x2={width - pad} y2={targetY}
          stroke="#34d399" strokeWidth={1} strokeDasharray="3 3" opacity={0.4}
        />
      )}
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={x(history.length - 1)} cy={y(last.price)} r={2.5} fill={lineColor} />
    </svg>
  );
}
