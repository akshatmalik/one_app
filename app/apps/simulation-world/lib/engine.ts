import type {
  Business,
  BusinessKind,
  Citizen,
  EventTone,
  FarmState,
  FarmPhase,
  GoodId,
  Goods,
  Household,
  TradeClaim,
  WorldEvent,
  WorldMetrics,
  WorldState,
} from './types';

const GOODS: GoodId[] = ['grain', 'flour', 'bread', 'firewood', 'tools'];
const WORK_START = 8;
const WORK_END = 16;
const GROW_DAYS = 80;
const YEAR_DAYS = 120;
const ACRE_SQUARE_METERS = 4046.86;
const WALKING_SPEED_METERS_PER_SECOND = 1.3;
const FARM_BREAK_HOURS = 0.75;
const round = (value: number, places = 2) => Math.round(value * 10 ** places) / 10 ** places;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const emptyGoods = (): Goods => ({ grain: 0, flour: 0, bread: 0, firewood: 0, tools: 0 });
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const FARM_SLOTS = [
  { x: 35, y: 35, ratio: 1.55 },
  { x: 685, y: 35, ratio: 0.82 },
  { x: 1270, y: 35, ratio: 1.35 },
  { x: 35, y: 650, ratio: 0.72 },
  { x: 1420, y: 650, ratio: 1.65 },
  { x: 35, y: 1160, ratio: 1.15 },
  { x: 1300, y: 1160, ratio: 0.9 },
  { x: 650, y: 1380, ratio: 1.5 },
];

function farmGeometry(index: number, acres: number, roadLevel = 0) {
  const slot = FARM_SLOTS[index % FARM_SLOTS.length];
  const area = acres * ACRE_SQUARE_METERS;
  const width = Math.sqrt(area * slot.ratio);
  const height = area / width;
  const townX = 1050;
  const townY = 950;
  const centerX = slot.x + width / 2;
  const centerY = slot.y + height / 2;
  const distanceToTownMeters = Math.hypot(centerX - townX, centerY - townY);
  const travelHoursPerWorker = 2 * distanceToTownMeters / (WALKING_SPEED_METERS_PER_SECOND * 3600) * (1 - roadLevel * 0.12);
  return {
    fieldX: round(slot.x), fieldY: round(slot.y), fieldWidthMeters: round(width), fieldHeightMeters: round(height),
    distanceToTownMeters: round(distanceToTownMeters), travelHoursPerWorker: round(travelHoursPerWorker),
    productiveHoursPerWorker: round(clamp(8 - FARM_BREAK_HOURS - travelHoursPerWorker, 4.5, 7.25)),
  };
}

function resizeFarmGeometry(farm: FarmState, roadLevel = 0) {
  const ratio = Math.max(0.45, farm.fieldWidthMeters / Math.max(1, farm.fieldHeightMeters));
  const area = farm.landAcres * ACRE_SQUARE_METERS;
  farm.fieldWidthMeters = round(Math.sqrt(area * ratio));
  farm.fieldHeightMeters = round(area / farm.fieldWidthMeters);
  const distance = Math.hypot(farm.fieldX + farm.fieldWidthMeters / 2 - 1050, farm.fieldY + farm.fieldHeightMeters / 2 - 950);
  farm.distanceToTownMeters = round(distance);
  farm.travelHoursPerWorker = round(2 * distance / (WALKING_SPEED_METERS_PER_SECOND * 3600) * (1 - roadLevel * 0.12));
  farm.productiveHoursPerWorker = round(clamp(8 - FARM_BREAK_HOURS - farm.travelHoursPerWorker, 4.5, 7.25));
}

