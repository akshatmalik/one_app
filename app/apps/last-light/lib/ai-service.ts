import { GameState, GameResponse } from './types';

// Placeholder AI service - will connect to Firebase AI in Phase 2
export async function generateGameResponse(
  command: string,
  gameState: GameState
): Promise<GameResponse> {
  // For now, return mock responses based on simple pattern matching
  // This will be replaced with actual AI generation

  const lower = command.toLowerCase();

  // Look around
  if (lower.includes('look') || lower.includes('around')) {
    return {
      narration:
        "You're in the living room. Dust covers everything. A couch sits against the wall. Through an open doorway, you can see the kitchen. There's a staircase leading up.",
      stateChanges: {},
    };
  }

  // Search
  if (lower.includes('search')) {
    if (lower.includes('kitchen')) {
      return {
        narration:
          'You search the kitchen carefully. Most cabinets are empty. But the pantry in the corner might have something...',
        stateChanges: {},
      };
    }

    return {
      narration:
        'You search the area carefully. Most things have already been picked over.',
      stateChanges: {},
    };
  }

  // Go to kitchen
  if (lower.includes('kitchen') || lower.includes('go')) {
    return {
      narration:
        'You walk into the kitchen. Cabinets hang open. The fridge is empty. A pantry door is visible in the corner.',
      stateChanges: {
        currentLocation: 'Kitchen',
      },
    };
  }

  // Inventory
  if (lower.includes('inventory') || lower.includes('items')) {
    const items =
      gameState.inventory.length > 0
        ? gameState.inventory.map((i) => i.name).join(', ')
        : 'nothing';
    return {
      narration: `You check your pockets. You have: ${items}`,
      stateChanges: {},
    };
  }

  // Listen
  if (lower.includes('listen')) {
    return {
      narration:
        'You stop and listen. Silence. Nothing moving outside. The house creaks slightly in the wind.',
      stateChanges: {},
    };
  }

  // Default response
  return {
    narration:
      "You're not sure how to do that. Try something else. (Type 'look around', 'search', 'go to kitchen', etc.)",
    stateChanges: {},
  };
}

// Validate command against guardrails
export function validateCommand(command: string): {
  isValid: boolean;
  reason?: string;
} {
  const lower = command.toLowerCase();

  // Block self-harm
  if (
    lower.includes('kill myself') ||
    lower.includes('suicide') ||
    lower.includes('end my life')
  ) {
    return {
      isValid: false,
      reason: "You can't do that. If you want to end the game, use the menu.",
    };
  }

  // Block genre-breaking
  const fantasyKeywords = ['magic', 'spell', 'wizard', 'dragon'];
  const scifiKeywords = ['alien', 'spaceship', 'laser', 'robot'];

  if ([...fantasyKeywords, ...scifiKeywords].some((kw) => lower.includes(kw))) {
    return {
      isValid: false,
      reason: "That doesn't exist in this world...",
    };
  }

  // Block superhuman actions
  if (lower.includes('fly') || lower.includes('teleport')) {
    return {
      isValid: false,
      reason: "You can't do that - you're only human.",
    };
  }

  return { isValid: true };
}
