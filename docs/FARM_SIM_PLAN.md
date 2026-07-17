# Farm Sim — Build Plan

**Working title:** Untitled Farming Optimization Sim
**Status:** Approved direction, pre-build
**Last updated:** 2026-07-14

This is the full specification: data model, every formula, the day-resolution algorithm, the complete action catalog, balanced economy tables (with the math shown), UI spec, and phase-by-phase build tasks with acceptance criteria. Every tunable number lives in one place (`lib/balance.ts`) and is marked 🔧 where it's a guess that playtesting will move.

---

## 0. Locked Decisions

| Decision | Choice | Consequence |
|----------|--------|-------------|
| **Time model** | Turn-based days. Act during the day (AP-limited), press **End Day**, night resolves. | No movement, no character, no pathing. The game is decisions + resolution. All simulation is pure functions. |
| **Platform** | Mobile portrait (390×844 reference), HTML5. | Fixed HUD top, scrollable grid middle, pinned action area bottom (thumb zone) — same pillars as `docs/godot-tutorial`. |
| **Tech** | React prototype as a one_app mini-app: `app/apps/farm-sim/`. | Hub card, localStorage saves (repository pattern), Vercel preview = playable phone build every push. |
| **M1 systems** | Crops + soil, seasons + weather + forecast, water network, market fluctuation, AP economy, expansion. | Built in 6 phases, each independently playable. Water network (Phase 3) is the pre-agreed cut line if scope slips. |
| **Out of M1** | Animals, disease, processing chains, contracts, workers, winter, greenhouses, sprinklers, spoilage, generated pixel art. | All specified in M2 section. M1 ships with emoji/CSS art on purpose. |

**Why the React prototype isn't throwaway:** the engine is `applyAction(state, action) → state` and `endDay(state) → { state, recap }` — pure, deterministic, seeded, zero React/browser imports. If the game is fun, those functions port to GDScript near line-for-line and the TS engine becomes the test oracle (same seed + action log ⇒ same final state in both engines). Only rendering gets rewritten.

---

## 1. Game Constants

Everything below is the initial contents of `lib/balance.ts`. 🔧 = expected to move during tuning.

```ts
// ── World ──────────────────────────────────────────────
export const GRID_SIZE = 12;                 // 12×12 world grid
export const START_PLOT = { r0: 3, c0: 3, r1: 8, c1: 8 }; // starting 6×6 (inclusive)
export const RESERVOIR_POS = { r: 3, c: 5 }; // pre-placed inside start plot, north edge
export const SEASON_LENGTH = 28;             // days per season
export const SEASONS = ['Spring', 'Summer', 'Fall'] as const; // Winter is M2

// ── Player ─────────────────────────────────────────────
export const START_GOLD = 120;               // 🔧
export const BASE_AP = 12;                   // 🔧 the central difficulty knob
export const START_SEEDS = { wheat: 3 };     // onboarding gift

// ── Action costs (AP) ──────────────────────────────────
export const AP_COST = {
  till: 1, plant: 1, water: 1, harvest: 1,
  buildChannel: 2, demolish: 1, digWell: 3,
  marketTrip: 1,        // first sell of the day only; later sells same day are free
} as const;

// ── Gold costs ─────────────────────────────────────────
export const GOLD_COST = {
  channel: 15,          // 🔧
  well: 100,
  expandRing1: 40,      // tiles orthogonally adjacent to start plot
  expandRing2: 80,
  expandRing3: 150,     // corners / outermost
} as const;
export const MAX_WELLS = 3;

// ── Water ──────────────────────────────────────────────
export const RESERVOIR_CAP = 200;            // 🔧
export const RESERVOIR_START = 120;
export const RAIN_RESERVOIR_GAIN = 100;
export const WELL_DAILY_YIELD = 30;
export const MANUAL_WATER_MOISTURE = 40;     // moisture added per water action
export const MANUAL_WATER_DRAW = 10;         // reservoir cost per water action
export const IRRIGATION_TARGET = 70;         // channel-adjacent tiles topped to this at dawn
export const TILLED_START_MOISTURE = 40;
export const RAIN_TILE_GAIN = 50;            // rain: moisture = min(100, m + 50)
export const EVAPORATION = { sunny: 10, cloudy: 5, rain: 0, storm: 0, heatwave: 25, frost: 5 };

// ── Soil ───────────────────────────────────────────────
export const START_NITROGEN = 70;
export const FALLOW_N_REGEN = 5;             // tilled, unplanted
export const GRASS_N_REGEN = 8;
export const LOW_N_THRESHOLD = 30;           // below → yield ×0.75
export const CRITICAL_N_THRESHOLD = 10;      // below → yield ×0.5
export const BEAN_SELF_N = 4;                // beans add to own tile per day
export const BEAN_NEIGHBOR_N = 2;            // beans add to orthogonal neighbors per day

// ── Crops ── (full table in §3)

// ── Weather ────────────────────────────────────────────
export const FORECAST_ACCURACY = [0.9, 0.7, 0.55]; // day+1, +2, +3
export const STORM_DESTROY_CHANCE = 0.15;    // per MATURE crop, per storm

// ── Market ─────────────────────────────────────────────
export const SUPPLY_HIT_PER_UNIT = 0.003;    // selling q units: supply ×= (1 − 0.003·q)
export const SUPPLY_FLOOR = 0.5;
export const SUPPLY_RECOVERY = 0.15;         // supply += (1 − supply) × 0.15 per day
export const NOISE_STEP = 0.04;              // daily random walk ± this
export const NOISE_MIN = 0.7;
export const NOISE_MAX = 1.4;

// ── Upgrades (one-time, bought at market) ──────────────
export const UPGRADES = {
  bigCan:  { cost: 80,  effect: 'water action gives +60 moisture instead of +40' },
  cart:    { cost: 60,  effect: 'market trips cost 0 AP' },
  coffee:  { cost: 120, effect: 'permanent +2 AP/day' },
} as const;

// ── Death & stress ─────────────────────────────────────
export const STRESS_DAYS_TO_DIE = 2;         // consecutive dry days kills a crop
```

