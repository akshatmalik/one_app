# Farm Progression System

**Status:** Implemented progression milestone  
**North star:** The satisfying decision is how to arrange a reliable production system, not how many individual crops the player can click.

## 1. Scope and Design Principles

The farm remains a turn-based, day-resolution optimization game. Player actions are immediate and deterministic; `endDay(state)` resolves weather, water, soil, crops, machines, transport, and recipes. Keep the existing pure engine boundary: `applyAction(state, action) -> state` and `endDay(state) -> { state, recap }`. Extend `GameState`, `Tile`, `ItemId`, and `PlayerAction` additively, with balance values centralized in `lib/balance.ts`.

Core principles:

- **Automation is the reward for understanding.** Manual work is always viable at small scale; machines remove repetition and expose throughput constraints.
- **Every input has at least two useful destinations.** A crop can be sold, eaten, processed, or used to repair soil. This makes surpluses strategic rather than junk.
- **The player can predict a day.** Keep the existing seeded RNG discipline: derive streams from `(seed, day, system)` so mining, weather, markets, and machine outcomes do not change when the player reorders actions.
- **Bottlenecks should be visible and local.** A full crate, empty kiln, missing amendment, or slow route must explain why production stopped.

## 2. Crop Roles and Soil

Add these crop/terrain roles to the current crop table. The names describe the best soil, not hard planting restrictions; amendments can make a non-ideal tile productive.

| Crop | Preferred soil | Role | Design intent |
|---|---|---|---|
| Rice | Clay | Water-intensive staple and kiln input | Rewards connected channels, reservoir planning, and wet-field layouts. Rice paddies hold moisture but consume more water per night. |
| Carrot | Sand | Fast, low-input cash crop | Gives newly cleared sandy parcels a safe early use; lower yield but short grow time. |
| Corn | Loam | High-volume generalist | Feeds the kitchen and workshop, fills crates quickly, and becomes the throughput test for routes and storage. |

Existing crops retain their current identities: wheat is the safe filler and mill input; beans are the nitrogen-restoring rotation crop; potato is frost hardy; tomato is a thirsty summer premium; berries are a season-long regrow commitment; pumpkin is a fall lock-in payoff.

Each tile stores `soil` (`clay`, `sandy`, or `loam`), moisture, and nitrogen. Preferred soil preserves full yield; unsuitable soil applies the crop's visible `soilPenalty`, and no crop is impossible solely because of soil type. Beans continue to use the existing self/neighbor nitrogen behavior.

### Amendments

Amendments are consumable, tile-local inputs with clear jobs:

- **Compost/fertilizer:** restores nitrogen and converts open soil to loam; produced from beans and wood.
- **Mined clay:** two units convert an open tile to clay for rice paddies.
- **Crushed stone:** two units convert an open tile to sandy ground for carrots and drainage crops.

Amendment application is immediate and deterministic. The consumed input is shown in the tile sheet.

## 3. Deterministic Mining and Resource Chains

Rocks and exposed deposits in purchased parcels are deterministic nodes, not random loot. `revealedTerrain(parcel, idx, seed)` already makes parcel terrain reproducible; derive a deposit's type, amount, and quality from `(master seed, parcel, tile index)` and store only its depletion state. Mining the same node always produces the same result, regardless of action order. No respawning resource nodes in the initial version.

Deposit types:

- **Clay pit:** clay -> clay slurry, kiln bricks, pottery.
- **Stone seam:** stone -> kiln/workshop construction parts.
- **Coal seam:** coal -> kiln heat and workshop fuel; limited, so fuel automation still needs planning.
- **Iron seam:** iron ore + coal -> iron bars -> machine parts.

The basic chain is `deposit -> raw material -> amendment or machine part -> processed crop/meal -> export`. Field crates and `haulRoutes` should become generic typed storage and transport, preserving the current wheat route behavior as the first implementation. A route has a source, destination, item filter, rate per day, and priority. When a destination is full, the route pauses and reports the reason instead of destroying goods.

## 4. Kiln, Kitchen, and Workshop

Recipes are data, not switch statements. Each recipe declares inputs, output, required station level, and description. Crafting is immediate, while each station has a visible daily batch capacity of 3, 7, or 14 at levels 1-3. Capacity resets at dawn.

| Station | Starter recipes | Progression purpose |
|---|---|---|
| Kiln | clay + fuel -> brick; sand + fuel -> glass; clay + water -> fired pot | Converts mined materials into construction and storage capacity. Rice can optionally become rice brick only at a later kiln level; do not make the starter crop depend on it. |
| Kitchen | rice -> polished rice; corn -> cornmeal; potato + beans + carrot -> vegetable crate; tomato -> sauce | Turns crop diversity into higher-value exports without adding a town layer. |
| Workshop | cornmeal + wood -> fuel; iron bars + wood -> machine parts | Makes automation a farm-earned capability. |

