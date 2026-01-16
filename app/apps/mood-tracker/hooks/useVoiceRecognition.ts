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

  const startListening = useCallback(async () => {
    console.log('[VoiceRecognition] startListening called', {
      isSupported,
      currentlyListening: listening,
    });

    if (!isSupported) {
      console.error('[VoiceRecognition] Speech recognition not supported');
      return;
    }

    try {
      // Request microphone permission explicitly
      console.log('[VoiceRecognition] Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[VoiceRecognition] ✅ Microphone permission granted');

      // Stop the test stream immediately (we only needed it for permission)
      stream.getTracks().forEach(track => track.stop());

      console.log('[VoiceRecognition] Starting speech recognition...');
      SpeechRecognition.startListening({
        continuous: true,
        interimResults: true,
        language: 'en-US',
      });
    } catch (error) {
      console.error('[VoiceRecognition] ❌ Microphone permission denied:', error);
      throw new Error('Microphone access denied. Please grant permission in your browser settings.');
    }
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
