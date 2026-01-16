# Last Light - Interactive Survival Adventure
## Design Document v1.0

---

## Overview

**Genre**: Interactive text-based survival adventure with AI narration

**Core Concept**: You play as a lone survivor navigating a zombie apocalypse. The game is presented as a scrolling text story with voice narration. An AI generates the world and NPCs, creating dynamic encounters where characters judge whether you're a threat.

**Key Features**:
- Text-based commands with natural language processing
- AI-generated narration and NPC dialogue
- Voice narration (text-to-speech)
- Story beats with meaningful choices
- Realistic survival mechanics
- Dynamic NPC encounters with personality

---

## Gameplay Loop

```
1. Narration appears (describes location/situation)
2. Voice reads it aloud
3. Player types command or selects quick action
4. AI validates command (guardrails)
5. AI generates what happens next
6. Consequences update game state
7. Loop continues...
```

---

## Core Mechanics

### Game State
```typescript
interface GameState {
  // Player status
  health: number;        // 0-100
  hunger: number;        // 0-100 (increases over time)
  energy: number;        // 0-100 (decreases with actions)

  // Location
  currentLocation: string;
  visitedLocations: string[];
  worldState: WorldState;    // NEW: Track generated world

  // Inventory
  inventory: Item[];

  // Story
  storyLog: StoryEntry[];
  currentEncounter: Encounter | null;

  // Meta
  day: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

// NEW: Dynamic world tracking
interface WorldState {
  // Generated locations
  locations: { [locationId: string]: GeneratedLocation };

  // Current area type (affects what can spawn)
  areaType: 'suburban' | 'urban' | 'rural' | 'commercial';

  // Track what's been looted
  lootedRooms: { [roomId: string]: boolean };
  searchedContainers: { [containerId: string]: ItemDrop[] };

  // Encounter history
  metNPCs: { [npcId: string]: NPCMemory };
}

interface GeneratedLocation {
  id: string;
  name: string;              // "Small House", "Corner Store", etc.
  type: string;              // "house", "apartment", "store"
  description: string;       // AI-generated when first visited
  rooms: GeneratedRoom[];
  hasBeenEntered: boolean;
  dangerLevel: number;       // 1-10, affects zombie/hostile chance
}

interface GeneratedRoom {
  id: string;
  name: string;              // "Kitchen", "Bedroom", "Pantry"
  description: string;       // AI-generated when entered
  containers: Container[];   // "Cabinet", "Drawer", "Closet"
  hasBeenSearched: boolean;
  initialLoot: ItemDrop[];   // What was here originally
  remainingLoot: ItemDrop[]; // What's left now
}

interface Container {
  id: string;
  name: string;
  hasBeenSearched: boolean;
  loot: ItemDrop[];
}

interface ItemDrop {
  item: string;
  quantity: number;
  taken: boolean;
}

interface NPCMemory {
  npcId: string;
  name: string;
  lastLocation: string;
  relationshipLevel: number;
  lastInteraction: string;
  knowsPlayer: boolean;
}
```

### Dynamic World Generation

**Problem**: We can't pre-define every location. That's too much work and limits exploration.

**Solution**: AI generates locations and rooms on-demand, but tracks what's been done.

#### How It Works

**Example Flow**:

```
PLAYER: "leave the house and go to the next house"

SYSTEM:
1. Check worldState.locations - is there a "next house" already generated?
2. If NO: Ask AI to generate one
3. If YES: Load existing location from worldState

AI GENERATES:
{
  "id": "house_2",
  "name": "Two-Story Colonial",
  "type": "house",
  "description": "A faded blue house with boarded windows...",
  "rooms": [
    {
      "id": "house_2_livingroom",
      "name": "Living Room",
      "hasBeenSearched": false,
      "initialLoot": [
        { "item": "batteries", "quantity": 2, "taken": false }
      ]
    },
    {
      "id": "house_2_kitchen",
      "name": "Kitchen",
      "hasBeenSearched": false,
      "initialLoot": [
        { "item": "canned_soup", "quantity": 1, "taken": false }
      ]
    }
  ],
  "dangerLevel": 3,
  "hasBeenEntered": false
}

SAVE TO worldState.locations["house_2"]

PLAYER: "search kitchen"

SYSTEM:
1. Check if house_2_kitchen.hasBeenSearched === false
2. If false: Give items from initialLoot, mark as searched
3. If true: "This room has already been searched. Nothing left."

PLAYER finds 1 soup, takes it
- Update: house_2_kitchen.hasBeenSearched = true
- Update: initialLoot[0].taken = true
- Add to player inventory

PLAYER: "search kitchen again"

SYSTEM: "You already searched here. The cabinets are empty."
```

