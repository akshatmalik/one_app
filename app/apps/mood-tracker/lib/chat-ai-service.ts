'use client';

import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { initializeApp, getApps } from 'firebase/app';
import { Tag, Category } from './types';

const firebaseConfig = {
  apiKey: "AIzaSyBS3IVvszDrm_zjjXu8TATgs1H-FlegHtM",
  authDomain: "oneapp-943e3.firebaseapp.com",
  projectId: "oneapp-943e3",
  storageBucket: "oneapp-943e3.firebasestorage.app",
  messagingSenderId: "1052736128978",
  appId: "1:1052736128978:web:9d42b47c6a343eac35aa0b",
};

// Initialize AI model
function getAIModel() {
  try {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    const model = getGenerativeModel(ai, { model: "gemini-2.0-flash-exp" });
    return model;
  } catch (error) {
    console.error('[Chat AI] Failed to initialize AI model:', error);
    throw error;
  }
}

/**
 * Chat message structure
 */
export interface ChatMessage {
  time: string;
  sender: 'user' | 'ai';
  text: string;
}

/**
 * Batch analysis result
 */
export interface BatchAnalysis {
  mood: number | null;
  matchedTagIds: string[];
  suggestedNewTags: Array<{
    name: string;
    emoji: string;
    categoryId: string;
  }>;
  summary: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Result from AI operations
 */
export interface AIResult<T> {
  data: T | null;
  error: string | null;
  logs: string[];
}

// Logging system
let logs: string[] = [];

function log(message: string): void {
  const timestamp = new Date().toLocaleTimeString();
  const logMsg = `[${timestamp}] ${message}`;
  logs.push(logMsg);
  console.log(logMsg);
}

function clearLogs(): void {
  logs = [];
}

function getLogs(): string[] {
  return [...logs];
}

/**
 * Get AI response for chat conversation
 * Friendly, conversational AI that helps user reflect on their day
 */
export async function getChatResponse(
  userMessage: string,
  chatHistory: ChatMessage[],
  context: {
    currentDate: string;
    dayNumber: number;
    availableTags: Tag[];
    currentMood: number | null;
  }
): Promise<AIResult<string>> {
  clearLogs();
  log('🤖 Getting chat response from AI...');
  log(`📝 User said: "${userMessage}"`);

  try {
    const model = getAIModel();
    log('✅ AI model initialized');

    const tagsList = context.availableTags
      .map(tag => `${tag.name}`)
      .join(', ');

    // Build conversation history for Gemini's chat format
    const history = chatHistory
      .slice(-10) // Last 10 messages for better context
      .map(m => ({
        role: (m.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: m.text }],
      }));

    // System instructions for the chat
    const systemInstruction = `You are a friendly companion helping someone journal about their day. Think of yourself as their chill friend who's just checking in.

CONTEXT:
- Today is Day ${context.dayNumber} (${context.currentDate})
- Current mood: ${context.currentMood ? `${context.currentMood}/5` : 'Not mentioned yet'}
- Activities they might mention: ${tagsList || 'None yet'}

YOUR VIBE:
- Talk like a real person, not a bot or therapist
- NO emojis at all
- Keep it super short - 1 sentence, maybe 2 if really needed
- Don't ask questions every single time - sometimes just acknowledge
- If they share something, respond naturally like "nice" or "sounds good" or "that's cool"
- Only ask about mood if they mention how they're feeling
- Don't use phrases like "I'm here for you" or "Thank you for sharing" - way too formal

GOOD EXAMPLES:
- "Nice, how'd it go?"
- "Sounds good"
- "Oh cool, what else?"
- "Nice! Productive day then"
- "Gotcha"

BAD EXAMPLES (too formal/therapist-y):
- "Thank you for sharing that with me"
- "I appreciate you opening up"
- "That's wonderful! How does that make you feel?"
- "On a scale of 1-5..."

Remember: You're not interviewing them. Just chatting casually.`;

    log('📤 Starting chat with Gemini...');

    // Use Gemini's multi-turn chat feature
    const chat = model.startChat({
      history: history,
      systemInstruction: systemInstruction,
    });

    const result = await chat.sendMessage(userMessage);
    const responseText = result.response.text().trim();
    log(`✅ Got AI response: "${responseText}"`);

    return {
      data: responseText,
      error: null,
      logs: getLogs(),
    };
  } catch (error) {
    log('❌ ERROR getting chat response');
    console.error('[Chat AI] Error:', error);

    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
      log(`❌ Error: ${errorMessage}`);

      if (error.stack) {
        error.stack.split('\n').slice(0, 3).forEach(line => log(`   ${line.trim()}`));
      }

      if (errorMessage.includes('service-not-allowed')) {
        errorMessage = '🔥 Firebase AI not enabled. Enable Firebase AI (Gemini) in Firebase Console → Build → AI';
      } else if (errorMessage.includes('permission-denied')) {
        errorMessage = '🔒 Permission denied. Check Firebase API key permissions';
      } else if (errorMessage.includes('quota-exceeded')) {
        errorMessage = '📊 API quota exceeded. Check Firebase AI usage limits';
      }
    }

    // Fallback response (no emoji)
    const fallbackResponse = "I'm listening, what's up?";

    return {
      data: fallbackResponse,
      error: `AI Error: ${errorMessage}\n\n(Using fallback response)`,
      logs: getLogs(),
    };
  }
}

