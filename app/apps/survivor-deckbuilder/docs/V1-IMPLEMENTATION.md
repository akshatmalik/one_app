# V1 Implementation Plan: Run Flow

## Goal
Build a complete, playable run from start to finish. Player selects 2 survivors + items, plays through 3 encounters, combat resolves, returns home with loot.

## Phases

### Phase 1: Encounter & Combat Engine (HIGH PRIORITY)

**Files to create/modify:**
- `lib/encounters.ts` — Define 9 starter encounters (3 per stage, 3 stages)
- `lib/combat-engine.ts` — Damage calculation, combat resolution logic
- Modify `lib/types.ts` — Add `StageResult`, expand `Encounter`

**What to build:**

1. **Encounter Generation**
   ```typescript
   // lib/encounters.ts
   interface Encounter {
     id: string
     stage: 1 | 2 | 3
     name: string
     description: string
     enemies: Enemy[]
     difficulty: 'easy' | 'medium' | 'hard'
     rewardLoot: Loot[]
   }

   const STAGE_1_ENCOUNTERS = [
     {
       id: 'pharmacy-zombies',
       stage: 1,
       name: 'Pharmacy Raid',
       description: '3 shambling zombies between you and the medicine cabinet',
       enemies: [
         { name: 'Zombie 1', health: 20, maxHealth: 20, damage: 10, defense: 0 },
         { name: 'Zombie 2', health: 20, maxHealth: 20, damage: 10, defense: 0 },
         { name: 'Zombie 3', health: 20, maxHealth: 20, damage: 10, defense: 0 },
       ],
       difficulty: 'easy',
       rewardLoot: [
         { id: 'first-aid', name: 'First Aid Kit', type: 'consumable' }
       ]
     },
     // ... more stage 1 encounters
   ]

   const STAGE_2_ENCOUNTERS = [
     // Medium difficulty, 40-50 HP total
   ]

   const STAGE_3_ENCOUNTERS = [
     // Hard difficulty, 60-80 HP total
   ]

   export function getEncounterByStage(stage: 1 | 2 | 3): Encounter {
     // Pick randomly or sequentially
   }
   ```

2. **Combat Resolution Engine**
   ```typescript
   // lib/combat-engine.ts
   interface CombatAction {
     cardsPlayed: Card[]
     targetEnemy?: Enemy
   }

   interface CombatResult {
     damageDealt: number
     damageTaken: number
     enemiesAfter: Enemy[]
     survivorsAfter: CardInstance[]
     result: 'player-victory' | 'player-loss'
   }

   function calculateDamageDealt(
     cards: Card[],
     survivors: CardInstance[],
     enemies: Enemy[]
   ): number {
     let totalDamage = 0

     cards.forEach(card => {
       if (card.type === 'survivor') {
         const survivor = survivors.find(s => s.id === card.id)
         const baseDamage = 25
         const attributeBonus = baseDamage * (card.attributes.combat / 100)
         totalDamage += baseDamage + attributeBonus
       } else if (card.type === 'item' && card.combatBonus) {
         totalDamage += card.combatBonus
       }
     })

     // Add synergy bonuses
     const synergies = detectSynergies(cards)
     synergies.forEach(syn => {
       totalDamage += syn.bonus
     })

     return Math.round(totalDamage)
   }

   function calculateDamageTaken(
     enemies: Enemy[],
     playerDefense: number // %
   ): number {
     const totalEnemyDamage = enemies.reduce((sum, e) => sum + e.damage, 0)
     const defenseMultiplier = 1 - (playerDefense / 100)
     return Math.round(totalEnemyDamage * defenseMultiplier)
   }

   function resolveCombat(
     cardsPlayed: Card[],
     encounter: Encounter,
     survivors: CardInstance[],
     hand: Card[]
   ): CombatResult {
     // 1. Calculate damage dealt
     const damageDealt = calculateDamageDealt(cardsPlayed, survivors, encounter.enemies)

     // 2. Apply damage to enemies
     const enemiesAfterDamage = encounter.enemies.map(e => ({
       ...e,
       health: Math.max(0, e.health - damageDealt)
     }))

     // 3. Check if all enemies defeated
     const allDefeated = enemiesAfterDamage.every(e => e.health <= 0)

     if (allDefeated) {
       return {
         damageDealt,
         damageTaken: 0,
         enemiesAfter: enemiesAfterDamage,
         survivorsAfter: survivors,
         result: 'player-victory'
       }
     }

     // 4. Calculate damage taken
     const damageTaken = calculateDamageTaken(enemiesAfterDamage, getPlayerDefense(cardsPlayed))

     // 5. Apply damage to survivors
     const survivorsAfterDamage = applyDamageToSurvivors(survivors, damageTaken)

     // 6. Check if player lost
     const allSurvivorsDead = survivorsAfterDamage.every(s => s.health <= 0)

     return {
       damageDealt,
       damageTaken,
       enemiesAfter: enemiesAfterDamage,
       survivorsAfter: survivorsAfterDamage,
       result: allSurvivorsDead ? 'player-loss' : 'combat-continues'
     }
   }
   ```

