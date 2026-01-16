'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, MessageCircle, Loader2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Game } from '../lib/types';
import { WeekInReviewData } from '../lib/calculations';
import { generateChatResponse } from '../lib/ai-service';

interface AIChatTabProps {
  weekData: WeekInReviewData | null;
  monthGames: Game[];
  allGames: Game[];
  onBack?: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AIChatTab({ weekData, monthGames, allGames, onBack }: AIChatTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await generateChatResponse(input.trim(), {
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
    <div className="fixed inset-0 z-40 bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={20} className="text-white/70" />
          </button>
        )}
        <div className="p-2 bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-lg">
          <Sparkles size={24} className="text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">AI Gaming Coach</h2>
          <p className="text-sm text-white/50">Ask me anything about your gaming</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'bg-white/10 text-white border border-white/5'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle size={16} className="text-purple-400" />
                    <span className="text-xs text-purple-300 font-medium">AI Coach</span>
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs text-white/30 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-white/10 rounded-2xl px-4 py-3 flex items-center gap-2 border border-white/5">
              <Loader2 size={16} className="text-purple-400 animate-spin" />
              <span className="text-sm text-white/70">AI Coach is thinking...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length <= 1 && !isLoading && (
        <div className="px-4 pb-3">
          <p className="text-xs text-white/40 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => setInput(question)}
                className="text-xs px-3 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-full transition-colors border border-white/5"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="px-4 pb-6 pt-3 border-t border-white/10 bg-[#0a0a0a]">
        <div className="flex gap-3 items-end">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your gaming stats, habits, or recommendations..."
            className="flex-1 px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-base placeholder-white/40 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-colors"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-2xl transition-all font-medium flex items-center gap-2 shadow-lg disabled:shadow-none"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-xs text-white/30 mt-3 text-center">
          Press Enter to send • AI has access to your week & month gaming data
        </p>
      </div>
    </div>
  );
}
