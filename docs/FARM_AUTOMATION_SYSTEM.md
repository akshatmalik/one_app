# Farm Automation System

**Status:** first automation vertical slice implemented  
**Scope:** farm operations only; no town or NPC layer

The current slice includes an authored operations yard, local field crates, haul routes, an upgradeable mill, flour exports, purchasable land parcels, terrain clearing, supplied channel sprinklers, engineering projections, save migration, and deterministic playtest/replay tooling. Power, conveyors, vehicles, and multi-stage processing remain later systems.

## North Star

The player should feel like a small farm operator designing a reliable production system: manual work teaches the constraints, irrigation removes repetitive labor, and processing turns a good harvest into a dependable export business. Every upgrade should change the shape of the work, not merely increase a number.

This extends the existing deterministic farm engine (`applyAction` during the work phase, `endDay` for resolution) and its weather, soil, water, market, real-time movement, and seeded-RNG rules. It follows familiar genre patterns: automation expands from local watering coverage and processing creates higher-value outputs through constrained machines.

Weather is intentionally simple: **Sunny**, **Cloudy**, or **Rain**, with an accurate three-day forecast. Seasons only change how often those states occur; there are no storms, heatwaves, frost events, or hidden forecast accuracy rules.

## Core Loop

1. **Plan:** read the short forecast, inspect water and soil, choose a field layout and wheat volume.
2. **Work manually:** move through the farm to till, plant, water, harvest, move stock, and sell/export.
3. **Automate:** build channels, reservoir capacity, pumps/sprinklers, storage, and mill capacity in response to the current bottleneck.
4. **Resolve:** sleep/end day applies weather, irrigation, crop growth, soil changes, market movement, and machine progress.
5. **Reinvest:** use export revenue to relieve the bottleneck the player cares about next.

The decision is always “what must I do by hand today so the system can run tomorrow?”

## Resource Graph

```text
water source -> reservoir -> channels/pump -> irrigated soil -> wheat -> harvest
                                                   |                    |
                                           manual watering               v
gold <- export <- flour <- mill <- wheat storage <- harvested wheat
```

- **Water:** rain/wells fill the reservoir; channels distribute it; irrigation tops connected tiles at dawn. Manual watering remains valid but consumes watering-can charges and reservoir water.
- **Soil:** tilling creates workable ground; growth consumes nitrogen; fallow/beans restore it. Dryness and low nitrogen reduce yield or kill crops under existing rules.
- **Inventory:** harvested wheat enters a nearby **field crate**, with finite local capacity. Full or distant crates block harvest until the player adds storage, improves hauling, or exports stock.
- **Production:** haul routes move wheat from crates into the mill. The mill consumes queued wheat over time and outputs flour; route and mill rates can become separate bottlenecks.
- **Export:** raw wheat and flour can be exported from the farm shipping point. Flour has higher value but adds storage, queue, and water/energy investment risk.

## Manual Farming

The first season starts with a small plot, basic tools, limited wheat seed, a reservoir, and enough capacity for a modest field. Manual actions are intentionally legible: face a tile, perform one operation, and see the immediate moisture or inventory change. Bulk actions can be added only after the single-tile interaction is reliable.

Acceptance rules:

- Planting requires tilled soil, seed, and a valid season.
- Harvesting moves mature wheat to storage, not directly to export.
- Watering is tile-local and competes with planting, harvesting, construction, and selling for the day.
- Weather and RNG are independent of action order; the same seed plus action log reproduces the result.
- A player can complete the first harvest without automation, but cannot comfortably scale the field manually.

## Mobile Interaction Contract

The farm view is mobile-first and uses the same interaction model on phones and desktop browsers:

- Tapping the world selects a tile and computes a deterministic four-way route around structures and terrain.
- The farmer walks to the destination automatically; dragging the world temporarily pans the following camera.
- The first tap never performs a destructive action. A contextual bottom sheet exposes only actions valid for the selected tile.
- Distant tiles remain inspectable while the farmer approaches, but actions unlock only within one tile of the target.
- The compact command dock contains tools, farm operations, construction mode, and sleep. Detailed crop, soil, water, storage, and production information appears only in contextual sheets.
- The same fixed-step movement fallback runs in background browser playtests so click paths and action logs remain replayable.

## Irrigation

Use the existing connected-channel/flood-fill model as the foundation. Add automation in this order:

