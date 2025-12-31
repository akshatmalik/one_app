import { Task } from '../lib/types';

// Sample tasks for testing - will be loaded on first use
export const SAMPLE_TASKS: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    text: 'Morning workout',
    completed: false,
    date: new Date().toISOString().split('T')[0], // Today
    order: 0,
  },
  {
    text: 'Check emails',
    completed: false,
    date: new Date().toISOString().split('T')[0],
    order: 1,
  },
  {
    text: 'Review calendar',
    completed: false,
    date: new Date().toISOString().split('T')[0],
    order: 2,
  },
  {
    text: 'Take vitamins',
    completed: true,
    date: new Date().toISOString().split('T')[0],
    order: 3,
  },
  {
    text: 'Plan tomorrow',
    completed: false,
    date: new Date().toISOString().split('T')[0],
    order: 4,
  },
  {
    text: 'Water plants',
    completed: false,
    date: new Date().toISOString().split('T')[0],
    order: 5,
  },
];
