// ============================================================================
// Farm Sim — Data model (complete). See docs/FARM_SIM_PLAN.md §2.
// ============================================================================

export type Season = 'Spring' | 'Summer' | 'Fall';
export type Weather = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'heatwave' | 'frost';
export type CropId = 'wheat' | 'potato' | 'beans' | 'tomato' | 'berries' | 'pumpkin' | 'rice' | 'corn' | 'carrot';
export type SoilType = 'loam' | 'clay' | 'sandy';
export type ResourceId = 'wood' | 'stone' | 'clay' | 'coal' | 'ironOre';
export type TileKind = 'grass' | 'tilled' | 'channel' | 'reservoir' | 'well' | 'sprinkler' | 'barn' | 'coop' | 'shed' | 'market' | 'mill' | 'depot' | 'crate' | 'path' | 'brush' | 'rock' | 'marsh' | 'extractor' | 'locked';
export type UpgradeId = 'bigCan' | 'sickle' | 'rowPlow' | 'seedDrill' | 'tractor' | 'seeder' | 'truck';
export type UnlockId = 'irrigation' | 'mechanization' | 'precisionPlanting' | 'logistics';
export type ItemId = 'fertilizer' | 'flour' | 'bread' | 'milk' | 'egg' | 'fuel' | 'riceBag' | 'cornmeal' | 'vegetableCrate' | 'tomatoSauce' | 'bricks' | 'ironBars' | 'machineParts';
export type MachineType = 'tractor' | 'seeder';
export type FacilityId = 'kiln' | 'kitchen' | 'workshop';
export type RecipeId = 'compost' | 'charcoal' | 'fireBricks' | 'smeltIron' | 'bagRice' | 'grindCorn' | 'packVegetables' | 'cookSauce' | 'makeFuel' | 'machineParts';
export type AnimalType = 'cow' | 'chicken';
export type ParcelId = 'north' | 'south' | 'west' | 'east' | 'northwest' | 'northeast' | 'southwest' | 'southeast';

export interface Animal {
  id: string;
  type: AnimalType;
  fedToday: boolean;
  produceDays: number;
}

export interface Machine {
  id: string;
  type: MachineType;
  fuel: number;
  loadedCrop: CropId | null; // e.g. for seeder
}

export interface ResourceDeposit {
  resource: Extract<ResourceId, 'stone' | 'clay' | 'coal' | 'ironOre'>;
  remaining: number;
  max: number;
}

export interface FacilityState {
  level: number;
  usedToday: number;
}

export interface ExtractorState {
  id: string;
  idx: number;
  level: number;
}

export interface FarmContract {
  id: string;
  crop: CropId;
  quantity: number;
  rewardGold: number;
  rewardReputation: number;
  offeredDay: number;
  expiresDay: number;
  status: 'available' | 'completed';
}

export type ProductionMilestoneId =
  | 'firstHarvest'
  | 'reliableWater'
  | 'bufferStock'
  | 'firstFlour'
  | 'exportOperation';

export interface MillState {
  commissioned: boolean;
  level: number;
  input: number;
  output: number;
  inputCapacity: number;
  outputCapacity: number;
  ratePerDay: number;
}

export interface FieldCrate {
  id: string;
  idx: number;
  wheat: number;
  capacity: number;
}

export interface HaulRoute {
  id: string;
  crateId: string;
  level: number;
  ratePerDay: number;
}

export interface ProductionState {
  wheatStorageCapacity: number;
  harvestedWheat: number;
  rawWheatExported: number;
  wheatMilled: number;
  flourExported: number;
  automatedWaterings: number;
  harvestedToday: number;
  recentHarvests: number[];
  milestones: ProductionMilestoneId[];
}

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
  preferredSoils: SoilType[];
  soilPenalty: number; // yield multiplier outside preferred soil
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
  soil: SoilType;
  deposit?: ResourceDeposit;
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
  | 'contractExpired'
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
  time: number; // In-game time of day in minutes (0 to 1440)
  lastTickMs: number; // The real-world timestamp when the game was last updated (for advancing time)
  gold: number;
  tiles: Tile[]; // GRID_SIZE² row-major
  reservoir: number;
  wells: number;
  inventory: Record<CropId, number>; // harvested units held
  seeds: Record<CropId, number>;
  items: Record<ItemId, number>;
  resources: Record<ResourceId, number>;
  facilities: Record<FacilityId, FacilityState>;
  extractors: ExtractorState[];
  mill: MillState;
  fieldCrates: FieldCrate[];
  haulRoutes: HaulRoute[];
  parcels: Record<ParcelId, boolean>;
  production: ProductionState;
  machines: Machine[];
  animals: Animal[];
  contracts: FarmContract[];
  reputation: number;
  unlocks: UnlockId[];
  market: Record<CropId, MarketRow>;
  weatherTruth: Weather[]; // pre-rolled for current season (28 entries)
  forecast: (Weather | null)[]; // what the player was SHOWN for day+1..+3 (fixed once shown)
  marketVisitedToday: boolean;
  upgrades: UpgradeId[];
  lastRecap: DayRecap | null;
  tutorialStep: number; // onboarding progress, -1 when done
  opening?: OpeningProgress; // absent on legacy saves, which remain fully unlocked
  labor?: LaborProgress;
}

