# Farm Sim — Detailed Plan

**Working title:** Untitled Farming Optimization Sim
**Status:** Approved direction, pre-build
**Last updated:** 2026-07-14

---

## Locked Decisions

| Decision | Choice | Consequence |
|----------|--------|-------------|
| **Time model** | Turn-based days. Spend Action Points, hit **End Day**, simulation resolves. | No real-time movement, no character sprite, no pathing. The entire game is decisions + resolution. Simulation is pure functions. |
| **Platform** | Mobile portrait first (390×844 reference), HTML5. | Top HUD, scrollable grid, pinned bottom action bar in the thumb zone — same pillars as `docs/godot-tutorial`. |
| **Tech path** | React prototype first, as a **mini-app in one_app** (`app/apps/farm-sim/`). | Hub card, localStorage saves via the repository pattern, instant Vercel deploys, playable on your phone from the first commit. |
| **M1 scope** | Crops + seasons/weather + water/irrigation + market fluctuation. | Ambitious first milestone — mitigated by building it in 6 phases, each independently playable. |

**Why "throwaway prototype" isn't actually throwaway here:** with turn-based resolution, all game logic lives in pure functions (`resolveDay(state, actions) → state`). React only renders state and collects input. If the game is fun and we port to Godot, the engine functions translate to GDScript almost line-for-line — only the rendering layer is rewritten. This mirrors how `game-analytics` keeps its 70+ pure functions in `calculations.ts`.

---

## Core Loop (one day = one turn)

```
┌─────────────── PLAYER PHASE ───────────────┐
│ Spend AP on: till, plant, water, harvest,  │
│ build (channel/well), sell at market       │
│ Check 3-day forecast, prices, soil         │
└────────────────── End Day ─────────────────┘
┌────────────── RESOLUTION PHASE ────────────┐
│ 1. Weather event applies                   │
│ 2. Water flows (rain → reservoir → tiles)  │
│ 3. Crops grow / wilt / die                 │
│ 4. Soil nutrients update                   │
│ 5. Market prices update                    │
│ 6. Day advances (season change every 28d)  │
│ 7. Resolution recap screen                 │
└────────────────────────────────────────────┘
```

The **resolution recap** is a mini "day in review" — what grew, what died, what the weather did, price movers. Cheap to build, and it's where the game teaches its own systems.

---

## System Specs

### 1. Grid & Soil

- Full farm is **12×12**; you start with the center **6×6** unlocked. Expansion = buy adjacent tiles (cost scales with distance from center).
- Tile state: `locked | grass | tilled | planted | channel | reservoir | well`
- Each tile carries:
  - `moisture: 0–100` — decays daily (faster in heatwave), refilled by rain/watering/irrigation
  - `nitrogen: 0–100` — depleted by most crops, restored by beans or fallow days
- Portrait rendering: grid scrolls vertically under a fixed HUD; tiles ~48px, 6 visible per row at 390px width with padding.

### 2. Crops (M1 roster: 6)

| Crop | Seasons | Grow (days) | Water/day | Seed cost | Base sell | Nitrogen | Special |
|------|---------|-------------|-----------|-----------|-----------|----------|---------|
| Wheat | Spr/Sum/Fall | 4 | 10 | 5 | 12 | −5/day | Reliable filler |
| Potato | Spr/Fall | 5 | 15 | 8 | 20 | −8/day | **Frost-proof** |
| Beans | Spr/Sum | 5 | 15 | 10 | 18 | **+6/day** | Rotation partner |
| Tomato | Sum | 7 | 25 | 15 | 45 | −10/day | Frost kills; **+20% growth in heatwave** if watered |
| Berries | Spr/Sum | 6 to mature | 15 | 25 | 15/harvest | −4/day | **Re-harvests every 3 days** until season ends |
| Pumpkin | Fall | 9 | 20 | 20 | 70 | −12/day | Big payday, big commitment |

