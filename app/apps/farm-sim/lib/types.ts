// ============================================================================
// Farm Sim — Data model (complete). See docs/FARM_SIM_PLAN.md §2.
// ============================================================================

export type Season = 'Spring' | 'Summer' | 'Fall';
export type Weather = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'heatwave' | 'frost';
export type CropId = 'wheat' | 'potato' | 'beans' | 'tomato' | 'berries' | 'pumpkin';
export type TileKind = 'locked' | 'grass' | 'tilled' | 'channel' | 'reservoir' | 'well';
export type UpgradeId = 'bigCan' | 'cart' | 'coffee';

export interface CropDef {
  id: CropId;
  name: string;
  emoji: string; // M1 art
  seasons: Season[]; // plantable in
  growDays: number; // days to mature (stress days don't count)
  waterNeed: number; // moisture consumed per night
  nitrogenUse: number; // N consumed per growth night (negative = restores)
  seedCost: number;
  yieldUnits: number; // units per harvest
  basePrice: number; // per unit
  frostHardy: boolean;
  regrowDays?: number; // berries: re-mature this many days after harvest
  heatLover?: boolean; // tomato: heatwave + watered = 2 growth days
  seasonMod: Record<Season, number>; // market seasonal price modifier
}

export interface Crop {
  cropId: CropId;
  growthDays: number; // completed growth nights
  mature: boolean;
  stressDays: number; // consecutive nights below waterNeed
  regrowCounter?: number; // berries only
}

export interface Tile {
  kind: TileKind;
  moisture: number; // 0–100, only meaningful for tilled
  nitrogen: number; // 0–100
  crop: Crop | null;
  irrigated: boolean; // derived each dawn (connected-channel adjacency), cached for UI
}

export interface MarketRow {
  supply: number; // pressure multiplier, 0.5–1.0
  noise: number; // random-walk multiplier, 0.7–1.4
  history: number[]; // last 7 displayed prices, for sparklines
}

export type RecapKind =
  | 'weatherDrama'
  | 'cropDied'
  | 'cropMatured'
  | 'stormLoss'
  | 'frostLoss'
  | 'reservoirShort'
  | 'priceMove'
  | 'seasonChange'
  | 'harvestReady';

export interface RecapEvent {
  kind: RecapKind;
  text: string; // human sentence, built by the engine
  severity: 'info' | 'good' | 'bad';
}

export interface DayRecap {
  day: number;
  weather: Weather;
  events: RecapEvent[];
  goldDelta: number;
  waterDrawn: number;
  nextDay: number;
  nextWeather: Weather;
  reservoir: number;
  harvestReadyCount: number;
}

export interface GameState {
  version: 1;
  seed: number; // master seed; per-system streams derived from it
  day: number; // 1-based, global (day 29 = Summer 1)
  gold: number;
  ap: number; // remaining today
  apMax: number; // BASE_AP + upgrades
  tiles: Tile[]; // GRID_SIZE² row-major
  reservoir: number;
  wells: number;
  inventory: Record<CropId, number>; // harvested units held
  seeds: Record<CropId, number>;
  market: Record<CropId, MarketRow>;
  weatherTruth: Weather[]; // pre-rolled for current season (28 entries)
  forecast: (Weather | null)[]; // what the player was SHOWN for day+1..+3 (fixed once shown)
  marketVisitedToday: boolean; // first sell of the day costs 1 AP
  upgrades: UpgradeId[];
  lastRecap: DayRecap | null;
  tutorialStep: number; // onboarding progress, -1 when done
}

export type PlayerAction =
  | { type: 'till'; idx: number }
  | { type: 'plant'; idx: number; crop: CropId }
  | { type: 'water'; idx: number }
  | { type: 'harvest'; idx: number }
  | { type: 'buildChannel'; idx: number }
  | { type: 'demolish'; idx: number } // channel/well → grass, no refund
  | { type: 'digWell'; idx: number }
  | { type: 'expand'; idx: number }
  | { type: 'buySeeds'; crop: CropId; qty: number }
  | { type: 'sell'; crop: CropId; qty: number }
  | { type: 'buyUpgrade'; upgrade: UpgradeId };

export interface ActionResult {
  ok: boolean;
  state: GameState; // unchanged when !ok
  error?: string; // 'Not enough AP', 'Tomatoes can't be planted in Fall', …
}

export interface SaveSlotInfo {
  slot: number;
  day: number;
  gold: number;
  savedAt: string;
}

export interface FarmSaveRepository {
  load(slot: number): GameState | null;
  save(slot: number, state: GameState): void;
  listSlots(): SaveSlotInfo[];
  delete(slot: number): void;
}
