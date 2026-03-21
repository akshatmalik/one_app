import { MiniApp } from '@/types/mini-app';

export const MINI_APPS: MiniApp[] = [
  {
    id: 'game-analytics',
    name: 'Game Analytics',
    description: 'Track game purchases, hours played, and value metrics',
    icon: '🎮',
    path: '/apps/game-analytics',
    color: '#8B5CF6',
    tags: ['analytics', 'gaming'],
    isNew: true,
  },
  {
    id: 'todo-app',
    name: 'Daily Tasks',
    description: 'Simple daily task tracker with date navigation and past task review',
    icon: '✓',
    path: '/apps/todo-app',
    color: '#3B82F6',
    tags: ['productivity', 'tasks'],
    isNew: true,
  },
  {
    id: 'time-tracker',
    name: 'Time Tracker',
    description: 'Track daily activities with timers and compare against planned schedules',
    icon: '⏱️',
    path: '/apps/time-tracker',
    color: '#10B981',
    tags: ['productivity', 'time-management'],
    isNew: true,
  },
  {
    id: 'mood-tracker',
    name: 'Mood Tracker',
    description: 'Track daily moods, tags, and journal entries in a beautiful year view',
    icon: '😊',
    path: '/apps/mood-tracker',
    color: '#EC4899',
    tags: ['wellness', 'journaling'],
    isNew: true,
  },
  {
    id: 'last-light',
    name: 'Last Light',
    description: 'AI-powered text adventure survival game with dynamic storytelling',
    icon: '🧟',
    path: '/apps/last-light',
    color: '#1F2937',
    tags: ['game', 'story', 'ai'],
    isNew: true,
  },
  {
    id: 'survivor-deckbuilder',
    name: 'Survivor Deck-Builder',
    description: 'Tactical deck-building zombie survival game with expeditions and card synergies',
    icon: '🎯',
    path: '/apps/survivor-deckbuilder',
    color: '#DC2626',
    tags: ['game', 'cards', 'strategy'],
    isNew: true,
  },
];

export function getMiniAppById(id: string): MiniApp | undefined {
  return MINI_APPS.find(app => app.id === id);
}
