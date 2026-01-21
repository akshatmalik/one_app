'use client';

import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { initializeApp, getApps } from 'firebase/app';
import { GameState, GameResponse } from './types';
import { STORY_ARC_1 } from './constants';

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

// Build arc-specific instructions based on current progress
function buildArcInstructions(gameState: GameState): string {
  const { currentArc, turnCount, arcProgress } = gameState;

  // ARC 1: First Contact - The Stranger
  if (currentArc.arcNumber === 1) {
    const turnsInArc = currentArc.turnsInArc;

    // PHASE 1: Exploration (Turns 1-6)
    if (!arcProgress.strangerFirstKnockTriggered) {
      if (turnsInArc < 5) {
        return `
CURRENT PHASE: Exploration & Setup (Turns 1-6)

Your job right now:
- Let the player explore and search
- Build tension with subtle hints (shadows, sounds outside, footsteps)
- Be generous with loot - they need supplies
- Track if they're being noisy or stealthy
- Foreshadow someone watching

THE KNOCK IS COMING on turn 7. Build anticipation but don't trigger it yet.`;
      } else if (turnsInArc >= 5 && turnsInArc < STORY_ARC_1.forcedEvents.THE_KNOCK_TURN) {
        return `
CURRENT PHASE: The Knock Approaches (Turn 6)

CRITICAL: Heavy foreshadowing NOW.
- Increase tension significantly
- Clear signs someone is outside
- Footsteps, shadows passing windows, the sense of being watched
- Make it obvious an encounter is imminent

NEXT TURN: The Stranger MUST arrive. Prepare the player psychologically.`;
      } else {
        return `
🚨 FORCED EVENT - THE KNOCK 🚨

This turn, The Stranger MUST arrive. No exceptions. No delays.

THE KNOCK SEQUENCE:
1. Footsteps approach the house
2. They stop at the door
3. Three deliberate knocks: *knock knock knock*
4. The Stranger speaks: "I know someone's in there. I'm not here to hurt you. Just want to talk."

His demeanor depends on player behavior:
- If noisy (${gameState.playerBehavior.madeNoise}): He's confident, knows they're here
- If stealthy: He's cautious but certain someone entered
- If in house long (${gameState.playerBehavior.turnsInLocation} turns): He saw lights/movement

DESCRIPTION: Mid-30s man, weathered face, holding a crowbar (not threatening, but ready). Eyes sharp, assessing.

Set arcProgress.strangerFirstKnockTriggered = true
DO NOT LET THE PLAYER AVOID THIS. The knock happens.`;
      }
    }

    // PHASE 2: The Interrogation (After The Knock)
    if (arcProgress.strangerFirstKnockTriggered && !arcProgress.strangerInterrogationComplete) {
      return `
CURRENT PHASE: The Interrogation

The Stranger is assessing if the player is a threat. He asks direct questions:

QUESTIONS TO ASK (one per turn, max 5):
1. "Who are you?" / "What's your name?"
2. "How long have you been here?"
3. "Are you armed?"
4. "Are you with anyone?"
5. "Where are you headed?"

TRACK PLAYER RESPONSES:
- Consistency: Do answers match? Contradictions = suspicion
- Honesty: Evasive answers = suspicion
- Tone: Aggressive = threat, calm = neutral, cooperative = trust

UPDATE TRUST/SUSPICION:
- Each evasive/lie: suspicion +15
- Each honest/direct answer: trust +10
- Aggression: mark hostile immediately

After 5 questions OR player does something decisive (attack, flee, etc):
Set arcProgress.strangerInterrogationComplete = true
Move to Judgment phase`;
    }

    // PHASE 3: The Judgment (Turn 16-18)
    if (arcProgress.strangerInterrogationComplete && !arcProgress.strangerJudgmentMade) {
      const trust = gameState.currentEncounter?.npc?.trustLevel || 50;
      const suspicion = gameState.currentEncounter?.npc?.suspicionLevel || 50;

      return `
🚨 FORCED EVENT - THE JUDGMENT 🚨

The Stranger has heard enough. He makes his decision NOW.

TRUST: ${trust}/100
SUSPICION: ${suspicion}/100

JUDGMENT OUTCOMES (pick one based on scores):

HIGH TRUST (trust > 70):
- Lowers weapon
- "You seem alright. I've got a group nearby. Stay out of trouble."
- Warns about dangers in area
- Leaves peacefully
- Set arcProgress.strangerOutcome = "high_trust"

NEUTRAL (trust 40-70, suspicion < 60):
- Doesn't lower weapon but isn't hostile
- "I'll be watching. Be gone by dawn."
- Tense but no violence
- Set arcProgress.strangerOutcome = "neutral"

LOW TRUST (trust < 40 OR suspicion > 60):
- Weapon raised
- "Get out. Now. If I see you again, we have problems."
- Demands immediate departure
- Set arcProgress.strangerOutcome = "low_trust"

HOSTILE (player attacked, threatened, very aggressive):
- Combat or chase
- "You just made a big mistake!"
- Set arcProgress.strangerOutcome = "hostile"

Set arcProgress.strangerJudgmentMade = true
THE ARC ENDS AFTER THIS. Deliver the outcome and conclude.`;
    }

    // Arc complete
    if (arcProgress.strangerJudgmentMade) {
      return `
ARC 1 COMPLETE

The Stranger encounter is resolved. Continue natural gameplay.
Outcome: ${arcProgress.strangerOutcome || 'unknown'}

For now, let the player explore the aftermath. Future arcs will build on this foundation.`;
    }
  }

  return 'Continue natural gameplay while watching for story opportunities.';
}