#### World Consistency Rules

**1. Locations Persist**
- Once generated, a location stays the same
- If you leave and come back, it's the same house
- Same rooms, same layout

**2. Loot Depletion**
- Each room has finite loot
- Once taken, it's gone forever
- Can't farm the same spot repeatedly

**3. Logical Generation**
- Area type affects what spawns
  - Suburban: Houses, garages, backyards
  - Urban: Apartments, stores, offices
  - Commercial: Shops, restaurants, warehouses
- Room contents match location type
  - Kitchens have food
  - Bedrooms have clothes/medicine
  - Garages have tools

**4. Quantity Management**
```typescript
// AI generates realistic quantities
Kitchen pantry:
- Found: 2 cans of beans, 1 water bottle
- NOT: 50 cans (unrealistic in one pantry)

First house on the street:
- Likely more supplies (less picked over)

Fifth house on the street:
- Likely empty (other survivors got here first)

AI adjusts based on:
- How many locations you've visited
- Area danger level (high danger = less looting happened = more supplies)
- Time since apocalypse (day 1 vs day 100)
```

**5. Search Exhaustion**
```typescript
// You can search a room multiple times but...

First search: Find obvious items (on counters, in plain sight)
Second search: Find hidden items (back of cabinet, under bed)
Third search: "Nothing left. This place is completely empty."

Each search takes time/energy
```

#### AI Prompt for World Generation

```typescript
async function generateLocation(
  areaType: string,
  locationType: string,
  context: {
    neighborhoodDangerLevel: number;
    daysSinceOutbreak: number;
    previousLocationsSearched: number;
  }
): Promise<GeneratedLocation> {

  const prompt = `
Generate a realistic location for a zombie survival game.

AREA: ${areaType} neighborhood
TYPE: ${locationType}
CONTEXT:
- Days since outbreak: ${context.daysSinceOutbreak}
- Neighborhood danger: ${context.neighborhoodDangerLevel}/10
- Previous locations searched: ${context.previousLocationsSearched}

Generate a location with:
1. Descriptive name
2. 2-4 rooms (logical for this building type)
3. Realistic loot quantities (consider how picked-over the area is)

RULES:
- Higher danger = more supplies left (fewer survivors made it here)
- More locations searched = less supplies in new ones (getting picked over)
- Match loot to room type (food in kitchen, tools in garage)
- Be realistic with quantities (no infinite loot)

Return JSON:
{
  "name": "Building name",
  "description": "1-2 sentence description",
  "rooms": [
    {
      "name": "Room name",
      "description": "Brief description",
      "initialLoot": [
        { "item": "canned_beans", "quantity": 2 },
        { "item": "water_bottle", "quantity": 1 }
      ]
    }
  ],
  "dangerLevel": 1-10,
  "notes": "Any special features"
}
`;

  const result = await model.generateContent(prompt);
  const data = JSON.parse(result.response.text());

  // Save to worldState
  const location: GeneratedLocation = {
    id: generateId(),
    ...data,
    rooms: data.rooms.map(r => ({
      ...r,
      id: generateId(),
      hasBeenSearched: false,
      remainingLoot: [...r.initialLoot]
    })),
    hasBeenEntered: false
  };

  return location;
}
```

#### Example Gameplay

```
TURN 1:
PLAYER: "search the kitchen"
GAME: You find 2 cans of beans in the pantry. [Added to inventory]
      The cabinets are mostly empty otherwise.

[worldState updated: kitchen.hasBeenSearched = true]

TURN 2:
PLAYER: "search the kitchen again"
GAME: You already searched here thoroughly. Nothing left.

TURN 3:
PLAYER: "go upstairs"
GAME: You climb the stairs. There are two bedrooms and a bathroom.

[AI generates bedroom descriptions on-demand]

TURN 4:
PLAYER: "search first bedroom"
GAME: You find a first aid kit under the bed and some painkillers
      in the nightstand.

[worldState updated: bedroom1.hasBeenSearched = true]

TURN 5:
PLAYER: "leave the house and check the next house"
GAME: You step outside. The street is quiet. The house next door
      has a broken front door - someone's been here already.

[AI generates new house]

TURN 6:
PLAYER: "enter the next house"
GAME: The place has been ransacked. Furniture overturned,
      drawers pulled out. Might still be something useful.

[AI gave this house dangerLevel: 5, less loot because it's been hit]

TURN 7:
PLAYER: "search for food"
GAME: You check the kitchen. Cabinets are bare. Fridge is empty
      and smells terrible. But you find 1 can of soup behind
      the stove - someone missed it.

[Only 1 item instead of 2-3, because place was looted]
```

