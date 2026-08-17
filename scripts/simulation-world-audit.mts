import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { advanceDay, createWorld, getMetrics } from '../app/apps/simulation-world/lib/engine';
import type { WorldState } from '../app/apps/simulation-world/lib/types';

const requestedDays = Number(process.argv[2] ?? 400);
const days = Number.isFinite(requestedDays) ? Math.max(1, Math.floor(requestedDays)) : 400;
const outputDirectory = resolve(process.cwd(), 'logs/simulation-world');
mkdirSync(outputDirectory, { recursive: true });
const prefix = `v12-days-1-${days + 1}`;
const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;

const anomaliesFor = (state: WorldState, initialCoins: number) => {
  const metrics = getMetrics(state);
  const anomalies: string[] = [];
  if (Math.abs(metrics.totalCoins - initialCoins) > 0.5) anomalies.push(`coin drift ${(metrics.totalCoins - initialCoins).toFixed(2)}`);
  if (metrics.hungry && metrics.marketBread >= metrics.breadDemand) anomalies.push(`${metrics.hungry} hungry despite a full day of market bread`);
  const workingAdults = metrics.adults - metrics.retirees;
  if (metrics.unemployed > workingAdults * 0.5 && metrics.hungry > 0) anomalies.push(`mass unemployment ${metrics.unemployed}/${workingAdults}`);
  if (metrics.wageArrears > 20) anomalies.push(`wage arrears ${metrics.wageArrears.toFixed(1)}`);
  if (metrics.poorHouseholds > state.households.length * 0.35) anomalies.push(`${metrics.poorHouseholds}/${state.households.length} households below five-day cash buffer`);
  if (metrics.wealthConcentration > 0.5) anomalies.push(`one household owns ${Math.round(metrics.wealthConcentration * 100)}% of household cash`);
  if (metrics.lawlessness > 60) anomalies.push(`lawlessness ${metrics.lawlessness}%`);
  const estate = state.businesses.find((business) => business.kind === 'estate');
  if (estate && state.treasury < estate.wageOffer * estate.employeeIds.length) anomalies.push('treasury cannot cover one guard payroll');
  for (const farm of state.businesses.filter((business) => business.kind === 'farm')) {
    if (farm.farm?.phase === 'harvest' && farm.farm.phaseDay >= 10 && farm.farm.taskHoursRemaining > 100) anomalies.push(`${farm.name} harvest deadline at risk`);
  }
  return anomalies;
};

let world = createWorld();
const initialCoins = getMetrics(world).totalCoins;
const headers = ['day', 'population', 'adults', 'retirees', 'dependents', 'households', 'employed', 'unemployed', 'open_jobs', 'actual_wage', 'advertised_wage', 'subsistence_wage', 'arrears', 'hungry', 'poor_households', 'market_bread', 'reserve_food', 'bread_price', 'treasury', 'local_coins', 'system_coins', 'exports', 'births', 'deaths', 'immigrants', 'emigrants', 'wealth_concentration', 'lawlessness', 'guards', 'required_guards', 'crimes', 'crime_loss', 'anomalies', 'events'];
const rows: string[][] = [];
const states: Array<Record<string, unknown>> = [];
const events: WorldState['events'] = [];
const anomalyDays: Array<{ day: number; anomalies: string[] }> = [];

for (let index = 0; index <= days; index += 1) {
  const metrics = getMetrics(world);
  const anomalies = anomaliesFor(world, initialCoins);
  const todayEvents = world.events.filter((item) => item.day === world.day || item.day === world.day - 1);
  if (anomalies.length) anomalyDays.push({ day: world.day, anomalies });
  events.push(...todayEvents);
  rows.push([
    world.day, metrics.population, metrics.adults, metrics.retirees, metrics.dependents, metrics.households, metrics.employed, metrics.unemployed, metrics.openJobs,
    metrics.averageWage, metrics.advertisedWage, metrics.subsistenceWage, metrics.wageArrears, metrics.hungry,
    metrics.poorHouseholds, metrics.marketBread, world.foodReserve, metrics.breadPrice, world.treasury, metrics.localCoins,
    metrics.totalCoins, metrics.exportsToday, world.births, world.deaths, world.immigrants, world.emigrants, metrics.wealthConcentration,
    metrics.lawlessness, metrics.guards, metrics.requiredGuards, metrics.crimesToday, metrics.crimeLossToday,
    anomalies.join(' | '), todayEvents.map((item) => item.title).join(' | '),
  ].map(String));
  states.push({ day: world.day, hour: world.hour, treasury: world.treasury, foodReserve: world.foodReserve, metrics, households: world.households, businesses: world.businesses, regionalMarket: world.regionalMarket, anomalies, events: todayEvents });
  if (index < days) world = advanceDay(world);
}

writeFileSync(resolve(outputDirectory, `${prefix}.csv`), `${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')}\n`);
writeFileSync(resolve(outputDirectory, `${prefix}-states.jsonl`), `${states.map((state) => JSON.stringify(state)).join('\n')}\n`);
writeFileSync(resolve(outputDirectory, `${prefix}-events.json`), `${JSON.stringify(events, null, 2)}\n`);

const final = getMetrics(world);
const firstDay = (text: string) => anomalyDays.find((entry) => entry.anomalies.some((item) => item.includes(text)))?.day ?? 'never';
const report = `# Simulation World v12 — ${days}-day audit

Seed ${world.seed}; day 1 through day ${world.day}.

## Final state

| Measure | Value |
|---|---:|
| Population | ${final.population} (${final.adults} adults / ${final.dependents} dependents) |
| Retirees / households | ${final.retirees} / ${final.households} |
| Employed / unemployed | ${final.employed} / ${final.unemployed} |
| Actual / advertised wage | ${final.averageWage.toFixed(2)} / ${final.advertisedWage.toFixed(2)} |
| Subsistence wage | ${final.subsistenceWage.toFixed(2)} |
| Wage arrears | ${final.wageArrears.toFixed(2)} |
| Hungry residents | ${final.hungry} |
| Poor households | ${final.poorHouseholds} / ${world.households.length} |
| Market / reserve food | ${final.marketBread.toFixed(0)} / ${world.foodReserve.toFixed(0)} |
| Treasury | ${world.treasury.toFixed(2)} |
| Births / deaths | ${world.births} / ${world.deaths} |
| Local / whole-system coins | ${final.localCoins.toFixed(2)} / ${final.totalCoins.toFixed(2)} |
| Wealth concentration | ${(final.wealthConcentration * 100).toFixed(0)}% |
| Lawlessness / guards | ${final.lawlessness.toFixed(1)}% / ${final.guards} of ${final.requiredGuards} required |
| Crimes today / total | ${final.crimesToday} / ${world.totalCrimes} |
| Immigration / emigration | ${world.immigrants} / ${world.emigrants} |

## First anomaly days

| Signal | First day |
|---|---:|
| Hunger despite sufficient market bread | ${firstDay('hungry despite')} |
| Mass unemployment | ${firstDay('mass unemployment')} |
| Material wage arrears | ${firstDay('wage arrears')} |
| Widespread household poverty | ${firstDay('households below')} |
| One household owns over half of household cash | ${firstDay('one household owns')} |
| Treasury cannot cover guard payroll | ${firstDay('treasury cannot')} |
| Harvest deadline at risk | ${firstDay('harvest deadline')} |
| Coin conservation drift | ${firstDay('coin drift')} |

${anomalyDays.length} of ${days + 1} snapshots carry at least one audit flag.
`;
writeFileSync(resolve(outputDirectory, `${prefix}-summary.md`), report);
process.stdout.write(report);
