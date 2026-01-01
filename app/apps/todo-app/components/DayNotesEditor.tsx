'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Save, X } from 'lucide-react';
import clsx from 'clsx';

interface DayNotesEditorProps {
  date: string;
  dayNumber: number | null;
  initialContent: string;
  onSave: (content: string) => Promise<void>;
  onClose: () => void;
}

export function DayNotesEditor({ date, dayNumber, initialContent, onSave, onClose }: DayNotesEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setContent(initialContent);
    setHasChanges(false);
  }, [initialContent, date]);

  const handleContentChange = (value: string) => {
    setContent(value);
    setHasChanges(value !== initialContent);
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    try {
      setSaving(true);
      await onSave(content);
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const formatDate = () => {
    const dateObj = new Date(date + 'T12:00:00');
    const formatted = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    return formatted;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
            <BookOpen size={20} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              {dayNumber !== null && (
                <span className="text-purple-400">Day {dayNumber}</span>
              )}
              {dayNumber !== null && ' • '}
              {formatDate()}
            </h3>
            <p className="text-xs text-white/40">Daily notes & reflections</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={clsx(
              'px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2',
              hasChanges && !saving
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-white/[0.03] text-white/30 cursor-not-allowed'
            )}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save
              </>
            )}
          </button>
          <button
            onClick={handleClose}
            className="p-2 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-all"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 p-6">
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Write your thoughts, reflections, or notes for this day...

You can write anything you want here:
• How was your day?
• What did you accomplish?
• What are you grateful for?
• What could be improved?
• Any insights or learnings?

This is your personal space to reflect and track your journey."
          className="w-full h-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all"
        />
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-white/5">
        <div className="flex items-center justify-between text-xs text-white/40">
          <div>
            {hasChanges ? (
              <span className="text-amber-400">Unsaved changes</span>
            ) : (
              <span>All changes saved</span>
            )}
          </div>
          <div>
            {content.length} characters
          </div>
        </div>
      </div>
    </div>
  );
}