#### Memory & Continuity

```typescript
// When player returns to a location
function getLocation(locationId: string): GeneratedLocation {
  // Check if already exists
  if (worldState.locations[locationId]) {
    return worldState.locations[locationId];
  }

  // If not, generate it (first visit)
  const newLocation = await generateLocation(...);
  worldState.locations[locationId] = newLocation;
  return newLocation;
}

// This ensures:
// - Same place always has same stuff
// - Already-searched rooms stay empty
// - World feels consistent and believable
```

### Valid Actions
Player can perform these action types:

**Movement**:
- go to [location]
- enter [room]
- leave
- go upstairs/downstairs
- exit building

**Exploration**:
- look around
- search [object]
- examine [item]
- listen
- peek around corner

**Items**:
- take [item]
- use [item]
- eat [item]
- drop [item]

**Stealth**:
- hide
- move quietly
- wait
- stay still

**Social**:
- talk to [person]
- say [something]
- answer [response]
- ask about [topic]

**Survival**:
- rest
- sleep
- eat
- drink

**Combat** (if unavoidable):
- attack
- defend
- run away
- dodge

---

## AI Guardrails System

### Problem
Players might try to:
- Break immersion ("I summon a dragon")
- Use game-breaking actions ("I respawn", "I have infinite health")
- Self-harm to skip gameplay ("I kill myself")
- Exploit the AI ("I find a working helicopter")

### Solution: Command Validation Layer

Before the AI generates a response, validate the command:

```typescript
interface CommandValidation {
  isValid: boolean;
  reason?: string;
  sanitizedCommand?: string;
}

function validateCommand(
  command: string,
  gameState: GameState
): CommandValidation {
  // Check against rules
}
```

### Validation Rules

#### Rule 1: Genre Consistency
**Block**: Sci-fi, fantasy, modern tech that wouldn't exist post-apocalypse

Examples:
- "I call the police" → INVALID (no working phones/police)
- "I cast a spell" → INVALID (no magic)
- "An alien appears" → INVALID (not the genre)
- "I find a working car" → CONTEXT DEPENDENT (very unlikely, AI can decide)

**Response**: "That doesn't seem possible in this world..."

#### Rule 2: Physical Limitations
**Block**: Superhuman actions, impossible physics

