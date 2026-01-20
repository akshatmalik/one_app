'use client';

import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { initializeApp, getApps } from 'firebase/app';
import { GameState, GameResponse } from './types';

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
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, { model: "gemini-2.5-flash" });
}

// AI-powered game response - interprets ANY command naturally
export async function generateGameResponse(
  command: string,
  gameState: GameState
): Promise<GameResponse> {
  const model = getAIModel();

  // Build comprehensive prompt with game state context
  const prompt = buildGamePrompt(command, gameState);

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse AI response as JSON
    const response = parseAIResponse(text);
    return response;
  } catch (error) {
    console.error('AI generation error:', error);

    // Fallback to simple response if AI fails
    return {
      narration: "You pause for a moment, considering your next move. The silence is heavy around you.",
      stateChanges: {},
    };
  }
}

// Build the AI prompt with game master instructions and context
function buildGamePrompt(command: string, gameState: GameState): string {
  const inventoryList = gameState.inventory.length > 0
    ? gameState.inventory.map(i => `${i.name} (${i.type})`).join(', ')
    : 'nothing';

  const visitedLocations = gameState.visitedLocations.join(', ') || 'none yet';

  return `You are the Game Master for "Last Light", a brutal zombie survival game.

GAME STATE:
Location: ${gameState.currentLocation}
Health: ${gameState.health}/100 | Hunger: ${gameState.hunger}/100 | Energy: ${gameState.energy}/100
Inventory: ${inventoryList}
Time: Day ${gameState.day}, ${gameState.timeOfDay}

PLAYER ACTION: "${command}"

RULES:
- Write 1-3 SHORT sentences. Be TERSE and DIRECT, not poetic
- MAKE THINGS HAPPEN: zombies appear, things break, noises, dangers, survivors, finds
- The world is DANGEROUS. Tension and threats should be common
- When searching: often find useful items (food, weapons, medicine, tools)
- When moving/making noise: 30% chance zombies hear and approach
- When exploring: sometimes encounter other survivors (friendly, hostile, or scared)
- Random events: things collapse, sounds from outside, doors bang, etc.

MECHANICS:
- Actions cost 5-10 energy (more if intense like running/fighting)
- Passage of time adds 5-10 hunger
- Rest gives +15-25 energy
- Eating gives -30-50 hunger
- Finding items: be generous, survival game needs resources
- Combat: player can win but takes damage (lose 10-30 health)
- Moving to new location: describe it briefly then CREATE AN EVENT

WRITING STYLE:
- SHORT sentences. No flowery language
- Direct action: "You find a can of beans" not "Your fingers brush against the cool metal surface"
- Create tension through EVENTS not descriptions
- Example: "The floorboard creaks. Something shuffles outside the door." NOT "An eerie silence permeates the abandoned dwelling"

MAKE IT EXCITING:
- Zombie encounters (describe briefly: "Two zombies stumble around the corner")
- Finding good loot (ammo, food, weapons, medicine)
- Other survivors (may help, may threaten, may need help)
- Environmental hazards (floor collapse, noise attracts attention)
- Close calls and narrow escapes
- Tough choices (save resources vs use now)

JSON RESPONSE:
{
  "narration": "Direct action-focused text. Things happen.",
  "stateChanges": {
    "health": 85,
    "hunger": 60,
    "energy": 75,
    "currentLocation": "New Location Name",
    "inventory": [{"id": "uuid", "name": "Item Name", "type": "food|weapon|medicine|tool|misc", "description": "brief"}]
  }
}

CRITICAL:
- Only include changed fields in stateChanges
- Inventory: ADD new items to existing (don't replace all)
- NO poetry, NO flowery prose, just EVENTS and ACTION
- Make every command result in something happening

Generate JSON:`;
}

// Parse AI response text into GameResponse object
function parseAIResponse(text: string): GameResponse {
  try {
    // Try to extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                     text.match(/```\s*([\s\S]*?)\s*```/) ||
                     [null, text];

    const jsonText = jsonMatch[1] || text;
    const parsed = JSON.parse(jsonText.trim());

    return {
      narration: parsed.narration || "You pause, uncertain of what to do next.",
      stateChanges: parsed.stateChanges || {},
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.error('Raw response:', text);

    // Fallback: treat entire response as narration
    return {
      narration: text.trim() || "Something went wrong. The world feels unstable.",
      stateChanges: {},
    };
  }
}

// Simple validation - let AI handle most interpretation
export function validateCommand(command: string): {
  isValid: boolean;
  reason?: string;
} {
  // Only block empty commands
  if (!command.trim()) {
    return {
      isValid: false,
      reason: "What do you want to do?",
    };
  }

  // Let AI handle the rest - it has guardrails built into the prompt
  return { isValid: true };
}
