// Smart Alerts — aggregates existing read-only calculations into a single,
// prioritized, notifiable feed. Pure functions only; no storage/IO here.
import { Game, BudgetSettings } from './types';
import {
  getAllPlayLogs,
  parseLocalDate,
  getSmartNudges,
  getSpendingForecast,
  getShelfLifeExpiry,
  getQueueShameData,
} from './calculations';

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertCategory = 'streak' | 'budget' | 'shelf-life' | 'queue' | 'nudge';

export interface SmartAlert {
  id: string;
  severity: AlertSeverity;
  icon: string;
  title: string;
  body: string;
  category: AlertCategory;
  priority: number; // higher = more urgent/important
  gameId?: string;
}

/** Consecutive-day streak count, anchored at an arbitrary reference date instead of "today". */
function streakEndingOn(games: Game[], referenceDate: Date): number {
  const allLogs = getAllPlayLogs(games);
  if (allLogs.length === 0) return 0;

  const uniqueDates = Array.from(new Set(allLogs.map(l => l.log.date))).sort().reverse();
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);

  let streak = 0;
  for (const dateStr of uniqueDates) {
    const logDate = parseLocalDate(dateStr);
    logDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((ref.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === streak) {
      streak++;
    } else if (diffDays > streak) {
      break;
    }
  }
  return streak;
}

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getSmartAlerts(games: Game[], budgets: BudgetSettings[]): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const owned = games.filter(g => g.status !== 'Wishlist');
  if (owned.length === 0) return alerts;

  // ── Streak at risk ─────────────────────────────────────────────
  const today = todayDateStr();
  const playedToday = getAllPlayLogs(games).some(l => l.log.date === today);
  if (!playedToday) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const streakThroughYesterday = streakEndingOn(games, yesterday);
    if (streakThroughYesterday >= 3) {
      alerts.push({
        id: 'streak-at-risk',
        severity: streakThroughYesterday >= 7 ? 'critical' : 'warning',
        icon: '🔥',
        title: `${streakThroughYesterday}-day streak on the line`,
        body: `Play something today to keep your ${streakThroughYesterday}-day streak alive.`,
        category: 'streak',
        priority: 80 + Math.min(streakThroughYesterday, 20),
      });
    }
  }

  // ── Budget risk ────────────────────────────────────────────────
  const year = new Date().getFullYear();
  const budget = budgets.find(b => b.year === year);
  if (budget && budget.yearlyBudget > 0) {
    const forecast = getSpendingForecast(games, year, budget.yearlyBudget);
    if (forecast.onTrack === 'over') {
      alerts.push({
        id: `budget-over-${year}`,
        severity: 'critical',
        icon: '💸',
        title: `${year} budget projected to bust`,
        body: `At this pace you're on track to spend $${forecast.projectedAnnual.toFixed(0)} against a $${forecast.budgetAmount?.toFixed(0)} budget.`,
        category: 'budget',
        priority: 95,
      });
    } else if (forecast.onTrack === 'close') {
      alerts.push({
        id: `budget-close-${year}`,
        severity: 'warning',
        icon: '💸',
        title: `Close to your ${year} budget`,
        body: `You've spent $${forecast.currentYearSpent.toFixed(0)} so far — projected to land near your $${forecast.budgetAmount?.toFixed(0)} budget.`,
        category: 'budget',
        priority: 60,
      });
    }
  }

  // ── Shelf-life expiry (worst 2) ────────────────────────────────
  const expiring = owned
    .filter(g => g.status === 'In Progress' || g.status === 'Not Started')
    .map(g => ({ game: g, expiry: getShelfLifeExpiry(g, games) }))
    .filter(({ expiry }) => expiry.tier === 'critical' || expiry.tier === 'at_risk')
    .sort((a, b) => {
      const order = { critical: 0, at_risk: 1 } as Record<string, number>;
      return (order[a.expiry.tier] ?? 9) - (order[b.expiry.tier] ?? 9);
    })
    .slice(0, 2);

  for (const { game, expiry } of expiring) {
    alerts.push({
      id: `shelf-${game.id}`,
      severity: expiry.tier === 'critical' ? 'critical' : 'warning',
      icon: '⏳',
      title: `${game.name} is ${expiry.tier === 'critical' ? 'about to expire' : 'cooling off'}`,
      body: expiry.reasoning,
      category: 'shelf-life',
      priority: expiry.tier === 'critical' ? 75 : 45,
      gameId: game.id,
    });
  }

  // ── Queue shame (worst 1) ──────────────────────────────────────
  const queued = owned.filter(g => g.queuePosition != null);
  const shamed = queued
    .map(g => ({ game: g, shame: getQueueShameData(g, games) }))
    .filter((x): x is { game: Game; shame: NonNullable<ReturnType<typeof getQueueShameData>> } => !!x.shame)
    .filter(({ shame }) => shame.tier === 'embarrassing' || shame.tier === 'hall_of_shame')
    .sort((a, b) => b.shame.daysQueued - a.shame.daysQueued)
    .slice(0, 1);

  for (const { game, shame } of shamed) {
    alerts.push({
      id: `queue-${game.id}`,
      severity: shame.tier === 'hall_of_shame' ? 'critical' : 'warning',
      icon: shame.icon || '📋',
      title: `${game.name} has waited ${shame.daysQueued} days`,
      body: shame.message,
      category: 'queue',
      priority: shame.tier === 'hall_of_shame' ? 55 : 35,
      gameId: game.id,
    });
  }

  // ── Fold in top smart nudges not already covered above ─────────
  const coveredCategories = new Set(['streak']);
  const nudges = getSmartNudges(games).filter(n => !coveredCategories.has(n.type)).slice(0, 2);
  for (const nudge of nudges) {
    alerts.push({
      id: `nudge-${nudge.type}-${nudge.text.slice(0, 24)}`,
      severity: 'info',
      icon: '✨',
      title: nudge.text,
      body: '',
      category: 'nudge',
      priority: Math.min(nudge.priority, 50),
    });
  }

  return alerts.sort((a, b) => b.priority - a.priority);
}
