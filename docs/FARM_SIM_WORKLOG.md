# Farm Sim — Work Log

> **Purpose:** Session-by-session + feature-by-feature record of what was built. Any agent resuming work should read this first, then `FARM_SIM_REALTIME_PLAN.md` for the full spec.

---

## How to Resume

1. Read this log (bottom = most recent).
2. Read `docs/FARM_SIM_REALTIME_PLAN.md` for the full spec.
3. Check current branch: `git branch` — should be `claude/farming-sim-plan-p17jtc`.
4. Run `npm run dev` (or `npx next build` to verify clean build).
5. Pick up at the **Next Up** section of the latest session.

---

## Game Overview (for fast context)

**Farm Sim v2** — real-time farming game inside `app/apps/farm-sim/`.

- Pure simulation engine in `lib/engine/` — crops, weather, water network, market, `endDay()`. **Untouched by UI work.**
- Real-time layer being built in `lib/realtime/` — clock, player movement, stamina.
- Rendering moves from DOM grid → HTML5 `<canvas>` with pixel-art sprite atlas.
- Still mobile-portrait-first; lives in the One App hub at `/apps/farm-sim`.

**Build phases — original R0→R5 (rendering + real-time layer):**
| Phase | What | Status |
|-------|------|--------|
| R0 | Palette + sprite atlas + canvas world render + camera + day-tint | ✅ Done |
| R1 | Farmer sprite + movement + tools + hold-to-repeat | ✅ Done |
| R2 | Clock, stamina, sleep → endDay, v1-save migrator | ⏳ Pending |
| R3 | Live weather + lighting | ⏳ Pending |
| R4 | Realism pass — poses, sway, FX, shadows | ⏳ Pending |
| R5 | Balance retune + fun test | ⏳ Pending |

**Content expansion phases — approved 2026-07-14 (see §CONTENT PLAN below):**
| Phase | What | Status |
|-------|------|--------|
| C1 | Larger world (32×32), biome zones, fencing, farmhouse, barn | ⏳ Pending |
| C2 | Animals — chickens, cows, sheep (pasture, feed, produce) | ⏳ Pending |
| C3 | More crops + Winter season (4th season, greenhouse mechanic) | ⏳ Pending |
| C4 | Weather depth — wind, fog, drought, blizzard | ⏳ Pending |
| C5 | Economy — NPC traders, contracts, shipping crate, reputation | ⏳ Pending |
| C6 | Progression — skill tree, farm level, unlockable land | ⏳ Pending |

---

## CONTENT PLAN — Full Farm Vision (approved 2026-07-14)

### What we're building toward

A proper farming sim closer to Stardew Valley in scope — not a puzzle, a *world*. You live on the farm. Days pass. Seasons change. Animals need care. Crops rot if ignored. The market fluctuates. You build up slowly.

---

### C1 — Larger World + Structure

**Grid: 32×32** (1024 tiles, 1024×1024 world-px at 32px/tile)
- Starting plot stays 7×7 in the centre-south — feels like you start small in a big world
- Surrounding locked land expands in rings, each ring more expensive
- **Biome zones** (cosmetic variation in grass sprites, affects crop yield mods):
  - `fertile` (centre) — normal yield, dark soil
  - `dry` (east/west edges) — −15% yield, needs more water
  - `rocky` (north) — only toughs like potato/pumpkin thrive; stone resource
  - `riverside` (south edge) — +10% yield, moisture evaporates slower

**New structures (tile kinds):**
- `farmhouse` — 2×3 footprint, sleep point, interior overlay on enter
- `barn` — 3×3 footprint, required for animals, upgradeable to hold more
- `fence` / `gate` — contain animals to a pasture zone, block player
- `scarecrow` — 1×1, prevents bird damage to 5×5 radius crops (R4)
- `shipping_crate` — sell crops without AP market trip cost (replaces cart upgrade)
- `greenhouse` — 2×3, enables growing summer crops in Winter

