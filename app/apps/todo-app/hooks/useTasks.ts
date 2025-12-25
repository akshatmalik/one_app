'use client';

import { useState, useEffect, useCallback } from 'react';
import { repository } from '../lib/storage';
import { Task } from '../lib/types';
import { SAMPLE_TASKS } from '../data/sample-tasks';

export function useTasks(date: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if this is first time - if no tasks exist, load samples
      const allTasks = await repository.getAll();
      if (allTasks.length === 0) {
        // Load sample tasks
        for (const sampleTask of SAMPLE_TASKS) {
          await repository.create(sampleTask);
        }
      }

      const tasksForDate = await repository.getByDate(date);
      setTasks(tasksForDate);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const addTask = async (text: string) => {
    try {
      await repository.create({
        text,
        completed: false,
        date,
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

  // Separate tasks into completed and incomplete, sort by creation time
  const incompleteTasks = tasks
    .filter(t => !t.completed)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const completedTasks = tasks
    .filter(t => t.completed)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

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
    refresh: loadTasks,
  };
}
