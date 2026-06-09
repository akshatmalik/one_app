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

// Grounded model — uses Google Search so length/price estimates reflect real data
// (HowLongToBeat figures, current store prices) rather than the model's memory.
function getGroundedAIModel() {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, {
    model: "gemini-2.5-flash",
    tools: [{ googleSearch: {} }],
  } as Parameters<typeof getGenerativeModel>[1]);
}

function stripJsonFences(raw: string): string {
  return raw.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
}

export interface GameLengthEstimate {
  hours: number | null;       // estimated hours to finish (main story / "beat the game")
  completionist?: number | null; // optional 100% estimate
  note?: string;              // short human-readable source/context
  error?: string;
}

/**
 * Look up how long a game takes to beat, grounded in a live web search
 * (HowLongToBeat-style "main story" hours). Returns null hours on failure so
 * callers can fall back to manual entry / a genre estimate.
 */
export async function lookupGameLength(gameName: string, platform?: string): Promise<GameLengthEstimate> {
  const model = getGroundedAIModel();
  const prompt = `Search the web for how many hours it takes to finish the video game "${gameName}"${platform ? ` on ${platform}` : ''}.
Use HowLongToBeat-style figures: "main story" (just the critical path) and "completionist" (100%).

Respond with ONLY valid JSON (no markdown, no code fences):
{"hours": <main story hours as a number>, "completionist": <100% hours as a number or null>, "note": "<one short phrase, e.g. 'HowLongToBeat: ~25h main story'>"}

If you genuinely cannot find a reliable figure, respond with {"hours": null, "note": "not found"}.`;

  try {
    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(stripJsonFences(result.response.text().trim()));
    const hours = typeof parsed.hours === 'number' && parsed.hours > 0 ? parsed.hours : null;
    const completionist = typeof parsed.completionist === 'number' && parsed.completionist > 0
      ? parsed.completionist
      : null;
    return { hours, completionist, note: typeof parsed.note === 'string' ? parsed.note : undefined };
  } catch (e) {
    console.error('lookupGameLength error:', e);
    return { hours: null, error: String(e) };
  }
}
