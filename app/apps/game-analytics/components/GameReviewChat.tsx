'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';
import { Game, ReviewMessage } from '../lib/types';
import { generateReviewChatResponse, buildTasteSummary } from '../lib/ai-service';
import { formatRating } from '../lib/calculations';

interface GameReviewChatProps {
  game: Game;
  allGames: Game[];
  onSave: (messages: ReviewMessage[]) => void;
  onClose: () => void;
}

function makeMsg(role: ReviewMessage['role'], text: string): ReviewMessage {
  return { id: uuidv4(), role, text, timestamp: new Date().toISOString() };
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function GameReviewChat({ game, allGames, onSave, onClose }: GameReviewChatProps) {
  const [messages, setMessages] = useState<ReviewMessage[]>(game.reviewMessages || []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const tasteSummary = buildTasteSummary(allGames, game.name);
  const gameCtx = {
    name: game.name,
    rating: game.rating,
    genre: game.genre,
    hours: game.hours,
    status: game.status,
    platform: game.platform,
  };

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Send opening message if this is the first time
  useEffect(() => {
    if (messages.length > 0) return;
    let cancelled = false;
    setLoading(true);
    generateReviewChatResponse({ game: gameCtx, tasteSummary, history: [], userMessage: null })
      .then(text => {
        if (cancelled) return;
        const aiMsg = makeMsg('ai', text);
        const initial = [aiMsg];
        setMessages(initial);
        onSave(initial);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg = makeMsg('user', text);
    const withUser = [...messages, userMsg];
    setMessages(withUser);
    onSave(withUser);

    setLoading(true);
    try {
      const history = withUser.map(m => ({ role: m.role, text: m.text }));
      const aiText = await generateReviewChatResponse({
        game: gameCtx,
        tasteSummary,
        history: history.slice(0, -1), // everything before the new user msg
        userMessage: text,
      });
      const aiMsg = makeMsg('ai', aiText);
      const withAi = [...withUser, aiMsg];
      setMessages(withAi);
      onSave(withAi);
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading, gameCtx, tasteSummary, onSave]);

  const hasReview = messages.length > 0;
  const lastDate = hasReview ? messages[messages.length - 1].timestamp : null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute bottom-0 left-0 right-0 bg-[#12121a] rounded-t-2xl flex flex-col animate-bottom-sheet-up"
        style={{ maxHeight: '92vh' }}>
        {/* Drag handle */}
        <div className="flex-shrink-0 pt-3 pb-3 px-4 border-b border-white/5">
          <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <MessageCircle size={16} className="text-purple-400 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-white truncate">Review · {game.name}</h2>
                <p className="text-[11px] text-white/40">
                  {formatRating(game.rating)}/10 ·{' '}
                  {hasReview
                    ? `${messages.length} message${messages.length === 1 ? '' : 's'} · last ${formatTime(lastDate!)}`
                    : 'Start your review conversation'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/40 active:text-white/70 rounded-lg p-1.5">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
          {messages.map((msg, i) => {
            const isAi = msg.role === 'ai';
            // Show date separator when conversation starts a new day
            const prevDate = i > 0 ? messages[i - 1].timestamp.slice(0, 10) : null;
            const thisDate = msg.timestamp.slice(0, 10);
            const showDate = prevDate !== null && prevDate !== thisDate;

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex items-center gap-2 my-3">
                    <div className="h-px flex-1 bg-white/5" />
                    <span className="text-[10px] text-white/20">{new Date(thisDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    <div className="h-px flex-1 bg-white/5" />
                  </div>
                )}
                <div className={clsx(
                  'flex',
                  isAi ? 'justify-start' : 'justify-end'
                )}>
                  <div className={clsx(
                    'max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    isAi
                      ? 'bg-purple-500/10 text-purple-100/90 rounded-tl-sm'
                      : 'bg-white/[0.07] text-white/85 rounded-tr-sm'
                  )}>
                    {isAi && (
                      <div className="flex items-center gap-1 mb-1">
                        <Sparkles size={9} className="text-purple-400/60" />
                        <span className="text-[9px] uppercase tracking-wider text-purple-400/50">Review guide</span>
                      </div>
                    )}
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-2 text-white/30 text-xs px-1">
              <Loader2 size={13} className="animate-spin" />
              Thinking…
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 px-4 pb-4 pt-3 bg-[#12121a] border-t border-white/5">
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={2}
              placeholder="Share your thoughts… (Enter to send)"
              disabled={loading}
              className="flex-1 px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-xl text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all resize-none placeholder:text-white/25 leading-relaxed disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 p-2.5 rounded-xl bg-purple-600 text-white active:bg-purple-500 disabled:opacity-40 transition-all"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-[10px] text-white/20 mt-2 text-center">
            Conversation saved automatically · comes back where you left off
          </p>
        </div>
      </div>
    </div>
  );
}
