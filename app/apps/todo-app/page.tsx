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
    <div className="space-y-6">
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-4xl font-bold text-gray-900">Daily Tasks</h1>
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
          <TaskInput onAdd={addTask} />

          {loading ? (
            <div className="text-center py-6 text-gray-500 text-sm">Loading...</div>
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