// Build the AI prompt with game master instructions and context
function buildGamePrompt(command: string, gameState: GameState): string {
  const inventoryList = gameState.inventory.length > 0
    ? gameState.inventory.map(i => `${i.name} (${i.type})`).join(', ')
    : 'nothing';

  const visitedLocations = gameState.visitedLocations.join(', ') || 'none yet';

  // Build arc-specific instructions
  const arcInstructions = buildArcInstructions(gameState);

  return `═══════════════════════════════════════════════════════════════
YOU ARE THE STORY MASTER
═══════════════════════════════════════════════════════════════

Listen carefully. You are not just generating responses - you are crafting an AMAZING EXPERIENCE for the player.

Your role is to deliver a compelling, structured narrative that feels alive and meaningful. You have the power to make this player's journey unforgettable. Use it wisely.

═══════════════════════════════════════════════════════════════
YOUR MISSION
═══════════════════════════════════════════════════════════════

You are running a STRUCTURED STORY ARC called "${gameState.currentArc.arcName}".

Arc Goal: ${gameState.currentArc.description}

This is NOT a sandbox where the player wanders aimlessly. This is a DIRECTED NARRATIVE with specific beats that MUST happen. Your job is to move the story toward these objectives while making the player feel like they have agency.

${arcInstructions}

═══════════════════════════════════════════════════════════════
CURRENT GAME STATE
═══════════════════════════════════════════════════════════════

Turn #${gameState.turnCount + 1} (Arc Turn #${gameState.currentArc.turnsInArc + 1})
Location: ${gameState.currentLocation}
Health: ${gameState.health}/100 | Hunger: ${gameState.hunger}/100 | Energy: ${gameState.energy}/100
Inventory: ${inventoryList}
Time: Day ${gameState.day}, ${gameState.timeOfDay}

Player Behavior:
- Stealth Score: ${gameState.playerBehavior.stealthScore}/10
- Made Noise: ${gameState.playerBehavior.madeNoise ? 'YES' : 'NO'}
- Turns in Location: ${gameState.playerBehavior.turnsInLocation}
- Recent Actions: ${gameState.playerBehavior.recentActions.slice(-3).join(', ')}

═══════════════════════════════════════════════════════════════
PLAYER COMMAND
═══════════════════════════════════════════════════════════════

"${command}"

═══════════════════════════════════════════════════════════════
YOUR WRITING STYLE
═══════════════════════════════════════════════════════════════

- Write 1-3 SHORT, PUNCHY sentences
- Be DIRECT and ACTION-FOCUSED, not flowery
- Create tension through EVENTS, not descriptions
- Example GOOD: "The floorboard creaks. Something shuffles outside."
- Example BAD: "An eerie silence permeates the abandoned dwelling"

═══════════════════════════════════════════════════════════════
GAME MECHANICS
═══════════════════════════════════════════════════════════════

- Actions cost 5-10 energy
- Time passage adds 5-10 hunger
- Rest gives +15-25 energy
- Eating reduces hunger -30-50
- Combat causes 10-30 health damage
- When searching: be generous with loot (this is survival)

═══════════════════════════════════════════════════════════════
RETURN JSON FORMAT
═══════════════════════════════════════════════════════════════

{
  "narration": "Your terse, action-focused narration. Things HAPPEN.",
  "npcDialogue": "If The Stranger speaks, his exact words go here",
  "stateChanges": {
    "health": 85,
    "hunger": 60,
    "energy": 75,
    "currentLocation": "New Location",
    "inventory": [{"id": "generated-uuid", "name": "Item Name", "type": "food|weapon|medicine|tool", "description": "brief", "usable": true}],
    "arcProgress": {
      "strangerFirstKnockTriggered": true
    }
  }
}

CRITICAL REQUIREMENTS:
✓ Only include CHANGED fields in stateChanges
✓ For inventory: ADD new items (don't replace existing)
✓ Update arcProgress when story beats happen
✓ NO poetry - just direct events
✓ Make something meaningful happen EVERY turn

═══════════════════════════════════════════════════════════════

Now deliver an AMAZING moment for this player. Make it count.

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
