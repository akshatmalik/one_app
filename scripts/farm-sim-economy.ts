import { CROPS } from '../app/apps/farm-sim/data/crops';
import { CropId } from '../app/apps/farm-sim/lib/types';

type Portfolio = Partial<Record<CropId, number>>;

const STRATEGIES: Record<string, Portfolio> = {
  monoculture: { wheat: 1 },
  diversified: { wheat: 0.28, potato: 0.2, carrot: 0.17, beans: 0.15, corn: 0.2 },
  processed: { wheat: 0.22, beans: 0.1, corn: 0.22, rice: 0.16, tomato: 0.14, berries: 0.08, pumpkin: 0.08 },
};

const PROCESSING_MULTIPLIER: Partial<Record<CropId, number>> = {
  wheat: 1.8,
  potato: 1.35,
  beans: 1.35,
  carrot: 1.35,
  corn: 1.55,
  rice: 1.65,
  tomato: 1.6,
};

const CAPITAL_STEPS = [
  { at: 24, cap: 40, cost: 180, name: 'large can' },
  { at: 40, cap: 55, cost: 220, name: 'sickle' },
  { at: 55, cap: 75, cost: 260, name: 'row plow' },
  { at: 75, cap: 100, cost: 320, name: 'seed drill' },
  { at: 100, cap: 250, cost: 1800, name: 'tractor' },
  { at: 250, cap: 500, cost: 1450, name: 'machine attachments' },
  { at: 500, cap: 1000, cost: 3500, name: 'combine' },
] as const;

function rawNetPerTileDay(crop: CropId): number {
  const def = CROPS[crop];
  if (def.regrowDays) {
    const seasonalPicks = 4;
    return (seasonalPicks * def.yieldUnits * def.basePrice - def.seedCost) /
      (def.growDays + (seasonalPicks - 1) * def.regrowDays);
  }
  return (def.yieldUnits * def.basePrice - def.seedCost) / def.growDays;
}

function marketMultiplier(cropTiles: number, crop: CropId): number {
  const def = CROPS[crop];
  const dailyUnits = cropTiles * def.yieldUnits / def.growDays;
  return Math.max(0.5, 1 - Math.max(0, dailyUnits - 15) / 180);
}

function expansionCost(tiles: number): number {
  if (tiles < 24) return 14;
  if (tiles < 100) return 28;
  if (tiles < 250) return 50;
  if (tiles < 500) return 70;
  return 120;
}

function dailyProfit(tiles: number, portfolio: Portfolio, processing: boolean): number {
  let total = 0;
  const processingShare = !processing ? 0 : tiles < 100 ? 0 : tiles < 250 ? 0.2 : tiles < 500 ? 0.35 : 0.5;
  for (const [id, share] of Object.entries(portfolio) as [CropId, number][]) {
    const cropTiles = tiles * share;
    const rawMarket = marketMultiplier(cropTiles * (1 - processingShare), id);
    const processedMultiplier = PROCESSING_MULTIPLIER[id] ?? 1.15;
    const blendedReturn = (1 - processingShare) * rawMarket + processingShare * processedMultiplier;
    total += cropTiles * rawNetPerTileDay(id) * blendedReturn;
  }
  const fuelAndLogistics = tiles > 100 ? tiles * 0.35 : 0;
  return Math.max(0, total - fuelAndLogistics);
}

function simulate(portfolio: Portfolio, processing: boolean) {
  let day = 1;
  let tiles = 8;
  let capacity = 24;
  let cash = 120;
  let capitalIndex = 0;
  const milestones: Record<number, number> = {};
  const purchases: Array<{ day: number; name: string }> = [];

  while (day <= 300 && tiles < 1000) {
    cash += dailyProfit(tiles, portfolio, processing) * 0.72;
    const nextCapital = CAPITAL_STEPS[capitalIndex];
    if (nextCapital && tiles >= nextCapital.at && cash >= nextCapital.cost) {
      cash -= nextCapital.cost;
      capacity = nextCapital.cap;
      purchases.push({ day, name: nextCapital.name });
      capitalIndex++;
    }

    const affordable = Math.floor(cash / expansionCost(tiles));
    const added = Math.min(affordable, capacity - tiles, Math.max(1, Math.ceil(tiles * 0.12)));
    if (added > 0) {
      cash -= added * expansionCost(tiles);
      tiles += added;
    }
    for (const target of [24, 100, 250, 500, 1000]) if (!milestones[target] && tiles >= target) milestones[target] = day;
    day++;
  }
  return { milestones, purchases, finalCash: Math.round(cash) };
}

console.log('Crop unit economics (raw, before market pressure)');
console.table(Object.keys(CROPS).map((id) => {
  const crop = CROPS[id as CropId];
  return {
    crop: crop.name,
    days: crop.growDays,
    gross: crop.yieldUnits * crop.basePrice,
    seed: crop.seedCost,
    'net/tile-day': rawNetPerTileDay(id as CropId).toFixed(2),
  };
}));

for (const [name, portfolio] of Object.entries(STRATEGIES)) {
  const result = simulate(portfolio, name === 'processed');
  console.log(`\n${name}`);
  console.log('milestones', result.milestones);
  console.log('capital', result.purchases.map((purchase) => `D${purchase.day} ${purchase.name}`).join(' · '));
  console.log('final cash', result.finalCash);
}