Examples:
- "I fly away" → INVALID (you can't fly)
- "I lift the entire building" → INVALID (not superhuman)
- "I teleport to the city" → INVALID (no teleportation)
- "I run 100 miles in one second" → INVALID (impossible speed)

**Response**: "You can't do that..."

#### Rule 3: Self-Harm Protection
**Block**: Direct suicide attempts, but allow risky actions

Examples:
- "I kill myself" → INVALID
- "I shoot myself" → INVALID
- "I jump off the building to die" → INVALID
- "I jump off the building to escape zombies" → VALID (risky but contextual)
- "I attack the armed stranger" → VALID (suicidal but player choice)

**Response**: "Are you sure? This will likely end badly. [Confirm] [Cancel]"

#### Rule 4: Meta Gaming
**Block**: Commands that reference game mechanics

Examples:
- "I save the game" → SYSTEM COMMAND (handle separately)
- "I reload from checkpoint" → SYSTEM COMMAND
- "I give myself 100 health" → INVALID (cheating)
- "What's my health?" → SYSTEM COMMAND (show status)

**Response**: Use system commands instead of in-game actions

#### Rule 5: Context Appropriateness
**Allow**: Creative solutions within reason

Examples:
- "I make a noise to distract them" → VALID
- "I break a window to escape" → VALID
- "I lie about my name" → VALID
- "I pretend to be injured" → VALID
- "I offer to share my food" → VALID (if you have food)

### Implementation

```typescript
function validateCommand(
  command: string,
  gameState: GameState
): CommandValidation {
  const lower = command.toLowerCase();

  // Check for self-harm
  const selfHarmKeywords = ['kill myself', 'suicide', 'end my life'];
  if (selfHarmKeywords.some(kw => lower.includes(kw))) {
    return {
      isValid: false,
      reason: "You can't do that. If you want to end the game, use the menu."
    };
  }

  // Check for genre breaks
  const fantasyKeywords = ['magic', 'spell', 'dragon', 'wizard', 'summon'];
  const scifiKeywords = ['alien', 'spaceship', 'laser', 'portal', 'robot'];
  const genreBreakers = [...fantasyKeywords, ...scifiKeywords];

  if (genreBreakers.some(kw => lower.includes(kw))) {
    return {
      isValid: false,
      reason: "That doesn't exist in this world..."
    };
  }

  // Check for superhuman actions
  const superhuman = ['fly', 'teleport', 'become invisible', 'read minds'];
  if (superhuman.some(kw => lower.includes(kw))) {
    return {
      isValid: false,
      reason: "You can't do that - you're only human."
    };
  }

  // Check for system commands (handle separately)
  const systemCommands = ['save', 'load', 'quit', 'help', 'inventory', 'status'];
  if (systemCommands.some(kw => lower.startsWith(kw))) {
    return {
      isValid: true,
      reason: "SYSTEM_COMMAND" // Handle in UI, not AI
    };
  }

  // Check inventory requirements
  if (lower.includes('use ') || lower.includes('eat ')) {
    const item = extractItemName(command);
    if (!gameState.inventory.some(i => i.name.toLowerCase() === item)) {
      return {
        isValid: false,
        reason: `You don't have ${item}.`
      };
    }
  }

  // Default: allow and let AI interpret
  return { isValid: true };
}
```

### AI Prompt Instructions

Include in every AI prompt:

```
IMPORTANT RULES:
1. This is a realistic zombie survival game. No magic, sci-fi, or fantasy elements.
2. The player is a normal human with normal limitations.
3. Technology doesn't work (no phones, internet, electricity in most places).
4. Keep responses grounded in reality and survival logic.
5. If the player tries something impossible, gently narrate why it doesn't work.
6. Allow creative solutions but within realistic bounds.
7. Consequences should be logical and consistent with the world.

If player tries something impossible: narrate a brief failure and prompt for a different action.
Example: "You try to fly but... you're human. You stay firmly on the ground. What do you actually want to do?"
```

### Edge Cases

**"I find a working helicopter"**
- AI Response: "You search frantically but find nothing. Most vehicles were abandoned or destroyed in the early days. Maybe you could find something more realistic like a bicycle?"

**"I convince the stranger I'm a god"**
- AI Response: "The stranger looks at you like you've lost your mind. 'You're insane,' he says, raising his weapon. This is going badly."

**"I eat a zombie to gain powers"**
- AI Response: "That's... that's not how this works. And incredibly dangerous. The infection spreads through bites and blood. You definitely shouldn't do that."

**"I'm actually the president and command them to obey"**
- AI Response: "The stranger laughs bitterly. 'The president? Government's been gone for months. You're just another desperate survivor like the rest of us.'"

---

## Story Structure

### Act 1: Scavenging (Tutorial)
**Goal**: Find food, establish core mechanics

**Beats**:
1. You enter an abandoned house
2. Learn basic commands (look around, search, move)
3. Find some supplies
4. Hear sounds (tension building)
5. Encounter triggered

### Act 2: The Encounter
**Goal**: Survive meeting with The Stranger

**Beats**:
1. Stranger appears, armed and suspicious
2. Interrogation begins
3. They ask questions, judge your answers
4. You make choices (truth, lies, negotiation)
5. They make a decision about you

**Possible Outcomes**:
- They let you go peacefully
- They let you go but warn you
- They attack (you must flee or fight)
- They trust you enough to lower weapon
- They invite you to their group (future content)

### Act 3: Resolution
**Goal**: Complete the encounter and set up next episode

**Endings**:
- Survive and move on
- Join their group (Episode 2 setup)
- Barely escape
- Game over (death)

---

## NPC System: The Stranger

### Character Profile
```typescript
interface NPCProfile {
  name: string;
  personality: string;      // AI-generated
  trustLevel: number;       // 0-100, starts low
  suspicionLevel: number;   // 0-100, starts high
  threatAssessment: 'low' | 'medium' | 'high';  // How dangerous they think YOU are
  backstory: string;        // Revealed through dialogue
}
```

### Personality Types (Randomized)
- **Paranoid**: Distrusts everyone, quick to violence
- **Cautious**: Careful but fair, gives benefit of doubt
- **Desperate**: Needs help, willing to take risks
- **Aggressive**: Territorial, hostile by default
- **Protective**: Has something/someone to protect, defensive

### Judgment System

The Stranger evaluates you based on:

**Consistency**: Do your answers match?
- If you contradict yourself → Suspicion increases
- If you're consistent → Trust increases

**Body Language Cues** (implied in responses):
- Confident answers vs hesitant ones
- Aggressive vs submissive tone
- Honesty vs obvious lies

**Actions Taken**:
- Did you try to steal?
- Did you raise a weapon?
- Did you run when spotted?
- Did you offer something?

**Danger Level**:
- Armed? → Higher threat
- Alone? → Lower threat
- Healthy? → Potential threat
- Injured/weak? → Lower threat

### Example Dialogue Flow

```
STRANGER: "Who are you and what are you doing in my house?"