---

## 2. Data Model (`lib/types.ts`, complete)

```ts
export type Season = 'Spring' | 'Summer' | 'Fall';
export type Weather = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'heatwave' | 'frost';
export type CropId = 'wheat' | 'potato' | 'beans' | 'tomato' | 'berries' | 'pumpkin';
export type TileKind = 'locked' | 'grass' | 'tilled' | 'channel' | 'reservoir' | 'well';
export type UpgradeId = 'bigCan' | 'cart' | 'coffee';

export interface CropDef {
  id: CropId;
  name: string;
  emoji: string;                  // M1 art
  seasons: Season[];              // plantable in
  growDays: number;               // days to mature (stress days don't count)
  waterNeed: number;              // moisture consumed per night
  nitrogenUse: number;            // N consumed per growth night (negative = restores)
  seedCost: number;
  yieldUnits: number;             // units per harvest
  basePrice: number;              // per unit
  frostHardy: boolean;
  regrowDays?: number;            // berries: re-mature this many days after harvest
  heatLover?: boolean;            // tomato: heatwave + watered = 2 growth days
}

export interface Crop {
  cropId: CropId;
  growthDays: number;             // completed growth nights
  mature: boolean;
  stressDays: number;             // consecutive nights below waterNeed
  regrowCounter?: number;         // berries only
}

export interface Tile {
  kind: TileKind;
  moisture: number;               // 0–100, only meaningful for tilled
  nitrogen: number;               // 0–100
  crop: Crop | null;
  irrigated: boolean;             // derived each dawn (connected-channel adjacency), cached for UI
}

export interface MarketRow {
  supply: number;                 // pressure multiplier, 0.5–1.0
  noise: number;                  // random-walk multiplier, 0.7–1.4
  history: number[];              // last 7 displayed prices, for sparklines
}

export interface RecapEvent {
  kind: 'weatherDrama' | 'cropDied' | 'cropMatured' | 'stormLoss' | 'frostLoss'
      | 'reservoirShort' | 'priceMove' | 'seasonChange' | 'harvestReady';
  text: string;                   // human sentence, built by the engine
  severity: 'info' | 'good' | 'bad';
}

export interface DayRecap {
  day: number;
  weather: Weather;
  events: RecapEvent[];
  goldDelta: number;
  waterDrawn: number;
}

export interface GameState {
  version: 1;
  seed: number;                   // master seed; per-system streams derived from it
  day: number;                    // 1-based, global (day 29 = Summer 1)
  gold: number;
  ap: number;                     // remaining today
  apMax: number;                  // BASE_AP + upgrades
  tiles: Tile[];                  // GRID_SIZE² row-major
  reservoir: number;
  wells: number;
  inventory: Record<CropId, number>;   // harvested units held
  seeds: Record<CropId, number>;
  market: Record<CropId, MarketRow>;
  weatherTruth: Weather[];        // pre-rolled for current season (28 entries)
  forecast: (Weather | null)[];   // what the player was SHOWN for day+1..+3 (fixed once shown)
  marketVisitedToday: boolean;    // first sell of the day costs 1 AP
  upgrades: UpgradeId[];
  lastRecap: DayRecap | null;
  tutorialStep: number;           // onboarding progress, -1 when done
}

export type PlayerAction =
  | { type: 'till'; idx: number }
  | { type: 'plant'; idx: number; crop: CropId }
  | { type: 'water'; idx: number }
  | { type: 'harvest'; idx: number }
  | { type: 'buildChannel'; idx: number }
  | { type: 'demolish'; idx: number }        // channel/well → grass, no refund
  | { type: 'digWell'; idx: number }
  | { type: 'expand'; idx: number }
  | { type: 'buySeeds'; crop: CropId; qty: number }
  | { type: 'sell'; crop: CropId; qty: number }
  | { type: 'buyUpgrade'; upgrade: UpgradeId };

export interface ActionResult {
  ok: boolean;
  state: GameState;               // unchanged when !ok
  error?: string;                 // 'Not enough AP', 'Tomatoes can't be planted in Fall', …
}

export interface FarmSaveRepository {
  load(slot: number): Promise<GameState | null>;
  save(slot: number, state: GameState): Promise<void>;
  listSlots(): Promise<{ slot: number; day: number; gold: number; savedAt: string }[]>;
  delete(slot: number): Promise<void>;
}
```

