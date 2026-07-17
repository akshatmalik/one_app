// ============================================================================
// Farm Sim — endDay resolution. Pure & deterministic. See docs/FARM_SIM_PLAN.md §9.
//
// ORDER MATTERS. Do not reorder casually:
//   frost → rain/storm → wells → irrigation → crops → evaporation → soil
//   → market → advance → recap
// This ordering is what makes "rain saves the morning water" and "heatwave
// hits even watered crops" true.
// ============================================================================

import { DayRecap, GameState, RecapEvent, Tile, Weather } from '../types';
import {
  RESERVOIR_CAP,
  RAIN_RESERVOIR_GAIN,
  WELL_DAILY_YIELD,
  IRRIGATION_TARGET,
  RAIN_TILE_GAIN,
  EVAPORATION,
  FALLOW_N_REGEN,
  GRASS_N_REGEN,
  PRICE_MOVE_RECAP_THRESHOLD,
  STORM_DESTROY_CHANCE,
  SPRINKLER_WATER_DRAW,
  SPRINKLER_MOISTURE,
} from '../balance';
import { CROPS } from '../../data/crops';
import { streamRng } from './rng';
import {
  seasonForDay,
  dayOfSeason,
  seasonNumber,
  rollSeasonWeather,
  normalizeSeasonWeather,
  buildForecast,
} from './weather';
import { computeIrrigation, allNeighbors, connectedChannels, orthoNeighbors } from './water';
import { resolveCropNight, applyBeanNeighborBonus } from './crops';
import { getPrice, stepMarket } from './market';
import { clamp, cloneState } from './util';
import * as recap from '../recap-text';
import { refreshContracts } from './contracts';
import { syncProductionMilestones } from './production';
import { WAKE_MINUTES } from '../realtime/clock';

