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

    if (Math.abs(dragOffset.x) > 100) {
      if (dragOffset.x > 0) {
        handleKeep();
      } else {
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#12121a] border border-white/5 rounded-2xl shadow-2xl max-w-md w-full flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">Review Past Tasks</h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg p-1.5 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          {loading ? (
            <div className="text-center text-white/30 text-sm">Loading...</div>
          ) : pastTasks.length === 0 ? (
            <div className="text-center">
              <Clock size={48} className="mx-auto mb-3 text-white/10" />
              <p className="font-medium text-white/70">All caught up!</p>
              <p className="text-xs mt-1 text-white/30">No incomplete tasks from the past</p>
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
                  className={`px-3 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm transition-opacity ${
                    dragOffset.x > 30 ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  KEEP
                </div>
              </div>

              {/* Swipeable Card */}
              <div
                className="relative z-10 bg-white/[0.03] border border-white/5 rounded-2xl p-6 cursor-grab active:cursor-grabbing select-none"
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
                  <p className="text-lg font-medium text-white/90 mb-2">{currentTask.text}</p>
                  <p className="text-sm text-white/40">
                    From: {new Date(currentTask.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                <div className="text-xs text-white/20 text-center">
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
              className="w-14 h-14 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 active:scale-95 transition-all flex items-center justify-center"
            >
              <Trash2 size={20} />
            </button>
            <button
              onClick={handleMoveToToday}
              className="w-16 h-16 rounded-full bg-purple-600 text-white shadow-lg shadow-purple-500/20 hover:bg-purple-500 active:scale-95 transition-all flex items-center justify-center font-semibold text-xs"
            >
              TODAY
            </button>
            <button
              onClick={handleKeep}
              className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 active:scale-95 transition-all flex items-center justify-center"
            >
              <Check size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
