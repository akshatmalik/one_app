'use client';

import { useState, useEffect, useRef } from 'react';
import { useChatDiary } from '../hooks/useChatDiary';
import { useMoodTracker } from '../hooks/useMoodTracker';
import { useAppSettings } from '../hooks/useAppSettings';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

export default function ChatDiaryPage() {
  const router = useRouter();
  const { entries, tags, categories, updateEntry, createEntry, refreshAll } = useMoodTracker();
  const { settings } = useAppSettings();
  const [inputValue, setInputValue] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const today = getTodayDate();
  const todayEntry = entries.find(e => e.date === today);

  // Calculate day number
  const start = new Date(settings.startDate);
  const current = new Date(today);
  const diffTime = current.getTime() - start.getTime();
  const dayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const chatDiary = useChatDiary({
    currentDate: today,
    dayNumber,
    availableTags: tags,
    availableCategories: categories,
    existingEntry: todayEntry || null,
    onSave: async (mood, tagIds, diaryContent) => {
      if (todayEntry) {
        await updateEntry(todayEntry.id, { mood, tagIds, diaryContent });
      } else {
        await createEntry({ dayNumber, date: today, mood, tagIds, diaryContent });
      }
      await refreshAll();
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatDiary.messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || chatDiary.isAIThinking) return;

    const messageText = inputValue.trim();
    setInputValue('');

    console.log('[ChatPage] Sending message:', messageText);
    await chatDiary.sendMessage(messageText);
    console.log('[ChatPage] After sendMessage, messages:', chatDiary.messages.length);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col">
      {/* Top Bar - WhatsApp style */}
      <div className="bg-[#1a1a1a] border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/apps/mood-tracker')}
            className="text-white/70 hover:text-white text-2xl leading-none"
          >
            ←
          </button>
          <div>
            <h1 className="text-white font-medium">Chat Diary</h1>
            <p className="text-xs text-white/50">Day {dayNumber}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save Button - Small */}
          {chatDiary.hasUnsavedMessages && !chatDiary.isSaving && (
            <button
              onClick={chatDiary.forceSave}
              className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 transition-colors"
            >
              💾 Save
            </button>
          )}

          {/* Saving Indicator */}
          {chatDiary.isSaving && (
            <div className="flex items-center gap-2 text-blue-300 text-xs">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-300"></div>
              Saving
            </div>
          )}

          {/* Saved Indicator */}
          {!chatDiary.hasUnsavedMessages && !chatDiary.isSaving && chatDiary.messages.length > 1 && (
            <div className="text-green-300 text-xs">✓</div>
          )}

          {/* Info Button */}
          <button
            onClick={() => setShowInfo(true)}
            className="w-8 h-8 rounded-full bg-white/10 text-white/70 hover:bg-white/20 transition-colors flex items-center justify-center"
          >
            ℹ️
          </button>
        </div>
      </div>

      {/* Error Banner - Compact */}
      {chatDiary.error && (
        <div className="bg-red-500/10 border-b border-red-500/30 px-4 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-red-300 text-xs flex-1">⚠️ {chatDiary.error.split('\n')[0]}</p>
            <button
              onClick={() => setShowInfo(true)}
              className="text-red-300 text-xs underline"
            >
              Details
            </button>
            <button
              onClick={chatDiary.clearError}
              className="text-red-300 hover:text-red-100 text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Messages Area - WhatsApp style */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {chatDiary.messages.map((msg, idx) => {
          console.log(`[ChatPage] Rendering message ${idx}:`, msg);
          return (
            <div
              key={`${msg.time}-${idx}`}
              className={clsx(
                'flex',
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={clsx(
                  'max-w-[75%] rounded-lg px-3 py-2',
                  msg.sender === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-white'
                )}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                <p className="text-[10px] mt-1 opacity-60 text-right">
                  {msg.time}
                </p>
              </div>
            </div>
          );
        })}

        {/* AI Thinking Indicator */}
        {chatDiary.isAIThinking && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-lg px-3 py-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - WhatsApp style */}
      <div className="bg-[#1a1a1a] border-t border-white/10 px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            rows={1}
            disabled={chatDiary.isAIThinking}
            className="flex-1 bg-white/10 text-white placeholder-white/40 rounded-full px-4 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            style={{ maxHeight: '120px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || chatDiary.isAIThinking}
            className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>

      {/* Info Modal */}
      {showInfo && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowInfo(false)}
        >
          <div
            className="bg-[#1a1a1a] border border-white/10 rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-[#1a1a1a] border-b border-white/10 px-4 py-3 flex items-center justify-between">
              <h2 className="text-white font-medium">Chat Info</h2>
              <button
                onClick={() => setShowInfo(false)}
                className="text-white/40 hover:text-white/60 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Status */}
              <div>
                <h3 className="text-white/70 text-sm font-medium mb-2">Status</h3>
                <div className="bg-white/5 rounded p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Messages</span>
                    <span className="text-white">{chatDiary.messages.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Unsaved</span>
                    <span className="text-white">{chatDiary.hasUnsavedMessages ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Auto-save</span>
                    <span className="text-white">2 min after last message</span>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div>
                <h3 className="text-white/70 text-sm font-medium mb-2">💡 Tips</h3>
                <ul className="bg-white/5 rounded p-3 space-y-1 text-xs text-white/60">
                  <li>• Chat naturally about your day</li>
                  <li>• Mention mood (1-5) when you feel like it</li>
                  <li>• AI will tag activities automatically</li>
                  <li>• Your words are preserved exactly</li>
                  <li>• Auto-saves after 2 min of inactivity</li>
                </ul>
              </div>

              {/* Error Details */}
              {chatDiary.error && (
                <div>
                  <h3 className="text-red-300 text-sm font-medium mb-2">⚠️ Error Details</h3>
                  <div className="bg-red-500/10 border border-red-500/30 rounded p-3">
                    <pre className="text-red-300 text-xs font-mono whitespace-pre-wrap break-all">
                      {chatDiary.error}
                    </pre>
                  </div>
                </div>
              )}

              {/* Debug Logs */}
              {chatDiary.logs.length > 0 && (
                <div>
                  <h3 className="text-blue-300 text-sm font-medium mb-2">🔍 Debug Logs</h3>
                  <div className="bg-black/50 rounded p-3 max-h-64 overflow-y-auto">
                    <div className="text-xs font-mono space-y-1">
                      {chatDiary.logs.map((log, idx) => (
                        <div
                          key={idx}
                          className={clsx(
                            'leading-relaxed',
                            log.includes('❌') ? 'text-red-300 font-bold' :
                            log.includes('✅') ? 'text-green-300' :
                            log.includes('📊') || log.includes('💾') ? 'text-yellow-300' :
                            'text-blue-200'
                          )}
                        >
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
