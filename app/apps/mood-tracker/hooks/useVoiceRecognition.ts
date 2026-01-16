'use client';

import 'regenerator-runtime/runtime';
import { useEffect, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

export interface VoiceRecognitionState {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
}

export interface VoiceRecognitionControls {
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

/**
 * Hook for Web Speech API integration using react-speech-recognition
 * Provides voice recognition capabilities with real-time transcription
 */
export function useVoiceRecognition(): VoiceRecognitionState & VoiceRecognitionControls {
  const {
    transcript,
    interimTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const isSupported = browserSupportsSpeechRecognition;

  // Error state tracking
  const getError = (): string | null => {
    if (!isSupported) {
      return 'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.';
    }
    return null;
  };

  const startListening = useCallback(() => {
    console.log('[VoiceRecognition] startListening called', {
      isSupported,
      currentlyListening: listening,
    });

    if (!isSupported) {
      console.error('[VoiceRecognition] Speech recognition not supported');
      return;
    }

    console.log('[VoiceRecognition] Starting recognition...');
    SpeechRecognition.startListening({
      continuous: true,
      interimResults: true,
      language: 'en-US',
    });
  }, [isSupported, listening]);

  const stopListening = useCallback(() => {
    console.log('[VoiceRecognition] Stopping recognition...');
    SpeechRecognition.stopListening();
  }, []);

  return {
    isListening: listening,
    transcript,
    interimTranscript: interimTranscript || '',
    error: getError(),
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}