const noise = (seed: number, day: number, salt: number) => {
  let value = (seed ^ Math.imul(day + 1, 0x45d9f3b) ^ Math.imul(salt + 17, 0x27d4eb2d)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  return (value >>> 0) / 4294967296;
};

const makeEvent = (state: Pick<WorldState, 'day' | 'hour'>, tone: EventTone, title: string, detail: string): WorldEvent => ({
  id: `${state.day}-${state.hour}-${title}-${detail}`,
  day: state.day,
  hour: state.hour,
  tone,
  title,
  detail,
});

const adultFoodNeed = (citizen: Citizen) => citizen.age < 3 ? 0.35 : citizen.age < 8 ? 0.55 : citizen.age < 15 ? 0.75 : 1;
const rollingAverage = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const BUSINESS_TEMPLATES: Array<{
  id: string;
  name: string;
  kind: BusinessKind;
  owner: number | null;
  cash: number;
  wage: number;
  workers: number;
  max: number;
  output: GoodId | null;
  price: number;
  stock?: Partial<Goods>;
}> = [
  ...Array.from({ length: 4 }, (_, index) => ({ id: `farm-${index + 1}`, name: ['Northfield Farm', 'Brook Farm', 'Oakmere Farm', 'South Acre'][index], kind: 'farm' as const, owner: index, cash: 720, wage: 7.2, workers: 3, max: 24, output: 'grain' as const, price: 2.2, stock: { grain: 520 } })),
  { id: 'mill-1', name: 'River Mill', kind: 'mill', owner: 4, cash: 520, wage: 8.1, workers: 4, max: 7, output: 'flour', price: 3.2, stock: { grain: 120, flour: 80 } },
  { id: 'bakery-1', name: 'Common Oven', kind: 'bakery', owner: 5, cash: 460, wage: 8.3, workers: 2, max: 6, output: 'bread', price: 1.65, stock: { flour: 70, bread: 130 } },
  { id: 'bakery-2', name: 'Sunrise Bakery', kind: 'bakery', owner: 6, cash: 440, wage: 8.2, workers: 2, max: 6, output: 'bread', price: 1.68, stock: { flour: 65, bread: 120 } },
  { id: 'wood-1', name: 'Westwood Camp', kind: 'woodcutter', owner: 7, cash: 430, wage: 7.4, workers: 5, max: 9, output: 'firewood', price: 2.4, stock: { firewood: 180 } },
  { id: 'smith-1', name: 'Old Gate Smithy', kind: 'blacksmith', owner: 8, cash: 480, wage: 9.2, workers: 3, max: 6, output: 'tools', price: 14, stock: { tools: 35 } },
  { id: 'merchant-1', name: 'Market Company', kind: 'merchant', owner: 9, cash: 700, wage: 8, workers: 2, max: 6, output: null, price: 0 },
  { id: 'estate-1', name: "Lord's Estate", kind: 'estate', owner: null, cash: 0, wage: 7.8, workers: 4, max: 10, output: null, price: 0 },
];

type SettlementDistrict = Household['district'];

function settlementPlot(index: number, seed: number): Pick<Household, 'homeX' | 'homeY' | 'homeBuiltDay' | 'district'> {
  const lane = index % 5;
  const laneIndex = Math.floor(index / 5);
  const side = laneIndex % 2 === 0 ? -1 : 1;
  const step = Math.floor(laneIndex / 2);
  const jitterX = (noise(seed, index, 9100) - 0.5) * 24;
  const jitterY = (noise(seed, index, 9200) - 0.5) * 24;
  let district: SettlementDistrict;
  let homeX: number;
  let homeY: number;
  if (lane === 0) {
    district = 'old-market'; homeX = 790 + step * 105; homeY = 885 + side * 68;
  } else if (lane === 1) {
    district = 'mill-lane'; homeX = 1160 + step * 70 + side * 28; homeY = 825 - step * 62;
  } else if (lane === 2) {
    district = 'southward'; homeX = 990 + side * 64 + step * 30; homeY = 1090 + step * 82;
  } else if (lane === 3) {
    district = 'west-gate'; homeX = 850 - step * 92; homeY = 985 + side * 64 + step * 20;
  } else {
    district = 'river-ward'; homeX = 1270 + step * 88; homeY = 970 + side * 64 + step * 30;
  }
  return { homeX: round(homeX + jitterX), homeY: round(homeY + jitterY), homeBuiltDay: 1, district };
}

export function createWorld(seed = 7843): WorldState {
  const households: Household[] = Array.from({ length: 32 }, (_, index) => ({
    id: `house-${index + 1}`,
    name: `${['Alder', 'Brook', 'Candle', 'Dove', 'Elm', 'Flint', 'Grove', 'Hearth'][index % 8]} ${Math.floor(index / 8) + 1}`,
    memberIds: [],
    coins: 75 + (index % 7) * 9,
    goods: { ...emptyGoods(), bread: 4 + index % 3, firewood: 3 },
    dailyRent: 0.8 + (index % 4) * 0.12,
    rentArrears: 0,
    debt: 0,
    missedMeals: 0,
    reservationWage: 5,
    ownedBusinessIds: [],
    foodSecureDays: 14,
    incomeToday: 0,
    spendingToday: 0,
    subsistenceToday: 0,
    lastIncome: 0,
    lastSpending: 0,
    lastSubsistence: 0,
    ...settlementPlot(index, seed),
  }));

  const skills: BusinessKind[] = ['farm', 'farm', 'farm', 'mill', 'bakery', 'woodcutter', 'blacksmith', 'merchant', 'estate'];
  const citizens: Citizen[] = [];
  for (let index = 0; index < 64; index += 1) {
    const household = households[index % households.length];
    const citizen: Citizen = {
      id: `adult-${index + 1}`,
      name: `Villager ${index + 1}`,
      householdId: household.id,
      age: 18 + (index * 7) % 42,
      adult: true,
      retired: false,
      partnerId: null,
      parentIds: [],
      employerId: null,
      skill: skills[index % skills.length],
      health: 88,
      hunger: 0,
      morale: 70,
      hoursWorkedToday: 0,
      wagePaidToday: 0,
      wageArrears: 0,
      positionX: household.homeX,
      positionY: household.homeY,
      location: 'home',
      journey: null,
    };
    citizens.push(citizen);
    household.memberIds.push(citizen.id);
  }
  for (let index = 0; index < 36; index += 1) {
    const household = households[index % households.length];
    const citizen: Citizen = {
      id: `child-${index + 1}`,
      name: `Young Villager ${index + 1}`,
      householdId: household.id,
      age: 1 + (index * 5) % 14,
      adult: false,
      retired: false,
      partnerId: null,
      parentIds: [],
      employerId: null,
      skill: skills[(index + 3) % skills.length],
      health: 88,
      hunger: 0,
      morale: 74,
      hoursWorkedToday: 0,
      wagePaidToday: 0,
      wageArrears: 0,
      positionX: household.homeX,
      positionY: household.homeY,
      location: 'home',
      journey: null,
    };
    citizens.push(citizen);
    household.memberIds.push(citizen.id);
  }

  for (const household of households) {
    const adults = citizens.filter((citizen) => citizen.householdId === household.id && citizen.adult);
    if (adults.length >= 2) {
      adults[0].partnerId = adults[1].id;
      adults[1].partnerId = adults[0].id;
    }
  }

  const businesses: Business[] = BUSINESS_TEMPLATES.map((template, index) => {
    const ownerHouseholdId = template.owner === null ? null : households[template.owner].id;
    if (template.owner !== null) households[template.owner].ownedBusinessIds.push(template.id);
    return {
      id: template.id,
      name: template.name,
      kind: template.kind,
      ownerHouseholdId,
      cash: template.cash,
      goods: { ...emptyGoods(), ...template.stock },
      wageOffer: template.wage,
      desiredWorkers: template.workers,
      maximumWorkers: template.max,
      employeeIds: [],
      outputGood: template.output,
      askPrice: template.price,
      hoursWorkedToday: 0,
      wagesPaidToday: 0,
      wageArrears: 0,
      publicDebt: 0,
      tradeDebt: 0,
      revenueToday: 0,
      costsToday: 0,
      lastRevenue: 0,
      lastCosts: 0,
      producedToday: 0,
      soldToday: 0,
      spoiledToday: 0,
      lastProduced: 0,
      lastSold: 0,
      lastSpoiled: 0,
      salesHistory: [],
      profitToday: 0,
      profitHistory: [],
      daysWithoutSales: 0,
      insolventDays: 0,
      restructures: 0,
      reason: 'Opening positions against expected demand.',
      farm: template.kind === 'farm' ? {
        phase: 'grow', phaseDay: 28 + index * 4, taskHoursRemaining: 0,
        cropGrowthDays: 28 + index * 4, careHours: 0, landAcres: 60,
        cultivatedAcres: 30, plannedAcres: 30, expectedDailySales: 9,
        inventoryDays: round((template.stock?.grain ?? 0) / 9, 1), dailyLaborHours: 11.5,
        harvests: 0,
        ...farmGeometry(index, 60), internalTravelHours: 0,
      } : undefined,
    };
  });

  let state: WorldState = {
    version: 12,
    day: 1,
    hour: 6,
    seed,
    treasury: 1400,
    taxRate: 0.06,
    foodReserve: 500,
    citizens,
    households,
    businesses,
    regionalMarket: {
      cash: 10000,
      goods: { grain: 3500, flour: 600, bread: 1200, firewood: 1800, tools: 280 },
      prices: { grain: 2, flour: 3, bread: 1.8, firewood: 2.2, tools: 13 },
      exportsToday: emptyGoods(),
      importsToday: emptyGoods(),
    },
    wageClaims: [],
    tradeClaims: [],
    events: [],
    history: [],
    births: 0,
    deaths: 0,
    lawlessness: 6,
    crimesToday: 0,
    crimesPreventedToday: 0,
    crimeLossToday: 0,
    totalCrimes: 0,
    immigrants: 0,
    emigrants: 0,
    householdsFormed: 0,
    publicWorks: { roads: 0, granary: 0, market: 0 },
    settlement: { housingCapacity: 36, streets: 4, urbanAcres: 24, expansions: 0 },
    landlord: { rentMultiplier: 1, rentCollectedToday: 0, rentCollectedTotal: 0, tenantFavor: 65, leasesGranted: 0, acresReclaimed: 0 },
  };
  state.events = [makeEvent(state, 'info', 'A larger village awakens', 'One hundred residents, thirty-two households, and eleven employers enter the same conserved economy.')];
  state = updateReservationWages(state);
  return clearAndMatchLabor(state, []);
}

function updateReservationWages(state: WorldState): WorldState {
  const breadPrice = marketBreadPrice(state);
  const households = state.households.map((household) => {
    const members = state.citizens.filter((citizen) => household.memberIds.includes(citizen.id));
    const need = members.reduce((sum, citizen) => sum + adultFoodNeed(citizen), 0);
    const adults = Math.max(1, members.filter((citizen) => citizen.adult).length);
    const essentials = need * breadPrice + household.dailyRent * state.landlord.rentMultiplier + 0.3 + (household.debt + household.rentArrears) * 0.002;
    return { ...household, reservationWage: round(essentials * 1.08 / adults) };
  });
  return { ...state, households };
}

const villageGrainNeed = (state: WorldState) => state.citizens.reduce((sum, citizen) => sum + adultFoodNeed(citizen), 0) / 3;

function farmLaborPlan(business: Business) {
  const farm = business.farm!;
  const activeAcres = farm.phase === 'fallow' ? 0 : farm.cultivatedAcres;
  const idleAcres = Math.max(0, farm.landAcres - activeAcres);
  const shapeRatio = Math.max(farm.fieldWidthMeters, farm.fieldHeightMeters) / Math.max(1, Math.min(farm.fieldWidthMeters, farm.fieldHeightMeters));
  const internalTravelHours = activeAcres * 0.08 * Math.max(1, shapeRatio * 0.8);
  const fieldCare = activeAcres * 0.45;
  const landMaintenance = idleAcres * 0.03;
  const storageHandling = business.goods.grain / 800;
  const routineHours = fieldCare + landMaintenance + storageHandling + internalTravelHours;
  let taskHours = 0;
  if (farm.phase === 'prepare') taskHours = farm.taskHoursRemaining / Math.max(1, 12 - farm.phaseDay);
  if (farm.phase === 'harvest') taskHours = farm.taskHoursRemaining / Math.max(1, 14 - farm.phaseDay);
  const totalHours = Math.max(0, routineHours + taskHours);
  const productiveHours = farm.productiveHoursPerWorker;
  return { routineHours, taskHours, totalHours, internalTravelHours, productiveHours, workers: clamp(Math.ceil(totalHours / productiveHours), 0, business.maximumWorkers) };
}

function requiredGuardsFor(state: WorldState, lawlessness = state.lawlessness) {
  const populationPatrols = Math.ceil(state.citizens.length / 45);
  const disorderPatrols = Math.ceil(lawlessness / 15);
  return clamp(populationPatrols + disorderPatrols, 1, 12);
}

function desiredWorkersFor(business: Business, state: WorldState) {
  if (business.kind !== 'estate' && business.wageArrears > 0.01) return 0;
  if (business.kind === 'farm' && business.farm) {
    return farmLaborPlan(business).workers;
  }
  const populationScale = state.citizens.length / 100;
  if (business.kind === 'mill') return business.goods.flour > state.citizens.length * 1.5 ? 0 : clamp(Math.ceil(populationScale * 4), 2, business.maximumWorkers);
  if (business.kind === 'bakery') return business.goods.bread > state.citizens.length * 1.5 ? 0 : clamp(Math.ceil(populationScale * 2), 1, business.maximumWorkers);
  if (business.kind === 'estate') {
    const runway = state.treasury / Math.max(1, business.wageOffer * business.employeeIds.length);
    if (runway < 30) return 2;
    const guards = Math.min(requiredGuardsFor(state), business.maximumWorkers);
    const localCoins = state.treasury + state.households.reduce((sum, household) => sum + household.coins, 0) + state.businesses.reduce((sum, item) => sum + item.cash, 0);
    const treasuryShare = state.treasury / Math.max(1, localCoins);
    const publicWorks = clamp(Math.floor((treasuryShare - 0.25) * 30), 0, business.maximumWorkers - guards);
    return guards + publicWorks;
  }
  if (business.kind === 'woodcutter') return business.goods.firewood > 300 ? 0 : 5;
  if (business.kind === 'blacksmith') return business.goods.tools > 50 ? 0 : 3;
  if (business.kind === 'merchant') return state.regionalMarket.cash > 100 ? 2 : 0;
  return clamp(Math.ceil(populationScale * 2), 1, business.maximumWorkers);
}

function businessReasonFor(business: Business, desiredWorkers: number, state: WorldState) {
  if (business.wageArrears > 0.01) return `${round(business.wageArrears)}c of old payroll must clear before this employer recruits again.`;
  if (business.kind === 'farm' && business.farm) {
    const farm = business.farm;
    const plan = farmLaborPlan(business);
    if (farm.phase === 'prepare' || farm.phase === 'harvest') return `${farm.cultivatedAcres} cultivated acres generate ${round(plan.routineHours, 1)} routine hours plus ${round(plan.taskHours, 1)} task-hours. A ${round(farm.distanceToTownMeters)}m walk leaves ${round(plan.productiveHours, 1)} productive hours per worker, requiring ${desiredWorkers} positions.`;
    if (farm.phase === 'grow') return `${farm.cultivatedAcres} growing acres and ${farm.landAcres - farm.cultivatedAcres} idle acres generate ${round(plan.totalHours, 1)} hours, including ${round(plan.internalTravelHours, 1)} inside the field. The town walk costs ${round(farm.travelHoursPerWorker, 1)} hours per worker.`;
    return `${farm.landAcres} idle acres and stored grain generate ${round(plan.totalHours, 1)} maintenance hours while the next crop is planned.`;
  }
  if (business.kind === 'bakery') {
    const bakeries = Math.max(1, state.businesses.filter((item) => item.kind === 'bakery').length);
    const coverage = business.goods.bread / Math.max(0.1, state.citizens.reduce((sum, citizen) => sum + adultFoodNeed(citizen), 0) / bakeries);
    return desiredWorkers ? `The oven is staffing against local bread demand; its stock covers about ${round(coverage, 1)} days of its market share.` : `Bread stock covers about ${round(coverage, 1)} days of this oven's market share, so production is temporarily idle.`;
  }
  if (business.kind === 'mill') return desiredWorkers ? 'Flour inventory is below its processing target, so the mill is buying grain and running shifts.' : 'Existing flour stock is above the processing target; the mill waits for bakeries to draw it down.';
  if (business.kind === 'estate') {
    const guards = Math.min(desiredWorkers, requiredGuardsFor(state));
    return `${guards} guards cover lawlessness and population; ${desiredWorkers - guards} additional workers maintain roads, granaries, wells, and fire watches when the treasury holds excess village cash.`;
  }
  if (!desiredWorkers && business.outputGood) return `${business.goods[business.outputGood] > 0 ? 'Existing stock is above expected demand' : 'Working capital is constrained'}, so no additional production shift is scheduled.`;
  return desiredWorkers ? `${desiredWorkers} useful positions are supported by current demand and working capital.` : 'No useful paid shift is justified by current demand.';
}

function clearAndMatchLabor(state: WorldState, events: WorldEvent[]): WorldState {
  const priorEmployers = new Map(state.citizens.map((citizen) => [citizen.id, citizen.employerId]));
  const citizens: Citizen[] = state.citizens.map((citizen) => ({ ...citizen, employerId: citizen.adult ? null : citizen.employerId }));
  const businesses: Business[] = state.businesses.map((business) => {
    const desiredWorkers = desiredWorkersFor(business, state);
    const farm = business.farm ? { ...business.farm, dailyLaborHours: round(farmLaborPlan(business).totalHours, 1), internalTravelHours: round(farmLaborPlan(business).internalTravelHours, 1) } : undefined;
    return { ...business, farm, employeeIds: [], desiredWorkers, reason: businessReasonFor(business, desiredWorkers, state) };
  });
  const candidates = citizens.filter((citizen) => citizen.adult && !citizen.retired);
  const householdWorkers = new Map<string, number>();

  // Existing workers keep their contracts while the position still exists.
  // This prevents the entire village labor market from being reshuffled daily.
  for (const business of businesses) {
    const returning = candidates
      .filter((citizen) => priorEmployers.get(citizen.id) === business.id)
      .filter((citizen) => !state.wageClaims.some((claim) => claim.citizenId === citizen.id && claim.businessId === business.id && claim.amount > business.wageOffer * 2))
      .sort((a, b) => (b.skill === business.kind ? 1 : 0) - (a.skill === business.kind ? 1 : 0) || a.id.localeCompare(b.id))
      .slice(0, business.desiredWorkers);
    for (const worker of returning) {
      worker.employerId = business.id;
      business.employeeIds.push(worker.id);
      householdWorkers.set(worker.householdId, (householdWorkers.get(worker.householdId) ?? 0) + 1);
    }
  }

  const openings = businesses.flatMap((business) => Array.from({ length: Math.max(0, business.desiredWorkers - business.employeeIds.length) }, () => business));
  openings.sort((a, b) => b.wageOffer - a.wageOffer || a.id.localeCompare(b.id));
  for (const opening of openings) {
    const willing = candidates.filter((citizen) => {
      if (citizen.employerId || state.wageClaims.some((claim) => claim.citizenId === citizen.id && claim.businessId === opening.id)) return false;
      const household = state.households.find((item) => item.id === citizen.householdId)!;
      const desperation = household.coins < household.reservationWage * 5 ? 0.62 : 0.82;
      return opening.wageOffer >= household.reservationWage * desperation;
    });
    if (!willing.length) continue;
    willing.sort((a, b) => {
      const householdA = state.households.find((household) => household.id === a.householdId)!;
      const householdB = state.households.find((household) => household.id === b.householdId)!;
      const needA = householdA.coins < householdA.reservationWage * 8 ? 2 : 0;
      const needB = householdB.coins < householdB.reservationWage * 8 ? 2 : 0;
      const scoreA = (a.skill === opening.kind ? 5 : 0) + (priorEmployers.get(a.id) === opening.id ? 3 : 0) + needA - (householdWorkers.get(a.householdId) ?? 0) * 1.5;
      const scoreB = (b.skill === opening.kind ? 5 : 0) + (priorEmployers.get(b.id) === opening.id ? 3 : 0) + needB - (householdWorkers.get(b.householdId) ?? 0) * 1.5;
      return scoreB - scoreA || a.id.localeCompare(b.id);
    });
    const worker = willing[0];
    worker.employerId = opening.id;
    opening.employeeIds.push(worker.id);
    householdWorkers.set(worker.householdId, (householdWorkers.get(worker.householdId) ?? 0) + 1);
  }
  if (events.length && state.day % 7 === 0) events.push(makeEvent(state, 'info', 'The weekly labor market cleared', `${citizens.filter((citizen) => citizen.employerId).length} adults accepted work across ${businesses.length} employers.`));
  return { ...state, citizens, businesses };
}

function citizenHomePoint(citizen: Citizen, state: WorldState) {
  const household = state.households.find((item) => item.id === citizen.householdId);
  return household ? { x: household.homeX, y: household.homeY } : { x: 1050, y: 970 };
}

function citizenWorkPoint(citizen: Citizen, state: WorldState) {
  const business = state.businesses.find((item) => item.id === citizen.employerId);
  if (!business) return citizenHomePoint(citizen, state);
  if (business.farm) {
    return {
      x: round(business.farm.fieldX + 55 + noise(state.seed, 0, 3000 + Number(citizen.id.replace(/\D/g, '').slice(-5) || 1)) * Math.max(40, business.farm.fieldWidthMeters - 110)),
      y: round(business.farm.fieldY + 120 + noise(state.seed, 0, 4000 + Number(citizen.id.replace(/\D/g, '').slice(-5) || 1)) * Math.max(40, business.farm.fieldHeightMeters - 170)),
    };
  }
  const fixed: Record<string, { x: number; y: number }> = {
    'mill-1': { x: 1490, y: 690 }, 'bakery-1': { x: 1000, y: 910 }, 'bakery-2': { x: 1125, y: 1040 },
    'wood-1': { x: 1630, y: 760 }, 'smith-1': { x: 850, y: 1010 }, 'merchant-1': { x: 1080, y: 930 }, 'estate-1': { x: 900, y: 1190 },
  };
  const anchor = fixed[business.id] ?? { x: 1020 + noise(state.seed, 0, business.id.length * 97) * 210, y: 930 + noise(state.seed, 0, business.id.length * 131) * 180 };
  const spread = Number(citizen.id.replace(/\D/g, '').slice(-4) || 0);
  return { x: round(anchor.x - 24 + spread % 48), y: round(anchor.y + 18 + spread % 24) };
}

function plannedCitizenDestination(citizen: Citizen, state: WorldState): { location: Citizen['location']; x: number; y: number } {
  const market = { x: 1020 + noise(state.seed, state.day, 5000 + Number(citizen.id.replace(/\D/g, '').slice(-4) || 1)) * 125, y: 920 + noise(state.seed, state.day, 6000 + Number(citizen.id.replace(/\D/g, '').slice(-4) || 1)) * 105 };
  if (citizen.hunger > 25 && state.hour >= 7 && state.hour < 20) return { location: 'market', ...market };
  if (!citizen.adult && state.hour >= 9 && state.hour < 16) return { location: 'market', ...market };
  if (citizen.retired && state.hour >= 11 && state.hour < 16) return { location: 'market', ...market };
  if (citizen.adult && !citizen.retired && citizen.employerId && state.hour >= 7 && state.hour < WORK_END) return { location: 'work', ...citizenWorkPoint(citizen, state) };
  if (citizen.adult && state.hour >= 16 && state.hour < 19) return { location: 'market', ...market };
  return { location: 'home', ...citizenHomePoint(citizen, state) };
}

function updateCitizenTravel(state: WorldState): WorldState {
  const absoluteHour = state.day * 24 + state.hour;
  const citizens = state.citizens.map((citizen) => {
    const next = { ...citizen, journey: citizen.journey ? { ...citizen.journey } : null };
    if (next.journey) {
      const started = next.journey.startedDay * 24 + next.journey.startedHour;
      if (absoluteHour - started >= next.journey.durationHours) {
        next.positionX = next.journey.toX;
        next.positionY = next.journey.toY;
        next.location = next.journey.destination;
        next.journey = null;
      } else {
        return next;
      }
    }
    const destination = plannedCitizenDestination(next, state);
    if (next.location === destination.location && Math.hypot(next.positionX - destination.x, next.positionY - destination.y) < 18) return next;
    const distance = Math.hypot(next.positionX - destination.x, next.positionY - destination.y);
    const roadFactor = 1 - state.publicWorks.roads * 0.08;
    const durationHours = round(clamp(distance / (WALKING_SPEED_METERS_PER_SECOND * 3600) * roadFactor, 0.08, 0.85), 3);
    const midpointX = (next.positionX + destination.x) / 2;
    const midpointY = (next.positionY + destination.y) / 2;
    next.journey = {
      fromX: next.positionX, fromY: next.positionY,
      viaX: round(midpointX * 0.7 + 1050 * 0.3), viaY: round(midpointY * 0.7 + 970 * 0.3),
      toX: round(destination.x), toY: round(destination.y),
      startedDay: state.day, startedHour: state.hour, durationHours, destination: destination.location,
    };
    return next;
  });
  return { ...state, citizens };
}

function workHour(state: WorldState): WorldState {
  if (state.hour < WORK_START || state.hour >= WORK_END) return state;
  const citizens = state.citizens.map((citizen) => ({ ...citizen }));
  const businesses = state.businesses.map((business) => ({ ...business }));
  for (const business of businesses) {
    const laborPlan = business.farm ? farmLaborPlan(business) : null;
    const laborLimit = laborPlan?.totalHours ?? Number.POSITIVE_INFINITY;
    for (const citizenId of business.employeeIds) {
      if (business.hoursWorkedToday >= laborLimit) break;
      const citizen = citizens.find((item) => item.id === citizenId);
      if (!citizen) continue;
      if (citizen.location !== 'work' || citizen.journey) continue;
      if (laborPlan && citizen.hoursWorkedToday >= laborPlan.productiveHours) continue;
      const hungerFactor = citizen.hunger >= 90 ? 0.65 : citizen.hunger >= 70 ? 0.75 : citizen.hunger >= 45 ? 0.88 : 1;
      const healthFactor = 0.5 + citizen.health / 200;
      const ageFactor = citizen.age < 50 ? 1 : citizen.age < 60 ? 0.9 : citizen.age < 70 ? 0.7 : 0.45;
      const productivity = clamp(healthFactor * (citizen.skill === business.kind ? 1.12 : 0.9) * hungerFactor * ageFactor, 0.2, 1.15);
      const productiveHour = Math.min(productivity, laborLimit - business.hoursWorkedToday);
      const clockHour = productiveHour / Math.max(0.01, productivity);
      citizen.hoursWorkedToday += clockHour;
      business.hoursWorkedToday += productiveHour;
    }
  }
  return { ...state, citizens, businesses };
}

function transferGood(seller: Business, buyer: Business, good: GoodId, quantity: number, unitPrice: number, claims?: TradeClaim[], day = 0) {
  const existingCredit = claims?.filter((claim) => claim.buyerBusinessId === buyer.id).reduce((sum, claim) => sum + claim.amount, 0) ?? 0;
  const creditLimit = claims ? Math.max(300, buyer.maximumWorkers * buyer.wageOffer * 12) : 0;
  const purchasingPower = buyer.cash + Math.max(0, creditLimit - existingCredit);
  const affordable = Math.floor(purchasingPower / Math.max(0.01, unitPrice));
  const moved = Math.max(0, Math.min(quantity, seller.goods[good], affordable));
  if (!moved) return 0;
  const cost = moved * unitPrice;
  const cashPaid = Math.min(cost, buyer.cash);
  const credit = cost - cashPaid;
  seller.goods[good] -= moved;
  buyer.goods[good] += moved;
  seller.cash += cashPaid;
  buyer.cash -= cashPaid;
  seller.revenueToday += cost;
  seller.soldToday += moved;
  buyer.costsToday += cost;
  if (claims && credit > 0.01) {
    const existing = claims.find((claim) => claim.sellerBusinessId === seller.id && claim.buyerBusinessId === buyer.id);
    if (existing) existing.amount = round(existing.amount + credit);
    else claims.push({ sellerBusinessId: seller.id, buyerBusinessId: buyer.id, amount: round(credit), createdDay: day });
  }
  return moved;
}

function produce(state: WorldState, events: WorldEvent[]): WorldState {
  const businesses: Business[] = state.businesses.map((business) => ({ ...business, goods: { ...business.goods }, farm: business.farm ? { ...business.farm } : undefined }));
  const tradeClaims = state.tradeClaims.map((claim) => ({ ...claim }));
  const farms = businesses.filter((business) => business.kind === 'farm');
  const mill = businesses.find((business) => business.kind === 'mill')!;
  const bakeries = businesses.filter((business) => business.kind === 'bakery');

  for (const farmBusiness of farms) {
    const farm = farmBusiness.farm!;
    const hours = farmBusiness.hoursWorkedToday;
    const routineHours = farmLaborPlan(farmBusiness).routineHours;
    const taskHours = Math.max(0, hours - routineHours);
    if (farm.phase === 'prepare') {
      farm.taskHoursRemaining = Math.max(0, farm.taskHoursRemaining - taskHours);
      farm.phaseDay += 1;
      if (farm.taskHoursRemaining <= 0) {
        farm.phase = 'grow'; farm.phaseDay = 0; farm.cropGrowthDays = 0; farm.careHours = 0;
      }
    } else if (farm.phase === 'grow') {
      farm.cropGrowthDays += 1;
      farm.phaseDay += 1;
      farm.careHours += Math.min(hours, routineHours);
      if (farm.cropGrowthDays >= GROW_DAYS) {
        farm.phase = 'harvest'; farm.phaseDay = 0; farm.taskHoursRemaining = farm.cultivatedAcres * 32;
        events.push(makeEvent(state, 'info', `${farmBusiness.name} is ready for harvest`, `${Math.ceil(farm.taskHoursRemaining / farm.productiveHoursPerWorker)} worker-days must be completed within fourteen days.`));
      }
    } else if (farm.phase === 'harvest') {
      const before = farm.taskHoursRemaining;
      farm.taskHoursRemaining = Math.max(0, farm.taskHoursRemaining - taskHours);
      farm.phaseDay += 1;
      if (farm.taskHoursRemaining <= 0 || farm.phaseDay >= 14) {
        const harvestedAcres = farm.cultivatedAcres;
        const totalTaskHours = Math.max(1, farm.cultivatedAcres * 32);
        const completion = clamp(1 - farm.taskHoursRemaining / totalTaskHours, 0, 1);
        const care = clamp(0.75 + farm.careHours / (GROW_DAYS * 18) * 0.25, 0.75, 1);
        const yieldAmount = Math.floor(farm.cultivatedAcres * 35 * completion * care);
        farmBusiness.goods.grain += yieldAmount;
        farmBusiness.producedToday += yieldAmount;
        farm.harvests += 1;
        farm.phase = 'fallow'; farm.phaseDay = 0; farm.taskHoursRemaining = 0;
        farm.cultivatedAcres = 0;
        events.push(makeEvent(state, completion > 0.9 ? 'good' : 'warn', `${farmBusiness.name} harvests ${yieldAmount} grain`, `${round((before - farm.taskHoursRemaining) + (totalTaskHours - before))} of ${totalTaskHours} required labor-hours were completed on ${harvestedAcres} acres.`));
      }
    } else {
      farm.phaseDay += 1;
      if (farm.phaseDay >= 14) {
        const cycleDemand = farm.expectedDailySales * (GROW_DAYS + 26);
        const desiredHarvest = Math.max(0, cycleDemand + farm.expectedDailySales * 35 - farmBusiness.goods.grain);
        farm.plannedAcres = clamp(Math.ceil(desiredHarvest / 32), 0, farm.landAcres);
        if (farm.plannedAcres === 0) {
          farm.phaseDay = 14;
          continue;
        }
        farm.cultivatedAcres = farm.plannedAcres;
        farm.phase = 'prepare'; farm.phaseDay = 0; farm.taskHoursRemaining = farm.cultivatedAcres * 18;
        events.push(makeEvent(state, 'info', `${farmBusiness.name} plans ${farm.plannedAcres} acres`, `${Math.round(farm.inventoryDays)} days of grain are stored; expected sales are ${round(farm.expectedDailySales, 1)} grain per day.`));
      }
    }
  }

  let grainWanted = Math.max(0, 140 - mill.goods.grain);
  const offeredFarms = [...farms].sort((a, b) => a.askPrice - b.askPrice || b.wageArrears - a.wageArrears || a.id.localeCompare(b.id));
  const farmOffset = state.day % offeredFarms.length;
  for (let index = 0; index < offeredFarms.length; index += 1) {
    const farm = offeredFarms[(index + farmOffset) % offeredFarms.length];
    grainWanted -= transferGood(farm, mill, 'grain', grainWanted, farm.askPrice, tradeClaims, state.day);
  }
  const millUnits = Math.min(Math.floor(mill.hoursWorkedToday), Math.floor(mill.goods.grain));
  mill.goods.grain -= millUnits;
  mill.goods.flour += millUnits;
  mill.producedToday += millUnits;

  for (const bakery of bakeries) {
    const flourWanted = Math.max(0, 80 - bakery.goods.flour);
    transferGood(mill, bakery, 'flour', flourWanted, mill.askPrice, tradeClaims, state.day);
    const flourUnits = Math.min(Math.floor(bakery.hoursWorkedToday), Math.floor(bakery.goods.flour));
    bakery.goods.flour -= flourUnits;
    bakery.goods.bread += flourUnits * 3;
    bakery.producedToday += flourUnits * 3;
  }

  const wood = businesses.find((business) => business.kind === 'woodcutter')!;
  wood.goods.firewood += Math.floor(wood.hoursWorkedToday * 0.7);
  wood.producedToday += Math.floor(wood.hoursWorkedToday * 0.7);
  const smith = businesses.find((business) => business.kind === 'blacksmith')!;
  const toolUnits = Math.floor(smith.hoursWorkedToday / 10);
  if (toolUnits > 0 && wood.goods.firewood >= toolUnits * 2) {
    wood.goods.firewood -= toolUnits * 2;
    smith.goods.tools += toolUnits;
    smith.producedToday += toolUnits;
  }
  for (const business of businesses) business.tradeDebt = round(tradeClaims.filter((claim) => claim.buyerBusinessId === business.id).reduce((sum, claim) => sum + claim.amount, 0));
  return { ...state, businesses, tradeClaims };
}

function settleTradeCredit(state: WorldState, events: WorldEvent[]): WorldState {
  const businesses = state.businesses.map((business) => ({ ...business }));
  let claims = state.tradeClaims.map((claim) => ({ ...claim }));
  let paidTotal = 0;
  // Several passes let household bread payments travel bakery → mill → farm
  // through the same closed accounting period.
  for (let pass = 0; pass < 3; pass += 1) {
    for (const claim of [...claims].sort((a, b) => a.createdDay - b.createdDay)) {
      const buyer = businesses.find((business) => business.id === claim.buyerBusinessId);
      const seller = businesses.find((business) => business.id === claim.sellerBusinessId);
      if (!buyer || !seller) continue;
      const payrollBuffer = buyer.employeeIds.length * buyer.wageOffer + buyer.wageArrears;
      const payment = Math.min(claim.amount, Math.max(0, buyer.cash - payrollBuffer));
      if (payment <= 0) continue;
      buyer.cash -= payment;
      seller.cash += payment;
      claim.amount = round(claim.amount - payment);
      paidTotal += payment;
    }
    claims = claims.filter((claim) => claim.amount > 0.01);
  }
  for (const business of businesses) business.tradeDebt = round(claims.filter((claim) => claim.buyerBusinessId === business.id).reduce((sum, claim) => sum + claim.amount, 0));
  if (paidTotal > 0 && state.day % 30 === 0) events.push(makeEvent(state, 'info', 'Supplier accounts clear through the market', `${round(paidTotal)} coins moved upstream from bakers to millers and farmers.`));
  return { ...state, businesses, tradeClaims: claims };
}

function financeEssentialBusinesses(state: WorldState, events: WorldEvent[]): WorldState {
  const businesses = state.businesses.map((business) => ({ ...business }));
  let treasury = state.treasury;
  let advanced = 0;
  let repaid = 0;
  const emergency = state.citizens.some((citizen) => citizen.hunger > 40) || state.foodReserve < state.citizens.length;
  const treasuryFloor = emergency ? 150 : 500;
  for (const business of businesses) {
    if (!['farm', 'mill', 'bakery'].includes(business.kind)) continue;
    const payroll = business.employeeIds.length * business.wageOffer;
    if (business.publicDebt > 0 && business.cash > payroll * 2.5) {
      const payment = Math.min(business.publicDebt, business.cash - payroll * 2);
      business.cash -= payment;
      business.publicDebt = round(business.publicDebt - payment);
      treasury += payment;
      repaid += payment;
    }
    const collateral = GOODS.reduce((sum, good) => sum + business.goods[good] * state.regionalMarket.prices[good], 0);
    const creditCeiling = clamp(600 + collateral * 0.25, 600, 1800);
    const workingTarget = payroll * 2;
    if (payroll > 0 && business.cash < workingTarget && treasury > treasuryFloor && business.publicDebt < creditCeiling) {
      const credit = Math.min(workingTarget - business.cash, treasury - treasuryFloor, creditCeiling - business.publicDebt, 120);
      business.cash += credit;
      business.publicDebt = round(business.publicDebt + credit);
      treasury -= credit;
      advanced += credit;
    }
  }
  if (state.day % 30 === 0 && (advanced > 0 || repaid > 0)) {
    events.push(makeEvent(state, 'info', 'The granary credit office settles its books', `${round(advanced)} coins financed food production and ${round(repaid)} were repaid today.`));
  }
  return { ...state, businesses, treasury };
}

function payWages(state: WorldState, events: WorldEvent[]): WorldState {
  const households = state.households.map((household) => ({ ...household }));
  const citizens = state.citizens.map((citizen) => ({ ...citizen }));
  const businesses = state.businesses.map((business) => ({ ...business, wageArrears: 0 }));
  let claims = state.wageClaims.map((claim) => ({ ...claim }));
  let treasury = state.treasury;

  // Old wage claims are senior to today's payroll. They remain attached to the
  // employer that incurred them even when the worker changes jobs.
  for (const claim of claims) {
    const business = businesses.find((item) => item.id === claim.businessId);
    const citizen = citizens.find((item) => item.id === claim.citizenId);
    if (!business || !citizen || claim.amount <= 0) continue;
    const household = households.find((item) => item.id === citizen.householdId)!;
    const available = business.kind === 'estate' ? treasury : business.cash;
    const paid = Math.min(claim.amount, Math.max(0, available));
    const tax = paid * state.taxRate;
    if (business.kind === 'estate') treasury -= paid - tax;
    else {
      business.cash -= paid;
      treasury += tax;
    }
    household.coins += paid - tax;
    household.incomeToday += paid - tax;
    business.costsToday += paid;
    business.wagesPaidToday += paid;
    claim.amount = round(claim.amount - paid);
  }
  claims = claims.filter((claim) => claim.amount > 0.01);

  for (const business of businesses) {
    let available = business.kind === 'estate' ? treasury : business.cash;
    for (const citizenId of business.employeeIds) {
      const citizen = citizens.find((item) => item.id === citizenId)!;
      const household = households.find((item) => item.id === citizen.householdId)!;
      const owed = business.wageOffer * citizen.hoursWorkedToday / 8;
      const paid = Math.min(owed, Math.max(0, available));
      const tax = paid * state.taxRate;
      available -= paid;
      household.coins += paid - tax;
      household.incomeToday += paid - tax;
      if (business.kind === 'estate') available += tax;
      else treasury += tax;
      citizen.wagePaidToday = paid;
      business.wagesPaidToday += paid;
      business.costsToday += paid;
      const unpaid = owed - paid;
      if (unpaid > 0.01) {
        const existing = claims.find((claim) => claim.citizenId === citizen.id && claim.businessId === business.id);
        if (existing) existing.amount = round(existing.amount + unpaid);
        else claims.push({ citizenId: citizen.id, businessId: business.id, amount: round(unpaid), createdDay: state.day });
      }
      const claimAgainstEmployer = claims.find((claim) => claim.citizenId === citizen.id && claim.businessId === business.id)?.amount ?? 0;
      if (claimAgainstEmployer > business.wageOffer * 2) {
        citizen.employerId = null;
        business.employeeIds = business.employeeIds.filter((id) => id !== citizen.id);
        events.push(makeEvent(state, 'bad', `${citizen.name} quits unpaid work`, `${business.name} still owes ${round(claimAgainstEmployer)} coins.`));
      }
    }
    if (business.kind === 'estate') treasury = available;
    else business.cash = available;
  }
  for (const citizen of citizens) citizen.wageArrears = round(claims.filter((claim) => claim.citizenId === citizen.id).reduce((sum, claim) => sum + claim.amount, 0));
  for (const business of businesses) business.wageArrears = round(claims.filter((claim) => claim.businessId === business.id).reduce((sum, claim) => sum + claim.amount, 0));
  return { ...state, households, citizens, businesses, wageClaims: claims, treasury };
}

function guaranteeEssentialWages(state: WorldState, events: WorldEvent[]): WorldState {
  const households = state.households.map((household) => ({ ...household }));
  const citizens = state.citizens.map((citizen) => ({ ...citizen }));
  const businesses = state.businesses.map((business) => ({ ...business }));
  let claims = state.wageClaims.map((claim) => ({ ...claim }));
  let treasury = state.treasury;
  let guaranteed = 0;
  const emergency = citizens.some((citizen) => citizen.hunger > 40);
  const treasuryFloor = emergency ? 150 : state.foodReserve > state.citizens.length * 2 ? 250 : 400;
  for (const claim of claims) {
    const business = businesses.find((item) => item.id === claim.businessId);
    const citizen = citizens.find((item) => item.id === claim.citizenId);
    if (!business || !citizen || !['farm', 'mill', 'bakery'].includes(business.kind)) continue;
    if (state.day - (claim.createdDay ?? state.day) < 7 || treasury <= treasuryFloor) continue;
    const payment = Math.min(claim.amount, treasury - treasuryFloor);
    const household = households.find((item) => item.id === citizen.householdId)!;
    household.coins += payment;
    household.incomeToday += payment;
    treasury -= payment;
    business.publicDebt = round(business.publicDebt + payment);
    claim.amount = round(claim.amount - payment);
    guaranteed += payment;
  }
  claims = claims.filter((claim) => claim.amount > 0.01);
  for (const citizen of citizens) citizen.wageArrears = round(claims.filter((claim) => claim.citizenId === citizen.id).reduce((sum, claim) => sum + claim.amount, 0));
  for (const business of businesses) business.wageArrears = round(claims.filter((claim) => claim.businessId === business.id).reduce((sum, claim) => sum + claim.amount, 0));
  if (guaranteed > 0) events.push(makeEvent(state, 'warn', 'The wage guarantee fund intervenes', `${round(guaranteed)} coins paid overdue food-chain workers; the employers now owe the treasury.`));
  return { ...state, households, citizens, businesses, wageClaims: claims, treasury };
}

function marketBreadPrice(state: WorldState) {
  const bakeries = state.businesses.filter((business) => business.kind === 'bakery' && business.goods.bread > 0);
  return bakeries.length ? Math.min(...bakeries.map((business) => business.askPrice)) : state.regionalMarket.prices.bread;
}

function tradeHouseholdServices(state: WorldState, events: WorldEvent[]): WorldState {
  const households = state.households.map((household) => ({ ...household }));
  const citizens = state.citizens.map((citizen) => ({ ...citizen }));
  const providers = households.filter((household) => citizens.some((citizen) => citizen.householdId === household.id && citizen.adult && !citizen.employerId));
  if (!providers.length) return state;
  let traded = 0;
  const jobsTaken = new Map<string, number>();
  const payers = [...households].filter((household) => household.coins > household.reservationWage * 6).sort((a, b) => b.coins - a.coins);
  for (let index = 0; index < payers.length; index += 1) {
    const payer = payers[index];
    const candidates = providers
      .filter((provider) => provider.id !== payer.id && (jobsTaken.get(provider.id) ?? 0) < 2)
      .sort((a, b) => (a.incomeToday + a.coins * 0.01) - (b.incomeToday + b.coins * 0.01) || a.id.localeCompare(b.id));
    if (!candidates.length) continue;
    const provider = candidates[0];
    const payment = Math.min(2, Math.max(0, payer.coins - payer.reservationWage * 6) * 0.015);
    if (payment <= 0.01) continue;
    payer.coins -= payment;
    payer.spendingToday += payment;
    provider.coins += payment;
    provider.incomeToday += payment;
    jobsTaken.set(provider.id, (jobsTaken.get(provider.id) ?? 0) + 1);
    traded += payment;
  }
  if (state.day % 30 === 0 && traded > 0) events.push(makeEvent(state, 'good', 'The informal market circulates coin', `${round(traded, 1)} coins paid for repairs, childcare, hauling, washing, and other household services today.`));
  return { ...state, households };
}

function feedHouseholds(state: WorldState, events: WorldEvent[]): WorldState {
  const households = state.households.map((household) => ({ ...household, goods: { ...household.goods } }));
  const citizens = state.citizens.map((citizen) => ({ ...citizen }));
  const businesses = state.businesses.map((business) => ({ ...business, goods: { ...business.goods } }));
  const bakeries = businesses.filter((business) => business.kind === 'bakery').sort((a, b) => a.askPrice - b.askPrice || (state.day % 2 ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id)));
  let treasury = state.treasury;
  let reserve = state.foodReserve;
  let missed = 0;
  let bartered = 0;
  let rentCollected = 0;
  let tenantsShort = 0;
  let arrearsRepaid = 0;

  for (const household of [...households].sort((a, b) => a.coins - b.coins)) {
    const members = citizens.filter((citizen) => household.memberIds.includes(citizen.id));
    const need = members.reduce((sum, citizen) => sum + adultFoodNeed(citizen), 0);
    const homeLabor = members.filter((citizen) => citizen.adult).reduce((sum, citizen) => {
      const capacity = citizen.retired ? (citizen.age < 75 ? 0.45 : 0.2) : 1;
      return sum + clamp(capacity - citizen.hoursWorkedToday / 8, 0, capacity);
    }, 0);
    const subsistenceOutput = members.length * 0.1 + homeLabor * 0.9;
    household.goods.bread += subsistenceOutput;
    household.subsistenceToday += subsistenceOutput;
    const desired = Math.max(0, need * 1.5 - household.goods.bread);
    for (const bakery of bakeries) {
      const affordable = Math.floor(household.coins / bakery.askPrice);
      const bought = Math.min(desired, bakery.goods.bread, affordable);
      if (!bought) continue;
      const cost = bought * bakery.askPrice;
      household.coins -= cost;
      household.spendingToday += cost;
      household.goods.bread += bought;
      bakery.goods.bread -= bought;
      bakery.cash += cost * (1 - state.taxRate);
      bakery.revenueToday += cost;
      bakery.soldToday += bought;
      treasury += cost * state.taxRate;
      if (household.goods.bread >= need) break;
    }
    // When coin is scarce but bread is sitting unsold, available household
    // labor can clear the market in kind: hauling, cleaning, childcare, and
    // repairs are exchanged for food. This is real barter, not free relief.
    const availableAdults = members.filter((citizen) => citizen.adult && !citizen.retired && !citizen.employerId).length;
    const olderChildren = members.filter((citizen) => !citizen.adult && citizen.age >= 10).length;
    let barterCapacity = availableAdults * 0.65 + olderChildren * 0.2;
    let barterWanted = Math.max(0, need * 1.15 - household.goods.bread);
    for (const bakery of bakeries) {
      if (barterCapacity <= 0 || barterWanted <= 0) break;
      const marketBuffer = state.citizens.length * 0.45 / Math.max(1, bakeries.length);
      const surplus = Math.max(0, bakery.goods.bread - marketBuffer);
      const exchanged = Math.min(barterCapacity, barterWanted, surplus);
      if (exchanged <= 0) continue;
      household.goods.bread += exchanged;
      household.subsistenceToday += exchanged;
      bakery.goods.bread -= exchanged;
      barterCapacity -= exchanged;
      barterWanted -= exchanged;
      bartered += exchanged;
    }
    let eaten = Math.min(need, household.goods.bread);
    household.goods.bread -= eaten;
    let shortfall = need - eaten;
    if (shortfall > 0 && reserve > 0) {
      const relief = Math.min(shortfall, reserve);
      reserve -= relief;
      shortfall -= relief;
      eaten += relief;
    }
    const missedPeople = shortfall > 0 ? Math.ceil(shortfall) : 0;
    missed += missedPeople;
    household.missedMeals = missedPeople ? household.missedMeals + missedPeople : Math.max(0, household.missedMeals - 1);
    household.foodSecureDays = missedPeople ? 0 : household.foodSecureDays + 1;
    const shortageRatio = need > 0 ? shortfall / need : 0;
    for (const citizen of members) {
      citizen.hunger = shortageRatio > 0 ? clamp(citizen.hunger + 15 * shortageRatio, 0, 100) : clamp(citizen.hunger - 10, 0, 100);
      citizen.health = clamp(citizen.health + (shortageRatio > 0 ? -1.5 * shortageRatio : 0.15), 0, 100);
      citizen.morale = clamp(citizen.morale + (shortageRatio > 0 ? -3 * shortageRatio : 0.3), 0, 100);
    }
    const rentDue = household.dailyRent * state.landlord.rentMultiplier;
    const currentRent = Math.min(household.coins, rentDue);
    household.coins -= currentRent;
    household.spendingToday += currentRent;
    treasury += currentRent;
    rentCollected += currentRent;
    const unpaid = rentDue - currentRent;
    if (unpaid > 0.01) { household.rentArrears += unpaid; tenantsShort += 1; }
    else if (household.rentArrears > 0 && household.coins > household.reservationWage * 5) {
      const repayment = Math.min(household.rentArrears, household.coins - household.reservationWage * 5, rentDue * 0.25);
      household.coins -= repayment;
      household.spendingToday += repayment;
      household.rentArrears -= repayment;
      treasury += repayment;
      rentCollected += repayment;
      arrearsRepaid += repayment;
    }
  }
  if (state.day % 30 === 0 && bartered > 0) events.push(makeEvent(state, 'info', 'Bread clears through barter', `${round(bartered, 1)} meals were exchanged for household labor because useful work existed but coin did not.`));
  if (missed) events.push(makeEvent(state, 'bad', `${missed} residents missed food`, reserve ? 'Purchasing power failed before the town reserve was exhausted.' : 'Market stocks and the town reserve could not meet nutritional demand.'));
  const favorChange = (1.05 - state.landlord.rentMultiplier) * 0.08 - tenantsShort * 0.025 + arrearsRepaid * 0.002;
  return { ...state, households, citizens, businesses, treasury, foodReserve: round(reserve), landlord: { ...state.landlord, rentCollectedToday: round(rentCollected), rentCollectedTotal: round(state.landlord.rentCollectedTotal + rentCollected), tenantFavor: round(clamp(state.landlord.tenantFavor + favorChange, 0, 100), 2) } };
}

