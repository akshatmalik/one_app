// ============================================================================
// Farm Sim — Season weather weight tables. See docs/FARM_SIM_PLAN.md §4.
// Weights per season sum to 100.
// ============================================================================

import { Season, Weather } from '../lib/types';

export const WEATHER_WEIGHTS: Record<Season, Record<Weather, number>> = {
  Spring: { sunny: 35, cloudy: 10, rain: 30, storm: 10, heatwave: 5, frost: 10 },
  Summer: { sunny: 40, cloudy: 10, rain: 15, storm: 10, heatwave: 25, frost: 0 },
  Fall: { sunny: 35, cloudy: 10, rain: 25, storm: 10, heatwave: 5, frost: 15 },
};

export const WEATHER_META: Record<Weather, { emoji: string; label: string }> = {
  sunny: { emoji: '☀️', label: 'Sunny' },
  cloudy: { emoji: '⛅', label: 'Cloudy' },
  rain: { emoji: '🌧️', label: 'Rain' },
  storm: { emoji: '⛈️', label: 'Storm' },
  heatwave: { emoji: '🔥', label: 'Heatwave' },
  frost: { emoji: '❄️', label: 'Frost' },
};
