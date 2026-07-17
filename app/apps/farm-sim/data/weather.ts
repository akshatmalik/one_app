// ============================================================================
// Farm Sim — Season weather weight tables. See docs/FARM_SIM_PLAN.md §4.
// Weights per season sum to 100.
// ============================================================================

import { Season, Weather } from '../lib/types';

export const WEATHER_WEIGHTS: Record<Season, Partial<Record<Weather, number>>> = {
  Spring: { sunny: 45, cloudy: 20, rain: 35 },
  Summer: { sunny: 65, cloudy: 20, rain: 15 },
  Fall: { sunny: 40, cloudy: 30, rain: 30 },
};

export const WEATHER_META: Record<Weather, { emoji: string; label: string }> = {
  sunny: { emoji: '☀️', label: 'Sunny' },
  cloudy: { emoji: '⛅', label: 'Cloudy' },
  rain: { emoji: '🌧️', label: 'Rain' },
  storm: { emoji: '⛈️', label: 'Storm' },
  heatwave: { emoji: '🔥', label: 'Heatwave' },
  frost: { emoji: '❄️', label: 'Frost' },
};
