'use client';

import { useState, useEffect, useCallback } from 'react';
import { Task } from '../lib/types';
import { X, ArrowRight, Trash2, Clock } from 'lucide-react';
import clsx from 'clsx';

interface ReviewPastTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  getPastTasks: () => Promise<Task[]>;
  onMoveToToday: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  todayDate: string;
}

export function ReviewPastTasksModal({
  isOpen,
  onClose,
  getPastTasks,
  onMoveToToday,
  onDelete,
  todayDate,
}: ReviewPastTasksModalProps) {
  const [pastTasks, setPastTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPastTasks = useCallback(async () => {
    setLoading(true);
    const tasks = await getPastTasks();
    setPastTasks(tasks);
    setLoading(false);
  }, [getPastTasks]);

  useEffect(() => {
    if (isOpen) {
      loadPastTasks();
    }
  }, [isOpen, loadPastTasks]);

  const handleMoveToToday = async (id: string) => {
    await onMoveToToday(id);
    setPastTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleDelete = async (id: string) => {
    await onDelete(id);
    setPastTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleKeep = (id: string) => {
    // Just remove from the list, no action needed
    setPastTasks(prev => prev.filter(t => t.id !== id));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <h2 className="text-base font-bold text-gray-900">Past Tasks</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="text-center py-6 text-gray-500 text-sm">Loading...</div>
          ) : pastTasks.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              <Clock size={32} className="mx-auto mb-2 text-gray-300" />
              <p>All caught up!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pastTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-2.5 bg-gray-50 rounded border border-gray-200"
                >
                  <div className="mb-2">
                    <p className="text-sm font-medium text-gray-900">{task.text}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(task.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => handleMoveToToday(task.id)}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                    >
                      <ArrowRight size={12} />
                      Today
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                    <button
                      onClick={() => handleKeep(task.id)}
                      className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 transition-colors"
                    >
                      Keep
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {pastTasks.length > 0 && (
          <div className="p-2.5 border-t bg-gray-50">
            <p className="text-xs text-gray-600 text-center">
              {pastTasks.length} remaining
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
