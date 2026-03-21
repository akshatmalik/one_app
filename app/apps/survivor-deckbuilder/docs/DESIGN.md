# Survivor Deck-Builder: Game Design Document (V1)

## Vision
A tactical deck-building zombie survival game where you manage survivor relationships and resources through home-base tasks, then send expeditions into dangerous zones. V1 focuses on core combat, deck mechanics, and run structure.

---

## V1 Scope (MVP)

### What's IN V1:
- **Combat system** (card-based, tactical)
- **Card types** (Survivors, Items, Actions)
- **Run structure** (3-5 stage expeditions)
- **Item exhaustion** (cards get used up, need recovery)
- **Basic synergies** (2-card combos)
- **Mid-run decisions** (binary story branches)
- **Minimal home base** (just recovery/task assignment)

### What's NOT in V1:
- Full relationship system (too complex)
- Permadeath story consequences (save for V2)
- Base building/progression
- Multiple simultaneous expeditions
- Deep character customization
- Meta-narrative spanning multiple runs

---

## Core Mechanics

### 1. THE DECK

**Deck Composition (for a single run):**
- 2 Survivor cards (named characters with attributes)
- 2-3 Item/Action cards (consumables, equipment, abilities)
- 5-7 cards total in your "expedition deck"

**Hand System:**
- Draw 2 cards per encounter
- Play 1-2 cards to resolve the encounter
- Played cards exhaust (marked as "used")
- At next encounter, draw from unexhausted cards only
- If you run out of cards, game over (failed expedition)

---

### 2. CHARACTER CARDS (Survivors)

Each survivor has:
- **Name** (e.g., "Sarah Chen")
- **Role** (Healer, Fighter, Scout, etc.)
- **Health** (default 100 HP)
- **Attributes** (numerical modifiers):
  - Combat (+X% damage)
  - Defense (+X% damage reduction)
  - Healing (+X% heal effectiveness)
  - Speed (+X% action priority)
  - Perception (+X% chance to avoid ambush)

---

### 3. ITEM CARDS

**Equipment Items** (reusable until exhausted):
- Rifle, Medical Kit, etc.
- Gets exhausted when used in combat
- Recovers over time at home base

**Consumable Items** (single-use):
- Canned Food, Antibiotics
- Consumed permanently after use

---

### 4. ACTION CARDS

**One-time Tactical Abilities**:
- Scout Ahead, Barricade, Medical Protocols, Tactical Retreat
- Used once per run, then exhausted
- Have strategic value in specific situations

---

### 5. COMBAT SYSTEM

**Encounter Structure:**
- Show enemy stats and types
- Draw 2 cards to your hand
- Choose 1-2 cards to play
- Calculate damage dealt vs received
- Win if enemies reach 0 HP, lose if you do

**Combat Math:**
```
Damage Dealt = (Survivor Combat % × Base Damage) + (Item Bonus) + (Synergy Bonus)
Damage Taken = (Enemy Damage × Number of Enemies) × (1 - Your Defense %)
```

---

### 6. RUN STRUCTURE

**A run consists of 3-5 stages:**
1. **Stage 1: The Neighborhood** - Zombie Horde (easy, basic combat)
2. **Stage 2: Abandoned Store** - Scavengers (medium, combat + choice)
3. **Stage 3: Safe House** - Rest & Recovery (story moment, no combat)
4. **Stage 4: The Route Home** - Escalation (hard, high stakes)
5. **Stage 5: Safe Extraction** - Final encounter or safe arrival (victory lap)

---

### 7. ITEM EXHAUSTION & RECOVERY

**What "Exhausted" Means:**
- Card cannot be drawn or played until it recovers
- Recovery happens at home base between runs
- Each card type has different recovery times

**Recovery Times:**
- Survivors: 1-2 days rest
- Equipment Items: 1 day maintenance
- Consumables: Permanently consumed
- Action Cards: 1-2 days (complex actions take longer)

---

### 8. MID-RUN DECISIONS

**Three decision types:**

**Type 1: Moral Choice**
- Help someone vs take supplies
- Affects humanity meter (V2 feature)

**Type 2: Risk/Reward**
- Go north (risky but rewarding) vs stay safe
- Affects what items you find

**Type 3: Survival Priority**
- Fight through vs hide vs split team
- Each option has different consequences

---

### 9. HOME BASE

**Features in V1:**
- View survivor/item status
- Assign recovery tasks
- View inventory
- Prepare next run

