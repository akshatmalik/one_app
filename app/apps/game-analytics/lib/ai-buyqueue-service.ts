'use client';

import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { initializeApp, getApps } from 'firebase/app';
import { BuyQueueAIContext } from './calculations';

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

export interface BuyQueueAdvice {
  gutCheck: string;
  verdicts: Record<string, string>; // gameName -> one-line verdict
}

const CACHE_KEY = 'buyqueue-ai-cache';
const CACHE_TTL = 1000 * 60 * 60 * 4; // 4 hours

interface CachedAdvice extends BuyQueueAdvice {
  timestamp: number;
  hash: string;
}

function getHash(ctx: BuyQueueAIContext): string {
  return [
    ctx.yearBudget ?? 'nb',
    Math.round(ctx.yearSpent),
    Math.round(ctx.totalPlannedCost),
    ...ctx.entries.map(e => `${e.name}:${e.intent}:${e.targetPrice ?? '-'}:${e.currentPrice ?? '-'}`),
  ].join('|');
}

function readCache(): CachedAdvice | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedAdvice = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) return null;
    return cached;
  } catch {
    return null;
  }
}

function writeCache(advice: BuyQueueAdvice, hash: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...advice, hash, timestamp: Date.now() }));
  } catch {
    // ignore storage errors
  }
}

export function clearBuyQueueAICache(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}

function buildPrompt(ctx: BuyQueueAIContext): string {
  const list = ctx.entries.map(e => {
    const price = e.targetPrice ?? e.currentPrice ?? e.msrp ?? 0;
    const tags = [e.isDayOneBuy ? 'day-one' : null, `${e.daysWaiting}d waiting`, `${e.confidence}% confidence`]
      .filter(Boolean).join(', ');
    return `- ${e.name} (${e.genre}, ${e.platform}) ~$${price} [${tags}]`;
  }).join('\n');

  return `You are a sharp, funny, financially-honest gaming buddy reviewing someone's game BUY queue (games they're considering purchasing — not playing).

THEIR SITUATION:
- Budget this year: ${ctx.yearBudget != null ? `$${ctx.yearBudget}` : 'not set'}
- Already spent: $${ctx.yearSpent}
- Planned spend in queue: $${ctx.totalPlannedCost}
- Budget remaining after queue: ${ctx.budgetRemaining != null ? `$${ctx.budgetRemaining}` : 'unknown'}
- Backlog (owned, barely/never played): ${ctx.backlogSize} games
- Full-price games they barely touched: ${ctx.unplayedFullPriceCount}
- Completion rate: ${ctx.completionRate}%
- Favorite genres: ${ctx.topGenres.join(', ') || 'unknown'}
- Sale season: ${ctx.saleSeason ?? 'none active'}

THE BUY QUEUE (${ctx.committedCount} committed, ${ctx.maybeCount} maybe, ${ctx.deferredCount} deferred):
${list || '(empty)'}

Respond in EXACTLY this format, nothing else:
GUTCHECK: <2-3 sentences. An honest, specific take on whether this spend makes sense given their backlog, budget, and habits. Reference real numbers. Be witty but useful — call out impulse risks or genuinely smart picks.>
VERDICT: <exact game name> | <one short punchy sentence: buy now / wait for sale / skip it / no-brainer, with a quick reason>
(one VERDICT line per committed game, using the exact game name)`;
}

function parseResponse(text: string, ctx: BuyQueueAIContext): BuyQueueAdvice {
  const verdicts: Record<string, string> = {};
  let gutCheck = '';
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.toUpperCase().startsWith('GUTCHECK:')) {
      gutCheck = line.slice(line.indexOf(':') + 1).trim();
    } else if (line.toUpperCase().startsWith('VERDICT:')) {
      const body = line.slice(line.indexOf(':') + 1).trim();
      const pipe = body.indexOf('|');
      if (pipe > 0) {
        const name = body.slice(0, pipe).trim();
        const verdict = body.slice(pipe + 1).trim();
        // Match against a real entry name (case-insensitive, tolerant of fuzz)
        const match = ctx.entries.find(e =>
          e.name.toLowerCase() === name.toLowerCase() ||
          e.name.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(e.name.toLowerCase())
        );
        if (match && verdict) verdicts[match.name] = verdict;
      }
    }
  }
  if (!gutCheck) gutCheck = text.trim().split('\n')[0] || 'Your queue is looking interesting.';
  return { gutCheck, verdicts };
}

export async function generateBuyQueueAdvice(ctx: BuyQueueAIContext): Promise<BuyQueueAdvice> {
  const hash = getHash(ctx);
  const cached = readCache();
  if (cached && cached.hash === hash) {
    return { gutCheck: cached.gutCheck, verdicts: cached.verdicts };
  }

  try {
    const model = getAIModel();
    const result = await model.generateContent(buildPrompt(ctx));
    const advice = parseResponse(result.response.text(), ctx);
    writeCache(advice, hash);
    return advice;
  } catch (error) {
    console.error('Buy queue AI advice error:', error);
    return getFallbackAdvice(ctx);
  }
}

function getFallbackAdvice(ctx: BuyQueueAIContext): BuyQueueAdvice {
  const verdicts: Record<string, string> = {};
  ctx.entries.forEach(e => {
    if (e.confidence >= 75) verdicts[e.name] = 'Strong pick for your taste — grab it when the price is right.';
    else if (e.isDayOneBuy && ctx.unplayedFullPriceCount > 3) verdicts[e.name] = 'Day-one buy, but your backlog says maybe wait for a sale.';
    else verdicts[e.name] = 'Solid maybe — keep watching the price.';
  });

  let gutCheck: string;
  if (ctx.budgetRemaining != null && ctx.budgetRemaining < 0) {
    gutCheck = `This queue runs you $${Math.abs(ctx.budgetRemaining)} over budget. With ${ctx.backlogSize} games already waiting, maybe trim the list before you check out.`;
  } else if (ctx.backlogSize > 5) {
    gutCheck = `You've got ${ctx.backlogSize} unplayed games already. The queue isn't the problem — finding time to play is. Buy the sure things, defer the rest.`;
  } else {
    gutCheck = `$${ctx.totalPlannedCost} planned across ${ctx.committedCount} games. Reasonable — just let the prices come to you instead of paying full freight.`;
  }
  return { gutCheck, verdicts };
}
