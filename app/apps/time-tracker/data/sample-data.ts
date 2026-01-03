import { Category, SchedulePreset, TimeEntry, TimeBlock } from '../lib/types';
import { v4 as uuidv4 } from 'uuid';

// Sample categories
export const SAMPLE_CATEGORIES: Omit<Category, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Work', color: '#3B82F6' },
  { name: 'Personal', color: '#10B981' },
  { name: 'Health', color: '#EF4444' },
  { name: 'Learning', color: '#8B5CF6' },
];

// Sample time blocks for a workday schedule
const createSampleTimeBlocks = (): TimeBlock[] => [
  {
    id: uuidv4(),
    activityName: 'Morning Routine',
    startTime: '07:00',
    endTime: '08:00',
    duration: 60,
  },
  {
    id: uuidv4(),
    activityName: 'Deep Work',
    startTime: '09:00',
    endTime: '11:00',
    duration: 120,
  },
  {
    id: uuidv4(),
    activityName: 'Lunch Break',
    startTime: '12:00',
    endTime: '13:00',
    duration: 60,
  },
  {
    id: uuidv4(),
    activityName: 'Meetings',
    startTime: '14:00',
    endTime: '16:00',
    duration: 120,
  },
  {
    id: uuidv4(),
    activityName: 'Exercise',
    startTime: '17:00',
    endTime: '18:00',
    duration: 60,
  },
];

// Sample schedule preset
export const SAMPLE_SCHEDULE: Omit<SchedulePreset, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  name: 'Workday',
  daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  timeBlocks: createSampleTimeBlocks(),
  isActive: true,
};

// Sample time entries for today
export const createSampleTimeEntries = (today: string): Omit<TimeEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] => {
  const startOfDay = new Date(today + 'T07:00:00');

  return [
    {
      date: today,
      activityName: 'Morning Routine',
      startTime: new Date(today + 'T07:00:00').toISOString(),
      endTime: new Date(today + 'T07:45:00').toISOString(),
      duration: 45,
      notes: 'Meditation and breakfast',
    },
    {
      date: today,
      activityName: 'Deep Work',
      startTime: new Date(today + 'T09:00:00').toISOString(),
      endTime: new Date(today + 'T11:30:00').toISOString(),
      duration: 150,
      notes: 'Worked on project proposal',
    },
    {
      date: today,
      activityName: 'Lunch Break',
      startTime: new Date(today + 'T12:00:00').toISOString(),
      endTime: new Date(today + 'T12:45:00').toISOString(),
      duration: 45,
    },
    {
      date: today,
      activityName: 'Emails',
      startTime: new Date(today + 'T13:00:00').toISOString(),
      endTime: new Date(today + 'T14:00:00').toISOString(),
      duration: 60,
      notes: 'Caught up on inbox',
    },
  ];
};
