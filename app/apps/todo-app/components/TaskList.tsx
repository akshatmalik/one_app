'use client';

import { Task } from '../lib/types';
import { Check } from 'lucide-react';
import clsx from 'clsx';

interface TaskListProps {
  incompleteTasks: Task[];
  completedTasks: Task[];
  onToggle: (id: string) => Promise<void>;
}

export function TaskList({ incompleteTasks, completedTasks, onToggle }: TaskListProps) {
  const allTasks = [...incompleteTasks, ...completedTasks];

  if (allTasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        <p>No tasks yet</p>
      </div>
    );
  }

  const renderTask = (task: Task) => (
    <div
      key={task.id}
      className={clsx(
        'flex items-center gap-2 p-2.5 bg-white rounded border transition-all',
        task.completed ? 'border-gray-200 bg-gray-50' : 'border-gray-300'
      )}
    >
      <button
        onClick={() => onToggle(task.id)}
        className={clsx(
          'flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
          task.completed
            ? 'bg-green-500 border-green-500'
            : 'border-gray-300 hover:border-blue-500'
        )}
      >
        {task.completed && <Check size={14} className="text-white" />}
      </button>
      <span
        className={clsx(
          'flex-1 text-sm',
          task.completed
            ? 'line-through text-gray-500'
            : 'text-gray-900'
        )}
      >
        {task.text}
      </span>
    </div>
  );

  return (
    <div className="space-y-1.5">
      {incompleteTasks.map(renderTask)}
      {completedTasks.map(renderTask)}
    </div>
  );
}