function resolveCrime(state: WorldState, events: WorldEvent[]): WorldState {
  const households = state.households.map((household) => ({ ...household, goods: { ...household.goods } }));
  const citizens = state.citizens.map((citizen) => ({ ...citizen }));
  const businesses = state.businesses.map((business) => ({ ...business, goods: { ...business.goods } }));
  const estate = businesses.find((business) => business.kind === 'estate');
  const requiredGuards = requiredGuardsFor(state);
  const estateWorkers = estate?.employeeIds.length ?? 0;
  const guardShare = estateWorkers ? Math.min(estateWorkers, requiredGuards) / estateWorkers : 0;
  const effectiveGuards = (estate?.hoursWorkedToday ?? 0) / 8 * guardShare;
  const guardCoverage = clamp(effectiveGuards / Math.max(1, requiredGuards), 0, 1);
  const hungerRate = citizens.filter((citizen) => citizen.hunger > 15).length / Math.max(1, citizens.length);
  const cashlessRate = households.filter((household) => household.coins < 1).length / Math.max(1, households.length);
  const lowMoraleRate = citizens.filter((citizen) => citizen.morale < 35).length / Math.max(1, citizens.length);
  const householdCash = households.reduce((sum, household) => sum + household.coins, 0);
  const richestShare = Math.max(...households.map((household) => household.coins)) / Math.max(1, householdCash);
  const rentUnrest = Math.max(0, 55 - state.landlord.tenantFavor) / 55;
  const targetLawlessness = clamp(4 + hungerRate * 68 + cashlessRate * 22 + lowMoraleRate * 20 + rentUnrest * 18 + Math.max(0, richestShare - 0.25) * 24 - guardCoverage * 24, 0, 100);
  const lawlessness = round(clamp(state.lawlessness * 0.9 + targetLawlessness * 0.1, 0, 100), 1);
  const expectedAttempts = citizens.length / 100 * lawlessness / 24;
  let attempts = Math.floor(expectedAttempts);
  if (noise(state.seed, state.day, 701) < expectedAttempts - attempts) attempts += 1;
  let prevented = 0;
  let crimes = 0;
  let crimeLoss = 0;
  const preventionChance = clamp(guardCoverage * 0.72, 0, 0.82);

  for (let index = 0; index < attempts; index += 1) {
    if (noise(state.seed, state.day, 710 + index) < preventionChance) {
      prevented += 1;
      continue;
    }
    const offenders = households
      .filter((household) => citizens.some((citizen) => citizen.householdId === household.id && citizen.adult))
      .sort((a, b) => a.coins - b.coins || a.id.localeCompare(b.id));
    if (!offenders.length) continue;
    const offenderPool = Math.max(1, Math.ceil(offenders.length / 3));
    const offender = offenders[Math.floor(noise(state.seed, state.day, 760 + index) * offenderPool)];
    const crimeType = noise(state.seed, state.day, 800 + index);
    if (crimeType < 0.42) {
      const victims = [...households].filter((household) => household.id !== offender.id && household.coins > 0).sort((a, b) => b.coins - a.coins);
      const victim = victims[0];
      if (victim) {
        const stolen = Math.min(victim.coins, 4 + noise(state.seed, state.day, 820 + index) * 8, victim.coins * 0.04);
        victim.coins -= stolen;
        offender.coins += stolen;
        offender.incomeToday += stolen;
        crimeLoss += stolen;
      }
    } else if (crimeType < 0.72) {
      const victim = [...businesses].filter((business) => business.kind !== 'estate' && business.cash > 0).sort((a, b) => b.cash - a.cash)[0];
      if (victim) {
        const stolen = Math.min(victim.cash, 5 + noise(state.seed, state.day, 840 + index) * 10, victim.cash * 0.035);
        victim.cash -= stolen;
        offender.coins += stolen;
        offender.incomeToday += stolen;
        crimeLoss += stolen;
      }
    } else if (crimeType < 0.9) {
      const bakery = [...businesses].filter((business) => business.kind === 'bakery' && business.goods.bread > 0).sort((a, b) => b.goods.bread - a.goods.bread)[0];
      if (bakery) {
        const stolen = Math.min(bakery.goods.bread, 3 + noise(state.seed, state.day, 860 + index) * 7);
        bakery.goods.bread -= stolen;
        offender.goods.bread += stolen;
        crimeLoss += stolen * Math.max(0.5, bakery.askPrice);
      }
    } else {
      const victim = citizens[Math.floor(noise(state.seed, state.day, 880 + index) * citizens.length)];
      if (victim) {
        victim.health = clamp(victim.health - 4 - noise(state.seed, state.day, 900 + index) * 5, 0, 100);
        victim.morale = clamp(victim.morale - 8, 0, 100);
        crimeLoss += 5;
      }
    }
    crimes += 1;
  }
  if (crimes > 0 || prevented > 0) {
    events.push(makeEvent(state, crimes > prevented ? 'bad' : 'info', `${crimes} crimes committed; ${prevented} prevented`, `${round(crimeLoss, 1)}c of cash, food, property, and health was harmed. ${Math.min(estateWorkers, requiredGuards)} guards faced a requirement of ${requiredGuards}.`));
  }
  return {
    ...state, households, citizens, businesses, lawlessness,
    crimesToday: crimes, crimesPreventedToday: prevented, crimeLossToday: round(crimeLoss, 1),
    totalCrimes: state.totalCrimes + crimes,
  };
}

