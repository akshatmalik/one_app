'use client';

import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { initializeApp, getApps } from 'firebase/app';

// Firebase AI client for the Story Generator app (mini-apps stay isolated,
// so this app keeps its own copy of the model factory).

const firebaseConfig = {
  apiKey: "AIzaSyBS3IVvszDrm_zjjXu8TATgs1H-FlegHtM",
  authDomain: "oneapp-943e3.firebaseapp.com",
  projectId: "oneapp-943e3",
  storageBucket: "oneapp-943e3.firebasestorage.app",
  messagingSenderId: "1052736128978",
  appId: "1:1052736128978:web:9d42b47c6a343eac35aa0b",
};

export const STORY_AI_MODEL = 'gemini-2.5-flash';

type ModelOptions = Parameters<typeof getGenerativeModel>[1];

export function getStoryModel(options?: Partial<ModelOptions>) {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, { model: STORY_AI_MODEL, ...(options || {}) } as ModelOptions);
}
