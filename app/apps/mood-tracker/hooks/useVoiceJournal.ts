'use client';

import { useState, useCallback, useEffect } from 'react';
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

  // Logs for UI display
  aiLogs: string[];
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
  const [aiLogs, setAiLogs] = useState<string[]>([]);

  // Track voice recognition state changes
  useEffect(() => {
    if (voiceRecognition.isListening) {
      setAiLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✅ Voice recording started!`]);
    } else if (aiLogs.length > 0 && !voiceRecognition.isListening) {
      setAiLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ⏸️ Voice recording stopped`]);
    }
  }, [voiceRecognition.isListening]);

  // Track errors from voice recognition
  useEffect(() => {
    if (voiceRecognition.error) {
      setAiLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ Voice error: ${voiceRecognition.error}`]);
    }
  }, [voiceRecognition.error]);

  /**
   * Start voice recording
   */
  const startRecording = useCallback(() => {
    console.log('[VoiceJournal] Starting recording, clearing previous errors');

    // Add initial logs
    const initialLogs = [
      `[${new Date().toLocaleTimeString()}] 🎤 Voice recording requested`,
      `[${new Date().toLocaleTimeString()}] 📱 Browser: ${navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Other'}`,
      `[${new Date().toLocaleTimeString()}] 🔊 Microphone permission: checking...`,
    ];
    setAiLogs(initialLogs);

    setError(null);
    setInterpretation(null);
    setIsProcessing(false);
    voiceRecognition.startListening();
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
        console.log('[VoiceJournal] Using local interpretation (no AI)');
        result = simpleLocalInterpretation(currentTranscript, context);
      } else {
        // Use AI interpretation
        console.log('[VoiceJournal] Attempting AI interpretation...');
        const aiResult = await interpretVoiceJournal(currentTranscript, context);

        // Store logs from AI service
        if (aiResult.logs) {
          setAiLogs(aiResult.logs);
        }

        if (aiResult.error) {
          console.log('[VoiceJournal] AI error:', aiResult.error);
          setError(aiResult.error);
        }

        if (!aiResult.data) {
          // Fall back to local interpretation
          console.log('[VoiceJournal] AI failed, using local fallback');
          result = simpleLocalInterpretation(currentTranscript, context);
          if (!aiResult.error) {
            setError('AI interpretation failed. Using basic interpretation.');
          }
        } else {
          console.log('[VoiceJournal] AI interpretation successful');
          result = aiResult.data;
        }
      }

      console.log('[VoiceJournal] Interpretation ready:', result);
      setInterpretation(result);
    } catch (e) {
      console.error('[VoiceJournal] Failed to process transcript:', e);
      setError((e as Error).message || 'Failed to process voice input');

      // Try local fallback as last resort
      try {
        const context: VoiceContext = {
          currentDate,
          startDate,
          availableTags,
          availableCategories,
        };
        console.log('[VoiceJournal] Using emergency fallback interpretation');
        const fallback = simpleLocalInterpretation(currentTranscript, context);
        setInterpretation(fallback);
      } catch (fallbackError) {
        console.error('[VoiceJournal] Fallback interpretation also failed:', fallbackError);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [voiceRecognition.transcript, currentDate, startDate, availableTags, availableCategories]);

  /**
   * Stop voice recording and automatically process
   */
  const stopRecording = useCallback(async () => {
    setAiLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🛑 Stopping voice recording...`]);
    voiceRecognition.stopListening();

    // Auto-process the transcript after stopping
    // Wait a bit for final transcript to be captured
    setTimeout(() => {
      const currentTranscript = voiceRecognition.transcript.trim();
      setAiLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 📝 Transcript captured: ${currentTranscript.length} chars`,
        currentTranscript ? `[${new Date().toLocaleTimeString()}] ✅ Processing transcript...` : `[${new Date().toLocaleTimeString()}] ❌ No transcript captured!`
      ]);
      processTranscript();
    }, 500);
  }, [voiceRecognition, processTranscript]);

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

    // Logs for UI
    aiLogs,

    // Controls
    startRecording,
    stopRecording,
    processTranscript,
    reset,
  };
}
