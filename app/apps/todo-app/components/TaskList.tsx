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
      <div className="text-center py-12 text-gray-500">
        <p>No tasks for this day yet.</p>
        <p className="text-sm mt-2">Add your first task above!</p>
      </div>
    );
  }

  const renderTask = (task: Task) => (
    <div
      key={task.id}
      className={clsx(
        'flex items-start gap-3 p-4 bg-white rounded-lg border transition-all hover:shadow-sm',
        task.completed ? 'border-gray-200 bg-gray-50' : 'border-gray-300'
      )}
    >
      <button
        onClick={() => onToggle(task.id)}
        className={clsx(
          'flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all mt-0.5',
          task.completed
            ? 'bg-green-500 border-green-500'
            : 'border-gray-300 hover:border-blue-500'
        )}
      >
        {task.completed && <Check size={16} className="text-white" />}
      </button>
      <span
        className={clsx(
          'flex-1 text-base',
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
    <div className="space-y-2">
      {incompleteTasks.map(renderTask)}
      {completedTasks.map(renderTask)}
    </div>
  );
}