**Migration:** grid expansion requires a save migrator. v2 saves get a `gridSize` field; on load, if `gridSize !== GRID_SIZE`, show "World expanded — your farm has moved!" and place old tiles centred in the new grid.

---

### C2 — Animals

**Species (in order of unlock):**
| Animal | Produces | Feed | Housing | Unlock cost |
|--------|----------|------|---------|-------------|
| Chicken | Eggs (daily if fed) | Grain (wheat) | Barn slot ×1 | 200g |
| Cow | Milk (daily if fed + watered) | Hay (grass tiles) | Barn slot ×2 | 800g |
| Sheep | Wool (every 3 days if fed) | Hay | Barn slot ×2 | 600g |
| Pig | Truffle (random, rooting in pasture) | Slop (any crop scraps) | Barn slot ×2 | 1000g |

**Animal state per animal:**
```typescript
interface Animal {
  id: string;
  species: AnimalSpecies;
  name: string;          // player-named
  hunger: number;        // 0–100, drops 20/day, produces only if ≥50
  happiness: number;     // 0–100, petting +10, outdoor time +5/day
  daysOwned: number;
  readyToProduce: boolean;
  outdoor: boolean;      // in pasture or barn
}
```

**Mechanics:**
- Animals in the barn need player to feed them (Z on feed bin)
- Animals in pasture eat grass tiles (consumed slowly — grass regrows)
- Happy animals produce higher quality produce (×1.5 market price)
- Neglected 3+ days → sick → vet fee 100g to cure
- Player pets animal by facing it + Z with hand tool

**Produce as new items:** eggs, milk, wool, truffle — all sellable at market, some usable in crafting (butter, cheese, yarn — C5)

---

### C3 — More Crops + Winter

**New crops:**
| Crop | Season | Grow days | Special |
|------|--------|-----------|---------|
| Corn | Summer | 9 | High yield (8 units), needs nitrogen |
| Sunflower | Summer | 6 | Produces seeds (re-plantable), attracts bees (+5% yield to neighbors) |
| Carrot | Spring/Fall | 4 | Underground, frost-hardy, bolt to seed if left unharvested |
| Onion | Spring/Fall | 5 | Stores 14 days after harvest before value drops |
| Grapes | Summer (vine) | 12 | Perennial — plant once, harvest 3 seasons, makes wine (C5) |
| Lavender | Spring/Summer | 7 | Sells well, attracts bees, dries for Winter sale bonus |
| Turnip | Fall/Winter | 5 | Only crop that grows in Winter outside greenhouse |

**Winter (4th season, 28 days):**
- No new planting outdoors (except Turnip)
- Existing crops die at season change (except greenhouse)
- Snow overlay replaces rain/frost sprites — world looks different
- Animals can't go outside — barn feeding mandatory
- Market prices spike for stored produce (onion, dried lavender, preserved jam C5)
- Snow can be shovelled off tilled tiles (shovel tool) to expose them
- Ice forms on reservoir — no irrigation, wells still work (underground)
- Sleep is longer (natural dark at 18:00 instead of 22:00)
- **Greenhouse:** plant summer crops, pay 10 water/day heating cost

---

### C4 — Weather Depth

**New weather types:**
| Weather | Season | Effect |
|---------|--------|--------|
| `windy` | Spring/Fall | Seeds blow off mature crops if not harvested (10% loss/day) |
| `fog` | Fall/Winter | Forecast accuracy drops to 50%/30%/20% for 2 days |
| `drought` | Summer | Evaporation ×3, reservoir −20/day extra, no rain for 7+ days |
| `blizzard` | Winter | Movement speed halved, can't work outdoor tiles, animals must be inside |
| `thunderstorm` | Summer | Like storm but also destroys fences, scatters animals |
| `perfect` | Spring | +20% yield on crops harvested this day, bees active |

