'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';

interface StartDateSetupProps {
  onSetStartDate: (date: string) => Promise<void>;
}

export function StartDateSetup({ onSetStartDate }: StartDateSetupProps) {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onSetStartDate(selectedDate);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-60px)] flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center">
              <Calendar size={32} className="text-purple-400" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white text-center mb-2">
            Welcome to Time Tracker
          </h2>
          <p className="text-white/60 text-center mb-8">
            Let&apos;s set your starting date. This will be <span className="text-white font-medium">Day 1</span>.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-white/80 mb-3">
                Choose your Day 1
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                required
              />
              <p className="text-xs text-white/40 mt-2">
                You can pick today or any past date
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Calendar size={18} />
                  Start Tracking
                </>
              )}
            </button>
          </form>

          <div className="mt-6 p-4 bg-white/[0.03] border border-white/10 rounded-lg">
            <p className="text-xs text-white/60">
              <span className="font-medium text-white/80">Note:</span> Each day will show as &quot;Day 1&quot;, &quot;Day 2&quot;, etc. alongside the actual date.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
