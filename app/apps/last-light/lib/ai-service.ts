import { GameState, GameResponse } from './types';

// More flexible AI service - responds to a wider variety of commands
export async function generateGameResponse(
  command: string,
  gameState: GameState
): Promise<GameResponse> {
  const lower = command.toLowerCase();

  // Look around / examine
  if (
    lower.includes('look') ||
    lower.includes('around') ||
    lower.includes('examine')
  ) {
    return {
      narration:
        "You're in the living room. Dust covers everything. A couch sits against the wall. Through an open doorway, you can see the kitchen. There's a staircase leading up.",
      stateChanges: {},
    };
  }

  // Search commands
  if (lower.includes('search') || lower.includes('check')) {
    if (lower.includes('kitchen') || lower.includes('pantry')) {
      return {
        narration:
          'You search the kitchen carefully. Most cabinets are empty. But the pantry in the corner might have something...',
        stateChanges: {},
      };
    }
    return {
      narration:
        'You search the area. Most things have been picked over, but you might find something if you look in specific places.',
      stateChanges: {},
    };
  }

  // Movement commands
  if (
    lower.includes('go') ||
    lower.includes('move') ||
    lower.includes('enter') ||
    lower.includes('walk')
  ) {
    if (lower.includes('kitchen')) {
      return {
        narration:
          'You walk into the kitchen. Cabinets hang open. The fridge is empty and smells terrible. A pantry door is visible in the corner.',
        stateChanges: {
          currentLocation: 'Kitchen',
        },
      };
    }
    if (lower.includes('upstairs') || lower.includes('up')) {
      return {
        narration:
          'You climb the creaking stairs. At the top, there are two bedrooms and a bathroom. Everything is covered in dust.',
        stateChanges: {
          currentLocation: 'Upstairs',
        },
      };
    }
    if (lower.includes('outside') || lower.includes('out')) {
      return {
        narration:
          'You step outside carefully. The street is eerily quiet. Houses line both sides, their windows dark and empty. You could explore the neighboring houses, or stay here.',
        stateChanges: {
          currentLocation: 'Outside',
        },
      };
    }
    return {
      narration:
        'Where do you want to go? Try being more specific. (kitchen, upstairs, outside, etc.)',
      stateChanges: {},
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
  if (lower.includes('listen') || lower.includes('hear')) {
    return {
      narration:
        'You stop and listen carefully. Silence. No wind, no birds, no distant cars. Just... nothing. The quiet is unsettling.',
      stateChanges: {},
    };
  }

  // Wait / rest
  if (
    lower.includes('wait') ||
    lower.includes('rest') ||
    lower.includes('sit')
  ) {
    return {
      narration:
        'You take a moment to rest. Your breathing steadies. The house remains quiet around you.',
      stateChanges: {
        energy: Math.min(100, (gameState.energy || 100) + 10),
      },
    };
  }

  // Hide
  if (lower.includes('hide')) {
    return {
      narration:
        'You crouch behind the couch, staying as still and quiet as possible. Your heart pounds in your chest.',
      stateChanges: {},
    };
  }

  // Actions with items - smoking, eating, drinking
  if (lower.includes('smoke') || lower.includes('cigarette')) {
    if (gameState.inventory.some((i) => i.name.toLowerCase().includes('cigarette'))) {
      return {
        narration:
          'You light a cigarette with shaking hands. The familiar ritual is calming, even now. Smoke curls up toward the ceiling.',
        stateChanges: {
          energy: Math.min(100, (gameState.energy || 100) + 5),
        },
      };
    }
    return {
      narration:
        "You pat your pockets looking for cigarettes, but you don't have any. Probably for the best - the smoke could attract attention.",
      stateChanges: {},
    };
  }

  // Eat / drink
  if (lower.includes('eat') || lower.includes('drink')) {
    const hasFood = gameState.inventory.some(
      (i) => i.type === 'food' || i.type === 'water'
    );
    if (hasFood) {
      return {
        narration:
          "You eat some of your supplies. It's not much, but it helps.",
        stateChanges: {
          hunger: Math.max(0, (gameState.hunger || 50) - 20),
        },
      };
    }
    return {
      narration:
        "You don't have any food or water. You need to find supplies soon.",
      stateChanges: {},
    };
  }

  // Break / smash / force
  if (
    lower.includes('break') ||
    lower.includes('smash') ||
    lower.includes('force')
  ) {
    return {
      narration:
        "You could try, but making loud noises might not be a good idea. You don't know what's out there.",
      stateChanges: {},
    };
  }

  // Call out / shout / yell
  if (
    lower.includes('shout') ||
    lower.includes('yell') ||
    lower.includes('call') ||
    lower.includes('hello')
  ) {
    return {
      narration:
        'You call out tentatively. Your voice sounds too loud in the silence. No response. Part of you is relieved.',
      stateChanges: {},
    };
  }

  // Open / close doors/windows
  if (lower.includes('open') || lower.includes('close')) {
    return {
      narration:
        'You could try opening or closing specific things. What are you trying to open or close?',
      stateChanges: {},
    };
  }

  // Take / grab / pick up
  if (
    lower.includes('take') ||
    lower.includes('grab') ||
    lower.includes('pick')
  ) {
    return {
      narration:
        'What are you trying to take? Try searching specific places first.',
      stateChanges: {},
    };
  }

  // Think / remember / recall
  if (
    lower.includes('think') ||
    lower.includes('remember') ||
    lower.includes('recall')
  ) {
    return {
      narration:
        'You try to remember how you got here... but it\'s all fuzzy. You remember waking up on the floor. Before that? Nothing. What happened to the world?',
      stateChanges: {},
    };
  }

  // Default - acknowledge the attempt but guide the player
  return {
    narration:
      'You consider that action. Maybe try something more specific, or try a different approach. You can look around, search, move to different rooms, or interact with your surroundings.',
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
