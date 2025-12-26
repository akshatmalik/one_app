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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="w-full">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm p-2">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-base font-semibold text-gray-900">Daily Tasks</h1>
            {isToday && (
              <button
                onClick={() => setIsReviewModalOpen(true)}
                className="p-1 text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
                aria-label="Review past tasks"
              >
                <History size={16} />
              </button>
            )}
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-1 mb-2">
            <button
              onClick={handlePreviousDay}
              className="p-1 hover:bg-gray-100 rounded-lg transition-all duration-200"
              aria-label="Previous day"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="relative flex-1">
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="px-2 py-1 bg-white rounded-lg text-xs w-full text-center cursor-pointer transition-all duration-200"
              />
            </div>

            <button
              onClick={handleNextDay}
              className="p-1 hover:bg-gray-100 rounded-lg transition-all duration-200"
              aria-label="Next day"
            >
              <ChevronRight size={16} />
            </button>

            {!isToday && (
              <button
                onClick={handleTodayClick}
                className="px-2 py-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-200 text-xs font-medium whitespace-nowrap shadow-sm hover:shadow"
              >
                Today
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-gray-700 min-w-[2rem]">
              {stats.completed}/{stats.total}
            </span>
            {stats.total > 0 && (
              <div className="flex-1 bg-gray-100 rounded-full h-1 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white/80 backdrop-blur-sm p-2">
          <TaskInput onAdd={addTask} />

          {loading ? (
            <div className="text-center py-6 text-gray-400 text-xs">Loading...</div>
          ) : (
            <TaskList
              incompleteTasks={incompleteTasks}
              completedTasks={completedTasks}
              onToggle={toggleTask}
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
