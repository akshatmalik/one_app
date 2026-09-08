'use client';

import { useEffect, useMemo, useState } from 'react';
import { Game } from '../lib/types';
import { getDailyQuestSet, DailyQuestSet } from '../lib/calculations';
import { recordQuestDay, getQuestStreak, getQuestHistory, QuestDayRecord } from '../lib/quest-storage';

export interface QuestHistoryDay {
  date: string;
  completed: number;
  total: number;
  isToday: boolean;
}

export function useDailyQuests(games: Game[], userId: string) {
  const questSet: DailyQuestSet = useMemo(() => getDailyQuestSet(games), [games]);
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<QuestDayRecord[]>([]);

  useEffect(() => {
    if (questSet.quests.length === 0) return;
    recordQuestDay(userId, {
      date: questSet.date,
      completedCount: questSet.completedCount,
      totalCount: questSet.quests.length,
    });
    setStreak(getQuestStreak(userId, questSet.date));
    setHistory(getQuestHistory(userId));
  }, [userId, questSet.date, questSet.completedCount, questSet.quests.length, questSet.allComplete]);

  // Last 7 calendar days (oldest first, today last) for a visible streak strip.
  const last7Days: QuestHistoryDay[] = useMemo(() => {
    const byDate = new Map(history.map(r => [r.date, r]));
    const days: QuestHistoryDay[] = [];
    const todayCursor = new Date(`${questSet.date}T00:00:00`);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayCursor);
      d.setDate(d.getDate() - i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const isToday = dStr === questSet.date;
      const record: QuestDayRecord | undefined = isToday
        ? { date: dStr, completedCount: questSet.completedCount, totalCount: questSet.quests.length }
        : byDate.get(dStr);
      days.push({
        date: dStr,
        completed: record?.completedCount ?? 0,
        total: record?.totalCount ?? 0,
        isToday,
      });
    }
    return days;
  }, [history, questSet.date, questSet.completedCount, questSet.quests.length]);

  return { questSet, streak, last7Days };
}
