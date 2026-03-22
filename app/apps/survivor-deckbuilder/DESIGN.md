# Survivor Deckbuilder — Design Document
## Combat Refinement, Balance & Gameplay Loop

> **Philosophy**: Fast. Precise. Every decision matters. No filler, no waiting.
> First run teaches the system. Day 10 should scare you.

---

## Current State Audit

### What works
- 3-stage runs with card-based combat resolution
- Daily survival loop (food, assignments, raids)
- Raw materials → crafting economy
- Card exhaustion creating roster tension

### What needs fixing
- All encounters feel identical regardless of day or enemy type
- Combat is a single resolution roll — no tactics, no counterpicks
- Inter-stage pace drags (loot selection, no momentum)
- First runs too easy, difficulty never escalates
- Cards never degrade — no ongoing economy pressure
- Home screen is passive between runs (no urgency)

---

## 10 Gameplay Improvements (Approved)

---

### 1. Encounter Telegraph
**Status: SHIP**

Before card selection, flash the enemy type icon for ~1.5 seconds.
No text — just a large icon that tells you what you're facing.

```
Horde    → skull cluster icon  (area damage wins)
Ambush   → hidden figure       (perception wins)
Infected → biohazard symbol    (medical wins)
Armored  → shield icon         (heavy weapons win)
Raiders  → crossed swords      (full combat needed)
```

The flash happens on `stage_start` phase, then fades. Rewards players who
adapted their deck mid-run. Non-adaptors still fight — they just fight worse.

**Implementation:** Add `enemyType` to `Encounter`. Show telegraph overlay
on `stage_start` phase in page.tsx for 1.5s, then transition to card selection.

---

### 2. Combo Flash Labels
**Status: SHIP**

When a player selects 2+ cards that synergize, show a brief flash banner:

| Combo | Label | Bonus |
|-------|-------|-------|
| Marcus + Rifle | ⚡ SUPPRESSION SHOT | +20 DMG |
| Marcus + Shotgun | ⚡ CLOSE QUARTERS | +15 DMG, AOE |
| Sarah + Med Kit | ✦ SURGICAL CARE | +20 HLG |
| Sarah + Antibiotics | ✦ FIELD MEDICINE | Clears infection |
| James + Goggles | ◎ GHOST PROTOCOL | +30% dodge ambushes |
| James + Scout Ahead | ◎ DEEP RECON | Reveals next encounter |
| Elena + any weapon | ⚙ JURY RIG | Weapon uses -1 ammo this stage |
| Lisa + Med Kit | ⚗ ADVANCED TRIAGE | +35 HLG, remove 1 debuff |
| Marcus + Barricade | 🛡 HOLD THE LINE | +30 DEF + ATK |
| 3+ survivors | ★ FULL SQUAD | +10% all stats |

Flash appears 0.5s after selection, stays 1.5s, auto-dismisses.
Does NOT block — it's informational, not a gate.

**Implementation:** `COMBO_DEFS` array in registry. `detectCombos(selectedCards)`
in card utils. Flash overlay in the card selection phase.
The bonuses feed into `resolveCombat` as a multiplier on the result.

---

### 3. Daily Event Cards
**Status: SHIP**

Every morning, one event flips on the home screen. Visible all day.
Mix of threats, opportunities, and moral choices.

**Threat events** (force immediate action):
```
"Infected Scent" — Horde doubles in size today's runs. Avoid or prepare.
"Food Spoilage" — Lose 3 food immediately. No warning.
"Survivor Fever" — One random survivor loses 20 HP. Assign to infirmary.
"Raid Warning" — Tonight's raid chance is 90%. Guard NOW.
"Supply Cache Found" — Scavenge today for +5 guaranteed materials.
```

**Opportunity events** (1 day to act):
```
"Trade Caravan" — Spend 5 food → gain any 1 item card from 3 choices.
"Refugee Joins" — A new survivor with random stats. Accept or turn away.
"Lucky Find" — First survivor to scavenge today finds a weapon.
"Adrenaline" — One survivor ignores exhaustion for 1 run today only.
"Storm Coming" — Build barricade now for free (materials still cost, but +50% DEF).
```

**Moral events** (no right answer):
```
"Child Found" — Take them in (+1 survivor, costs +1 food/day) or turn away.
"Wounded Stranger" — Use Medical Kit to save them (they join with 40 HP) or leave.
"Raider Prisoner" — Execute (morale -10) or release (50% chance they attack at night).
```

Events expire at end of day. Undimissable — you must decide or not decide.

**Implementation:** `EVENT_POOL` in registry. Roll 1 event per day in `endDay()`.
Store as `homeBase.currentEvent`. Clear when day advances. Show on home screen.
Some events trigger immediate effects; others require player to take action.

---

### 4. Threat Scaling by Day
**Status: SHIP**

Encounter difficulty scales with the day counter. Same location, harder enemies.

