'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ChevronDown, History, Sparkles, LogIn, LogOut, BarChart3, ChevronsRight, X } from 'lucide-react';
import { Task } from './lib/types';
import { useTasks } from './hooks/useTasks';
import { useStats } from './hooks/useStats';
import { useSettings } from './hooks/useSettings';
import { useDayNotes } from './hooks/useDayNotes';
import { usePepTalk } from './hooks/usePepTalk';
import { TaskInput } from './components/TaskInput';
import { TaskList } from './components/TaskList';
import { ReviewPastTasksModal } from './components/ReviewPastTasksModal';
import { StatsView } from './components/StatsView';
import { StartDateSetup } from './components/StartDateSetup';
import { DayNotesEditor } from './components/DayNotesEditor';
import { DailyPepTalk } from './components/DailyPepTalk';
import { SillyQuickStarts } from './components/SillyQuickStarts';
import { PepTalkContext } from './lib/ai-service';
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

  // Pep talk context — rebuilt when the material task state changes
  const pepTalkContext: PepTalkContext | null = useMemo(() => {
    if (loading) return null;
    const topIncomplete = incompleteTasks[0];
    const categoriesSet = new Set<string>();
    [...incompleteTasks, ...completedTasks].forEach(t => {
      if (t.category) categoriesSet.add(t.category);
    });
    const completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

    return {
      dayNumber,
      totalTasks: stats.total,
      completedTasks: stats.completed,
      topPriorityText: topIncomplete?.text,
      topPriorityLevel: topIncomplete?.priority,
      categories: Array.from(categoriesSet).slice(0, 5),
      currentStreak: weeklyStats?.currentStreak ?? 0,
      longestStreak: weeklyStats?.longestStreak ?? 0,
      overdueCount: pastTasks.length,
      completionRate,
      viewingToday: isToday,
      dateLabel: formatDate(selectedDate),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, stats.total, stats.completed, incompleteTasks, completedTasks, pastTasks.length, weeklyStats?.currentStreak, weeklyStats?.longestStreak, dayNumber, isToday, selectedDate]);

  const { talk: pepTalk, loading: pepTalkLoading, regenerate: regeneratePepTalk } = usePepTalk(
    selectedDate,
    pepTalkContext,
    activeTab === 'tasks' && !loading && !!pepTalkContext,
  );

  if (authLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1530] via-[#15152a] to-[#0f0f1f]">
        <div className="text-white/50 text-sm">Loading...</div>
      </div>
    );
  }

  // Show setup screen if no start date is configured
  if (!settings) {
    return <StartDateSetup onSetStartDate={handleSetStartDate} />;
  }

  const progressPercent = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#1f1a38] via-[#171530] to-[#10101e] relative">
      {/* Ambient glow — makes the dark feel lit, not empty */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute top-40 -right-24 w-96 h-96 rounded-full bg-pink-500/8 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[32rem] h-[32rem] rounded-full bg-indigo-500/8 blur-3xl" />
      </div>

      {/* Minimal sticky header */}
      <div className="relative z-10 sticky top-0 bg-[#171530]/80 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-2xl mx-auto px-5">

          {/* Top bar: back + actions */}
          <div className="h-11 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-1 text-white/50 hover:text-white/90 transition-colors"
            >
              <ChevronLeft size={15} />
              <span className="text-xs font-medium">Home</span>
            </Link>

            <div className="flex items-center gap-0.5">
              {stats.total === 0 && activeTab === 'tasks' && (
                <button
                  onClick={handleLoadSampleTasks}
                  className="p-2 text-white/45 hover:text-purple-300 hover:bg-white/5 transition-colors rounded-lg"
                  aria-label="Load sample tasks"
                >
                  <Sparkles size={14} />
                </button>
              )}
              {isToday && activeTab === 'tasks' && (
                <button
                  onClick={() => setIsReviewModalOpen(true)}
                  className="p-2 text-white/45 hover:text-white/90 hover:bg-white/5 transition-colors rounded-lg"
                  aria-label="Review past tasks"
                >
                  <History size={14} />
                </button>
              )}
              {user ? (
                <button
                  onClick={signOut}
                  className="p-2 text-white/45 hover:text-white/90 hover:bg-white/5 transition-colors rounded-lg"
                  aria-label="Sign out"
                >
                  <LogOut size={14} />
                </button>
              ) : (
                <button
                  onClick={signIn}
                  className="p-2 text-white/45 hover:text-white/90 hover:bg-white/5 transition-colors rounded-lg"
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
                  className="p-2 text-white/45 hover:text-white/90 hover:bg-white/5 transition-colors rounded-lg"
                  aria-label="Previous day"
                >
                  <ChevronLeft size={17} />
                </button>

                <button
                  onClick={handleTodayClick}
                  className="flex-1 flex flex-col items-center py-1 group"
                >
                  <span className="text-xl font-semibold bg-gradient-to-r from-white to-white/85 bg-clip-text text-transparent tracking-tight group-hover:from-purple-200 group-hover:to-pink-200 transition-all">
                    {formatDate(selectedDate)}
                  </span>
                  {dayNumber !== null && (
                    <span className="text-[11px] text-white/55 mt-0.5">
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} · <span className="text-purple-300/80">Day {dayNumber}</span>
                    </span>
                  )}
                </button>

                <button
                  onClick={handleNextDay}
                  className="p-2 text-white/45 hover:text-white/90 hover:bg-white/5 transition-colors rounded-lg"
                  aria-label="Next day"
                >
                  <ChevronRight size={17} />
                </button>
              </div>

              {/* Progress bar */}
              {stats.total > 0 && (
                <div className="mt-2.5 flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-400 via-pink-400 to-emerald-400 transition-all duration-700 ease-out rounded-full shadow-sm shadow-purple-500/30"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-white/60 tabular-nums font-medium">
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
                    ? 'text-white/95 border-purple-400'
                    : 'text-white/45 border-transparent hover:text-white/75'
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
      <div className="relative z-10 flex-1 px-6 py-6 overflow-hidden flex flex-col">
        <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
          {activeTab === 'tasks' ? (
            <>
              {/* AI Pep Talk */}
              <DailyPepTalk
                talk={pepTalk}
                loading={pepTalkLoading}
                onRegenerate={regeneratePepTalk}
              />

              <TaskInput onAdd={handleAddTask} />

              {isToday && <SillyQuickStarts onAdd={handleAddTask} />}

              {/* Past incomplete tasks — shown inline on today */}
              {isToday && pastTasks.length > 0 && (
                <div className="mb-5">
                  <button
                    onClick={() => setPastCollapsed(c => !c)}
                    className="flex items-center gap-2 w-full mb-2 py-1 group"
                  >
                    <span className="text-[10px] font-semibold text-white/55 uppercase tracking-widest">
                      Previous days
                    </span>
                    <span className="text-[10px] text-purple-200/90 bg-purple-500/20 px-1.5 py-0.5 rounded-full font-medium">
                      {pastTasks.length}
                    </span>
                    <ChevronDown
                      size={11}
                      className={clsx('text-white/45 ml-auto transition-transform duration-200', pastCollapsed && '-rotate-90')}
                    />
                  </button>

                  {!pastCollapsed && (
                    <div className="flex flex-col gap-1">
                      {pastTasks.map(task => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 hover:bg-white/[0.07] transition-colors"
                        >
                          {/* Complete circle */}
                          <button
                            onClick={() => handleCompletePastTask(task.id)}
                            className="w-4 h-4 rounded-full border border-white/30 hover:border-emerald-400 hover:bg-emerald-500/20 transition-all shrink-0"
                            aria-label="Complete"
                          />
                          {/* Task text */}
                          <span className="flex-1 text-sm text-white/70 truncate">{task.text}</span>
                          {/* Date label */}
                          <span className="text-[10px] text-white/45 shrink-0">
                            {new Date(task.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          {/* Move to today */}
                          <button
                            onClick={() => handleMovePastTaskToToday(task.id)}
                            className="p-1 text-white/45 hover:text-purple-300 transition-colors shrink-0"
                            aria-label="Move to today"
                          >
                            <ChevronsRight size={13} />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => handleDeletePastTask(task.id)}
                            className="p-1 text-white/45 hover:text-red-400 transition-colors shrink-0"
                            aria-label="Delete"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}

                      {/* Bulk action */}
                      <button
                        onClick={handleMoveAllToToday}
                        className="text-[11px] text-white/50 hover:text-purple-300 transition-colors text-left py-1.5 pl-2 flex items-center gap-1"
                      >
                        <ChevronsRight size={12} />
                        Move all to today
                      </button>
                    </div>
                  )}
                </div>
              )}

              {loading ? (
                <div className="text-center py-12 text-white/55 text-sm">Loading...</div>
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
            <div className="flex-1 bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden">
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
                <div className="text-center py-12 text-white/55 text-sm">Loading stats...</div>
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
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500/25 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4 ring-1 ring-white/10">
                      <BarChart3 size={32} className="text-purple-300" />
                    </div>
                    <h3 className="text-lg font-medium text-white/90 mb-2">No stats yet</h3>
                    <p className="text-white/60 text-sm">
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
