'use client';

import { useState, useEffect, useCallback } from 'react';
import { Task } from '../lib/types';
import { X, Check, Trash2, Clock } from 'lucide-react';

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
}: ReviewPastTasksModalProps) {
  const [pastTasks, setPastTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const loadPastTasks = useCallback(async () => {
    setLoading(true);
    const tasks = await getPastTasks();
    setPastTasks(tasks);
    setCurrentIndex(0);
    setLoading(false);
  }, [getPastTasks]);

  useEffect(() => {
    if (isOpen) {
      loadPastTasks();
    }
  }, [isOpen, loadPastTasks]);

  const handleKeep = async () => {
    // Just move to next card
    if (currentIndex < pastTasks.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handleMoveToToday = async () => {
    const task = pastTasks[currentIndex];
    await onMoveToToday(task.id);
    if (currentIndex < pastTasks.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handleDelete = async () => {
    const task = pastTasks[currentIndex];
    await onDelete(task.id);
    if (currentIndex < pastTasks.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX, y: touch.clientY });
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const offsetX = touch.clientX - dragStart.x;
    const offsetY = touch.clientY - dragStart.y;
    setDragOffset({ x: offsetX, y: offsetY });
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // Swipe threshold
    if (Math.abs(dragOffset.x) > 100) {
      if (dragOffset.x > 0) {
        // Swipe right = Keep
        handleKeep();
      } else {
        // Swipe left = Delete
        handleDelete();
      }
    }

    setDragOffset({ x: 0, y: 0 });
  };

  if (!isOpen) return null;

  const currentTask = pastTasks[currentIndex];
  const rotation = isDragging ? dragOffset.x / 20 : 0;
  const opacity = isDragging ? 1 - Math.abs(dragOffset.x) / 300 : 1;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-100 dark:text-white">Past Tasks</h2>
          <button
            onClick={onClose}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-200 dark:hover:text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-800 rounded-lg p-1.5 transition-all duration-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          {loading ? (
            <div className="text-center text-slate-400 dark:text-slate-500 text-sm">Loading...</div>
          ) : pastTasks.length === 0 ? (
            <div className="text-center text-slate-400 dark:text-slate-500 text-sm">
              <Clock size={48} className="mx-auto mb-3 text-slate-600 dark:text-slate-700" />
              <p className="font-medium">All caught up!</p>
              <p className="text-xs mt-1 text-slate-500 dark:text-slate-600">No incomplete tasks from the past</p>
            </div>
          ) : currentTask ? (
            <div className="relative w-full max-w-sm">
              {/* Hint indicators */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 z-0">
                <div
                  className={`px-3 py-2 bg-red-500 text-white rounded-lg font-bold text-sm transition-opacity ${
                    dragOffset.x < -30 ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  DELETE
                </div>
              </div>
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 z-0">
                <div
                  className={`px-3 py-2 bg-green-500 text-white rounded-lg font-bold text-sm transition-opacity ${
                    dragOffset.x > 30 ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  KEEP
                </div>
              </div>

              {/* Swipeable Card */}
              <div
                className="relative z-10 bg-slate-700 dark:bg-slate-800 rounded-2xl shadow-lg p-6 cursor-grab active:cursor-grabbing select-none"
                style={{
                  transform: `translateX(${dragOffset.x}px) translateY(${dragOffset.y}px) rotate(${rotation}deg)`,
                  opacity,
                  transition: isDragging ? 'none' : 'all 0.3s ease-out',
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div className="mb-4">
                  <p className="text-lg font-medium text-slate-100 dark:text-white mb-2">{currentTask.text}</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    From: {new Date(currentTask.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-600 text-center">
                  {currentIndex + 1} of {pastTasks.length}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Action Buttons */}
        {!loading && pastTasks.length > 0 && currentTask && (
          <div className="p-4 flex items-center justify-center gap-4">
            <button
              onClick={handleDelete}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 flex items-center justify-center"
            >
              <Trash2 size={24} />
            </button>
            <button
              onClick={handleMoveToToday}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 flex items-center justify-center font-semibold text-sm"
            >
              TODAY
            </button>
            <button
              onClick={handleKeep}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 flex items-center justify-center"
            >
              <Check size={24} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