Engine surface (all pure, all in `lib/engine/`):

```ts
newGame(seed: number): GameState
applyAction(state: GameState, action: PlayerAction): ActionResult   // player phase, immediate
endDay(state: GameState): { state: GameState; recap: DayRecap }     // night resolution
getPrice(state: GameState, crop: CropId): number                    // display + sell math share this
isIrrigated(tiles: Tile[], idx: number): boolean                    // flood-fill, memoized per dawn
validActions(state: GameState, idx: number): PlayerAction['type'][] // drives the tile sheet
```

Actions apply **immediately** during the player phase (better UX — you watch moisture change), not as a queued plan. Determinism is preserved because player-phase actions consume no randomness; all RNG happens inside `endDay`.

### RNG discipline

One master seed. Per-system, per-day streams derived as `mulberry32(hash(seed, day, systemId))` with `systemId ∈ {weather, forecast, storm, market}`. This means: your actions can never shift the weather; two players with the same seed get the same season; replaying an action log reproduces a bug exactly.

---

## 3. Crops — Full Table & Economy Math

### Definitions

| Crop | Emoji | Seasons | Grow | Water/night | N/night | Seed | Yield | Base $/unit | Hardy | Special |
|------|-------|---------|------|-------------|---------|------|-------|-------------|-------|---------|
| Wheat | 🌾 | Spr, Sum, Fall | 4 | 10 | 5 | 5 | 3 | 5 | no | The safe filler |
| Potato | 🥔 | Spr, Fall | 5 | 15 | 8 | 8 | 4 | 6 | **yes** | Only frost-proof crop |
| Beans | 🫘 | Spr, Sum | 5 | 15 | **+4 self, +2 neighbors** | 10 | 4 | 5 | no | Soil engine |
| Tomato | 🍅 | Sum | 7 | 25 | 10 | 15 | 6 | 10 | no | Heatwave + watered ⇒ counts 2 growth days |
| Berries | 🫐 | Spr, Sum | 6 | 15 | 4 | 25 | 3/pick | 8 | no | Re-matures every 3 days until season ends |
| Pumpkin | 🎃 | Fall | 9 | 20 | 12 | 20 | 1 | 85 | no | One giant payday |

### Profit check (fully watered, good soil, base prices)

| Crop | Revenue | Profit | Days | **Profit/tile/day** | Risk profile |
|------|---------|--------|------|---------------------|--------------|
| Wheat | 3×5 = 15 | 10 | 4 | **2.5** | none |
| Potato | 4×6 = 24 | 16 | 5 | **3.2** | none (frost-proof) |
| Beans | 4×5 = 20 | 10 | 5 | **2.0** + soil value | none |
| Tomato | 6×10 = 60 | 45 | 7 | **6.4** | frost-killable, thirsty (25/night) |
| Berries | ~6 picks×3×8 = 144 (planted Spring day 1) | 119 | 27 | **~4.4**, ramps | high upfront, season-long lock-in |
| Pumpkin | 1×85 = 85 | 65 | 9 | **7.2** | fall-only, 9-day lock-in, storm-exposed while mature |

The ladder is intentional: safe crops earn 2–3/day, risky/thirsty/locked-in crops earn 4–7/day. Water and weather are the price of the good numbers. 🔧 All six rows are one-line edits in `data/crops.ts`.

### Growth & death rules (exact)

Resolved per planted tile each night, in this order:

