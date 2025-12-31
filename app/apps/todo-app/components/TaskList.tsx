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
      <div className="text-center py-8 text-gray-400 text-sm">
        <p>No tasks yet. Add one above!</p>
      </div>
    );
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedTaskId !== taskId) {
      setDragOverTaskId(taskId);
    }
  };

  const handleDragLeave = () => {
    setDragOverTaskId(null);
  };

  const handleDrop = async (e: React.DragEvent, dropTaskId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;

    if (!taskId || taskId === dropTaskId) {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      return;
    }

    const draggedIndex = allTasks.findIndex(t => t.id === taskId);
    const dropIndex = allTasks.findIndex(t => t.id === dropTaskId);

    if (draggedIndex !== -1 && dropIndex !== -1) {
      await onReorder(taskId, dropIndex);
    }

    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  const renderTask = (task: Task, index: number) => (
    <div
      key={task.id}
      draggable
      onDragStart={(e) => handleDragStart(e, task.id)}
      onDragOver={(e) => handleDragOver(e, task.id)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, task.id)}
      onDragEnd={handleDragEnd}
      className={clsx(
        'group flex items-center gap-3 p-3 rounded-lg transition-all duration-200 cursor-grab active:cursor-grabbing',
        task.completed
          ? 'bg-gray-50'
          : 'bg-gray-50 hover:bg-gray-100',
        draggedTaskId === task.id && 'opacity-50 scale-[0.98]',
        dragOverTaskId === task.id && draggedTaskId !== task.id && 'border-t-2 border-purple-400 -mt-0.5'
      )}
    >
      <div className="flex-shrink-0 p-0.5 hover:bg-gray-200 rounded transition-colors">
        <GripVertical size={16} className="text-gray-400" />
      </div>
      <button
        onClick={() => onToggle(task.id)}
        className={clsx(
          'flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200',
          task.completed
            ? 'bg-green-500 border-green-500'
            : 'border-gray-300 hover:border-purple-500'
        )}
      >
        {task.completed && <Check size={12} className="text-white" strokeWidth={3} />}
      </button>
      <span
        className={clsx(
          'flex-1 text-sm transition-all duration-200',
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
    <div className="space-y-2">
      {incompleteTasks.map((task, index) => renderTask(task, index))}
      {completedTasks.length > 0 && incompleteTasks.length > 0 && (
        <div className="border-t border-gray-200 my-3" />
      )}
      {completedTasks.map((task, index) => renderTask(task, incompleteTasks.length + index))}
    </div>
  );
}