3. **Synergy Detection**
   ```typescript
   // lib/synergies.ts (new file)
   interface Synergy {
     cards: string[] // card IDs
     bonus: number
     description: string
   }

   const SYNERGY_DATABASE = [
     { cards: ['marcus', 'rifle'], bonus: 10, description: 'Fighter + Rifle' },
     { cards: ['sarah', 'medical-kit'], bonus: 20, description: 'Healer + Medical Kit' },
     { cards: ['james', 'night-vision'], bonus: 25, description: 'Scout + Night Vision' },
     // ... more synergies from DESIGN.md
   ]

   export function detectSynergies(cards: Card[]): Synergy[] {
     const cardIds = cards.map(c => c.id)
     return SYNERGY_DATABASE.filter(syn =>
       syn.cards.every(id => cardIds.includes(id))
     )
   }
   ```

---

### Phase 2: Run State Machine & Flow (HIGH PRIORITY)

**Files to modify:**
- `hooks/useGame.ts` — Expand to handle run phases
- `lib/types.ts` — Add `RunPhase` enum

**What to build:**

1. **Run Phase Management**
   ```typescript
   // In lib/types.ts
   type RunPhase =
     | 'preparation'      // Selecting deck
     | 'stage_start'       // Show encounter description
     | 'hand_draw'         // Draw 2 cards
     | 'card_selection'    // Player chooses cards
     | 'combat_resolution' // Calculate damage
     | 'stage_complete'    // Victory or loss
     | 'run_complete'      // All 3 stages done
   ```

2. **Game State Hook Expansion**
   ```typescript
   // In hooks/useGame.ts
   export function useGame() {
     const [runPhase, setRunPhase] = useState<RunPhase>('preparation')
     const [currentStageIndex, setCurrentStageIndex] = useState(0)
     const [currentHand, setCurrentHand] = useState<Card[]>([])
     const [stageHistory, setStageHistory] = useState<StageResult[]>([])

     const startRun = (selectedCards: Card[]) => {
       // Create run object
       // Initialize stage 0
       setRunPhase('stage_start')
     }

     const drawHandForStage = () => {
       const hand = drawNCards(availableCards, 2)
       setCurrentHand(hand)
       setRunPhase('card_selection')
     }

     const playCards = (selectedCards: Card[]) => {
       // Trigger combat resolution
       setRunPhase('combat_resolution')
     }

     const resolveCombat = (selectedCards: Card[]) => {
       const result = combatEngine.resolveCombat(...)
       recordStage(result)

       if (result === 'player-loss') {
         endRunAsFail()
       } else if (currentStageIndex === 2) {
         endRunAsSuccess()
       } else {
         advanceToNextStage()
       }
     }

     return {
       runPhase,
       currentRun,
       currentStageIndex,
       currentHand,
       startRun,
       drawHandForStage,
       playCards,
       resolveCombat,
       // ...
     }
   }
   ```

3. **Deck Exhaustion Tracking**
   ```typescript
   // Within run, track which cards have been played
   function getAvailableCardsForNextDraw(
     deck: Card[],
     playedCards: Card[]
   ): Card[] {
     return deck.filter(card => !playedCards.includes(card))
   }

   function checkDeckEmpty(availableCards: Card[]): boolean {
     return availableCards.length === 0
   }
   ```

---

### Phase 3: Run Screen UI (HIGH PRIORITY)

**Files to create:**
- `components/RunScreen.tsx` — Master container for run phases
- `components/EncounterScreen.tsx` — Show enemy + description
- `components/HandScreen.tsx` — Draw 2 cards, player picks 1-2
- `components/CombatResolutionScreen.tsx` — Show damage calc
- `components/StageCompleteScreen.tsx` — Victory/loss, loot
- `components/RunCompleteScreen.tsx` — Expedition summary

**Screen Structure (Phone-First):**

```typescript
// components/RunScreen.tsx
export function RunScreen({ currentRun }: { currentRun: Run }) {
  switch (currentRun.phase) {
    case 'stage_start':
      return <EncounterScreen encounter={encounter} />
    case 'hand_draw':
      return <HandScreen hand={hand} onSelectCards={handleSelectCards} />
    case 'combat_resolution':
      return <CombatResolutionScreen result={combatResult} />
    case 'stage_complete':
      return <StageCompleteScreen onContinue={handleContinue} />
    case 'run_complete':
      return <RunCompleteScreen onReturnHome={handleReturnHome} />
  }
}
```

**UI Examples:**

1. **EncounterScreen**
   ```typescript
   // Show: Stage X/3, Encounter description, Enemy stat block
   // Button: "ENTER COMBAT"
   ```

2. **HandScreen**
   ```typescript
   // Show: Top half = enemies + current health
   //       Bottom half = 2 cards in hand, tappable
   // Logic: Tap 1 card → play it, proceed to combat
   //        Tap 2 cards → if synergy, highlight bonus
   //        Can't tap more than 2
   // Button: "RESOLVE" (disabled if no cards selected)
   ```

