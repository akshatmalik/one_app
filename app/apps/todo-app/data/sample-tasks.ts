import { Task } from '../lib/types';

// Sample tasks for testing - will be loaded on first use
export const SAMPLE_TASKS: Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
  {
    text: 'Morning workout',
    completed: false,
    date: new Date().toISOString().split('T')[0], // Today
    order: 0,
    priority: 2,
    category: 'health',
    points: 1,
  },
  {
    text: 'Check emails',
    completed: false,
    date: new Date().toISOString().split('T')[0],
    order: 1,
    priority: 3,
    category: 'work',
    points: 1,
  },
  {
    text: 'Review calendar',
    completed: false,
    date: new Date().toISOString().split('T')[0],
    order: 2,
    priority: 4,
    points: 1,
  },
  {
    text: 'Take vitamins',
    completed: true,
    date: new Date().toISOString().split('T')[0],
    order: 3,
    priority: 4,
    category: 'health',
    points: 1,
  },
  {
    text: 'Plan tomorrow',
    completed: false,
    date: new Date().toISOString().split('T')[0],
    order: 4,
    priority: 3,
    points: 1,
  },
  {
    text: 'Water plants',
    completed: false,
    date: new Date().toISOString().split('T')[0],
    order: 5,
    priority: 4,
    category: 'personal',
    points: 1,
  },
];
