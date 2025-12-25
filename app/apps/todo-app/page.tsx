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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            Daily Tasks
          </h1>

          {/* Date Navigation */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handlePreviousDay}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Previous day"
              >
                <ChevronLeft size={24} />
              </button>

              <div className="relative flex-1 sm:flex-initial">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-center cursor-pointer"
                />
                <Calendar
                  size={20}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>

              <button
                onClick={handleNextDay}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Next day"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            {!isToday && (
              <button
                onClick={handleTodayClick}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium w-full sm:w-auto"
              >
                Go to Today
              </button>
            )}
          </div>

          {/* Display Date */}
          <div className="text-center mb-4">
            <p className="text-lg font-medium text-gray-700">
              {formatDisplayDate(selectedDate)}
            </p>
            {isToday && (
              <span className="inline-block mt-1 px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                Today
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="text-center mb-4">
            <p className="text-2xl font-bold text-gray-900">
              {stats.completed}/{stats.total}
              <span className="text-base font-normal text-gray-600 ml-2">
                tasks completed
              </span>
            </p>
            {stats.total > 0 && (
              <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-green-500 h-full transition-all duration-300"
                  style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* Review Past Tasks Button */}
          {isToday && (
            <button
              onClick={() => setIsReviewModalOpen(true)}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <History size={20} />
              Review Past Incomplete Tasks
            </button>
          )}
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <TaskInput onAdd={addTask} />

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading tasks...</div>
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
