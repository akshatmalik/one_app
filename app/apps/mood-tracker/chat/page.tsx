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
  const [showDebug, setShowDebug] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const today = getTodayDate();
  const todayEntry = entries.find(e => e.date === today);

  // Calculate day number
  const startDate = settings?.startDate || today;
  const start = new Date(startDate);
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

  // Auto-scroll to bottom when new messages arrive or keyboard state changes
  useEffect(() => {
    // Scroll immediately and after a short delay (for keyboard animation)
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 300);

    return () => clearTimeout(timer);
  }, [chatDiary.messages, chatDiary.isAIThinking]);

  // Force scroll when input is focused (keyboard opens)
  const handleInputFocus = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 400);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || chatDiary.isAIThinking) return;

    const messageText = inputValue.trim();
    setInputValue('');

    console.log('[ChatPage] Sending message:', messageText);
    console.log('[ChatPage] Messages before send:', chatDiary.messages.length);
    await chatDiary.sendMessage(messageText);
    console.log('[ChatPage] After sendMessage, messages:', chatDiary.messages.length);
    console.log('[ChatPage] All messages:', chatDiary.messages.map(m => ({ sender: m.sender, text: m.text.substring(0, 20) })));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 top-0 bg-[#0a0a0a] flex flex-col" style={{ height: '100dvh', paddingTop: 0 }}>
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
      {/* Top Bar - WhatsApp style */}
      <div className="bg-[#1a1a1a] border-b border-white/10 px-4 py-2 flex items-center justify-between flex-shrink-0 z-10">
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
              className="px-2.5 py-1 bg-purple-600 text-white text-[11px] font-medium rounded hover:bg-purple-700 transition-colors"
            >
              💾
            </button>
          )}

          {/* Saving Indicator */}
          {chatDiary.isSaving && (
            <div className="flex items-center gap-1 text-blue-300 text-[11px]">
              <div className="animate-spin rounded-full h-2.5 w-2.5 border-b-2 border-blue-300"></div>
            </div>
          )}

          {/* Saved Indicator */}
          {!chatDiary.hasUnsavedMessages && !chatDiary.isSaving && chatDiary.messages.length > 1 && (
            <div className="text-green-300 text-sm">✓</div>
          )}

          {/* Info Button */}
          <button
            onClick={() => setShowInfo(true)}
            className="w-7 h-7 rounded-full bg-white/10 text-white/70 hover:bg-white/20 transition-colors flex items-center justify-center text-sm"
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
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 space-y-3"
        style={{
          overscrollBehavior: 'contain',
          minHeight: 0, // Important for flex child scrolling
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {chatDiary.messages.map((msg, idx) => {
          console.log(`[ChatPage] Rendering message ${idx}:`, msg.sender, msg.text.substring(0, 30));
          return (
            <div
              key={`${msg.time}-${idx}`}
              className={clsx(
                'flex animate-fade-in',
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={clsx(
                  'max-w-[80%] rounded-2xl px-3 py-2 shadow-sm',
                  msg.sender === 'user'
                    ? 'bg-purple-600 text-white rounded-br-sm'
                    : 'bg-white/10 text-white rounded-bl-sm'
                )}
              >
                {msg.sender === 'ai' && (
                  <p className="text-[10px] text-purple-300 mb-1">🤖 AI</p>
                )}
                <p className="text-[15px] whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                <p className="text-[10px] mt-1 opacity-50 text-right">
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
      <div className="bg-[#1a1a1a] border-t border-white/10 px-4 py-2 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            placeholder="Type a message..."
            rows={1}
            disabled={chatDiary.isAIThinking}
            className="flex-1 bg-white/10 text-white placeholder-white/40 rounded-full px-4 py-2.5 text-base resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            style={{ maxHeight: '100px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 100) + 'px';
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

      {/* Floating Debug Button - Always visible */}
      <button
        onClick={() => setShowDebug(true)}
        className={clsx(
          'fixed bottom-20 right-4 w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-xl z-40 transition-all',
          chatDiary.error ? 'bg-red-500 animate-pulse' : 'bg-gray-700/80'
        )}
      >
        🐛
      </button>

      {/* Debug Modal - Live Errors & Logs */}
      {showDebug && (
        <div
          className="fixed inset-0 bg-black/90 flex items-end justify-center z-50"
          onClick={() => setShowDebug(false)}
        >
          <div
            className="bg-[#1a1a1a] border-t border-white/10 rounded-t-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-[#1a1a1a] border-b border-white/10 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <h2 className="text-white font-medium">🐛 Debug Console</h2>
              <button
                onClick={() => setShowDebug(false)}
                className="text-white/40 hover:text-white/60 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Current Status */}
              <div>
                <h3 className="text-white/70 text-sm font-medium mb-2">📊 Status</h3>
                <div className="bg-black/50 rounded p-3 space-y-1 text-xs font-mono">
                  <div className="flex justify-between text-white/60">
                    <span>Messages:</span>
                    <span className="text-white">{chatDiary.messages.length}</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>AI Thinking:</span>
                    <span className={chatDiary.isAIThinking ? 'text-yellow-300' : 'text-green-300'}>
                      {chatDiary.isAIThinking ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Saving:</span>
                    <span className={chatDiary.isSaving ? 'text-yellow-300' : 'text-white'}>
                      {chatDiary.isSaving ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Unsaved:</span>
                    <span className={chatDiary.hasUnsavedMessages ? 'text-yellow-300' : 'text-green-300'}>
                      {chatDiary.hasUnsavedMessages ? 'YES' : 'NO'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {chatDiary.error && (
                <div>
                  <h3 className="text-red-300 text-sm font-medium mb-2">❌ ERROR</h3>
                  <div className="bg-red-500/10 border border-red-500/30 rounded p-3 max-h-64 overflow-y-auto">
                    <pre className="text-red-300 text-xs font-mono whitespace-pre-wrap break-all">
                      {chatDiary.error}
                    </pre>
                  </div>
                </div>
              )}

              {/* Debug Logs */}
              {chatDiary.logs.length > 0 && (
                <div>
                  <h3 className="text-blue-300 text-sm font-medium mb-2">📝 Logs ({chatDiary.logs.length})</h3>
                  <div className="bg-black/50 rounded p-3 max-h-96 overflow-y-auto">
                    <div className="text-xs font-mono space-y-1">
                      {chatDiary.logs.map((log, idx) => (
                        <div
                          key={idx}
                          className={clsx(
                            'leading-relaxed',
                            log.includes('❌') || log.includes('ERROR') ? 'text-red-300 font-bold' :
                            log.includes('✅') ? 'text-green-300' :
                            log.includes('📊') || log.includes('💾') || log.includes('⚠️') ? 'text-yellow-300' :
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

              {/* Message History */}
              <div>
                <h3 className="text-purple-300 text-sm font-medium mb-2">💬 Messages</h3>
                <div className="bg-black/50 rounded p-3 max-h-64 overflow-y-auto space-y-2">
                  {chatDiary.messages.length === 0 ? (
                    <p className="text-white/40 text-xs">No messages yet</p>
                  ) : (
                    chatDiary.messages.map((msg, idx) => (
                      <div key={idx} className="text-xs font-mono">
                        <span className={msg.sender === 'user' ? 'text-purple-300' : 'text-blue-300'}>
                          [{msg.time}] {msg.sender === 'user' ? 'YOU' : 'AI'}:
                        </span>
                        <div className="text-white/60 ml-4 mt-1">{msg.text.substring(0, 100)}{msg.text.length > 100 ? '...' : ''}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