function stockFoodReserve(state: WorldState, events: WorldEvent[]): WorldState {
  const businesses = state.businesses.map((business) => ({ ...business, goods: { ...business.goods } }));
  const bakeries = businesses.filter((business) => business.kind === 'bakery').sort((a, b) => a.askPrice - b.askPrice || (state.day % 2 ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id)));
  const reserveTarget = state.citizens.length * 3;
  const unpaidBread = bakeries.reduce((sum, bakery) => sum + bakery.wageArrears / Math.max(0.01, bakery.askPrice), 0);
  const reserveCapacity = Math.max(0, reserveTarget - state.foodReserve);
  let wanted = Math.min(25, reserveCapacity, unpaidBread > 0 ? Math.max(5, unpaidBread) : reserveCapacity);
  let treasury = state.treasury;
  let purchased = 0;
  for (const bakery of bakeries) {
    if (wanted <= 0 || treasury <= 400) break;
    const marketBuffer = state.citizens.length * 0.5 / Math.max(1, bakeries.length);
    const available = Math.max(0, bakery.goods.bread - marketBuffer);
    const quantity = Math.min(wanted, available, (treasury - 400) / bakery.askPrice);
    if (quantity <= 0) continue;
    const cost = quantity * bakery.askPrice;
    bakery.goods.bread -= quantity;
    bakery.cash += cost;
    bakery.revenueToday += cost;
    bakery.soldToday += quantity;
    treasury -= cost;
    wanted -= quantity;
    purchased += quantity;
  }
  for (const business of businesses.filter((item) => item.kind === 'woodcutter' || item.kind === 'blacksmith')) {
    if (!business.outputGood || business.wageArrears <= 0 || treasury <= 400) continue;
    const quantity = Math.min(business.goods[business.outputGood], business.wageArrears / Math.max(0.01, business.askPrice), (treasury - 400) / business.askPrice);
    const cost = quantity * business.askPrice;
    business.goods[business.outputGood] -= quantity;
    business.cash += cost;
    business.revenueToday += cost;
    business.soldToday += quantity;
    treasury -= cost;
  }
  if (purchased > 0 && state.day % 30 === 0) {
    events.push(makeEvent(state, 'good', 'The public granary buys local bread', `${round(purchased)} meals moved from market surplus into the relief reserve.`));
  }
  return { ...state, businesses, treasury, foodReserve: round(state.foodReserve + purchased) };
}

