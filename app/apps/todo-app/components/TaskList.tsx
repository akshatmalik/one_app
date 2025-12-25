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
      <div className="text-center py-10 text-gray-400 text-sm">
        <p>No tasks yet</p>
        <p className="text-xs mt-1 text-gray-300">Add one above to get started</p>
      </div>
    );
  }

  const renderTask = (task: Task) => (
    <div
      key={task.id}
      className={clsx(
        'group flex items-center gap-2.5 p-2.5 rounded-lg border transition-all duration-200',
        task.completed
          ? 'border-gray-100 bg-gray-50/50 hover:bg-gray-50'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      )}
    >
      <button
        onClick={() => onToggle(task.id)}
        className={clsx(
          'flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200',
          task.completed
            ? 'bg-gradient-to-br from-green-500 to-emerald-500 border-green-500 shadow-sm'
            : 'border-gray-300 hover:border-blue-500 hover:scale-110 active:scale-95'
        )}
      >
        {task.completed && <Check size={13} className="text-white" strokeWidth={3} />}
      </button>
      <span
        className={clsx(
          'flex-1 text-sm transition-all duration-200',
          task.completed
            ? 'line-through text-gray-400'
            : 'text-gray-700 group-hover:text-gray-900'
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