export function endDay(state: GameState): { state: GameState; recap: DayRecap } {
  const s = cloneState(state);
  s.weatherTruth = normalizeSeasonWeather(s.seed, s.day, s.weatherTruth);
  const weather: Weather = s.weatherTruth[dayOfSeason(s.day)];
  const events: RecapEvent[] = [];
  const goldBefore = s.gold;
  let waterDrawn = 0;
  const expiredContracts = s.contracts.filter(
    (contract) => contract.status === 'available' && contract.expiresDay === state.day
  ).length;

  // Snapshot prices before market step, to detect big moves.
  const priceBefore: Record<string, number> = {};
  for (const id of Object.keys(s.market)) priceBefore[id] = getPrice(s, id as keyof typeof s.market);

  // ── 2. FROST ──────────────────────────────────────────
  if (weather === 'frost') {
    let killed = 0;
    let worst: string | undefined;
    let worstVal = -1;
    for (const t of s.tiles) {
      if (t.crop) {
        const def = CROPS[t.crop.cropId];
        if (!def.frostHardy) {
          if (def.basePrice > worstVal) {
            worstVal = def.basePrice;
            worst = def.name;
          }
          t.crop = null;
          killed++;
        }
      }
    }
    if (killed > 0) events.push(recap.frostLoss(killed, worst));
  }

  // ── 3. RAIN / STORM ───────────────────────────────────
  if (weather === 'rain' || weather === 'storm') {
    for (const t of s.tiles) {
      if (t.kind === 'tilled') t.moisture = Math.min(100, t.moisture + RAIN_TILE_GAIN);
    }
    s.reservoir = Math.min(RESERVOIR_CAP, s.reservoir + RAIN_RESERVOIR_GAIN);
  }
  if (weather === 'storm') {
    const stormRng = streamRng(s.seed, s.day, 'storm');
    let destroyed = 0;
    for (const t of s.tiles) {
      if (t.crop && t.crop.mature) {
        if (stormRng() < STORM_DESTROY_CHANCE) {
          t.crop = null;
          destroyed++;
        }
      }
    }
    if (destroyed > 0) events.push(recap.stormLoss(destroyed));
  }

  // ── 4. WELLS ──────────────────────────────────────────
  if (s.wells > 0) {
    s.reservoir = Math.min(RESERVOIR_CAP, s.reservoir + WELL_DAILY_YIELD * s.wells);
  }

  // ── 5. IRRIGATION (row-major; reservoir can run dry mid-pass) ──
  const irrigated = computeIrrigation(s.tiles);
  let shorted = 0;
  s.tiles.forEach((t, idx) => {
    t.irrigated = irrigated[idx];
    if (irrigated[idx] && t.kind === 'tilled' && t.moisture < IRRIGATION_TARGET) {
      const need = IRRIGATION_TARGET - t.moisture;
      if (s.reservoir >= need) {
        s.reservoir -= need;
        waterDrawn += need;
        t.moisture = IRRIGATION_TARGET;
      } else if (s.reservoir > 0) {
        t.moisture += s.reservoir;
        waterDrawn += s.reservoir;
        s.reservoir = 0;
        shorted++;
      } else {
        shorted++;
      }
    }
  });

  // ── 5.5 SPRINKLERS ────────────────────────────────────
  const suppliedChannels = connectedChannels(s.tiles);
  suppliedChannels.forEach((idx) => { s.tiles[idx].irrigated = true; });
  s.tiles.forEach((tile, idx) => {
    if (tile.kind === 'channel' && !suppliedChannels.has(idx)) tile.irrigated = false;
  });
  s.tiles.forEach((t, idx) => {
    if (t.kind === 'sprinkler') {
      const supplied = orthoNeighbors(idx).some((neighbor) => suppliedChannels.has(neighbor));
      t.irrigated = supplied;
      if (!supplied) return;
      if (s.reservoir >= SPRINKLER_WATER_DRAW) {
        s.reservoir -= SPRINKLER_WATER_DRAW;
        waterDrawn += SPRINKLER_WATER_DRAW;
        const neighbors = allNeighbors(idx);
        for (const n of neighbors) {
          const nt = s.tiles[n];
          if (nt.kind === 'tilled') {
            nt.moisture = clamp(nt.moisture + SPRINKLER_MOISTURE, 0, 100);
            s.production.automatedWaterings += 1;
          }
        }
      } else {
        shorted++; // Count as a reservoir short
      }
    }
  });

  if (shorted > 0) events.push(recap.reservoirShort(shorted));

  // ── 6. CROPS ──────────────────────────────────────────
  let died = 0;
  let matured = 0;
  let diedExample: string | undefined;
  for (const t of s.tiles) {
    if (t.crop) {
      const outcome = resolveCropNight(t, weather);
      if (outcome.died) {
        died++;
        if (!diedExample) diedExample = outcome.cropName;
      }
      if (outcome.matured) matured++;
    }
  }
  applyBeanNeighborBonus(s.tiles);
  if (died > 0) events.push(recap.cropDied(died, diedExample));
  if (matured > 0) events.push(recap.cropMatured(matured));

  // ── 7. EVAPORATION ────────────────────────────────────
  const evap = EVAPORATION[weather] ?? 0;
  for (const t of s.tiles) {
    if (t.kind === 'tilled') t.moisture = Math.max(0, t.moisture - evap);
  }

  // ── 8. SOIL REGEN (fallow tilled + grass) ─────────────
  for (const t of s.tiles) {
    if (t.kind === 'tilled' && !t.crop) t.nitrogen = clamp(t.nitrogen + FALLOW_N_REGEN, 0, 100);
    else if (t.kind === 'grass') t.nitrogen = clamp(t.nitrogen + GRASS_N_REGEN, 0, 100);
  }

  // ── 9. MARKET ─────────────────────────────────────────
  const marketRng = streamRng(s.seed, s.day, 'market');
  s.market = stepMarket(s.market, s, marketRng);

  // ── 9.5 MACHINES ──────────────────────────────────────
  if (s.mill.commissioned) {
    for (const route of s.haulRoutes) {
      const crate = s.fieldCrates.find((candidate) => candidate.id === route.crateId);
      if (!crate || crate.wheat <= 0 || s.mill.input >= s.mill.inputCapacity) continue;
      const moved = Math.min(route.ratePerDay, crate.wheat, s.mill.inputCapacity - s.mill.input);
      crate.wheat -= moved;
      s.mill.input += moved;
    }
  }
  if (s.mill.commissioned && s.mill.input > 0 && s.mill.output < s.mill.outputCapacity) {
    const processed = Math.min(s.mill.ratePerDay, s.mill.input, s.mill.outputCapacity - s.mill.output);
    s.mill.input -= processed;
    s.mill.output += processed;
    s.production.wheatMilled += processed;
    events.push({
      kind: 'harvestReady',
      text: `The mill finished ${processed} flour. ${s.mill.output}/${s.mill.outputCapacity} is ready at the depot.`,
      severity: 'good',
    });
  }
  s.production.recentHarvests = [...s.production.recentHarvests, s.production.harvestedToday].slice(-7);
  s.production.harvestedToday = 0;
  syncProductionMilestones(s);
  // ── Machines
  for (const m of s.machines) {
    // Tractor/Seeder don't process items overnight
  }

  // ── Animals
  for (const a of s.animals) {
    if (a.fedToday) {
      if (a.produceDays > 0) a.produceDays -= 1;
    }
    a.fedToday = false;
  }

  // ── 10. ADVANCE DAY ───────────────────────────────────
  const prevSeasonNum = seasonNumber(s.day);
  s.day += 1;
  s.time = WAKE_MINUTES;
  s.lastTickMs = Date.now();
  const newSeasonNum = seasonNumber(s.day);
  if (newSeasonNum !== prevSeasonNum) {
    // New season: re-roll truth, clear dead/out-of-season berries.
    s.weatherTruth = rollSeasonWeather(s.seed, s.day);
    for (const t of s.tiles) {
      if (t.crop && t.crop.cropId === 'berries') {
        t.crop = null; // berries don't survive a season change
      }
    }
    events.push(recap.seasonChange(seasonForDay(s.day)));
  }
  s.forecast = buildForecast(s.seed, s.day, s.weatherTruth);
  s.contracts = refreshContracts(s);
  s.marketVisitedToday = false;

  // ── 11. RECAP (worst-first ordering) ──────────────────
  // Price moves ≥ threshold.
  for (const id of Object.keys(s.market)) {
    const after = getPrice(s, id as keyof typeof s.market);
    const before = priceBefore[id];
    if (before > 0) {
      const pct = (after - before) / before;
      if (Math.abs(pct) >= PRICE_MOVE_RECAP_THRESHOLD) {
        events.push(recap.priceMove(CROPS[id as keyof typeof CROPS].name, pct));
      }
    }
  }
  if (expiredContracts > 0) {
    events.push({
      kind: 'contractExpired',
      text: `${expiredContracts} local order${expiredContracts === 1 ? '' : 's'} expired. New work is posted.`,
      severity: 'info',
    });
  }
  // Weather flavor last.
  events.push(recap.weatherFlavor(weather));

  const nextWeather = s.weatherTruth[dayOfSeason(s.day)];
  const harvestReadyCount = s.tiles.filter((t) => t.crop && t.crop.mature).length;

  const dayRecap: DayRecap = {
    day: state.day,
    weather,
    events,
    goldDelta: s.gold - goldBefore,
    waterDrawn,
    nextDay: s.day,
    nextWeather,
    reservoir: s.reservoir,
    harvestReadyCount,
  };
  s.lastRecap = dayRecap;

  return { state: s, recap: dayRecap };
}
