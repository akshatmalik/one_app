'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, MessageCircle, Loader2 } from 'lucide-react';
import { Game } from '../lib/types';
import { WeekInReviewData } from '../lib/calculations';
import { generateChatResponse } from '../lib/ai-service';

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekData: WeekInReviewData | null;
  monthGames: Game[];
  allGames: Game[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AIChatModal({ isOpen, onClose, weekData, monthGames, allGames }: AIChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      // Add welcome message if first time
      if (messages.length === 0) {
        setMessages([{
          id: '1',
          role: 'assistant',
          content: "Hey! I'm your AI gaming companion. Ask me anything about your gaming stats, habits, or get insights about your library. I have access to your week and month data!",
          timestamp: new Date(),
        }]);
      }
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
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

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
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

  const handleSuggestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-3xl h-[600px] bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl flex flex-col border border-purple-500/20"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg">
                <Sparkles size={24} className="text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">AI Gaming Coach</h2>
                <p className="text-sm text-white/50">Ask me anything about your gaming</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close chat"
            >
              <X size={24} className="text-white/70" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-1">
                      <MessageCircle size={16} className="text-purple-400" />
                      <span className="text-xs text-purple-300 font-medium">AI Coach</span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="bg-white/10 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 size={16} className="text-purple-400 animate-spin" />
                  <span className="text-sm text-white/70">Thinking...</span>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions (show only if no messages yet) */}
          {messages.length === 1 && !isLoading && (
            <div className="px-4 pb-2">
              <p className="text-xs text-white/40 mb-2">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.slice(0, 3).map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestion(question)}
                    className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-full transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your gaming stats, habits, or recommendations..."
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-colors"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-xl transition-all font-medium flex items-center gap-2"
              >
                <Send size={18} />
                Send
              </button>
            </div>
            <p className="text-xs text-white/30 mt-2">Press Enter to send • AI has access to your week & month data</p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
