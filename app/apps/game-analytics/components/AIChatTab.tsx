'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, MessageCircle, Loader2 } from 'lucide-react';
import { Game } from '../lib/types';
import { WeekInReviewData } from '../lib/calculations';
import { generateChatResponse } from '../lib/ai-service';
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  TypingIndicator,
} from '@chatscope/chat-ui-kit-react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';

interface AIChatTabProps {
  weekData: WeekInReviewData | null;
  monthGames: Game[];
  allGames: Game[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AIChatTab({ weekData, monthGames, allGames }: AIChatTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add welcome message on mount
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: "Hey! I'm your AI gaming companion. Ask me anything about your gaming stats, habits, or get insights about your library. I have access to your week and month data!",
        timestamp: new Date(),
      }]);
    }
  }, []);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await generateChatResponse(text.trim(), {
        weekData,
        monthGames,
        allGames,
        conversationHistory: messages,
      });

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Oops! I had trouble processing that. Can you try rephrasing your question?",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    "What games should I focus on this week?",
    "How is my gaming balance?",
    "What's my most efficient game?",
    "Am I getting good value from my library?",
    "Which genres do I play the most?",
  ];

  return (
    <div className="h-[calc(100vh-280px)] flex flex-col bg-white/[0.02] rounded-xl border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
        <div className="p-2 bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-lg">
          <Sparkles size={20} className="text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">AI Gaming Coach</h2>
          <p className="text-xs text-white/50">Ask me anything about your gaming</p>
        </div>
      </div>

      {/* Chat Messages - Using @chatscope/chat-ui-kit-react */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <MainContainer>
          <ChatContainer>
            <MessageList
              typingIndicator={isLoading ? <TypingIndicator content="AI Coach is thinking..." /> : null}
              style={{
                backgroundColor: 'transparent',
              }}
            >
              {messages.map((msg) => (
                <Message
                  key={msg.id}
                  model={{
                    message: msg.content,
                    sentTime: msg.timestamp.toISOString(),
                    sender: msg.role === 'user' ? 'You' : 'AI Coach',
                    direction: msg.role === 'user' ? 'outgoing' : 'incoming',
                    position: 'single',
                  }}
                  style={{
                    marginBottom: '12px',
                  }}
                >
                  {msg.role === 'assistant' && (
                    <Message.Header>
                      <div className="flex items-center gap-2">
                        <MessageCircle size={14} className="text-purple-400" />
                        <span className="text-xs text-purple-300 font-medium">AI Coach</span>
                      </div>
                    </Message.Header>
                  )}
                </Message>
              ))}
              <div ref={messagesEndRef} />
            </MessageList>

            <MessageInput
              placeholder="Ask about your gaming stats, habits, or recommendations..."
              onSend={handleSend}
              disabled={isLoading}
              attachButton={false}
              style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
              }}
            />
          </ChatContainer>
        </MainContainer>
      </div>

      {/* Suggested Questions (show only if minimal messages) */}
      {messages.length <= 1 && !isLoading && (
        <div className="px-4 py-3 border-t border-white/10 bg-white/[0.01]">
          <p className="text-xs text-white/40 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.slice(0, 3).map((question, index) => (
              <button
                key={index}
                onClick={() => handleSend(question)}
                className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-full transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Helper Text */}
      <div className="px-4 py-2 border-t border-white/5 bg-white/[0.01]">
        <p className="text-xs text-white/30 text-center">AI has access to your week & month gaming data</p>
      </div>
    </div>
  );
}
