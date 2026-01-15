'use client';

import { InterpretedData, Tag } from '../lib/types';
import { getMoodEmoji, formatDateForDisplay } from '../lib/voice-utils';
import clsx from 'clsx';

interface VoiceJournalPreviewProps {
  interpretation: InterpretedData;
  existingTags: Tag[];
  onConfirm: () => void;
  onEdit: () => void;
  onTryAgain: () => void;
  onCancel: () => void;
}

/**
 * Preview component for AI-interpreted voice journal data
 * Shows user what will be saved before confirming
 */
export function VoiceJournalPreview({
  interpretation,
  existingTags,
  onConfirm,
  onEdit,
  onTryAgain,
  onCancel,
}: VoiceJournalPreviewProps) {
  // Get tag objects for existing tag IDs
  const matchedTags = existingTags.filter(tag =>
    interpretation.existingTagIds.includes(tag.id)
  );

  // Mood emoji display
  const moodEmojis = ['😢', '😕', '😐', '😊', '😄'];
  const moodEmoji = getMoodEmoji(interpretation.mood);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-white mb-1">Preview Your Entry</h3>
        <p className="text-white/60 text-sm">Review and confirm before saving</p>
      </div>

      {/* Confidence Indicator */}
      {interpretation.confidence === 'low' && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
          <p className="text-yellow-300 text-sm flex items-center gap-2">
            <span>⚠️</span>
            <span>Low confidence - please review carefully</span>
          </p>
        </div>
      )}

      {/* Ambiguities */}
      {interpretation.ambiguities.length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
          <p className="text-orange-300 text-sm font-medium mb-1">Notes:</p>
          <ul className="text-orange-300/80 text-sm space-y-1">
            {interpretation.ambiguities.map((ambiguity, idx) => (
              <li key={idx}>• {ambiguity}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview Content */}
      <div className="bg-white/[0.02] border border-white/10 rounded-lg p-6 space-y-4">
        {/* Date */}
        <div>
          <div className="text-sm font-medium text-white/40 mb-1">📅 Date</div>
          <div className="text-white">
            {formatDateForDisplay(interpretation.targetDate)} (Day {interpretation.dayNumber})
          </div>
        </div>

        {/* Mood */}
        <div>
          <div className="text-sm font-medium text-white/40 mb-1">😊 Mood</div>
          {interpretation.mood !== null ? (
            <div className="flex items-center gap-2">
              <div className="text-2xl">{moodEmoji}</div>
              <div className="text-white">{interpretation.mood}/5</div>
              <div className="flex gap-0.5 ml-2">
                {moodEmojis.map((emoji, idx) => (
                  <span
                    key={idx}
                    className={clsx(
                      'text-xl transition-opacity',
                      idx < (interpretation.mood || 0) ? 'opacity-100' : 'opacity-20'
                    )}
                  >
                    {emoji}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-white/60">Not specified</div>
          )}
        </div>

        {/* Timestamp */}
        <div>
          <div className="text-sm font-medium text-white/40 mb-1">⏰ Time</div>
          <div className="text-white">{interpretation.timestamp}</div>
        </div>

        {/* Existing Tags */}
        {matchedTags.length > 0 && (
          <div>
            <div className="text-sm font-medium text-white/40 mb-2">🏷️ Tags</div>
            <div className="flex flex-wrap gap-2">
              {matchedTags.map(tag => (
                <div
                  key={tag.id}
                  className="px-3 py-1.5 bg-purple-600/20 border border-purple-500/30 rounded-lg text-white text-sm flex items-center gap-1"
                >
                  <span>{tag.emoji}</span>
                  <span>{tag.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested New Tags */}
        {interpretation.suggestedNewTags.length > 0 && (
          <div>
            <div className="text-sm font-medium text-white/40 mb-2">
              ✨ Suggested New Tags
            </div>
            <div className="flex flex-wrap gap-2">
              {interpretation.suggestedNewTags.map((tag, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 bg-green-600/20 border border-green-500/30 rounded-lg text-white text-sm flex items-center gap-1"
                >
                  <span>{tag.emoji}</span>
                  <span>{tag.name}</span>
                  <span className="text-green-400 text-xs">(new)</span>
                </div>
              ))}
            </div>
            <p className="text-white/40 text-xs mt-2">
              These tags will be created and added to your entry
            </p>
          </div>
        )}

        {/* Diary Content */}
        <div>
          <div className="text-sm font-medium text-white/40 mb-2">📝 Diary Entry</div>
          <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4">
            <p className="text-white/90 whitespace-pre-wrap leading-relaxed">
              {interpretation.diaryContent}
            </p>
          </div>
          <p className="text-white/40 text-xs mt-2">
            This will be added to your diary with a voice marker (🎤)
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onTryAgain}
          className="px-4 py-3 bg-white/[0.02] border border-white/10 rounded-lg text-white font-medium hover:bg-white/[0.04] transition-colors flex items-center justify-center gap-2"
        >
          <span>🔄</span>
          <span>Try Again</span>
        </button>
        <button
          onClick={onEdit}
          className="px-4 py-3 bg-white/[0.02] border border-white/10 rounded-lg text-white font-medium hover:bg-white/[0.04] transition-colors flex items-center justify-center gap-2"
        >
          <span>✏️</span>
          <span>Edit</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-3 bg-white/[0.02] border border-white/10 rounded-lg text-white/60 font-medium hover:bg-white/[0.04] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-3 bg-purple-600 rounded-lg text-white font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
        >
          <span>✅</span>
          <span>Save Entry</span>
        </button>
      </div>
    </div>
  );
}