1. **Consumption.** If `moisture ≥ waterNeed`: `moisture −= waterNeed`, `stressDays = 0`, `growthDays += 1` (tomato in a heatwave with water: `+= 2`). Else: `stressDays += 1`, no growth, no consumption.
2. **Death.** `stressDays ≥ 2` → crop dies. Tile stays tilled, nitrogen unchanged. Recap event (`bad`).
3. **Maturity.** `growthDays ≥ growDays` → `mature = true`. Recap event (`good`). Mature crops stop consuming water and nitrogen (they're done — harvest them) but are storm-vulnerable.
4. **Nitrogen.** Growing (non-mature) crop: `nitrogen −= nitrogenUse` (beans: `+= 4`, and each orthogonal neighbor `+= 2`). Clamp 0–100.
5. **Berries regrow.** Harvested berry tile: `regrowCounter −= 1`; at 0 → `mature = true` again. Berries die at season end.

**Yield at harvest:** `units = yieldUnits`, then `×0.75` if tile nitrogen < 30, `×0.5` if < 10 (floor, min 1). Nitrogen is read *at harvest time* — planting into bad soil and letting beans repair it mid-growth genuinely helps.

**Planting rules:** tile must be `tilled` and empty; crop must list the current season; seeds must be in inventory (buy first — buying is instant and free of AP, it's mail-order). Planting out-of-season is a validation error with a clear message, not a hidden failure.

---

## 4. Weather & Forecast — Exact Mechanics

### Season tables (roll per day, seeded stream `weather`)

| Weather | Spring | Summer | Fall | Night effects |
|---------|--------|--------|------|---------------|
| sunny | 35% | 40% | 35% | evaporation 10 |
| cloudy | 10% | 10% | 10% | evaporation 5 |
| rain | 30% | 15% | 25% | all unlocked tiles `moisture = min(100, m+50)`; reservoir `+100`; evap 0 |
| storm | 10% | 10% | 10% | rain effects, **then each mature crop destroyed with p=0.15** (stream `storm`) |
| heatwave | 5% | 25% | 5% | evaporation 25; tomato bonus |
| frost | 10% | 0% | 15% | kills every non-hardy planted crop (any stage); evap 5 |

Storm hitting only **mature** crops is deliberate: it creates the "harvest before the storm" scramble instead of random punishment mid-growth.

### Truth & forecast

- At season start, pre-roll all 28 days into `weatherTruth` (stream `weather`).
- The forecast shown for a given future day is generated **once** (when it first becomes visible at day−3) and never changes — no flickering, and the lie is committed: with probability `FORECAST_ACCURACY[k]` show the truth, else show a decoy sampled from the season table excluding the truth (stream `forecast`).
- UI shows 3 chips: `🌧 90%` style — the *claimed* condition plus its reliability tier, so the player learns "the 3-day slot is a coin flip."

This is the gamble engine: *"frost showing at 70% for tomorrow — harvest the half-grown tomatoes for nothing, hand-water everything else, or trust it's a lie?"*

---

## 5. Water Network — Exact Mechanics

- **Reservoir** is a fixed tile at (3,5) (north edge of the starting plot). Capacity 200, starts 120.
- **Inflows:** rain +100, storm +100, each well +30/night (wells are grid tiles you place; max 3).
- **Manual watering:** 1 AP + 10 reservoir → +40 moisture (+60 with Big Can) on one tile. If reservoir < 10, the action is invalid.
- **Channels:** cost 2 AP + 15g, occupy a tile (that tile can't grow anything — real opportunity cost). A tilled tile is **irrigated** iff it is orthogonally adjacent to a channel that is flood-fill-connected (orthogonal) to the reservoir tile. Disconnected channel segments do nothing and render visually dry.
- **Dawn irrigation (endDay step 4):** every irrigated tilled tile is topped up to `moisture = 70`, drawing `70 − current` from the reservoir. Tiles process in **reading order (row-major)**; when the reservoir runs dry mid-pass, remaining tiles get nothing and a `reservoirShort` recap event fires listing how many went dry. (Player-set priorities are an M2 nicety; row-major is legible and forces layout thought: put the thirsty stuff upstream.)

### Does the water economy actually bind? (math)

A tomato tile under irrigation consumes 25 (crop) + 10 (sunny evap) = 35/night from the top-up → **~35 reservoir/night per tomato tile** (50 in a heatwave). Summer rain is only 15% ⇒ expected rain inflow ≈ 15/night. One well = 30/night.

- 3 tomatoes ≈ 105/night vs. well+rain ≈ 45/night → reservoir drains ~60/night → dry in 2–3 days. **You cannot lazily monocrop tomatoes.**
- Sustainable summer with 2 wells (75/night inflow): ~2 tomatoes + several wheat/beans, or 3 tomatoes with manual triage on dry days. That's the intended pressure. 🔧 tune via `WELL_DAILY_YIELD` and tomato `waterNeed`.

Unwatered wheat check: tilled tile starts at 40 → night 1: consume 10 → 30, evap → 20 → night 2: → 10 → 5 → night 3: 5 < 10 ⇒ stress. So even wheat needs ~1 watering per cycle without rain. Hand-watering works at 6–8 tiles and collapses at 15+ — which is exactly when channels (15g, cheap in gold, expensive in tiles and AP) become the obvious buy. The squeeze is AP, not gold.

---

## 6. Market — Exact Mechanics

```
price(crop) = basePrice × seasonMod(crop, season) × supply(crop) × noise(crop)
```
rounded to 0.1g for display; sells use the same function (no hidden spread).

### Season modifiers (`data/crops.ts`)

| Crop | Spring | Summer | Fall | Logic |
|------|--------|--------|------|-------|
| Wheat | 1.0 | 1.0 | 1.0 | commodity, flat |
| Potato | 0.9 | 1.15 | 0.9 | glut in its grow seasons, scarce in summer |
| Beans | 0.9 | 0.9 | 1.2 | |
| Tomato | 1.1 | 0.9 | 1.25 | fall tomatoes are gold — if you can keep them alive to sell |
| Berries | 0.9 | 0.9 | 1.3 | |
| Pumpkin | 1.3 | 1.2 | 0.9 | hold your pumpkins til spring… if you dare wait |

Inventory persists across seasons with **no spoilage in M1** (spoilage is an M2 knob) — so "warehouse and wait" is a legitimate strategy whose cost is cash-flow, not rot.

### Supply pressure & noise

- Sell `q` units ⇒ `supply ×= (1 − 0.003·q)`, floored at 0.5. Selling 60 wheat at once: ×0.83 immediately — you watch the price fall between confirm taps.
- Nightly: `supply += (1 − supply) × 0.15` (≈ half-recovered in 4 days).
- Nightly noise walk: `noise = clamp(noise + U(−0.04, +0.04), 0.7, 1.4)` (stream `market`). Prices wiggle ±4%/day with occasional 20–30% multi-day drifts — enough to make the 7-day sparkline worth reading, not enough to be a stock-trading game.

**Market AP:** the first `sell` of a day costs 1 AP (a trip to town); further sells that day are free; `buySeeds` and `buyUpgrade` are always AP-free. The Cart upgrade (60g) makes trips free.

---

## 7. The AP Economy — Why 12 Is the Number

Day-1 opener (12 AP): till 4 + plant 4 (wheat ×3 gift + 1 bought) + water 4 = 12. Tight but complete — the first day teaches the whole loop.

Mid-game stress test, day ~12, 16 planted tiles, no irrigation: 16 waters = 16 AP > 12. **Impossible.** With 6 channel tiles serving 12 crop tiles: 4 manual waters + 4 harvests + 2 plants + market trip = 11 AP. Channels don't just save water — they buy back a third of your day. That's the intended lesson, arriving around day 8–12 organically.

Upgrades extend the curve: Coffee (+2 AP) ≈ two more tended tiles; Cart ≈ one; Big Can halves watering frequency. Combined they support roughly a 25–30-tile late-M1 farm — matching the affordable expansion pace (§8).

---

## 8. Expansion & Target Difficulty Curve

Expansion: tap a locked tile adjacent to your unlocked area → buy it (no AP). Ring 1 = 40g, ring 2 = 80g, ring 3/corners = 150g.

Balance targets — checked by the sim harness (§12), not vibes:

| Checkpoint | Target state 🔧 |
|------------|----------------|
| Day 4 | First wheat harvest, ~140–160g, player has met the forecast |
| Day 8–12 | AP squeeze felt; first 2–4 channels built; maybe 1 well |
| Day 28 (Spring ends) | 400–600g, ~14–18 productive tiles, 1–2 expansions, berries paying out |
| Day 29–56 (Summer) | Tomato/water crisis is the season's boss fight; 2 wells; heatwave stories |
| Day 57+ (Fall) | Pumpkin commitment vs frost roulette; first "hold inventory for spring prices" decision |
| Day 84 (year end / fun test) | 1,500–2,500g, most of ring 1–2 unlocked, all upgrades owned |

---

## 9. `endDay` — Resolution Algorithm (exact order)

```
endDay(state):
 1. weather = weatherTruth[dayOfSeason]
 2. FROST:  if frost → kill all non-hardy planted crops (recap: frostLoss, count + worst casualty)
 3. RAIN/STORM: if rain|storm → tiles m=min(100,m+50); reservoir += 100
    if storm → each MATURE crop: destroyed with p=0.15 (stream 'storm') (recap: stormLoss)
 4. WELLS:  reservoir = min(cap, reservoir + 30·wells)
 5. IRRIGATION: recompute flood-fill from reservoir; for each irrigated tilled tile
    in row-major order: draw (70 − m) from reservoir, top up to 70; on dry
    reservoir mark remaining as shorted (recap: reservoirShort)
 6. CROPS:  per planted tile: consume → stress/death → growth → maturity →
    nitrogen (incl. bean adjacency) → berry regrow   [rules in §3]
 7. EVAPORATION: all tilled tiles m = max(0, m − EVAPORATION[weather])
 8. SOIL REGEN: fallow tilled +5 N, grass +8 N (cap 100)
 9. MARKET: per crop: supply recovery; noise walk (stream 'market');
    push today's price into history (keep 7)
10. ADVANCE: day += 1; if new season → re-roll weatherTruth, clear dead
    out-of-season berries, recap seasonChange; extend forecast window
    (generate day+3 chip, committed); ap = apMax; marketVisitedToday = false
11. RECAP: assemble DayRecap — ordered worst-news-first:
    frost/storm losses → deaths → reservoir shorts → maturities/harvest-ready →
    price moves ≥ 15% since yesterday → weather flavor line
```

Steps 2–3 before irrigation, irrigation before consumption, evaporation after consumption — this exact ordering is what makes "rain saves you the morning's water" and "heatwave hits even watered crops" true. Encode it in a comment block at the top of `resolveDay.ts` and never reorder casually.

---

## 10. UI Specification (portrait 390×844)

```
┌──────────────────────────────────┐
│ Spring · Day 12   💰 342   ⚡ 7/12 │ ← HudBar (fixed, 48px)
│ today ☀️ │ 🌧 90% · 🌧 70% · ❄️ 55% │ ← ForecastStrip (fixed, 36px)
├──────────────────────────────────┤
│                                  │
│         FarmGrid                 │ ← vertical scroll; tiles 56px;
│         (12 cols fit at          │   moisture = blue inner ring opacity,
│          ~28px zoomed-out /      │   nitrogen shown only in tile sheet,
│          pinch or toggle to      │   crop stage = emoji size 4 steps,
│          56px zoomed-in)         │   mature = gentle bounce,
│                                  │   stressed = 🥀 corner badge,
│                                  │   irrigated = 💧 corner dot,
│                                  │   channel = canal texture,
│                                  │   locked = dark + price tag on tap
├──────────────────────────────────┤
│ 💧 ▓▓▓▓▓░░░ 130/200  🪣×2         │ ← WaterBar (reservoir + wells)
│ [ Farm ] [ Build ] [ Market ]    │ ← mode tabs
│ ── contextual area (~160px) ──   │
│  Farm+tile: TileSheet            │
│  Build: BuildPanel               │
│  Market: MarketPanel (scrolls)   │
│         [  END DAY ▸  ]          │ ← always visible, 56px, full width
└──────────────────────────────────┘
```

**TileSheet** (tap a tile in Farm mode) — shows exactly `validActions()`:
- *Grass:* "Wild grass · soil N 82" → `[Till 1⚡]`
- *Tilled empty:* moisture + N bars → `[Plant…]` (opens seed strip: owned seeds with count, plantable-this-season enabled, others greyed with reason) `[Water 1⚡ 💧10]`
- *Planted:* "🍅 Tomato · night 4/7 · 💧 will drink 25 · N 44" + stress warning if `moisture < waterNeed` ("**will stress tonight**" — the single most important line in the UI) → `[Water] [Harvest]` (harvest enabled iff mature, shows "→ 6 units ≈ 58g")
- *Channel/Well:* connectivity status ("connected ✓ / DISCONNECTED ✗") → `[Demolish 1⚡]`

**BuildPanel:** three cards (Channel 15g 2⚡ · Well 100g 3⚡ · Expand) → placement mode: valid targets glow green, invalid show reason on tap; channels preview their connectivity live before you confirm.

**MarketPanel:** one row per crop — emoji, price + Δ vs yesterday (green/red), 7-day sparkline, `You have: 14` → tap = sell sheet with qty stepper, live total, and **live price-impact preview** ("selling 60 → price drops to 4.1"). Seeds section below (buy steppers). Upgrades section at bottom. First-sell AP badge shown on the panel header until paid.

**DayRecap** (after End Day): card stack, tap/swipe through, worst news first, skippable. Final card = tomorrow's dawn state ("Day 13 · ☀️ · reservoir 96 · 2 crops ready").

**Onboarding:** `tutorialStep` drives 5 contextual hints (till → plant → water → end day → sell), each dismissed by doing the thing. No modal tutorial.

---

## 11. Architecture & Files

```
app/apps/farm-sim/
├── page.tsx                     # mode state, hook wiring, layout shell
├── layout.tssx
├── lib/
│   ├── types.ts                 # §2 verbatim
│   ├── balance.ts               # §1 verbatim — every tunable number
│   ├── engine/                  # ★ pure, no React/browser/storage imports
│   │   ├── rng.ts               # mulberry32 + hash(seed, day, system)
│   │   ├── newGame.ts
│   │   ├── actions.ts           # applyAction + validActions + validation messages
│   │   ├── resolveDay.ts        # §9 orchestrator
│   │   ├── weather.ts           # season roll, truth pre-roll, committed forecast
│   │   ├── water.ts             # flood-fill connectivity, dawn irrigation pass
│   │   ├── crops.ts             # §3 rules
│   │   └── market.ts            # §6 price/supply/noise/sell
│   ├── storage.ts               # LocalStorageFarmRepository, 3 save slots
│   └── recap-text.ts            # RecapEvent → sentences (kept out of engine so tone is editable)
├── hooks/
│   └── useFarmGame.ts           # state, dispatch(action) → toast on error, endDay(), autosave (slot 0) after every action, save-slot ops
├── components/
│   ├── FarmGrid.tsx  TileCell.tsx  HudBar.tsx  ForecastStrip.tsx
│   ├── WaterBar.tsx  TileSheet.tsx  BuildPanel.tsx  MarketPanel.tsx
│   ├── SellSheet.tsx DayRecap.tsx  TutorialHint.tsx  NewGameScreen.tsx
└── data/
    ├── crops.ts                 # CropDef table (§3) + season modifiers (§6)
    └── weather.ts               # season weight tables (§4)
```

- Register in `lib/mini-apps.ts`: `{ id: 'farm-sim', name: 'Farm Sim', icon: '🌾', color: '#65A30D', isNew: true }`.
- **No Firebase.** Game saves are device-local (same precedent as estimator settings). Storage key `farm-sim-save-{slot}`.
- Engine purity is enforced by review + a lint comment header; if we ever add tests-infra, an import-boundary check is the first test.

---

## 12. Simulation Harness (the actual balance tool)

`scripts/farm-sim-balance.ts`, run with `npx tsx` — never shipped, not part of the build:

- Three scripted bots: **NaiveBot** (plants wheat, waters everything it can, sells on harvest), **GreedyBot** (max-value crop legal today, builds channels when AP-starved), **CautiousBot** (only plants when 3-day forecast is clean, potatoes in frost seasons).
- Run each on 200 seeds × 84 days. Report per bot: gold curve at each checkpoint (§8), death counts by cause, reservoir-short frequency, bankruptcies (gold < cheapest seed with nothing planted).
- **Pass criteria:** NaiveBot survives but lands *under* checkpoint targets; GreedyBot hits them; nobody bankrupts before day 10 on >2% of seeds; storms/frosts cause losses on >30% of GreedyBot seeds (weather must actually bite).
- This harness is Phase 2's acceptance gate and reruns after every `balance.ts` change. It's also the Godot cross-validation fixture later (same seeds + logs, diff states).

---

## 13. Build Phases — Tasks & Acceptance Criteria

Every phase ends **playable, pushed, and on your phone** via Vercel preview.

### Phase 0 — Skeleton (1 session)
Tasks: mini-app registration · `types.ts` + `balance.ts` + `data/*` complete (even for unbuilt systems — the tables above, verbatim) · `rng.ts` with stream derivation · `newGame` · grid rendering with zoom toggle · tile tap → stub sheet · End Day advances day/season only · `storage.ts` + autosave + New Game screen with seed display.
**Accepts when:** cold-load resumes exactly where you left off; day 28→29 flips Spring→Summer; grid pans smoothly on a phone; `newGame(42)` twice produces identical state.

### Phase 1 — The Crop Loop (2 sessions)
Tasks: `actions.ts` (till/plant/water/harvest/buySeeds/sell with full validation + error strings) · AP accounting + HUD · moisture/nitrogen night rules (§3 exact) · stress/death · bean adjacency · berry regrowth · fixed prices (base × seasonMod, no supply/noise yet) · TileSheet with real valid actions + the "will stress tonight" warning · basic DayRecap (deaths, maturities) · tutorial hints.
**Accepts when:** the day-1 opener (§7) is exactly playable in 12 AP; unwatered wheat stresses night 3 and dies night 4; beans measurably lift neighbor N in the tile sheet; harvest-to-gold round trip works; out-of-season planting is blocked with a readable reason.

### Phase 2 — Weather & Forecast (1–2 sessions)
Tasks: truth pre-roll · committed-lie forecast + ForecastStrip · frost/storm/heatwave/rain night effects in correct §9 order · tomato heat bonus · recap weather events with worst-first ordering · **simulation harness + first balance pass**.
**Accepts when:** forecast chips never change once shown; a frost wipes tomatoes but not potatoes; storm only hits mature crops; harness pass criteria (§12) are green.

### Phase 3 — Water Network (2 sessions)
Tasks: reservoir + WaterBar · wells · manual-water reservoir draw · channel build/demolish with live connectivity preview · flood-fill + dawn irrigation with row-major shortage · reservoirShort recap · BuildPanel.
**Accepts when:** a disconnected channel visibly does nothing; 3 irrigated tomatoes drain the reservoir in ~2–3 rain-free days (per §5 math); demolishing a mid-network channel strands the downstream segment same dawn.

### Phase 4 — Living Market (1 session)
Tasks: supply pressure + recovery · noise walk · 7-day history + sparklines · sell sheet with live price-impact preview · first-sell AP rule + Cart upgrade · remaining upgrades (Big Can, Coffee) · price-move recap events.
**Accepts when:** dumping 60 wheat visibly moves the preview and the post-sale price; price recovers ~half in 4 days; sparklines match actual history; upgrades apply and persist.

### Phase 5 — Expansion, Balance, Fun Test (1–2 sessions)
Tasks: expand action + ring pricing + locked-tile price tags · full recap polish (`recap-text.ts` tone pass) · harness rerun + `balance.ts` tuning to §8 checkpoints · 3 save slots UI · empty-state/new-game polish · bug sweep from own play.
**Accepts when:** harness checkpoints green; you have personally played day 1→56 on your phone without consulting code.

**Total: ≈ 8–10 sessions.**

### The Fun Test (gate to M2)

Play two full seasons (day 1–56) on your phone. Score honestly:
1. **One more day** — did you end sessions mid-decision because you wanted tomorrow?
2. Did the forecast ever make you **change a plan** (early harvest, skipped planting, panic watering)?
3. Did you **think about layout away from the game** (rotation, channel routing)?
4. Did weather produce a **story** ("the day-19 frost") rather than an annoyance?
5. Is AP scarcity **interesting triage** or tedium?

**3+ yes → M2.** Otherwise the loop is wrong: tune `balance.ts` and Phases 1–2 mechanics. **Adding systems to an unfun loop is forbidden** — that's how this genre dies.

---

## 14. M2 — Depth (each item independently shippable, in order)

1. **Processing chains.** Mill (150g) / Dairy / Cellar as buildable tiles. Recipes: wheat→flour (2:1, 1 night)→bread (1:1+1 night, sells ~3× wheat-equivalent); berries→jam; pumpkin→pie. Buildings have per-night throughput (bottleneck puzzle) and an input/output hopper UI on the tile sheet.
2. **Animals + disease.** Pasture tiles; chickens (eat wheat, lay daily) and cows (eat beans, milk daily→Dairy). Overcrowding raises infection p; disease spreads to orthogonal animals nightly; treat (gold) vs vaccinate (gold, upfront) — insurance economics.
3. **Winter + greenhouses.** 4th season: nothing grows outside, frost most days — the season processing/animals were built for. Greenhouse (300g, 2×2) ignores weather.
4. **Contracts.** Offered periodically: "40 flour by Fall 14 @ fixed 9g/unit." Guaranteed price vs. market upside, penalty on miss.
5. **Workers.** Hire = +6 AP for 15g/day wages — converts gold into time, end-game shifts from doing to directing.
6. **Spoilage knob** if warehouse-and-wait proves degenerate: fresh goods lose value ~2%/day held; processed goods don't (another reason to process).

## 15. M3 — Godot Port (only if M2 confirms it deserves to exist)

- Reuse `docs/godot-tutorial` Phase-0 CI/CD wholesale (Actions → HTML5 → Pages), portrait pillars; Steam Deck/desktop export after.
- Mapping: `lib/engine/*` → autoload singletons (`FarmEngine.gd`, `Weather.gd`, `Market.gd`) near line-for-line; `types.ts` → `class_name` Resources; `balance.ts` → `Constants.gd`; components → scenes; `useFarmGame` → signals.
- **Cross-validation:** TS engine is the spec. Same seed + action log through both engines; diff final `GameState` JSON. Harness bots (§12) generate the logs for free.
- Pixel-art generation happens here (or late M2): 6 crops × 4 stages, soil/moisture tiles, channel/well/reservoir, weather overlays, buildings — 16–32px, AI-generated + hand-tweaked.

## 16. Risks

| Risk | Mitigation |
|------|------------|
| Turn-based farming reads as a spreadsheet | Recap drama, committed-lie forecast gambles, storm-before-harvest scrambles. If the fun test fails on tedium, cut AP costs before adding anything |
| Balance is wrong | Harness (§12) with pass criteria, not vibes; every number in `balance.ts`; seeded runs reproducible |
| M1 scope slips | Phases individually shippable; Phase 3 (water) is the designated cut — Phases 1+2+4 alone are a testable game |
| Row-major irrigation shortage feels arbitrary | It's legible and deterministic; player-set priority is a queued M2 nicety if playtests complain |
| Emoji art undersells it | Deliberate: art is gated behind the fun test; it cannot fix the loop |
| Engine purity erodes | All RNG confined to endDay; import discipline reviewed each phase; purity is the entire port strategy |

## 17. Open Tuning Questions (flagged, not blocking)

- Is `STRESS_DAYS_TO_DIE = 2` too brutal for new players, or exactly the teacher it should be? (Harness death counts will say.)
- Should mature crops left unharvested eventually rot? (M1: no. Revisit if "harvest hoarding" trivializes storms.)
- Berry economics assume ~6 picks from a day-1 planting — if players plant late, berries are a trap; maybe show "expected picks remaining" in the seed strip.
- Does 12×12 with ring pricing give enough room for M2 buildings, or should the world be 14×14 from day one? (Cheap to decide in Phase 0, expensive after saves exist.)

---

## Immediate Next Step

Phase 0. First commit: registration + full `types.ts`/`balance.ts`/`data/*` (this document, verbatim, as code) + seeded `newGame` + rendered grid + End Day counter + autosave.
