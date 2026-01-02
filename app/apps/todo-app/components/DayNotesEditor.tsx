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
    <div className="flex flex-col h-full bg-gradient-to-br from-purple-950/10 via-transparent to-blue-950/5">
      {/* Ultra-compact Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.03]">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-purple-400/60" />
          <h3 className="text-sm font-medium text-white/60">
            {dayNumber !== null && (
              <span className="text-purple-400">Day {dayNumber}</span>
            )}
            {dayNumber !== null && ' • '}
            {formatDate()}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={clsx(
              'px-3 py-1.5 rounded-lg font-medium text-xs transition-all flex items-center gap-1.5',
              hasChanges && !saving
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg shadow-purple-500/20'
                : 'bg-white/[0.02] text-white/20 cursor-not-allowed'
            )}
          >
            {saving ? (
              <>
                <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={14} />
                Save
              </>
            )}
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 text-white/30 hover:text-white/60 hover:bg-white/5 rounded-lg transition-all"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Maximized Writing Area - Like Evernote */}
      <div className="flex-1 px-12 py-10 overflow-y-auto">
        <div className="max-w-3xl mx-auto h-full">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Start writing... How was your day? What are you thinking about? What are you grateful for?"
            className="w-full h-full min-h-[600px] bg-transparent border-0 px-0 py-0 text-white/90 text-base leading-loose placeholder:text-white/20 placeholder:leading-loose focus:outline-none resize-none"
            style={{
              fontFamily: 'inherit',
              lineHeight: '1.8',
              fontSize: '16px'
            }}
          />
        </div>
      </div>

      {/* Ultra-minimal Footer - Status Only */}
      <div className="px-6 py-2 border-t border-white/[0.03] bg-black/5">
        <div className="flex items-center justify-between text-xs">
          <div>
            {hasChanges ? (
              <span className="text-amber-400/70 font-medium">● Unsaved</span>
            ) : (
              <span className="text-emerald-400/50">✓ Saved</span>
            )}
          </div>
          {content.length > 0 && (
            <div className="text-white/20">
              {content.length.toLocaleString()} chars
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
