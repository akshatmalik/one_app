'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  getChatResponse,
  analyzeChatBatch,
  ChatMessage,
  BatchAnalysis
} from '../lib/chat-ai-service';
import { Tag, Category, DayEntry } from '../lib/types';
import { getCurrentTimestamp } from '../lib/voice-utils';

const BATCH_DELAY_MS = 2 * 60 * 1000; // 2 minutes

export interface ChatSession {
  sessionId: string;
  startTime: string;
  endTime: string;
  summary: string;
  fullChat: ChatMessage[];
}

export interface ChatDiaryContent {
  version: 'chat-v1';
  sessions: ChatSession[];
}

export interface UseChatDiaryProps {
  currentDate: string;
  dayNumber: number;
  availableTags: Tag[];
  availableCategories: Category[];
  existingEntry: DayEntry | null;
  onSave: (mood: number | null, tagIds: string[], diaryContent: string) => Promise<void>;
}

export interface UseChatDiaryReturn {
  // State
  messages: ChatMessage[];
  isAIThinking: boolean;
  isSaving: boolean;
  error: string | null;
  logs: string[];
  hasUnsavedMessages: boolean;

  // Actions
  sendMessage: (text: string) => Promise<void>;
  forceSave: () => Promise<void>;
  clearError: () => void;
}

