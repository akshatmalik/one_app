'use client';

import { getGroundedAIModel } from './ai-client';
import { stripJsonFences } from './ai-json';

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