Mechanics:
- A planted tile with `moisture < water need` loses a growth day and takes wilt damage; two consecutive dry days kills the crop.
- Planting into `nitrogen < 30` soil: −25% final yield. Beans next to any crop give that neighbor +2 nitrogen/day (**adjacency matters**, per the skeleton).
- Growth stages rendered per crop: seed → sprout → growing → mature (4 sprites each).

### 3. Seasons & Weather

- Year = 4 seasons × 28 days. M1 seasons: **Spring, Summer, Fall** (Winter arrives with greenhouses in M2 — otherwise it's a dead season).
- Each day rolls one condition from a season-weighted table:

| Condition | Spring | Summer | Fall | Effect |
|-----------|--------|--------|------|--------|
| Sunny | 40% | 45% | 40% | Normal moisture decay |
| Rain | 35% | 15% | 30% | All tiles +40 moisture, reservoir +100 |
| Storm | 10% | 10% | 10% | Rain effects + each mature crop 15% chance destroyed |
| Heatwave | 5% | 25% | 5% | Moisture decay ×2; tomato bonus |
| Frost | 10% | 0% | 15% | Kills all non-frost-proof planted crops |

- **Forecast:** 3 days visible. Accuracy: tomorrow 90%, +2 days 70%, +3 days 55%. (Roll the true weather in advance; the forecast sometimes lies.) This is the gamble engine: "frost forecast at 70% — harvest tomatoes early at partial value, or risk it?"

### 4. Water & Irrigation

- **Reservoir:** starts at capacity 200. Rain +100, wells +30/day each. Everything that waters tiles draws from it.
- **Manual watering:** 1 AP + 10 reservoir water per tile → +40 moisture. Your early-game bottleneck.
- **Channels:** buildable tile (cost 15g). Any tilled tile **orthogonally adjacent to a channel connected to the reservoir** auto-waters to full each morning, drawing real water from the reservoir. Connectivity = flood-fill from reservoir through channel tiles.
- **Wells:** 100g, +30 reservoir/day, max 3.
- The puzzle: channels consume farmable tiles and cost water when the reservoir is low. Efficient layouts (one channel serving 2–3 crop tiles) beat sprawl. Drought stretches force triage: which crops drink today?
- **M1 cut:** no sprinklers, no over-watering/drowning. Both are M2 tuning knobs.

### 5. Market

- Each crop has a live price: `price = base × seasonal modifier × supplyPressure × dailyNoise`
  - **Seasonal modifier:** off-season goods sell +30% (pumpkins in spring), in-season glut −10%.
  - **Supply pressure:** every 10 units *you* sell pushes that crop's price −3%; recovers 10%/day toward 1.0. Dumping 60 wheat crashes wheat.
  - **Daily noise:** random walk ±5%, clamped to 0.6–1.6× base.
- Selling costs 1 AP per trip (any quantity, any mix) — batching is free, but the *decision* of when to sell is the game.
- UI: price list with 7-day sparkline + arrow per crop. No buy-side speculation in M1.

### 6. Action Points (the daily constraint)

- Start: **12 AP/day**. Costs: till 1, plant 1, water 1, harvest 1, build channel 2, dig well 3, market trip 1. Unused AP is lost — no banking.
- This is the knob that makes turn-based farming a puzzle instead of a checklist: at 20 planted tiles in a heatwave you *cannot* water everything by hand. Irrigation isn't cosmetic — it buys back AP.
- Upgrades (tools, later workers) raise AP or cut costs. Tune the numbers so the squeeze starts around day 8–10.

---

## UI (portrait, thumb-first)

```
┌──────────────────────────────┐
│ Day 12 · Spring   💰340  ⚡7/12│  ← HUD: date, gold, AP
│ ☀️ today   🌧90% 🌧70% ❄️55%   │  ← forecast strip
├──────────────────────────────┤
│                              │
│      [ scrollable            │
│        12×12 farm            │
│        grid ]                │  ← tap tile → contextual sheet
│                              │
├──────────────────────────────┤
│ 💧Reservoir ▓▓▓▓░░ 130/200    │
│ [Farm] [Market] [Build]      │  ← mode tabs
│ ┌─ tile sheet (on tap) ─┐    │
│ │ Tomato · day 4/7 · 💧OK │    │
│ │ [Water 1AP] [Harvest]  │    │
│ └────────────────────────┘   │
│        [ END DAY ▸ ]         │  ← always visible
└──────────────────────────────┘
```

- Tap a tile → bottom sheet with that tile's info + valid actions (the same pattern as game-analytics' bottom sheet).
- Modes: **Farm** (default), **Market** (price list + sell), **Build** (channel/well/expand placement).
- **End Day** always pinned. Resolution recap plays as a card stack after tapping it.