function regionalTrade(state: WorldState, events: WorldEvent[]): WorldState {
  const businesses = state.businesses.map((business) => ({ ...business, goods: { ...business.goods } }));
  const region = { ...state.regionalMarket, goods: { ...state.regionalMarket.goods }, exportsToday: emptyGoods(), importsToday: emptyGoods() };
  const merchant = businesses.find((business) => business.kind === 'merchant')!;
  const exportCapacity = Math.floor(merchant.hoursWorkedToday * 2 * (1 + state.publicWorks.market * 0.4));
  let remaining = exportCapacity;
  const targets: Record<GoodId, number> = { grain: 180, flour: 100, bread: 120, firewood: 180, tools: 30 };

  const exporters = businesses.filter((business) => business.outputGood);
  const exportOffset = state.day % Math.max(1, exporters.length);
  for (let exportIndex = 0; exportIndex < exporters.length; exportIndex += 1) {
    const business = exporters[(exportIndex + exportOffset) % exporters.length];
    if (!business.outputGood || remaining <= 0) continue;
    const good = business.outputGood;
    const surplus = Math.max(0, Math.floor(business.goods[good] - targets[good]));
    const quantity = Math.min(surplus, remaining, 18 + state.publicWorks.market * 6, Math.floor(region.cash / region.prices[good]));
    if (!quantity) continue;
    const value = quantity * region.prices[good];
    const commission = value * 0.15;
    business.goods[good] -= quantity;
    business.cash += value - commission;
    business.revenueToday += value - commission;
    business.soldToday += quantity;
    merchant.cash += commission;
    merchant.revenueToday += commission;
    region.goods[good] += quantity;
    region.cash -= value;
    region.exportsToday[good] += quantity;
    remaining -= quantity;
  }

  // The surrounding region consumes goods too. This is a physical sink, not a
  // monetary cheat: village exports still draw from the region's finite cash.
  region.goods.bread = Math.max(0, region.goods.bread - 35);
  region.goods.grain = Math.max(0, region.goods.grain - 12);
  region.goods.firewood = Math.max(0, region.goods.firewood - 8);

  const marketBread = businesses.filter((business) => business.kind === 'bakery').reduce((sum, business) => sum + business.goods.bread, 0);
  if (marketBread < state.citizens.length * 0.4 && region.goods.bread > 0) {
    const bakery = businesses.find((business) => business.kind === 'bakery')!;
    const quantity = Math.min(60, region.goods.bread, Math.floor(bakery.cash / region.prices.bread));
    const value = quantity * region.prices.bread;
    region.goods.bread -= quantity;
    region.cash += value;
    region.importsToday.bread += quantity;
    bakery.goods.bread += quantity;
    bakery.cash -= value;
    bakery.costsToday += value;
  }
  const exportTotal = GOODS.reduce((sum, good) => sum + region.exportsToday[good], 0);
  if (exportTotal > 0 && state.day % 7 === 0) events.push(makeEvent(state, 'good', `${exportTotal} goods left by caravan`, 'Regional demand converted local surplus into business working capital.'));
  return { ...state, businesses, regionalMarket: region };
}

function applyInventoryLosses(state: WorldState, events: WorldEvent[]): WorldState {
  const businesses = state.businesses.map((business) => ({ ...business, goods: { ...business.goods } }));
  let totalLost = 0;
  for (const business of businesses) {
    let loss = 0;
    const storageFactor = 1 - state.publicWorks.granary * 0.18;
    if (business.kind === 'farm') loss = business.goods.grain * 0.0009 * storageFactor;
    else if (business.kind === 'mill') loss = business.goods.flour * 0.003 * storageFactor;
    else if (business.kind === 'bakery') loss = business.goods.bread * 0.018 * storageFactor;
    else if (business.kind === 'woodcutter') loss = business.goods.firewood * 0.00015;
    else if (business.kind === 'blacksmith') loss = business.goods.tools * 0.00005;
    if (!business.outputGood || loss <= 0) continue;
    business.goods[business.outputGood] = Math.max(0, business.goods[business.outputGood] - loss);
    business.spoiledToday += loss;
    totalLost += loss;
  }
  const reserveLoss = state.foodReserve * 0.0015 * (1 - state.publicWorks.granary * 0.22);
  totalLost += reserveLoss;
  if (state.day % 30 === 0 && totalLost > 1) events.push(makeEvent(state, 'warn', 'Stored goods deteriorate', `${round(totalLost, 1)} goods were lost today to stale bread, damp grain, pests, and ordinary storage damage.`));
  return { ...state, businesses, foodReserve: round(Math.max(0, state.foodReserve - reserveLoss)) };
}

function settleAndPlan(state: WorldState, events: WorldEvent[]): WorldState {
  let households = state.households.map((household) => ({ ...household }));
  let treasury = state.treasury;
  let businesses = state.businesses.map((business) => {
    const profit = round(business.revenueToday - business.costsToday);
    const unsold = Boolean(business.outputGood && business.goods[business.outputGood] > 0 && business.revenueToday < 0.01);
    const payroll = business.employeeIds.length * business.wageOffer;
    const insolvent = business.cash < Math.max(1, payroll) && (business.wageArrears > 0 || business.tradeDebt > 0 || business.publicDebt > 600);
    const salesHistory = [...business.salesHistory, business.soldToday].slice(-30);
    let farm = business.farm ? { ...business.farm } : undefined;
    if (farm) {
      const farms = Math.max(1, state.businesses.filter((item) => item.kind === 'farm').length);
      const baselineShare = villageGrainNeed(state) / farms;
      const observed = rollingAverage(salesHistory);
      farm.expectedDailySales = round(farm.expectedDailySales * 0.85 + Math.max(baselineShare * 0.65, observed) * 0.15, 2);
      farm.inventoryDays = round(business.goods.grain / Math.max(0.1, farm.expectedDailySales), 1);
    }
    return {
      ...business,
      farm,
      profitToday: profit,
      lastRevenue: round(business.revenueToday),
      lastCosts: round(business.costsToday),
      lastProduced: round(business.producedToday, 1),
      lastSold: round(business.soldToday, 1),
      lastSpoiled: round(business.spoiledToday, 1),
      salesHistory,
      profitHistory: [...business.profitHistory, profit].slice(-30),
      daysWithoutSales: unsold ? business.daysWithoutSales + 1 : 0,
      insolventDays: insolvent ? business.insolventDays + 1 : Math.max(0, business.insolventDays - 1),
    };
  });
  const farmBusinesses = businesses.filter((business) => business.kind === 'farm');
  const averageGrainPrice = farmBusinesses.reduce((sum, business) => sum + business.askPrice, 0) / Math.max(1, farmBusinesses.length);
  businesses = businesses.map((business) => {
    let askPrice = business.askPrice;
    if (state.day % 7 !== 0) return business;
    if (business.kind === 'farm') {
      const coverage = business.farm?.inventoryDays ?? 45;
      if (coverage > 90 || business.daysWithoutSales > 14) askPrice *= 0.97;
      else if (coverage > 55) askPrice *= 0.985;
      else if (coverage < 20) askPrice *= 1.025;
      const liquidationFloor = business.daysWithoutSales > 30 ? 0.75 : 1.1;
      askPrice = clamp(askPrice, liquidationFloor, 3.2);
    } else if (business.kind === 'mill') {
      const unitCost = averageGrainPrice + business.wageOffer / 8;
      const target = unitCost * 1.08;
      askPrice = business.daysWithoutSales > 14 ? askPrice * 0.97 : askPrice * 0.9 + target * 0.1;
      askPrice = clamp(askPrice, unitCost * (business.daysWithoutSales > 30 ? 0.88 : 1.01), 4.2);
    } else if (business.kind === 'bakery') {
      const millPrice = businesses.find((item) => item.kind === 'mill')?.askPrice ?? averageGrainPrice * 1.28;
      const unitCost = millPrice / 3 + business.wageOffer / 24;
      const target = unitCost * 1.12;
      if (business.daysWithoutSales > 10) askPrice *= 0.95;
      else if (business.goods.bread > state.citizens.length * 1.5) askPrice *= 0.97;
      else if (business.goods.bread < state.citizens.length * 0.25) askPrice *= 1.008;
      else askPrice = askPrice * 0.92 + target * 0.08;
      askPrice = clamp(askPrice, unitCost * (business.daysWithoutSales > 30 ? 0.88 : 1.01), 3.5);
    }
    return { ...business, askPrice: round(askPrice) };
  });
  if (state.day % 7 === 0) {
    const householdWageFloor = households.reduce((sum, household) => sum + household.reservationWage, 0) / Math.max(1, households.length);
    businesses = businesses.map((business) => {
      const desired = desiredWorkersFor(business, { ...state, businesses });
      const vacancies = Math.max(0, desired - business.employeeIds.length);
      const avgProfit = rollingAverage(business.profitHistory);
      let wage = business.wageOffer;
      const premium = ({ farm: 1, mill: 1.2, bakery: 1.1, woodcutter: 1, blacksmith: 1.3, merchant: 1.15, estate: 1 } as Record<BusinessKind, number>)[business.kind];
      let targetWage = clamp(householdWageFloor * premium, 3.5, 10);
      if (vacancies && business.cash > wage * 10) targetWage *= 1.15;
      if (business.wageArrears > 0 || avgProfit < 0) targetWage *= 0.95;
      const weeklyLimit = wage * 0.02;
      wage += clamp(targetWage - wage, -weeklyLimit, weeklyLimit);
      const reason = business.wageArrears > 0
        ? 'Outstanding wage claims make new hiring offers unsustainable.'
        : vacancies
        ? `${vacancies} useful positions remain vacant; the weekly offer is moving upward.`
        : avgProfit < 0
          ? 'Thirty-day cash flow is weak, limiting payroll growth.'
          : 'Staffing matches physical tasks and expected demand.';
      return { ...business, desiredWorkers: desired, wageOffer: round(clamp(wage, 3.5, 16)), reason };
    });
  }

  if (state.day % 30 === 0) {
    let totalFarmLand = businesses.filter((business) => business.kind === 'farm').reduce((sum, business) => sum + (business.farm?.landAcres ?? 0), 0);
    for (const business of businesses) {
      if (business.kind === 'farm' && business.farm) {
        const avgProfit = rollingAverage(business.profitHistory);
        const arableCapacity = Math.max(280, state.citizens.length * 3);
        if (avgProfit > 2 && business.farm.inventoryDays < 30 && business.cash > 1100 && totalFarmLand < arableCapacity) {
          const added = Math.min(5, arableCapacity - totalFarmLand);
          business.cash -= 120;
          treasury += 120;
          business.costsToday += 120;
          business.farm.landAcres += added;
          resizeFarmGeometry(business.farm, state.publicWorks.roads);
          totalFarmLand += added;
          events.push(makeEvent(state, 'good', `${business.name} leases ${added} more acres`, 'Sustained sales, low stocks, and retained cash justify measured expansion.'));
        } else if (business.farm.inventoryDays > 150 && business.farm.landAcres > 40) {
          business.farm.landAcres -= 5;
          resizeFarmGeometry(business.farm, state.publicWorks.roads);
          business.farm.plannedAcres = Math.min(business.farm.plannedAcres, business.farm.landAcres);
          totalFarmLand -= 5;
          events.push(makeEvent(state, 'info', `${business.name} releases five idle acres`, 'Long inventory coverage makes expansion uneconomic; the lease returns to the lord.'));
        }
      }
      if (!business.ownerHouseholdId) continue;
      const owner = households.find((household) => household.id === business.ownerHouseholdId)!;
      const payroll = business.wageOffer * Math.max(1, business.employeeIds.length);
      if (business.cash > payroll * 50 && rollingAverage(business.profitHistory) > 0) {
        const dividend = Math.min(business.cash - payroll * 40, business.cash * 0.08);
        business.cash -= dividend;
        owner.coins += dividend;
      } else if (business.cash < payroll * 8 && owner.coins > owner.reservationWage * 30) {
        const investment = Math.min(owner.coins - owner.reservationWage * 20, payroll * 12);
        owner.coins -= investment;
        business.cash += investment;
        events.push(makeEvent(state, 'info', `${owner.name} recapitalizes ${business.name}`, `${round(investment)} household coins return to productive working capital.`));
      }
    }
  }

  households = households.map((household) => ({
    ...household,
    lastIncome: round(household.incomeToday),
    lastSpending: round(household.spendingToday),
    lastSubsistence: round(household.subsistenceToday, 1),
  }));
  businesses = businesses.map((business) => ({
    ...business,
    revenueToday: 0, costsToday: 0, hoursWorkedToday: 0, wagesPaidToday: 0,
    producedToday: 0, soldToday: 0, spoiledToday: 0,
  }));
  return { ...state, households, businesses, treasury };
}

