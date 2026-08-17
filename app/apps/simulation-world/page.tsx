"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Castle,
  CheckCircle2,
  Coins,
  Hammer,
  HandCoins,
  HeartHandshake,
  KeyRound,
  Landmark,
  Map,
  Pause,
  Play,
  RotateCcw,
  Route,
  ScrollText,
  ShieldCheck,
  Store,
  Users,
  Warehouse,
  Wheat,
} from "lucide-react";
import {
  advanceDay,
  advanceHour,
  availableEstateAcres,
  commissionPublicProject,
  createWorld,
  expandSettlement,
  forgiveHouseholdRent,
  getMetrics,
  grantFarmLease,
  publicProjectCost,
  reclaimFarmLand,
  releaseFood,
  setEstateRent,
  setTaxRate,
  settlementExpansionCost,
  supportFarmTenant,
} from "./lib/engine";
import type { PublicProject } from "./lib/engine";
import type { Business, EventTone, GoodId, WorldState } from "./lib/types";
import { VillageMap } from "./components/VillageMap";

const SAVE_KEY = "oneapp-simulation-world-v12";
const money = (value: number) => `${value.toFixed(1)}c`;
const toneStyles: Record<EventTone, string> = {
  good: "border-emerald-700/50 bg-emerald-950/30 text-emerald-200",
  warn: "border-amber-700/50 bg-amber-950/30 text-amber-100",
  bad: "border-rose-700/50 bg-rose-950/30 text-rose-100",
  info: "border-sky-800/50 bg-sky-950/30 text-sky-100",
};
const stockLabel = (business: Business) => {
  if (business.kind === "farm")
    return `${Math.floor(business.goods.grain)} grain`;
  if (business.kind === "mill")
    return `${Math.floor(business.goods.flour)} flour`;
  if (business.kind === "bakery")
    return `${Math.floor(business.goods.bread)} bread`;
  if (business.kind === "woodcutter")
    return `${Math.floor(business.goods.firewood)} wood`;
  if (business.kind === "blacksmith")
    return `${Math.floor(business.goods.tools)} tools`;
  return "—";
};

