'use client';

import { useState, useMemo } from 'react';
import { TimerControls } from './components/TimerControls';
import { DailyTimeline } from './components/DailyTimeline';
import { ScheduleManager } from './components/ScheduleManager';
import { CategoryManager } from './components/CategoryManager';
import { useTimeEntries } from './hooks/useTimeEntries';
import { useSchedules } from './hooks/useSchedules';
import { getTodayDate, addDays, formatDateReadable, getActivePresetForDate } from './lib/utils';
import { ChevronLeft, ChevronRight, Calendar, Settings, Clock } from 'lucide-react';

type Tab = 'today' | 'schedules' | 'settings';

export default function TimeTrackerPage() {
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [selectedDate, setSelectedDate] = useState(getTodayDate());

  const { entries, deleteEntry } = useTimeEntries(selectedDate);
  const { schedules } = useSchedules();

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

  const isToday = selectedDate === getTodayDate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Time Tracker</h1>
          <p className="text-gray-600">Track your daily activities and compare with planned schedule</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'today'
                ? 'text-purple-600 border-purple-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            <Clock className="w-5 h-5" />
            Today
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'schedules'
                ? 'text-purple-600 border-purple-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            <Calendar className="w-5 h-5" />
            Schedules
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'settings'
                ? 'text-purple-600 border-purple-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePreviousDay}
                  className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  title="Previous day"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {formatDateReadable(selectedDate)}
                  </div>
                  {!isToday && (
                    <button
                      onClick={handleToday}
                      className="text-sm text-purple-600 hover:text-purple-700"
                    >
                      Go to today
                    </button>
                  )}
                </div>

                <button
                  onClick={handleNextDay}
                  className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
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

            {/* Timeline */}
            <DailyTimeline
              date={selectedDate}
              entries={entries}
              activePreset={activePreset}
              onDeleteEntry={deleteEntry}
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

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">About</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  <strong>Time Tracker</strong> helps you plan your day with schedule presets and track actual time spent on activities.
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