**Visual changes per weather (R3 wires these):**
- Windy: grass sways faster, leaves particle
- Fog: grey alpha overlay over canvas, visibility reduced
- Blizzard: heavy white particle, player slows to 40%
- Perfect: golden lighting, bee sprites in field

---

### C5 — Economy + NPCs

**NPC traders (show up at market 1–2 days/week, visible on map):**
| NPC | Specialty | Special offer |
|-----|-----------|---------------|
| Merchant Elena | Rare seeds | Sells grapes, lavender, sunflower seeds |
| Vet Marcus | Animal care | Sells medicine, vet service, breed upgrades |
| Builder Tomas | Structures | Sells greenhouse kit, barn upgrade, scarecrow |
| Trader Yuki | Contracts | Offers 3-day "deliver 20 wheat for 150g" contracts |

**Contracts system:**
- 1–3 active contracts at a time (random from pool)
- Time-limited (3–7 days)
- Reward: gold + reputation points
- Reputation unlocks new NPC stock tiers

**Shipping crate:**
- Place on farm, fill with produce during the day
- Automatically sells at end-of-day for standard price (no AP cost, no market trip)
- Upgrade to "refrigerated crate" — produce doesn't decay

**Crafting (simple):**
- Butter churn: milk → butter (×2 price)
- Cheese press: 3× milk → cheese (×4 price, 2 days)
- Loom: 2× wool → yarn (×2.5 price)
- Jam maker: 3× berries/grapes → jam (×3 price, stores all winter)

---

### C6 — Progression

**Farm level (1–20):**
- Earned via: crops harvested, animals produced, contracts completed, days survived
- Each level unlocks: new land ring, new structure, new NPC, new crop

**Skill tree (3 trees, 5 nodes each):**
- 🌾 **Farming**: faster till/harvest, higher yield, unlock multi-row planting
- 💧 **Irrigation**: channel range +1, reservoir cap +50, rain harvesting roof
- 🐄 **Husbandry**: animals need feeding less often, produce quality +, unlock pig

**Seasons as a meta-cycle:**
- Spring: plant heavy, repair from Winter
- Summer: peak production, drought risk, market peak
- Fall: harvest everything, prepare for Winter, preserve foods
- Winter: survive, upgrade, plan next year

---

### Implementation order across sessions

| Priority | Phase | Start after |
|----------|-------|------------|
| **Now** | R2 (clock + stamina + sleep) | This session |
| **Now** | R3 (weather + lighting) | After R2 |
| **Next** | C1 (32×32 world + structures + biomes) | After R3 |
| **Next** | C2 (animals) | After C1 |
| **Then** | C3 (new crops + Winter) | After C2 |
| **Then** | R4 (realism pass) | After C1 |
| **Then** | C4 (weather depth) | After C3 |
| **Then** | C5 (economy + NPCs) | After C4 |
| **Then** | C6 (progression) | After C5 |
| **Last** | R5 (balance retune) | After all content |

---

## Sessions

---

### Session 1 — 2026-07-14

**Agent:** Claude Sonnet 4.6
**Branch:** `claude/farming-sim-plan-p17jtc`
**Goal:** R0 — palette, sprite atlas pipeline, terrain/water/crop sprites, GameCanvas rendering existing farm with camera and day-tint.

#### Features Built

**F1 — Palette** (`render/sprites/palette.ts`)
32-colour earthy ramp: soil (dry/wet), grass/foliage, water/sky, stone, wood, crop tints, outline neutrals. Single source of truth — every sprite maps to palette keys, so colour tweaks are one-line edits.

**F2 — Sprite utilities** (`render/sprites/spriteUtil.ts`)
`sprite()` helper: parses a template-literal pixel grid into `SpriteGrid { w, h, pixels[][] }`. Strips common indentation so sprites can live inside indented source. Human-readable, fully diffable.

