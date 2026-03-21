# Survivor Deck-Builder: Game Design Document

## Vision

**A tactical zombie survival card game combining Slay the Spire's decision-driven combat, RimWorld's base management and cascading failures, and The Walking Dead's random human drama.**

You lead a small group of survivors. Each day:
- **2 go on expeditions** to gather resources (wood, food, medicine, supplies)
- **2 stay at base** to defend, build, and manage tasks
- **Random events fire** (raiders, sickness, opportunities) that force hard choices
- **Resources pressure you** (walls decay, food spoils, survivors get injured)
- **Combat is the core entertainment** — tactical card decisions matter

Progression comes from unlocking new survivors, learning skills, leveling up, and expanding what's possible at your base. But the core loop is: **pressure → expedition → decision → resources → relieve pressure → new pressure**.

---

## Core Philosophy

### Everything is Cards
- Survivors? Cards.
- Items and equipment? Cards.
- Base tasks (build, guard, heal, craft)? You play survivor cards on them like card assignments.
- Encounters (combat, choices, events)? Card-based decisions.
- One UI metaphor everywhere. One interaction model: tap a card to take an action.

### The Split is the Tension
4 survivors. 2 must go on runs. 2 must stay at base.
- Your best fighter is injured. Send them on the run and risk their death? Or keep them home to defend against the raid alert coming in 2 days?
- Healer is the only one who can craft medicine. But you need scouts to gather supplies.
- You want to send your strongest team out, but the base feels defenseless.

**This is the game.** Every day, you choose who goes and who stays, knowing you're sacrificing something either way.

### Combat is Entertainment
Expeditions aren't a chore — they're the fun. You draw cards, see 2-3 options, pick the one that works. Combat math rewards synergies and smart plays. A 3-turn fight against 3 zombies should feel tactical and satisfying.

### Base is Strategy
Home base is your progress and your vulnerability. You build walls (cost: 10 wood → +10 defense vs raids). You craft medicine (cost: 5 supplies → heals infection). But every resource spent on walls is wood not spent on food. Every day someone spends building is someone not gathering.

### Random Events are the Story
Walking Dead moments. A stranger appears at the gate (help them?). Someone gets infected (isolate or treat?). You hear a horde coming (bunker down or evacuate?). A rival survivor group wants trade. These aren't scripted — they're drawn from an event deck and force immediate, high-stakes choices with limited information.

### Progression is Real
You unlock new survivors through runs. Characters gain skills (Sarah learns "Emergency Surgery" — +30% healing). Level up through experience. New base buildings unlock (watchtower, greenhouse). New items can be crafted. The game expands as you survive longer.

---

## V1 Scope

### What's IN V1:
✅ **Full run flow** — 3 stages per expedition, hand drawing, card playing, combat resolution, stage progression
✅ **Combat system** — Damage calculation, synergies, enemy variety, tactical decisions
✅ **5 survivors + 8 items + 4 actions** — All starter cards with attributes, synergies, special abilities
✅ **Card exhaustion & recovery** — Used cards tire out, recover at base over time
✅ **Mid-run decisions** — Combat choices, moral dilemmas, risk/reward branches
✅ **Home base structure** — Status screen showing survivors, items, current state
✅ **Simple recovery UI** — See which cards are ready, which are recovering
✅ **Game persistence** — Save/load between runs using localStorage
✅ **Run preparation** — Pick 2 survivors, pick 2-3 items/actions, validate, launch

### What's NOT in V1:
❌ Home base tasks (assign cards to guard/build/craft) — *saved for V1.5*
❌ Random event system — *saved for V1.5*
❌ Base building/progression (walls, watchtower, etc.) — *saved for V2*
❌ Multiple simultaneous expeditions — *always one run at a time*
❌ Character leveling/skills — *saved for V2*
❌ Unlockable survivors — *start with 5, unlock more in V2*
❌ Resource tracking (wood, food, medicine) — *saves for V1.5*
❌ Permadeath story consequences — *saved for V2*
❌ Relationship system — *saved for V2*
❌ Full day/time simulation — *time exists, advances on run completion, details TBD*

