'use client';

import { useState, useEffect } from 'react';
import { useVoiceJournal } from '../hooks/useVoiceJournal';
import { VoiceIndicator } from './VoiceIndicator';
import { Tag, Category, DayData } from '../lib/types';
import { formatVoiceEntry, appendVoiceEntry } from '../lib/voice-utils';
import clsx from 'clsx';

interface VoiceJournalTabProps {
  currentDate: string;
  startDate: string;
  currentDayNumber: number;
  tags: Tag[];
  categories: Category[];
  onSave: (mood: number | null, tagIds: string[], diaryContent: string) => Promise<void>;
  existingEntry?: DayData | null;
}

type TabState = 'ready' | 'listening' | 'processing' | 'editing';

export function VoiceJournalTab({
  currentDate,
  startDate,
  currentDayNumber,
  tags,
  categories,
  onSave,
  existingEntry,
}: VoiceJournalTabProps) {
  const [tabState, setTabState] = useState<TabState>('ready');
  const [saving, setSaving] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Editable state
  const [editedMood, setEditedMood] = useState<number | null>(null);
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [editedContent, setEditedContent] = useState('');

  const voiceJournal = useVoiceJournal({
    currentDate,
    startDate,
    availableTags: tags,
    availableCategories: categories,
  });

  // Auto-process when recording stops
  useEffect(() => {
    if (!voiceJournal.isListening && voiceJournal.transcript && tabState === 'listening') {
      setTabState('processing');
    }
  }, [voiceJournal.isListening, voiceJournal.transcript, tabState]);

  // Move to editing when interpretation is ready
  useEffect(() => {
    if (voiceJournal.interpretation && !voiceJournal.isProcessing && tabState === 'processing') {
      const interp = voiceJournal.interpretation;
      setEditedMood(interp.mood);
      setEditedTags(interp.existingTagIds);
      setEditedContent(interp.diaryContent);
      setTabState('editing');
    }
  }, [voiceJournal.interpretation, voiceJournal.isProcessing, tabState]);

  const handleStartRecording = () => {
    voiceJournal.startRecording();
    setTabState('listening');
  };

  const handleStopRecording = async () => {
    await voiceJournal.stopRecording();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const voiceEntryText = formatVoiceEntry(editedContent, new Date().toISOString());
      let finalContent = voiceEntryText;

      if (existingEntry?.diaryContent) {
        finalContent = appendVoiceEntry(existingEntry.diaryContent, voiceEntryText);
      }

      await onSave(editedMood, editedTags, finalContent);

      // Reset state
      setTabState('ready');
      setEditedMood(null);
      setEditedTags([]);
      setEditedContent('');
      voiceJournal.reset();
    } catch (e) {
      console.error('Failed to save:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setTabState('ready');
    setEditedMood(null);
    setEditedTags([]);
    setEditedContent('');
    voiceJournal.reset();
  };

  const toggleTag = (tagId: string) => {
    setEditedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col">
      {/* Header with Debug Toggle */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>🎤</span>
          <span>Voice Journal</span>
          <span className="text-white/40 text-sm font-normal">Day {currentDayNumber}</span>
        </h2>
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="text-xs px-3 py-1.5 bg-white/[0.02] border border-white/10 rounded-lg hover:bg-white/[0.04] transition-colors text-white/60 flex items-center gap-1"
        >
          <span>🔍</span>
          <span>Debug</span>
          <span>{showDebug ? '▲' : '▼'}</span>
        </button>
      </div>

      {/* Debug Panel (Collapsible) */}
      {showDebug && (
        <div className="mb-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 max-h-64 overflow-y-auto">
          <div className="text-blue-300 text-xs font-mono space-y-1">
            <div>State: <span className="text-blue-100">{tabState}</span></div>
            <div>Voice: <span className="text-blue-100">{voiceJournal.isSupported ? '✅' : '❌'}</span></div>
            <div>Listening: <span className="text-blue-100">{voiceJournal.isListening ? '🔴' : '⚪'}</span></div>
            <div>Processing: <span className="text-blue-100">{voiceJournal.isProcessing ? '⏳' : '⚪'}</span></div>
            <div>Transcript: <span className="text-blue-100">{voiceJournal.transcript ? `${voiceJournal.transcript.length} chars` : 'none'}</span></div>
            <div>Logs: <span className="text-blue-100">{voiceJournal.aiLogs.length}</span></div>
          </div>

          {voiceJournal.aiLogs.length > 0 && (
            <div className="mt-3 pt-3 border-t border-blue-500/20">
              <div className="text-xs font-mono space-y-0.5 max-h-32 overflow-y-auto">
                {voiceJournal.aiLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={clsx(
                      log.includes('❌') ? 'text-red-300' :
                      log.includes('✅') ? 'text-green-300' :
                      'text-blue-200'
                    )}
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {voiceJournal.error && (
            <div className="mt-3 pt-3 border-t border-red-500/20">
              <div className="text-red-300 text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                {voiceJournal.error}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Alert (Compact) */}
      {voiceJournal.error && !showDebug && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center justify-between">
          <span className="text-red-300 text-sm">⚠️ Error occurred</span>
          <button
            onClick={() => setShowDebug(true)}
            className="text-xs text-red-300 underline"
          >
            View Details
          </button>
        </div>
      )}

      {/* Content Area - Grows upward */}
      <div className="flex-1 overflow-y-auto mb-4">
        {/* Ready State */}
        {tabState === 'ready' && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="text-6xl mb-2">🎤</div>
            <p className="text-white/60 text-sm max-w-md">
              Tap the button below to start recording. Tell me about your day, mood, and activities.
            </p>
          </div>
        )}

        {/* Listening State */}
        {tabState === 'listening' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-5xl mb-2 animate-pulse">🔴</div>
              <p className="text-white font-medium">Listening...</p>
            </div>

            <VoiceIndicator isActive={voiceJournal.isListening} />

            {/* Live Transcript */}
            <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4 min-h-[120px]">
              <p className="text-white/40 text-xs mb-2">📝 Transcript:</p>
              <p className="text-white/90 leading-relaxed text-sm">
                {voiceJournal.transcript || voiceJournal.interimTranscript || (
                  <span className="text-white/40 italic">Start speaking...</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Processing State */}
        {tabState === 'processing' && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="text-5xl">⏳</div>
            <p className="text-white font-medium">Processing...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        )}

        {/* Editing State */}
        {tabState === 'editing' && (
          <div className="space-y-4">
            {/* Mood Selector */}
            <div>
              <label className="text-white/60 text-xs mb-2 block">Mood</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setEditedMood(rating)}
                    className={clsx(
                      'w-12 h-12 rounded-lg border-2 transition-all text-xl',
                      editedMood === rating
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    )}
                  >
                    {rating === editedMood ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="text-white/60 text-xs mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-sm transition-all',
                      editedTags.includes(tag.id)
                        ? 'bg-purple-500/20 border-2 border-purple-500'
                        : 'bg-white/[0.02] border-2 border-white/10 hover:border-white/20'
                    )}
                  >
                    <span>{tag.emoji}</span>
                    <span className="ml-1 text-white/90">{tag.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Diary Content */}
            <div>
              <label className="text-white/60 text-xs mb-2 block">Entry</label>
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full min-h-[200px] bg-white/[0.02] border border-white/10 rounded-lg p-4 text-white/90 focus:outline-none focus:border-purple-500 resize-none"
                placeholder="Your journal entry..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Button - Fixed */}
      <div className="border-t border-white/10 pt-4">
        {/* Ready State Button */}
        {tabState === 'ready' && (
          <button
            onClick={handleStartRecording}
            disabled={!voiceJournal.isSupported}
            className="w-full py-4 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
          >
            <span>🎤</span>
            <span>Tap to Record</span>
          </button>
        )}

        {/* Listening State Button */}
        {tabState === 'listening' && (
          <button
            onClick={handleStopRecording}
            className="w-full py-4 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-lg"
          >
            <span>🔴</span>
            <span>Stop Recording</span>
          </button>
        )}

        {/* Processing State - No Button */}
        {tabState === 'processing' && (
          <div className="w-full py-4 bg-white/[0.02] text-white/60 font-medium rounded-lg text-center">
            Processing...
          </div>
        )}

        {/* Editing State Buttons */}
        {tabState === 'editing' && (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex-1 py-3 bg-white/[0.02] border border-white/10 text-white font-medium rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>Save Entry</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
