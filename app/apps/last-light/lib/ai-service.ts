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

  return `You are the Game Master for "Last Light", a text-based zombie apocalypse survival game.

WORLD SETTING:
- Post-apocalyptic world overrun by zombies
- Realistic, grounded survival horror (The Walking Dead style)
- No magic, sci-fi technology, or supernatural powers
- Player is a lone survivor with only human abilities

CURRENT GAME STATE:
- Location: ${gameState.currentLocation}
- Health: ${gameState.health}/100
- Hunger: ${gameState.hunger}/100 (higher = more hungry)
- Energy: ${gameState.energy}/100
- Inventory: ${inventoryList}
- Day: ${gameState.day}, ${gameState.timeOfDay}
- Visited locations: ${visitedLocations}

PLAYER COMMAND: "${command}"

YOUR TASK:
1. Interpret the player's command naturally - accept ANY reasonable action
2. Generate atmospheric, immersive narration (2-4 sentences)
3. Update game state if needed (health, hunger, energy, location, inventory)
4. Keep tone dark, tense, and realistic

RULES & GUARDRAILS:
- NO magic, spells, or supernatural abilities
- NO sci-fi tech (lasers, robots, aliens, spaceships)
- NO superhuman actions (flying, teleportation, super strength)
- NO self-harm or suicide commands
- Actions consume energy (moving, searching, fighting = -5 to -15 energy)
- Passage of time increases hunger (+5 to +10 per action)
- Resting restores energy (+10 to +20)
- Eating restores hunger (-20 to -40)
- Finding items requires searching specific locations
- Moving changes currentLocation
- Keep narration focused on atmosphere and survival tension

RESPONSE FORMAT (JSON):
{
  "narration": "The story text describing what happens",
  "stateChanges": {
    "health": 95,
    "hunger": 55,
    "energy": 85,
    "currentLocation": "Kitchen",
    "inventory": [{"id": "item1", "name": "Canned Beans", "type": "food", "description": "A can of beans"}]
  }
}

IMPORTANT:
- Only include fields in stateChanges that actually change
- If nothing changes, use empty object: "stateChanges": {}
- Inventory changes should ADD to existing items, not replace
- Be creative and atmospheric with narration
- Accept creative player actions (smoking, hiding, listening, thinking, etc.)

Generate the JSON response now:`;
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
