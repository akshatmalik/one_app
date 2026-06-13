'use client';

import { useMemo } from 'react';
import { Activity, TrendingUp, TrendingDown, Minus, AlertTriangle, Flame, Sparkles, RotateCcw } from 'lucide-react';
import { Game } from '../lib/types';
import { getDopamineCurve, DopaminePattern, parseLocalDate } from '../lib/calculations';
import clsx from 'clsx';

interface PatternMeta {
  label: string;
  shortDescription: string;
  color: string;
  dimColor: string;
  bgClass: string;
  borderClass: string;
  icon: React.ReactNode;
  sentiment: 'positive' | 'neutral' | 'warning';
}

const PATTERN_META: Record<DopaminePattern, PatternMeta> = {
  honeymoon: {
    label: 'Honeymoon',
    shortDescription: 'Early excitement is fading',
    color: '#f59e0b',
    dimColor: 'rgba(245,158,11,0.15)',
    bgClass: 'bg-amber-500/8',
    borderClass: 'border-amber-500/20',
    icon: <AlertTriangle size={11} className="text-amber-400" />,
    sentiment: 'warning',
  },
  slow_burn: {
    label: 'Slow Burn',
    shortDescription: 'Getting more invested over time',
    color: '#10b981',
    dimColor: 'rgba(16,185,129,0.15)',
    bgClass: 'bg-emerald-500/8',
    borderClass: 'border-emerald-500/20',
    icon: <Flame size={11} className="text-emerald-400" />,
    sentiment: 'positive',
  },
  steady_love: {
    label: 'Steady Love',
    shortDescription: 'Consistent, healthy engagement',
    color: '#6366f1',
    dimColor: 'rgba(99,102,241,0.15)',
    bgClass: 'bg-indigo-500/8',
    borderClass: 'border-indigo-500/20',
    icon: <Sparkles size={11} className="text-indigo-400" />,
    sentiment: 'positive',
  },
  spike_crash: {
    label: 'Spike & Crash',
    shortDescription: 'Big spike, then trailed off',
    color: '#ef4444',
    dimColor: 'rgba(239,68,68,0.15)',
    bgClass: 'bg-red-500/8',
    borderClass: 'border-red-500/20',
    icon: <TrendingDown size={11} className="text-red-400" />,
    sentiment: 'warning',
  },
  revival: {
    label: 'Revival',
    shortDescription: 'Took a break and came back',
    color: '#8b5cf6',
    dimColor: 'rgba(139,92,246,0.15)',
    bgClass: 'bg-purple-500/8',
    borderClass: 'border-purple-500/20',
    icon: <RotateCcw size={11} className="text-purple-400" />,
    sentiment: 'positive',
  },
};

function buildAdvice(
  pattern: DopaminePattern,
  firstAvg: number,
  recentAvg: number,
  totalSessions: number,
): string {
  switch (pattern) {
    case 'honeymoon':
      if (recentAvg < 1) return 'Recent sessions are very short — you might be losing steam. Try a longer uninterrupted session.';
      return `Down from ${firstAvg.toFixed(1)}h average to ${recentAvg.toFixed(1)}h recently. Consider shorter, focused play sessions to rekindle interest.`;
    case 'slow_burn':
      return `Up from ${firstAvg.toFixed(1)}h to ${recentAvg.toFixed(1)}h recently — this game is growing on you. Great sign for completion.`;
    case 'steady_love':
      return `${totalSessions} sessions, all around ${firstAvg.toFixed(1)}h each. You've found a sustainable rhythm with this game.`;
    case 'spike_crash':
      return `After the big session, engagement dropped significantly. See if shorter sessions help rebuild the habit.`;
    case 'revival':
      return `You stepped away and came back — rare pattern. Recent sessions averaging ${recentAvg.toFixed(1)}h shows renewed interest.`;
  }
}