PLAYER OPTIONS:
> "I'm just looking for food, I haven't eaten in days"
> "Your house? I didn't see anyone here"
> "I'm sorry, I'll leave right now"
> "I could ask you the same thing"

[If player chooses: "I'm just looking for food..."]

STRANGER: "Everyone's looking for food. That doesn't give you the right to steal from me. What's your name?"

PLAYER: [Free text or options]

[Stranger evaluates response, updates trust/suspicion]

STRANGER: "You armed?"

[Critical question - truth or lie?]

[Based on accumulated trust/suspicion, Stranger decides outcome]
```

---

## UI Design

### Layout
```
┌─────────────────────────────────────────────────┐
│ Last Light                    [Voice] [Menu]    │
├─────────────────────────────────────────────────┤
│ Location: Kitchen  |  Health: 80  |  Hunger: 60│
│ Items: Beans x2                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  STORY FEED (Scrolling)                        │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │                                          │  │
│  │ [NARRATION]                             │  │
│  │ You push open the door carefully. The   │  │
│  │ house is dark and silent. Dust covers   │  │
│  │ everything.                              │  │
│  │                                          │  │
│  │ [PLAYER]                                 │  │
│  │ > search kitchen                         │  │
│  │                                          │  │
│  │ [NARRATION]                             │  │
│  │ You enter the kitchen. Most cabinets    │  │
│  │ are empty but there's a pantry door...  │  │
│  │                                          │  │
│  │ [SYSTEM]                                 │  │
│  │ Found: Canned Beans x2, Water Bottle    │  │
│  │                                          │  │
│  │ [NARRATION]                             │  │
│  │ Footsteps behind you. Heavy, deliberate.│  │
│  │                                          │  │
│  │ [STRANGER]                               │  │
│  │ "Don't move. Turn around slowly."       │  │
│  │                                          │  │
│  │ [NARRATION]                             │  │
│  │ A man stands in the doorway, baseball   │  │
│  │ bat raised. His face is hard, eyes      │  │
│  │ scanning you for weapons.                │  │
│  │                                          │  │
│  │ [STRANGER]                               │  │
│  │ "Who the hell are you?"                 │  │
│  │                                          │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
├─────────────────────────────────────────────────┤
│ What do you do?                                 │
│ ┌─────────────────────────────────────────────┐│
│ │ > _                                         ││
│ └─────────────────────────────────────────────┘│
│ [Look Around] [Check Items] [Say Hello]        │
└─────────────────────────────────────────────────┘
```

### Message Types

**Narration** (Gray background):
- Main story text
- Environmental descriptions
- Action results

**NPC Dialogue** (Colored, with character indicator):
- Direct quotes from NPCs
- Different color per character
- Shows emotion/tone

**Player Input** (Blue, right-aligned):
- What you typed
- Your choices

**System Messages** (Green/Red):
- Items found (green)
- Damage taken (red)
- Status changes
- Errors/invalid commands

---

## Voice Narration

### Implementation
Use Web Speech API (SpeechSynthesis):

```typescript
interface VoiceSettings {
  enabled: boolean;
  rate: number;        // 0.5 - 2.0
  pitch: number;       // 0 - 2
  volume: number;      // 0 - 1
  voice: string;       // Voice name
}

