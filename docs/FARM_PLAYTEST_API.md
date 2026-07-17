# Farm Playtest API

The development server exposes a deterministic farm operator API at:

```text
GET|POST /apps/farm-sim/api/playtest
```

It returns `404` in production. Sessions live in server memory and are isolated by a short `session` name.

## Read World State

```bash
curl 'http://localhost:3011/apps/farm-sim/api/playtest?session=my-run'
curl 'http://localhost:3011/apps/farm-sim/api/playtest?session=my-run&full=1'
```

The normal response includes an ASCII map, actionable tiles, water-network connectivity, sprinkler coverage, crop counts, storage, mill queues, production milestones, recent telemetry, and inferred bottlenecks. `full=1` also includes the authoritative `GameState`.

## Run Commands

```bash
curl -X POST http://localhost:3011/apps/farm-sim/api/playtest \
  -H 'content-type: application/json' \
  -d '{"session":"my-run","command":"reset","seed":42}'

curl -X POST http://localhost:3011/apps/farm-sim/api/playtest \
  -H 'content-type: application/json' \
  -d '{"session":"my-run","command":"action","action":{"type":"till","idx":168}}'

curl -X POST http://localhost:3011/apps/farm-sim/api/playtest \
  -H 'content-type: application/json' \
  -d '{"session":"my-run","command":"endDay"}'
```

Commands are `reset`, `action`, `batch`, `endDay`, and `advanceDays`. Actions include parcel purchase and clearing, crate construction and upgrades, manual or automated hauling, route upgrades, mill modules, irrigation, farming, and exports. A batch accepts up to 500 actions and stops at the first rejection unless `stopOnError` is `false`. Every attempt receives a revision and before/after resource delta.

## Expansion Operator

`scripts/farm-api-playtest.mts` plays only through HTTP. It begins with a small raw-grain field, then chooses between crates, routes, mill modules, wells, irrigation, land clearing, and parcel purchases according to current queue pressure and physical catchment.

```bash
npx tsx scripts/farm-api-playtest.mts \
  http://localhost:3011/apps/farm-sim/api/playtest 35 api-expansion 31415
```

The JSON output contains milestone timing, accepted and rejected action counts, five-day checkpoints, production throughput, field size, irrigation coverage, and unresolved bottlenecks.
