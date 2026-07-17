# API Expansion Playtest Findings

## Method

Both 35-day runs used seed `31415` and controlled the farm exclusively through `/apps/farm-sim/api/playtest`. They restored the mill, farmed wheat, built the same seven-channel/four-sprinkler network, processed flour, and expanded in response to production.

| Result | Throughput-first | Water-aware |
|---|---:|---:|
| Wheat harvested | 131 | 179 |
| Flour exported | 74 | 83 |
| Automated waterings | 51 | 170 |
| Wells | 0 | 3 |
| Dry crops at day 36 | 18 | 1 |
| Storage capacity required | 60 | 96 |
| Final gold | 3 | 86 |
| Rejected harvests | 5 | 6 |

## What Became Interesting

- The farm produced a genuine bottleneck sequence: manual water -> reservoir -> well yield -> sprinkler coverage -> mill throughput -> storage.
- Infrastructure changed the operator's behavior. The water-aware run paused planting to finance wells, then safely grew from four to 36 tilled tiles.
- Deterministic dawn demand made failures explainable. The final network demanded 100 water, wells supplied 90, and the remaining 10 came from the reservoir buffer.
- Flour revenue provided a useful reinvestment loop. New production paid for irrigation and storage instead of functioning as a passive score.

## What Still Feels Flat

1. **Authored goals do not sustain the loop.** The old production checklist was complete by day 10 and did not create a meaningful mid-season decision. It should remain hidden in favor of live system constraints.
2. **Mill throughput is a hard ceiling.** A fixed rate of three flour per dawn cannot match a 36-tile field. Storage expansion becomes a recurring tax instead of a strategic buffer.
3. **Land is free and uniform.** All open grass is immediately usable. A larger field increases counts, but does not feel like acquiring or transforming a larger farm.
4. **Storage is global.** The crate has a visual location but no catchment or transport rule, so layout does not affect harvest flow.
5. **Coverage is difficult to optimize.** Four sprinklers covered only 13 planted tiles in the final run. The build overlay shows radius, but does not compare cost, demand, and productive coverage.
6. **Water feedback arrives after failure.** Projected demand now exists in the API but is not yet visible in the player HUD.

## Recommended Expansion Arc

### 1. Make land transformation the progression surface

Divide the world into parcels containing rocks, brush, drainage problems, and different soil profiles. Expansion should require money plus an automation capability: clear brush manually, drain a wet parcel, bridge a ditch, or extend a supplied channel. The reward is not merely more tiles; each parcel should offer a new layout problem or resource advantage.

### 2. Turn production buildings into upgradeable bottlenecks

Give the mill visible modules: larger hopper, second grinding line, larger output bay, and reduced water/power cost. The first mill remains three/day; later investment should reach six and twelve/day. Parallel mills should compete with wells and land clearing for capital.

### 3. Make storage and movement physical

Field crates should receive harvest only within a small radius. A mill pulls from adjacent storage. Paths, carts, augers, or belts then connect remote fields. This is the point where a larger farm starts behaving like a farm-shaped Factorio system instead of a larger spreadsheet.

### 4. Expose engineering numbers before dawn

The build HUD should show `projected demand / daily supply / reservoir buffer`, productive sprinkler coverage, disconnected devices, mill days-to-clear, and storage days-to-full. Players should be able to predict failure and redesign before crops suffer.

These systems should remain available from economic and spatial context, without a scripted objective schedule. More crops or decorative buildings would add content without strengthening the optimization game.

## Implemented Slice Validation

A 55-day HTTP-only optimization run on seed `27182` purchased the south parcel, transformed it into a 65-tile operation, built three field crates and three routes (`12/6/6` wheat per day), and upgraded the mill to `12` flour per day. It harvested `468` wheat, raw-exported `210`, milled `207`, and exported `195` flour with no rejected actions.

The run's final problem was not a prescribed goal: the new parcel pushed projected irrigation demand to `170` against `90` daily supply, drained the reservoir, and left 39 crops dry. That failure is the intended source of the next goal. The player can add wells, reduce active acreage, redesign coverage, or use the new parcel for lower-water logistics instead of planting every available tile.
