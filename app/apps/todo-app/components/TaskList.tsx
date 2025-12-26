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

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'p1': return 'bg-red-500';
      case 'p2': return 'bg-orange-500';
      case 'p3': return 'bg-blue-500';
      case 'p4': return 'bg-gray-400';
      default: return 'bg-gray-300';
    }
  };

  const renderTask = (task: Task) => (
    <div
      key={task.id}
      className={clsx(
        'group flex items-center gap-2 p-2 rounded-lg border transition-all duration-200',
        task.completed
          ? 'border-gray-100 bg-gray-50/50 hover:bg-gray-50'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      )}
    >
      <button
        onClick={() => onToggle(task.id)}
        className={clsx(
          'flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200',
          task.completed
            ? 'bg-gradient-to-br from-green-500 to-emerald-500 border-green-500 shadow-sm'
            : 'border-gray-300 hover:border-blue-500 hover:scale-110 active:scale-95'
        )}
      >
        {task.completed && <Check size={11} className="text-white" strokeWidth={3} />}
      </button>
      <div className="flex-1 flex items-center gap-1.5">
        <span
          className={clsx(
            'text-xs transition-all duration-200',
            task.completed
              ? 'line-through text-gray-400'
              : 'text-gray-700 group-hover:text-gray-900'
          )}
        >
          {task.text}
        </span>
        {task.category && (
          <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">
            @{task.category}
          </span>
        )}
        {task.priority && (
          <span className={clsx(
            'w-1.5 h-1.5 rounded-full flex-shrink-0',
            getPriorityColor(task.priority)
          )} />
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-1">
      {incompleteTasks.map(renderTask)}
      {completedTasks.map(renderTask)}
    </div>
  );
}