**F3 — Terrain sprites** (`render/sprites/tiles.ts`)
16×16 sprites for: grass ×3 variants (visual scatter), tilled-dry (warm soil rows), tilled-wet (darker + sheen row — this IS the moisture UI), locked hedge, reservoir TL, channel-H, channel-V, well. All authored as palette-key pixel grids in TS.

**F4 — Crop sprites** (`render/sprites/crops.ts`)
6 crops × 4 growth stages (seedling/sprout/growing/mature) + withered sprite. Wheat: golden ear heads. Potato: underground mass + foliage. Beans: climbing vine + pods. Tomato: tall vine + hanging reds. Berries: bush + blue clusters. Pumpkin: spreading vines + orange bulge.

**F5 — Atlas builder** (`render/atlas.ts`)
Packs all named sprites into one offscreen canvas at boot. `drawSprite(ctx, name, dx, dy, scale)` for fast blits. Cached singleton; `resetAtlas()` for hot-reload. No binary files in repo.

**F6 — Camera** (`render/camera.ts`)
World-pixel coordinate system. `TILE_PX = 32` (16px sprite × 2 scale). `makeCamera`, `clampCamera`, `centerOnFarm`, `worldToScreen`, `tileToWorld`. R0 centers on farm; R1 will follow player.

**F7 — Lighting** (`render/lighting.ts`)
Time-of-day colour-grade overlay. Four buckets: dawn (warm amber), day (subtle warm tint), dusk (orange-red), night (dark blue). Applied via `globalCompositeOperation: source-atop`. R0 uses `'day'`; full cycle wired in R3.

**F8 — World renderer** (`render/worldRenderer.ts`)
Layered draw: (1) ground tiles via offscreen cache (invalidated only on tile-kind or moisture change — cheap rerenders), (2) y-sorted objects layer (channels, well, reservoir, crops), (3) selection highlight, (4) lighting overlay. Crops anchor bottom-centre and offset up 8px for depth.

**F9 — GameCanvas component** (`components/GameCanvas.tsx`)
React wrapper: rAF render loop (pure draw, no update logic in R0), `ResizeObserver` for responsive sizing, pointer-down → tile index → `onSelect`. Multi-select set drawn as yellow outline batch. `image-rendering: pixelated` for crisp pixel art.

**F10 — Wire into page.tsx**
Replaced `FarmGrid` import with `GameCanvas`. Same props interface — drop-in swap. All v1 controls (TileSheet, BulkActionBar, BuildPanel, MarketPanel, End Day) still work unchanged.

---

#### Decisions Made This Session

- Work log format: session + feature entries, designed for multi-agent resumability.
- R0 scope: render the existing v1 game state on canvas — no behavior change, v1 controls stay working underneath.
- Grid stays 12×12 for R0 (the 12→16 question deferred to after the migrator exists per the plan).
- `TILE_PX = 32` (16px sprites drawn at 2× scale) — good phone density, crisp pixels.
- Ground cache keyed on `kind:moisture-bin` per tile — moisture ≥40 = 'wet'. This makes watering visually immediate.
- Channel bitmask auto-connect deferred to R4; R0 picks H vs V by checking left/right neighbours.

---

### Session 2 — 2026-07-14

**Agent:** Claude Sonnet 4.6
**Branch:** `claude/farming-sim-plan-p17jtc`
**Goal:** R1 — Farmer character, WASD movement, 20×20 world, tools.

#### Features Built

**F11 — 20×20 world** (`lib/balance.ts`)
`GRID_SIZE` raised 12→20. `START_PLOT` updated to 7×7 centre plot (`r0:7,c0:7,r1:13,c1:13`). `RESERVOIR_POS` moved to `{r:7, c:10}` (north edge centre). `actions.ts` `expansionRing()` was hard-coding 12 — replaced with `GRID_SIZE` import. World is now 640×640 world-pixels (20 × 32px tiles).

