'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, History } from 'lucide-react';
import { useTasks } from './hooks/useTasks';
import { TaskInput } from './components/TaskInput';
import { TaskList } from './components/TaskList';
import { ReviewPastTasksModal } from './components/ReviewPastTasksModal';

export default function TodoApp() {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const {
    incompleteTasks,
    completedTasks,
    stats,
    loading,
    addTask,
    toggleTask,
    deleteTask,
    moveTaskToDate,
    getPastIncompleteTasks,
    reorderTasks,
  } = useTasks(selectedDate);

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

  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleMoveToToday = async (taskId: string) => {
    await moveTaskToDate(taskId, today);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 dark:from-slate-900 dark:via-slate-950 dark:to-black">
      <div className="w-full">
        {/* Header */}
        <div className="bg-slate-800/80 dark:bg-slate-900/80 backdrop-blur-sm p-3">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-base font-semibold text-slate-100 dark:text-white">Daily Tasks</h1>
            {isToday && (
              <button
                onClick={() => setIsReviewModalOpen(true)}
                className="p-1.5 text-purple-400 dark:text-purple-400 hover:bg-slate-700/50 dark:hover:bg-slate-800/50 rounded-lg transition-all duration-200"
                aria-label="Review past tasks"
              >
                <History size={18} />
              </button>
            )}
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-1.5 mb-3">
            <button
              onClick={handlePreviousDay}
              className="p-1.5 hover:bg-slate-700/50 dark:hover:bg-slate-800/50 rounded-lg transition-all duration-200"
              aria-label="Previous day"
            >
              <ChevronLeft size={18} className="text-slate-300 dark:text-slate-400" />
            </button>

            <div className="relative flex-1">
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="px-3 py-2 bg-slate-700/50 dark:bg-slate-800/50 text-slate-100 dark:text-white rounded-lg text-sm w-full text-center cursor-pointer transition-all duration-200"
              />
            </div>

            <button
              onClick={handleNextDay}
              className="p-1.5 hover:bg-slate-700/50 dark:hover:bg-slate-800/50 rounded-lg transition-all duration-200"
              aria-label="Next day"
            >
              <ChevronRight size={18} className="text-slate-300 dark:text-slate-400" />
            </button>

            {!isToday && (
              <button
                onClick={handleTodayClick}
                className="px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-200 text-sm font-medium whitespace-nowrap shadow-sm hover:shadow"
              >
                Today
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2.5 text-sm">
            <span className="font-semibold text-slate-200 dark:text-slate-300 min-w-[2.5rem]">
              {stats.completed}/{stats.total}
            </span>
            {stats.total > 0 && (
              <div className="flex-1 bg-slate-700/50 dark:bg-slate-800/50 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-slate-800/50 dark:bg-slate-900/50 backdrop-blur-sm p-3">
          <TaskInput onAdd={addTask} />

          {loading ? (
            <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">Loading...</div>
          ) : (
            <TaskList
              incompleteTasks={incompleteTasks}
              completedTasks={completedTasks}
              onToggle={toggleTask}
              onReorder={reorderTasks}
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
        onDelete={deleteTask}
        todayDate={today}
      />
    </div>
  );
}
