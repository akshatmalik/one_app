'use client';

import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { initializeApp, getApps } from 'firebase/app';
import { Game } from './types';
import { getTotalHours } from './calculations';

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

export interface GameQuip {
  id: string;
  quip: string;
  hoursSnapshot: number;
  ratingSnapshot: number;
  generatedAt: string;
}

/**
 * Generate witty, sharp AI quips for a batch of games in a single prompt.
 * Each quip is one sentence max — punchy, specific, varies in tone.
 */
export async function generateGameQuips(games: Game[]): Promise<{ id: string; quip: string }[]> {
  if (games.length === 0) return [];

  const model = getAIModel();

  const gameList = games.map(g => {
    const hours = getTotalHours(g);
    const parts = [`ID:${g.id}`, `"${g.name}"`];
    if (g.rating > 0) parts.push(`rated ${g.rating}/10`);
    if (hours > 0) parts.push(`${hours.toFixed(0)}h played`);
    parts.push(g.status);
    if (g.genre) parts.push(g.genre);
    if (g.price > 0) parts.push(`$${g.price}`);
    if (hours > 0 && g.price > 0) {
      parts.push(`$${(g.price / hours).toFixed(2)}/hr`);
    }
    if (g.endDate) parts.push('completed');
    if (g.review) parts.push(`user says: "${g.review.slice(0, 60)}"`);
    return parts.join(' | ');
  }).join('\n');

  const prompt = `You are writing witty one-liner quips for a gamer's personal game collection app. Each quip appears as a subtle italic line on the game card.

Rules:
- ONE sentence max. Sharp, specific, varied in tone.
- Use the game's data (hours, rating, status, cost/hr, review) to make it personal and specific — not generic.
- Vary the tone: sometimes funny, sometimes dramatic, sometimes motivating, sometimes gently savage.
- Examples of GOOD quips:
  - "47 hours in and still going — at this point it's basically a second job."
  - "$0.67/hr. Cheaper than a single song on Spotify."
  - "Rated it a 9 after 3 sessions. Bold move."
  - "23 hours in with a 4/10. That's either dedication or stubbornness."
  - "The one that got away — 8 hours and then silence for 3 months."
  - "Completed in 8 days. You were obsessed."
- Do NOT be generic ("Great game!" or "You seem to enjoy this").
- Do NOT reference other specific games from outside their collection.

Games to quip (one per line — include the ID in your response):
${gameList}

Respond with ONLY a JSON array, no markdown:
[{"id":"<game-id>","quip":"<one sentence quip>"}]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('AI returned no quips');
  return JSON.parse(jsonMatch[0]) as { id: string; quip: string }[];
}
