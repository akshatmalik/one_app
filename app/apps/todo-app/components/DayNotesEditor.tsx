'use client';

import { useState, useEffect, useRef } from 'react';
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContent(initialContent);
    setHasChanges(false);
    // Auto-focus the textarea when the component mounts or date changes
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
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
    <div className="flex flex-col h-full bg-gradient-to-br from-purple-950/20 via-transparent to-blue-950/10">
      {/* Compact Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-purple-600/30 to-purple-700/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-purple-500/20">
            <BookOpen size={18} className="text-purple-300" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white/90">
              {dayNumber !== null && (
                <span className="text-purple-400">Day {dayNumber}</span>
              )}
              {dayNumber !== null && ' • '}
              {formatDate()}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={clsx(
              'px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2',
              hasChanges && !saving
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg shadow-purple-500/25'
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
            className="p-2 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-xl transition-all"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Spacious Writing Area */}
      <div className="flex-1 px-8 py-8 overflow-hidden">
        <div className="h-full relative">
          {/* Decorative elements for a journal feel */}
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500/20 via-purple-500/10 to-transparent rounded-full" />

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Start writing...

How was your day? What are you thinking about? What are you grateful for?

This is your space to reflect, dream, and capture your thoughts."
            className="w-full h-full bg-transparent border-0 pl-6 pr-4 py-2 text-white/90 text-base leading-relaxed placeholder:text-white/25 placeholder:leading-relaxed focus:outline-none resize-none"
            style={{
              fontFamily: 'inherit',
              lineHeight: '1.75',
              fontSize: '16px'
            }}
          />
        </div>
      </div>

      {/* Minimal Footer */}
      <div className="px-8 py-3 border-t border-white/5 bg-black/10">
        <div className="flex items-center justify-between text-xs">
          <div>
            {hasChanges ? (
              <span className="text-amber-400/90 font-medium">● Unsaved changes</span>
            ) : (
              <span className="text-emerald-400/70">✓ Saved</span>
            )}
          </div>
          {content.length > 0 && (
            <div className="text-white/30">
              {content.length} characters
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
