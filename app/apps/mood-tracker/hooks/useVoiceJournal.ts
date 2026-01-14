'use client';

import { useState, useCallback } from 'react';
import { useVoiceRecognition } from './useVoiceRecognition';
import { interpretVoiceJournal, simpleLocalInterpretation, VoiceContext } from '../lib/ai-voice-service';
import { InterpretedData, Tag, Category } from '../lib/types';

export interface VoiceJournalState {
  // Voice recognition state
  isListening: boolean;
  transcript: string;
  interimTranscript: string;

  // Processing state
  isProcessing: boolean;
  interpretation: InterpretedData | null;

  // Error state
  error: string | null;
  isSupported: boolean;
}

export interface VoiceJournalControls {
  startRecording: () => void;
  stopRecording: () => Promise<void>;
  processTranscript: (useLocalFallback?: boolean) => Promise<void>;
  reset: () => void;
}

export interface VoiceJournalHookProps {
  currentDate: string;
  startDate: string;
  availableTags: Tag[];
  availableCategories: Category[];
}

/**
 * Main orchestration hook for voice journaling
 * Combines voice recognition and AI interpretation
 */
export function useVoiceJournal({
  currentDate,
  startDate,
  availableTags,
  availableCategories,
}: VoiceJournalHookProps): VoiceJournalState & VoiceJournalControls {
  const voiceRecognition = useVoiceRecognition();
  const [isProcessing, setIsProcessing] = useState(false);
  const [interpretation, setInterpretation] = useState<InterpretedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Start voice recording
   */
  const startRecording = useCallback(() => {
    setError(null);
    setInterpretation(null);
    voiceRecognition.startListening();
  }, [voiceRecognition]);

  /**
   * Stop voice recording and automatically process
   */
  const stopRecording = useCallback(async () => {
    voiceRecognition.stopListening();

    // Auto-process the transcript after stopping
    // Wait a bit for final transcript to be captured
    setTimeout(() => {
      processTranscript();
    }, 500);
  }, [voiceRecognition]);

  /**
   * Process the current transcript with AI
   */
  const processTranscript = useCallback(async (useLocalFallback: boolean = false) => {
    const currentTranscript = voiceRecognition.transcript.trim();

    if (!currentTranscript) {
      setError('No speech detected. Please try recording again.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const context: VoiceContext = {
        currentDate,
        startDate,
        availableTags,
        availableCategories,
      };

      let result: InterpretedData;

      if (useLocalFallback) {
        // Use simple local interpretation without AI
        result = simpleLocalInterpretation(currentTranscript, context);
      } else {
        // Use AI interpretation
        const aiResult = await interpretVoiceJournal(currentTranscript, context);

        if (aiResult.error) {
          setError(`AI interpretation warning: ${aiResult.error}`);
        }

        if (!aiResult.data) {
          // Fall back to local interpretation
          result = simpleLocalInterpretation(currentTranscript, context);
          setError('AI interpretation failed. Using basic interpretation.');
        } else {
          result = aiResult.data;
        }
      }

      setInterpretation(result);
    } catch (e) {
      console.error('Failed to process transcript:', e);
      setError((e as Error).message || 'Failed to process voice input');

      // Try local fallback as last resort
      try {
        const context: VoiceContext = {
          currentDate,
          startDate,
          availableTags,
          availableCategories,
        };
        const fallback = simpleLocalInterpretation(currentTranscript, context);
        setInterpretation(fallback);
      } catch (fallbackError) {
        console.error('Fallback interpretation also failed:', fallbackError);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [voiceRecognition.transcript, currentDate, startDate, availableTags, availableCategories]);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    voiceRecognition.resetTranscript();
    setInterpretation(null);
    setError(null);
    setIsProcessing(false);
  }, [voiceRecognition]);

  return {
    // Voice recognition state
    isListening: voiceRecognition.isListening,
    transcript: voiceRecognition.transcript,
    interimTranscript: voiceRecognition.interimTranscript,

    // Processing state
    isProcessing,
    interpretation,

    // Error state
    error: error || voiceRecognition.error,
    isSupported: voiceRecognition.isSupported,

    // Controls
    startRecording,
    stopRecording,
    processTranscript,
    reset,
  };
}
