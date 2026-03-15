'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ChevronDown, History, Sparkles, LogIn, LogOut, BarChart3, ChevronsRight, X } from 'lucide-react';
import { Task } from './lib/types';
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
  const { user, loading: authLoading, signIn, signOut } = useAuthContext();
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

  // Past incomplete tasks — loaded automatically when viewing today
  const [pastTasks, setPastTasks] = useState<Task[]>([]);
  const [pastCollapsed, setPastCollapsed] = useState(false);

  useEffect(() => {
    if (!isToday || activeTab !== 'tasks' || loading) {
      if (!isToday) setPastTasks([]);
      return;
    }
    let cancelled = false;
    getPastIncompleteTasks().then(tasks => {
      if (!cancelled) setPastTasks(tasks);
    });
    return () => { cancelled = true; };
  }, [isToday, activeTab, loading]); // re-runs whenever today's tasks finish loading

  const handleCompletePastTask = async (id: string) => {
    try {
      await repository.update(id, { completed: true, completedAt: new Date().toISOString() });
      setPastTasks(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      showToast(`Failed to complete task: ${(e as Error).message}`, 'error');
    }
  };

  const handleMovePastTaskToToday = async (id: string) => {
    try {
      await moveTaskToDate(id, today);
      setPastTasks(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      showToast(`Failed to move task: ${(e as Error).message}`, 'error');
    }
  };

  const handleDeletePastTask = async (id: string) => {
    try {
      await deleteTask(id);
      setPastTasks(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      showToast(`Failed to delete task: ${(e as Error).message}`, 'error');
    }
  };

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

  const handleMoveAllToToday = async () => {
    try {
      const tasks = await getPastIncompleteTasks();
      for (const task of tasks) {
        await moveTaskToDate(task.id, today);
      }
      setPastTasks([]);
      showToast(`Moved ${tasks.length} task${tasks.length !== 1 ? 's' : ''} to today`, 'success');
    } catch (e) {
      showToast(`Failed to move tasks: ${(e as Error).message}`, 'error');
    }
  };

  const handleMoveToDate = async (taskId: string, date: string) => {
    try {
      await moveTaskToDate(taskId, date);
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
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-white/20 text-sm">Loading...</div>
      </div>
    );
  }

  // Show setup screen if no start date is configured
  if (!settings) {
    return <StartDateSetup onSetStartDate={handleSetStartDate} />;
  }

  const progressPercent = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f]">
      {/* Minimal sticky header */}
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-2xl mx-auto px-5">

          {/* Top bar: back + actions */}
          <div className="h-11 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-1 text-white/25 hover:text-white/50 transition-colors"
            >
              <ChevronLeft size={15} />
              <span className="text-xs font-medium">Home</span>
            </Link>

            <div className="flex items-center gap-0.5">
              {stats.total === 0 && activeTab === 'tasks' && (
                <button
                  onClick={handleLoadSampleTasks}
                  className="p-2 text-white/20 hover:text-white/50 transition-colors rounded-lg"
                  aria-label="Load sample tasks"
                >
                  <Sparkles size={14} />
                </button>
              )}
              {isToday && activeTab === 'tasks' && (
                <button
                  onClick={() => setIsReviewModalOpen(true)}
                  className="p-2 text-white/20 hover:text-white/50 transition-colors rounded-lg"
                  aria-label="Review past tasks"
                >
                  <History size={14} />
                </button>
              )}
              {user ? (
                <button
                  onClick={signOut}
                  className="p-2 text-white/20 hover:text-white/50 transition-colors rounded-lg"
                  aria-label="Sign out"
                >
                  <LogOut size={14} />
                </button>
              ) : (
                <button
                  onClick={signIn}
                  className="p-2 text-white/20 hover:text-white/50 transition-colors rounded-lg"
                  aria-label="Sign in"
                >
                  <LogIn size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Date navigation — only on tasks/notes tabs */}
          {(activeTab === 'tasks' || activeTab === 'notes') && (
            <div className="pb-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePreviousDay}
                  className="p-2 text-white/20 hover:text-white/50 transition-colors rounded-lg"
                  aria-label="Previous day"
                >
                  <ChevronLeft size={17} />
                </button>

                <button
                  onClick={handleTodayClick}
                  className="flex-1 flex flex-col items-center py-1 group"
                >
                  <span className="text-xl font-semibold text-white/90 tracking-tight group-hover:text-white transition-colors">
                    {formatDate(selectedDate)}
                  </span>
                  {dayNumber !== null && (
                    <span className="text-[11px] text-white/20 mt-0.5">
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} · Day {dayNumber}
                    </span>
                  )}
                </button>

                <button
                  onClick={handleNextDay}
                  className="p-2 text-white/20 hover:text-white/50 transition-colors rounded-lg"
                  aria-label="Next day"
                >
                  <ChevronRight size={17} />
                </button>
              </div>

              {/* Progress bar */}
              {stats.total > 0 && (
                <div className="mt-2.5 flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/[0.07] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500/50 to-emerald-500/50 transition-all duration-700 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-white/20 tabular-nums">
                    {stats.completed}/{stats.total}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Tab strip */}
          <div className="flex">
            {(['tasks', 'notes', 'stats'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  'px-4 py-2 text-xs font-medium transition-all border-b-2 capitalize tracking-wide',
                  activeTab === tab
                    ? 'text-white/80 border-white/30'
                    : 'text-white/25 border-transparent hover:text-white/45'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
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

              {/* Past incomplete tasks — shown inline on today */}
              {isToday && pastTasks.length > 0 && (
                <div className="mb-5">
                  <button
                    onClick={() => setPastCollapsed(c => !c)}
                    className="flex items-center gap-2 w-full mb-2 py-1 group"
                  >
                    <span className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">
                      Previous days
                    </span>
                    <span className="text-[10px] text-white/20 bg-white/[0.05] px-1.5 py-0.5 rounded-full">
                      {pastTasks.length}
                    </span>
                    <ChevronDown
                      size={11}
                      className={clsx('text-white/20 ml-auto transition-transform duration-200', pastCollapsed && '-rotate-90')}
                    />
                  </button>

                  {!pastCollapsed && (
                    <div className="flex flex-col gap-1">
                      {pastTasks.map(task => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]"
                        >
                          {/* Complete circle */}
                          <button
                            onClick={() => handleCompletePastTask(task.id)}
                            className="w-4 h-4 rounded-full border border-white/15 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all shrink-0"
                            aria-label="Complete"
                          />
                          {/* Task text */}
                          <span className="flex-1 text-sm text-white/45 truncate">{task.text}</span>
                          {/* Date label */}
                          <span className="text-[10px] text-white/20 shrink-0">
                            {new Date(task.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          {/* Move to today */}
                          <button
                            onClick={() => handleMovePastTaskToToday(task.id)}
                            className="p-1 text-white/20 hover:text-purple-400 transition-colors shrink-0"
                            aria-label="Move to today"
                          >
                            <ChevronsRight size={13} />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => handleDeletePastTask(task.id)}
                            className="p-1 text-white/20 hover:text-red-400 transition-colors shrink-0"
                            aria-label="Delete"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}

                      {/* Bulk action */}
                      <button
                        onClick={handleMoveAllToToday}
                        className="text-[11px] text-white/20 hover:text-white/40 transition-colors text-left py-1.5 pl-2 flex items-center gap-1"
                      >
                        <ChevronsRight size={12} />
                        Move all to today
                      </button>
                    </div>
                  )}
                </div>
              )}

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
        onMoveAllToToday={handleMoveAllToToday}
        onMoveToDate={handleMoveToDate}
        onDelete={handleDeleteTask}
        todayDate={today}
      />
    </div>
  );
}
