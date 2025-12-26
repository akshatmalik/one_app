'use client';

import { useState } from 'react';
import { Task } from '../lib/types';
import { Check } from 'lucide-react';
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
      <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-xs">
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
        'group flex items-center gap-2 p-2 rounded-lg transition-all duration-200 cursor-move',
        task.completed
          ? 'bg-gray-50/50 dark:bg-gray-700/50'
          : 'bg-white dark:bg-gray-700 hover:bg-gray-50/30 dark:hover:bg-gray-600/30',
        draggedTaskId === task.id && 'opacity-50',
        dragOverTaskId === task.id && 'border-t-2 border-blue-500'
      )}
      draggable
      onDragStart={(e) => handleDragStart(e, task.id)}
      onDragOver={(e) => handleDragOver(e, task.id)}
      onDrop={(e) => handleDrop(e, task.id)}
      onDragEnd={handleDragEnd}
    >
      <button
        onClick={() => onToggle(task.id)}
        className={clsx(
          'flex-shrink-0 w-4 h-4 rounded flex items-center justify-center transition-all duration-200',
          task.completed
            ? 'bg-gradient-to-br from-green-500 to-emerald-500'
            : 'bg-gray-200 dark:bg-gray-600 hover:bg-blue-500'
        )}
      >
        {task.completed && <Check size={11} className="text-white" strokeWidth={3} />}
      </button>
      <span
        className={clsx(
          'flex-1 text-xs transition-all duration-200',
          task.completed
            ? 'line-through text-gray-400 dark:text-gray-500'
            : 'text-gray-700 dark:text-gray-300'
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
