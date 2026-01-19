'use client';

import { useState } from 'react';
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  TypingIndicator,
} from '@chatscope/chat-ui-kit-react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import { useChatDiary } from '../hooks/useChatDiary';
import { Tag, Category, DayEntry } from '../lib/types';
import clsx from 'clsx';

interface ChatDiaryTabProps {
  currentDate: string;
  dayNumber: number;
  availableTags: Tag[];
  availableCategories: Category[];
  existingEntry: DayEntry | null;
  onSave: (mood: number | null, tagIds: string[], diaryContent: string) => Promise<void>;
}

export function ChatDiaryTab({
  currentDate,
  dayNumber,
  availableTags,
  availableCategories,
  existingEntry,
  onSave,
}: ChatDiaryTabProps) {
  const [showLogs, setShowLogs] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const chatDiary = useChatDiary({
    currentDate,
    dayNumber,
    availableTags,
    availableCategories,
    existingEntry,
    onSave,
  });

  const handleSend = async (textContent: string) => {
    if (!textContent.trim() || chatDiary.isAIThinking) return;

    setInputValue('');
    await chatDiary.sendMessage(textContent);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-300px)] min-h-[500px]">
      {/* Header with status */}
      <div className="bg-white/[0.02] border border-white/10 rounded-t-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Chat Diary</h2>
            <p className="text-sm text-white/60">Day {dayNumber} - {currentDate}</p>
          </div>
          <div className="flex items-center gap-2">
            {chatDiary.hasUnsavedMessages && (
              <div className="flex items-center gap-2 text-yellow-300 text-sm">
                <div className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></div>
                Unsaved
              </div>
            )}
            {chatDiary.isSaving && (
              <div className="flex items-center gap-2 text-blue-300 text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-300"></div>
                Saving...
              </div>
            )}
            {!chatDiary.hasUnsavedMessages && !chatDiary.isSaving && chatDiary.messages.length > 1 && (
              <div className="flex items-center gap-2 text-green-300 text-sm">
                <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                Saved
              </div>
            )}
          </div>
        </div>

        {/* Save button */}
        {chatDiary.hasUnsavedMessages && !chatDiary.isSaving && (
          <button
            onClick={chatDiary.forceSave}
            className="mt-3 w-full px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors text-sm"
          >
            💾 Save Now (or wait 2 min for auto-save)
          </button>
        )}
      </div>

      {/* Error Display - Always visible when there's an error */}
      {chatDiary.error && (
        <div className="bg-red-500/10 border-x border-red-500/30 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-red-300 font-bold mb-2 flex items-center gap-2">
                <span>⚠️</span>
                <span>Error Occurred</span>
              </p>
              <div className="bg-black/50 rounded p-3 max-h-48 overflow-y-auto">
                <pre className="text-red-300 text-xs font-mono whitespace-pre-wrap break-all">
                  {chatDiary.error}
                </pre>
              </div>
            </div>
            <button
              onClick={chatDiary.clearError}
              className="text-red-300 hover:text-red-100 text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Debug Logs Toggle */}
      {chatDiary.logs.length > 0 && (
        <div className="bg-blue-500/10 border-x border-blue-500/20">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="w-full px-4 py-2 text-left text-blue-300 text-sm font-medium hover:bg-blue-500/5 transition-colors flex items-center justify-between"
          >
            <span>🔍 Debug Logs ({chatDiary.logs.length})</span>
            <span>{showLogs ? '▼' : '▶'}</span>
          </button>
          {showLogs && (
            <div className="px-4 pb-4 max-h-64 overflow-y-auto">
              <div className="bg-black/50 rounded p-3">
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
      )}

      {/* Chat Interface */}
      <div className="flex-1 bg-[#0a0a0a] border-x border-b border-white/10 rounded-b-lg overflow-hidden">
        <MainContainer>
          <ChatContainer>
            <MessageList
              typingIndicator={chatDiary.isAIThinking ? <TypingIndicator content="AI is thinking..." /> : null}
              style={{
                backgroundColor: '#0a0a0a',
              }}
            >
              {chatDiary.messages.map((msg, idx) => (
                <Message
                  key={idx}
                  model={{
                    message: msg.text,
                    sentTime: msg.time,
                    sender: msg.sender === 'user' ? 'You' : 'AI',
                    direction: msg.sender === 'user' ? 'outgoing' : 'incoming',
                    position: 'single',
                  }}
                  style={{
                    marginBottom: '12px',
                  }}
                >
                  <Message.Header
                    sender={msg.sender === 'user' ? 'You' : '🤖 AI'}
                    sentTime={msg.time}
                    style={{
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.5)',
                      marginBottom: '4px',
                    }}
                  />
                </Message>
              ))}
            </MessageList>
            <MessageInput
              placeholder="Type a message..."
              value={inputValue}
              onChange={val => setInputValue(val)}
              onSend={handleSend}
              disabled={chatDiary.isAIThinking}
              attachButton={false}
              style={{
                backgroundColor: '#0a0a0a',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            />
          </ChatContainer>
        </MainContainer>
      </div>

      {/* Tips Section */}
      <div className="mt-4 bg-white/[0.02] border border-white/10 rounded-lg p-4">
        <p className="text-white/80 font-medium mb-2 text-sm">💡 Tips:</p>
        <ul className="text-white/60 text-xs space-y-1">
          <li>• Just chat naturally about your day</li>
          <li>• Mention your mood (1-5) when you feel like it</li>
          <li>• Talk about what you did (AI will tag activities)</li>
          <li>• Your words are preserved exactly as you write them</li>
          <li>• Chats auto-save after 2 minutes of inactivity</li>
        </ul>
      </div>
    </div>
  );
}