/**
 * Analyze chat batch and extract structured data
 * Preserves user's words and intent in the summary
 */
export async function analyzeChatBatch(
  messages: ChatMessage[],
  context: {
    currentDate: string;
    dayNumber: number;
    availableTags: Tag[];
    availableCategories: Category[];
  }
): Promise<AIResult<BatchAnalysis>> {
  clearLogs();
  log('📊 Analyzing chat batch...');
  log(`📝 Messages count: ${messages.length}`);

  try {
    const model = getAIModel();
    log('✅ AI model initialized');

    // Format chat transcript
    const transcript = messages
      .map(m => `[${m.time}] ${m.sender === 'user' ? 'User' : 'AI'}: ${m.text}`)
      .join('\n');

    const tagsList = context.availableTags
      .map(tag => `{"id": "${tag.id}", "name": "${tag.name}", "emoji": "${tag.emoji}", "categoryId": "${tag.categoryId}"}`)
      .join(', ');

    const categoriesList = context.availableCategories
      .map(cat => `{"id": "${cat.id}", "name": "${cat.name}"}`)
      .join(', ');

    const prompt = `You are analyzing a journaling chat to extract structured data.

IMPORTANT: You are maintaining a day log for the user. Your job is to take the chat and create a summary that PRESERVES THE USER'S EXACT WORDS AND INTENT. Do NOT rephrase or reword what they said. Just clean up the chat format into a readable log entry.

CONTEXT:
- Date: ${context.currentDate} (Day ${context.dayNumber})
- Available tags: [${tagsList || 'None'}]
- Available categories: [${categoriesList || 'None'}]

CHAT TRANSCRIPT:
${transcript}

TASK:
Extract and respond with ONLY valid JSON (no markdown, no code blocks):

{
  "mood": <number 1-5 or null>,
  "matchedTagIds": ["tag-id-1"],
  "suggestedNewTags": [
    {"name": "Activity Name", "emoji": "🎯", "categoryId": "category-id"}
  ],
  "summary": "user's words preserved here",
  "confidence": "high" | "medium" | "low"
}

RULES FOR SUMMARY:
1. Use the user's EXACT words from their messages (not the AI responses)
2. First person perspective (user is writing their own log)
3. Keep their casual tone - if they said "went for a run", write "went for a run" (not "I engaged in running activity")
4. Just combine their messages into flowing sentences
5. Remove filler words (um, uh, like) but keep their style
6. Do NOT rewrite or formalize their language
7. Think of it as: "What would the user write if they typed this diary entry?"
8. 1-3 sentences max

EXAMPLE:
Chat: User said "went for a run" and "felt pretty good" and "did some coding"
GOOD summary: "Went for a run, felt pretty good. Did some coding."
BAD summary: "Engaged in physical exercise by running, experienced positive emotions, then performed software development tasks."

RULES FOR DATA EXTRACTION:
1. Match activities to existing tags by name/meaning
2. Suggest new tags only if activity doesn't match any existing tag
3. For new tags, pick the most appropriate category or use "General"
4. Mood is 1-5 scale, or null if not mentioned
5. Set confidence based on how clear the chat was

Respond with JSON only:`;

    log('📤 Sending batch analysis prompt...');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    log('✅ Got analysis response');

    // Parse JSON
    let jsonText = responseText.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonText);
    log('✅ Parsed JSON successfully');

    const analysis: BatchAnalysis = {
      mood: parsed.mood !== null && parsed.mood !== undefined ? parsed.mood : null,
      matchedTagIds: Array.isArray(parsed.matchedTagIds) ? parsed.matchedTagIds : [],
      suggestedNewTags: Array.isArray(parsed.suggestedNewTags) ? parsed.suggestedNewTags : [],
      summary: parsed.summary || 'Chat session recorded.',
      confidence: parsed.confidence || 'medium',
    };

    log(`✅ Analysis complete: Mood=${analysis.mood}, Tags=${analysis.matchedTagIds.length}, Summary="${analysis.summary.substring(0, 50)}..."`);

    return {
      data: analysis,
      error: null,
      logs: getLogs(),
    };
  } catch (error) {
    log('❌ ERROR analyzing batch');
    console.error('[Chat AI] Batch analysis error:', error);

    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
      log(`❌ Error: ${errorMessage}`);

      if (error.stack) {
        error.stack.split('\n').slice(0, 3).forEach(line => log(`   ${line.trim()}`));
      }

      if (errorMessage.includes('service-not-allowed')) {
        errorMessage = '🔥 Firebase AI not enabled. Enable in Firebase Console → Build → AI';
      } else if (errorMessage.includes('permission-denied')) {
        errorMessage = '🔒 Permission denied. Check Firebase API key permissions';
      }
    }

    // Fallback analysis - just take user messages as summary
    const userMessages = messages
      .filter(m => m.sender === 'user')
      .map(m => m.text)
      .join('. ');

    const fallback: BatchAnalysis = {
      mood: null,
      matchedTagIds: [],
      suggestedNewTags: [],
      summary: userMessages || 'Chat session recorded.',
      confidence: 'low',
    };

    return {
      data: fallback,
      error: `Batch Analysis Error: ${errorMessage}\n\n(Using fallback - your words preserved, but no AI analysis)`,
      logs: getLogs(),
    };
  }
}