function restructureInsolventBusinesses(state: WorldState, events: WorldEvent[]): WorldState {
  if (state.day % 30 !== 0) return state;
  const households = state.households.map((household) => ({ ...household, ownedBusinessIds: [...household.ownedBusinessIds] }));
  const businesses = state.businesses.map((business) => ({ ...business }));
  let tradeClaims = state.tradeClaims.map((claim) => ({ ...claim }));
  let treasury = state.treasury;
  for (const business of businesses) {
    const essential = ['farm', 'mill', 'bakery'].includes(business.kind);
    const failing = business.insolventDays >= 20 || business.wageArrears > business.wageOffer * 5 || (business.publicDebt >= 1600 && rollingAverage(business.profitHistory) < 0);
    if (!essential || !failing) continue;
    const currentOwner = households.find((household) => household.id === business.ownerHouseholdId);
    const candidates = [...households]
      .filter((household) => household.coins > household.reservationWage * 25)
      .sort((a, b) => b.coins - a.coins);
    const receiver = candidates[0];
    let capital = 0;
    if (receiver) {
      capital = Math.min(250, Math.max(0, receiver.coins - receiver.reservationWage * 20));
      receiver.coins -= capital;
      business.cash += capital;
      if (currentOwner && currentOwner.id !== receiver.id) currentOwner.ownedBusinessIds = currentOwner.ownedBusinessIds.filter((id) => id !== business.id);
      if (!receiver.ownedBusinessIds.includes(business.id)) receiver.ownedBusinessIds.push(business.id);
      business.ownerHouseholdId = receiver.id;
    } else if (treasury > 400) {
      capital = Math.min(180, treasury - 400);
      treasury -= capital;
      business.cash += capital;
      business.publicDebt += capital;
    }
    if (capital < 180 && treasury > 600) {
      const publicCapital = Math.min(180 - capital, treasury - 600);
      treasury -= publicCapital;
      business.cash += publicCapital;
      business.publicDebt += publicCapital;
      capital += publicCapital;
    }
    const writtenDown = business.publicDebt * 0.3;
    business.publicDebt = round(business.publicDebt - writtenDown);
    let supplierWriteDown = 0;
    for (const claim of tradeClaims.filter((claim) => claim.buyerBusinessId === business.id)) {
      const reduction = claim.amount * 0.35;
      claim.amount = round(claim.amount - reduction);
      supplierWriteDown += reduction;
    }
    tradeClaims = tradeClaims.filter((claim) => claim.amount > 0.01);
    business.tradeDebt = round(tradeClaims.filter((claim) => claim.buyerBusinessId === business.id).reduce((sum, claim) => sum + claim.amount, 0));
    business.insolventDays = 0;
    business.restructures += 1;
    business.wageOffer = round(clamp(business.wageOffer, 3.5, 12));
    events.push(makeEvent(state, 'warn', `${business.name} enters receivership`, `${round(capital)} fresh coins recapitalize production; ${round(writtenDown)} civic debt and ${round(supplierWriteDown)} supplier debt are restructured. Worker claims remain senior.`));
  }
  return { ...state, households, businesses, treasury, tradeClaims };
}

function openBusinessForUnmetDemand(state: WorldState, events: WorldEvent[]): WorldState {
  if (state.day % 30 !== 0) return state;
  const bakeries = state.businesses.filter((business) => business.kind === 'bakery');
  if (bakeries.length >= 5) return state;
  const mill = state.businesses.find((business) => business.kind === 'mill');
  const marketBread = bakeries.reduce((sum, bakery) => sum + bakery.goods.bread, 0);
  const hungry = state.citizens.filter((citizen) => citizen.hunger > 15).length;
  const viableBakery = bakeries.some((bakery) => bakery.cash > bakery.wageOffer * 8 && bakery.tradeDebt < 250);
  if (hungry < 5 || marketBread > state.citizens.length * 0.2 || !mill || mill.goods.flour < state.citizens.length * 0.25 || viableBakery) return state;
  const households = state.households.map((household) => ({ ...household, ownedBusinessIds: [...household.ownedBusinessIds] }));
  const owner = [...households].sort((a, b) => b.coins - a.coins)[0];
  if (!owner) return state;
  const ownerContribution = Math.min(160, Math.max(0, owner.coins - owner.reservationWage * 12));
  const publicCapital = Math.min(250, Math.max(0, state.treasury - 600));
  if (ownerContribution + publicCapital < 180) return state;
  const id = `bakery-${bakeries.length + 1}`;
  owner.coins -= ownerContribution;
  owner.ownedBusinessIds.push(id);
  const wageOffer = round(rollingAverage(bakeries.map((bakery) => bakery.wageOffer)) || 3.5);
  const askPrice = round(Math.max(0.8, marketBreadPrice(state)));
  const bakery: Business = {
    id, name: `Guild Oven ${bakeries.length - 1}`, kind: 'bakery', ownerHouseholdId: owner.id,
    cash: round(ownerContribution + publicCapital), goods: emptyGoods(), wageOffer,
    desiredWorkers: 2, maximumWorkers: 6, employeeIds: [], outputGood: 'bread', askPrice,
    hoursWorkedToday: 0, wagesPaidToday: 0, wageArrears: 0, publicDebt: round(publicCapital), tradeDebt: 0,
    revenueToday: 0, costsToday: 0, lastRevenue: 0, lastCosts: 0,
    producedToday: 0, soldToday: 0, spoiledToday: 0, lastProduced: 0, lastSold: 0, lastSpoiled: 0,
    salesHistory: [], profitToday: 0, profitHistory: [], daysWithoutSales: 0, insolventDays: 0,
    restructures: 0, reason: 'A new oven enters because hungry customers, available flour, and failed incumbents create an opportunity.',
  };
  events.push(makeEvent(state, 'good', `${bakery.name} opens`, `${owner.name} invests ${round(ownerContribution)}c and the lord advances ${round(publicCapital)}c because existing bakeries cannot meet demand.`));
  return { ...state, households, businesses: [...state.businesses, bakery], treasury: state.treasury - publicCapital };
}

function openFarmForDemand(state: WorldState, events: WorldEvent[]): WorldState {
  if (state.day % 30 !== 0) return state;
  const farms = state.businesses.filter((business) => business.kind === 'farm');
  const maximumFarms = Math.max(10, Math.ceil(state.citizens.length / 35));
  if (farms.length >= maximumFarms || state.citizens.length <= farms.length * 26) return state;
  const grainStock = farms.reduce((sum, farm) => sum + farm.goods.grain, 0);
  const grainDays = grainStock / Math.max(0.1, villageGrainNeed(state));
  if (grainDays >= 45) return state;
  const totalLand = farms.reduce((sum, farm) => sum + (farm.farm?.landAcres ?? 0), 0);
  const arableCapacity = Math.max(280, state.citizens.length * 3);
  const availableLand = arableCapacity - totalLand;
  if (availableLand < 20) return state;
  const households = state.households.map((household) => ({ ...household, ownedBusinessIds: [...household.ownedBusinessIds] }));
  const candidates = households
    .filter((household) => state.citizens.some((citizen) => citizen.householdId === household.id && citizen.adult && !citizen.retired && citizen.skill === 'farm'))
    .filter((household) => household.ownedBusinessIds.filter((businessId) => farms.some((farm) => farm.id === businessId)).length < 2)
    .filter((household) => household.coins - household.reservationWage * 15 >= 30)
    .sort((a, b) => {
      const aFarms = a.ownedBusinessIds.filter((businessId) => farms.some((farm) => farm.id === businessId)).length;
      const bFarms = b.ownedBusinessIds.filter((businessId) => farms.some((farm) => farm.id === businessId)).length;
      return aFarms - bFarms || a.ownedBusinessIds.length - b.ownedBusinessIds.length || b.coins - a.coins;
    });
  const owner = candidates[0];
  if (!owner) return state;
  const ownerContribution = Math.min(220, Math.max(0, owner.coins - owner.reservationWage * 15));
  const publicCapital = Math.min(220, Math.max(0, state.treasury - 600));
  if (ownerContribution + publicCapital < 180) return state;
  const landAcres = Math.min(40, availableLand);
  const cultivatedAcres = Math.min(12, landAcres);
  const id = `farm-${farms.length + 1}`;
  owner.coins -= ownerContribution;
  owner.ownedBusinessIds.push(id);
  const wageOffer = round(rollingAverage(farms.map((farm) => farm.wageOffer)) || 3.5);
  const askPrice = round(rollingAverage(farms.map((farm) => farm.askPrice)) || 1.5);
  const farm: Business = {
    id, name: `Frontier Farm ${farms.length - 3}`, kind: 'farm', ownerHouseholdId: owner.id,
    cash: round(ownerContribution + publicCapital), goods: { ...emptyGoods(), grain: 20 }, wageOffer,
    desiredWorkers: 2, maximumWorkers: 24, employeeIds: [], outputGood: 'grain', askPrice,
    hoursWorkedToday: 0, wagesPaidToday: 0, wageArrears: 0, publicDebt: round(publicCapital), tradeDebt: 0,
    revenueToday: 0, costsToday: 0, lastRevenue: 0, lastCosts: 0,
    producedToday: 0, soldToday: 0, spoiledToday: 0, lastProduced: 0, lastSold: 0, lastSpoiled: 0,
    salesHistory: [], profitToday: 0, profitHistory: [], daysWithoutSales: 0, insolventDays: 0, restructures: 0,
    reason: 'Population growth and low grain coverage make a new land lease economically viable.',
    farm: { phase: 'prepare', phaseDay: 0, taskHoursRemaining: cultivatedAcres * 18, cropGrowthDays: 0, careHours: 0, landAcres, cultivatedAcres, plannedAcres: cultivatedAcres, expectedDailySales: round(villageGrainNeed(state) / (farms.length + 1), 2), inventoryDays: 0, dailyLaborHours: 0, harvests: 0, ...farmGeometry(farms.length, landAcres, state.publicWorks.roads), internalTravelHours: 0 },
  };
  events.push(makeEvent(state, 'good', `${owner.name} establishes ${farm.name}`, `${landAcres} acres are leased; ${round(ownerContribution)}c private capital and ${round(publicCapital)}c civic credit finance the new farm.`));
  return { ...state, households, businesses: [...state.businesses, farm], treasury: state.treasury - publicCapital };
}

function annualMortality(age: number) {
  if (age < 1) return 0.05;
  if (age < 15) return 0.004;
  if (age < 40) return 0.0025;
  if (age < 55) return 0.008;
  if (age < 65) return 0.02;
  if (age < 75) return 0.06;
  return 0.15;
}

