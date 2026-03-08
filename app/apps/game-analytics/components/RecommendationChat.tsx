'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageSquare, X, Sparkles } from 'lucide-react';
import { ChatMessage } from '../lib/ai-recommendation-service';
import clsx from 'clsx';

const SUGGESTION_CHIPS = [
  'Something with a gripping story from minute one',
  'Tight mechanics, short sessions, podcast-friendly',
  'Dark and atmospheric, like a fever dream',
  'I want to feel something emotional',
  'A hidden gem I probably missed',
  'Like my favourite game but different genre',
  'Chill game for unwinding after work',
  'Something I can really sink 100 hours into',
];

interface RecommendationChatProps {
  chatHistory: ChatMessage[];
  chatGenerating: boolean;
  chatError: Error | null;
  onSend: (message: string) => void;
  onClear: () => void;
  hasGames: boolean;
}

export function RecommendationChat({
  chatHistory,
  chatGenerating,
  chatError,
  onSend,
  onClear,
  hasGames,
}: RecommendationChatProps) {
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatHistory.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  // Auto-expand when chat starts
  useEffect(() => {
    if (chatHistory.length > 0) setIsExpanded(true);
  }, [chatHistory.length]);

  const handleSend = () => {
    const msg = input.trim();
    if (!msg || chatGenerating || !hasGames) return;
    setInput('');
    onSend(msg);
    setIsExpanded(true);
  };

  const handleChip = (chip: string) => {
    if (chatGenerating || !hasGames) return;
    onSend(chip);
    setIsExpanded(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasHistory = chatHistory.length > 0;

  return (
    <div className={clsx(
      'border rounded-xl overflow-hidden transition-all duration-200',
      hasHistory
        ? 'border-purple-500/20 bg-purple-950/10'
        : 'border-white/5 bg-white/[0.02]'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className={hasHistory ? 'text-purple-400' : 'text-white/30'} />
          <span className={clsx('text-xs font-medium', hasHistory ? 'text-purple-300' : 'text-white/40')}>
            Tell me what you&apos;re looking for
          </span>
          {hasHistory && (
            <span className="text-[10px] text-purple-400/50 bg-purple-500/10 px-1.5 py-0.5 rounded-full">
              {Math.floor(chatHistory.length / 2)} exchange{chatHistory.length > 2 ? 's' : ''}
            </span>
          )}
        </div>
        {hasHistory && (
          <button
            onClick={onClear}
            className="text-white/20 hover:text-white/50 transition-colors"
            title="Clear chat"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Message history */}
      {isExpanded && hasHistory && (
        <div className="px-4 pb-3 space-y-3 max-h-72 overflow-y-auto">
          {chatHistory.map((msg, i) => (
            <div
              key={i}
              className={clsx(
                'flex',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.role === 'assistant' && (
                <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                  <Sparkles size={10} className="text-purple-400" />
                </div>
              )}
              <div className={clsx(
                'max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                msg.role === 'user'
                  ? 'bg-white/8 text-white/80 rounded-br-sm'
                  : 'bg-purple-500/10 text-purple-100/80 rounded-bl-sm border border-purple-500/10'
              )}>
                {msg.content}
                {msg.role === 'assistant' && msg.recommendedGameNames && msg.recommendedGameNames.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-purple-500/10 space-y-1">
                    {msg.recommendedGameNames.map(name => (
                      <div key={name} className="flex items-center gap-1.5 text-[10px] text-purple-300/60">
                        <span className="text-purple-400/40">›</span>
                        <span>{name}</span>
                      </div>
                    ))}
                    <p className="text-[10px] text-purple-400/40 pt-0.5">
                      Added to your For You feed ↓
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
          {chatGenerating && (
            <div className="flex justify-start">
              <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                <Sparkles size={10} className="text-purple-400" />
              </div>
              <div className="bg-purple-500/10 border border-purple-500/10 rounded-xl rounded-bl-sm px-3 py-2">
                <Loader2 size={12} className="text-purple-400 animate-spin" />
              </div>
            </div>
          )}
          {chatError && (
            <div className="text-[11px] text-red-400/70 bg-red-500/10 rounded-lg px-3 py-2">
              Something went wrong — try rephrasing your request.
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Suggestion chips — show when no history or after clearing */}
      {!hasHistory && !chatGenerating && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {SUGGESTION_CHIPS.slice(0, 4).map(chip => (
            <button
              key={chip}
              onClick={() => handleChip(chip)}
              disabled={!hasGames}
              className={clsx(
                'text-[11px] px-2.5 py-1 rounded-full border transition-all',
                hasGames
                  ? 'border-white/10 text-white/40 hover:border-purple-500/30 hover:text-purple-300/70 hover:bg-purple-500/5'
                  : 'border-white/5 text-white/15 cursor-not-allowed'
              )}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Show more chips after first message */}
      {hasHistory && !chatGenerating && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {SUGGESTION_CHIPS.slice(4).map(chip => (
            <button
              key={chip}
              onClick={() => handleChip(chip)}
              className="text-[11px] px-2.5 py-1 rounded-full border border-white/8 text-white/30 hover:border-purple-500/25 hover:text-purple-300/60 hover:bg-purple-500/5 transition-all"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="px-3 pb-3 flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            !hasGames
              ? 'Add games to your library first'
              : hasHistory
              ? 'Refine further...'
              : 'Describe what you\'re in the mood for...'
          }
          disabled={!hasGames || chatGenerating}
          className={clsx(
            'flex-1 bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-xs text-white/80 placeholder:text-white/20 outline-none transition-all',
            hasGames && !chatGenerating
              ? 'focus:border-purple-500/40 focus:bg-white/8'
              : 'cursor-not-allowed opacity-50'
          )}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || chatGenerating || !hasGames}
          className={clsx(
            'p-2 rounded-lg transition-all shrink-0',
            input.trim() && !chatGenerating && hasGames
              ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
              : 'bg-white/5 text-white/15 cursor-not-allowed'
          )}
        >
          {chatGenerating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
        </button>
      </div>
    </div>
  );
}
