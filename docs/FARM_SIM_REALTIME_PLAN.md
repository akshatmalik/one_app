# Farm Sim v2 — Real-Time Plan

**Status:** Approved direction, pre-build. Supersedes the *presentation* layer of `docs/FARM_SIM_PLAN.md`; the simulation engine from that plan survives intact (see §2).
**Last updated:** 2026-07-14

The pivot: the turn-based tap-a-tile game becomes a **real-time farm you walk around in** — a farmer character, a live clock with day/night, weather you can see falling, and proper pixel-art assets. Closer to Stardew in feel, still an optimization game at heart.

---

## 0. Locked Decisions & Honest Constraints

| Decision | Choice |
|----------|--------|
| **Time** | Real-time continuous clock. One game day ≈ 11 real minutes. Days still *resolve* (growth, market, soil) when you sleep — the nightly simulation is unchanged. |
| **Character** | A farmer sprite you move (virtual joystick / WASD / tap-to-walk). You act on the tile you're facing, with the tool you're holding. |
| **Energy** | AP is replaced by **stamina** — per-action costs from a 100-point daily pool, refilled by sleep. Same puzzle (you can't do everything), now embodied. |
| **Assets** | **Generated locally, in-repo, as code**: palette-indexed pixel grids in TS, compiled to a sprite atlas on a canvas at boot. No binary files, no external image service. This is the constraint: I can author pixel art as data, not produce AI-generated PNGs. "Realistic" here means *rich pixel art* — texture, shadows, lighting, animation — not photorealism. |
| **Rendering** | HTML5 `<canvas>` with a fixed-timestep game loop for the world; DOM stays for menus/market/HUD. The DOM-grid UI retires. |
| **Platform** | Still mobile-portrait-first in one_app. Desktop gets WASD for free. |

**Why nothing is thrown away:** `lib/engine/` (crops, weather truth/forecast, water network, market, endDay) was built pure and UI-free precisely so the presentation could change. v2 wraps it in a real-time layer; the nightly math, the balance file, and the 200-seed harness all carry over.

---

## 1. The Real-Time Day

### Clock
- Wake at **06:00**, forced sleep at **02:00**. 1 game-minute = **0.7 real seconds** → the 06:00–22:00 core day ≈ **11.2 real minutes**. 🔧
- Clock pauses automatically: menus open, app backgrounded (`visibilitychange`), market/build panels up.
- HUD shows time as a sun/moon arc, not digits (realism pass), with digits on tap.

### Sleep = endDay
- Sleeping (bed in the farmhouse, or the menu button) calls the existing `endDay()` — growth, stress/death, soil, market step, season change, recap. The recap becomes a "night passes" card sequence over a dark screen.
- Sleep after midnight → wake with **75% stamina** tomorrow. Forced 02:00 collapse → **60%**. 🔧

### Weather goes live (the one engine resequence)
Today's weather currently applies during night resolution. In v2 it applies **at dawn of the day it belongs to**, so you experience it:
- **Rain/storm day:** rain falls on screen all day; tiles get their +50 moisture and the reservoir its +100 at 06:00. You watch puddles darken the soil — and you *don't* water today.
- **Storm:** mature-crop destruction rolls happen at a random visible moment mid-day (lightning flash + crop flattens), not invisibly at night. Same RNG stream, same odds — just witnessed.
- **Heatwave:** heat shimmer overlay, faster visible soil drying (the ×2 evaporation displays as the wet-soil sprite fading early).
- **Frost:** kills at dawn, visibly — frosted sprite overlay on the casualties.
This is a small, well-contained engine change: `endDay` splits into `applyDawnWeather(state)` + `resolveNight(state)`; determinism and streams unchanged.

---

## 2. What Survives / What Changes

| System | v1 (turn-based) | v2 (real-time) |
|--------|-----------------|----------------|
| Crop growth, stress, death, nitrogen, beans, berries | `endDay` | **Unchanged** — resolves on sleep |
| Weather truth + committed-lie forecast | `endDay` | Same truth/forecast; *application* moves to dawn (§1) |
| Water network, wells, dawn irrigation | `endDay` | **Unchanged** (irrigation at 06:00 fits even better) |
| Market pricing, supply pressure, sparklines | Same | **Unchanged**; market opens via the farm stand / farmhouse |
| AP (12/day) | Per-action AP | **Stamina 100/day** (§3), plus time-of-day as second constraint |
| Tap tile → sheet | Primary interaction | Walk + face + tool button. Tap a tile = walk to it (A* path); info sheet on long-press |
| Multi-select bulk bar | Batch taps | **Retired.** Hold the action button while walking a row = continuous work. The character *is* the batching |
| Emoji tiles/DOM grid | Rendering | **Retired** → canvas + sprite atlas |
| Save format | v1 | v2 adds `clockMinutes`, `stamina`, `player {x, y, facing, tool}`; one-shot migrator from v1 saves |
| Balance harness | Bot AP budget | Bots get a time+stamina budget model; economy checks identical |

---

## 3. The Farmer

### Movement
- Free 8-direction movement, pixel position. Walk **2.2 tiles/s**, run **3.6** (hold run / double-tap joystick). 🔧
- Collision: solid tiles (reservoir, well, farmhouse, fences, locked-land hedges). Simple AABB vs tile grid.
- **Tap-to-walk:** tap any walkable tile → A* path (4-dir, string-pulled) → auto-walk. Tap an interactable tile → walk adjacent + face it + show its action.
- Facing determines the **target tile** (the cell in front of the feet tile). Target is highlighted with a soft outline.

### Tools (bottom bar, swipe or number keys)
| Tool | Action on target | Stamina 🔧 |
|------|-----------------|------------|
| 🥾 Hand | Harvest mature crop / inspect | 2 |
| ⛏ Hoe | Till grass | 3 |
| 🚿 Watering can | Water tilled (+40 moisture, −10 reservoir) — must **refill at reservoir/channel** every 5 uses (realism + routing puzzle) | 1 |
| 🌱 Seed pouch | Plant selected crop (sub-picker for which seed) | 1 |
| 🔨 Builder | Channel / well / demolish placement (enters the existing build flow, canvas-highlighted) | 5 / 15 / 3 |

- **Hold-to-repeat:** keep the action button held and walk — the action re-fires on each new valid target tile. Watering a row feels like watering a row.
- Stamina 100/day, sleep refills (modified by late nights, §1). At 0: walk speed halves, actions blocked — go to bed. Coffee upgrade → +25 max. Big Can → 8 uses per refill + 60 moisture. Cart → farm stand sells without the walk to town… (kept as-is).
- **Why stamina numbers ≈ AP × 8:** v1's 12 AP supported ~12 actions; 100 stamina at these costs supports ~35–60 — because in real-time, *time and walking* are now also constraints. The harness (§7) re-validates the squeeze lands on day 8–12 as before.

---

## 4. Rendering Architecture

```
app/apps/farm-sim/
├── lib/engine/            ★ unchanged pure sim (+ applyDawnWeather split)
├── lib/realtime/          ★ NEW — also pure/deterministic where possible
│   ├── clock.ts           game-minute accumulator, schedule (dawn, dusk, 02:00)
│   ├── player.ts          position, velocity, collision, facing, target tile
│   ├── path.ts            A* + string pulling for tap-to-walk
│   ├── stamina.ts         costs, depletion, sleep refill rules
│   └── interact.ts        (player, tool, world) → PlayerAction | refill | none
├── render/                ★ NEW — canvas only, no game logic
│   ├── atlas.ts           builds the sprite atlas from sprite data at boot
│   ├── sprites/           the generated assets (§5): palette.ts, tiles.ts,
│   │                      crops.ts, farmer.ts, buildings.ts, fx.ts
│   ├── worldRenderer.ts   ground layer (offscreen-cached) + y-sorted objects
│   ├── lighting.ts        time-of-day color grade + night radial light
│   ├── particles.ts       rain, storm, frost sparkle, footstep dust, harvest pop
│   └── camera.ts          follows player, clamps to farm, pinch-zoom
└── components/
    ├── GameCanvas.tsx     rAF loop: fixed-timestep update(1/60), render(alpha)
    ├── Joystick.tsx       left-thumb virtual stick + action/run buttons
    ├── ToolBar.tsx        tool + seed selection
    └── (HUD, Market, Build, Recap — adapted, still DOM)
```

- **Fixed timestep:** accumulate real dt, `update()` at 60 Hz, render on rAF with interpolation. Clock ticks 1 game-minute per 0.7 s of *updated* time (so pause = pause).
- **Perf budget (phone):** ground layer pre-rendered to an offscreen canvas, redrawn only on tile change; per-frame draws = objects + particles + lighting ≈ well under 200 sprites on a 12×12 farm. Target 60 fps, degrade particles first.
- Autosave: every game-hour, on sleep, on `visibilitychange`.

---

## 5. Asset Pipeline — Generated Locally

**Format:** each sprite is a palette-indexed string grid in TS. Human-readable, diffable, tweakable by editing characters:

```ts
// render/sprites/farmer.ts — '.' = transparent
export const FARMER_DOWN_IDLE = sprite(`
  ....dddd....
  ...dhhhhd...
  ...dhffhd...      d=dark outline  h=hair
  ...dfffford..     f=skin  o=eye  r=mouth
  ....dffd....      s=shirt  p=pants  b=boots
  ..dssssssd..
  .dsdssssdsd.
  ...dppppd...
  ...dbd.dbd..
`);
```

`atlas.ts` parses every grid once at boot, paints them into a single offscreen canvas atlas, and hands the renderer `{sprite → uv}`. No PNGs in the repo; "asset editing" is a code diff.

**Palette:** one shared 32-colour earthy ramp set (soil ramp, foliage ramp, water ramp, skin/cloth, sky/light tints) in `palette.ts` — this is what makes it read "realistic" instead of clip-arty: every sprite pulls from the same graded ramps.

### Asset manifest (the actual work list)

| Set | Sprites | Frames | Notes |
|-----|---------|--------|-------|
| Terrain | grass ×3 variants, tilled dry, tilled **wet** (darker + sheen), locked hedge, dirt path | 8 | wet/dry soil is the moisture UI now |
| Water | reservoir, channel (auto-connecting: straight/corner/T/end via bitmask), well | 4 anim frames on water | animated shimmer |
| Crops | 6 crops × 4 growth stages + withered | 25 | stage 4 sways (2-frame) |
| Farmer | 4 directions × (idle + 2 walk) + water/hoe/harvest pose per direction | 24 | 12×18 px, drawn at 2× |
| Buildings | farmhouse (with door + bed inside as a simple interior overlay), farm stand | 2 | farmhouse = sleep point, stand = market point |
| Decoration | tree ×2, rock, grass tuft, fence, flowers ×2 | 7 | scatter on non-farm border for depth |
| FX | rain streak + splash, lightning flash, frost overlay, heat shimmer bands, footstep dust, harvest sparkle, stamina sweat drop | ~10 | particles.ts |
| Lighting | dawn/day/dusk/night color-grade LUTs, night radial glow | — | lighting.ts, not sprites |

~80 sprite cells total. This is 2 focused sessions of pixel authoring, done inside R0/R4 below.

---

## 6. UI in v2 (portrait)

```
┌──────────────────────────────────┐
│ ☀︎──────●────☾   💰342   ⚡▓▓▓░ 64 │ ← sun-arc clock · gold · stamina
│ today 🌧 │ ❄️70% · ☀️55% · ?      │ ← forecast strip (unchanged logic)
├──────────────────────────────────┤
│                                  │
│        CANVAS WORLD              │
│   (camera on farmer; tap =      │
│    walk; long-press = info)      │
│                                  │
│   ◐ joystick        (B run)      │
│  (left thumb)      (A action) →  │ ← overlaid controls, thumb zones
├──────────────────────────────────┤
│ [🥾][⛏][🚿][🌱][🔨]   💧130/200    │ ← tools · reservoir
└──────────────────────────────────┘
```

- Market/Build/Recap remain DOM sheets sliding over the canvas (clock pauses).
- Tutorial becomes diegetic: five signposts on the farm you walk past ("Till here →").

---

## 7. Build Phases

| Phase | Deliverable | Accepts when | Est. |
|-------|-------------|--------------|------|
| **R0 — Atlas & world render** | Palette, sprite pipeline, terrain/water/crop sprites, offscreen ground cache, camera, day-tint | Current v1 save renders as a living pixel farm at 60 fps on a phone; soil visibly wet/dry | 2 |
| **R1 — The farmer** | Sprite + walk anim, joystick/WASD/tap-to-walk (A*), collision, facing highlight, tools, hold-to-repeat, watering-can refill | Till→plant→water→harvest a row **entirely by walking**, no taps on tiles; long-press still opens info sheet | 2 |
| **R2 — Clock, stamina, sleep** | Real-time clock + pause rules, stamina costs/depletion, farmhouse+bed, sleep→`endDay`, night-passes recap, v1-save migrator | A full day is playable in ~11 min; oversleep/collapse penalties fire; old saves load | 1–2 |
| **R3 — Live weather & lighting** | `applyDawnWeather` split, rain/storm/frost/heat presentation, visible storm strikes, night lighting | Each of the 6 weathers is identifiable with the HUD hidden; determinism harness still green | 1–2 |
| **R4 — Realism pass** | Farmer action poses, crop sway, decorations, farm stand, footsteps/sparkle FX, shadows under everything | Side-by-side with R0 looks like a different game; still 60 fps | 2 |
| **R5 — Balance & fun test v2** | Harness bots re-modeled with time+stamina budgets, tune §3 numbers to restore the day-8–12 squeeze, bug sweep | Harness targets green; two seasons played on a phone; fun-test questionnaire from v1 re-run | 1 |

**Total ≈ 9–11 sessions.** Each phase ships playable; v1 stays the fallback on `master` until R2 lands (the pivot point where saves migrate).

---

## 8. Risks

| Risk | Mitigation |
|------|------------|
| Canvas perf on phones | Offscreen ground cache; particle degradation; 12×12 world is tiny by canvas standards |
| "Realistic" over-promise | Set expectation now: rich pixel art with lighting/weather/animation — not AI-painted scenes. The palette discipline in §5 is what buys the look |
| Walking becomes busywork, puzzle identity dies | Stamina + clock keep scarcity; hold-to-repeat and tap-to-walk kill the tedium; R5 gate exists precisely for this |
| Real-time layer contaminates engine purity | `lib/realtime/` mirrors engine discipline (pure, testable); all sim RNG still confined to engine streams; renderer forbidden from importing state mutators |
| Scope (character anim, interiors) | Farmer gets 24 frames max in M-scope; farmhouse interior is a fade-to-black overlay, not a second map |

## 9. Open Tuning Questions 🔧

- 0.7 s/game-min: too fast to plan, too slow to feel alive? First thing to feel-test in R2.
- Watering-can capacity (5) — enough routing pressure without being annoying?
- Should running cost stamina? (Currently free; adds realism, risks tedium.)
- Grid 12×12 was sized for tapping; walking may want 16×16 with the same tile economy — decide in R0 while the migrator is being written, not after.

---

## Immediate Next Step

R0: `palette.ts` + sprite pipeline + terrain/crop sprites + `GameCanvas` rendering the existing save with camera and day-tint. No behavior change yet — v1 controls keep working underneath until R1.