**F12 — Farmer sprites** (`render/sprites/farmer.ts`)
12 palette-key pixel grids at 12×18 px each: 4 directions × (idle + walk0 + walk1). Down/up face toward/away camera; left/right arms offset per direction. Walk frames shift leg positions to animate stride. Exported as `FARMER_SPRITES` record for atlas packing.

**F13 — Atlas update** (`render/atlas.ts`)
Cell size raised to 20×20 to accommodate farmer's 12×18 footprint (tile sprites are 16×16). Sprite UVs now store actual `grid.w × grid.h` dimensions (not fixed cell size) so farmer and tile sprites blit at correct sizes. `FARMER_SPRITES` added to `collectSprites()`.

**F14 — Player state** (`lib/realtime/player.ts`)
`PlayerState` interface: pixel position (x/y), facing direction, walkFrame/walkTick/isMoving, current tool, waterCharges. `makePlayer()` starts centred on the 20×20 world. `facingTileIdx()` and `standingTileIdx()` helpers. `WALK_SPEED=2.5`, `RUN_SPEED=4.0` (tiles/sec). `CAN_MAX_CHARGES=5`. No React imports — held in `useRef`.

**F15 — Input handler** (`lib/realtime/input.ts`)
Plain mutable `InputState` object. `attachKeyboard()` binds WASD + arrow keys + Z/Enter (action) + Shift (run). Returns cleanup function for `useEffect`. No `e.repeat` re-fires.

**F16 — Tool→action mapper** (`lib/realtime/interact.ts`)
`toolToAction(player, state, selectedCrop)` maps current tool + facing tile kind to a `PlayerAction`. hoe→till, can→water (if charges>0), seeds→plant (if crop selected), hand→harvest (mature only), builder→null (handled by overlay panel).

**F17 — World renderer update** (`render/worldRenderer.ts`)
`RenderOptions.player?: PlayerState` added. Player blit y-sorted with other objects using feet-world-y. Facing tile highlight now follows player when present (replaces click-selection highlight). Selection highlight parameter kept for backward compat.

**F18 — GameCanvas rewrite** (`components/GameCanvas.tsx`)
- Removed pointer→tile `onSelect` prop; replaced with `onAction`, `onToolChange`, `onPlayerMove`.
- `useRef` holds `PlayerState`, `InputState`, `Camera` — no React re-renders per frame.
- Fixed-timestep loop: accumulates real dt, steps simulation at 1/60s, caps spike at 100ms.
- `updatePlayer()`: reads input, applies velocity, normalises diagonal (×0.7071), per-axis collision via `collidesWithTiles()` (hitbox 16×16 at feet), walk-frame toggle every 8 ticks.
- `collidesWithTiles()`: locked + reservoir tiles are solid; all others walkable. World edges block movement.
- Camera smooth-follow: lerp factor 0.08, clamped to world bounds.
- Action button (Z/Enter): fires `toolToAction` on facing tile, hold-to-repeat with 30-frame initial delay then 12-frame repeat.
- Q/E keys cycle tool left/right through `['hand','hoe','can','seeds','builder']`.
- Canvas tap: detects facing direction toward tapped tile, fires tool action if it's the facing tile.

**F19 — ToolBar component** (`components/ToolBar.tsx`)
5-button row (hand/hoe/can/seeds/builder) with active highlight ring. Watering can shows `n/5` charge counter below icon. Icons + labels readable at small mobile size.

**F20 — Page rewrite** (`page.tsx`)
- Removed mode tabs (farm/build/market). Market and Build are now overlays.
- Bottom action bar: Market button, Tile Info button (visible when facing actionable tile), End Day button.
- Seeds picker strip appears below ToolBar when seeds tool is active — shows emoji + quantity per crop, highlights selected crop.
- Build panel slides in as overlay when builder tool active.
- Market panel is a full-screen overlay.
- `onPlayerMove` callback lifts player position for facing-tile HUD logic.

#### Decisions Made

