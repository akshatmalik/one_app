// ============================================================================
// Farm Sim — Weather engine. Pure. See docs/FARM_SIM_PLAN.md §4.
//
// Truth is pre-rolled per season. Forecast is a "committed lie": generated once
// when a day first becomes visible (at day-3) and never re-rolled.
// ============================================================================

import { Season, Weather } from '../types';
import { SEASON_LENGTH, SEASONS, FORECAST_ACCURACY } from '../balance';
import { WEATHER_WEIGHTS } from '../../data/weather';
import { streamRng, weightedPick } from './rng';

// Global day (1-based) → season.
export function seasonForDay(day: number): Season {
  const seasonIndex = Math.floor((day - 1) / SEASON_LENGTH) % SEASONS.length;
  return SEASONS[seasonIndex];
}

// Global day (1-based) → 0-based index within its season.
export function dayOfSeason(day: number): number {
  return (day - 1) % SEASON_LENGTH;
}

// Which season number (0-based, ever-increasing) a day belongs to.
export function seasonNumber(day: number): number {
  return Math.floor((day - 1) / SEASON_LENGTH);
}

// Pre-roll all SEASON_LENGTH days of the season that `day` falls in.
// Uses the season number so re-entering a season reproduces the same weather.
export function rollSeasonWeather(seed: number, day: number): Weather[] {
  const season = seasonForDay(day);
  const sNum = seasonNumber(day);
  const weights = WEATHER_WEIGHTS[season];
  // One RNG stream per season, keyed by season number in the `day` slot.
  const rng = streamRng(seed, 1000 + sNum, 'weather');
  const out: Weather[] = [];
  for (let i = 0; i < SEASON_LENGTH; i++) {
    out.push(weightedPick(weights, rng()));
  }
  return out;
}

// Generate the forecast the player is SHOWN for a specific global day, given the
// truth. Committed: keyed by the target day so it never changes once shown.
// `offset` is how many days ahead (1..3) → accuracy tier.
export function forecastFor(
  seed: number,
  targetDay: number,
  truth: Weather,
  offset: number
): Weather {
  const accuracy = FORECAST_ACCURACY[offset - 1] ?? 0.5;
  const rng = streamRng(seed, 5000 + targetDay, 'forecast');
  if (rng() < accuracy) return truth; // told the truth
  // Otherwise show a decoy sampled from the season table, excluding the truth.
  const season = seasonForDay(targetDay);
  const weights = { ...WEATHER_WEIGHTS[season] };
  delete (weights as Record<string, number>)[truth];
  return weightedPick(weights, rng());
}

// Build the 3-day forecast window (day+1..+3) shown at the current day.
export function buildForecast(
  seed: number,
  currentDay: number,
  currentSeasonTruth: Weather[]
): (Weather | null)[] {
  const out: (Weather | null)[] = [];
  for (let offset = 1; offset <= 3; offset++) {
    const targetDay = currentDay + offset;
    // Truth for the target day — may live in the next season (not yet rolled).
    if (seasonNumber(targetDay) !== seasonNumber(currentDay)) {
      out.push(null); // next season's weather isn't known yet — shows "?"
      continue;
    }
    const truth = currentSeasonTruth[dayOfSeason(targetDay)];
    out.push(forecastFor(seed, targetDay, truth, offset));
  }
  return out;
}
