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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Review Past Incomplete Tasks</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : pastTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock size={48} className="mx-auto mb-3 text-gray-300" />
              <p>No incomplete tasks from previous days!</p>
              <p className="text-sm mt-2">You&apos;re all caught up 🎉</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pastTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="mb-3">
                    <p className="text-base font-medium text-gray-900">{task.text}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      From: {new Date(task.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleMoveToToday(task.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      <ArrowRight size={16} />
                      Move to Today
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                    <button
                      onClick={() => handleKeep(task.id)}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm"
                    >
                      Keep There
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {pastTasks.length > 0 && (
          <div className="p-6 border-t bg-gray-50">
            <p className="text-sm text-gray-600 text-center">
              {pastTasks.length} task{pastTasks.length !== 1 ? 's' : ''} remaining
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
