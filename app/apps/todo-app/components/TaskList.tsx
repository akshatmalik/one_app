'use client';

import { useState } from 'react';
import { Task } from '../lib/types';
import { Check, GripVertical } from 'lucide-react';
import clsx from 'clsx';

interface TaskListProps {
  incompleteTasks: Task[];
  completedTasks: Task[];
  onToggle: (id: string) => Promise<void>;
  onReorder: (taskId: string, newOrder: number) => Promise<void>;
}

export function TaskList({ incompleteTasks, completedTasks, onToggle, onReorder }: TaskListProps) {
  const allTasks = [...incompleteTasks, ...completedTasks];
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  if (allTasks.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs">
        <p>No tasks yet</p>
      </div>
    );
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTaskId(taskId);
  };

  const handleDrop = async (e: React.DragEvent, dropTaskId: string) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === dropTaskId) {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      return;
    }

    const draggedIndex = allTasks.findIndex(t => t.id === draggedTaskId);
    const dropIndex = allTasks.findIndex(t => t.id === dropTaskId);

    if (draggedIndex !== -1 && dropIndex !== -1) {
      await onReorder(draggedTaskId, dropIndex);
    }

    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  const renderTask = (task: Task) => (
    <div
      key={task.id}
      className={clsx(
        'group flex items-center gap-2 p-2 rounded-lg transition-all duration-200',
        task.completed
          ? 'bg-slate-700/30 dark:bg-slate-700/30'
          : 'bg-slate-700/50 dark:bg-slate-700/50 hover:bg-slate-700/60 dark:hover:bg-slate-700/60',
        draggedTaskId === task.id && 'opacity-50',
        dragOverTaskId === task.id && 'border-t-2 border-blue-400'
      )}
      onDragOver={(e) => handleDragOver(e, task.id)}
      onDrop={(e) => handleDrop(e, task.id)}
    >
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, task.id)}
        onDragEnd={handleDragEnd}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none p-0.5 -ml-1 hover:bg-slate-600/30 rounded transition-colors"
      >
        <GripVertical size={14} className="text-slate-400 dark:text-slate-500" />
      </div>
      <button
        onClick={() => onToggle(task.id)}
        className={clsx(
          'flex-shrink-0 w-4 h-4 rounded flex items-center justify-center transition-all duration-200',
          task.completed
            ? 'bg-gradient-to-br from-green-500 to-emerald-500'
            : 'bg-slate-600/50 dark:bg-slate-600/50 hover:bg-blue-500 dark:hover:bg-blue-500'
        )}
      >
        {task.completed && <Check size={11} className="text-white" strokeWidth={3} />}
      </button>
      <span
        className={clsx(
          'flex-1 text-xs transition-all duration-200',
          task.completed
            ? 'line-through text-slate-400 dark:text-slate-500'
            : 'text-slate-100 dark:text-slate-200'
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
