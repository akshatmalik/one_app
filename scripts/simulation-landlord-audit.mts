import {
  advanceDay,
  commissionPublicProject,
  createWorld,
  expandSettlement,
  getMetrics,
  grantFarmLease,
  publicProjectCost,
  setEstateRent,
  supportFarmTenant,
} from '../app/apps/simulation-world/lib/engine';

type Strategy = 'merciful' | 'balanced' | 'extractive';
const requestedDays = Number(process.argv[2] ?? 2000);
const days = Number.isFinite(requestedDays) ? Math.max(100, Math.floor(requestedDays)) : 2000;
const checkpoints = new Set([100, 400, 800, 1200, days]);

function run(kind: Strategy) {
  let world = setEstateRent(createWorld(), kind === 'merciful' ? 0.7 : kind === 'balanced' ? 1 : 1.8);
  const initialCoins = getMetrics(world).totalCoins;
  const snapshots: Array<Record<string, unknown>> = [];

  for (let elapsed = 1; elapsed <= days; elapsed += 1) {
    if (elapsed % 60 === 0) {
      if (world.households.length >= world.settlement.housingCapacity - 1 && world.treasury >= 900) world = expandSettlement(world);
      if (kind === 'merciful') {
        for (const project of ['roads', 'granary'] as const) {
          if (world.publicWorks[project] < 3 && world.treasury >= publicProjectCost(world, project) + 500) {
            world = commissionPublicProject(world, project);
            break;
          }
        }
        const weakFarm = [...world.businesses].filter((business) => business.farm).sort((a, b) => a.cash - b.cash)[0];
        if (weakFarm && weakFarm.cash < 250 && world.treasury > 800) world = supportFarmTenant(world, weakFarm.id);
      } else if (kind === 'balanced') {
        for (const project of ['roads', 'granary', 'market'] as const) {
          if (world.publicWorks[project] < 3 && world.treasury >= publicProjectCost(world, project) + 600) {
            world = commissionPublicProject(world, project);
            break;
          }
        }
        const tenant = world.businesses.find((business) => business.farm && business.cash > 500);
        if (tenant && elapsed % 180 === 0) world = grantFarmLease(world, tenant.id);
      } else {
        for (const project of ['market', 'roads'] as const) {
          if (world.publicWorks[project] < 3 && world.treasury >= publicProjectCost(world, project) + 1000) {
            world = commissionPublicProject(world, project);
            break;
          }
        }
        const tenant = world.businesses.find((business) => business.farm && business.cash > 500);
        if (tenant && elapsed % 120 === 0) world = grantFarmLease(world, tenant.id);
      }
    }

    world = advanceDay(world);
    if (!checkpoints.has(elapsed)) continue;
    const metrics = getMetrics(world);
    snapshots.push({
      day: world.day,
      population: metrics.population,
      hungry: metrics.hungry,
      poor: `${metrics.poorHouseholds}/${metrics.households}`,
      rentArrears: Math.round(world.households.reduce((sum, household) => sum + household.rentArrears, 0)),
      tenantFavor: world.landlord.tenantFavor,
      lawlessness: metrics.lawlessness,
      treasury: Math.round(world.treasury),
      grainDays: metrics.grainDays,
      farms: world.businesses.filter((business) => business.farm).length,
      farmAcres: world.businesses.reduce((sum, business) => sum + (business.farm?.landAcres ?? 0), 0),
      employed: metrics.employed,
      wageArrears: Math.round(metrics.wageArrears),
      projects: `${world.publicWorks.roads}/${world.publicWorks.granary}/${world.publicWorks.market}`,
      coinDrift: Number((metrics.totalCoins - initialCoins).toFixed(2)),
    });
  }
  return { strategy: kind, snapshots };
}

const requestedStrategy = process.argv[3] as Strategy | undefined;
const strategies: Strategy[] = requestedStrategy && ['merciful', 'balanced', 'extractive'].includes(requestedStrategy)
  ? [requestedStrategy]
  : ['merciful', 'balanced', 'extractive'];
for (const strategy of strategies) {
  const result = run(strategy);
  process.stdout.write(`\n${strategy.toUpperCase()} LANDLORD\n`);
  console.table(result.snapshots);
}
