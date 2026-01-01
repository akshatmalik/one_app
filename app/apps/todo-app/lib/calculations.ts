import { Task, TaskStats, DailyCompletion, Priority } from './types';

/**
 * Calculate stats for tasks in a given date range
 */
export function calculateStats(allTasks: Task[], completedTasks: Task[]): TaskStats {
  const completed = completedTasks.length;
  const total = allTasks.length;
  const points = completedTasks.reduce((sum, task) => sum + (task.points || 1), 0);
  const completionRate = total > 0 ? (completed / total) * 100 : 0;

  // Calculate by priority
  const byPriority: Record<Priority, { completed: number; total: number }> = {
    1: { completed: 0, total: 0 },
    2: { completed: 0, total: 0 },
    3: { completed: 0, total: 0 },
    4: { completed: 0, total: 0 },
  };

  allTasks.forEach(task => {
    const priority = task.priority ?? 4;
    byPriority[priority].total += 1;
    if (task.completed) {
      byPriority[priority].completed += 1;
    }
  });

  // Calculate by category
  const byCategory: Record<string, { completed: number; total: number; points: number }> = {};

  allTasks.forEach(task => {
    const category = task.category || 'Inbox';
    if (!byCategory[category]) {
      byCategory[category] = { completed: 0, total: 0, points: 0 };
    }
    byCategory[category].total += 1;
    if (task.completed) {
      byCategory[category].completed += 1;
      byCategory[category].points += task.points || 1;
    }
  });

  // Calculate streaks
  const { currentStreak, longestStreak } = calculateStreaks(completedTasks);

  return {
    completed,
    total,
    points,
    completionRate,
    byPriority,
    byCategory,
    currentStreak,
    longestStreak,
  };
}

/**
 * Calculate current and longest streak of completing tasks
 * A streak day requires at least 1 completed task
 */
export function calculateStreaks(completedTasks: Task[]): { currentStreak: number; longestStreak: number } {
  if (completedTasks.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Get unique dates when tasks were completed
  const completedDates = new Set<string>();
  completedTasks.forEach(task => {
    if (task.completedAt) {
      const date = task.completedAt.split('T')[0];
      completedDates.add(date);
    }
  });

  const sortedDates = Array.from(completedDates).sort();

  if (sortedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Calculate current streak (from today going backwards)
  const today = new Date().toISOString().split('T')[0];
  let currentStreak = 0;
  let checkDate = new Date(today);

  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (completedDates.has(dateStr)) {
      currentStreak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // If today has no completed tasks, check yesterday
      if (currentStreak === 0 && dateStr === today) {
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      }
      break;
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currDate = new Date(sortedDates[i]);
    const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 1) {
      tempStreak += 1;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return { currentStreak, longestStreak };
}

/**
 * Get daily completion data for charting
 */
export function getDailyCompletionData(completedTasks: Task[], days: number): DailyCompletion[] {
  const dailyData = new Map<string, { completed: number; points: number }>();

  // Initialize all days
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailyData.set(dateStr, { completed: 0, points: 0 });
  }

  // Populate with actual data
  completedTasks.forEach(task => {
    if (task.completedAt) {
      const date = task.completedAt.split('T')[0];
      if (dailyData.has(date)) {
        const data = dailyData.get(date)!;
        data.completed += 1;
        data.points += task.points || 1;
      }
    }
  });

  // Convert to array
  return Array.from(dailyData.entries())
    .map(([date, data]) => ({
      date,
      completed: data.completed,
      points: data.points,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get date range for a period
 */
export function getDateRange(period: 'week' | 'month'): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();

  if (period === 'week') {
    start.setDate(start.getDate() - 7);
  } else {
    start.setDate(start.getDate() - 30);
  }

  return {
    startDate: start.toISOString().split('T')[0] + 'T00:00:00.000Z',
    endDate: end.toISOString(),
  };
}

/**
 * Parse task text to extract category and priority
 * Examples:
 * "Fix bug !1 @work" -> { text: "Fix bug", priority: 1, category: "work" }
 * "Buy groceries @shopping !3" -> { text: "Buy groceries", priority: 3, category: "shopping" }
 */
export function parseTaskText(input: string): { text: string; priority: Priority; category?: string } {
  let text = input;
  let priority: Priority = 4;
  let category: string | undefined;

  // Extract priority (!1, !2, !3, !4)
  const priorityMatch = input.match(/!([1-4])(?:\s|$)/);
  if (priorityMatch) {
    priority = parseInt(priorityMatch[1]) as Priority;
    text = text.replace(/!([1-4])(?:\s|$)/, '').trim();
  }

  // Extract category (@categoryname)
  const categoryMatch = input.match(/@(\w+)(?:\s|$)/);
  if (categoryMatch) {
    category = categoryMatch[1];
    text = text.replace(/@(\w+)(?:\s|$)/, '').trim();
  }

  return { text, priority, category };
}
