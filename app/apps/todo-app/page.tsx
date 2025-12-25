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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 sm:p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-3 mb-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">Daily Tasks</h1>
            {isToday && (
              <button
                onClick={() => setIsReviewModalOpen(true)}
                className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                aria-label="Review past tasks"
              >
                <History size={18} />
              </button>
            )}
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={handlePreviousDay}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="Previous day"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="relative flex-1">
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-full text-center cursor-pointer"
              />
            </div>

            <button
              onClick={handleNextDay}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="Next day"
            >
              <ChevronRight size={20} />
            </button>

            {!isToday && (
              <button
                onClick={handleTodayClick}
                className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs font-medium whitespace-nowrap"
              >
                Today
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-gray-900">
              {stats.completed}/{stats.total}
            </span>
            {stats.total > 0 && (
              <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-green-500 h-full transition-all duration-300"
                  style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm p-3">
          <TaskInput onAdd={addTask} />

          {loading ? (
            <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>
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