export function useChatDiary({
  currentDate,
  dayNumber,
  availableTags,
  availableCategories,
  existingEntry,
  onSave,
}: UseChatDiaryProps): UseChatDiaryReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastMessageTime, setLastMessageTime] = useState<number | null>(null);
  const [hasUnsavedMessages, setHasUnsavedMessages] = useState(false);

  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const sessionStartTimeRef = useRef<string | null>(null);

  // Initialize with greeting
  useEffect(() => {
    if (messages.length === 0) {
      const greeting: ChatMessage = {
        time: getCurrentTimestamp(),
        sender: 'ai',
        text: "Hey! How's your day going? Tell me what you've been up to 😊",
      };
      setMessages([greeting]);
      sessionStartTimeRef.current = greeting.time;
    }
  }, []);

  // Batch save timer
  useEffect(() => {
    if (!lastMessageTime || messages.length <= 1) return; // Skip if only greeting

    // Clear existing timer
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
    }

    // Set new timer for 2 minutes
    batchTimerRef.current = setTimeout(() => {
      if (hasUnsavedMessages) {
        console.log('[ChatDiary] 2 minutes passed, triggering batch save');
        batchSave();
      }
    }, BATCH_DELAY_MS);

    return () => {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
    };
  }, [lastMessageTime, hasUnsavedMessages]);

  // Save on unmount if there are unsaved messages
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (hasUnsavedMessages && messages.length > 1) {
        console.log('[ChatDiary] Component unmounting, saving unsaved messages');
        batchSave();
      }
    };
  }, [hasUnsavedMessages, messages]);

  /**
   * Send user message and get AI response
   */
  const sendMessage = useCallback(async (text: string) => {
    const userMessage: ChatMessage = {
      time: getCurrentTimestamp(),
      sender: 'user',
      text: text.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setLastMessageTime(Date.now());
    setHasUnsavedMessages(true);
    setIsAIThinking(true);
    setError(null);

    try {
      // Get AI response
      console.log('[useChatDiary] Calling getChatResponse with', messages.length, 'messages in history');
      console.log('[useChatDiary] User message being sent:', text);

      const result = await getChatResponse(text, messages, {
        currentDate,
        dayNumber,
        availableTags,
        currentMood: existingEntry?.mood || null,
      });

      console.log('[useChatDiary] getChatResponse returned, hasData:', !!result.data, 'hasError:', !!result.error);

      setLogs(result.logs);

      if (result.error) {
        setError(result.error);
      }

      console.log('[useChatDiary] Got AI result:', { hasData: !!result.data, isMounted: isMountedRef.current, data: result.data?.substring(0, 50) });

      if (result.data && isMountedRef.current) {
        const aiMessage: ChatMessage = {
          time: getCurrentTimestamp(),
          sender: 'ai',
          text: result.data,
        };
        console.log('[useChatDiary] Adding AI message:', aiMessage);
        setMessages(prev => {
          console.log('[useChatDiary] Previous messages count:', prev.length);
          const updated = [...prev, aiMessage];
          console.log('[useChatDiary] Updated messages count:', updated.length);
          return updated;
        });
        console.log('[useChatDiary] AI message added successfully');
      } else {
        console.log('[useChatDiary] NOT adding AI message - hasData:', !!result.data, 'isMounted:', isMountedRef.current);
      }
    } catch (err) {
      console.error('[ChatDiary] Error sending message:', err);
      setError(`Failed to get AI response: ${(err as Error).message}`);
    } finally {
      setIsAIThinking(false);
    }
  }, [messages, currentDate, dayNumber, availableTags, existingEntry]);

  /**
   * Batch save all messages
   */
  const batchSave = useCallback(async () => {
    if (messages.length <= 1 || isSaving) return; // Skip if only greeting or already saving

    console.log('[ChatDiary] Starting batch save...');
    setIsSaving(true);
    setError(null);

    try {
      // Analyze chat batch
      const analysisResult = await analyzeChatBatch(messages, {
        currentDate,
        dayNumber,
        availableTags,
        availableCategories,
      });

      setLogs(prev => [...prev, ...analysisResult.logs]);

      if (analysisResult.error) {
        setError(analysisResult.error);
      }

      const analysis = analysisResult.data;
      if (!analysis) {
        throw new Error('Batch analysis failed');
      }

      // Create chat session
      const session: ChatSession = {
        sessionId: uuidv4(),
        startTime: sessionStartTimeRef.current || messages[0].time,
        endTime: messages[messages.length - 1].time,
        summary: analysis.summary,
        fullChat: messages,
      };

      // Get existing diary content
      let diaryContent: ChatDiaryContent = {
        version: 'chat-v1',
        sessions: [],
      };

      if (existingEntry?.diaryContent) {
        try {
          const parsed = JSON.parse(existingEntry.diaryContent);
          if (parsed.version === 'chat-v1' && Array.isArray(parsed.sessions)) {
            diaryContent = parsed;
          }
        } catch (e) {
          console.warn('[ChatDiary] Could not parse existing diary content, creating new');
        }
      }

      // Append new session
      diaryContent.sessions.push(session);

      // Merge tags (existing + new)
      const existingTagIds = existingEntry?.tagIds || [];
      const allTagIds = [...new Set([...existingTagIds, ...analysis.matchedTagIds])];

      // Use analyzed mood or keep existing
      const mood = analysis.mood !== null ? analysis.mood : existingEntry?.mood || null;

      // Save to database
      await onSave(mood, allTagIds, JSON.stringify(diaryContent));

      console.log('[ChatDiary] Batch saved successfully');
      setHasUnsavedMessages(false);

      // Clear messages and reset for new session
      const newGreeting: ChatMessage = {
        time: getCurrentTimestamp(),
        sender: 'ai',
        text: "Saved! 😊 Anything else you want to add?",
      };
      setMessages([newGreeting]);
      sessionStartTimeRef.current = newGreeting.time;

    } catch (err) {
      console.error('[ChatDiary] Error batch saving:', err);
      setError(`Failed to save chat: ${(err as Error).message}\n\nYour messages are still here, will retry automatically.`);
    } finally {
      setIsSaving(false);
    }
  }, [messages, currentDate, dayNumber, availableTags, availableCategories, existingEntry, onSave, isSaving]);

  /**
   * Force save (manual trigger)
   */
  const forceSave = useCallback(async () => {
    console.log('[ChatDiary] Force save triggered');
    await batchSave();
  }, [batchSave]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    isAIThinking,
    isSaving,
    error,
    logs,
    hasUnsavedMessages,
    sendMessage,
    forceSave,
    clearError,
  };
}
