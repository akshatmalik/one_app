'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Mic, Square, Loader2, Sparkles, X, RefreshCw, Check, Pencil, Send } from 'lucide-react';
import clsx from 'clsx';
import { Game } from '../lib/types';
import { formatRating } from '../lib/calculations';
import {
  conductReviewInterview,
  synthesizeGameReview,
  buildTasteSummary,
  ReviewGameContext,
  ReviewInterviewTurn,
} from '../lib/ai-service';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

interface AIReviewInterviewProps {
  game: ReviewGameContext;
  allGames: Game[];
  initialReview?: string;
  onComplete: (review: string) => void;
  onClose: () => void;
}

const MAX_QUESTIONS = 5;

type Phase = 'loading' | 'interviewing' | 'processing' | 'synthesizing' | 'review' | 'unsupported';
type InputMode = 'voice' | 'text';

export function AIReviewInterview({ game, allGames, initialReview, onComplete, onClose }: AIReviewInterviewProps) {
  const { isRecording, isSupported, error: recorderError, startRecording, stopRecording, cancelRecording } = useAudioRecorder();

  const [phase, setPhase] = useState<Phase>('loading');
  const [inputMode, setInputMode] = useState<InputMode>(isSupported ? 'voice' : 'text');
  const [history, setHistory] = useState<ReviewInterviewTurn[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [finalReview, setFinalReview] = useState(initialReview || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState('');

  const tasteSummary = useMemo(() => buildTasteSummary(allGames, game.name), [allGames, game.name]);
  const questionsAsked = history.filter(t => t.role === 'interviewer').length + (currentQuestion ? 1 : 0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Recording timer
  useEffect(() => {
    if (!isRecording) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [isRecording]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, currentQuestion]);

  // Focus textarea when switching to text mode during interview
  useEffect(() => {
    if (inputMode === 'text' && phase === 'interviewing') {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [inputMode, phase]);

  // Kick off the opening question
  useEffect(() => {
    if (phase !== 'loading') return;
    let cancelled = false;
    (async () => {
      const res = await conductReviewInterview({
        game, tasteSummary, history: [], audio: null, questionsAsked: 0, maxQuestions: MAX_QUESTIONS,
      });
      if (cancelled) return;
      if (res.error && !res.nextQuestion) {
        setErrorMsg('Could not reach the AI. You can write your review manually below.');
        setPhase('review');
        return;
      }
      setCurrentQuestion(res.nextQuestion);
      setPhase('interviewing');
    })();
    return () => { cancelled = true; };
  }, [phase, game, tasteSummary]);

  const synthesize = useCallback(async (fullHistory: ReviewInterviewTurn[]) => {
    setPhase('synthesizing');
    const res = await synthesizeGameReview({ game, tasteSummary, history: fullHistory });
    if (res.error) setErrorMsg('AI had trouble writing the review — here are your own words to edit.');
    setFinalReview(res.review);
    setPhase('review');
  }, [game, tasteSummary]);

  const processAnswer = useCallback(async (answerText: string, audio: Parameters<typeof conductReviewInterview>[0]['audio']) => {
    setPhase('processing');
    setErrorMsg(null);

    const historyWithQuestion: ReviewInterviewTurn[] = [
      ...history,
      { role: 'interviewer', text: currentQuestion },
    ];

    const res = await conductReviewInterview({
      game,
      tasteSummary,
      history: historyWithQuestion,
      audio,
      textAnswer: audio ? undefined : answerText,
      questionsAsked: historyWithQuestion.filter(t => t.role === 'interviewer').length,
      maxQuestions: MAX_QUESTIONS,
    });

    if (res.error && !res.transcript) {
      setErrorMsg('Could not process that answer. You can wrap up or try again.');
      setCurrentQuestion(currentQuestion);
      setPhase('interviewing');
      return;
    }

    const newHistory: ReviewInterviewTurn[] = [
      ...historyWithQuestion,
      { role: 'player', text: res.transcript },
    ];
    setHistory(newHistory);
    setCurrentQuestion('');

    if (res.done || !res.nextQuestion) {
      await synthesize(newHistory);
    } else {
      setCurrentQuestion(res.nextQuestion);
      setPhase('interviewing');
    }
  }, [history, currentQuestion, game, tasteSummary, synthesize]);

  const handleStop = useCallback(async () => {
    const audio = await stopRecording();
    if (!audio) {
      setErrorMsg('No audio captured — try again.');
      return;
    }
    await processAnswer('', audio);
  }, [stopRecording, processAnswer]);

  const handleTextSend = useCallback(async () => {
    const answer = typedAnswer.trim();
    if (!answer) return;
    setTypedAnswer('');
    await processAnswer(answer, null);
  }, [typedAnswer, processAnswer]);

  const handleWrapUp = useCallback(() => {
    if (isRecording) cancelRecording();
    if (history.filter(t => t.role === 'player').length === 0) {
      setPhase('review');
      return;
    }
    synthesize(history);
  }, [isRecording, cancelRecording, history, synthesize]);

  const handleRegenerate = useCallback(() => {
    synthesize(history);
  }, [synthesize, history]);

  const handleModeSwitch = useCallback((mode: InputMode) => {
    if (isRecording) cancelRecording();
    setInputMode(mode);
  }, [isRecording, cancelRecording]);

  const mmss = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
  const answeredCount = history.filter(t => t.role === 'player').length;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute bottom-0 left-0 right-0 bg-[#12121a] rounded-t-2xl max-h-[92vh] flex flex-col animate-bottom-sheet-up">
        {/* Header */}
        <div className="flex-shrink-0 pt-3 pb-3 px-4 border-b border-white/5">
          <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles size={16} className="text-purple-400 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-white truncate">Reflect on {game.name}</h2>
                <p className="text-[11px] text-white/40">
                  {formatRating(game.rating)}/10 · AI interview
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/40 active:text-white/70 rounded-lg p-1.5">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {phase === 'review' ? (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-white/50">Your review</label>
              <textarea
                value={finalReview}
                onChange={e => setFinalReview(e.target.value)}
                rows={7}
                placeholder="Your review will appear here — edit freely."
                className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-xl text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all resize-none placeholder:text-white/30 leading-relaxed"
              />
              {errorMsg && <p className="text-[11px] text-amber-400/80">{errorMsg}</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Conversation transcript */}
              {history.map((turn, i) => (
                <div
                  key={i}
                  className={clsx(
                    'rounded-xl px-3 py-2 text-sm max-w-[88%]',
                    turn.role === 'interviewer'
                      ? 'bg-purple-500/10 text-purple-200/90 self-start'
                      : 'bg-white/[0.05] text-white/80 ml-auto'
                  )}
                >
                  {turn.role === 'interviewer' && (
                    <div className="text-[9px] uppercase tracking-wider text-purple-400/60 mb-0.5">Interviewer</div>
                  )}
                  {turn.text}
                </div>
              ))}

              {/* Current question */}
              {currentQuestion && (
                <div className="rounded-xl px-3 py-2.5 text-sm bg-purple-500/15 text-purple-100 border border-purple-500/20">
                  <div className="text-[9px] uppercase tracking-wider text-purple-400/70 mb-0.5">Question {answeredCount + 1}</div>
                  {currentQuestion}
                </div>
              )}

              {(phase === 'loading' || phase === 'processing' || phase === 'synthesizing') && (
                <div className="flex items-center gap-2 text-white/40 text-xs px-1 py-2">
                  <Loader2 size={14} className="animate-spin" />
                  {phase === 'loading' && 'Thinking of a good opener…'}
                  {phase === 'processing' && (inputMode === 'voice' ? 'Listening & transcribing…' : 'Thinking…')}
                  {phase === 'synthesizing' && 'Writing your review…'}
                </div>
              )}

              {errorMsg && <p className="text-[11px] text-amber-400/80 px-1">{errorMsg}</p>}
              {recorderError && <p className="text-[11px] text-red-400/80 px-1">{recorderError}</p>}

              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="flex-shrink-0 px-4 pb-4 pt-3 bg-[#12121a] border-t border-white/5 space-y-3">
          {phase === 'review' ? (
            <div className="flex gap-3">
              {history.length > 0 && (
                <button
                  onClick={handleRegenerate}
                  className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-white/5 text-white/70 text-sm font-medium active:bg-white/10"
                >
                  <RefreshCw size={14} /> Redo
                </button>
              )}
              <button
                onClick={() => onComplete(finalReview)}
                disabled={!finalReview.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-purple-600 text-white text-sm font-medium active:bg-purple-500 disabled:opacity-50"
              >
                <Check size={16} /> Use this review
              </button>
            </div>
          ) : phase === 'interviewing' ? (
            <>
              {/* Voice / Type toggle */}
              {isSupported && (
                <div className="flex rounded-xl bg-white/5 p-0.5 self-start w-fit mx-auto">
                  <button
                    onClick={() => handleModeSwitch('voice')}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-medium transition-all',
                      inputMode === 'voice'
                        ? 'bg-white/10 text-white'
                        : 'text-white/40 active:text-white/60'
                    )}
                  >
                    <Mic size={12} /> Voice
                  </button>
                  <button
                    onClick={() => handleModeSwitch('text')}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-medium transition-all',
                      inputMode === 'text'
                        ? 'bg-white/10 text-white'
                        : 'text-white/40 active:text-white/60'
                    )}
                  >
                    <Pencil size={12} /> Type
                  </button>
                </div>
              )}

              {inputMode === 'text' ? (
                /* Text input mode */
                <div className="space-y-2">
                  <textarea
                    ref={textareaRef}
                    value={typedAnswer}
                    onChange={e => setTypedAnswer(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleTextSend();
                      }
                    }}
                    rows={3}
                    placeholder="Type your answer… (Enter to send)"
                    className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-xl text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all resize-none placeholder:text-white/30 leading-relaxed"
                  />
                  <div className="flex gap-2">
                    {answeredCount > 0 && (
                      <button
                        onClick={handleWrapUp}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 text-white/70 text-sm font-medium active:bg-white/10"
                      >
                        <Sparkles size={14} /> Wrap up
                      </button>
                    )}
                    <button
                      onClick={handleTextSend}
                      disabled={!typedAnswer.trim()}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold active:bg-purple-500 disabled:opacity-40"
                    >
                      <Send size={14} /> Send
                    </button>
                  </div>
                </div>
              ) : (
                /* Voice input mode */
                <div className="flex items-center gap-3">
                  <button
                    onClick={isRecording ? handleStop : startRecording}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all',
                      isRecording
                        ? 'bg-red-500/90 text-white animate-pulse'
                        : 'bg-purple-600 text-white active:bg-purple-500'
                    )}
                  >
                    {isRecording ? (<><Square size={16} className="fill-white" /> Stop · {mmss}</>) : (<><Mic size={18} /> Hold answer</>)}
                  </button>
                  {answeredCount > 0 && !isRecording && (
                    <button
                      onClick={handleWrapUp}
                      className="flex items-center gap-1.5 px-4 py-3.5 rounded-xl bg-white/5 text-white/70 text-sm font-medium active:bg-white/10"
                    >
                      <Sparkles size={14} /> Wrap up
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <button
              disabled
              className="w-full px-4 py-3.5 rounded-xl bg-white/5 text-white/40 text-sm font-medium flex items-center justify-center gap-2"
            >
              <Loader2 size={16} className="animate-spin" /> Working…
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
