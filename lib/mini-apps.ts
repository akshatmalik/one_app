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
];

export function getMiniAppById(id: string): MiniApp | undefined {
  return MINI_APPS.find(app => app.id === id);
}