---

## Core Mechanics

### 1. THE DECK (Run Composition)

**What you bring:**
- 2 Survivor cards (named characters)
- 2-3 Item/Action cards (equipment, consumables, abilities)
- **5-7 total cards in your "expedition deck"**

**Hand System:**
- At each encounter, **draw 2 cards** into your hand
- **Play 1-2 cards** to resolve the encounter
- Played cards are marked as **exhausted** (can't draw them again this run)
- For the next encounter, you draw from your remaining unexhausted cards
- **If you run out of unexhausted cards before finishing the run, you lose** (deck empty)
- Win condition: Complete all 3 stages without both survivors dying

**Card Count Progression:**
- Stage 1: Hand size 2 (draw 2, maybe play 1-2)
- Stage 2: Hand size 2
- Stage 3: Hand size 2
- By stage 3, you'll have exhausted ~4-5 cards. Last 1-2 cards are your lifeline.

---

### 2. CHARACTER CARDS (Survivors)

**Each survivor has:**
- **Name** (Sarah Chen, Marcus Reeves, etc.)
- **Role** (Healer, Fighter, Scout, Mechanic, Scientist)
- **Health** (100 HP default, can be reduced by wounds/status effects)
- **5 Attributes** (numerical modifiers):
  - **Combat** (% damage bonus for survivor)
  - **Defense** (% damage reduction)
  - **Healing** (% heal effectiveness)
  - **Speed** (% action priority / dodge chance)
  - **Perception** (% chance to avoid ambush / find secrets)
- **Special Ability** (unique triggered effect, e.g., Sarah's Empathy, Marcus's Veteran Status)

**Example: Marcus Reeves (Fighter)**
- Attributes: Combat +30, Defense 0, Healing -20, Speed +10, Perception +50
- Special: "Veteran" — If you play Marcus twice in one run, gain +50% damage on second play
- Role flavor: High damage, low healing, good perception for sneaking out of fights

**Survivor Cards Stay in Deck the Whole Run**
- They don't "exhaust" permanently like items
- They exhaust after playing and recover after a rest encounter or action card effect
- If a survivor's health drops to 0 during a run, they're down for that run (can't be played)
- Losing both survivors = run loss

---

### 3. ITEM CARDS

**Equipment Items** (reusable, can be exhausted/recovered):
- Rifle, Shotgun, Medical Kit, Flak Vest, Night Vision Goggles
- When played in combat, they add bonuses (damage, defense, healing)
- After use, they are marked **exhausted**
- Return home, they recover over 1 day before being usable again
- Can be played by any survivor (but synergies give bonuses)

**Consumable Items** (single-use, permanently consumed):
- Canned Food, Antibiotics
- Provide a one-time effect (restore health, cure infection)
- After used, they are gone forever (no recovery)
- Don't count against card exhaustion — they're just used

---

### 4. ACTION CARDS

**Tactical One-Time Abilities:**
- Scout Ahead, Barricade, Medical Protocols, Tactical Retreat
- Powerful but limited — you pick a max of 1-2 for your expedition deck
- Used once per run, then exhausted
- Example: "Scout Ahead" — See the next encounter before committing to a combat decision
- Example: "Tactical Retreat" — Skip this encounter entirely, but lose 2 random unexhausted cards
- Recover over time at home base (varies by action)

---

### 5. COMBAT SYSTEM

**Encounter Structure:**

1. **Show the situation** — Description (e.g., "3 Zombies blocking the pharmacy door") + Enemy stats
2. **Draw 2 cards** into your hand from your expedition deck
3. **Player chooses 1-2 cards to play** (or plays an action that affects the encounter)
4. **Resolve combat:**
   - Calculate damage dealt (your card(s) vs enemies)
   - Calculate damage received (enemy damage to your survivors)
   - Apply status effects (infected, wounded, etc.)
5. **Check victory/loss:**
   - If all enemies reach 0 HP → **Stage Clear**, advance to next encounter
   - If any survivor reaches 0 HP → **Survivor Down**, can't use that survivor for rest of run
   - If both survivors down → **Run Lost**
6. **Mark cards as exhausted** if they're equipment/survivors
7. **Advance to next encounter**

**Combat Math:**

```
Damage Dealt = Base Survivor Damage + (Survivor Combat % × Base Damage)
               + Item Bonus + Synergy Bonus

Damage Taken = (Enemy Damage × Number of Enemies) × (1 - Your Defense %)

Enemy Damage Reduction = Armor % (e.g., Armored Zombie has 20% reduction)
```

**Example Combat:**
- You have Marcus (Fighter, Combat +30%) + Rifle (Combat +40)
- Encounter: 3 Zombies, each with 20 HP, 10 damage per turn, 0% armor
- You play Marcus + Rifle
  - Marcus base damage: 25
  - With Combat +30%: 25 × 1.3 = 32.5
  - Rifle bonus: +40
  - Synergy (Marcus + Rifle): +10
  - **Total damage dealt: 82.5**
- Enemies take 82.5 damage total (split among them as you choose, or apply to one)
- You take: (10 × 3) × (1 - 0% defense) = 30 damage to one survivor
- Net result: Enemies drop to ~40 HP total, you've taken 30 damage

---

### 6. RUN STRUCTURE (3 Stages)

**A run consists of 3 encounters (stages):**

1. **Stage 1: Easy** — Scavenging location (pharmacy, grocery store, neighborhood)
   - 1-2 enemies, ~20-30 HP total
   - Low pressure, testing ground
   - Example: "3 Zombies shambling through the pharmacy"

2. **Stage 2: Medium** — Contested zone (abandoned parking lot, office building, school)
   - 2-4 enemies, ~40-50 HP total
   - Mid-run decision point (do you push through or take a loss to conserve cards?)
   - Example: "4 Scavengers looting supplies — they see you"
   - Might have a decision branch: fight, sneak past, negotiate

3. **Stage 3: Hard** — Extraction/boss fight (highway out, final obstacle, tough survivor group)
   - 3-5 enemies, ~60-80 HP total
   - By now, you've exhausted most of your deck
   - Last 1-2 cards are critical
   - Example: "Armored group of 4 Raiders blocking the exit"
   - Victory = run success, return home with loot

**No "safe house" rest stage in V1.** You run 3 encounters back-to-back. Pressure is relentless.

---

### 7. MID-RUN DECISIONS

**Not every encounter is pure combat.** Some have decision points:

**Type 1: Risk/Reward**
- "You find a locked supply crate. Pick the lock (risky, might attract attention) or bash it open (loud, guaranteed noise)?"
- Outcomes: Success → find item. Failure → take damage or lost time
- Each option burns different cards

**Type 2: Moral Choice**
- "You find a survivor hiding. Help them (slow down, -1 card) or leave them (faster, +1 morale)?"
- These don't directly affect V1 (morale is V2), but set foundation
- Outcomes: Help → maybe they give you item. Leave → guilt, they follow you anyway?

**Type 3: Survival Priority**
- "You hear a horde coming. Fight through this encounter, hide (skip it, lose 2 cards), or split up?"
- Each option has different consequences

**Decision Format (Phone-Friendly):**
```
┌─────────────────────────────────────┐
│ Locked Supply Crate                 │
├─────────────────────────────────────┤
│ You find supplies but they're locked │
│                                     │
│ [PICK LOCK]    [BASH IT]           │
│  risky         loud                 │
└─────────────────────────────────────┘
```

---

### 8. ITEM EXHAUSTION & RECOVERY

**What "Exhausted" means:**
- Card cannot be drawn or played until it recovers at home base
- Exhaustion happens after a card is used in combat
- Recovery is time-based, happens automatically between runs

**Recovery Times (at home base, after returning from expedition):**
- **Survivors:** 1 day rest (injured from combat, bruised)
- **Equipment Items:** 1 day maintenance (rifle needs cleaning, kit needs restocking)
- **Consumables:** 0 days (permanently consumed when used)
- **Action Cards:** 1-2 days depending on action (Scout Ahead = 1 day, Barricade = 1 day)

**Recovery Mechanic:**
- After you return from a run and mark cards as exhausted, a timer starts
- Home base screen shows: "Rifle — Ready in 1 day", "Marcus — Rest (1 day)", "Medical Kit — Ready"
- Next run cannot launch until you have at least 5 cards available (min deck size)
- If too many cards are exhausted, you're forced to wait or accept a smaller deck (risky)

---

### 9. SYNERGY SYSTEM

**2-card combos that give bonus effects:**

**Survivor + Item Synergies:**
- Marcus (Fighter) + Rifle = +10% damage (natural fit)
- Marcus (Fighter) + Shotgun = +15% damage (shotgun + close-combat fighter)
- Sarah (Healer) + Medical Kit = +20% heal bonus (natural fit)
- Elena (Mechanic) + Rifle = +15% damage (she knows guns)
- Elena (Mechanic) + Night Vision Goggles = +20% perception (tech expertise)
- James (Scout) + Night Vision Goggles = +25% perception (scout with better sight)
- Dr. Lisa (Scientist) + Medical Kit = +25% heal (medical expertise)

**Survivor + Survivor Synergies:**
- Marcus + Sarah = Sarah's "Empathy" gives +10% defense to group when Sarah is played
- James + Elena = Elena's "Jury Rig" can reuse an exhausted item card if James was last played

**Item + Item Synergies:**
- Medical Kit + Antibiotics = Using both together: heal 25 HP + cure infection status (better together)

**Synergy Display:**
When you play a card, show if it synergizes with previous card in turn:
```
┌──────────────────┐
│ Marcus Reeves    │
│ Fighter          │
├──────────────────┤
│ Combat: +30%     │
│ Damage Dealt: 32 │
│                  │
│ ✓ Synergy Found! │
│   + Rifle        │
│   +10% bonus     │
│ New Damage: 40   │
└──────────────────┘
```

---

### 10. HOME BASE (Minimal V1)

**Home Base Screen shows:**
1. **Survivor Status** — 4 survivors, health, exhaustion status
2. **Item Status** — Equipment and action cards, recovery timers
3. **Run Summary** (if returning from run) — Loot found, damage taken, cards used
4. **Preparation UI** — Select 2 survivors + 2-3 items for next run

**What's NOT in V1:**
- Task assignments (build, guard, craft) — *V1.5*
- Base buildings (walls, watchtower) — *V2*
- Resource management — *V1.5*
- Random events — *V1.5*

---

## Card List (V1)

### SURVIVORS (5 total)

1. **Sarah Chen** (Healer)
   - Attributes: Combat 0 / Defense 10 / Healing 40 / Speed 0 / Perception 20
   - Special: "Empathy" — When Sarah is in play, all survivors gain +10% defense
   - Role: Healing and support

2. **Marcus Reeves** (Fighter)
   - Attributes: Combat 30 / Defense 0 / Healing -20 / Speed 10 / Perception 50
   - Special: "Veteran" — If Marcus is played twice in same run, 2nd play gets +50% damage
   - Role: Damage and toughness

3. **Elena Torres** (Mechanic)
   - Attributes: Combat 10 / Defense 10 / Healing 0 / Speed 20 / Perception 0
   - Special: "Jury Rig" — Can reuse one exhausted item card per run
   - Role: Versatility and card reuse

4. **James Wu** (Scout)
   - Attributes: Combat 5 / Defense 5 / Healing 0 / Speed 50 / Perception 40
   - Special: "Quick Reflexes" — +30% chance to dodge ambush encounters
   - Role: Mobility and perception

5. **Dr. Lisa Park** (Scientist)
   - Attributes: Combat -10 / Defense 20 / Healing 60 / Speed 0 / Perception 30
   - Special: "Medical Knowledge" — +20% healing effectiveness on all medical items
   - Role: Healing specialization

### ITEMS (8 total)

**Equipment (Reusable, exhaust after use):**
1. **Rifle** — Combat +40 damage, Recovery 1 day, Synergy: Marcus +10%, Elena +15%
2. **Shotgun** — Combat +60 damage (high spread), Recovery 1 day, Synergy: Marcus +15%
3. **Medical Kit** — Healing +50 HP, Recovery 1 day, Synergy: Sarah +20%, Lisa +25%
4. **Flak Vest** — Defense +30%, Recovery 1 day, Synergy: Marcus +10%
5. **Night Vision Goggles** — Perception +50, Speed -10, Recovery 1 day, Synergy: James +25%, Elena +20%

**Consumables (Single-use, permanently consumed):**
6. **Canned Food** — Restore 25 HP, lasts forever at base
7. **Antibiotics** — Cure infection status, lasts forever at base
8. **Gasoline Can** — Burn barricade (destroy obstacle), single use

### ACTIONS (4 total)

1. **Scout Ahead** — See next encounter before committing. Recovery 2 days.
   - Effect: Reveal next encounter's enemies and type before combat starts
   - Use case: Tactical planning, decide if you need to conserve cards

2. **Barricade** — Fortify position. Recovery 1 day.
   - Effect: All survivors gain +30% defense for next encounter
   - Use case: Protecting injured survivors, buying time

3. **Medical Protocols** — Emergency healing. Recovery 1 day.
   - Effect: Heal all survivors 20 HP (no synergy bonuses)
   - Use case: Group heal when combat has worn everyone down

4. **Tactical Retreat** — Escape encounter. Recovery 1 day.
   - Effect: Skip current encounter entirely, but lose 2 random unexhausted cards
   - Use case: Escape a hopeless fight at a cost

---

## Game Flow (V1 Focus: The Run)

### Pre-Run: Prepare Expedition

**Screen 1: Home Base Status**
```
┌────────────────────────────────┐
│ SURVIVOR DECK-BUILDER          │
│ Home Base                      │
├────────────────────────────────┤
│ SURVIVORS:                     │
│ ✓ Sarah Chen       (Ready)     │
│ ✓ Marcus Reeves    (Ready)     │
│ ⚠ Elena Torres     (Rest 1d)   │
│ ✓ James Wu         (Ready)     │
│ ⚠ Dr. Lisa Park    (Rest 2d)   │
│                                │
│ ITEMS:                         │
│ ✓ Rifle            (Ready)     │
│ ✓ Medical Kit      (Ready)     │
│ ⚠ Shotgun          (Rest 1d)   │
│ ✓ Flak Vest        (Ready)     │
│ ⚠ Night Vision     (Rest 1d)   │
│                                │
│ ▶ PREPARE EXPEDITION            │
└────────────────────────────────┘
```

**Screen 2: Deck Selection**
```
┌────────────────────────────────┐
│ PREPARE EXPEDITION             │
│ Select 2 Survivors + 2-3 Items │
├────────────────────────────────┤
│ PICK SURVIVORS (2):            │
│ ☐ Sarah Chen    ☑ Marcus      │
│ ☐ Elena Torres  ☑ James Wu    │
│ ☐ Dr. Lisa Park                │
│                                │
│ PICK ITEMS (2-3):              │
│ ☑ Rifle         ☑ Medical Kit │
│ ☐ Shotgun       ☐ Flak Vest   │
│ ☐ Night Vision  ☐ Barricade   │
│                                │
│ DECK SIZE: 4/5-7 (Valid)       │
│                                │
│ ▶ LAUNCH EXPEDITION             │
└────────────────────────────────┘
```

---

### During Run: Per Encounter

**Screen 1: Encounter Intro**
```
┌─────────────────────────────────────┐
│ STAGE 1 / 3                         │
│ The Pharmacy                        │
├─────────────────────────────────────┤
│                                     │
│ You push through the glass doors.  │
│ Shambling figures in the aisles—   │
│ 3 zombies stand between you and     │
│ the medicine cabinet.               │
│                                     │
│ Marcus: 100 HP | James: 100 HP     │
│                                     │
│ ▶ ENTER COMBAT                      │
└─────────────────────────────────────┘
```

**Screen 2: Combat UI**
```
┌─────────────────────────────────────┐
│ STAGE 1 / 3: Pharmacy Combat       │
├─────────────────────────────────────┤
│ ENEMIES:                            │
│ Zombie 1: 20 HP ████░░░░            │
│ Zombie 2: 20 HP ████░░░░            │
│ Zombie 3: 20 HP ████░░░░            │
│ Total Damage: 10 × 3 = 30           │
│                                     │
│ YOUR HAND (Draw 2):                 │
│ ┌──────────┐  ┌──────────┐         │
│ │ Marcus   │  │ Medical  │         │
│ │ Fighter  │  │ Kit      │         │
│ └──────────┘  └──────────┘         │
│                                     │
│ CHOOSE 1-2 CARDS TO PLAY:          │
│ [Marcus]  [Medical Kit]  [Pass]    │
│                                     │
│ Marcus + Medical Kit Synergy?      │
│ ❌ No synergy (Fighter + Healing)  │
└─────────────────────────────────────┘
```

**Screen 3: Combat Resolution**
```
┌─────────────────────────────────────┐
│ COMBAT RESOLUTION                   │
├─────────────────────────────────────┤
│ YOU PLAYED: Marcus + Medical Kit    │
│                                     │
│ DAMAGE DEALT:                       │
│ Marcus (Combat +30%): 32 damage     │
│ Rifle Bonus: +40                    │
│ Medical Kit (healing): 25 HP heal   │
│ NO SYNERGY BONUS                    │
│ ────────────────────────────────    │
│ TOTAL DAMAGE: 32 (to enemies)       │
│ TOTAL HEALING: 25 (to group)        │
│                                     │
│ ENEMIES' COUNTERATTACK:             │
│ 3 Zombies × 10 damage = 30 dmg      │
│ Your Defense: 0%                    │
│ DAMAGE TAKEN: 30 to Marcus          │
│                                     │
│ RESULT:                             │
│ Zombies: 60 → 28 HP (still alive)   │
│ Marcus: 100 → 70 HP (wounded)       │
│ James: 100 HP (unharmed)            │
│                                     │
│ ▶ CONTINUE (Marcus + James both    │
│   exhausted, next hand draws new)   │
└─────────────────────────────────────┘
```

**Screen 4: Next Hand (Cards Cycle)**
```
┌─────────────────────────────────────┐
│ TURN 2 OF COMBAT                    │
├─────────────────────────────────────┤
│ ENEMIES:                            │
│ Zombie 1: 9 HP ██░░░░░░░            │
│ Zombie 2: 9 HP ██░░░░░░░            │
│ Zombie 3: 10 HP ██░░░░░░░           │
│ Total: 28 HP                        │
│                                     │
│ YOUR HAND (Draw 2 new cards):       │
│ ┌──────────┐  ┌──────────┐         │
│ │ James Wu │  │ Barricade│         │
│ │ Scout    │  │ Action   │         │
│ └──────────┘  └──────────┘         │
│ Cards still in deck: Medical Kit,   │
│ Rifle (Marcus and James exhausted)  │
│                                     │
│ CHOOSE 1-2 CARDS:                  │
│ [James]  [Barricade]  [Pass]       │
│                                     │
│ James + Barricade Synergy?          │
│ ✓ YES! Scout + Barricade +15%      │
│   defense boost (added together)    │
└─────────────────────────────────────┘
```

**Screen 5: Victory**
```
┌─────────────────────────────────────┐
│ STAGE 1 CLEAR!                      │
├─────────────────────────────────────┤
│ All zombies defeated.               │
│                                     │
│ REWARDS:                            │
│ ✓ First Aid Supplies (item)         │
│ ✓ Ammunition (consumable)           │
│ ✓ Experience: +50 XP               │
│                                     │
│ SURVIVOR STATUS:                    │
│ Marcus: 70 HP (wounded)             │
│ James: 100 HP (exhausted)           │
│                                     │
│ CARDS EXHAUSTED:                    │
│ - Marcus Reeves (needs rest)        │
│ - James Wu (needs rest)             │
│                                     │
│ CARDS READY FOR NEXT:               │
│ - Medical Kit (1 use left)          │
│ - Barricade (used, exhausted)       │
│ - Rifle (not yet used)              │
│                                     │
│ ▶ CONTINUE TO STAGE 2               │
└─────────────────────────────────────┘
```

---

### Post-Run: Return Home

**Screen 1: Expedition Summary**
```
┌─────────────────────────────────────┐
│ EXPEDITION COMPLETE!                │
├─────────────────────────────────────┤
│ Survived: 3/3 Stages               │
│ Status: VICTORY                     │
│                                     │
│ SURVIVORS:                          │
│ Marcus: 45 HP (wounded, resting)    │
│ James: 87 HP (bruised, resting)    │
│                                     │
│ LOOT GATHERED:                      │
│ ✓ First Aid Supplies                │
│ ✓ Ammunition × 2                    │
│ ✓ Water Bottles × 5                 │
│ ✓ Medicine Cabinet Lock (broken)    │
│                                     │
│ CARDS USED:                         │
│ - Marcus Reeves (exhausted: 1 day)  │
│ - Medical Kit (exhausted: 1 day)    │
│ - Rifle (exhausted: 1 day)          │
│ - Barricade (exhausted: 1 day)      │
│ - James Wu (exhausted: 1 day)       │
│                                     │
│ ▶ RETURN TO HOME BASE               │
└─────────────────────────────────────┘
```

**Screen 2: Home Base (Updated)**
```
┌──────────────────────────────────┐
│ HOME BASE - AFTER EXPEDITION     │
├──────────────────────────────────┤
│ SURVIVORS:                       │
│ ⚠ Marcus Reeves   (Rest 1d)      │
│ ⚠ James Wu        (Rest 1d)      │
│ ✓ Sarah Chen      (Ready)        │
│ ✓ Elena Torres    (Ready)        │
│                                  │
│ ITEMS:                           │
│ ⚠ Medical Kit     (Rest 1d)      │
│ ⚠ Rifle           (Rest 1d)      │
│ ✓ Shotgun         (Ready)        │
│ ✓ Flak Vest       (Ready)        │
│ ⚠ Barricade       (Rest 1d)      │
│                                  │
│ NEW ITEMS IN INVENTORY:          │
│ + First Aid Supplies (consumable)│
│ + Ammunition (consumable)        │
│ + Water Bottles × 5              │
│                                  │
│ ▶ PREPARE NEXT EXPEDITION         │
└──────────────────────────────────┘
```

---

## Win/Loss Conditions

### Run Success (Victory)
- Complete all 3 stages without both survivors reaching 0 HP
- Return home with loot
- Mark cards as exhausted (recovery starts)
- Inventory is updated

### Run Failure (Defeat)
- **Both survivors reach 0 HP** during the run → Game Over
- **Deck runs out** (all 5-7 cards exhausted, can't draw) → Game Over
- **Player chooses to Retreat** using Tactical Retreat action → Lost run but return home safely

### Partial Success
- V1: Not implemented. A run is either won or lost. (V2: partial success with survivor loss)

---

## V1 Development Plan

### Phase 1: Core Run Flow (FOCUS FOR V1)
- ✅ Encounter system (3-stage run structure)
- ✅ Hand drawing (draw 2 cards per encounter)
- ✅ Card playing UI (tap card to play)
- ✅ Combat resolution (damage math, synergies)
- ✅ Victory/loss detection
- ✅ Stage progression UI
- ✅ Exhaustion tracking during run

### Phase 2: Persistence & Home Base
- ✅ Save game state after run
- ✅ Mark cards as exhausted
- ✅ Show recovery timers
- ✅ Home base status screen
- ✅ Deck selection UI
- ✅ Validation (min 5 cards, max 7, exactly 2 survivors)

### Phase 3: UI Polish
- Mobile-first card rendering (big, tappable)
- Encounter descriptions with flavor
- Combat feedback (damage numbers, animations)
- Synergy visual highlighting
- Status indicators (health bars, exhaustion badges)

### Phase 4: Balancing
- Encounter difficulty tuning
- Damage number verification
- Synergy bonus values
- Recovery times

---

## Balance Reference

### Combat Damage (per card play)
- Survivor base: 25 damage
- Survivor Combat attribute: ±X% of base
- Item bonus: +20 to +60
- Synergy bonus: +10 to +25
- **Expected per-play: 40-80 damage**

### Enemy Damage (per turn)
- Per enemy: 5-15 damage
- 3 enemies: ~15-45 damage per turn
- Player defense reduces this by 0-50%
- **Expected damage taken per encounter: 30-90 damage**

### Healing (per card play)
- Healing card: 25-50 HP
- Synergy bonus: +10-20
- **Expected heal per card: 25-60 HP**

### Enemy HP (by stage)
- Stage 1: 20-30 HP total (easy)
- Stage 2: 40-50 HP total (medium)
- Stage 3: 60-80 HP total (hard)

### Recovery Times
- Survivors: 1 day rest
- Equipment: 1 day maintenance
- Consumables: 0 (permanently used)
- Actions: 1-2 days (varies)

---

## Future Phases (V1.5 → V2)

### V1.5: Base Management
- Home base tasks (assign survivor cards to guard/build/craft)
- Random event system (raiders, sickness, opportunities)
- Resource tracking (wood, food, medicine, supplies)
- Simple base buildings (walls, watchtower, garden)
- Risk of base events while expedition is running

### V2: Progression & Depth
- Character progression (gain skills, level up)
- Unlock new survivors through story
- Bigger skill tree per survivor
- Relationship system (survivors bond/conflict)
- Permadeath consequences
- Multiple expedition types (military base, research lab, etc.)
- Harder random events with cascading failures

---

## Technical Notes

### Game State Structure
```typescript
GameState = {
  userId: string
  deck: Card[]                    // All cards owned
  homeBase: {
    survivors: CardInstance[]
    items: CardInstance[]
    inventory: Loot[]
  }
  currentRun: Run | null         // Active expedition
  completedRuns: Run[]            // History
}

Run = {
  runId: string
  status: 'active' | 'won' | 'lost'
  selectedDeck: Card[]           // 5-7 cards brought
  currentHand: Card[]            // Current 2 drawn
  currentStage: number           // 1-3
  stageHistory: StageResult[]
  itemsFound: Loot[]
}

StageResult = {
  stage: number
  encounter: Encounter
  decision?: Decision
  cardsPlayed: Card[]
  cardsExhausted: Card[]
  damageDealt: number
  damageTaken: number
  result: 'won' | 'lost'
  lootFound: Loot[]
}
```

### No External Dependencies (Except Framer Motion for animations)
- Pure React + TypeScript for game logic
- Tailwind for mobile-first styling
- localStorage for persistence
- Framer Motion for card animations (optional, add later)

---

**Last Updated:** 2026-03-21
**Version:** 2.0
**Status:** Ready for V1 Implementation (Run Flow)

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
