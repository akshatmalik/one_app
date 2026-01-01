'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, History, Sparkles, Calendar } from 'lucide-react';
import { useTasks } from './hooks/useTasks';
import { TaskInput } from './components/TaskInput';
import { TaskList } from './components/TaskList';
import { ReviewPastTasksModal } from './components/ReviewPastTasksModal';
import { useAuthContext } from '@/lib/AuthContext';
import { useToast } from '@/components/Toast';
import { repository } from './lib/storage';
import { SAMPLE_TASKS } from './data/sample-tasks';

export default function TodoApp() {
  const { user, loading: authLoading } = useAuthContext();
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const {
    incompleteTasks,
    completedTasks,
    stats,
    loading,
    error,
    addTask,
    toggleTask,
    deleteTask,
    moveTaskToDate,
    getPastIncompleteTasks,
    reorderTasks,
    refresh,
  } = useTasks(selectedDate, user?.uid ?? null);

  const today = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === today;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    if (dateStr === today) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const handlePreviousDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleTodayClick = () => {
    setSelectedDate(today);
  };

  const handleMoveToToday = async (taskId: string) => {
    try {
      await moveTaskToDate(taskId, today);
    } catch (e) {
      showToast(`Failed to move task: ${(e as Error).message}`, 'error');
    }
  };

  const handleAddTask = async (text: string) => {
    try {
      await addTask(text);
    } catch (e) {
      showToast(`Failed to add task: ${(e as Error).message}`, 'error');
    }
  };

  const handleToggleTask = async (id: string) => {
    try {
      await toggleTask(id);
    } catch (e) {
      showToast(`Failed to toggle task: ${(e as Error).message}`, 'error');
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id);
    } catch (e) {
      showToast(`Failed to delete task: ${(e as Error).message}`, 'error');
    }
  };

  const handleReorder = async (taskId: string, newOrder: number) => {
    try {
      await reorderTasks(taskId, newOrder);
    } catch (e) {
      showToast(`Failed to reorder: ${(e as Error).message}`, 'error');
    }
  };

  const handleLoadSampleTasks = async () => {
    try {
      repository.setUserId(user?.uid || 'local-user');
      for (const task of SAMPLE_TASKS) {
        await repository.create({
          ...task,
          date: today,
        });
      }
      showToast('Sample tasks loaded', 'success');
      await refresh();
    } catch (e) {
      showToast(`Failed to load samples: ${(e as Error).message}`, 'error');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center">
        <div className="text-white/30">Loading...</div>
      </div>
    );
  }

  const progressPercent = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  return (
    <div className="min-h-[calc(100vh-60px)] flex flex-col">
      {/* Full-width header area */}
      <div className="px-6 pt-8 pb-6 border-b border-white/5">
        <div className="max-w-2xl mx-auto">
          {/* Title & Actions */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-white tracking-tight">Tasks</h1>
            <div className="flex items-center gap-2">
              {stats.total === 0 && (
                <button
                  onClick={handleLoadSampleTasks}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-all"
                >
                  <Sparkles size={14} />
                  Load Samples
                </button>
              )}
              {isToday && (
                <button
                  onClick={() => setIsReviewModalOpen(true)}
                  className="p-2 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-all"
                  aria-label="Review past tasks"
                >
                  <History size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePreviousDay}
              className="p-2 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-all"
              aria-label="Previous day"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              onClick={handleTodayClick}
              className="flex-1 flex items-center justify-center gap-2 py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all group"
            >
              <Calendar size={16} className="text-white/40 group-hover:text-white/60" />
              <span className="text-lg font-medium">{formatDate(selectedDate)}</span>
            </button>

            <button
              onClick={handleNextDay}
              className="p-2 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-all"
              aria-label="Next day"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Progress */}
          {stats.total > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs text-white/40 font-medium tabular-nums">
                {stats.completed}/{stats.total}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="px-6 py-3">
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-sm text-red-400">
              {error.message}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 px-6 py-6">
        <div className="max-w-2xl mx-auto">
          <TaskInput onAdd={handleAddTask} />

          {loading ? (
            <div className="text-center py-12 text-white/30 text-sm">Loading...</div>
          ) : (
            <TaskList
              incompleteTasks={incompleteTasks}
              completedTasks={completedTasks}
              onToggle={handleToggleTask}
              onDelete={handleDeleteTask}
              onReorder={handleReorder}
            />
          )}
        </div>
      </div>

      {/* Review Modal */}
      <ReviewPastTasksModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        getPastTasks={getPastIncompleteTasks}
        onMoveToToday={handleMoveToToday}
        onDelete={handleDeleteTask}
        todayDate={today}
      />
    </div>
  );
}
