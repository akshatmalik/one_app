'use client';

import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { initializeApp, getApps } from 'firebase/app';
import { InterpretedData, Tag, Category } from './types';
import { parseDateReference, calculateDayNumber, getCurrentTimestamp, cleanTranscript } from './voice-utils';

const firebaseConfig = {
  apiKey: "AIzaSyBS3IVvszDrm_zjjXu8TATgs1H-FlegHtM",
  authDomain: "oneapp-943e3.firebaseapp.com",
  projectId: "oneapp-943e3",
  storageBucket: "oneapp-943e3.firebasestorage.app",
  messagingSenderId: "1052736128978",
  appId: "1:1052736128978:web:9d42b47c6a343eac35aa0b",
};

// Initialize AI service
function getAIModel() {
  try {
    logToUI('[AI Service] Initializing Firebase AI...');
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    logToUI(`[AI Service] ✅ Firebase app initialized: ${app.name}`);

    const ai = getAI(app, { backend: new GoogleAIBackend() });
    logToUI('[AI Service] ✅ AI instance created');

    // Try Gemini 2.0 Flash (recommended by Firebase docs)
    const modelName = "gemini-2.0-flash-exp";
    logToUI(`[AI Service] Requesting model: ${modelName}`);

    const model = getGenerativeModel(ai, { model: modelName });
    logToUI('[AI Service] ✅ Model obtained successfully');

    return model;
  } catch (error) {
    logToUI(`[AI Service] ❌ Failed to initialize: ${error}`);
    console.error('[AI Service] Failed to initialize AI model:', error);
    throw error;
  }
}

/**
 * Context needed for AI interpretation
 */
export interface VoiceContext {
  currentDate: string;           // ISO date string (e.g., "2026-01-14")
  startDate: string;             // ISO date string for Day 1
  availableTags: Tag[];          // Existing tags
  availableCategories: Category[]; // Existing categories
}

/**
 * Result from AI interpretation including error information
 */
export interface AIInterpretationResult {
  data: InterpretedData | null;
  error?: string;
  isFallback: boolean;
  logs?: string[];  // Capture logs for UI display
}

// Logging system for UI display
let uiLogs: string[] = [];

export function getUILogs(): string[] {
  return [...uiLogs];
}

export function clearUILogs(): void {
  uiLogs = [];
}

function logToUI(message: string): void {
  const timestamp = new Date().toLocaleTimeString();
  uiLogs.push(`[${timestamp}] ${message}`);
  console.log(message);
}

/**
 * Interpret voice transcript and extract structured mood data
 */