- Farmer sprite cell 12×18 (not 16×16) — taller than square gives human proportions at 2× display (24×36 px). Fits in 20px atlas cell.
- Collision: locked + reservoir tiles are solid; well and channel are walkable (player wades through). This keeps watering channels accessible on foot.
- Water charges tracked in both `PlayerState.waterCharges` (for render/logic) and mirrored up via `onPlayerMove` for the ToolBar UI — avoids threading GameState down into the realtime layer.
- `selectedIdx` / `multiSelect` / `BulkActionBar` removed from main page flow — superseded by WASD approach. `TileSheet` still accessible via "Tile Info" button for power users.
- `FarmGrid` component still present but no longer used by page.tsx (legacy, can delete in R2).

---

### Session 3 — 2026-07-14

**Agent:** Claude Sonnet 4.6
**Branch:** `claude/farming-sim-plan-p17jtc`
**Goal:** UI overhaul — canvas fills full screen, HUD floats over it as glassmorphism overlay.

#### Features Built

**F21 — Full-screen canvas** (`page.tsx`)
Canvas is now `fixed inset-0` — takes the entire screen. All HUD floats above it as positioned overlays. No chrome stealing vertical space; the world is as big as the screen.

**F22 — Consolidated HudBar** (`components/HudBar.tsx`)
Merged WaterBar, ForecastStrip, ToolBar, and seeds picker all into one component. Renders two overlay regions: top (season pill + weather + gold + AP/water bars) and bottom (seeds strip + tool bar + Market/End Day buttons). All panels use `bg-black/50 backdrop-blur-sm border border-white/10` glassmorphism — readable over any terrain colour.

**F23 — Tool bar redesign**
Each tool is a rounded pill with active glow (`shadow-[0_0_10px_rgba(250,204,21,0.3)]`). Watering can shows 5 dot charges instead of a text counter. Seeds tool reveals a crop strip above the tool bar.

**F24 — AP + water as thin progress bars**
Replaced separate WaterBar component with two thin gradient bars just below the top pills. AP goes red when ≤2; water goes red when <30. Clean, unobtrusive.

**F25 — Forecast as icon cluster**
Weather forecast collapsed into a compact icon group next to today's weather emoji. Each day shows emoji + accuracy% in tiny text. Fits in a single pill.

**F26 — Build panel slide-up**
Build panel slides up from the bottom as a rounded sheet (`rounded-t-2xl`) above the HUD. Has its own close button.

**F27 — Market full-screen overlay**
Market opens as a `bg-slate-950/95 backdrop-blur-md` full-screen sheet with a proper header and close button.

**F28 — Stale-save guard** (`lib/storage.ts`, `lib/engine/actions.ts`)
`load()` now validates tile count matches `GRID_SIZE²` — rejects old 12×12 saves silently. `validActions()` guards against undefined tile index.

**F29 — Removed dead components**
Deleted `WaterBar.tsx`, `ForecastStrip.tsx`, `ToolBar.tsx`, `TutorialHint.tsx` — all merged into HudBar or dropped.

#### Decisions Made This Session

- HUD is entirely overlaid — canvas gets 100% of screen real estate.
- Glassmorphism (`backdrop-blur + bg-black/50 + border-white/10`) reads well over grass/soil palette.
- Seeds strip appears above tool bar only when seeds tool is active — no wasted space otherwise.
- Tutorial hints removed for now (diegetic signposts planned for R4).

#### Next Up — R2 (Clock, stamina, sleep)

- [ ] `lib/realtime/clock.ts` — in-game 6 AM–10 PM clock, 1 real-second = ~6 game-minutes
- [ ] `lib/realtime/stamina.ts` — 100/day pool, per-action costs (till=2, water=1, harvest=1, plant=1), visual fatigue at <20
- [ ] Auto-endDay when player walks to bed / clock hits 10 PM
- [ ] Watering-can refill when player stands on reservoir or channel tile
- [ ] `components/Joystick.tsx` — virtual left-thumb joystick for mobile (touch events)
- [ ] `components/ActionButton.tsx` — large A button bottom-right, fires tool on facing tile
- [ ] Run button (B) for mobile