function demographics(state: WorldState, events: WorldEvent[]): WorldState {
  if (state.day % 30 !== 0) return state;
  let households = state.households.map((household) => ({ ...household, memberIds: [...household.memberIds], goods: { ...household.goods }, ownedBusinessIds: [...household.ownedBusinessIds] }));
  let citizens = state.citizens.map((citizen) => ({ ...citizen, parentIds: [...citizen.parentIds] }));
  let businesses = state.businesses.map((business) => ({ ...business }));
  let regionalMarket = { ...state.regionalMarket, goods: { ...state.regionalMarket.goods } };
  let treasury = state.treasury;
  let births = state.births;
  let deaths = state.deaths;
  let immigrants = state.immigrants;
  let emigrants = state.emigrants;
  let householdsFormed = state.householdsFormed;

  if (state.day % YEAR_DAYS === 0) {
    for (const citizen of citizens) {
      citizen.age += 1;
      if (!citizen.adult && citizen.age >= 15) {
        citizen.adult = true;
        events.push(makeEvent(state, 'info', `${citizen.name} enters the labor market`, 'A former dependent can now seek paid work, household production, or an apprenticeship.'));
      }
    }
  }

  for (const citizen of citizens) {
    if (!citizen.adult) continue;
    const household = households.find((item) => item.id === citizen.householdId);
    const supported = Boolean(household && (household.coins > household.reservationWage * 25 || citizens.some((other) => other.householdId === household.id && other.id !== citizen.id && other.adult && !other.retired && other.age < 60)));
    citizen.retired = citizen.age >= 72 || (citizen.age >= 60 && citizen.health < 58) || (citizen.age >= 65 && supported);
  }

  const deceasedByHousehold = new Map<string, string[]>();
  const survivors: Citizen[] = [];
  for (let index = 0; index < citizens.length; index += 1) {
    const citizen = citizens[index];
    const intervalRisk = 1 - (1 - annualMortality(citizen.age)) ** (30 / YEAR_DAYS);
    const conditionMultiplier = (1 + citizen.hunger / 55) * (1 + Math.max(0, 55 - citizen.health) / 45) * (1 + state.lawlessness / 250);
    const dies = citizen.wageArrears <= 0.01 && noise(state.seed, state.day, 1400 + index) < clamp(intervalRisk * conditionMultiplier, 0, 0.75);
    if (!dies) {
      survivors.push(citizen);
      continue;
    }
    deaths += 1;
    const ids = deceasedByHousehold.get(citizen.householdId) ?? [];
    ids.push(citizen.id);
    deceasedByHousehold.set(citizen.householdId, ids);
  }
  citizens = survivors;
  const livingIds = new Set(citizens.map((citizen) => citizen.id));
  for (const citizen of citizens) if (citizen.partnerId && !livingIds.has(citizen.partnerId)) citizen.partnerId = null;
  for (const household of households) household.memberIds = household.memberIds.filter((id) => livingIds.has(id));

  for (const household of [...households].filter((item) => item.memberIds.length === 0)) {
    const deceasedIds = deceasedByHousehold.get(household.id) ?? [];
    const heir = citizens.find((citizen) => citizen.parentIds.some((parentId) => deceasedIds.includes(parentId)));
    const heirHousehold = heir ? households.find((item) => item.id === heir.householdId) : undefined;
    if (heirHousehold) {
      heirHousehold.coins += household.coins;
      for (const good of GOODS) heirHousehold.goods[good] += household.goods[good];
      for (const businessId of household.ownedBusinessIds) {
        if (!heirHousehold.ownedBusinessIds.includes(businessId)) heirHousehold.ownedBusinessIds.push(businessId);
        const business = businesses.find((item) => item.id === businessId);
        if (business) business.ownerHouseholdId = heirHousehold.id;
      }
    } else {
      treasury += household.coins;
      for (const businessId of household.ownedBusinessIds) {
        const business = businesses.find((item) => item.id === businessId);
        if (!business) continue;
        const successor = citizens
          .filter((citizen) => citizen.adult && !citizen.retired && (citizen.skill === business.kind || business.employeeIds.includes(citizen.id)))
          .map((citizen) => households.find((item) => item.id === citizen.householdId))
          .filter((item): item is Household => Boolean(item && item.id !== household.id))
          .sort((a, b) => a.ownedBusinessIds.length - b.ownedBusinessIds.length || b.coins - a.coins)[0];
        if (!successor) {
          business.ownerHouseholdId = null;
          continue;
        }
        const leasePrice = Math.min(80, Math.max(0, successor.coins - successor.reservationWage * 10));
        successor.coins -= leasePrice;
        treasury += leasePrice;
        if (!successor.ownedBusinessIds.includes(business.id)) successor.ownedBusinessIds.push(business.id);
        business.ownerHouseholdId = successor.id;
        events.push(makeEvent(state, 'info', `${successor.name} takes over ${business.name}`, `${round(leasePrice)}c secures the lease after the former household leaves no direct heir.`));
      }
    }
    households = households.filter((item) => item.id !== household.id);
  }

  const eligible = citizens
    .filter((citizen) => citizen.adult && !citizen.retired && !citizen.partnerId && citizen.age >= 18 && citizen.age <= 55)
    .filter((citizen) => (households.find((household) => household.id === citizen.householdId)?.memberIds.length ?? 0) > 1)
    .sort((a, b) => a.age - b.age || a.id.localeCompare(b.id));
  const paired = new Set<string>();
  let newHouseholdsThisPeriod = 0;
  for (let index = 0; index < eligible.length && newHouseholdsThisPeriod < 2 && households.length < state.settlement.housingCapacity; index += 1) {
    const first = eligible[index];
    if (paired.has(first.id) || noise(state.seed, state.day, 1600 + index) > 0.22) continue;
    const second = eligible.find((candidate) => !paired.has(candidate.id) && candidate.id !== first.id && candidate.householdId !== first.householdId);
    if (!second) continue;
    const firstHome = households.find((household) => household.id === first.householdId)!;
    const secondHome = households.find((household) => household.id === second.householdId)!;
    householdsFormed += 1;
    const id = `new-house-${householdsFormed}`;
    const firstGift = Math.min(20, Math.max(0, firstHome.coins - firstHome.reservationWage * 12) * 0.12);
    const secondGift = Math.min(20, Math.max(0, secondHome.coins - secondHome.reservationWage * 12) * 0.12);
    firstHome.coins -= firstGift;
    secondHome.coins -= secondGift;
    firstHome.memberIds = firstHome.memberIds.filter((memberId) => memberId !== first.id);
    secondHome.memberIds = secondHome.memberIds.filter((memberId) => memberId !== second.id);
    first.householdId = id;
    second.householdId = id;
    first.partnerId = second.id;
    second.partnerId = first.id;
    const plot = settlementPlot(households.length, state.seed);
    households.push({
      id, name: `Newstead ${householdsFormed}`, memberIds: [first.id, second.id], coins: firstGift + secondGift,
      goods: { ...emptyGoods(), bread: 4, firewood: 2 }, dailyRent: round(0.9 + noise(state.seed, state.day, 1700 + index) * 0.3),
      debt: 0, rentArrears: 0, missedMeals: 0, reservationWage: 2, ownedBusinessIds: [], foodSecureDays: 10,
      incomeToday: 0, spendingToday: 0, subsistenceToday: 0, lastIncome: 0, lastSpending: 0, lastSubsistence: 0,
      ...plot, homeBuiltDay: state.day,
    });
    paired.add(first.id);
    paired.add(second.id);
    newHouseholdsThisPeriod += 1;
    events.push(makeEvent(state, 'good', `${first.name} and ${second.name} establish Newstead ${householdsFormed}`, `${round(firstGift + secondGift)}c of family gifts become the new household's starting capital.`));
  }

  for (let index = 0; index < households.length; index += 1) {
    const household = households[index];
    const members = citizens.filter((citizen) => household.memberIds.includes(citizen.id));
    const prospectiveParents = members.filter((citizen) => citizen.partnerId && citizen.age >= 18 && citizen.age <= 42 && livingIds.has(citizen.partnerId));
    const children = members.filter((citizen) => !citizen.adult);
    if (prospectiveParents.length >= 2 && children.length < 4 && members.length < 7 && household.foodSecureDays > 20 && noise(state.seed, state.day, 1800 + index) < 0.045) {
      births += 1;
      const parents = prospectiveParents.slice(0, 2);
      const baby: Citizen = {
        id: `born-${births}`, name: `Child ${births}`, householdId: household.id, age: 0, adult: false, retired: false,
        partnerId: null, parentIds: parents.map((parent) => parent.id), employerId: null, skill: parents[0].skill,
        health: 82, hunger: 0, morale: 75, hoursWorkedToday: 0, wagePaidToday: 0, wageArrears: 0,
        positionX: household.homeX, positionY: household.homeY, location: 'home', journey: null,
      };
      citizens.push(baby);
      livingIds.add(baby.id);
      household.memberIds.push(baby.id);
      events.push(makeEvent(state, 'good', `${baby.name} is born in ${household.name}`, 'A food-secure partnered household grows, increasing consumption before future labor supply.'));
    }
  }

  const foodNeed = citizens.reduce((sum, citizen) => sum + adultFoodNeed(citizen), 0);
  const marketBread = businesses.filter((business) => business.kind === 'bakery').reduce((sum, business) => sum + business.goods.bread, 0);
  const foodDays = (marketBread + state.foodReserve) / Math.max(1, foodNeed);
  const hungryRate = citizens.filter((citizen) => citizen.hunger > 15).length / Math.max(1, citizens.length);
  const migrationChance = clamp((foodDays - 5) * 0.06 + (state.lawlessness < 20 ? 0.06 : 0) + (treasury > 1000 ? 0.04 : 0), 0, 0.4);
  if (households.length < state.settlement.housingCapacity && hungryRate === 0 && state.lawlessness < 25 && treasury > 650 && noise(state.seed, state.day, 1950) < migrationChance) {
    householdsFormed += 1;
    const householdId = `migrant-house-${householdsFormed}`;
    const plot = settlementPlot(households.length, state.seed);
    const grant = Math.min(30, treasury - 600);
    treasury -= grant;
    const firstId = `migrant-${immigrants + 1}`;
    const secondId = `migrant-${immigrants + 2}`;
    const skills: BusinessKind[] = ['farm', 'farm', 'bakery', 'woodcutter', 'mill'];
    const first: Citizen = { id: firstId, name: `Settler ${immigrants + 1}`, householdId, age: 20 + Math.floor(noise(state.seed, state.day, 1960) * 15), adult: true, retired: false, partnerId: secondId, parentIds: [], employerId: null, skill: skills[Math.floor(noise(state.seed, state.day, 1961) * skills.length)], health: 84, hunger: 0, morale: 68, hoursWorkedToday: 0, wagePaidToday: 0, wageArrears: 0, positionX: plot.homeX, positionY: plot.homeY, location: 'home', journey: null };
    const second: Citizen = { ...first, id: secondId, name: `Settler ${immigrants + 2}`, age: 20 + Math.floor(noise(state.seed, state.day, 1962) * 15), partnerId: firstId, skill: skills[Math.floor(noise(state.seed, state.day, 1963) * skills.length)] };
    citizens.push(first, second);
    immigrants += 2;
    households.push({ id: householdId, name: `Settler House ${householdsFormed}`, memberIds: [firstId, secondId], coins: grant, goods: { ...emptyGoods(), bread: 6, firewood: 3 }, dailyRent: 1, rentArrears: 0, debt: 0, missedMeals: 0, reservationWage: 2, ownedBusinessIds: [], foodSecureDays: 12, incomeToday: 0, spendingToday: 0, subsistenceToday: 0, lastIncome: 0, lastSpending: 0, lastSubsistence: 0, ...plot, homeBuiltDay: state.day });
    events.push(makeEvent(state, 'good', 'A settler household arrives', `${foodDays.toFixed(1)} days of prepared food, low lawlessness, and a ${round(grant)}c settlement grant attract two adults from the surrounding region.`));
  }

  if ((hungryRate > 0.25 || state.lawlessness > 60) && noise(state.seed, state.day, 1980) < 0.35) {
    const leaving = [...households]
      .filter((household) => household.ownedBusinessIds.length === 0)
      .filter((household) => citizens.every((citizen) => citizen.householdId !== household.id || citizen.wageArrears <= 0.01))
      .sort((a, b) => a.coins - b.coins)[0];
    if (leaving) {
      const leavingIds = new Set(leaving.memberIds);
      const count = leaving.memberIds.length;
      regionalMarket.cash += leaving.coins;
      for (const good of GOODS) regionalMarket.goods[good] += leaving.goods[good];
      citizens = citizens.filter((citizen) => !leavingIds.has(citizen.id));
      for (const citizen of citizens) if (citizen.partnerId && leavingIds.has(citizen.partnerId)) citizen.partnerId = null;
      households = households.filter((household) => household.id !== leaving.id);
      emigrants += count;
      events.push(makeEvent(state, 'warn', `${leaving.name} leaves the village`, `${count} residents take their remaining property into the surrounding region because hunger or lawlessness remains severe.`));
    }
  }

  if (deceasedByHousehold.size) events.push(makeEvent(state, 'warn', `${[...deceasedByHousehold.values()].flat().length} residents die`, 'Age, health, hunger, and lawlessness determine mortality; property remains with the household or passes to heirs.'));
  return { ...state, households, citizens, businesses, regionalMarket, treasury, births, deaths, immigrants, emigrants, householdsFormed };
}

function beginDailyAccounting(state: WorldState): WorldState {
  return {
    ...state,
    households: state.households.map((household) => ({ ...household, incomeToday: 0, spendingToday: 0, subsistenceToday: 0 })),
    landlord: { ...state.landlord, rentCollectedToday: 0 },
  };
}

function resolveDay(state: WorldState): WorldState {
  const events: WorldEvent[] = [];
  let next = beginDailyAccounting(state);
  next = produce(next, events);
  next = financeEssentialBusinesses(next, events);
  next = feedHouseholds(next, events);
  next = resolveCrime(next, events);
  next = stockFoodReserve(next, events);
  next = regionalTrade(next, events);
  next = settleTradeCredit(next, events);
  next = payWages(next, events);
  next = guaranteeEssentialWages(next, events);
  next = tradeHouseholdServices(next, events);
  next = applyInventoryLosses(next, events);
  next = settleAndPlan(next, events);
  next = restructureInsolventBusinesses(next, events);
  next = openBusinessForUnmetDemand(next, events);
  next = demographics(next, events);
  next = openFarmForDemand(next, events);
  next = updateReservationWages(next);
  next = clearAndMatchLabor(next, events);
  const metrics = getMetrics(next);
  next.history = [...next.history, {
    day: next.day, actualWage: metrics.averageWage, dailyWage: metrics.dailyWage, breadPrice: metrics.breadPrice,
    unemployed: metrics.unemployed, hungry: metrics.hungry, treasury: next.treasury,
    population: metrics.population, exports: metrics.exportsToday,
  }].slice(-120);
  next.citizens = next.citizens.map((citizen) => ({ ...citizen, hoursWorkedToday: 0, wagePaidToday: 0 }));
  next.events = [...events.reverse(), ...next.events].slice(0, 240);
  return next;
}

export function advanceHour(input: WorldState): WorldState {
  let state = clone(input);
  state = updateCitizenTravel(state);
  state = workHour(state);
  state.hour += 1;
  if (state.hour >= 24) {
    state.hour = 0;
    state = resolveDay(state);
    state.day += 1;
  }
  return state;
}

export function advanceDay(input: WorldState): WorldState {
  let state = input;
  const targetDay = state.day + 1;
  while (state.day < targetDay) state = advanceHour(state);
  return state;
}

export function setTaxRate(state: WorldState, taxRate: number): WorldState {
  return { ...state, taxRate: clamp(taxRate, 0, 0.25) };
}

export function setEstateRent(state: WorldState, multiplier: number): WorldState {
  return { ...state, landlord: { ...state.landlord, rentMultiplier: round(clamp(multiplier, 0.5, 2), 2) } };
}

export function availableEstateAcres(state: WorldState) {
  const leased = state.businesses.reduce((sum, business) => sum + (business.farm?.landAcres ?? 0), 0);
  return Math.max(0, Math.floor(Math.max(280, state.citizens.length * 3) - leased - state.settlement.urbanAcres));
}

export function settlementExpansionCost(state: WorldState) {
  return Math.round(480 * 1.45 ** state.settlement.expansions);
}

export function expandSettlement(state: WorldState): WorldState {
  const cost = settlementExpansionCost(state);
  if (state.treasury < cost || availableEstateAcres(state) < 4) return state;
  const households = state.households.map((household) => ({ ...household }));
  const businesses = state.businesses.map((business) => ({ ...business }));
  const laborers = [...households].sort((a, b) => a.coins - b.coins).slice(0, Math.min(10, households.length));
  const householdPayroll = cost * 0.62;
  for (const household of laborers) {
    const payment = householdPayroll / Math.max(1, laborers.length);
    household.coins = round(household.coins + payment);
    household.incomeToday = round(household.incomeToday + payment);
  }
  const suppliers = businesses.filter((business) => business.kind === 'woodcutter' || business.kind === 'blacksmith');
  for (const supplier of suppliers) {
    const payment = cost * 0.38 / Math.max(1, suppliers.length);
    supplier.cash = round(supplier.cash + payment);
    supplier.revenueToday = round(supplier.revenueToday + payment);
  }
  const nextExpansion = state.settlement.expansions + 1;
  const names = ['River Ward', 'North Croft', 'East Bank', 'West Commons', 'New Mill Road'];
  return {
    ...state,
    treasury: round(state.treasury - cost),
    households,
    businesses,
    settlement: {
      housingCapacity: state.settlement.housingCapacity + 8,
      streets: state.settlement.streets + 1,
      urbanAcres: state.settlement.urbanAcres + 4,
      expansions: nextExpansion,
    },
    landlord: { ...state.landlord, tenantFavor: round(clamp(state.landlord.tenantFavor + 1.5, 0, 100), 1) },
    events: [makeEvent(state, 'good', `${names[(nextExpansion - 1) % names.length]} is laid out`, `${cost}c pays local labor and suppliers to open eight buildable plots on four estate acres. New households may now settle along the road.`), ...state.events],
  };
}