export async function interpretVoiceJournal(
  transcript: string,
  context: VoiceContext
): Promise<AIInterpretationResult> {
  clearUILogs();  // Clear previous logs
  logToUI('🎙️ Starting voice journal interpretation...');
  logToUI(`📝 Transcript: "${transcript.substring(0, 50)}${transcript.length > 50 ? '...' : ''}"`);

  try {
    logToUI('📋 Step 1/7: Getting AI model...');
    const model = getAIModel();

    logToUI('📋 Step 2/7: Building prompt...');
    const prompt = buildInterpretationPrompt(transcript, context);
    logToUI(`✅ Prompt built (${prompt.length} chars)`);

    logToUI('📋 Step 3/7: Calling Firebase AI (Gemini)...');
    const result = await model.generateContent(prompt);
    logToUI('✅ Step 4/7: Got response from AI!');

    const text = result.response.text();
    logToUI(`✅ Step 5/7: Extracted text (${text.length} chars)`);

    // Parse the JSON response
    logToUI('📋 Step 6/7: Parsing AI response...');
    const parsed = parseAIResponse(text, transcript, context);
    logToUI('✅ Step 7/7: Parse successful! 🎉');

    return {
      data: parsed,
      isFallback: false,
      logs: getUILogs(),
    };
  } catch (error) {
    logToUI('❌ ERROR occurred!');
    console.error('AI interpretation error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));

    let errorMessage = 'Unknown error occurred';

    if (error instanceof Error) {
      logToUI(`❌ Error: ${error.message}`);
      errorMessage = error.message;

      // Check for Firebase AI specific errors
      if (errorMessage.includes('service-not-allowed')) {
        errorMessage = '🔥 Firebase AI not enabled. Enable Firebase AI (Gemini) in Firebase Console → Build → AI';
        logToUI('❌ service-not-allowed: Firebase AI is NOT enabled');
        logToUI('💡 Fix: Go to Firebase Console → Build → AI → Enable');
      } else if (errorMessage.includes('permission-denied')) {
        errorMessage = '🔒 Permission denied. Check Firebase API key permissions for Generative AI';
        logToUI('❌ permission-denied: API key lacks permissions');
      } else if (errorMessage.includes('quota-exceeded')) {
        errorMessage = '📊 API quota exceeded. Check Firebase AI usage limits';
        logToUI('❌ quota-exceeded: You hit the rate limit');
      } else if (errorMessage.includes('not-found')) {
        errorMessage = '❓ Gemini model not found. Check Firebase AI configuration';
        logToUI('❌ not-found: Model does not exist');
      }
    } else if (typeof error === 'object' && error !== null) {
      const errObj = error as any;
      if (errObj.code) {
        errorMessage = `Firebase Error: ${errObj.code} - ${errObj.message || 'No message'}`;
        logToUI(`❌ Firebase Error Code: ${errObj.code}`);
      } else {
        errorMessage = JSON.stringify(error);
        logToUI(`❌ Unknown error: ${JSON.stringify(error).substring(0, 100)}`);
      }
    }

    logToUI('🔄 Falling back to local interpretation (no AI)');

    // Return fallback interpretation with detailed error
    return {
      data: getFallbackInterpretation(transcript, context),
      error: `${errorMessage}\n\nFalling back to local interpretation (no AI).`,
      isFallback: true,
      logs: getUILogs(),
    };
  }
}

/**
 * Build the AI prompt for interpretation
 */
function buildInterpretationPrompt(transcript: string, context: VoiceContext): string {
  const tagsList = context.availableTags
    .map(tag => `{"id": "${tag.id}", "name": "${tag.name}", "emoji": "${tag.emoji}", "categoryId": "${tag.categoryId}"}`)
    .join(', ');

  const categoriesList = context.availableCategories
    .map(cat => `{"id": "${cat.id}", "name": "${cat.name}"}`)
    .join(', ');

  const currentDayNumber = calculateDayNumber(context.currentDate, context.startDate);

  return `You are a helpful journaling assistant. Parse the user's voice transcript and extract structured mood data.

RULES:
1. Be generous with mood ratings - if unclear, don't assume negative
2. Match activities to existing tags when possible
3. Infer dates from context (today, yesterday, etc.)
4. Preserve the user's natural voice in diary content
5. Flag ambiguities rather than guessing
6. For mood, expect a 1-5 scale (1=terrible, 5=amazing)
7. If no mood is mentioned, set it to null
8. Clean the transcript slightly (remove filler words) but keep the natural tone
9. Suggest new tags if the user mentions activities not in the existing tags

CONTEXT:
Current date: ${context.currentDate}
Current day number: ${currentDayNumber}
Start date (Day 1): ${context.startDate}

Available tags: [${tagsList}]
Available categories: [${categoriesList}]

USER TRANSCRIPT:
"${transcript}"

TASK:
Extract the following information and respond ONLY with valid JSON (no markdown, no code blocks):

{
  "targetDate": "YYYY-MM-DD",
  "mood": <number 1-5 or null>,
  "existingTagIds": ["tag-id-1", "tag-id-2"],
  "suggestedNewTags": [
    {"name": "Tag Name", "emoji": "🎯", "categoryId": "category-id"}
  ],
  "diaryContent": "cleaned transcript preserving natural voice",
  "confidence": "high" | "medium" | "low",
  "ambiguities": ["things you weren't sure about"]
}

IMPORTANT:
- Match date references ("today", "yesterday", "Monday", etc.) to actual dates
- Match mentioned activities to existing tags by name/meaning
- For suggested new tags, pick the most appropriate existing category or suggest "General" category
- Clean filler words (um, uh, like) but preserve emotion and tone
- Set confidence based on how clear the transcript was`;
}

/**
 * Parse AI response into InterpretedData
 */
function parseAIResponse(
  responseText: string,
  originalTranscript: string,
  context: VoiceContext
): InterpretedData {
  try {
    // Remove markdown code blocks if present
    let jsonText = responseText.trim();
    jsonText = jsonText.replace(/```json?\n?/g, '');
    jsonText = jsonText.replace(/```\n?/g, '');
    jsonText = jsonText.trim();

    const parsed = JSON.parse(jsonText);

    // Parse date reference if it's a natural language reference
    const targetDate = parseDateReference(parsed.targetDate || 'today', context.currentDate);
    const dayNumber = calculateDayNumber(targetDate, context.startDate);

    return {
      targetDate,
      dayNumber,
      mood: parsed.mood !== null && parsed.mood !== undefined ? parsed.mood : null,
      existingTagIds: Array.isArray(parsed.existingTagIds) ? parsed.existingTagIds : [],
      suggestedNewTags: Array.isArray(parsed.suggestedNewTags) ? parsed.suggestedNewTags : [],
      diaryContent: parsed.diaryContent || cleanTranscript(originalTranscript),
      timestamp: getCurrentTimestamp(),
      confidence: parsed.confidence || 'medium',
      ambiguities: Array.isArray(parsed.ambiguities) ? parsed.ambiguities : [],
    };
  } catch (e) {
    console.error('Failed to parse AI response:', e);
    console.error('Response text:', responseText);
    // Fall back to basic interpretation
    return getFallbackInterpretation(originalTranscript, context);
  }
}

/**
 * Fallback interpretation if AI fails
 */
function getFallbackInterpretation(
  transcript: string,
  context: VoiceContext
): InterpretedData {
  return {
    targetDate: context.currentDate,
    dayNumber: calculateDayNumber(context.currentDate, context.startDate),
    mood: null,
    existingTagIds: [],
    suggestedNewTags: [],
    diaryContent: cleanTranscript(transcript),
    timestamp: getCurrentTimestamp(),
    confidence: 'low',
    ambiguities: ['AI interpretation failed - using raw transcript'],
  };
}

/**
 * Simple local interpretation without AI (for offline or error scenarios)
 * Attempts basic pattern matching for mood and dates
 */
export function simpleLocalInterpretation(
  transcript: string,
  context: VoiceContext
): InterpretedData {
  const lowerTranscript = transcript.toLowerCase();

  // Try to extract mood from common patterns
  let mood: number | null = null;

  // Direct number mentions: "I'd say a 4", "feeling like a 3"
  const moodNumberMatch = lowerTranscript.match(/\b([1-5])\b/);
  if (moodNumberMatch) {
    mood = parseInt(moodNumberMatch[1], 10);
  }

  // Sentiment-based mood detection
  if (mood === null) {
    if (lowerTranscript.includes('terrible') || lowerTranscript.includes('awful')) {
      mood = 1;
    } else if (lowerTranscript.includes('bad') || lowerTranscript.includes('not great')) {
      mood = 2;
    } else if (lowerTranscript.includes('okay') || lowerTranscript.includes('meh')) {
      mood = 3;
    } else if (lowerTranscript.includes('good') || lowerTranscript.includes('nice')) {
      mood = 4;
    } else if (lowerTranscript.includes('amazing') || lowerTranscript.includes('fantastic') || lowerTranscript.includes('great')) {
      mood = 5;
    }
  }

  // Try to match date reference
  let targetDate = context.currentDate;
  if (lowerTranscript.includes('yesterday')) {
    targetDate = parseDateReference('yesterday', context.currentDate);
  }

  // Try to match existing tags by simple keyword search
  const matchedTagIds: string[] = [];
  context.availableTags.forEach(tag => {
    const tagNameLower = tag.name.toLowerCase();
    if (lowerTranscript.includes(tagNameLower)) {
      matchedTagIds.push(tag.id);
    }
  });

  return {
    targetDate,
    dayNumber: calculateDayNumber(targetDate, context.startDate),
    mood,
    existingTagIds: matchedTagIds,
    suggestedNewTags: [],
    diaryContent: cleanTranscript(transcript),
    timestamp: getCurrentTimestamp(),
    confidence: 'low',
    ambiguities: ['Using simple local interpretation - AI not available'],
  };
}