function MetricCard({
  label,
  value,
  detail,
  danger = false,
}: {
  label: string;
  value: string;
  detail: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${danger ? "border-rose-800/60 bg-rose-950/20" : "border-[#4f432e] bg-[#211b12]"}`}
    >
      <div className="text-xs uppercase tracking-[0.15em] text-[#9d8e73]">
        {label}
      </div>
      <div className="mt-2 font-serif text-2xl text-[#f2dfb4]">{value}</div>
      <p className="mt-1 text-xs leading-5 text-[#9d8e73]">{detail}</p>
    </div>
  );
}

const projectDetails: Record<
  PublicProject,
  { name: string; icon: typeof Route; description: string; benefit: string }
> = {
  roads: {
    name: "Farm lanes",
    icon: Route,
    description:
      "Drain, bridge, and surface the routes between homes and fields.",
    benefit: "Each level cuts every farm round trip by 12%.",
  },
  granary: {
    name: "Granary stores",
    icon: Warehouse,
    description: "Dry floors, sealed bins, and managed public storage.",
    benefit: "Each level cuts food deterioration by about 18%.",
  },
  market: {
    name: "Market charter",
    icon: Store,
    description: "Fund scales, caravan yards, clerks, and regional contacts.",
    benefit: "Each level raises surplus export capacity by 40%.",
  },
};

function ProjectCard({
  project,
  world,
  onCommission,
}: {
  project: PublicProject;
  world: WorldState;
  onCommission: () => void;
}) {
  const details = projectDetails[project];
  const Icon = details.icon;
  const level = world.publicWorks[project];
  const cost = publicProjectCost(world, project);
  const complete = level >= 3;
  return (
    <article className="rounded-xl border border-[#4b3e29] bg-[#211b12] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#342817] text-[#d8ad5e]">
            <Icon size={18} />
          </div>
          <div>
            <h3 className="font-serif text-lg text-[#f2dfb4]">
              {details.name}
            </h3>
            <p className="mt-1 text-xs leading-5 text-[#93866f]">
              {details.description}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded bg-[#18140e] px-2 py-1 text-[10px] uppercase tracking-wider text-[#c3a770]">
          Level {level}/3
        </span>
      </div>
      <div className="my-4 flex gap-1">
        {[1, 2, 3].map((step) => (
          <div
            key={step}
            className={`h-1.5 flex-1 rounded-full ${step <= level ? "bg-emerald-500" : "bg-[#433824]"}`}
          />
        ))}
      </div>
      <p className="text-xs leading-5 text-[#b5a17d]">{details.benefit}</p>
      <button
        type="button"
        onClick={onCommission}
        disabled={complete || world.treasury < cost}
        className="mt-4 w-full rounded-md border border-[#8b6b34] bg-[#342716] px-3 py-2 text-sm text-[#efd08f] disabled:cursor-not-allowed disabled:opacity-35"
      >
        {complete
          ? "Fully developed"
          : world.treasury < cost
            ? `Need ${money(cost)}`
            : `Commission · ${money(cost)}`}
      </button>
    </article>
  );
}

function BusinessRow({ business }: { business: Business }) {
  const vacancies = Math.max(
    0,
    business.desiredWorkers - business.employeeIds.length,
  );
  return (
    <div className="border-b border-[#3b3223] py-4 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-[#f2dfb4]">{business.name}</div>
          <div className="mt-1 text-xs text-[#8f826c]">
            {business.kind} · {business.employeeIds.length}/
            {business.desiredWorkers} workers
            {vacancies ? ` · ${vacancies} vacant` : ""}
          </div>
        </div>
        <div
          className={`rounded px-2 py-1 font-mono text-xs ${business.profitToday >= 0 ? "bg-emerald-950 text-emerald-300" : "bg-rose-950 text-rose-300"}`}
        >
          {business.profitToday >= 0 ? "+" : ""}
          {money(business.profitToday)}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs sm:grid-cols-6">
        <div>
          <span className="block text-[#786d5c]">Cash</span>
          {money(business.cash)}
        </div>
        <div>
          <span className="block text-[#786d5c]">Price</span>
          {business.outputGood ? money(business.askPrice) : "—"}
        </div>
        <div>
          <span className="block text-[#786d5c]">Revenue</span>
          {money(business.lastRevenue)}
        </div>
        <div>
          <span className="block text-[#786d5c]">Costs</span>
          {money(business.lastCosts)}
        </div>
        <div>
          <span className="block text-[#786d5c]">Sold / made</span>
          {business.lastSold.toFixed(1)} / {business.lastProduced.toFixed(1)}
        </div>
        <div>
          <span className="block text-[#786d5c]">Lost</span>
          {business.lastSpoiled.toFixed(1)}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs sm:grid-cols-6">
        <div>
          <span className="block text-[#786d5c]">Contract</span>
          {money(business.wageOffer)}
        </div>
        <div>
          <span className="block text-[#786d5c]">Wage due</span>
          <span className={business.wageArrears > 0 ? "text-rose-300" : ""}>
            {money(business.wageArrears)}
          </span>
        </div>
        <div>
          <span className="block text-[#786d5c]">Supplier due</span>
          {money(business.tradeDebt)}
        </div>
        <div>
          <span className="block text-[#786d5c]">Civic loan</span>
          {money(business.publicDebt)}
        </div>
        <div>
          <span className="block text-[#786d5c]">Stock</span>
          {stockLabel(business)}
        </div>
        <div>
          <span className="block text-[#786d5c]">No-sale days</span>
          {business.daysWithoutSales}
        </div>
      </div>
      {business.farm && (
        <div className="mt-3 rounded-md bg-[#17130d] px-3 py-2 text-xs leading-5 text-[#b29f7d]">
          <span className="text-[#dfc68f]">{business.farm.phase}</span> ·{" "}
          {business.farm.cultivatedAcres}/{business.farm.landAcres} acres
          cultivated · {Math.round(business.farm.fieldWidthMeters)}×
          {Math.round(business.farm.fieldHeightMeters)}m field ·{" "}
          {business.farm.inventoryDays} inventory days
          <br />
          {business.farm.dailyLaborHours.toFixed(1)} labor-hours today →{" "}
          {business.desiredWorkers} positions ·{" "}
          {Math.ceil(business.farm.taskHoursRemaining)} task-hours remain
          <br />
          {Math.round(business.farm.distanceToTownMeters)}m from town ·{" "}
          {business.farm.travelHoursPerWorker.toFixed(2)}h daily walk ·{" "}
          {business.farm.productiveHoursPerWorker.toFixed(2)}h productive shift
          · {business.farm.internalTravelHours.toFixed(1)}h internal walking
        </div>
      )}
      <p className="mt-3 border-l-2 border-[#7f693d] pl-3 text-xs leading-5 text-[#93866f]">
        {business.reason}
      </p>
    </div>
  );
}

export default function SimulationWorldPage() {
  const [world, setWorld] = useState<WorldState>(() => createWorld());
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [tab, setTab] = useState<
    "world" | "estate" | "council" | "economy" | "households" | "ledger"
  >("world");
  const [selectedCitizenId, setSelectedCitizenId] = useState<string | null>(
    null,
  );
  const metrics = useMemo(() => getMetrics(world), [world]);

  useEffect(() => {
    const saved = window.localStorage.getItem(SAVE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as WorldState;
      if (parsed.version === 12) setWorld(parsed);
    } catch {
      /* use a fresh deterministic village */
    }
  }, []);
  useEffect(() => {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(world));
  }, [world]);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(
      () => setWorld((current) => advanceHour(current)),
      Math.max(16, 5000 / speed),
    );
    return () => window.clearInterval(timer);
  }, [playing, speed]);

  const households = [...world.households].sort((a, b) => a.coins - b.coins);
  const exports = (
    Object.entries(world.regionalMarket.exportsToday) as Array<[GoodId, number]>
  ).filter(([, quantity]) => quantity > 0);
  const civicWorkers = Math.max(
    0,
    (world.businesses.find((business) => business.kind === "estate")
      ?.employeeIds.length ?? 0) - metrics.guards,
  );
  const totalHarvests = world.businesses.reduce(
    (sum, business) => sum + (business.farm?.harvests ?? 0),
    0,
  );
  const ambitions = [
    {
      name: "First full harvest cycle",
      detail: `${totalHarvests}/4 farm harvests`,
      done: totalHarvests >= 4,
    },
    {
      name: "A secure table",
      detail: `${metrics.grainDays}/45 grain days · ${metrics.hungry} hungry`,
      done: metrics.grainDays >= 45 && metrics.hungry === 0,
    },
    {
      name: "Broad prosperity",
      detail: `${metrics.poorHouseholds}/${metrics.households} households poor · ${money(metrics.wageArrears)} overdue`,
      done:
        metrics.poorHouseholds <= metrics.households * 0.2 &&
        metrics.wageArrears < 1,
    },
    {
      name: "Peace on the roads",
      detail: `${metrics.lawlessness}% lawlessness · ${metrics.guards}/${metrics.requiredGuards} guards`,
      done:
        metrics.lawlessness <= 10 && metrics.guards >= metrics.requiredGuards,
    },
    {
      name: "A growing township",
      detail: `${metrics.population}/125 residents`,
      done: metrics.population >= 125,
    },
  ];
  const nextAmbition = ambitions.find((ambition) => !ambition.done);
  const councilAdvice = metrics.hungry
    ? "Food is the immediate emergency. Release reserves and watch bakery prices."
    : metrics.wageArrears > 0
      ? "Unpaid wages are breaking trust. Avoid new spending until employers clear payroll."
      : metrics.poorHouseholds > metrics.households * 0.35 &&
          world.treasury > 650
        ? "The treasury is strong while households are thin. Commission public works to return coins as wages."
        : metrics.grainDays < 30
          ? "Grain cover is narrow. Roads help peak farm labor; granaries preserve the harvest you already produce."
          : metrics.lawlessness > 20
            ? "Lawlessness is becoming an economic tax. Protect guard funding before expanding trade."
            : "The village is steady. Choose whether to improve farm productivity, food resilience, or regional trade.";
  const rentArrears = world.households.reduce(
    (sum, household) => sum + household.rentArrears,
    0,
  );
  const projectedRent = world.households.reduce(
    (sum, household) =>
      sum + household.dailyRent * world.landlord.rentMultiplier,
    0,
  );
  const tenantsInArrears = world.households
    .filter((household) => household.rentArrears > 0.01)
    .sort((a, b) => b.rentArrears - a.rentArrears);
  const estateAcres = availableEstateAcres(world);
  const expansionCost = settlementExpansionCost(world);

  return (
    <div className="min-h-[calc(100vh-60px)] bg-[#15110b] text-[#e8dcc4]">
      <header className="border-b border-[#463923] bg-[#1b160e] px-4 py-4 lg:px-8">
        <div className="mx-auto flex max-w-[1550px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg border border-[#806a3b] bg-[#2b2315] text-[#e8c66b]">
              <Building2 size={21} />
            </div>
            <div>
              <h1 className="font-serif text-xl text-[#f6e7c3]">
                Simulation World
              </h1>
              <p className="text-xs text-[#94866c]">
                Kernel v12 · Day {world.day},{" "}
                {String(world.hour).padStart(2, "0")}:00 · {metrics.health}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPlaying((value) => !value)}
              className="flex h-9 items-center gap-2 rounded-md bg-[#b7893f] px-4 text-sm font-semibold text-[#191208]"
            >
              {playing ? <Pause size={15} /> : <Play size={15} />}
              {playing ? "Pause" : "Run"}
            </button>
            <button
              onClick={() => setWorld((current) => advanceHour(current))}
              className="h-9 rounded-md border border-[#493c28] px-3 text-xs"
            >
              +1 hour
            </button>
            <button
              onClick={() => setWorld((current) => advanceDay(current))}
              className="h-9 rounded-md border border-[#493c28] px-3 text-xs"
            >
              +1 day
            </button>
            <button
              onClick={() => {
                setPlaying(false);
                setSelectedCitizenId(null);
                setWorld(createWorld());
              }}
              className="grid h-9 w-9 place-items-center rounded-md border border-[#493c28]"
              aria-label="Reset village"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1550px] p-4 lg:p-8">
        <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-7">
          <MetricCard
            label="Population"
            value={`${metrics.population}`}
            detail={`${metrics.adults - metrics.retirees} working-age · ${metrics.retirees} retired · ${metrics.dependents} children · ${world.births} born / ${world.deaths} died`}
          />
          <MetricCard
            label="Labor"
            value={`${metrics.employed} wage jobs`}
            detail={`${metrics.subsistenceWorkers} in household production · ${metrics.openJobs} useful openings`}
            danger={metrics.openJobs > 0 && metrics.hungry > 0}
          />
          <MetricCard
            label="7-day realized wage"
            value={money(metrics.averageWage)}
            detail={`${money(metrics.advertisedWage)} contract · ${money(metrics.dailyWage)} paid today · ${money(metrics.wageArrears)} overdue`}
            danger={metrics.wageArrears > 0}
          />
          <MetricCard
            label="Food system"
            value={`${metrics.grainDays} grain days`}
            detail={`${Math.floor(metrics.marketBread)} bread · ${metrics.breadDemand} daily meals · ${Math.floor(world.foodReserve)} reserve`}
            danger={metrics.grainDays < 30 || metrics.hungry > 0}
          />
          <MetricCard
            label="Household liquidity"
            value={`${metrics.cashlessHouseholds} cashless`}
            detail={`${metrics.households} households · ${metrics.foodInsecureHouseholds} food-insecure · ${metrics.poorHouseholds} below 5-day cash buffer`}
            danger={metrics.foodInsecureHouseholds > 0}
          />
          <MetricCard
            label="Law and order"
            value={`${metrics.lawlessness}% lawless`}
            detail={`${metrics.guards}/${metrics.requiredGuards} guards · ${metrics.crimesToday} crimes · ${metrics.crimesPreventedToday} prevented · ${money(metrics.crimeLossToday)} harm`}
            danger={
              metrics.lawlessness > 35 ||
              metrics.guards < metrics.requiredGuards
            }
          />
          <MetricCard
            label="Treasury"
            value={money(world.treasury)}
            detail={`${Math.round(world.taxRate * 100)}% tax · ${metrics.exportsToday} goods exported today`}
            danger={world.treasury < 100}
          />
        </section>

        <div className="mb-4 flex gap-1 overflow-x-auto border-b border-[#413622]">
          {(
            [
              ["world", Map, "World"],
              ["estate", Castle, "Estate"],
              ["council", Landmark, "Council"],
              ["economy", Wheat, "Economy"],
              ["households", Users, "Households"],
              ["ledger", ScrollText, "Ledger"],
            ] as const
          ).map(([id, Icon, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm ${tab === id ? "border-[#c49345] text-[#f0d293]" : "border-transparent text-[#8f826c]"}`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {tab === "world" && (
          <VillageMap
            world={world}
            selectedId={selectedCitizenId}
            onSelect={setSelectedCitizenId}
            speed={speed}
            onSpeedChange={setSpeed}
            onExpand={() => setWorld((current) => expandSettlement(current))}
            expansionCost={expansionCost}
          />
        )}

        {tab === "estate" && (
          <div className="space-y-4">
            <section className="overflow-hidden rounded-xl border border-[#665033] bg-[#1d180f]">
              <div className="grid gap-5 bg-gradient-to-r from-[#2c2112] to-[#1b160e] p-5 xl:grid-cols-[1.1fr_.9fr]">
                <div>
                  <div className="flex items-center gap-2 text-[#d4ad63]">
                    <Castle size={19} />
                    <span className="text-xs uppercase tracking-[0.18em]">
                      The lord's domain
                    </span>
                  </div>
                  <h2 className="mt-3 font-serif text-3xl text-[#f4dfb1]">
                    Land is power—and responsibility
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#b5a17d]">
                    Raise rents for dependable income, lease land to ambitious
                    farmers, or spend treasury coin protecting weak tenants.
                    Extraction grows your purse; legitimacy keeps the village
                    governable.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-black/20 p-3">
                    <span className="text-[10px] uppercase tracking-wider text-[#8f816a]">
                      Rent today
                    </span>
                    <strong className="mt-1 block font-serif text-xl text-[#efd49b]">
                      {money(world.landlord.rentCollectedToday)}
                    </strong>
                    <span className="text-[10px] text-[#7f725e]">
                      {money(projectedRent)} due daily
                    </span>
                  </div>
                  <div className="rounded-lg bg-black/20 p-3">
                    <span className="text-[10px] uppercase tracking-wider text-[#8f816a]">
                      Tenant favor
                    </span>
                    <strong
                      className={`mt-1 block font-serif text-xl ${world.landlord.tenantFavor < 35 ? "text-rose-300" : "text-[#efd49b]"}`}
                    >
                      {world.landlord.tenantFavor}%
                    </strong>
                    <span className="text-[10px] text-[#7f725e]">
                      affects unrest
                    </span>
                  </div>
                  <div className="rounded-lg bg-black/20 p-3">
                    <span className="text-[10px] uppercase tracking-wider text-[#8f816a]">
                      Rent debt
                    </span>
                    <strong
                      className={`mt-1 block font-serif text-xl ${rentArrears ? "text-rose-300" : "text-[#efd49b]"}`}
                    >
                      {money(rentArrears)}
                    </strong>
                    <span className="text-[10px] text-[#7f725e]">
                      {tenantsInArrears.length} households
                    </span>
                  </div>
                  <div className="rounded-lg bg-black/20 p-3">
                    <span className="text-[10px] uppercase tracking-wider text-[#8f816a]">
                      Free domain
                    </span>
                    <strong className="mt-1 block font-serif text-xl text-[#efd49b]">
                      {estateAcres} acres
                    </strong>
                    <span className="text-[10px] text-[#7f725e]">
                      available to lease
                    </span>
                  </div>
                  <div className="rounded-lg bg-black/20 p-3">
                    <span className="text-[10px] uppercase tracking-wider text-[#8f816a]">
                      Lifetime rent
                    </span>
                    <strong className="mt-1 block font-serif text-xl text-[#efd49b]">
                      {money(world.landlord.rentCollectedTotal)}
                    </strong>
                    <span className="text-[10px] text-[#7f725e]">
                      actually collected
                    </span>
                  </div>
                  <div className="rounded-lg bg-black/20 p-3">
                    <span className="text-[10px] uppercase tracking-wider text-[#8f816a]">
                      Land actions
                    </span>
                    <strong className="mt-1 block font-serif text-xl text-[#efd49b]">
                      {world.landlord.leasesGranted}
                    </strong>
                    <span className="text-[10px] text-[#7f725e]">
                      leases · {world.landlord.acresReclaimed}ac reclaimed
                    </span>
                  </div>
                </div>
              </div>
            </section>
            <section className="grid gap-4 rounded-xl border border-[#4b3e29] bg-[#211b12] p-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="flex items-center gap-2 text-[#d1a85d]">
                  <Route size={18} />
                  <h3 className="font-serif text-xl text-[#f2dfb4]">Grow the settlement</h3>
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#a8987b]">
                  The village has {world.households.length} occupied homes on {world.settlement.housingCapacity} plots across {world.settlement.streets} streets. New marriages and settlers need an empty plot; a new road opens eight homes but consumes four acres that can no longer be farmed.
                </p>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#897d68]">
                  <span>{world.settlement.housingCapacity - world.households.length} plots free</span>
                  <span>{world.settlement.urbanAcres} urban acres</span>
                  <span>{world.settlement.expansions} roads commissioned</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWorld((current) => expandSettlement(current))}
                disabled={world.treasury < expansionCost || estateAcres < 4}
                className="rounded-md border border-[#8b6b34] bg-[#342716] px-5 py-3 text-sm text-[#efd08f] disabled:cursor-not-allowed disabled:opacity-35"
              >
                {estateAcres < 4 ? "No buildable land" : world.treasury < expansionCost ? `Need ${money(expansionCost)}` : `Lay out a street · ${money(expansionCost)}`}
              </button>
            </section>
            <section className="grid gap-4 xl:grid-cols-[.7fr_1.3fr]">
              <div className="space-y-4">
                <article className="rounded-xl border border-[#4b3e29] bg-[#211b12] p-5">
                  <div className="flex items-center gap-2">
                    <HandCoins size={17} className="text-[#d1a85d]" />
                    <h3 className="font-serif text-xl text-[#f2dfb4]">
                      Set household rents
                    </h3>
                  </div>
                  <div className="mt-5 flex items-baseline justify-between">
                    <span className="text-sm text-[#9b8b6e]">
                      {Math.round(world.landlord.rentMultiplier * 100)}% of
                      customary rent
                    </span>
                    <strong className="font-serif text-2xl text-[#efd49b]">
                      {money(projectedRent)}/day
                    </strong>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="5"
                    value={Math.round(world.landlord.rentMultiplier * 100)}
                    onChange={(event) =>
                      setWorld((current) =>
                        setEstateRent(
                          current,
                          Number(event.target.value) / 100,
                        ),
                      )
                    }
                    className="mt-4 w-full"
                  />
                  <div className="mt-2 flex justify-between text-[10px] text-[#746a59]">
                    <span>Merciful 50%</span>
                    <span>Customary 100%</span>
                    <span>Severe 200%</span>
                  </div>
                  <p className="mt-4 border-l-2 border-[#7f693d] pl-3 text-xs leading-5 text-[#93866f]">
                    Food is purchased before rent. If tenants cannot pay,
                    arrears accumulate rather than coins appearing from nowhere.
                    Persistent pressure lowers favor and raises lawlessness.
                  </p>
                </article>
                <article className="rounded-xl border border-[#4b3e29] bg-[#211b12] p-5">
                  <div className="flex items-center gap-2">
                    <HeartHandshake size={17} className="text-[#d1a85d]" />
                    <h3 className="font-serif text-xl text-[#f2dfb4]">
                      Tenant petitions
                    </h3>
                  </div>
                  <div className="mt-4 space-y-3">
                    {tenantsInArrears.length ? (
                      tenantsInArrears.slice(0, 4).map((household) => (
                        <div
                          key={household.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-[#403623] bg-[#19150f] p-3"
                        >
                          <div>
                            <div className="text-sm text-[#e3d0aa]">
                              {household.name}
                            </div>
                            <div className="mt-1 text-xs text-[#887b65]">
                              {money(household.coins)} cash · owes{" "}
                              {money(household.rentArrears)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setWorld((current) =>
                                forgiveHouseholdRent(current, household.id),
                              )
                            }
                            className="shrink-0 rounded border border-[#6c5836] px-2.5 py-1.5 text-xs text-[#e6c987]"
                          >
                            Forgive debt
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3 text-xs leading-5 text-emerald-200">
                        No household currently owes rent. Tenant accounts are
                        clear.
                      </p>
                    )}
                  </div>
                </article>
              </div>
              <div className="rounded-xl border border-[#4b3e29] bg-[#1d180f]">
                <div className="border-b border-[#3b3223] p-5">
                  <div className="flex items-center gap-2">
                    <KeyRound size={17} className="text-[#d1a85d]" />
                    <h3 className="font-serif text-xl text-[#f2dfb4]">
                      Farm tenancies
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-[#887b65]">
                    Treat each holding differently. More land creates potential,
                    but tenants still need demand, capital, and workers to
                    cultivate it.
                  </p>
                </div>
                <div className="divide-y divide-[#3b3223]">
                  {world.businesses
                    .filter((business) => business.farm)
                    .map((business) => {
                      const farm = business.farm!;
                      const owner = world.households.find(
                        (household) =>
                          household.id === business.ownerHouseholdId,
                      );
                      const idle = farm.landAcres - farm.cultivatedAcres;
                      return (
                        <article key={business.id} className="p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h4 className="font-medium text-[#ead9b5]">
                                {business.name}
                              </h4>
                              <p className="mt-1 text-xs text-[#8f826c]">
                                Tenant: {owner?.name ?? "estate managed"} ·{" "}
                                {farm.landAcres} acres · {idle} idle ·{" "}
                                {farm.phase}
                              </p>
                            </div>
                            <div className="text-right text-xs">
                              <div className="text-[#ead9b5]">
                                {money(business.cash)} working cash
                              </div>
                              <div className="mt-1 text-[#817560]">
                                {business.employeeIds.length}/
                                {business.desiredWorkers} workers ·{" "}
                                {Math.floor(business.goods.grain)} grain
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setWorld((current) =>
                                  grantFarmLease(current, business.id),
                                )
                              }
                              disabled={estateAcres < 5 || business.cash < 100}
                              className="rounded border border-[#665331] bg-[#2c2417] px-2 py-2 text-xs text-[#e6c987] disabled:opacity-30"
                            >
                              Lease +5ac · 100c
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setWorld((current) =>
                                  reclaimFarmLand(current, business.id),
                                )
                              }
                              disabled={
                                idle < 5 ||
                                farm.landAcres <= 20 ||
                                world.treasury < 50
                              }
                              className="rounded border border-[#5a4632] px-2 py-2 text-xs text-[#c9ad80] disabled:opacity-30"
                            >
                              Reclaim 5ac · pay 50c
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setWorld((current) =>
                                  supportFarmTenant(current, business.id),
                                )
                              }
                              disabled={world.treasury < 150}
                              className="rounded border border-[#4c5940] px-2 py-2 text-xs text-emerald-200 disabled:opacity-30"
                            >
                              Advance 150c
                            </button>
                          </div>
                        </article>
                      );
                    })}
                </div>
              </div>
            </section>
          </div>
        )}

        {tab === "council" && (
          <div className="space-y-4">
            <section className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
              <div className="rounded-xl border border-[#5c492c] bg-gradient-to-br from-[#2a2113] to-[#1b160e] p-5">
                <div className="flex items-center gap-2 text-[#d4ad63]">
                  <Landmark size={18} />
                  <span className="text-xs uppercase tracking-[0.18em]">
                    Council table
                  </span>
                </div>
                <h2 className="mt-3 font-serif text-2xl text-[#f2dfb4]">
                  {nextAmbition ? nextAmbition.name : "A flourishing township"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#b5a17d]">
                  {councilAdvice}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#55472f] bg-[#18140e] px-3 py-1.5 text-xs">
                    Treasury {money(world.treasury)}
                  </span>
                  <span className="rounded-full border border-[#55472f] bg-[#18140e] px-3 py-1.5 text-xs">
                    {ambitions.filter((item) => item.done).length}/
                    {ambitions.length} ambitions
                  </span>
                  <span className="rounded-full border border-[#55472f] bg-[#18140e] px-3 py-1.5 text-xs">
                    {world.publicWorks.roads +
                      world.publicWorks.granary +
                      world.publicWorks.market}
                    /9 public-work levels
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-[#4b3e29] bg-[#211b12] p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={17} className="text-[#d1a85d]" />
                  <h3 className="font-serif text-lg text-[#f2dfb4]">
                    Immediate powers
                  </h3>
                </div>
                <label className="mt-5 block text-xs uppercase tracking-wider text-[#91846e]">
                  Tax rate · {Math.round(world.taxRate * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={Math.round(world.taxRate * 100)}
                  onChange={(event) =>
                    setWorld((current) =>
                      setTaxRate(current, Number(event.target.value) / 100),
                    )
                  }
                  className="mt-2 w-full"
                />
                <p className="mt-2 text-xs leading-5 text-[#8f816a]">
                  Higher tax funds guards and projects, but steadily removes
                  household and business spending power.
                </p>
                <button
                  onClick={() => setWorld((current) => releaseFood(current))}
                  disabled={!world.foodReserve}
                  className="mt-4 w-full rounded-md border border-[#8b6b34] bg-[#342716] px-3 py-2.5 text-sm text-[#efd08f] disabled:opacity-40"
                >
                  Release 50 reserve meals
                </button>
              </div>
            </section>
            <section>
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 size={17} className="text-[#d1a85d]" />
                <h2 className="font-serif text-xl text-[#f2dfb4]">
                  Village ambitions
                </h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {ambitions.map((ambition) => (
                  <article
                    key={ambition.name}
                    className={`rounded-xl border p-4 ${ambition.done ? "border-emerald-800/60 bg-emerald-950/20" : "border-[#4b3e29] bg-[#211b12]"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium text-[#ead9b5]">
                        {ambition.name}
                      </h3>
                      {ambition.done ? (
                        <CheckCircle2
                          size={16}
                          className="shrink-0 text-emerald-400"
                        />
                      ) : (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                      )}
                    </div>
                    <p className="mt-3 text-xs leading-5 text-[#91846e]">
                      {ambition.detail}
                    </p>
                  </article>
                ))}
              </div>
            </section>
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Hammer size={17} className="text-[#d1a85d]" />
                <div>
                  <h2 className="font-serif text-xl text-[#f2dfb4]">
                    Public works
                  </h2>
                  <p className="text-xs text-[#887b65]">
                    Construction pays poorer households and local suppliers,
                    then permanently changes the simulation.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                {(["roads", "granary", "market"] as PublicProject[]).map(
                  (project) => (
                    <ProjectCard
                      key={project}
                      project={project}
                      world={world}
                      onCommission={() =>
                        setWorld((current) =>
                          commissionPublicProject(current, project),
                        )
                      }
                    />
                  ),
                )}
              </div>
            </section>
          </div>
        )}

        {tab === "economy" && (
          <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
            <section className="rounded-xl border border-[#4b3e29] bg-[#1d180f]">
              <div className="border-b border-[#3b3223] p-4">
                <h2 className="font-serif text-lg text-[#f2dfb4]">
                  Businesses and physical constraints
                </h2>
                <p className="text-xs text-[#887b65]">
                  Prices and wages adjust weekly; farm labor follows cultivated
                  acreage and real field tasks
                </p>
              </div>
              <div className="grid px-4 lg:grid-cols-2 lg:gap-x-6">
                {world.businesses.map((business) => (
                  <BusinessRow key={business.id} business={business} />
                ))}
              </div>
            </section>
            <aside className="space-y-4">
              <section
                className={`rounded-xl border p-4 ${metrics.health === "Crisis" ? "border-rose-800/60 bg-rose-950/20" : "border-[#4b3e29] bg-[#211b12]"}`}
              >
                <h2 className="font-serif text-lg text-[#f2dfb4]">
                  Why the village is {metrics.health.toLowerCase()}
                </h2>
                <div className="mt-3 space-y-2 text-xs leading-5 text-[#aa9b80]">
                  {metrics.healthReasons.length ? (
                    metrics.healthReasons.map((reason) => (
                      <div
                        key={reason}
                        className="border-l-2 border-[#8b6b34] pl-3"
                      >
                        {reason}
                      </div>
                    ))
                  ) : (
                    <div>
                      No immediate food, payroll, treasury, or inventory warning
                      is active.
                    </div>
                  )}
                </div>
              </section>
              <section className="rounded-xl border border-[#4b3e29] bg-[#211b12] p-4">
                <div className="mb-4 flex items-center gap-2">
                  <ShieldCheck size={17} className="text-[#d1a85d]" />
                  <h2 className="font-serif text-lg text-[#f2dfb4]">
                    Lord’s budget
                  </h2>
                </div>
                <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="block text-xs text-[#887b65]">
                      Guard posts
                    </span>
                    {metrics.guards} active
                  </div>
                  <div>
                    <span className="block text-xs text-[#887b65]">
                      Risk requirement
                    </span>
                    {metrics.requiredGuards} guards
                  </div>
                  <div>
                    <span className="block text-xs text-[#887b65]">
                      Civic workers
                    </span>
                    {civicWorkers} active
                  </div>
                  <div>
                    <span className="block text-xs text-[#887b65]">
                      Total crimes
                    </span>
                    {world.totalCrimes}
                  </div>
                  <div>
                    <span className="block text-xs text-[#887b65]">
                      Harm today
                    </span>
                    {money(metrics.crimeLossToday)}
                  </div>
                </div>
                <label className="text-xs uppercase tracking-wider text-[#91846e]">
                  Tax rate
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="25"
                    value={Math.round(world.taxRate * 100)}
                    onChange={(event) =>
                      setWorld((current) =>
                        setTaxRate(current, Number(event.target.value) / 100),
                      )
                    }
                    className="w-full"
                  />
                  <span className="font-mono text-sm">
                    {Math.round(world.taxRate * 100)}%
                  </span>
                </div>
                <button
                  onClick={() => setWorld((current) => releaseFood(current))}
                  disabled={!world.foodReserve}
                  className="mt-5 w-full rounded-md border border-[#8b6b34] bg-[#342716] px-3 py-2.5 text-sm text-[#efd08f] disabled:opacity-40"
                >
                  Release up to 50 reserve meals
                </button>
              </section>
              <section className="rounded-xl border border-[#4b3e29] bg-[#1d180f] p-4">
                <div className="flex items-center gap-2">
                  <Coins size={16} className="text-[#d1a85d]" />
                  <h3 className="font-serif text-[#f2dfb4]">
                    Closed accounting
                  </h3>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="block text-xs text-[#887b65]">
                      Local coins
                    </span>
                    {money(metrics.localCoins)}
                  </div>
                  <div>
                    <span className="block text-xs text-[#887b65]">
                      Whole system
                    </span>
                    {money(metrics.totalCoins)}
                  </div>
                  <div>
                    <span className="block text-xs text-[#887b65]">
                      Regional cash
                    </span>
                    {money(world.regionalMarket.cash)}
                  </div>
                  <div>
                    <span className="block text-xs text-[#887b65]">
                      Farm runway
                    </span>
                    {metrics.farmRunway} days
                  </div>
                </div>
                <p className="mt-3 text-xs leading-5 text-[#91846e]">
                  Exports transfer regional coins into village businesses;
                  imports move them back out. No trade money is created.
                </p>
              </section>
              <section className="rounded-xl border border-[#4b3e29] bg-[#1d180f] p-4">
                <h3 className="font-serif text-[#f2dfb4]">
                  Last completed day
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="block text-xs text-[#887b65]">
                      Business revenue
                    </span>
                    {money(metrics.businessRevenue)}
                  </div>
                  <div>
                    <span className="block text-xs text-[#887b65]">
                      Business costs
                    </span>
                    {money(metrics.businessCosts)}
                  </div>
                  <div>
                    <span className="block text-xs text-[#887b65]">
                      Goods spoiled
                    </span>
                    {metrics.goodsSpoiled}
                  </div>
                  <div>
                    <span className="block text-xs text-[#887b65]">
                      Farm grain
                    </span>
                    {metrics.grainStock}
                  </div>
                </div>
              </section>
              <section className="rounded-xl border border-[#4b3e29] bg-[#1d180f] p-4">
                <h3 className="font-serif text-[#f2dfb4]">
                  Today’s regional trade
                </h3>
                <div className="mt-3 text-sm text-[#a99a7d]">
                  {exports.length
                    ? exports.map(([good, quantity]) => (
                        <div
                          key={good}
                          className="flex justify-between border-b border-[#3b3223] py-2"
                        >
                          <span>{good}</span>
                          <span>{quantity} exported</span>
                        </div>
                      ))
                    : "No caravan exports completed today."}
                </div>
              </section>
            </aside>
          </div>
        )}

        {tab === "households" && (
          <section className="overflow-hidden rounded-xl border border-[#4b3e29] bg-[#1d180f]">
            <div className="border-b border-[#3b3223] p-4">
              <h2 className="font-serif text-lg text-[#f2dfb4]">
                Household distribution
              </h2>
              <p className="text-xs text-[#887b65]">
                {metrics.wageHouseholds} wage households ·{" "}
                {metrics.subsistenceHouseholds} subsistence households ·{" "}
                {metrics.assetHouseholds} business-owning ·{" "}
                {metrics.indebtedHouseholds} indebted · {world.immigrants}{" "}
                immigrants / {world.emigrants} emigrants
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-[#241d12] text-xs uppercase tracking-wider text-[#887b65]">
                  <tr>
                    <th className="p-4">Household</th>
                    <th>Status</th>
                    <th>People</th>
                    <th>Workers</th>
                    <th>Cash</th>
                    <th>Income</th>
                    <th>Spending</th>
                    <th>Home output</th>
                    <th>Bread</th>
                    <th>Food stress</th>
                    <th>Ownership</th>
                  </tr>
                </thead>
                <tbody>
                  {households.map((household) => {
                    const members = world.citizens.filter((citizen) =>
                      household.memberIds.includes(citizen.id),
                    );
                    const workers = members.filter(
                      (citizen) => citizen.employerId,
                    ).length;
                    const retired = members.filter(
                      (citizen) => citizen.retired,
                    ).length;
                    const hungry = members.some(
                      (citizen) => citizen.hunger > 15,
                    );
                    const status = household.ownedBusinessIds.length
                      ? "asset owner"
                      : workers
                        ? "wage household"
                        : retired === members.length
                          ? "retired household"
                          : "subsistence";
                    return (
                      <tr
                        key={household.id}
                        className="border-t border-[#3b3223]"
                      >
                        <td className="p-4 font-medium text-[#ead9b5]">
                          {household.name}
                        </td>
                        <td className="text-xs text-[#bba77f]">{status}</td>
                        <td>
                          {members.length}
                          {retired ? ` · ${retired} retired` : ""}
                        </td>
                        <td>{workers}</td>
                        <td className="font-mono">{money(household.coins)}</td>
                        <td className="font-mono text-emerald-300">
                          {money(household.lastIncome)}
                        </td>
                        <td className="font-mono text-amber-200">
                          {money(household.lastSpending)}
                        </td>
                        <td>{household.lastSubsistence.toFixed(1)} food</td>
                        <td>{household.goods.bread.toFixed(1)}</td>
                        <td
                          className={
                            hungry || household.missedMeals
                              ? "text-rose-300"
                              : "text-emerald-300"
                          }
                        >
                          {hungry
                            ? "hungry"
                            : household.missedMeals
                              ? `${household.missedMeals} missed`
                              : "secure"}
                        </td>
                        <td className="text-xs text-[#9d8e73]">
                          {household.ownedBusinessIds.length
                            ? household.ownedBusinessIds.join(", ")
                            : "none"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "ledger" && (
          <section className="rounded-xl border border-[#4b3e29] bg-[#1d180f] p-4">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle size={17} className="text-[#d1a85d]" />
              <div>
                <h2 className="font-serif text-lg text-[#f2dfb4]">
                  Cause-and-effect ledger
                </h2>
                <p className="text-xs text-[#887b65]">
                  Births, harvest deadlines, arrears, quits, investment, hunger,
                  and trade
                </p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {world.events.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-lg border p-4 ${toneStyles[item.tone]}`}
                >
                  <div className="mb-2 flex justify-between gap-3">
                    <h3 className="text-sm font-medium">{item.title}</h3>
                    <span className="shrink-0 font-mono text-[10px] opacity-60">
                      D{item.day} {String(item.hour).padStart(2, "0")}:00
                    </span>
                  </div>
                  <p className="text-xs leading-5 opacity-75">{item.detail}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