function speak(text: string, type: 'narrator' | 'npc' | 'system') {
  if (!voiceSettings.enabled) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = voiceSettings.rate;
  utterance.volume = voiceSettings.volume;

  // Vary pitch for different speakers
  switch (type) {
    case 'narrator':
      utterance.pitch = 1.0;
      break;
    case 'npc':
      utterance.pitch = 1.2;
      break;
    case 'system':
      utterance.pitch = 0.8;
      break;
  }

  window.speechSynthesis.speak(utterance);
}
```

### Voice Controls
- Toggle on/off
- Speed control (0.5x to 2x)
- Skip current narration
- Pause/Resume

---

## AI Service Design

### Generate Narration

```typescript
async function generateGameResponse(
  command: string,
  gameState: GameState,
  context: StoryContext
): Promise<GameResponse> {

  const prompt = `
You are the narrator for a realistic zombie survival game.

CURRENT STATE:
- Location: ${gameState.currentLocation}
- Health: ${gameState.health}/100
- Hunger: ${gameState.hunger}/100
- Inventory: ${gameState.inventory.map(i => i.name).join(', ')}
- Time: ${gameState.timeOfDay}

RECENT STORY:
${context.recentEvents.slice(-5).join('\n')}

ACTIVE ENCOUNTER:
${context.currentEncounter ? formatEncounter(context.currentEncounter) : 'None'}

PLAYER COMMAND: "${command}"

RULES:
- Stay realistic and grounded
- No magic, sci-fi, or fantasy
- Keep narration concise (2-3 sentences)
- Create tension and atmosphere
- NPCs should act believably based on personality
- Consequences should be logical

Generate what happens next.

Return JSON:
{
  "narration": "What happens (2-3 sentences)",
  "npcDialogue": "If NPC speaks, their exact words",
  "npcEmotion": "calm|suspicious|angry|afraid|friendly",
  "itemsFound": ["item names"],
  "stateChanges": {
    "health": 0,
    "hunger": 0,
    "energy": 0,
    "location": "same or new location"
  },
  "encounterUpdate": {
    "trustChange": -10 to +10,
    "suspicionChange": -10 to +10,
    "threatLevel": "low|medium|high"
  }
}
`;

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}
```

### Generate NPC

```typescript
async function generateNPC(
  encounterType: string,
  gameState: GameState
): Promise<NPCProfile> {

  const prompt = `
Generate a realistic survivor character for a zombie apocalypse encounter.

CONTEXT:
- Day: ${gameState.day}
- Location: ${gameState.currentLocation}
- Encounter: ${encounterType}

Create a believable character with:
- Name (first name only)
- Personality (paranoid, cautious, desperate, aggressive, protective)
- Brief backstory (1-2 sentences)
- Current motivation (what they want/fear)

Return JSON:
{
  "name": "First name",
  "personality": "Primary trait + description",
  "backstory": "Brief background",
  "motivation": "What drives them",
  "initialTrust": 10-30,
  "initialSuspicion": 60-90
}
`;

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}
```

---

## Data Models

### Complete TypeScript Interfaces

```typescript
interface GameState {
  id: string;
  userId: string;

  // Status
  health: number;           // 0-100
  hunger: number;           // 0-100
  energy: number;           // 0-100

  // Location
  currentLocation: Location;
  visitedLocations: Location[];

  // Inventory
  inventory: Item[];
  equippedWeapon: Item | null;

  // Story
  storyLog: StoryEntry[];
  currentEncounter: Encounter | null;

  // Time
  day: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';

  // Meta
  status: 'active' | 'game-over';
  deathReason?: string;

  createdAt: string;
  updatedAt: string;
}

interface Location {
  id: string;
  name: string;
  type: 'house' | 'apartment' | 'store' | 'street' | 'building';
  description: string;
  hasBeenSearched: boolean;
  dangerLevel: number;     // 1-10
  availableExits: string[];
}

interface Item {
  id: string;
  name: string;
  type: 'food' | 'water' | 'weapon' | 'medicine' | 'tool';
  description: string;
  usable: boolean;
  effect?: {
    health?: number;
    hunger?: number;
    energy?: number;
  };
}