// Inline SVG sparkline for full card view
function SessionSparkline({ trend, pattern }: { trend: number[]; pattern: DopaminePattern }) {
  if (trend.length < 2) return null;
  const W = 280;
  const H = 56;
  const PAD_X = 10;
  const PAD_Y = 8;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;
  const max = Math.max(...trend, 0.5);
  const avg = trend.reduce((a, b) => a + b, 0) / trend.length;
  const meta = PATTERN_META[pattern];

  const pts = trend.map((v, i) => ({
    x: PAD_X + (trend.length === 1 ? innerW / 2 : (i / (trend.length - 1)) * innerW),
    y: PAD_Y + innerH - (v / max) * innerH,
    v,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(PAD_Y + innerH).toFixed(1)} L${pts[0].x.toFixed(1)},${(PAD_Y + innerH).toFixed(1)} Z`;
  const avgY = PAD_Y + innerH - (avg / max) * innerH;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: H }}
      aria-hidden="true"
    >
      {/* Area fill */}
      <path d={areaPath} fill={meta.color} fillOpacity="0.08" />
      {/* Avg dashed line */}
      <line
        x1={PAD_X} y1={avgY.toFixed(1)} x2={W - PAD_X} y2={avgY.toFixed(1)}
        stroke="rgba(255,255,255,0.1)"
        strokeDasharray="4 3"
        strokeWidth="1"
      />
      {/* Trend line */}
      <path
        d={linePath}
        fill="none"
        stroke={meta.color}
        strokeWidth="1.5"
        strokeOpacity="0.65"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Session dots */}
      {pts.map((p, i) => {
        const isLast = i === pts.length - 1;
        return (
          <circle
            key={i}
            cx={p.x.toFixed(1)}
            cy={p.y.toFixed(1)}
            r={isLast ? 4 : 3}
            fill={meta.color}
            fillOpacity={isLast ? 1 : 0.5}
          />
        );
      })}
      {/* "avg" label */}
      <text
        x={W - PAD_X - 2}
        y={avgY - 3}
        fill="rgba(255,255,255,0.2)"
        fontSize="7"
        textAnchor="end"
      >
        avg
      </text>
    </svg>
  );
}

// Compact mini-sparkline for AnalyticsPanel list view
export function MiniEngagementDots({ trend, pattern, size = 8 }: { trend: number[]; pattern: DopaminePattern; size?: number }) {
  if (trend.length === 0) return null;
  const last6 = trend.slice(-6);
  const max = Math.max(...last6, 0.5);
  const meta = PATTERN_META[pattern];
  return (
    <div className="flex items-end gap-[3px]" style={{ height: size + 4 }}>
      {last6.map((v, i) => {
        const dotSize = Math.max(2, Math.round((v / max) * size));
        return (
          <div
            key={i}
            className="rounded-full shrink-0"
            style={{
              width: dotSize,
              height: dotSize,
              backgroundColor: meta.color,
              opacity: 0.35 + (i / last6.length) * 0.65,
            }}
          />
        );
      })}
    </div>
  );
}

interface SessionEngagementCardProps {
  game: Game;
  compact?: boolean;
}

export function SessionEngagementCard({ game, compact = false }: SessionEngagementCardProps) {
  const curve = useMemo(() => getDopamineCurve(game), [game]);
  const meta = PATTERN_META[curve.pattern];

  const sortedLogs = useMemo(() => {
    if (!game.playLogs || game.playLogs.length === 0) return [];
    return [...game.playLogs].sort(
      (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
    );
  }, [game.playLogs]);

  const sessionsCount = sortedLogs.length;
  if (sessionsCount < 3) return null;

  const mid = Math.floor(sessionsCount / 2);
  const firstHalf = sortedLogs.slice(0, mid);
  const recentThree = sortedLogs.slice(-3);
  const allHours = sortedLogs.map(l => l.hours);
  const firstAvg = firstHalf.reduce((s, l) => s + l.hours, 0) / firstHalf.length;
  const recentAvg = recentThree.reduce((s, l) => s + l.hours, 0) / recentThree.length;
  const overallAvg = allHours.reduce((a, b) => a + b, 0) / allHours.length;
  const maxSession = Math.max(...allHours);

  const trendDir = recentAvg > overallAvg * 1.1 ? 'up' : recentAvg < overallAvg * 0.9 ? 'down' : 'flat';
  const TrendIcon = trendDir === 'up' ? TrendingUp : trendDir === 'down' ? TrendingDown : Minus;
  const trendColor = trendDir === 'up' ? 'text-emerald-400' : trendDir === 'down' ? 'text-red-400' : 'text-white/30';

  const advice = buildAdvice(curve.pattern, firstAvg, recentAvg, sessionsCount);

  if (compact) {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-medium text-white/70 truncate">{game.name}</span>
          </div>
          <div className="text-[10px] text-white/30 truncate">
            {meta.shortDescription}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <MiniEngagementDots trend={curve.sessionTrend} pattern={curve.pattern} />
          <TrendIcon size={11} className={trendColor} />
        </div>
        <div
          className="text-[10px] font-semibold shrink-0 px-1.5 py-0.5 rounded-full"
          style={{ color: meta.color, backgroundColor: meta.dimColor }}
        >
          {meta.label}
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('p-4 rounded-xl border', meta.bgClass, meta.borderClass)}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {meta.icon}
          <span className="text-xs font-semibold" style={{ color: meta.color }}>
            {meta.label}
          </span>
          <span className="text-[10px] text-white/30">{meta.shortDescription}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendIcon size={11} className={trendColor} />
          <span className="text-[10px] text-white/30">{sessionsCount} sessions</span>
        </div>
      </div>

      {/* Session sparkline */}
      <SessionSparkline trend={curve.sessionTrend} pattern={curve.pattern} />

      {/* Advice + stats */}
      <div className="mt-2 space-y-1.5">
        <p className={clsx(
          'text-[10px] leading-snug',
          meta.sentiment === 'warning' ? 'text-amber-400/75' : 'text-emerald-400/75',
        )}>
          {advice}
        </p>
        <div className="flex items-center gap-4 text-[10px] text-white/25 pt-1 border-t border-white/5">
          <span>Avg {overallAvg.toFixed(1)}h</span>
          <span>Longest {maxSession.toFixed(1)}h</span>
          <span>Recent avg {recentAvg.toFixed(1)}h</span>
        </div>
      </div>
    </div>
  );
}
