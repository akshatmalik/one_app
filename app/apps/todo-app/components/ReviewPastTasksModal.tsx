'use client';

import { useState, useEffect, useCallback } from 'react';
import { Task } from '../lib/types';
import { X, Check, Trash2, Clock, CalendarDays, ChevronsRight } from 'lucide-react';

interface ReviewPastTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  getPastTasks: () => Promise<Task[]>;
  onMoveToToday: (id: string) => Promise<void>;
  onMoveAllToToday: () => Promise<void>;
  onMoveToDate: (id: string, date: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  todayDate: string;
}

export function ReviewPastTasksModal({
  isOpen,
  onClose,
  getPastTasks,
  onMoveToToday,
  onMoveAllToToday,
  onMoveToDate,
  onDelete,
  todayDate,
}: ReviewPastTasksModalProps) {
  const [pastTasks, setPastTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [planMode, setPlanMode] = useState(false);
  const [plannedDates, setPlannedDates] = useState<Record<string, string>>({});
  const [bulkLoading, setBulkLoading] = useState(false);

  const tomorrow = (() => {
    const d = new Date(todayDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const loadPastTasks = useCallback(async () => {
    setLoading(true);
    const tasks = await getPastTasks();
    setPastTasks(tasks);
    setCurrentIndex(0);
    // Default all planned dates to tomorrow
    const defaults: Record<string, string> = {};
    tasks.forEach(t => { defaults[t.id] = tomorrow; });
    setPlannedDates(defaults);
    setLoading(false);
  }, [getPastTasks, tomorrow]);

  useEffect(() => {
    if (isOpen) {
      setPlanMode(false);
      loadPastTasks();
    }
  }, [isOpen, loadPastTasks]);

  const handleKeep = () => {
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

  const handleAddAllToToday = async () => {
    setBulkLoading(true);
    await onMoveAllToToday();
    setBulkLoading(false);
    onClose();
  };

  const handleConfirmPlan = async () => {
    setBulkLoading(true);
    for (const task of pastTasks) {
      const targetDate = plannedDates[task.id] || tomorrow;
      await onMoveToDate(task.id, targetDate);
    }
    setBulkLoading(false);
    onClose();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX, y: touch.clientY });
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setDragOffset({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y });
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (Math.abs(dragOffset.x) > 100) {
      if (dragOffset.x > 0) handleKeep();
      else handleDelete();
    }
    setDragOffset({ x: 0, y: 0 });
  };

  if (!isOpen) return null;

  const currentTask = pastTasks[currentIndex];
  const rotation = isDragging ? dragOffset.x / 20 : 0;
  const opacity = isDragging ? 1 - Math.abs(dragOffset.x) / 300 : 1;
  const remainingFromCurrent = pastTasks.slice(currentIndex);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#12121a] border border-white/5 rounded-2xl shadow-2xl max-w-md w-full flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">
            {planMode ? 'Plan the Remaining' : 'Review Past Tasks'}
          </h2>
          <div className="flex items-center gap-2">
            {planMode && (
              <button
                onClick={() => setPlanMode(false)}
                className="text-xs text-white/40 hover:text-white/70 px-2 py-1 rounded transition-all"
              >
                ← Back
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg p-1.5 transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-white/30 text-sm">Loading...</div>
          ) : pastTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Clock size={48} className="mb-3 text-white/10" />
              <p className="font-medium text-white/70">All caught up!</p>
              <p className="text-xs mt-1 text-white/30">No incomplete tasks from the past</p>
            </div>
          ) : planMode ? (
            /* Plan Mode — list all remaining tasks with date pickers */
            <div className="p-4 flex flex-col gap-3">
              <p className="text-xs text-white/30 mb-1">
                Assign a date to each task. They&apos;ll be moved when you confirm.
              </p>
              {remainingFromCurrent.map((task) => (
                <div key={task.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 flex flex-col gap-2">
                  <p className="text-sm text-white/90">{task.text}</p>
                  <div className="flex items-center gap-2">
                    <CalendarDays size={14} className="text-white/30 shrink-0" />
                    <input
                      type="date"
                      value={plannedDates[task.id] || tomorrow}
                      min={todayDate}
                      onChange={(e) =>
                        setPlannedDates(prev => ({ ...prev, [task.id]: e.target.value }))
                      }
                      className="flex-1 bg-white/[0.05] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/80 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : currentTask ? (
            /* Card swipe mode */
            <div className="flex flex-col items-center justify-center p-6">
              <div className="relative w-full max-w-sm">
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 z-0">
                  <div className={`px-3 py-2 bg-red-500 text-white rounded-lg font-bold text-sm transition-opacity ${dragOffset.x < -30 ? 'opacity-100' : 'opacity-0'}`}>
                    DELETE
                  </div>
                </div>
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 z-0">
                  <div className={`px-3 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm transition-opacity ${dragOffset.x > 30 ? 'opacity-100' : 'opacity-0'}`}>
                    KEEP
                  </div>
                </div>

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
                      From:{' '}
                      {new Date(currentTask.date).toLocaleDateString('en-US', {
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
            </div>
          ) : null}
        </div>

        {/* Action Buttons */}
        {!loading && pastTasks.length > 0 && (
          <>
            {planMode ? (
              /* Plan mode footer */
              <div className="p-4 border-t border-white/5 flex gap-3">
                <button
                  onClick={() => setPlanMode(false)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 hover:text-white/70 hover:bg-white/5 text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPlan}
                  disabled={bulkLoading}
                  className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {bulkLoading ? 'Saving...' : (
                    <>
                      <Check size={16} />
                      Confirm Plan
                    </>
                  )}
                </button>
              </div>
            ) : currentTask ? (
              /* Card swipe mode footer */
              <>
                {/* Individual actions */}
                <div className="px-4 pt-4 flex items-center justify-center gap-4">
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

                {/* Bulk actions */}
                <div className="p-4 pt-3 flex gap-2">
                  <button
                    onClick={handleAddAllToToday}
                    disabled={bulkLoading}
                    className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white text-xs font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <ChevronsRight size={14} />
                    Add All to Today
                  </button>
                  <button
                    onClick={() => setPlanMode(true)}
                    className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                  >
                    <CalendarDays size={14} />
                    Plan the Remaining
                  </button>
                </div>
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