interface StoryEntry {
  id: string;
  timestamp: string;
  type: 'narration' | 'player' | 'npc' | 'system';
  content: string;
  speaker?: string;        // For NPC dialogue
}

interface Encounter {
  id: string;
  type: 'hostile' | 'neutral' | 'friendly';
  npc: NPCProfile;
  isActive: boolean;
  history: DialogueEntry[];
}

interface NPCProfile {
  id: string;
  name: string;
  personality: string;
  backstory: string;
  motivation: string;

  // Dynamic stats
  trustLevel: number;      // 0-100
  suspicionLevel: number;  // 0-100
  threatAssessment: 'low' | 'medium' | 'high';

  // State
  isArmed: boolean;
  currentMood: 'calm' | 'suspicious' | 'angry' | 'afraid' | 'friendly';

  // Dialogue
  conversationHistory: string[];
}

interface DialogueEntry {
  speaker: 'player' | 'npc';
  text: string;
  timestamp: string;
  npcReaction?: {
    trustChange: number;
    suspicionChange: number;
    threatChange: 'increase' | 'decrease' | 'none';
  };
}

interface GameResponse {
  narration: string;
  npcDialogue?: string;
  npcEmotion?: string;
  itemsFound?: Item[];
  stateChanges: Partial<GameState>;
  encounterUpdate?: {
    trustChange: number;
    suspicionChange: number;
    threatLevel: 'low' | 'medium' | 'high';
  };
}
```

---

## Development Phases

### Phase 1: Core Engine (Foundation)
**Time: 3-4 hours**

Tasks:
- [ ] Create app structure (apps/last-light/)
- [ ] Define all TypeScript types
- [ ] Implement localStorage repository
- [ ] Build basic UI shell (status bar, story feed, input)
- [ ] Command input and display system
- [ ] Basic game state management

Deliverable: Can type commands and see them appear in feed

---

### Phase 2: AI Integration (Narration)
**Time: 3-4 hours**

Tasks:
- [ ] Set up AI service (copy pattern from game-analytics)
- [ ] Implement generateGameResponse()
- [ ] Command validation system
- [ ] Guardrails implementation
- [ ] Error handling and fallbacks
- [ ] Basic location system (movement between rooms)

Deliverable: AI generates responses to commands, enforces rules

---

### Phase 3: Voice Narration
**Time: 1-2 hours**

Tasks:
- [ ] Implement Speech Synthesis wrapper
- [ ] Voice controls (toggle, speed)
- [ ] Auto-read new messages
- [ ] Different voice styles for narrator/NPC
- [ ] Skip/pause functionality

Deliverable: Story is read aloud

---

### Phase 4: Encounter System
**Time: 3-4 hours**

Tasks:
- [ ] NPC generation with AI
- [ ] Encounter trigger system
- [ ] Trust/suspicion tracking
- [ ] Dialogue history
- [ ] NPC decision making (outcome generation)
- [ ] Multiple endings based on NPC judgment

Deliverable: The Stranger encounter works fully

---

### Phase 5: Story & Items
**Time: 2-3 hours**

Tasks:
- [ ] Item system (find, use, drop)
- [ ] Hunger/health mechanics
- [ ] Multiple locations with descriptions
- [ ] Search mechanics
- [ ] Survival elements (eating, resting)

Deliverable: Full gameplay loop with survival mechanics

---

### Phase 6: Polish
**Time: 2-3 hours**

Tasks:
- [ ] Visual polish (animations, transitions)
- [ ] Sound effects (footsteps, doors, etc.)
- [ ] Tutorial/help system
- [ ] Save/load game
- [ ] Game over screen
- [ ] Settings menu
- [ ] Mobile optimization

Deliverable: Complete, polished experience

---

## Technical Architecture

```
app/apps/last-light/
├── page.tsx                    # Main game page
│
├── components/
│   ├── GameContainer.tsx      # Main game wrapper
│   ├── StatusBar.tsx          # Health, hunger, location, items
│   ├── StoryFeed.tsx          # Scrolling story messages
│   ├── MessageBubble.tsx      # Individual message component
│   ├── InputArea.tsx          # Command input + quick actions
│   ├── VoiceControls.tsx      # Voice toggle and settings
│   ├── EncounterPanel.tsx     # Shows NPC stats during encounter
│   ├── InventoryPanel.tsx     # Item management
│   └── GameOverScreen.tsx     # End game summary
│
├── hooks/
│   ├── useGame.ts             # Main game state and logic
│   ├── useStory.ts            # Story feed management
│   ├── useVoice.ts            # Voice narration
│   ├── useEncounter.ts        # NPC encounter management
│   └── useCommands.ts         # Command processing
│
├── lib/
│   ├── types.ts               # All TypeScript interfaces
│   ├── storage.ts             # Repository pattern
│   ├── ai-service.ts          # AI generation
│   ├── game-engine.ts         # Core game logic
│   ├── command-validator.ts   # Guardrails system
│   ├── voice-service.ts       # Text-to-speech wrapper
│   └── constants.ts           # Game constants
│
└── data/
    ├── starting-locations.ts  # Initial location templates
    ├── items.ts               # Item definitions
    └── fallback-responses.ts  # Non-AI fallbacks