```
Day  1-3:   Threat Level 1 — Stragglers only, 60% of normal stats
Day  4-6:   Threat Level 2 — Small groups, 80% of normal stats
Day  7-10:  Threat Level 3 — Normal hordes, full stats
Day 11-15:  Threat Level 4 — Armored/special, 120% stats
Day 16-20:  Threat Level 5 — Raider squads, 140% stats, +1 enemy
Day 21+:    Threat Level 6 — Compound assault, 160% stats, +2 enemies, stage conditions
```

Formula: `threatLevel = Math.min(6, Math.floor(day / 3.5) + 1)`

Each threat level modifies:
- `encounter.enemies[].hp` × threat multiplier
- `encounter.enemies[].attack` × threat multiplier
- `encounter.enemies.length` + bonus at TL5+

**Implementation:** `getThreatLevel(day)` in `encounters.ts`.
`scaleEncounterToThreat(encounter, threatLevel)` applies multipliers.
Called in `getRandomEncounter(stage, day)` — pass day from gameState.

---

### 5. Enemy Types with Card Counterpicks
**Status: SHIP**

Five enemy types. Each has a weakness. Picking the right cards gives a damage
multiplier. Wrong cards get a penalty. Encounter telegraph (above) gives you
the info to decide.

| Enemy Type | Weakness | Bonus if countered | Penalty if wrong |
|------------|----------|-------------------|-----------------|
| **Straggler** | Anything | None | None |
| **Horde** | Area damage (Gasoline, Barricade) | +40% DMG | -20% DMG per card |
| **Infected** | Medical cards reduce infection, healing | +30% HLG, no infection | Survivors get infected |
| **Armored** | High ATK weapons (Rifle 40+) | +50% DMG | -40% DMG |
| **Ambush** | Perception (Goggles, James, Scout Ahead) | First strike bonus | -30% DEF |
| **Raiders** | Full mixed deck (survivors + weapons) | +25% all | None |

**Infection mechanic:** When fighting Infected without medical cards, each surviving
enemy has a 30% chance to infect one random survivor. Infected survivors lose 10 HP/day
until cured with Antibiotics.

**Implementation:** `EnemyType` enum. Add `weakness`, `counterBonus`, `failPenalty`
to `Encounter`. `applyTypeModifiers(cards, encounter)` in combat-engine.

---

### 6. Stage Conditions
**Status: SHIP**

After day 5, encounters can carry a condition that changes the rules.
Conditions layer over enemy type — you might face an Armored Horde in the Rain.

| Condition | Effect | Counter |
|-----------|--------|---------|
| **Night** | Perception -40% unless Goggles equipped | Equip Goggles |
| **Rain** | Each weapon: 30% jam chance (uses ammo, deals 0) | Melee/action cards |
| **Infected Zone** | Any hit on survivor: 25% infection chance | Sarah, Med Kit |
| **Fortified** | Enemies +50% DEF unless Scout Ahead used | Scout Ahead |
| **Fog** | Can't see enemy type until card selection starts | — |
| **Timed** | Enemies multiply after 2 turns | High DPS cards |

Conditions roll with 25% chance starting day 5. Two conditions can stack after day 10.

**Implementation:** `StageCondition` type. Array on `Encounter`. Applied in
`resolveCombat` after base damage calc. Show condition icons during telegraph phase.

---

### 7. Sprint vs Siege Mode
**Status: SHIP**

One binary toggle on the Prepare Run screen.

