'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, History, Cloud, CloudOff } from 'lucide-react';
import { useTasks } from './hooks/useTasks';
import { TaskInput } from './components/TaskInput';
import { TaskList } from './components/TaskList';
import { ReviewPastTasksModal } from './components/ReviewPastTasksModal';
import { useAuthContext } from '@/lib/AuthContext';
import { useToast } from '@/components/Toast';

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
  } = useTasks(selectedDate, user?.uid ?? null);

  const today = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === today;

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

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
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
      showToast('Task added', 'success');
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

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-4xl font-bold text-gray-900">Daily Tasks</h1>
          <div className="flex items-center gap-2">
            {/* Cloud sync indicator */}
            {user ? (
              <span className="text-green-600" title="Syncing to cloud">
                <Cloud size={20} />
              </span>
            ) : (
              <span className="text-gray-400" title="Local only - sign in to sync">
                <CloudOff size={20} />
              </span>
            )}
            {isToday && (
              <button
                onClick={() => setIsReviewModalOpen(true)}
                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
                aria-label="Review past tasks"
              >
                <History size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Local mode banner */}
        {!user && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-4 text-sm text-amber-700">
            Local mode - tasks saved on this device only. Sign in to sync across devices.
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-4 text-sm text-red-700">
            Error: {error.message}
          </div>
        )}

        {/* Date Navigation */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={handlePreviousDay}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
            aria-label="Previous day"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>

          <div className="relative flex-1">
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-900 rounded-lg text-sm w-full text-center cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <button
            onClick={handleNextDay}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
            aria-label="Next day"
          >
            <ChevronRight size={20} className="text-gray-600" />
          </button>

          {!isToday && (
            <button
              onClick={handleTodayClick}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 text-sm font-medium whitespace-nowrap shadow-sm hover:shadow"
            >
              Today
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-sm mb-6">
          <span className="font-semibold text-gray-700 min-w-[3rem]">
            {stats.completed}/{stats.total}
          </span>
          {stats.total > 0 && (
            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all duration-500 ease-out rounded-full"
                style={{ width: `${(stats.completed / stats.total) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <TaskInput onAdd={handleAddTask} />

          {loading ? (
            <div className="text-center py-6 text-gray-500 text-sm">Loading...</div>
          ) : (
            <TaskList
              incompleteTasks={incompleteTasks}
              completedTasks={completedTasks}
              onToggle={handleToggleTask}
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