---

## Architecture (`app/apps/farm-sim/`)

```
app/apps/farm-sim/
├── page.tsx                    # Tab/mode orchestration, hooks wiring
├── layout.tsx
├── lib/
│   ├── types.ts                # GameState, Tile, Crop, WeatherDay, MarketState, PlayerAction
│   ├── engine/                 # ★ PURE FUNCTIONS ONLY — the portable core
│   │   ├── resolveDay.ts       # (state, actions[]) → { state, recap }
│   │   ├── weather.ts          # rollSeasonWeather, buildForecast
│   │   ├── water.ts            # channel connectivity (flood fill), distribution, moisture decay
│   │   ├── crops.ts            # growth, wilt, adjacency (bean nitrogen), yield
│   │   ├── market.ts           # price update, supply pressure, sell resolution
│   │   └── actions.ts          # validate + apply player actions, AP accounting
│   ├── storage.ts              # LocalStorageFarmRepository (save slots) — repository pattern
│   └── balance.ts              # ALL tuning constants in one file (AP costs, crop tables, weather weights)
├── hooks/
│   └── useFarmGame.ts          # state + dispatch(action) + endDay() + save/load
├── components/
│   ├── FarmGrid.tsx            # scrollable grid, tap handling
│   ├── TileCell.tsx            # tile render: soil, crop stage, moisture tint
│   ├── HudBar.tsx              # day/season/gold/AP
│   ├── ForecastStrip.tsx
│   ├── TileSheet.tsx           # contextual bottom sheet
│   ├── MarketPanel.tsx         # prices, sparklines, sell flow
│   ├── BuildPanel.tsx          # channel/well/expansion placement
│   └── DayRecap.tsx            # resolution card stack
└── data/
    ├── crops.ts                # crop definition table
    └── weather.ts              # season weather weight tables
```

Rules that keep the Godot door open:
- **Nothing in `lib/engine/` may import React, browser APIs, or storage.** `resolveDay` is a deterministic function of `(state, actions, rngSeed)`.
- Seeded RNG (tiny mulberry32) — replays and bug reports become reproducible, and forecast-vs-truth rolls stay honest.
- Components read state and dispatch typed `PlayerAction`s; they never mutate.

Registration: add to `lib/mini-apps.ts` (`id: 'farm-sim'`, icon 🌾, `isNew: true`). Firestore sync is **out of scope** — localStorage save slots only; this is a game save, not user data.

### Art (M1)

No sprite generation needed yet — ship M1 with **emoji + Tailwind-tinted tiles** (🌱🌾🥔🍅 on colored soil, moisture as a blue border tint, weather as emoji). It's shockingly readable at grid scale and costs zero hours. Generated pixel art (crop growth stages, soil, weather effects) becomes its own phase only after the fun test passes — art can't fix an unfun loop.

---

## Build Phases (M1)

Each phase ends **playable and pushed**. Order chosen so every phase changes decisions the player makes, not just adds content.

