'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Type definitions for Web Speech API
interface SpeechRecognitionInterface extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognitionInterface, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInterface, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionInterface, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognitionInterface, ev: SpeechRecognitionEvent) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

// Extend Window interface for WebKit Speech Recognition
declare global {
  interface Window {
    SpeechRecognition: {
      new(): SpeechRecognitionInterface;
    };
    webkitSpeechRecognition: {
      new(): SpeechRecognitionInterface;
    };
  }
}

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
 * Hook for Web Speech API integration
 * Provides voice recognition capabilities with real-time transcription
 */
export function useVoiceRecognition(): VoiceRecognitionState & VoiceRecognitionControls {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);

  // Check browser support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const supported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
      setIsSupported(supported);

      if (!supported) {
        setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      }
    }
  }, []);

  // Initialize recognition
  useEffect(() => {
    if (!isSupported || typeof window === 'undefined') return;

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;        // Keep listening
      recognition.interimResults = true;    // Show real-time results
      recognition.lang = 'en-US';          // Language
      recognition.maxAlternatives = 1;     // Just top result

      // Event handlers
      recognition.onstart = () => {
        console.log('Voice recognition started');
        setIsListening(true);
        setError(null);
      };

      recognition.onend = () => {
        console.log('Voice recognition ended');
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error('Voice recognition error:', event.error);
        setIsListening(false);

        // Handle different error types
        switch (event.error) {
          case 'no-speech':
            setError('No speech detected. Please try again.');
            break;
          case 'audio-capture':
            setError('No microphone found. Please check your device settings.');
            break;
          case 'not-allowed':
            setError('Microphone access denied. Please allow microphone access and try again.');
            break;
          case 'network':
            setError('Network error occurred. Please check your internet connection.');
            break;
          case 'aborted':
            // User manually stopped, not an error
            setError(null);
            break;
          case 'service-not-allowed':
            // Chrome/browser blocking service
            const isChrome = /chrome|crios|android/i.test(navigator.userAgent);
            const hasSafari = /safari/i.test(navigator.userAgent);
            const isSafari = hasSafari && !isChrome;

            if (isSafari) {
              setError('Safari voice recognition blocked. Please check: (1) Safari Settings → Privacy & Security → Microphone → Allow this site, (2) Site is using HTTPS (not HTTP), (3) Try Chrome or Edge instead.');
            } else {
              setError('Chrome voice recognition blocked. Please: (1) Click the microphone icon in the address bar to grant permission, (2) Check chrome://settings/content/microphone, (3) Reload the page and try again.');
            }
            break;
          default:
            setError(`Voice recognition error: ${event.error}. Please check browser permissions and try again.`);
        }
      };

      recognition.onresult = (event) => {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcriptPart = result[0].transcript;

          if (result.isFinal) {
            finalText += transcriptPart + ' ';
          } else {
            interimText += transcriptPart;
          }
        }

        // Update interim transcript for real-time display
        setInterimTranscript(interimText);

        // Append final transcript
        if (finalText) {
          setTranscript(prev => (prev + ' ' + finalText).trim());
          setInterimTranscript(''); // Clear interim when we get final
        }
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.error('Failed to initialize speech recognition:', e);
      setError('Failed to initialize speech recognition');
      setIsSupported(false);
    }

    // Cleanup
    return () => {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    };
  }, [isSupported]);

  const startListening = useCallback(() => {
    console.log('[VoiceRecognition] startListening called', {
      hasRecognition: !!recognitionRef.current,
      isSupported,
    });

    if (!recognitionRef.current || !isSupported) {
      const msg = 'Speech recognition is not available';
      console.error('[VoiceRecognition]', msg);
      setError(msg);
      return;
    }

    try {
      // Reset state
      setTranscript('');
      setInterimTranscript('');
      setError(null);

      console.log('[VoiceRecognition] Starting recognition...');
      // Start recognition
      recognitionRef.current.start();
    } catch (e) {
      console.error('[VoiceRecognition] Failed to start recognition:', e);
      setError('Failed to start voice recognition. Please try again.');
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
    } catch (e) {
      console.error('Failed to stop recognition:', e);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}
