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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200 border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Past Tasks</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1 transition-all duration-200 active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
          ) : pastTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <Clock size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="font-medium">All caught up!</p>
              <p className="text-xs mt-1 text-gray-300">No incomplete tasks from the past</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pastTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-2.5 bg-gradient-to-br from-gray-50 to-gray-50/50 rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200"
                >
                  <div className="mb-2">
                    <p className="text-sm font-medium text-gray-700">{task.text}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(task.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => handleMoveToToday(task.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-md text-xs hover:from-blue-700 hover:to-blue-600 transition-all duration-200 shadow-sm hover:shadow active:scale-95"
                    >
                      <ArrowRight size={12} />
                      Today
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-md text-xs hover:from-red-700 hover:to-red-600 transition-all duration-200 shadow-sm hover:shadow active:scale-95"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                    <button
                      onClick={() => handleKeep(task.id)}
                      className="px-2.5 py-1.5 bg-gray-200 text-gray-600 rounded-md text-xs hover:bg-gray-300 hover:text-gray-700 transition-all duration-200 active:scale-95"
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
          <div className="p-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-500 text-center font-medium">
              {pastTasks.length} task{pastTasks.length !== 1 ? 's' : ''} remaining
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
