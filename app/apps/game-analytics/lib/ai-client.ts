'use client';

import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { initializeApp, getApps } from 'firebase/app';

/**
 * Shared Firebase AI client for the Game Analytics app.
 *
 * Single source of truth for the model + Firebase config that every AI service
 * (blurbs, recommendations, queue, quips, timeline, buy-queue, subscriptions)
 * was previously redefining. Pass options to extend the base config, e.g.
 * grounding: getAIModel({ tools: [{ googleSearch: {} }] }).
 */

const firebaseConfig = {
  apiKey: "AIzaSyBS3IVvszDrm_zjjXu8TATgs1H-FlegHtM",
  authDomain: "oneapp-943e3.firebaseapp.com",
  projectId: "oneapp-943e3",
  storageBucket: "oneapp-943e3.firebasestorage.app",
  messagingSenderId: "1052736128978",
  appId: "1:1052736128978:web:9d42b47c6a343eac35aa0b",
};

export const DEFAULT_AI_MODEL = 'gemini-2.5-flash';

type ModelOptions = Parameters<typeof getGenerativeModel>[1];

/** Returns a generative model. Defaults to gemini-2.5-flash; options merge on top. */
export function getAIModel(options?: Partial<ModelOptions>) {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, { model: DEFAULT_AI_MODEL, ...(options || {}) } as ModelOptions);
}

/** Grounded model that can use Google Search to verify real games / current releases. */
export function getGroundedAIModel() {
  return getAIModel({ tools: [{ googleSearch: {} }] } as Partial<ModelOptions>);
}
