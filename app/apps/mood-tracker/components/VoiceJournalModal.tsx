'use client';

import { useState, useEffect } from 'react';
import { useVoiceJournal } from '../hooks/useVoiceJournal';
import { VoiceIndicator } from './VoiceIndicator';
import { VoiceJournalPreview } from './VoiceJournalPreview';
import { Tag, Category, DayData } from '../lib/types';
import { formatVoiceEntry, appendVoiceEntry, calculateDayNumber } from '../lib/voice-utils';
import clsx from 'clsx';

interface VoiceJournalModalProps {
  currentDate: string;
  startDate: string;
  currentDayNumber: number;
  tags: Tag[];
  categories: Category[];
  onSave: (mood: number | null, tagIds: string[], diaryContent: string) => Promise<void>;
  onEdit: (dayData: DayData) => void;
  onClose: () => void;
  existingEntry?: DayData | null;
}

type ModalState = 'ready' | 'listening' | 'processing' | 'preview' | 'success';

/**
 * Main Voice Journal Modal
 * Handles the complete voice journaling flow
 */
export function VoiceJournalModal({
  currentDate,
  startDate,
  currentDayNumber,
  tags,
  categories,
  onSave,
  onEdit,
  onClose,
  existingEntry,
}: VoiceJournalModalProps) {
  const [modalState, setModalState] = useState<ModalState>('ready');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const voiceJournal = useVoiceJournal({
    currentDate,
    startDate,
    availableTags: tags,
    availableCategories: categories,
  });

  // Auto-process when recording stops
  useEffect(() => {
    if (!voiceJournal.isListening && voiceJournal.transcript && modalState === 'listening') {
      setModalState('processing');
    }
  }, [voiceJournal.isListening, voiceJournal.transcript, modalState]);

  // Move to preview when interpretation is ready
  useEffect(() => {
    if (voiceJournal.interpretation && !voiceJournal.isProcessing && modalState === 'processing') {
      setModalState('preview');
    }
  }, [voiceJournal.interpretation, voiceJournal.isProcessing, modalState]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleStartRecording = () => {
    setSaveError(null);
    voiceJournal.startRecording();
    setModalState('listening');
  };

  const handleStopRecording = async () => {
    await voiceJournal.stopRecording();
    // State transition handled by useEffect
  };

  const handleTryAgain = () => {
    voiceJournal.reset();
    setModalState('ready');
    setSaveError(null);
  };

  const handleEdit = () => {
    if (!voiceJournal.interpretation) return;

    // Create a DayData object with the interpreted data
    const dayData: DayData = {
      dayNumber: voiceJournal.interpretation.dayNumber,
      date: voiceJournal.interpretation.targetDate,
      mood: voiceJournal.interpretation.mood,
      tags: tags.filter(tag => voiceJournal.interpretation!.existingTagIds.includes(tag.id)),
      diaryContent: voiceJournal.interpretation.diaryContent,
      hasEntry: false,
    };

    onEdit(dayData);
    onClose();
  };

  const handleConfirm = async () => {
    if (!voiceJournal.interpretation) return;

    setSaving(true);
    setSaveError(null);

    try {
      const interpretation = voiceJournal.interpretation;

      // Create new tags if suggested
      const newTagIds: string[] = [];
      for (const suggestedTag of interpretation.suggestedNewTags) {
        try {
          // In a real implementation, we'd call createTag here
          // For now, we'll just skip suggested tags
          // TODO: Add createTag functionality
          console.log('Suggested new tag:', suggestedTag);
        } catch (e) {
          console.error('Failed to create suggested tag:', e);
        }
      }

      // Combine existing tag IDs with newly created ones
      const allTagIds = [...interpretation.existingTagIds, ...newTagIds];

      // Format the voice entry with timestamp
      const voiceEntryText = formatVoiceEntry(
        interpretation.diaryContent,
        interpretation.timestamp
      );

      // If there's an existing entry, append to it
      let finalDiaryContent = voiceEntryText;
      if (existingEntry && existingEntry.diaryContent) {
        finalDiaryContent = appendVoiceEntry(existingEntry.diaryContent, voiceEntryText);
      }

      // Save the entry
      await onSave(
        interpretation.mood,
        allTagIds,
        finalDiaryContent
      );

      setModalState('success');

      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (e) {
      console.error('Failed to save voice entry:', e);
      setSaveError((e as Error).message || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  // Render different states
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>🎤</span>
                <span>Voice Journal</span>
              </h2>
              <p className="text-white/60 text-sm mt-1">Day {currentDayNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Error Display */}
          {voiceJournal.error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-300 text-sm">{voiceJournal.error}</p>
            </div>
          )}

          {saveError && (
            <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-300 text-sm">{saveError}</p>
            </div>
          )}

          {/* Browser Support Check */}
          {!voiceJournal.isSupported && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-center">
              <p className="text-yellow-300 mb-2">
                Voice recognition is not supported in this browser.
              </p>
              <p className="text-yellow-300/60 text-sm">
                Please use Chrome, Edge, or Safari for voice journaling.
              </p>
            </div>
          )}

          {/* Ready State */}
          {modalState === 'ready' && voiceJournal.isSupported && (
            <div className="text-center space-y-6">
              <button
                onClick={handleStartRecording}
                className="mx-auto w-32 h-32 rounded-full bg-purple-600 hover:bg-purple-700 transition-all flex items-center justify-center text-6xl shadow-lg hover:shadow-xl"
              >
                🎤
              </button>
              <div>
                <p className="text-white font-medium mb-2">Tap to start recording</p>
                <p className="text-white/60 text-sm">Tell me about your day</p>
              </div>

              {/* Tips */}
              <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4 text-left">
                <p className="text-white/80 font-medium mb-2">💡 Tips:</p>
                <ul className="text-white/60 text-sm space-y-1">
                  <li>• Mention how you&apos;re feeling (mood 1-5)</li>
                  <li>• Talk about what you did (activities/tags)</li>
                  <li>• Mention when it happened (today, yesterday, etc.)</li>
                  <li>• Speak naturally - I&apos;ll understand!</li>
                </ul>
              </div>
            </div>
          )}

          {/* Listening State */}
          {modalState === 'listening' && (
            <div className="space-y-6">
              <div className="text-center">
                <button
                  onClick={handleStopRecording}
                  className="mx-auto w-32 h-32 rounded-full bg-red-600 hover:bg-red-700 transition-all flex items-center justify-center text-6xl shadow-lg hover:shadow-xl animate-pulse"
                >
                  🔴
                </button>
                <p className="text-white font-medium mt-4">Listening...</p>
              </div>

              <VoiceIndicator isActive={voiceJournal.isListening} />

              {/* Transcript Display */}
              <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4 min-h-[120px]">
                <p className="text-white/40 text-sm mb-2">📝 Transcript:</p>
                <p className="text-white/90 leading-relaxed">
                  {voiceJournal.transcript || voiceJournal.interimTranscript || (
                    <span className="text-white/40 italic">Start speaking...</span>
                  )}
                  {voiceJournal.interimTranscript && (
                    <span className="text-white/50">{voiceJournal.interimTranscript}</span>
                  )}
                </p>
              </div>

              <button
                onClick={handleStopRecording}
                className="w-full px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
              >
                Stop Recording
              </button>
            </div>
          )}

          {/* Processing State */}
          {modalState === 'processing' && (
            <div className="text-center space-y-6 py-12">
              <div className="text-6xl">⏳</div>
              <div>
                <p className="text-white font-medium mb-2">Processing your entry...</p>
                <p className="text-white/60 text-sm">
                  Understanding what you said and extracting mood, tags, and details
                </p>
              </div>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            </div>
          )}

          {/* Preview State */}
          {modalState === 'preview' && voiceJournal.interpretation && (
            <VoiceJournalPreview
              interpretation={voiceJournal.interpretation}
              existingTags={tags}
              onConfirm={handleConfirm}
              onEdit={handleEdit}
              onTryAgain={handleTryAgain}
              onCancel={onClose}
            />
          )}

          {/* Success State */}
          {modalState === 'success' && (
            <div className="text-center space-y-6 py-12">
              <div className="text-6xl">✅</div>
              <div>
                <p className="text-white font-medium mb-2">Entry saved successfully!</p>
                <p className="text-white/60 text-sm">
                  Added to Day {voiceJournal.interpretation?.dayNumber}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
