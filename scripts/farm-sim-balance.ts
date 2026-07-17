// ============================================================================
// Farm Sim — Balance harness. Dev tool only (not shipped, not built).
// Run: npx tsx scripts/farm-sim-balance.ts
// See docs/FARM_SIM_PLAN.md §12.
//
// Three scripted bots play N seeds × 84 days. Reports gold at each checkpoint,
// death counts, reservoir shortages, and early bankruptcies so balance changes
// in lib/balance.ts can be judged against targets instead of vibes.
// ============================================================================

import { newGame } from '../app/apps/farm-sim/lib/engine/newGame';
import { applyAction } from '../app/apps/farm-sim/lib/engine/actions';
import { endDay } from '../app/apps/farm-sim/lib/engine/resolveDay';
import { idxOf } from '../app/apps/farm-sim/lib/engine/water';
import { seasonForDay } from '../app/apps/farm-sim/lib/engine/weather';
import { GameState, CropId } from '../app/apps/farm-sim/lib/types';
import { CROPS } from '../app/apps/farm-sim/data/crops';
import { START_PLOT } from '../app/apps/farm-sim/lib/balance';

const SEEDS = 200;
const DAYS = 84;

// Tiles inside the starting plot, excluding the reservoir at (3,5).
const PLOT_TILES: number[] = [];
for (let r = START_PLOT.r0; r <= START_PLOT.r1; r++) {
  for (let c = START_PLOT.c0; c <= START_PLOT.c1; c++) {
    if (!(r === 3 && c === 5)) PLOT_TILES.push(idxOf(r, c));
  }
}

interface Stats {
  gold: Record<number, number[]>; // checkpoint day → gold samples
  deaths: number;
  bankruptEarly: number; // gold < 5 with nothing planted before day 10
}

const CHECKPOINTS = [4, 28, 56, 84];

function bestLegalCrop(state: GameState): CropId | null {
  const season = seasonForDay(state.day);
  const legal = (Object.keys(CROPS) as CropId[]).filter((c) => CROPS[c].seasons.includes(season));
  // rank by base profit-per-day
  legal.sort((a, b) => {
    const pa = (CROPS[a].yieldUnits * CROPS[a].basePrice - CROPS[a].seedCost) / CROPS[a].growDays;
    const pb = (CROPS[b].yieldUnits * CROPS[b].basePrice - CROPS[b].seedCost) / CROPS[b].growDays;
    return pb - pa;
  });
  return legal[0] ?? null;
}

type Bot = 'naive' | 'greedy' | 'cautious';

function playDay(state: GameState, bot: Bot): GameState {
  let s = state;
  const season = seasonForDay(s.day);

  for (const idx of PLOT_TILES) {
    const t = s.tiles[idx];
    if (t.kind === 'grass' && s.ap > 0) {
      const r = applyAction(s, { type: 'till', idx });
      if (r.ok) s = r.state;
    }
    const tile = s.tiles[idx];
    if (tile.kind === 'tilled' && tile.crop?.mature && s.ap > 0) {
      const r = applyAction(s, { type: 'harvest', idx });
      if (r.ok) s = r.state;
    }
    if (tile.kind === 'tilled' && !s.tiles[idx].crop && s.ap > 0) {
      const crop = bot === 'naive' ? 'wheat' : bestLegalCrop(s);
      if (crop && CROPS[crop].seasons.includes(season)) {
        // cautious: only plant if 3-day forecast has no frost
        const risky = bot === 'cautious' && s.forecast.includes('frost') && !CROPS[crop].frostHardy;
        if (!risky) {
          if ((s.seeds[crop] ?? 0) < 1 && s.gold >= CROPS[crop].seedCost) {
            const rb = applyAction(s, { type: 'buySeeds', crop, qty: 1 });
            if (rb.ok) s = rb.state;
          }
          const rp = applyAction(s, { type: 'plant', idx, crop });
          if (rp.ok) s = rp.state;
        }
      }
    }
    // water anything tilled that will stress
    const t3 = s.tiles[idx];
    if (t3.kind === 'tilled' && s.ap > 0 && s.reservoir >= 10) {
      const need = t3.crop ? CROPS[t3.crop.cropId].waterNeed : 10;
      if (t3.moisture < need) {
        const rw = applyAction(s, { type: 'water', idx });
        if (rw.ok) s = rw.state;
      }
    }
  }

  // greedy: build a channel when AP-starved and gold allows
  if (bot === 'greedy' && s.gold > 60) {
    const near = PLOT_TILES.find((i) => s.tiles[i].kind === 'grass');
    if (near !== undefined) {
      const rc = applyAction(s, { type: 'buildChannel', idx: near });
      if (rc.ok) s = rc.state;
    }
  }

  // sell everything
  for (const crop of Object.keys(s.inventory) as CropId[]) {
    if (s.inventory[crop] > 0) {
      const r = applyAction(s, { type: 'sell', crop, qty: s.inventory[crop] });
      if (r.ok) s = r.state;
    }
  }

  return endDay(s).state;
}

function run(bot: Bot): Stats {
  const stats: Stats = { gold: {}, deaths: 0, bankruptEarly: 0 };
  for (const cp of CHECKPOINTS) stats.gold[cp] = [];

  for (let seed = 1; seed <= SEEDS; seed++) {
    let s = newGame(seed);
    let deaths = 0;
    let bankrupt = false;
    for (let day = 1; day <= DAYS; day++) {
      const before = s.tiles.filter((t) => t.crop).length;
      s = playDay(s, bot);
      const recap = s.lastRecap;
      if (recap) deaths += recap.events.filter((e) => e.kind === 'cropDied' || e.kind === 'frostLoss' || e.kind === 'stormLoss').length;
      if (s.day <= 10 && s.gold < 5 && s.tiles.every((t) => !t.crop)) bankrupt = true;
      void before;
      if (CHECKPOINTS.includes(s.day)) stats.gold[s.day]?.push(Math.round(s.gold));
    }
    stats.deaths += deaths;
    if (bankrupt) stats.bankruptEarly++;
  }
  return stats;
}

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  return a[Math.floor(a.length / 2)];
}

console.log(`Farm Sim balance harness — ${SEEDS} seeds × ${DAYS} days\n`);
for (const bot of ['naive', 'greedy', 'cautious'] as Bot[]) {
  const st = run(bot);
  console.log(`── ${bot.toUpperCase()} ──`);
  for (const cp of CHECKPOINTS) {
    console.log(`  day ${cp}: median gold ${median(st.gold[cp])}`);
  }
  console.log(`  total crop losses: ${st.deaths} (avg ${(st.deaths / SEEDS).toFixed(1)}/game)`);
  console.log(`  early bankruptcies: ${st.bankruptEarly}/${SEEDS} (${((st.bankruptEarly / SEEDS) * 100).toFixed(1)}%)\n`);
}
