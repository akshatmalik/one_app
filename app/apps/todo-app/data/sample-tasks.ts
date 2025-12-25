import { Task } from '../lib/types';

// Sample tasks for testing - will be loaded on first use
export const SAMPLE_TASKS: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    text: 'Morning workout',
    completed: false,
    date: new Date().toISOString().split('T')[0], // Today
  },
  {
    text: 'Check emails',
    completed: false,
    date: new Date().toISOString().split('T')[0],
  },
  {
    text: 'Review calendar',
    completed: false,
    date: new Date().toISOString().split('T')[0],
  },
  {
    text: 'Take vitamins',
    completed: true,
    date: new Date().toISOString().split('T')[0],
  },
  {
    text: 'Plan tomorrow',
    completed: false,
    date: new Date().toISOString().split('T')[0],
  },
  {
    text: 'Water plants',
    completed: false,
    date: new Date().toISOString().split('T')[0],
  },
];