**Recovery Management:**
- Assign which survivors rest
- Assign maintenance tasks to items
- See recovery timeline
- Can't launch run until enough cards ready

---

### 10. SYNERGY SYSTEM

**Survivor + Item Synergies:**
- Sarah (Healer) + Medical Kit = +20 HP healing bonus
- Marcus (Fighter) + Rifle = +10% damage bonus
- Elena (Mechanic) + Rifle = +15% damage bonus

**Survivor + Survivor Synergies:**
- Marcus + Sarah = Sarah's "Empathy" gives +10% defense

**Item + Item Synergies:**
- Medical Kit + Antibiotics = Cure infection AND heal

---

## Card List (V1)

### SURVIVORS (5 total)
1. **Sarah Chen** (Healer) - 0/10/40/0/20 attributes
2. **Marcus Reeves** (Fighter) - 30/0/-20/10/50
3. **Elena Torres** (Mechanic) - 10/10/0/20/0
4. **James Wu** (Scout) - 5/5/0/50/40
5. **Dr. Lisa Park** (Scientist) - -10/20/60/0/30

### ITEMS (6 total)
1. **Rifle** - Combat +40, synergy with Marcus
2. **Medical Kit** - Healing +50, synergy with Sarah
3. **Shotgun** - Combat +60 (low accuracy)
4. **Antibiotics** - Cures infection status
5. **Flak Vest** - Defense +30
6. **Night Vision Goggles** - Perception +50, Speed -10

### ACTIONS (4 total)
1. **Scout Ahead** - See next encounter, +50% defense if ambush
2. **Barricade** - All survivors +30% defense
3. **Medical Protocols** - Heal all survivors 20 HP
4. **Tactical Retreat** - Avoid encounter, lose 2 random cards

---

## Game Flow

### Pre-Run: Prepare Expedition
1. Show home base status
2. Select 2 survivors
3. Select 2-3 items/actions
4. Validate deck (5-7 cards total)
5. Launch expedition

### During Run: Per Stage
1. Show encounter description
2. Draw 2 cards to hand
3. Show enemy stats
4. Player chooses 1-2 cards
5. Resolve combat
6. Mark cards as exhausted
7. Advance to next stage (or fail)

### Post-Run: Return Home
1. Show expedition summary
2. Mark all played cards as exhausted
3. Calculate recovery times
4. Show home base with updated state
5. Allow assigning recovery tasks

---

## Win/Loss Conditions

**Win:** Complete all 5 stages without losing both survivors

**Loss:**
- Both survivors reach 0 HP
- Run out of playable cards (deck empty, all exhausted)
- Player chooses to abandon run

**Partial Success:**
- Complete some stages but not all
- Return with fewer survivors
- Some items found but not full potential

---

## Development Roadmap

### Phase 1: Core Combat
- Card data structures
- Combat resolution (damage calculation)
- Encounter system
- Hand UI and card playing

### Phase 2: Run Structure
- 5-stage run template
- Encounter progression
- Decision points
- Run completion detection

### Phase 3: Item Exhaustion
- Track exhausted cards
- Recovery timer system
- Card status display

### Phase 4: Home Base (Minimal)
- Home base screens
- Survivor/item status
- Deck selection
- Persistence between runs

### Phase 5: Polish
- Flavor text and descriptions
- Synergy visual feedback
- Sound/animation hooks
- Balancing and testing

---

## Balance Notes

### Combat Math
- Survivors deal 20-50 damage per play
- Enemies deal 5-15 damage per attack
- Healing is 25-50 HP per card
- 5-card deck should be winnable with good play

### Difficulty Progression
- Stage 1: 2-3 enemies, ~30 HP (easy)
- Stage 2: 3-4 enemies, ~35 HP (medium)
- Stage 3: Rest/story (no combat)
- Stage 4: 4-5 enemies, ~40 HP (hard)
- Stage 5: 4-5+ enemies, ~60-80 HP total (very hard)

### Exhaustion Tuning
- Survivors: 1-2 days recovery
- Items: 0-2 days recovery
- Consumables: Permanently consumed
- Action cards: 1-2 days recovery

---

## Next Steps for V2

- Full relationship/morale system
- Permadeath with story consequences
- Base building and resource management
- Multiple survivors (unlock through runs)
- Persistent story arcs
- Character customization/leveling
- More complex synergies

---

**Last Updated:** 2026-03-21
**Version:** 1.0