| Phase | Deliverable | You can now… | Est. sessions |
|-------|-------------|--------------|---------------|
| **0. Skeleton** | Mini-app registered, types, seeded RNG, grid renders, End Day advances the counter, save/load | Tap around a farm that persists | 1 |
| **1. Crops + AP** | Till/plant/water/harvest with AP costs, moisture + nitrogen, all 6 crops, fixed prices, gold | Play the core loop: plant → tend → harvest → sell → replant | 2 |
| **2. Weather + seasons** | Weather table, forecast strip (with lies), frost/storm/heatwave effects, season transitions, day recap | Gamble on the forecast; lose tomatoes to frost; feel seasons force rotation | 1–2 |
| **3. Water network** | Reservoir, wells, channel building + flood-fill connectivity, auto-watering, drought triage | Design an irrigation layout; escape the manual-watering AP trap | 2 |
| **4. Living market** | Price simulation, sparklines, supply pressure, sell screen | Time your sales; regret dumping 60 wheat at once | 1 |
| **5. Expansion + fun test** | Buy tiles, AP/tool upgrade or two, balance pass on `balance.ts`, onboarding hints | Play days 1–56 (two seasons) as a complete arc | 1–2 |

**≈ 8–10 sessions to the fun test.**

### Fun test (end of Phase 5)

Play two full in-game seasons on your phone, then answer honestly:
1. **One more day?** Did you end sessions mid-decision because you wanted to see tomorrow?
2. Did the forecast ever make you **change a plan** (early harvest, skip a planting)?
3. Did you ever **sketch a layout** (rotation or channels) outside the game?
4. Did a weather event create a **story** ("the frost that killed my tomato field") rather than just annoyance?
5. Is AP scarcity producing **interesting triage** or just tedium?

**3+ yes → proceed to M2.** Mostly no → the loop is wrong; iterate on `balance.ts` and Phase 1–2 mechanics before writing any new system. **Do not fix an unfun game by adding systems.**

---

## M2 — Depth (only after fun test passes)

In order, each still shippable independently:

1. **Processing chains** — Mill/Dairy/Cellar buildings occupy grid tiles; wheat→flour→bread, milk→cheese→aged cheese; each step = building + N days + 2.5–3× value. New bottleneck puzzle: sell raw now vs. process later.
2. **Animals + disease** — Chickens/cows on pasture tiles; eat feed crops you grow; adjacency-based disease spread; vaccination as insurance-vs-outbreak economics.
3. **Winter + greenhouses** — Fourth season unlocks; greenhouses ignore weather at high capital cost.
4. **Contracts** — Fixed-price standing buyers vs. market volatility; lock-in tension.
5. **Workers/automation** — Hire AP (a worker = +6 AP with wages) → late-game shifts from doing to directing.

## M3 — Godot Port (only if M2 confirms it deserves to be a real game)

- Reuse the **`docs/godot-tutorial` pipeline wholesale**: Phase-0 CI/CD (GitHub Actions → HTML5 → GitHub Pages), portrait pillars, then desktop/Steam Deck export.
- Port map: `lib/engine/*` → GDScript autoloads (`FarmEngine.gd`, `Weather.gd`, `Market.gd` — near line-for-line), `types.ts` → `class_name` Resources, `balance.ts` → `Constants.gd`, components → scenes.
- **Cross-validation trick:** keep the TS engine as the spec. Run both engines on the same seed + action log and diff final states. The React version becomes your test oracle.
- Pixel-art asset generation happens here (or late M2): crop growth stages ×4, soil/water tiles, buildings, weather overlays, UI — pixel art chosen because AI-generated + hand-tweaked is most feasible at 16–32px.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Turn-based farming feels like a spreadsheet | Day recap gives drama; forecast gambles give tension; if the fun test fails at "tedium," cut AP costs before adding content |
| M1 scope (4 systems) balloons | Phases are individually shippable; Phase 3 (water) is the pre-agreed cut line — the game is testable without it |
| Balance is wrong (too easy/too grindy) | Every constant lives in `balance.ts`; seeded RNG makes tuning runs reproducible |
| React prototype code gets thrown away | Only components get rewritten; the engine is the game and it ports |
| Emoji art undersells the vibe | Acceptable for the fun test by design; art is explicitly gated behind fun |

---

## Immediate Next Steps

1. Scaffold `app/apps/farm-sim/` (Phase 0): types, seeded RNG, grid, End Day counter, localStorage saves, hub registration.
2. Phase 1: the crop loop.
3. Push after every phase — Vercel preview = playable-on-phone build, same feedback loop as the Godot tutorial's Phase 0 promise.
