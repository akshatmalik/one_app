'use client';

import { useCallback, useRef, useState } from 'react';
import { Game } from '../lib/types';
import {
  AgentChatContext,
  AgentTurn,
  AgentActionResult,
  runAgentTurn,
} from '../lib/ai-service';
import {
  PendingAction,
  AgentExecutors,
  executeAction,
} from '../lib/ai-actions';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface PendingProposal {
  id: string;
  actions: PendingAction[];
  resume: (results: AgentActionResult[]) => Promise<AgentTurn>;
}

const WELCOME =
  "Hey! I'm your AI gaming coach — and now I can take action too. Ask me about your stats, or tell me to do things like \"log 2 hours on Elden Ring\", \"mark Hades as completed\", or \"I'm interested in Silksong and Hades 2, find their release dates and add them\". I'll always confirm before changing anything.";

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Owns the agent conversation: message history, pending-action confirmations,
 * and execution against the host's hooks. Both the AI tab and modal can use this.
 */
export function useAIAgent(params: {
  context: AgentChatContext;
  games: Game[];
  executors: AgentExecutors;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'assistant', content: WELCOME, timestamp: new Date() },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [pending, setPending] = useState<PendingProposal | null>(null);

  // Keep latest props available to async closures without stale captures.
  const ctxRef = useRef(params.context);
  const gamesRef = useRef(params.games);
  const execRef = useRef(params.executors);
  ctxRef.current = params.context;
  gamesRef.current = params.games;
  execRef.current = params.executors;

  const pushAssistant = useCallback((content: string) => {
    if (!content.trim()) return;
    setMessages(prev => [...prev, { id: uid(), role: 'assistant', content, timestamp: new Date() }]);
  }, []);

  // Apply an AgentTurn to the UI — either show text or stage a confirmation.
  const applyTurn = useCallback((turn: AgentTurn) => {
    if (turn.kind === 'text') {
      pushAssistant(turn.text);
      setPending(null);
      return;
    }
    pushAssistant(turn.text);
    setPending({ id: uid(), actions: turn.actions, resume: turn.resume });
  }, [pushAssistant]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const history = messages
      .filter(m => m.id !== 'welcome')
      .map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, { id: uid(), role: 'user', content: trimmed, timestamp: new Date() }]);
    setPending(null);
    setIsLoading(true);
    try {
      const turn = await runAgentTurn({
        userMessage: trimmed,
        context: ctxRef.current,
        history,
      });
      applyTurn(turn);
    } catch (e) {
      console.error('Agent send error:', e);
      pushAssistant("Oops — something went wrong. Want to try again?");
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, applyTurn, pushAssistant]);

  /** Replace the staged actions (e.g. after the user edits destinations / unchecks items). */
  const updatePendingActions = useCallback((actions: PendingAction[]) => {
    setPending(prev => (prev ? { ...prev, actions } : prev));
  }, []);

  const confirmPending = useCallback(async () => {
    if (!pending || isLoading) return;
    const proposal = pending;
    setPending(null);
    setIsLoading(true);

    const results: AgentActionResult[] = [];
    for (const action of proposal.actions) {
      try {
        const summary = await executeAction(action, execRef.current, gamesRef.current);
        results.push({ summary, ok: true });
      } catch (e) {
        console.error('Action execution failed:', e);
        results.push({ summary: `Failed: ${(e as Error).message}`, ok: false });
      }
    }

    try {
      const turn = await proposal.resume(results);
      applyTurn(turn);
    } catch (e) {
      console.error('Agent resume error:', e);
      // Even if the model follow-up fails, the actions already ran — report locally.
      const ok = results.filter(r => r.ok).map(r => r.summary);
      const failed = results.filter(r => !r.ok).map(r => r.summary);
      pushAssistant(
        [ok.length ? `Done: ${ok.join(' ')}` : '', failed.length ? `Issues: ${failed.join(' ')}` : '']
          .filter(Boolean)
          .join('\n') || 'Done.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [pending, isLoading, applyTurn, pushAssistant]);

  const cancelPending = useCallback(() => {
    if (!pending) return;
    setPending(null);
    pushAssistant("No problem — I won't make any changes. Anything else?");
  }, [pending, pushAssistant]);

  return {
    messages,
    isLoading,
    pending,
    sendMessage,
    confirmPending,
    cancelPending,
    updatePendingActions,
  };
}
