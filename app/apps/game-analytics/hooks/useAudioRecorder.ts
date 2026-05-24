'use client';

import { useCallback, useRef, useState } from 'react';

export interface RecordedAudio {
  base64: string;   // raw base64 (no data: prefix)
  mimeType: string; // normalized mime type without codec suffix
}

export interface AudioRecorderControls {
  isRecording: boolean;
  isSupported: boolean;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<RecordedAudio | null>;
  cancelRecording: () => void;
}

// Prefer formats Gemini documents support for first (ogg/mp4), fall back to webm.
const MIME_CANDIDATES = [
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/webm;codecs=opus',
  'audio/webm',
];

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const c of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return '';
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function useAudioRecorder(): AudioRecorderControls {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const isSupported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined';

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    if (!isSupported) {
      setError('Voice recording is not supported in this browser. Try Chrome, Edge, or Safari.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (e) {
      cleanupStream();
      setError(
        e instanceof Error && e.name === 'NotAllowedError'
          ? 'Microphone permission denied. Enable it to record.'
          : 'Could not access the microphone.'
      );
    }
  }, [isSupported, cleanupStream]);

  const stopRecording = useCallback((): Promise<RecordedAudio | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        setIsRecording(false);
        resolve(null);
        return;
      }
      recorder.onstop = async () => {
        const fullType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: fullType });
        cleanupStream();
        setIsRecording(false);
        recorderRef.current = null;
        if (blob.size === 0) {
          resolve(null);
          return;
        }
        try {
          const base64 = await blobToBase64(blob);
          resolve({ base64, mimeType: fullType.split(';')[0] });
        } catch {
          resolve(null);
        }
      };
      recorder.stop();
    });
  }, [cleanupStream]);

  const cancelRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      try { recorder.stop(); } catch { /* noop */ }
    }
    cleanupStream();
    chunksRef.current = [];
    recorderRef.current = null;
    setIsRecording(false);
  }, [cleanupStream]);

  return { isRecording, isSupported, error, startRecording, stopRecording, cancelRecording };
}
