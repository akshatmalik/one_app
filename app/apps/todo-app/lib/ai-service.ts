'use client';

import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { initializeApp, getApps } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyBS3IVvszDrm_zjjXu8TATgs1H-FlegHtM",
  authDomain: "oneapp-943e3.firebaseapp.com",
  projectId: "oneapp-943e3",
  storageBucket: "oneapp-943e3.firebasestorage.app",
  messagingSenderId: "1052736128978",
  appId: "1:1052736128978:web:9d42b47c6a343eac35aa0b",
};

function getAIModel() {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, { model: "gemini-2.5-flash" });
}

export interface PepTalkContext {
  dayNumber: number | null;
  totalTasks: number;
  completedTasks: number;
  topPriorityText?: string;
  topPriorityLevel?: number;
  categories: string[];
  currentStreak: number;
  longestStreak: number;
  overdueCount: number;
  completionRate: number; // 0-100
  viewingToday: boolean;
  dateLabel: string;
}

export interface PepTalkResult {
  text: string;
  emoji: string;
  isFallback: boolean;
}

export async function generatePepTalk(ctx: PepTalkContext): Promise<PepTalkResult> {
  const model = getAIModel();

  const allDone = ctx.totalTasks > 0 && ctx.completedTasks === ctx.totalTasks;
  const noTasks = ctx.totalTasks === 0;

  const contextLines = [
    `- Date: ${ctx.dateLabel}${ctx.viewingToday ? ' (today)' : ''}`,
    ctx.dayNumber !== null ? `- Day number: ${ctx.dayNumber}` : '',
    `- Tasks: ${ctx.completedTasks}/${ctx.totalTasks} completed (${ctx.completionRate.toFixed(0)}%)`,
    ctx.topPriorityText ? `- Top remaining task: "${ctx.topPriorityText}" (P${ctx.topPriorityLevel ?? 4})` : '',
    ctx.categories.length > 0 ? `- Categories in play: ${ctx.categories.join(', ')}` : '',
    ctx.currentStreak > 0
      ? `- Current streak: ${ctx.currentStreak} days (personal best: ${ctx.longestStreak})`
      : `- No active streak`,
    ctx.overdueCount > 0 ? `- Overdue from previous days: ${ctx.overdueCount}` : '',
  ].filter(Boolean).join('\n');

  let instruction: string;
  if (!ctx.viewingToday) {
    instruction = `They're looking at a different day (${ctx.dateLabel}). Write one quick, observational line about that day's progress — not a pep talk, just a friendly observation. Under 18 words.`;
  } else if (noTasks) {
    instruction = 'They have zero tasks today. Write one short, chirpy nudge to plan their day. Under 18 words.';
  } else if (allDone) {
    instruction = 'They crushed every task today. Write one upbeat, celebratory line referencing their streak or task count. Under 18 words.';
  } else if (ctx.completionRate >= 60) {
    instruction = 'They are past halfway. Write one warm, momentum-building line that names something specific. Under 18 words.';
  } else if (ctx.overdueCount > 0) {
    instruction = `They have ${ctx.overdueCount} overdue tasks bleeding from past days. Write one gentle, non-judgmental nudge to triage. Under 18 words.`;
  } else {
    instruction = 'They are kicking off their day. Write one friendly, energizing line referencing a specific data point. Under 18 words.';
  }

  const prompt = `You are a chirpy daily-tasks companion writing a tiny pep talk at the top of a todo app.

Context:
${contextLines}

${instruction}

Rules:
- ONE sentence. Max 18 words. No preamble.
- Reference specific data (task count, streak, top task, category) — not generic "you got this!"
- Warm, human, a little playful. Not corporate. Not a hype announcer.
- End with ONE emoji that matches the tone.

Respond with just the sentence and emoji. Nothing else.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const emojiRegex = /([\p{Extended_Pictographic}])\s*$/u;
    const emojiMatch = text.match(emojiRegex);
    const emoji = emojiMatch ? emojiMatch[1] : '✨';
    const cleanText = text.replace(/\s*[\p{Extended_Pictographic}]+\s*$/u, '').trim();

    return {
      text: cleanText || text,
      emoji,
      isFallback: false,
    };
  } catch (error) {
    console.error('Pep talk generation error:', error);
    return {
      text: getFallback(ctx),
      emoji: getFallbackEmoji(ctx),
      isFallback: true,
    };
  }
}

function getFallback(ctx: PepTalkContext): string {
  if (!ctx.viewingToday) return `Looking back at ${ctx.dateLabel}: ${ctx.completedTasks}/${ctx.totalTasks} done.`;
  if (ctx.totalTasks === 0) return `A blank canvas${ctx.dayNumber ? ` for day ${ctx.dayNumber}` : ''}. Add your first task.`;
  if (ctx.completedTasks === ctx.totalTasks) return `All ${ctx.totalTasks} tasks done. Enjoy the quiet.`;
  if (ctx.currentStreak >= 3) return `${ctx.currentStreak}-day streak still burning bright.`;
  if (ctx.overdueCount > 0) return `${ctx.overdueCount} stragglers from past days — pick one.`;
  return `${ctx.completedTasks} of ${ctx.totalTasks} done. One more won't hurt.`;
}

function getFallbackEmoji(ctx: PepTalkContext): string {
  if (!ctx.viewingToday) return '📅';
  if (ctx.totalTasks === 0) return '🌱';
  if (ctx.completedTasks === ctx.totalTasks) return '🎉';
  if (ctx.currentStreak >= 3) return '🔥';
  if (ctx.overdueCount > 0) return '🧹';
  return '✨';
}