```

---

## Testing Plan

### Manual Test Cases

**Command Validation**:
- [ ] Try impossible action (fly, use magic) → Blocked
- [ ] Try self-harm command → Blocked with message
- [ ] Try genre-breaking command → Blocked
- [ ] Try valid creative solution → Allowed

**NPC Encounter**:
- [ ] Lie to stranger → Suspicion increases
- [ ] Tell truth consistently → Trust increases
- [ ] Contradict yourself → Suspicion increases
- [ ] Act aggressively → Threat assessment increases
- [ ] High suspicion → NPC attacks or forces you to leave
- [ ] High trust → NPC lowers weapon, peaceful resolution

**Survival Mechanics**:
- [ ] Hunger increases over time
- [ ] Can find and eat food
- [ ] Taking damage lowers health
- [ ] Can rest to recover
- [ ] Low health affects capabilities

**Voice System**:
- [ ] Toggle voice on/off
- [ ] Change speed
- [ ] Different voices for narrator/NPC
- [ ] Can skip current speech
- [ ] Auto-reads new messages

---

## Future Expansion (v2.0+)

Ideas for later versions:

**Episode 2**: If you gain stranger's trust, join their group
- Multiple NPCs with relationships
- Group decisions and conflicts
- Base management

**Multiple Encounter Types**:
- Trader (barter items)
- Raider (hostile, wants your supplies)
- Injured survivor (help or leave?)
- Child alone (moral choice)

**Zombie Encounters**:
- Hear zombies approaching
- Stealth mechanics
- Combat system
- Infection risk

**Long-term Story**:
- AI remembers past choices
- Consequences carry forward
- Multiple endings
- Character development

**Multiplayer** (ambitious):
- Two players, each talks to the stranger
- Stranger judges both
- Cooperative or competitive

---

## Success Metrics

How we know v1.0 is successful:

**Technical**:
- [ ] AI generates appropriate responses 90%+ of time
- [ ] Guardrails catch inappropriate commands
- [ ] No game-breaking bugs
- [ ] Voice narration works smoothly
- [ ] Mobile-friendly UI

**Gameplay**:
- [ ] Encounter feels tense and meaningful
- [ ] Choices have clear consequences
- [ ] NPC behavior is believable
- [ ] Replayable (different outcomes possible)
- [ ] 15-30 min complete playthrough

**User Experience**:
- [ ] Easy to understand commands
- [ ] Immersive story
- [ ] Voice narration enhances experience
- [ ] Clear UI feedback
- [ ] Satisfying endings

---

## Open Questions

1. **Starting scenario**: Always the same house, or randomize starting location?

2. **The Stranger**: Fixed personality or randomized each playthrough?

3. **Death**: Permadeath or continue from checkpoint?

4. **Hints**: Should we provide command suggestions when stuck?

5. **Difficulty**: One difficulty level or multiple (affects NPC aggression)?

6. **Inventory limits**: Unlimited carry or max X items?

7. **Combat details**: If encounter goes bad, detailed combat or quick resolution?

---

## Conclusion

This design creates an immersive, AI-powered text adventure focused on meaningful human encounters in a survival setting. The guardrails system ensures the AI stays within genre boundaries while still allowing creative problem-solving.

The core experience is about tension, choice, and consequence - every decision matters when facing another survivor who's trying to decide if you're friend or foe.

**Next step**: Get approval on this design, then begin Phase 1 implementation.
