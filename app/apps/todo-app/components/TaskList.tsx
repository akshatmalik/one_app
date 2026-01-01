'use client';

import { useState } from 'react';
import { Task, Priority } from '../lib/types';
import { Check, GripVertical, Trash2 } from 'lucide-react';
import clsx from 'clsx';

const PRIORITY_COLORS: Record<Priority, { bg: string; border: string; text: string }> = {
  1: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400' },
  2: { bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-400' },
  3: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400' },
  4: { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/40' },
};

interface TaskListProps {
  incompleteTasks: Task[];
  completedTasks: Task[];
  onToggle: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (taskId: string, newOrder: number) => Promise<void>;
}

export function TaskList({ incompleteTasks, completedTasks, onToggle, onDelete, onReorder }: TaskListProps) {
  const allTasks = [...incompleteTasks, ...completedTasks];
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  if (allTasks.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-white/30 text-sm">No tasks for this day</p>
        <p className="text-white/20 text-xs mt-1">Add a task above to get started</p>
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

  const renderTask = (task: Task) => {
    const priority = task.priority ?? 4;
    const priorityStyle = PRIORITY_COLORS[priority];

    return (
      <div
        key={task.id}
        draggable
        onDragStart={(e) => handleDragStart(e, task.id)}
        onDragOver={(e) => handleDragOver(e, task.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, task.id)}
        onDragEnd={handleDragEnd}
        className={clsx(
          'group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-grab active:cursor-grabbing',
          task.completed
            ? 'bg-white/[0.02]'
            : 'bg-white/[0.03] hover:bg-white/[0.05]',
          draggedTaskId === task.id && 'opacity-50 scale-[0.98]',
          dragOverTaskId === task.id && draggedTaskId !== task.id && 'ring-1 ring-purple-500/50'
        )}
      >
        <div className="flex-shrink-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
          <GripVertical size={14} className="text-white/20" />
        </div>
        <button
          onClick={() => onToggle(task.id)}
          className={clsx(
            'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200',
            task.completed
              ? 'bg-emerald-500 border-emerald-500'
              : 'border-white/20 hover:border-purple-500'
          )}
        >
          {task.completed && <Check size={10} className="text-white" strokeWidth={3} />}
        </button>
        <div className="flex-1 flex items-center gap-2">
          <span
            className={clsx(
              'text-sm transition-all duration-200',
              task.completed
                ? 'line-through text-white/30'
                : 'text-white/80'
            )}
          >
            {task.text}
          </span>
          <div className="flex items-center gap-1.5">
            {priority < 4 && (
              <span className={clsx(
                'px-1.5 py-0.5 text-[10px] font-medium rounded border',
                priorityStyle.bg,
                priorityStyle.border,
                priorityStyle.text
              )}>
                P{priority}
              </span>
            )}
            {task.category && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-500/20 border border-purple-500/50 text-purple-400">
                {task.category}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => onDelete(task.id)}
          className="flex-shrink-0 p-1.5 opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
          aria-label="Delete task"
        >
          <Trash2 size={14} />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {incompleteTasks.map((task) => renderTask(task))}
      {completedTasks.length > 0 && incompleteTasks.length > 0 && (
        <div className="flex items-center gap-3 py-3">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-[10px] text-white/20 uppercase tracking-wider font-medium">Completed</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>
      )}
      {completedTasks.map((task) => renderTask(task))}
    </div>
  );
}