---

### Session 3 — 2026-07-14

**Agent:** Claude Sonnet 4.6
**Branch:** `claude/farming-sim-plan-p17jtc`
**Goal:** Expand to endless/open world — 64×64, no locked tiles, player can roam and farm anywhere.

#### Features Built

**F30 — 64×64 open world** (`lib/balance.ts`)
- `GRID_SIZE` 20 → 64 (4096 tiles, 2048×2048 world pixels at 32px/tile)
- `START_PLOT` moved to {28,28}→{36,36} (center of the world)
- `RESERVOIR_POS` moved to {28,32} (north edge of start plot)
- Removed `expandRing1/2/3` costs from `GOLD_COST` — no more tile purchasing

**F31 — Remove locked tiles entirely** (`lib/types.ts`, `lib/engine/actions.ts`, multiple files)
- `TileKind` no longer includes `'locked'`
- `PlayerAction` no longer includes `'expand'` type
- All tiles start as `grass` — player can till/build anywhere from turn 1
- `newGame()` now creates a 64×64 all-grass world with a reservoir at the center start area
- Removed `expansionRing()`, `expansionCost()`, and the `'expand'` case from `actions.ts`
- `validActions()` no longer handles `'locked'` case
- `BuildPanel.tsx` — removed "Buy land" tool option

**F32 — Reference-based ground cache** (`render/worldRenderer.ts`)
- Replaced O(N) string-key comparison (`tiles.map().join()` — 28k chars at 64×64) with O(1) object-reference check
- Since `cloneState()` always returns a new tiles array, reference change = tile change. Zero false cache hits.

**F33 — Camera boots centered on player** (`components/GameCanvas.tsx`)
- On first resize, camera initializes centered on `playerRef.current.x/y` instead of world origin (0,0)
- Player no longer has to watch the camera slide 1024px to catch up at boot

**F34 — Grass scatter hash** (`render/worldRenderer.ts`)
- `grassVariant()` now uses `col * 7 + row * 13 + col ^ row` % 3 for a visually scattered pattern instead of `idx % 3` (which produced diagonal stripes)
- Collision updated: only `reservoir` blocks player — `locked` case removed from `collidesWithTiles()`

**F35 — Save format guard updated** (`lib/storage.ts`)
- Comment updated to reflect 64×64; stale 20×20 saves (400 tiles) are auto-discarded

#### Decisions Made

- No tile purchasing / expansion system. World is fully open from game start.
- Player can farm anywhere — walk to a spot, till, plant. Natural emergent expansion.
- START_PLOT is just the initial area with grass pre-tilled; not enforced by the engine — it's just where the reservoir and tutorial flow begin.
- `locked` tile kind removed from the type system completely (not just logically disabled).
- Ground cache on 64×64 is a 2048×2048 px offscreen canvas (~16MB). Built once at game start, rebuilt only when tile state changes. Acceptable for desktop; monitor on mobile.

#### Next Up

- [ ] R2: `lib/realtime/clock.ts` — in-game time accumulator (6:00–24:00)
- [ ] R2: `lib/realtime/stamina.ts` — stamina pool with per-action costs
- [ ] R2: Farmhouse tile + sleep mechanic (walk to bed → `endDay()`)
- [ ] R2: Watering-can refill when standing on reservoir
- [ ] Touch controls: virtual joystick + action button
- [ ] C2: Animals (chickens/cows/sheep) with pasture and barn
- [ ] World: terrain biomes (riverside, rocky zone, meadow) using procedural noise on tile variants
- [ ] Minimap (small 64×64 overview in corner)
- [ ] v1-save migrator: detect old 12×12 save, reset grid to 20×20 newGame