export function grantFarmLease(state: WorldState, businessId: string): WorldState {
  const farm = state.businesses.find((business) => business.id === businessId && business.farm);
  if (!farm?.farm || availableEstateAcres(state) < 5 || farm.cash < 100) return state;
  const businesses = state.businesses.map((business) => {
    if (business.id !== businessId || !business.farm) return business;
    const next = { ...business, cash: round(business.cash - 100), costsToday: round(business.costsToday + 100), farm: { ...business.farm, landAcres: business.farm.landAcres + 5 } };
    resizeFarmGeometry(next.farm!, state.publicWorks.roads);
    return next;
  });
  return { ...state, treasury: round(state.treasury + 100), businesses, landlord: { ...state.landlord, leasesGranted: state.landlord.leasesGranted + 1 }, events: [makeEvent(state, 'good', `${farm.name} receives five more acres`, 'The tenant pays a 100c lease premium. The larger holding creates room for future cultivation but only if demand, capital, and labor justify it.'), ...state.events] };
}

export function reclaimFarmLand(state: WorldState, businessId: string): WorldState {
  const farm = state.businesses.find((business) => business.id === businessId && business.farm);
  if (!farm?.farm || farm.farm.landAcres - farm.farm.cultivatedAcres < 5 || farm.farm.landAcres <= 20 || state.treasury < 50) return state;
  const businesses = state.businesses.map((business) => {
    if (business.id !== businessId || !business.farm) return business;
    const next = { ...business, cash: round(business.cash + 50), revenueToday: round(business.revenueToday + 50), farm: { ...business.farm, landAcres: business.farm.landAcres - 5, plannedAcres: Math.min(business.farm.plannedAcres, business.farm.landAcres - 5) } };
    resizeFarmGeometry(next.farm!, state.publicWorks.roads);
    return next;
  });
  return { ...state, treasury: round(state.treasury - 50), businesses, landlord: { ...state.landlord, acresReclaimed: state.landlord.acresReclaimed + 5, tenantFavor: round(clamp(state.landlord.tenantFavor - 1.5, 0, 100), 1) }, events: [makeEvent(state, 'warn', `Five idle acres reclaimed from ${farm.name}`, 'The estate pays 50c compensation. The land returns to the domain, but tenants view involuntary reclamation with suspicion.'), ...state.events] };
}

export function supportFarmTenant(state: WorldState, businessId: string): WorldState {
  const farm = state.businesses.find((business) => business.id === businessId && business.farm);
  if (!farm || state.treasury < 150) return state;
  return { ...state, treasury: round(state.treasury - 150), businesses: state.businesses.map((business) => business.id === businessId ? { ...business, cash: round(business.cash + 150), publicDebt: round(business.publicDebt + 150) } : business), landlord: { ...state.landlord, tenantFavor: round(clamp(state.landlord.tenantFavor + 0.5, 0, 100), 1) }, events: [makeEvent(state, 'info', `${farm.name} receives a 150c estate advance`, 'Working capital can cover wages and inputs, but the farm now owes the treasury. Survival is not the same thing as profitability.'), ...state.events] };
}

export function forgiveHouseholdRent(state: WorldState, householdId: string): WorldState {
  const tenant = state.households.find((household) => household.id === householdId);
  if (!tenant || tenant.rentArrears <= 0) return state;
  const forgiven = tenant.rentArrears;
  return { ...state, households: state.households.map((household) => household.id === householdId ? { ...household, rentArrears: 0 } : household), landlord: { ...state.landlord, tenantFavor: round(clamp(state.landlord.tenantFavor + Math.min(8, 2 + forgiven / 10), 0, 100), 1) }, events: [makeEvent(state, 'good', `${tenant.name}'s rent debt is forgiven`, `${round(forgiven)}c of uncollectable arrears is erased. No coin is created; the estate gives up a claim and tenant confidence rises.`), ...state.events] };
}

export type PublicProject = keyof WorldState['publicWorks'];

export function publicProjectCost(state: WorldState, project: PublicProject) {
  return [650, 1050, 1600][state.publicWorks[project]] ?? Number.POSITIVE_INFINITY;
}

export function commissionPublicProject(state: WorldState, project: PublicProject): WorldState {
  const currentLevel = state.publicWorks[project];
  const cost = publicProjectCost(state, project);
  if (currentLevel >= 3 || state.treasury < cost) return state;
  const nextLevel = currentLevel + 1;
  const households = state.households.map((household) => ({ ...household }));
  const businesses = state.businesses.map((business) => ({ ...business, farm: business.farm ? { ...business.farm } : undefined }));

  // Public construction moves treasury coins back through wages and local
  // suppliers instead of deleting them from the closed economy.
  const paidHouseholds = [...households].sort((a, b) => a.coins - b.coins).slice(0, Math.min(12, households.length));
  const householdPayroll = cost * 0.55;
  for (const household of paidHouseholds) {
    const payment = householdPayroll / Math.max(1, paidHouseholds.length);
    household.coins += payment;
    household.incomeToday += payment;
  }
  const woodcutter = businesses.find((business) => business.kind === 'woodcutter');
  const smith = businesses.find((business) => business.kind === 'blacksmith');
  if (woodcutter) { woodcutter.cash += cost * 0.25; woodcutter.revenueToday += cost * 0.25; }
  if (smith) { smith.cash += cost * 0.2; smith.revenueToday += cost * 0.2; }

  if (project === 'roads') {
    for (const business of businesses) if (business.farm) resizeFarmGeometry(business.farm, nextLevel);
  }
  const title = ({ roads: 'Road crews improve the farm lanes', granary: 'A better public granary opens', market: 'The market charter expands' } as Record<PublicProject, string>)[project];
  const effect = ({
    roads: `Farm journeys are now ${nextLevel * 12}% faster, leaving more productive time in every shift.`,
    granary: `Protected stores now reduce food deterioration by up to ${nextLevel * 18}%.`,
    market: `Merchant throughput is now ${nextLevel * 40}% higher when a genuine surplus exists.`,
  } as Record<PublicProject, string>)[project];
  return {
    ...state,
    treasury: round(state.treasury - cost),
    households,
    businesses,
    publicWorks: { ...state.publicWorks, [project]: nextLevel },
    events: [makeEvent(state, 'good', title, `${round(cost)}c became construction wages and supplier revenue. ${effect}`), ...state.events],
  };
}

export function releaseFood(state: WorldState): WorldState {
  const quantity = Math.min(50, state.foodReserve);
  if (!quantity) return state;
  const bakery = state.businesses.find((business) => business.kind === 'bakery');
  if (!bakery) return state;
  return {
    ...state,
    foodReserve: state.foodReserve - quantity,
    businesses: state.businesses.map((business) => business.id === bakery.id ? { ...business, goods: { ...business.goods, bread: business.goods.bread + quantity } } : business),
    events: [makeEvent(state, 'good', `${quantity} reserve meals enter the market`, 'The lord converts protected food into immediately purchasable supply.'), ...state.events],
  };
}

export function getMetrics(state: WorldState): WorldMetrics {
  const adults = state.citizens.filter((citizen) => citizen.adult);
  const workingAdults = adults.filter((citizen) => !citizen.retired);
  const retirees = adults.length - workingAdults.length;
  const employed = workingAdults.filter((citizen) => citizen.employerId).length;
  const actualWages = state.citizens.reduce((sum, citizen) => sum + citizen.wagePaidToday, 0);
  const worked = state.citizens.filter((citizen) => citizen.hoursWorkedToday > 0).length;
  const advertised = state.businesses.reduce((sum, business) => sum + business.wageOffer * business.employeeIds.length, 0) / Math.max(1, employed);
  const subsistence = state.households.reduce((sum, household) => sum + household.reservationWage, 0) / Math.max(1, state.households.length);
  const dailyWage = worked ? actualWages / worked : 0;
  const recentDailyWages = state.history.slice(-6).map((point) => point.dailyWage).filter((value) => value > 0);
  if (dailyWage > 0) recentDailyWages.push(dailyWage);
  const averageWage = recentDailyWages.length ? rollingAverage(recentDailyWages) : advertised;
  const bakeries = state.businesses.filter((business) => business.kind === 'bakery');
  const marketBread = bakeries.reduce((sum, business) => sum + business.goods.bread, 0);
  const hunger = state.citizens.filter((citizen) => citizen.hunger > 15).length;
  const poor = state.households.filter((household) => household.coins < household.reservationWage * 5).length;
  const cashless = state.households.filter((household) => household.coins < 1).length;
  const foodInsecure = state.households.filter((household) => household.missedMeals > 0 || state.citizens.some((citizen) => citizen.householdId === household.id && citizen.hunger > 15)).length;
  const indebted = state.households.filter((household) => household.debt > 0 || state.citizens.some((citizen) => citizen.householdId === household.id && citizen.wageArrears > 0)).length;
  const wageHouseholds = state.households.filter((household) => state.citizens.some((citizen) => citizen.householdId === household.id && citizen.employerId)).length;
  const subsistenceHouseholds = state.households.filter((household) => !state.citizens.some((citizen) => citizen.householdId === household.id && citizen.employerId) && state.citizens.some((citizen) => citizen.householdId === household.id && citizen.adult)).length;
  const assetHouseholds = state.households.filter((household) => household.ownedBusinessIds.length > 0).length;
  const arrears = state.citizens.reduce((sum, citizen) => sum + citizen.wageArrears, 0);
  const localCoins = state.treasury + state.households.reduce((sum, household) => sum + household.coins, 0) + state.businesses.reduce((sum, business) => sum + business.cash, 0);
  const totalCoins = localCoins + state.regionalMarket.cash;
  const richest = Math.max(...state.households.map((household) => household.coins));
  const farms = state.businesses.filter((business) => business.kind === 'farm');
  const farmRunway = farms.reduce((sum, business) => sum + business.cash / Math.max(1, business.wageOffer * Math.max(1, business.employeeIds.length)), 0) / Math.max(1, farms.length);
  const exportsToday = GOODS.reduce((sum, good) => sum + state.regionalMarket.exportsToday[good], 0);
  const grainStock = state.businesses.filter((business) => business.kind === 'farm').reduce((sum, business) => sum + business.goods.grain, 0);
  const grainDays = grainStock / Math.max(0.1, villageGrainNeed(state));
  const businessRevenue = state.businesses.reduce((sum, business) => sum + business.lastRevenue, 0);
  const businessCosts = state.businesses.reduce((sum, business) => sum + business.lastCosts, 0);
  const goodsSpoiled = state.businesses.reduce((sum, business) => sum + business.lastSpoiled, 0);
  const requiredGuards = requiredGuardsFor(state);
  const estateWorkers = state.businesses.find((business) => business.kind === 'estate')?.employeeIds.length ?? 0;
  const guards = Math.min(estateWorkers, requiredGuards);
  const realWage = averageWage / Math.max(0.01, subsistence);
  let health: WorldMetrics['health'] = 'Stable';
  const healthReasons: string[] = [];
  if (hunger) healthReasons.push(`${hunger} residents are hungry`);
  if (arrears) healthReasons.push(`${round(arrears)}c of wages are overdue`);
  if (state.treasury < 200) healthReasons.push('the treasury has less than 200c');
  if (grainDays < 30) healthReasons.push(`farm grain covers only ${round(grainDays)} days`);
  if (cashless) healthReasons.push(`${cashless} households have under 1c cash`);
  if (state.lawlessness > 35) healthReasons.push(`lawlessness is ${round(state.lawlessness)}% with ${state.crimesToday} crimes today`);
  if (guards < requiredGuards) healthReasons.push(`${guards} guards cover a requirement of ${requiredGuards}`);
  if (hunger > state.citizens.length * 0.2 || arrears > 50 || state.lawlessness > 75 || (state.treasury < 100 && hunger > 0)) health = 'Crisis';
  else if (hunger || arrears || state.treasury < 200 || grainDays < 30 || state.lawlessness > 35) health = 'Strained';
  else if (realWage > 1.1 && workingAdults.length - employed < 8) health = 'Prospering';
  return {
    population: state.citizens.length,
    adults: adults.length,
    dependents: state.citizens.length - adults.length,
    retirees,
    households: state.households.length,
    employed,
    unemployed: workingAdults.length - employed,
    subsistenceWorkers: workingAdults.length - employed,
    openJobs: state.businesses.reduce((sum, business) => sum + Math.max(0, business.desiredWorkers - business.employeeIds.length), 0),
    averageWage: round(averageWage),
    dailyWage: round(dailyWage || state.history[state.history.length - 1]?.dailyWage || advertised),
    advertisedWage: round(advertised),
    subsistenceWage: round(subsistence),
    realWage: round(realWage),
    hungry: hunger,
    poorHouseholds: poor,
    cashlessHouseholds: cashless,
    foodInsecureHouseholds: foodInsecure,
    indebtedHouseholds: indebted,
    subsistenceHouseholds,
    wageHouseholds,
    assetHouseholds,
    wageArrears: round(arrears),
    marketBread: round(marketBread),
    breadAvailable: round(marketBread + state.foodReserve),
    breadDemand: round(state.citizens.reduce((sum, citizen) => sum + adultFoodNeed(citizen), 0)),
    breadPrice: round(marketBreadPrice(state)),
    farmRunway: round(farmRunway, 1),
    grainStock: round(grainStock),
    grainDays: round(grainDays, 1),
    businessRevenue: round(businessRevenue),
    businessCosts: round(businessCosts),
    goodsSpoiled: round(goodsSpoiled, 1),
    migrationPressure: clamp(Math.round((realWage - 1) * 50 - hunger - (workingAdults.length - employed) / 2), -100, 100),
    exportsToday,
    totalCoins: round(totalCoins),
    localCoins: round(localCoins),
    wealthConcentration: round(richest / Math.max(1, state.households.reduce((sum, household) => sum + household.coins, 0))),
    guards,
    requiredGuards,
    lawlessness: round(state.lawlessness, 1),
    crimesToday: state.crimesToday,
    crimesPreventedToday: state.crimesPreventedToday,
    crimeLossToday: round(state.crimeLossToday, 1),
    healthReasons,
    health,
  };
}
