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
      <div className="text-center py-6 text-gray-400 text-xs">
        <p>No tasks yet</p>
      </div>
    );
  }

  const renderTask = (task: Task) => (
    <div
      key={task.id}
      className={clsx(
        'group flex items-center gap-2 p-2 rounded-lg transition-all duration-200',
        task.completed
          ? 'bg-gray-50/50'
          : 'bg-white hover:bg-gray-50/30'
      )}
    >
      <button
        onClick={() => onToggle(task.id)}
        className={clsx(
          'flex-shrink-0 w-4 h-4 rounded flex items-center justify-center transition-all duration-200',
          task.completed
            ? 'bg-gradient-to-br from-green-500 to-emerald-500'
            : 'bg-gray-200 hover:bg-blue-500'
        )}
      >
        {task.completed && <Check size={11} className="text-white" strokeWidth={3} />}
      </button>
      <span
        className={clsx(
          'flex-1 text-xs transition-all duration-200',
          task.completed
            ? 'line-through text-gray-400'
            : 'text-gray-700'
        )}
      >
        {task.text}
      </span>
    </div>
  );

  return (
    <div className="space-y-1">
      {incompleteTasks.map(renderTask)}
      {completedTasks.map(renderTask)}
    </div>
  );
}
