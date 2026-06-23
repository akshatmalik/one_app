'use client';

import { useEffect, useMemo, useState } from 'react';
import { Game } from '../lib/types';
import { getDailyQuestSet, DailyQuestSet } from '../lib/calculations';
import { recordQuestDay, getQuestStreak } from '../lib/quest-storage';

export function useDailyQuests(games: Game[], userId: string) {
  const questSet: DailyQuestSet = useMemo(() => getDailyQuestSet(games), [games]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (questSet.quests.length === 0) return;
    recordQuestDay(userId, {
      date: questSet.date,
      completedCount: questSet.completedCount,
      totalCount: questSet.quests.length,
    });
    setStreak(getQuestStreak(userId, questSet.date));
  }, [userId, questSet.date, questSet.completedCount, questSet.quests.length]);

  return { questSet, streak };
}