| Upgrade | Function | Player tradeoff |
|---|---|---|
| Channel | Extends the reservoir's connected watering network | Gold and build time; layout matters |
| Pump/well | Adds reliable daily water input | High capital cost and limited placement |
| Sprinkler head | Automatically waters a small fixed neighborhood at dawn | Consumes water; requires a supplied channel/pump network |
| Reservoir/storage upgrade | Raises buffer capacity | Delays processing investment |

Automation must report coverage, water draw, blocked tiles, and next-dawn forecast in the HUD. Do not hide failure: a dry tile, empty reservoir, or disconnected head should be visually obvious and logged in the recap. Avoid “all farm” automation in the first season; local coverage creates meaningful layout decisions.

## Wheat -> Storage -> Mill -> Flour -> Export

### Required data and rules

- `inventory.wheat` remains legacy carried stock; current harvests enter the closest in-range field crate.
- Harvest fails cleanly when no reachable crate has room, with a clear action error and no crop loss.
- A mill accepts wheat only when powered/supplied and has input capacity, processing duration, output capacity, and a queue state.
- Initial tuning target: `1 wheat -> 1 flour`, mill processing takes 1 day, flour export value is about `1.8x` raw wheat value before market pressure. These are balance knobs, not economy guarantees.
- Exporting flour applies the existing market supply/noise model. Selling raw wheat remains a safe liquidity option and should be slightly less profitable.
- Storage and mill upgrades should first remove bottlenecks (capacity/throughput), then improve margin; never make manual farming irrelevant immediately.

### Player-visible chain

The farm HUD and production panel expose crate fill, days-to-full, route throughput, mill input and processing rate, days-to-clear, and ready flour. The player can prioritize raw export for cash or hold wheat for the higher-margin flour route.

## Optimization-Led Growth

The game does not prescribe production objectives. Growth comes from visible constraints and player intent:

- A full nearby crate suggests more storage, raw export, or faster hauling.
- A starving mill suggests a route or a better field-crate layout.
- A backed-up route suggests a route module or another mill line.
- An undersupplied water network suggests wells, less coverage, or a smaller active field.
- A saturated layout suggests purchasing and transforming another parcel.

Land, mill, route, storage, and irrigation upgrades remain available economic choices rather than rewards unlocked by a checklist. Legacy milestone counters may remain as playtest telemetry, but they are not shown as player goals.

## Visual and Asset Rules

- Farm is the first-viewport experience: field, water network, storage, and mill must read before menus.
- Use the current pixel-art/canvas direction and existing local asset conventions. Every production state needs a distinct visual: dry/wet soil, supplied/unsupplied irrigation, full/blocked storage, idle/working/blocked mill, raw wheat, flour, and export-ready crate.
- Use one consistent tile scale, strong silhouettes, and colorblind-safe state differences via icon/shape/animation plus color.
- Show flows with restrained overlays: water direction, coverage radius, input/output queue, and blocked reason. No decorative town skyline or NPC silhouettes.

## Playtest Metrics

Instrument seeded runs and human sessions at days 4, 10, 18, 24, and 28:

- time to first harvest, first automation, first flour, and first flour export;
- percentage of player-days with manual watering and percentage of irrigated tiles;
- storage overflow attempts, mill idle days, mill-blocked days, and raw-vs-flour export split;
- water shortages, crop deaths, rejected actions, and days with no meaningful action;
- median gold, total flour throughput, and positive-cash completion rate across 200 seeds;
- player comprehension: can a tester explain why a tile/mill is blocked without assistance?

Initial targets: first harvest by day 10, first automation by day 18, first flour export by day 28, fewer than 10% of seeded runs ending bankrupt, and no more than 5% of days ending with an unexplained blocked action.

## Explicitly Out of Scope

- Town, NPCs, dialogue, friendship, reputation, quests, contracts, and visiting external shops.
- Animals, animal products, cooking, bakery, additional crops beyond wheat for the chain test, and multi-stage recipes beyond flour.
- Workers, staff scheduling, autonomous vehicle pathing, multiplayer, and off-farm logistics simulation.
- Seasons beyond the existing first-season rules, winter survival, festivals, and narrative campaign progression.
- Spoilage, quality grades, research trees, cosmetic decoration systems, and complex power grids.

The implementation is complete when a player can manually grow wheat, build a visible local irrigation system, store and mill the harvest, export flour, and understand every bottleneck from the farm view alone.
