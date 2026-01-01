'use client';

import { useState, useEffect, useCallback } from 'react';
import { repository } from '../lib/storage';
import { Task } from '../lib/types';
import { parseTaskText } from '../lib/calculations';

export function useTasks(date: string, userId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Set userId on repository - use 'local-user' for local mode
      repository.setUserId(userId || 'local-user');

      const tasksForDate = await repository.getByDate(date);
      setTasks(tasksForDate);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [date, userId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const addTask = async (rawText: string) => {
    try {
      const tasksForDate = await repository.getByDate(date);
      const maxOrder = tasksForDate.length > 0
        ? Math.max(...tasksForDate.map(t => t.order || 0))
        : 0;

      // Parse text to extract category and priority
      const { text, priority, category } = parseTaskText(rawText);

      await repository.create({
        text,
        completed: false,
        date,
        order: maxOrder + 1,
        priority,
        category,
        points: 1,
      });
      await loadTasks();
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const toggleTask = async (id: string) => {
    try {
      const task = tasks.find(t => t.id === id);
      if (task) {
        await repository.update(id, { completed: !task.completed });
        await loadTasks();
      }
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await repository.delete(id);
      await loadTasks();
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const moveTaskToDate = async (id: string, newDate: string) => {
    try {
      await repository.update(id, { date: newDate });
      await loadTasks();
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const getPastIncompleteTasks = async (): Promise<Task[]> => {
    try {
      return await repository.getIncompleteBefore(date);
    } catch (e) {
      setError(e as Error);
      return [];
    }
  };

  const reorderTasks = async (taskId: string, newOrder: number) => {
    try {
      const tasksToUpdate = [...tasks];
      const taskIndex = tasksToUpdate.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return;

      const [movedTask] = tasksToUpdate.splice(taskIndex, 1);
      tasksToUpdate.splice(newOrder, 0, movedTask);

      // Update order for all tasks
      for (let i = 0; i < tasksToUpdate.length; i++) {
        await repository.update(tasksToUpdate[i].id, { order: i });
      }

      await loadTasks();
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  // Separate tasks into completed and incomplete
  // Sort incomplete by priority first (P1 first), then by order
  const incompleteTasks = tasks
    .filter(t => !t.completed)
    .sort((a, b) => {
      const priorityDiff = (a.priority ?? 4) - (b.priority ?? 4);
      if (priorityDiff !== 0) return priorityDiff;
      return (a.order || 0) - (b.order || 0);
    });

  const completedTasks = tasks
    .filter(t => t.completed)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const stats = {
    completed: completedTasks.length,
    total: tasks.length,
  };

  return {
    tasks,
    incompleteTasks,
    completedTasks,
    stats,
    loading,
    error,
    addTask,
    toggleTask,
    deleteTask,
    moveTaskToDate,
    getPastIncompleteTasks,
    reorderTasks,
    refresh: loadTasks,
  };
}
