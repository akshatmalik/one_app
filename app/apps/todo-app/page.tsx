'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, History, Sparkles, Calendar, BarChart3, CheckSquare, BookOpen } from 'lucide-react';
import { useTasks } from './hooks/useTasks';
import { useStats } from './hooks/useStats';
import { useSettings } from './hooks/useSettings';
import { useDayNotes } from './hooks/useDayNotes';
import { TaskInput } from './components/TaskInput';
import { TaskList } from './components/TaskList';
import { ReviewPastTasksModal } from './components/ReviewPastTasksModal';
import { StatsView } from './components/StatsView';
import { StartDateSetup } from './components/StartDateSetup';
import { DayNotesEditor } from './components/DayNotesEditor';
import { useAuthContext } from '@/lib/AuthContext';
import { useToast } from '@/components/Toast';
import { repository } from './lib/storage';
import { SAMPLE_TASKS } from './data/sample-tasks';
import { calculateDayNumber } from './lib/calculations';
import clsx from 'clsx';

export default function TodoApp() {
  const { user, loading: authLoading } = useAuthContext();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'tasks' | 'stats' | 'notes'>('tasks');
  const [selectedDate, setSelectedDate] = useState(() => {
    // Use local date instead of UTC to avoid timezone issues
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const { settings, loading: settingsLoading, setStartDate } = useSettings(user?.uid ?? null);
  const { note, saveNote } = useDayNotes(selectedDate, user?.uid ?? null);

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

  const {
    weeklyStats,
    monthlyStats,
    weeklyData,
    monthlyData,
    loading: statsLoading,
    error: statsError,
  } = useStats(user?.uid ?? null);

  // Use local date instead of UTC to avoid timezone issues
  const today = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();
  const isToday = selectedDate === today;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    if (dateStr === today) return 'Today';

    // Calculate yesterday using local date
    const yesterday = new Date(today + 'T12:00:00');
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    if (dateStr === yesterdayStr) return 'Yesterday';

    // Calculate tomorrow using local date
    const tomorrow = new Date(today + 'T12:00:00');
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    if (dateStr === tomorrowStr) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const handlePreviousDay = () => {
    const date = new Date(selectedDate + 'T12:00:00');
    date.setDate(date.getDate() - 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  const handleNextDay = () => {
    const date = new Date(selectedDate + 'T12:00:00');
    date.setDate(date.getDate() + 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
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

  const handleSetStartDate = async (date: string) => {
    try {
      await setStartDate(date);
      showToast('Start date set successfully!', 'success');
    } catch (e) {
      showToast(`Failed to set start date: ${(e as Error).message}`, 'error');
      throw e;
    }
  };

  const handleSaveNote = async (content: string) => {
    try {
      await saveNote(content);
      showToast('Note saved!', 'success');
    } catch (e) {
      showToast(`Failed to save note: ${(e as Error).message}`, 'error');
      throw e;
    }
  };

  const dayNumber = settings ? calculateDayNumber(selectedDate, settings.startDate) : null;

  if (authLoading || settingsLoading) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center">
        <div className="text-white/30">Loading...</div>
      </div>
    );
  }

  // Show setup screen if no start date is configured
  if (!settings) {
    return <StartDateSetup onSetStartDate={handleSetStartDate} />;
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
              {stats.total === 0 && activeTab === 'tasks' && (
                <button
                  onClick={handleLoadSampleTasks}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-all"
                >
                  <Sparkles size={14} />
                  Load Samples
                </button>
              )}
              {isToday && activeTab === 'tasks' && (
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

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('tasks')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all',
                activeTab === 'tasks'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/[0.03] text-white/60 hover:text-white/80 hover:bg-white/[0.05]'
              )}
            >
              <CheckSquare size={16} />
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all',
                activeTab === 'notes'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/[0.03] text-white/60 hover:text-white/80 hover:bg-white/[0.05]'
              )}
            >
              <BookOpen size={16} />
              Notes
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all',
                activeTab === 'stats'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/[0.03] text-white/60 hover:text-white/80 hover:bg-white/[0.05]'
              )}
            >
              <BarChart3 size={16} />
              Stats
            </button>
          </div>

          {/* Date Navigation - Show on Tasks and Notes tabs */}
          {(activeTab === 'tasks' || activeTab === 'notes') && (
            <>
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
                  className="flex-1 flex flex-col items-center justify-center py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all group"
                >
                  {dayNumber !== null && (
                    <span className="text-xs font-medium text-purple-400 mb-0.5">
                      Day {dayNumber}
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-white/40 group-hover:text-white/60" />
                    <span className="text-lg font-medium">{formatDate(selectedDate)}</span>
                  </div>
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
            </>
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
      <div className="flex-1 px-6 py-6 overflow-hidden flex flex-col">
        <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
          {activeTab === 'tasks' ? (
            <>
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
            </>
          ) : activeTab === 'notes' ? (
            <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
              <DayNotesEditor
                date={selectedDate}
                dayNumber={dayNumber}
                initialContent={note?.content || ''}
                onSave={handleSaveNote}
                onClose={() => setActiveTab('tasks')}
              />
            </div>
          ) : (
            <>
              {statsLoading ? (
                <div className="text-center py-12 text-white/30 text-sm">Loading stats...</div>
              ) : statsError ? (
                <div className="text-center py-12">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400 inline-block">
                    Error loading stats: {statsError.message}
                  </div>
                </div>
              ) : weeklyStats && monthlyStats ? (
                <StatsView
                  weeklyStats={weeklyStats}
                  monthlyStats={monthlyStats}
                  weeklyData={weeklyData}
                  monthlyData={monthlyData}
                />
              ) : (
                <div className="text-center py-20">
                  <div className="max-w-md mx-auto">
                    <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BarChart3 size={32} className="text-purple-400/50" />
                    </div>
                    <h3 className="text-lg font-medium text-white/70 mb-2">No stats yet</h3>
                    <p className="text-white/40 text-sm">
                      Complete some tasks to start seeing your statistics and progress tracking.
                    </p>
                  </div>
                </div>
              )}
            </>
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
