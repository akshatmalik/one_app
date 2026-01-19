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

const BATCH_DELAY_MS = 5 * 60 * 1000; // 5 minutes - increased to reduce save frequency

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
        text: "Hey! How's your day going?",
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
    console.log('[useChatDiary] ===== SEND MESSAGE CALLED =====');
    console.log('[useChatDiary] User text:', text);

    const userMessage: ChatMessage = {
      time: getCurrentTimestamp(),
      sender: 'user',
      text: text.trim(),
    };

    // Add user message
    console.log('[useChatDiary] Adding user message to state');
    setMessages(prev => {
      console.log('[useChatDiary] Current messages before adding user:', prev.length);
      return [...prev, userMessage];
    });

    setLastMessageTime(Date.now());
    setHasUnsavedMessages(true);
    setIsAIThinking(true);
    setError(null);

    try {
      // Get current messages for context using a ref to avoid stale closure
      let chatHistory: ChatMessage[] = [];
      setMessages(prev => {
        chatHistory = prev;
        return prev; // Don't modify, just read
      });

      console.log('[useChatDiary] Chat history length:', chatHistory.length);
      console.log('[useChatDiary] Calling AI with history of', chatHistory.length, 'messages');

      const result = await getChatResponse(text, chatHistory, {
        currentDate,
        dayNumber,
        availableTags,
        currentMood: existingEntry?.mood || null,
      });

      console.log('[useChatDiary] ===== AI RESPONSE RECEIVED =====');
      console.log('[useChatDiary] Has data:', !!result.data);
      console.log('[useChatDiary] Has error:', !!result.error);
      console.log('[useChatDiary] Response text:', result.data?.substring(0, 100));

      setLogs(result.logs);

      if (result.error) {
        console.log('[useChatDiary] Setting error:', result.error);
        setError(result.error);
      }

      if (result.data) {
        console.log('[useChatDiary] ===== ADDING AI MESSAGE =====');
        const aiMessage: ChatMessage = {
          time: getCurrentTimestamp(),
          sender: 'ai',
          text: result.data,
        };

        console.log('[useChatDiary] AI message object:', { time: aiMessage.time, sender: aiMessage.sender, textLength: aiMessage.text.length });

        setMessages(prev => {
          console.log('[useChatDiary] Messages BEFORE adding AI:', prev.length);
          console.log('[useChatDiary] Last 2 messages:', prev.slice(-2).map(m => ({ sender: m.sender, text: m.text.substring(0, 20) })));

          const updated = [...prev, aiMessage];

          console.log('[useChatDiary] Messages AFTER adding AI:', updated.length);
          console.log('[useChatDiary] Last 2 messages now:', updated.slice(-2).map(m => ({ sender: m.sender, text: m.text.substring(0, 20) })));

          return updated;
        });

        console.log('[useChatDiary] ===== AI MESSAGE ADDED TO STATE =====');
      } else {
        console.log('[useChatDiary] ===== NOT ADDING AI MESSAGE =====');
        console.log('[useChatDiary] Reason: result.data is', result.data);
      }
    } catch (err) {
      console.error('[useChatDiary] ===== ERROR IN SEND MESSAGE =====');
      console.error('[ChatDiary] Error:', err);
      setError(`Failed to get AI response: ${(err as Error).message}`);
    } finally {
      console.log('[useChatDiary] ===== SEND MESSAGE COMPLETE =====');
      setIsAIThinking(false);
    }
  }, [currentDate, dayNumber, availableTags, existingEntry]); // Removed 'messages' from deps!

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

      // DON'T clear messages - keep the conversation going!
      // Just mark as saved via the UI (hasUnsavedMessages = false)
      console.log('[ChatDiary] Messages preserved, marked as saved');

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