**SPRINT**
- Max 4 cards
- Only 2 stages (skip stage 3)
- +75% loot quantity
- No retreat option
- Survivors recover in 0 days (sprint doesn't count as a full run)

**SIEGE**
- Full deck, all cards
- All 3 stages
- Normal loot
- Retreat allowed
- Normal exhaustion rules

Sprint is for when you need food fast. Siege is for gear and progression.
The time pressure of a sprint run changes how you play completely.

**Implementation:** `RunMode: 'sprint' | 'siege'` on `Run`. Toggle in `PrepareRunScreen`.
`startRun(selectedCards, mode)` — mode gates stage count and loot multiplier.

---

### 8. Item Wear System
**Status: SHIP**

Weapons accumulate wear across runs. Not just ammo — structural degradation.

```
Wear 0 (New):       Full stats, full ammo
Wear 1 (Used):      -10% ATK
Wear 2 (Worn):      -25% ATK, small chance to jam
Wear 3 (Damaged):   -40% ATK, frequent jams, visual crack on card
Wear 4 (Broken):    Unusable — workshop repair required
```

Wear increments by 1 after each completed run the weapon was used in.
Gear (Vest, Goggles) doesn't wear — only weapons.

Repair at workshop: 1 scrap metal → -1 wear level, 1 day.

**Implementation:** `wear: number` field on `CardInstance`. Increment in `completeRun`
for weapons that were in `currentRun.deck`. Apply ATK penalty in `combat-engine`
before damage calc. Jam chance added to `resolveWeaponShot()`.
Repair recipe in `CRAFT_RECIPES`.

---

### 9. Pre-Run Momentum Card
**Status: SHIP**

Each day, one situational bonus card generates. Shown on the home screen.
Tap to activate before a run. Expires at day end.

```
"Overheard Radio"     — Reveals enemy type of all 3 stages before you start
"Found Shortcut"      — Skip stage 1, go straight to stage 2 (less loot)
"Adrenaline Cache"    — One survivor starts with +30% ATK this run only
"Fog of War"          — Enemies weakened 20% today (caught off guard)
"Lucky Ammo"          — All weapons start with +2 extra ammo this run
"Scavenged Parts"     — First stage win guarantees 1 weapon card loot
"Medical Stash"       — First stage win guarantees 1 medical card loot
"Survivor Instinct"   — Retreat doesn't exhaust cards this run
```

**Implementation:** `MOMENTUM_CARDS` pool in registry. Roll 1 per day in `endDay()`.
Store as `homeBase.momentumCard`. Consumed when used, cleared at day advance.
Apply as a run modifier in `startRun()`.

---

### 10. Party Split at Stage 2
**Status: SHIP**

Before stage 2 begins, a prompt: **Push Forward** or **Split the Party**.

**Split:**
- Choose 1 survivor to stay behind and scavenge
- They generate 3-4 guaranteed materials during your stage 2+3 fight
- The run continues with 1 fewer survivor card available
- The scavenging survivor does NOT become exhausted

Tension: weaker fight for guaranteed resources. Sometimes the right play.
Especially valuable if you have a wounded survivor you don't want risking stage 3.

**Implementation:** `splitSurvivorId?: string` on `Run`. Prompt shown in
`stage_complete` phase between stage 1 and 2. Scavenging survivor's output
added to `stagedLoot` when run completes.

---

## Difficulty Progression Summary

```
Day 1-3:   Learn the system. Easy combat. Food is the real pressure.
Day 4-7:   Enemies get harder. Encounter types appear. Need real gear.
Day 8-14:  Stage conditions unlock. Threat level 4. Raids frequent.
Day 15-20: Special enemies. Multiple conditions. Item wear bites.
Day 21+:   Compound assault difficulty. Every run is a hard decision.
```

**The early pressure is food, not combat.**
The food math ensures even easy combat creates urgency:
```
5 survivors × 1 food/day = 5 food consumed
Average run yield: 3-5 food
Net: -0 to -2 food/day before scavenging
Garden takes 4 days. You're always slightly behind.
```

This means even on day 1, you're choosing: *run today and risk it, or rest and starve slowly.*

---

## Combat Resolution Principles

### No RNG on outcomes — only on inputs
The dice roll is: *what encounter do I face?* Not: *did my attack hit?*
Once you know the encounter and you've picked your cards, the outcome should
be deterministic or near-deterministic. Skill = reading the situation correctly
and picking the right cards.

### Every card should have a "right time"
No card should feel useless. Scout Ahead feels weak until day 5 when Fortified
conditions appear and it becomes essential. Antibiotics feel like wasted slots
until Infected enemies start appearing.

### Loss should feel like a mistake, not bad luck
When you lose a stage, the post-combat screen should make the failure legible:
"Armored enemies. You had no high-ATK weapons. That's why." Players
learn and adapt. Roguelikes that kill you randomly teach nothing.

---

## Inspiration

| Game | What We Steal |
|------|--------------|
| **Slay the Spire** | Build emerges organically, combos reward knowledge, each run feels like a different archetype |
| **Into the Breach** | Perfect information, puzzle combat, loss always feels like a mistake |
| **This War of Mine** | Home pressure, moral events, survival loop creating genuine dread |
| **Darkest Dungeon** | Roster tension, permadeath weight, escalating dungeon difficulty |
| **FTL** | Time clock pressure, explore vs push, crew permadeath tension |
| **Dead Cells** | Momentum through runs, never stop moving, satisfying feedback |
| **Hades** | Narrative lives in the loop, world feels alive between runs |

---

## Implementation Phases

### Phase A — Immediate (Pure feel improvements)
1. Encounter telegraph
2. Combo flash labels
3. Daily event cards
4. Threat scaling by day

### Phase B — Core depth
5. Enemy types + counterpicks
6. Stage conditions
7. Sprint vs Siege mode
8. Item wear system

### Phase C — Strategic layer
9. Pre-run momentum card
10. Party split at stage 2

---

## Key Files

```
lib/registry.ts      — Add COMBO_DEFS, EVENT_POOL, MOMENTUM_CARDS, enemy type defs
lib/types.ts         — Add EnemyType, StageCondition, RunMode, wear field
lib/encounters.ts    — Add enemyType, conditions, getThreatLevel(), scaleEncounter()
lib/combat-engine.ts — Apply type modifiers, wear penalty, combo bonuses, conditions
hooks/useGame.ts     — startRun(mode), daily event roll, momentum card logic
page.tsx             — Telegraph overlay, event card display, sprint/siege toggle
components/
  PrepareRunScreen   — Sprint/Siege toggle, party split prompt, momentum card
  CombatResolution   — Show enemy type, active conditions, combo that fired
```
