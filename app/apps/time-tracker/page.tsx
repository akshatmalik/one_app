'use client';

import { useState, useMemo } from 'react';
import { TimerControls } from './components/TimerControls';
import { DailyTimeline } from './components/DailyTimeline';
import { ScheduleManager } from './components/ScheduleManager';
import { CategoryManager } from './components/CategoryManager';
import { ManualEntryForm } from './components/ManualEntryForm';
import { StartDateSetup } from './components/StartDateSetup';
import { useTimeEntries } from './hooks/useTimeEntries';
import { useSchedules } from './hooks/useSchedules';
import { useTimer } from './hooks/useTimer';
import { useCategories } from './hooks/useCategories';
import { useSettings } from './hooks/useSettings';
import { getTodayDate, addDays, formatDateReadable, getActivePresetForDate, calculateDayNumber } from './lib/utils';
import { ChevronLeft, ChevronRight, Calendar, Settings, Clock, Sparkles } from 'lucide-react';
import { SAMPLE_CATEGORIES, SAMPLE_SCHEDULE, createSampleTimeEntries } from './data/sample-data';

type Tab = 'today' | 'schedules' | 'settings';

export default function TimeTrackerPage() {
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [selectedDate, setSelectedDate] = useState(getTodayDate());

  const { entries, deleteEntry, addEntry } = useTimeEntries(selectedDate);
  const { schedules, addSchedule } = useSchedules();
  const { categories, addCategory } = useCategories();
  const { startTimer } = useTimer();
  const { settings, loading: settingsLoading, createSettings } = useSettings();

  const activePreset = useMemo(() => {
    return getActivePresetForDate(schedules, selectedDate);
  }, [schedules, selectedDate]);

  const handlePreviousDay = () => {
    setSelectedDate(addDays(selectedDate, -1));
  };

  const handleNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  const handleToday = () => {
    setSelectedDate(getTodayDate());
  };

  const handleSetStartDate = async (date: string) => {
    await createSettings({ startDate: date });
  };

  const handleLoadSampleData = async () => {
    try {
      // Load categories
      for (const category of SAMPLE_CATEGORIES) {
        await addCategory(category);
      }

      // Load schedule
      await addSchedule(SAMPLE_SCHEDULE);

      // Load time entries for today
      const today = getTodayDate();
      const sampleEntries = createSampleTimeEntries(today);
      for (const entry of sampleEntries) {
        await addEntry(entry);
      }

      alert('Sample data loaded successfully! Check the Today, Schedules, and Settings tabs.');
    } catch (error) {
      alert('Error loading sample data: ' + (error as Error).message);
    }
  };

  const isToday = selectedDate === getTodayDate();
  const hasNoData = categories.length === 0 && schedules.length === 0 && entries.length === 0;

  // Show loading state while settings are loading
  if (settingsLoading) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  // Show start date setup if no settings exist
  if (!settings) {
    return <StartDateSetup onSetStartDate={handleSetStartDate} />;
  }

  // Calculate day number for display
  const dayNumber = calculateDayNumber(selectedDate, settings.startDate);

  return (
    <div className="min-h-[calc(100vh-60px)] flex flex-col">
      <div className="max-w-6xl mx-auto px-4 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Time Tracker</h1>
          <p className="text-white/60">Track your daily activities and compare with planned schedule</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/5">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'today'
                ? 'text-purple-400 border-purple-500'
                : 'text-white/60 border-transparent hover:text-white/80'
            }`}
          >
            <Clock className="w-5 h-5" />
            Today
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'schedules'
                ? 'text-purple-400 border-purple-500'
                : 'text-white/60 border-transparent hover:text-white/80'
            }`}
          >
            <Calendar className="w-5 h-5" />
            Schedules
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'settings'
                ? 'text-purple-400 border-purple-500'
                : 'text-white/60 border-transparent hover:text-white/80'
            }`}
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </div>

        {/* Today Tab */}
        {activeTab === 'today' && (
          <div className="space-y-6">
            {/* Date Navigation */}
            <div className="bg-white/[0.03] rounded-lg border border-white/5 p-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePreviousDay}
                  className="p-2 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors"
                  title="Previous day"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="text-center">
                  <div className="text-lg font-semibold text-white">
                    Day {dayNumber} • {formatDateReadable(selectedDate)}
                  </div>
                  {!isToday && (
                    <button
                      onClick={handleToday}
                      className="text-sm text-purple-400 hover:text-purple-300"
                    >
                      Go to today
                    </button>
                  )}
                </div>

                <button
                  onClick={handleNextDay}
                  className="p-2 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors"
                  title="Next day"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Timer (only show for today) */}
            {isToday && (
              <div>
                <TimerControls />
              </div>
            )}

            {/* Manual Entry Form */}
            <ManualEntryForm date={selectedDate} />

            {/* Timeline */}
            <DailyTimeline
              date={selectedDate}
              entries={entries}
              activePreset={activePreset}
              onDeleteEntry={deleteEntry}
              onStartTimer={startTimer}
              isToday={isToday}
            />
          </div>
        )}

        {/* Schedules Tab */}
        {activeTab === 'schedules' && (
          <div>
            <ScheduleManager />
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <CategoryManager />

            {/* Sample Data Button */}
            {hasNoData && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-6">
                <h3 className="font-semibold text-purple-300 mb-2">Get Started</h3>
                <p className="text-sm text-white/60 mb-4">
                  New to Time Tracker? Load sample data to see how it works with categories, schedules, and time entries.
                </p>
                <button
                  onClick={handleLoadSampleData}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  <Sparkles className="w-5 h-5" />
                  Load Sample Data
                </button>
              </div>
            )}

            <div className="bg-white/[0.03] rounded-lg border border-white/5 p-6">
              <h3 className="font-semibold text-white mb-4">About</h3>
              <div className="space-y-2 text-sm text-white/60">
                <p>
                  <strong className="text-white">Time Tracker</strong> helps you plan your day with schedule presets and track actual time spent on activities.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Create schedule presets for different types of days (workday, weekend, etc.)</li>
                  <li>Track time with one-click timer controls</li>
                  <li>Compare planned vs actual time spent</li>
                  <li>Organize activities with color-coded categories</li>
                  <li>Review past days to analyze your time usage</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
