'use client';

import { useMemo } from 'react';
import { Moon, ArrowRight, Bell, Sparkles, Radar, Hourglass } from 'lucide-react';
import { Game } from '../lib/types';
import { GameAlert, ReplayCandidate, WishlistAffordabilityItem, ALERT_SEVERITY_ORDER, getQueueShameData, QueueShameTier } from '../lib/calculations';
import { TimeCapsule } from '../lib/timecapsule-storage';
import { OnThisDayCard } from './OnThisDayCard';
import { FortuneCookie } from './FortuneCookie';
import { DailyQuestPanel } from './DailyQuestPanel';
import { ActivityPulse } from './ActivityPulse';
import clsx from 'clsx';

interface TodayDashboardProps {
  games: Game[];
  userId: string;
  replayCandidate?: ReplayCandidate;
  wishlistNextAffordable?: WishlistAffordabilityItem;
  alerts: GameAlert[];
  onAlertAction: (alert: GameAlert) => void;
  onPlayTonight: () => void;
  dueCapsules?: TimeCapsule[];
  onOpenTimeCapsule?: () => void;
  onOpenReplayRadar?: () => void;
  onOpenQueue?: () => void;
}

const SHAME_TIER_RANK: Record<QueueShameTier, number> = {
  fresh: 0,
  warming: 1,
  getting_awkward: 2,
  embarrassing: 3,
  hall_of_shame: 4,
};

const SEVERITY_STYLES: Record<GameAlert['severity'], { border: string; bg: string; text: string }> = {
  critical: { border: 'border-red-500/30', bg: 'bg-red-500/10', text: 'text-red-300' },
  warning: { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-300' },
  info: { border: 'border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-300' },
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Late night session';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function TodayDashboard({ games, userId, replayCandidate, wishlistNextAffordable, alerts, onAlertAction, onPlayTonight, dueCapsules, onOpenTimeCapsule, onOpenReplayRadar, onOpenQueue }: TodayDashboardProps) {
  const greeting = useMemo(() => getGreeting(), []);
  const dateLabel = useMemo(() => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }), []);
  const topAlert = useMemo(() => {
    if (alerts.length === 0) return undefined;
    return [...alerts].sort((a, b) => ALERT_SEVERITY_ORDER[a.severity] - ALERT_SEVERITY_ORDER[b.severity])[0];
  }, [alerts]);

  const worstQueueShame = useMemo(() => {
    let worst: { game: Game; shame: NonNullable<ReturnType<typeof getQueueShameData>> } | null = null;
    for (const g of games) {
      const shame = getQueueShameData(g, games);
      if (!shame || shame.tier === 'fresh') continue;
      if (!worst || SHAME_TIER_RANK[shame.tier] > SHAME_TIER_RANK[worst.shame.tier]) {
        worst = { game: g, shame };
      }
    }
    return worst;
  }, [games]);

  if (games.length === 0) {
    return (
      <div className="text-center py-16 text-white/40">
        <p className="text-sm">Add a few games to unlock your daily dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">{greeting}</h2>
          <p className="text-sm text-white/40">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <ActivityPulse games={games} />
          <button
            onClick={onPlayTonight}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 transition-colors text-sm font-medium"
          >
            <Moon size={14} /> Play Tonight
          </button>
        </div>
      </div>

      {topAlert && (
        <button
          onClick={() => onAlertAction(topAlert)}
          className={clsx(
            'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-colors',
            SEVERITY_STYLES[topAlert.severity].border,
            SEVERITY_STYLES[topAlert.severity].bg,
            'hover:brightness-110'
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Bell size={16} className={clsx('flex-shrink-0', SEVERITY_STYLES[topAlert.severity].text)} />
            <div className="min-w-0">
              <p className={clsx('text-sm font-medium truncate', SEVERITY_STYLES[topAlert.severity].text)}>{topAlert.title}</p>
              <p className="text-xs text-white/40 truncate">{topAlert.message}</p>
            </div>
          </div>
          <span className="flex-shrink-0 flex items-center gap-1 text-xs text-white/40">
            {topAlert.actionLabel} <ArrowRight size={12} />
          </span>
        </button>
      )}

      {dueCapsules && dueCapsules.length > 0 && onOpenTimeCapsule && (
        <button
          onClick={onOpenTimeCapsule}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-violet-400/30 bg-violet-500/10 text-left transition-colors hover:brightness-110"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Sparkles size={16} className="flex-shrink-0 text-violet-300" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate text-violet-300">
                {dueCapsules.length === 1 ? 'A time capsule is ready to open' : `${dueCapsules.length} time capsules are ready to open`}
              </p>
              <p className="text-xs text-white/40 truncate">&ldquo;{dueCapsules[0].note}&rdquo;</p>
            </div>
          </div>
          <span className="flex-shrink-0 flex items-center gap-1 text-xs text-white/40">
            Open <ArrowRight size={12} />
          </span>
        </button>
      )}

      {replayCandidate && onOpenReplayRadar && (
        <button
          onClick={onOpenReplayRadar}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-left transition-colors hover:brightness-110"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Radar size={16} className="flex-shrink-0 text-emerald-300" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate text-emerald-300">Worth revisiting: {replayCandidate.game.name}</p>
              <p className="text-xs text-white/40 truncate">{replayCandidate.headline}</p>
            </div>
          </div>
          <span className="flex-shrink-0 flex items-center gap-1 text-xs text-white/40">
            Replay Radar <ArrowRight size={12} />
          </span>
        </button>
      )}

      {worstQueueShame && onOpenQueue && (
        <button
          onClick={onOpenQueue}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-colors hover:brightness-110"
          style={{ borderColor: `${worstQueueShame.shame.color}4d`, backgroundColor: `${worstQueueShame.shame.color}1a` }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Hourglass size={16} className="flex-shrink-0" style={{ color: worstQueueShame.shame.color }} />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: worstQueueShame.shame.color }}>
                {worstQueueShame.shame.icon} {worstQueueShame.game.name} — {worstQueueShame.shame.tierLabel}
              </p>
              <p className="text-xs text-white/40 truncate">{worstQueueShame.shame.message}</p>
            </div>
          </div>
          <span className="flex-shrink-0 flex items-center gap-1 text-xs text-white/40">
            View Queue <ArrowRight size={12} />
          </span>
        </button>
      )}

      <OnThisDayCard games={games} />
      <FortuneCookie games={games} replayCandidate={replayCandidate} wishlistNextAffordable={wishlistNextAffordable} />
      <DailyQuestPanel games={games} userId={userId} />
    </div>
  );
}