3. **CombatResolutionScreen**
   ```typescript
   // Show: Damage calculation breakdown
   //       - Survivor base damage + % bonus
   //       - Item bonus
   //       - Synergy bonus
   //       - Subtotal damage dealt
   //       ---
   //       - Enemy counter-damage
   //       - Your defense reduction
   //       - Net damage taken
   //       ---
   //       - New survivor HP
   //       - New enemy HP
   //
   // Button: "CONTINUE"
   ```

4. **StageCompleteScreen**
   ```typescript
   // If victory:
   //   - Stage X complete!
   //   - Loot found: [item cards]
   //   - Survivor status: [HP bars]
   //   - Cards exhausted: [list with recovery times]
   //   - Button: NEXT STAGE (or RUN COMPLETE if stage 3)
   //
   // If defeat:
   //   - Stage X failed!
   //   - Survivors defeated: [who died]
   //   - Loot lost: [what you didn't get]
   //   - Button: RETURN HOME (run ends)
   ```

5. **RunCompleteScreen**
   ```typescript
   // Show: EXPEDITION COMPLETE!
   //       Stages won: 3/3
   //       Survivors: [status + HP]
   //       Total loot: [list]
   //       Cards to recover: [with timers]
   //       Button: RETURN TO HOME BASE
   ```

---

### Phase 4: Home Base Prep UI (MEDIUM PRIORITY)

**Files to modify:**
- `components/PrepareRunScreen.tsx` — Deck selection
- `page.tsx` — Route to prep screen

**What to build:**

1. **Deck Selection Screen**
   ```typescript
   // Show current survivors + items + recovery times
   // Click "PREPARE EXPEDITION"
   // Show checkboxes for survivors (pick exactly 2)
   // Show checkboxes for items (pick 2-3)
   // Validate: 5-7 cards total, exactly 2 survivors
   // Button: LAUNCH (disabled if invalid)
   ```

2. **Validation**
   ```typescript
   function validateDeck(selected: Card[]): { valid: boolean; error?: string } {
     const survivors = selected.filter(c => c.type === 'survivor')
     const items = selected.filter(c => c.type !== 'survivor')
     const total = selected.length

     if (survivors.length !== 2) return { valid: false, error: 'Need exactly 2 survivors' }
     if (items.length < 2 || items.length > 3) return { valid: false, error: 'Need 2-3 items/actions' }
     if (total < 5 || total > 7) return { valid: false, error: 'Deck must be 5-7 cards' }
     if (selected.some(c => c.status === 'exhausted')) {
       return { valid: false, error: 'Some cards still recovering' }
     }

     return { valid: true }
   }
   ```

---

### Phase 5: Persistence (MEDIUM PRIORITY)

**Files to modify:**
- `lib/storage.ts` — Implement run save/load
- `hooks/useGame.ts` — Call storage methods

**What to build:**

1. **Save Run State**
   ```typescript
   // After each stage, auto-save
   await repository.updateRun(runId, {
     currentStage: nextStage,
     stageHistory: [...stageHistory, newStageResult],
     currentHand: []
   })
   ```

2. **Save Complete Run**
   ```typescript
   // At end of run, mark as complete + exhaustion
   await repository.completeRun(runId)

   // Mark cards as exhausted + set recovery timers
   selectedCards.forEach(card => {
     await repository.setRecoveryTime(card.id, getRecoveryDays(card))
   })
   ```

3. **Load Game State on App Start**
   ```typescript
   // In page.tsx or useGame hook
   const gameState = await repository.getGameState()

   if (gameState.currentRun) {
     // Resume run
   } else {
     // Show home base prep
   }
   ```

---

## Build Order (Recommendation)

1. **Encounters + Combat Math** (Phase 1) — Without this, nothing works
2. **Run State Machine** (Phase 2) — Flow control for screens
3. **Run Screens** (Phase 3) — The actual UI players see
4. **Persistence** (Phase 5) — Save progress
5. **Home Prep** (Phase 4) — Pretty it up last

**Why this order:**
- Phases 1-2 are logic, no UI needed initially. Test with console logs.
- Once logic works, add screens.
- Persistence is straightforward, do last.

---

## Testing Checklist

- [ ] Can start a run with valid deck
- [ ] Draw 2 cards per encounter
- [ ] Play 1-2 cards and resolve combat
- [ ] Damage calculated correctly (no synergy, then with synergy)
- [ ] Survivors and enemies take damage
- [ ] Victory condition: all enemies dead
- [ ] Loss condition: both survivors dead OR deck runs out
- [ ] Stage progression: 1 → 2 → 3 → run complete
- [ ] Loot awarded on victory
- [ ] Cards marked as exhausted after run
- [ ] Recovery timers set correctly
- [ ] Can't start next run with exhausted cards
- [ ] Save/load works across page refresh
- [ ] Mobile: all screens fit on phone without scrolling (4-5 cards max on screen)

---

**Version:** 1.0
**Status:** Ready to build
