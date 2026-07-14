// ============================================================================
// Farm Sim — Recap sentence builders. Pure, no React. Kept out of the engine
// so tone is editable without touching simulation logic. See PLAN §11.
// ============================================================================

import { RecapEvent, Weather } from './types';
import { WEATHER_META } from '../data/weather';

export function frostLoss(count: number, worst?: string): RecapEvent {
  const tail = worst ? ` The ${worst} didn't stand a chance.` : '';
  return {
    kind: 'frostLoss',
    severity: 'bad',
    text: `❄️ Frost killed ${count} crop${count === 1 ? '' : 's'}.${tail}`,
  };
}

export function stormLoss(count: number): RecapEvent {
  return {
    kind: 'stormLoss',
    severity: 'bad',
    text: `⛈️ The storm flattened ${count} ripe crop${count === 1 ? '' : 's'} before you could harvest.`,
  };
}

export function cropDied(count: number, example?: string): RecapEvent {
  const tail = example ? ` (${example} went first.)` : '';
  return {
    kind: 'cropDied',
    severity: 'bad',
    text: `🥀 ${count} crop${count === 1 ? '' : 's'} withered from thirst.${tail}`,
  };
}

export function reservoirShort(count: number): RecapEvent {
  return {
    kind: 'reservoirShort',
    severity: 'bad',
    text: `💧 The reservoir ran dry — ${count} irrigated tile${count === 1 ? '' : 's'} got no water this morning.`,
  };
}

export function cropMatured(count: number): RecapEvent {
  return {
    kind: 'cropMatured',
    severity: 'good',
    text: `✅ ${count} crop${count === 1 ? '' : 's'} ripened overnight and ${count === 1 ? 'is' : 'are'} ready to harvest.`,
  };
}

export function priceMove(crop: string, pct: number): RecapEvent {
  const dir = pct > 0 ? 'jumped' : 'dropped';
  return {
    kind: 'priceMove',
    severity: 'info',
    text: `📈 ${crop} ${dir} ${Math.abs(Math.round(pct * 100))}%.`,
  };
}

export function seasonChange(season: string): RecapEvent {
  return {
    kind: 'seasonChange',
    severity: 'info',
    text: `🗓️ A new season begins: ${season}.`,
  };
}

export function weatherFlavor(weather: Weather): RecapEvent {
  const lines: Record<Weather, string> = {
    sunny: 'A clear, dry day on the farm.',
    cloudy: 'Grey skies, gentle and mild.',
    rain: 'Rain soaked the fields and topped up the reservoir.',
    storm: 'A violent storm rolled through.',
    heatwave: 'A brutal heatwave baked the soil.',
    frost: 'A hard frost settled over everything.',
  };
  return {
    kind: 'weatherDrama',
    severity: 'info',
    text: `${WEATHER_META[weather].emoji} ${lines[weather]}`,
  };
}
