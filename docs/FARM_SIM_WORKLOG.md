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

**Build phases (R0→R5):**
| Phase | What | Status |
|-------|------|--------|
| R0 | Palette + sprite atlas + canvas world render + camera + day-tint | 🔄 In progress |
| R1 | Farmer sprite + movement + tools + hold-to-repeat | ⏳ Pending |
| R2 | Clock, stamina, sleep → endDay, v1-save migrator | ⏳ Pending |
| R3 | Live weather + lighting | ⏳ Pending |
| R4 | Realism pass — poses, sway, FX, shadows | ⏳ Pending |
| R5 | Balance retune + fun test | ⏳ Pending |

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

#### Next Up — R1 (Farmer character + movement)

- [ ] `render/sprites/farmer.ts` — 4 directions × (idle + 2 walk frames) = 12 frames at 12×18px, drawn at 2×
- [ ] `lib/realtime/player.ts` — pixel position, velocity, facing, target tile, collision vs tile grid
- [ ] `lib/realtime/path.ts` — A* (4-dir) + string-pull for tap-to-walk
- [ ] `lib/realtime/stamina.ts` — 100/day pool, per-action costs, sleep refill
- [ ] `lib/realtime/interact.ts` — (player facing, tool held) → `PlayerAction` + watering-can refill logic
- [ ] `components/Joystick.tsx` — left-thumb virtual stick + A (action) + B (run) buttons
- [ ] `components/ToolBar.tsx` — tool + seed selection strip
- [ ] Wire player update into `GameCanvas` fixed-timestep loop
- [ ] Hold-to-repeat: action re-fires on each new valid facing tile while button held
- [ ] Accept test: till→plant→water→harvest a row purely by walking, no tile taps