The existing mill remains the first production tutorial: crates -> haul routes -> mill input -> flour output -> export. New stations should reuse its projection style (`productionProjection`, queue capacity, rate/day, days-to-clear) so the player sees one coherent factory flow.

## 5. Extractors and Automation

An **extractor** is a placed machine on a deposit tile. Manual mining yields up to two units per action; an extractor yields one, two, or three units each dawn according to its level. It costs bricks, machine parts, and gold, and removes itself when the deterministic deposit is exhausted.

Automation sequence:

1. **Manual tools:** till, plant, water, harvest, mine, and haul teach the relationships.
2. **Water network:** channels, wells, and sprinklers automate irrigation; retain `waterProjection` and reservoir-short recap events.
3. **Tractor:** unlocks `tillArea` over a contextual 3x3 area and consumes one fuel per pass.
4. **Seeder:** plants one selected crop across valid empty tilled tiles in a contextual 3x3 area and consumes one fuel per pass.
5. **Route automation:** field crates -> typed haul routes -> station buffers. Routes run at dawn like the current wheat routes.

Tractor and seeder actions are explicit and bounded. They never infer an unbounded area from a tap.

## 6. Progression Pacing

Use the existing 28-day seasons and parcel gates. The target first run is:

| Window | Player learns | Target unlock |
|---|---|---|
| Days 1-4 | Crop, moisture, nitrogen, sell/export | Wheat, carrot, first field crate |
| Days 5-10 | Soil specialization and rotations | Sand/clay identification, compost, first amendment |
| Days 11-18 | Throughput and storage | Mill/haul route pattern, corn, kiln foundation |
| Days 19-28 | Planning beyond manual labor | Extractor, kiln level 1, tractor purchase path |
| Season 2 | Reliable systems at larger scale | Rice paddies, kitchen, seeder, typed routes |
| Season 3 | Optimization and specialization | Workshop, advanced amendments, extractor upgrades |

Unlocks should arrive when the current bottleneck becomes legible: storage before the player routinely fills a crate, kiln before construction stalls, tractor before manual area work exceeds roughly 25% of a day, and seeder after the player has successfully completed at least two crop cycles. Avoid simultaneous unlock bursts. A strong farm can reach stable automation in about 60-80 in-game days; mastery is improving utilization and margins, not waiting for a final tier.

## 7. UI Legibility

The mobile portrait layout stays information-dense and operational. Keep the pinned HUD/action area and scrollable operations panel. Every machine and resource card must show the same four fields: **input -> rate/day -> buffer -> next blockage**. Use icons plus text, never color alone.

Required views:

- Tile sheet: soil type, moisture, nitrogen, crop role, amendment effect, and the next valid actions.
- Operations tab: one flow row per chain, with arrows, quantities, and days-to-full/days-to-clear.
- Contextual machine action: affected area, selected crop, available fuel, and skipped invalid tiles.
- Day recap: harvested, processed, mined, blocked, and lost quantities, with one actionable sentence for each blockage.

Use tabular numerals, stable columns, high contrast, and short labels that fit at 390x844. Keep the existing `ForecastStrip`, `WaterBar`, `MarketPanel`, and `TileSheet` roles; add detail rather than scattering resource facts across popovers.

## 8. Playtest Metrics and Acceptance Targets

Instrument deterministic runs and human sessions by day, seed, action, and blockage reason. Track:

- Time to first harvest, first amendment, first processed item, first extractor, tractor, and seeder.
- Manual actions per harvested tile and automation share of till/plant/water/haul/harvest work.
- Median days with a machine idle, route blocked, crate full, or station output full.
- Crop mix and preferred-soil adoption: rice/clay, carrot/sand, corn/loam should each appear in meaningful successful runs.
- Resource waste, crop deaths, reservoir shortages, and average end-of-season gold.
- UI comprehension: players can name the current bottleneck and predict tomorrow's output without opening more than one panel.

Initial targets: first harvest by day 5; first meaningful amendment by day 10; first automation purchase by day 20; under 15% of machine-days idle after the player has a route; under 10% of harvested goods lost to capacity; and fewer than 5% of successful runs ending with an unexplained blockage. Re-run the same seed with reordered legal actions to prove identical night results.

## 9. Non-Objectives

- No town simulation, villager schedules, relationship meters, or NPC quest economy.
- No flower collection, flower genetics, ornamental garden scoring, or flower-centered progression.
- No combat, dungeon loop, procedural loot, or resource respawn economy.
- No worker-management layer in this slice; machines and routes are the automation actors.
- No opaque idle timers: all meaningful production resolves in the existing day model and appears in the recap.
