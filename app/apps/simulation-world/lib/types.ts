export type GoodId = 'grain' | 'flour' | 'bread' | 'firewood' | 'tools';
export type BusinessKind = 'farm' | 'mill' | 'bakery' | 'woodcutter' | 'blacksmith' | 'merchant' | 'estate';
export type EventTone = 'good' | 'warn' | 'bad' | 'info';
export type FarmPhase = 'prepare' | 'grow' | 'harvest' | 'fallow';

export type Goods = Record<GoodId, number>;

export interface Citizen {
  id: string;
  name: string;
  householdId: string;
  age: number;
  adult: boolean;
  retired: boolean;
  partnerId: string | null;
  parentIds: string[];
  employerId: string | null;
  skill: BusinessKind;
  health: number;
  hunger: number;
  morale: number;
  hoursWorkedToday: number;
  wagePaidToday: number;
  wageArrears: number;
  positionX: number;
  positionY: number;
  location: 'home' | 'work' | 'market';
  journey: {
    fromX: number;
    fromY: number;
    viaX: number;
    viaY: number;
    toX: number;
    toY: number;
    startedDay: number;
    startedHour: number;
    durationHours: number;
    destination: 'home' | 'work' | 'market';
  } | null;
}

export interface Household {
  id: string;
  name: string;
  memberIds: string[];
  coins: number;
  goods: Goods;
  dailyRent: number;
  rentArrears: number;
  debt: number;
  missedMeals: number;
  reservationWage: number;
  ownedBusinessIds: string[];
  foodSecureDays: number;
  incomeToday: number;
  spendingToday: number;
  subsistenceToday: number;
  lastIncome: number;
  lastSpending: number;
  lastSubsistence: number;
  homeX: number;
  homeY: number;
  homeBuiltDay: number;
  district: 'old-market' | 'mill-lane' | 'southward' | 'west-gate' | 'river-ward';
}

export interface FarmState {
  phase: FarmPhase;
  phaseDay: number;
  taskHoursRemaining: number;
  cropGrowthDays: number;
  careHours: number;
  landAcres: number;
  cultivatedAcres: number;
  plannedAcres: number;
  expectedDailySales: number;
  inventoryDays: number;
  dailyLaborHours: number;
  harvests: number;
  fieldX: number;
  fieldY: number;
  fieldWidthMeters: number;
  fieldHeightMeters: number;
  distanceToTownMeters: number;
  travelHoursPerWorker: number;
  productiveHoursPerWorker: number;
  internalTravelHours: number;
}

export interface Business {
  id: string;
  name: string;
  kind: BusinessKind;
  ownerHouseholdId: string | null;
  cash: number;
  goods: Goods;
  wageOffer: number;
  desiredWorkers: number;
  maximumWorkers: number;
  employeeIds: string[];
  outputGood: GoodId | null;
  askPrice: number;
  hoursWorkedToday: number;
  wagesPaidToday: number;
  wageArrears: number;
  publicDebt: number;
  tradeDebt: number;
  revenueToday: number;
  costsToday: number;
  lastRevenue: number;
  lastCosts: number;
  producedToday: number;
  soldToday: number;
  spoiledToday: number;
  lastProduced: number;
  lastSold: number;
  lastSpoiled: number;
  salesHistory: number[];
  profitToday: number;
  profitHistory: number[];
  daysWithoutSales: number;
  insolventDays: number;
  restructures: number;
  reason: string;
  farm?: FarmState;
}

export interface RegionalMarket {
  cash: number;
  goods: Goods;
  prices: Record<GoodId, number>;
  exportsToday: Goods;
  importsToday: Goods;
}

export interface WorldEvent {
  id: string;
  day: number;
  hour: number;
  tone: EventTone;
  title: string;
  detail: string;
}

export interface WageClaim {
  citizenId: string;
  businessId: string;
  amount: number;
  createdDay: number;
}

export interface TradeClaim {
  sellerBusinessId: string;
  buyerBusinessId: string;
  amount: number;
  createdDay: number;
}

export interface HistoryPoint {
  day: number;
  actualWage: number;
  dailyWage: number;
  breadPrice: number;
  unemployed: number;
  hungry: number;
  treasury: number;
  population: number;
  exports: number;
}

export interface WorldState {
  version: 12;
  day: number;
  hour: number;
  seed: number;
  treasury: number;
  taxRate: number;
  foodReserve: number;
  citizens: Citizen[];
  households: Household[];
  businesses: Business[];
  regionalMarket: RegionalMarket;
  wageClaims: WageClaim[];
  tradeClaims: TradeClaim[];
  events: WorldEvent[];
  history: HistoryPoint[];
  births: number;
  deaths: number;
  lawlessness: number;
  crimesToday: number;
  crimesPreventedToday: number;
  crimeLossToday: number;
  totalCrimes: number;
  immigrants: number;
  emigrants: number;
  householdsFormed: number;
  publicWorks: {
    roads: number;
    granary: number;
    market: number;
  };
  settlement: {
    housingCapacity: number;
    streets: number;
    urbanAcres: number;
    expansions: number;
  };
  landlord: {
    rentMultiplier: number;
    rentCollectedToday: number;
    rentCollectedTotal: number;
    tenantFavor: number;
    leasesGranted: number;
    acresReclaimed: number;
  };
}

export interface WorldMetrics {
  population: number;
  adults: number;
  dependents: number;
  retirees: number;
  households: number;
  employed: number;
  unemployed: number;
  subsistenceWorkers: number;
  openJobs: number;
  averageWage: number;
  dailyWage: number;
  advertisedWage: number;
  subsistenceWage: number;
  realWage: number;
  hungry: number;
  poorHouseholds: number;
  cashlessHouseholds: number;
  foodInsecureHouseholds: number;
  indebtedHouseholds: number;
  subsistenceHouseholds: number;
  wageHouseholds: number;
  assetHouseholds: number;
  wageArrears: number;
  marketBread: number;
  breadAvailable: number;
  breadDemand: number;
  breadPrice: number;
  farmRunway: number;
  grainStock: number;
  grainDays: number;
  businessRevenue: number;
  businessCosts: number;
  goodsSpoiled: number;
  migrationPressure: number;
  exportsToday: number;
  totalCoins: number;
  localCoins: number;
  wealthConcentration: number;
  guards: number;
  requiredGuards: number;
  lawlessness: number;
  crimesToday: number;
  crimesPreventedToday: number;
  crimeLossToday: number;
  healthReasons: string[];
  health: 'Prospering' | 'Stable' | 'Strained' | 'Crisis';
}