export interface LaborProgress {
  manualTills: number;
  manualPlants: number;
  manualWaterings: number;
  manualHarvests: number;
}

export interface OpeningProgress {
  stage: number;
  progress: number;
  complete: boolean;
}

export type PlayerAction =
  | { type: 'till'; idx: number }
  | { type: 'plant'; idx: number; crop: CropId }
  | { type: 'water'; idx: number }
  | { type: 'refillCan'; charges: number }
  | { type: 'harvest'; idx: number }
  | { type: 'tillRow'; idx: number }
  | { type: 'plantRow'; idx: number; crop: CropId }
  | { type: 'waterRow'; idx: number }
  | { type: 'harvestRow'; idx: number }
  | { type: 'harvestArea'; idx: number }
  | { type: 'buildChannel'; idx: number }
  | { type: 'buildSprinkler'; idx: number }
  | { type: 'clearLand'; idx: number }
  | { type: 'mine'; idx: number }
  | { type: 'buildExtractor'; idx: number }
  | { type: 'upgradeExtractor'; extractorId: string }
  | { type: 'amendSoil'; idx: number; soil: SoilType }
  | { type: 'craft'; recipe: RecipeId; qty: number }
  | { type: 'upgradeFacility'; facility: FacilityId }
  | { type: 'sellResource'; resource: ResourceId; qty: number }
  | { type: 'purchaseParcel'; parcel: ParcelId }
  | { type: 'buildFieldCrate'; idx: number }
  | { type: 'upgradeFieldCrate'; crateId: string }
  | { type: 'buildHaulRoute'; crateId: string }
  | { type: 'upgradeHaulRoute'; routeId: string }
  | { type: 'demolish'; idx: number } // channel/well/sprinkler → grass, no refund
  | { type: 'digWell'; idx: number }
  | { type: 'buySeeds'; crop: CropId; qty: number }
  | { type: 'buyItem'; item: ItemId; qty: number }
  | { type: 'sell'; crop: CropId; qty: number }
  | { type: 'deliverContract'; contractId: string }
  | { type: 'sellItem'; item: ItemId; qty: number }
  | { type: 'commissionMill' }
  | { type: 'upgradeMill' }
  | { type: 'loadMill'; qty: number }
  | { type: 'loadMillFromCrate'; crateId: string; qty: number }
  | { type: 'exportWheatFromCrate'; crateId: string; qty: number }
  | { type: 'exportFlour'; qty: number }
  | { type: 'expandWheatStorage' }
  | { type: 'expand'; idx: number }
  | { type: 'plantArea'; idx: number; crop: CropId }
  | { type: 'buyAnimal'; animal: AnimalType }
  | { type: 'buildBarn'; idx: number }
  | { type: 'buildCoop'; idx: number }
  | { type: 'fertilize'; idx: number }
  | { type: 'buyUpgrade'; upgrade: UpgradeId }
  | { type: 'buyMachine'; machineType: MachineType }
  | { type: 'loadMachine'; machineId: string }
  | { type: 'collectMachine'; machineId: string }
  | { type: 'eat'; item: string }
  | { type: 'buyWater' }
  | { type: 'buildStructure'; idx: number; kind: 'barn' | 'coop' }
  | { type: 'feedAnimal'; animalId: string }
  | { type: 'collectAnimal'; animalId: string }
  | { type: 'tillArea'; idx: number };

export interface ActionResult {
  ok: boolean;
  state: GameState; // unchanged when !ok
  error?: string;
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
