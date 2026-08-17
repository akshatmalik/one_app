'use client';

import { useEffect, useRef, useState } from 'react';
import { Activity, BriefcaseBusiness, Home, MapPin, Route, Ruler, Sparkles, Utensils, Users, WalletCards, Wheat } from 'lucide-react';
import type { Business, BusinessKind, Citizen, WorldState } from '../lib/types';

const MAP_WIDTH = 2200;
const MAP_HEIGHT = 1800;
const TOWN = { x: 1050, y: 970 };
const SPEEDS = [0.1, 0.25, 1, 3, 10, 30, 100, 300];
const phaseColors: Record<string, [string, string]> = {
  prepare: ['#87613d', '#b88753'], grow: ['#557546', '#76975a'], harvest: ['#a9823f', '#d0aa58'], fallow: ['#6e674d', '#8a8060'],
};

const hash = (value: string) => {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) result = Math.imul(result ^ value.charCodeAt(index), 16777619);
  return Math.abs(result >>> 0);
};

const personColor = (citizen: Citizen, world: WorldState) => {
  if (citizen.hunger > 25) return '#ed6f64';
  if (!citizen.adult) return '#ead59e';
  if (citizen.retired) return '#ced2c7';
  const kind = world.businesses.find((business) => business.id === citizen.employerId)?.kind ?? citizen.skill;
  return ({ farm: '#88b96a', mill: '#71b8c8', bakery: '#e8b95b', woodcutter: '#7fa95b', blacksmith: '#d88757', merchant: '#a98ac4', estate: '#c96464' } as Record<BusinessKind, string>)[kind];
};

const barColor = (value: number) => value < 35 ? 'bg-rose-500' : value < 65 ? 'bg-amber-400' : 'bg-emerald-500';

function currentActivity(citizen: Citizen, world: WorldState) {
  const employer = world.businesses.find((business) => business.id === citizen.employerId);
  if (citizen.journey) return `Walking to ${citizen.journey.destination === 'work' ? employer?.name ?? 'work' : citizen.journey.destination}`;
  if (citizen.hunger > 25) return 'Seeking food';
  if (!citizen.adult) return world.hour >= 8 && world.hour < 17 ? 'Helping, learning, or playing' : 'At home';
  if (citizen.retired) return world.hour >= 11 && world.hour < 16 ? 'Trading and visiting' : 'At home';
  if (world.hour >= 8 && world.hour < 16) return employer ? `Working at ${employer.name}` : 'Household production';
  if (world.hour >= 16 && world.hour < 19) return 'Buying food and goods';
  return 'At home';
}

function citizenPoint(citizen: Citizen, world: WorldState) {
  void world;
  return { x: citizen.positionX, y: citizen.positionY };
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawRoad(ctx: CanvasRenderingContext2D, x: number, y: number, bend = 0) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo((x + TOWN.x) / 2 + bend, (y + TOWN.y) / 2 - bend * 0.25, TOWN.x, TOWN.y);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#6c6044';
  ctx.lineWidth = 34;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(220,197,145,.2)';
  ctx.lineWidth = 5;
  ctx.setLineDash([18, 25]);
  ctx.stroke();
  ctx.restore();
}

function drawHouse(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1, important = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = 'rgba(23,18,10,.35)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = important ? '#8b7050' : '#a78a60';
  ctx.strokeStyle = '#44351f';
  ctx.lineWidth = 4;
  ctx.fillRect(-25 * scale, -12 * scale, 50 * scale, 33 * scale);
  ctx.strokeRect(-25 * scale, -12 * scale, 50 * scale, 33 * scale);
  ctx.beginPath();
  ctx.moveTo(-33 * scale, -10 * scale);
  ctx.lineTo(0, -35 * scale);
  ctx.lineTo(33 * scale, -10 * scale);
  ctx.closePath();
  ctx.fillStyle = important ? '#71453a' : '#76513a';
  ctx.fill();
  ctx.stroke();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#d7ba78';
  ctx.fillRect(-5 * scale, 6 * scale, 10 * scale, 15 * scale);
  ctx.fillStyle = '#5e7c79';
  ctx.fillRect(-18 * scale, -2 * scale, 9 * scale, 8 * scale);
  ctx.restore();
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, tone: number) {
  ctx.fillStyle = 'rgba(25,30,18,.28)';
  ctx.beginPath(); ctx.ellipse(x + 8, y + radius * .72, radius * .85, radius * .35, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#53412a'; ctx.fillRect(x - 4, y + radius * .25, 8, radius * .8);
  const colors = ['#29452d', '#31543a', '#3d603d'];
  ctx.fillStyle = colors[tone % colors.length];
  ctx.strokeStyle = '#1c3525'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(139,165,91,.18)';
  ctx.beginPath(); ctx.arc(x - radius * .28, y - radius * .3, radius * .42, 0, Math.PI * 2); ctx.fill();
}

function drawMap(ctx: CanvasRenderingContext2D, world: WorldState, selectedFarmId: string | null) {
  ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  ctx.fillStyle = '#5c6844'; ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

  // Quiet terrain texture and meadow variation.
  for (let index = 0; index < 520; index += 1) {
    const x = hash(`grass-x-${index}`) % MAP_WIDTH;
    const y = hash(`grass-y-${index}`) % MAP_HEIGHT;
    const size = 2 + hash(`grass-r-${index}`) % 8;
    ctx.fillStyle = index % 3 ? 'rgba(225,215,151,.045)' : 'rgba(31,55,29,.055)';
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(190,181,118,.08)';
  ctx.beginPath(); ctx.ellipse(520, 1180, 430, 300, -.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(1300, 1500, 520, 200, .15, 0, Math.PI * 2); ctx.fill();

  // River with shaded banks and small highlights.
  const river = () => { ctx.beginPath(); ctx.moveTo(1870, -80); ctx.bezierCurveTo(1660, 280, 2010, 500, 1790, 770); ctx.bezierCurveTo(1580, 1035, 1880, 1280, 1645, 1880); };
  river(); ctx.strokeStyle = '#3a4a3b'; ctx.lineWidth = 166; ctx.lineCap = 'round'; ctx.stroke();
  river(); ctx.strokeStyle = '#547f83'; ctx.lineWidth = 125; ctx.stroke();
  river(); ctx.strokeStyle = 'rgba(183,219,207,.3)'; ctx.lineWidth = 8; ctx.setLineDash([42, 34]); ctx.stroke(); ctx.setLineDash([]);

  // Forest edge frames the map without becoming a wall of circles.
  for (let index = 0; index < 88; index += 1) {
    const x = 1910 + hash(`wood-x-${index}`) % 255;
    const y = 35 + hash(`wood-y-${index}`) % 1690;
    drawTree(ctx, x, y, 17 + hash(`wood-r-${index}`) % 18, index);
  }

  const farms = world.businesses.filter((business) => business.farm);
  farms.forEach((business, index) => {
    const farm = business.farm!;
    drawRoad(ctx, farm.fieldX + farm.fieldWidthMeters / 2, farm.fieldY + farm.fieldHeightMeters / 2, (index - 1.5) * 55);
  });

  // Fields have hedges, alternating crop bands, barns, and a restrained label.
  farms.forEach((business) => {
    const farm = business.farm!;
    const selected = business.id === selectedFarmId;
    const [dark, light] = phaseColors[farm.phase];
    const ratio = farm.landAcres ? farm.cultivatedAcres / farm.landAcres : 0;
    const cultivatedWidth = Math.max(0, (farm.fieldWidthMeters - 24) * ratio);
    ctx.save();
    ctx.shadowColor = 'rgba(20,24,13,.32)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 10;
    roundedRect(ctx, farm.fieldX, farm.fieldY, farm.fieldWidthMeters, farm.fieldHeightMeters, 18);
    ctx.fillStyle = '#746d4c'; ctx.fill();
    ctx.shadowColor = 'transparent';
    roundedRect(ctx, farm.fieldX + 12, farm.fieldY + 12, cultivatedWidth, farm.fieldHeightMeters - 24, 10);
    ctx.fillStyle = dark; ctx.fill();
    ctx.save(); ctx.clip();
    const bands = Math.max(3, Math.floor(cultivatedWidth / 38));
    for (let band = 0; band < bands; band += 1) {
      ctx.fillStyle = band % 2 ? `${light}88` : 'rgba(38,44,25,.12)';
      ctx.fillRect(farm.fieldX + 12 + band * cultivatedWidth / bands, farm.fieldY + 12, cultivatedWidth / bands * .55, farm.fieldHeightMeters - 24);
    }
    ctx.restore();
    ctx.strokeStyle = selected ? '#f6dda3' : '#374529'; ctx.lineWidth = selected ? 12 : 9;
    roundedRect(ctx, farm.fieldX, farm.fieldY, farm.fieldWidthMeters, farm.fieldHeightMeters, 18); ctx.stroke();
    ctx.strokeStyle = 'rgba(184,202,121,.55)'; ctx.lineWidth = 4; ctx.setLineDash([8, 9]); ctx.stroke(); ctx.setLineDash([]);
    drawHouse(ctx, farm.fieldX + farm.fieldWidthMeters - 48, farm.fieldY + farm.fieldHeightMeters - 38, .82, true);
    const labelWidth = Math.min(farm.fieldWidthMeters - 34, 310);
    roundedRect(ctx, farm.fieldX + 18, farm.fieldY + 18, labelWidth, 82, 10);
    ctx.fillStyle = 'rgba(30,30,20,.76)'; ctx.fill();
    ctx.fillStyle = '#f5e5bd'; ctx.font = '600 26px Georgia'; ctx.fillText(business.name, farm.fieldX + 35, farm.fieldY + 50, labelWidth - 32);
    ctx.fillStyle = '#c9b98e'; ctx.font = '18px system-ui'; ctx.fillText(`${farm.landAcres} acres · ${farm.phase} · ${business.employeeIds.length}/${business.desiredWorkers} workers`, farm.fieldX + 35, farm.fieldY + 79, labelWidth - 32);
    ctx.restore();
  });

  // Settlement ground follows occupied plots instead of enclosing the town in a fixed circle.
  for (const household of world.households) {
    ctx.fillStyle = 'rgba(139,126,82,.26)';
    ctx.beginPath();
    ctx.ellipse(household.homeX, household.homeY + 8, 88, 62, (hash(household.id) % 20 - 10) / 50, 0, Math.PI * 2);
    ctx.fill();
  }

  const streets: Array<[number, number, number, number, number, number]> = [
    [560, 890, 1010, 860, 1570, 1035],
    [1060, 970, 1210, 770, 1510, 570],
    [1025, 945, 980, 1170, 1130, 1530],
    [1030, 975, 810, 990, 475, 1120],
    [1120, 980, 1400, 1010, 1700, 1220],
    [900, 870, 850, 690, 720, 555],
    [1260, 965, 1490, 890, 1710, 840],
    [760, 1030, 650, 1240, 510, 1430],
  ];
  for (const [startX, startY, controlX, controlY, endX, endY] of streets.slice(0, Math.min(world.settlement.streets, streets.length))) {
    ctx.beginPath(); ctx.moveTo(startX, startY); ctx.quadraticCurveTo(controlX, controlY, endX, endY);
    ctx.strokeStyle = '#6b5c3f'; ctx.lineWidth = 39; ctx.lineCap = 'round'; ctx.stroke();
    ctx.strokeStyle = '#a99361'; ctx.lineWidth = 27; ctx.stroke();
    ctx.strokeStyle = 'rgba(230,208,151,.18)'; ctx.lineWidth = 4; ctx.setLineDash([15, 24]); ctx.stroke(); ctx.setLineDash([]);
  }

  // A small market crossroads anchors the old village, while later wards stretch along new roads.
  ctx.fillStyle = '#94825a'; ctx.beginPath(); ctx.moveTo(955, 910); ctx.quadraticCurveTo(1050, 875, 1148, 925); ctx.quadraticCurveTo(1180, 1010, 1085, 1050); ctx.quadraticCurveTo(970, 1055, 935, 985); ctx.closePath(); ctx.fill();
  world.households.forEach((household, index) => drawHouse(ctx, household.homeX, household.homeY, .78 + (index % 3) * .08));

  const businessAnchors: Record<BusinessKind, Array<{ x: number; y: number }>> = {
    farm: [], mill: [{ x: 1490, y: 690 }], bakery: [{ x: 1000, y: 910 }, { x: 1125, y: 1040 }],
    woodcutter: [{ x: 1630, y: 760 }], blacksmith: [{ x: 850, y: 1010 }], merchant: [{ x: 1080, y: 930 }], estate: [{ x: 900, y: 1190 }],
  };
  const kindCounts: Partial<Record<BusinessKind, number>> = {};
  for (const business of world.businesses.filter((item) => !item.farm)) {
    const index = kindCounts[business.kind] ?? 0;
    kindCounts[business.kind] = index + 1;
    const anchors = businessAnchors[business.kind];
    const point = anchors[index] ?? { x: 1040 + index * 70, y: 1100 + index * 45 };
    drawHouse(ctx, point.x, point.y, business.kind === 'estate' ? 1.45 : 1.1, true);
  }

  const districts: Array<[string, number, number]> = [
    ['OLD MARKET', 720, 790], ['MILL LANE', 1260, 620], ['SOUTHWARD', 1080, 1405], ['WEST GATE', 505, 1045], ['RIVER WARD', 1450, 1135],
  ];
  ctx.font = '700 18px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(244,226,182,.72)';
  for (const [label, x, y] of districts) {
    if (world.households.some((household) => household.district === label.toLowerCase().replace(' ', '-'))) ctx.fillText(label, x, y);
  }
  ctx.fillStyle = '#f4e2b6'; ctx.font = '700 24px Georgia'; ctx.fillText('MARKET CROSS', TOWN.x, TOWN.y + 8);
  ctx.fillStyle = '#d0bb8b'; ctx.font = '17px system-ui'; ctx.fillText(`${world.households.length}/${world.settlement.housingCapacity} homes · ${world.settlement.streets} streets`, TOWN.x, TOWN.y + 35);
  ctx.textAlign = 'left';

  // Selected holding gets a clean measured connection to town.
  const selectedFarm = farms.find((business) => business.id === selectedFarmId)?.farm;
  if (selectedFarm) {
    ctx.beginPath(); ctx.moveTo(selectedFarm.fieldX + selectedFarm.fieldWidthMeters / 2, selectedFarm.fieldY + selectedFarm.fieldHeightMeters / 2); ctx.lineTo(TOWN.x, TOWN.y);
    ctx.strokeStyle = 'rgba(252,231,181,.75)'; ctx.lineWidth = 6; ctx.setLineDash([18, 16]); ctx.stroke(); ctx.setLineDash([]);
  }

  // Time-of-day tint and scale cartouche.
  const night = world.hour < 5 || world.hour >= 22 ? .42 : world.hour < 7 || world.hour >= 19 ? .2 : .03;
  if (night > 0) { ctx.fillStyle = `rgba(18,27,45,${night})`; ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT); }
  roundedRect(ctx, 55, 1670, 325, 82, 12); ctx.fillStyle = 'rgba(30,28,19,.78)'; ctx.fill();
  ctx.strokeStyle = '#ead7a7'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(90, 1705); ctx.lineTo(320, 1705); ctx.stroke();
  for (const x of [90, 205, 320]) { ctx.beginPath(); ctx.moveTo(x, 1693); ctx.lineTo(x, 1717); ctx.stroke(); }
  ctx.fillStyle = '#e6d4a8'; ctx.font = '18px system-ui'; ctx.fillText('250 metres', 145, 1740);
}

function CitizenPawn({ citizen, world, selected, speed, onSelect }: { citizen: Citizen; world: WorldState; selected: boolean; speed: number; onSelect: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const point = citizenPoint(citizen, world);
  const journey = citizen.journey;
  const facing = journey ? Math.atan2(journey.toY - journey.fromY, journey.toX - journey.fromX) * 180 / Math.PI + 90 : hash(citizen.id) % 24 - 12;
  useEffect(() => {
    const element = ref.current;
    if (!element || !journey) return;
    const firstLeg = Math.hypot(journey.viaX - journey.fromX, journey.viaY - journey.fromY);
    const secondLeg = Math.hypot(journey.toX - journey.viaX, journey.toY - journey.viaY);
    const midpoint = firstLeg / Math.max(1, firstLeg + secondLeg);
    const duration = Math.max(140, journey.durationHours * 5000 / Math.max(0.1, speed));
    const animation = element.animate([
      { left: `${journey.fromX / MAP_WIDTH * 100}%`, top: `${journey.fromY / MAP_HEIGHT * 100}%`, offset: 0 },
      { left: `${journey.viaX / MAP_WIDTH * 100}%`, top: `${journey.viaY / MAP_HEIGHT * 100}%`, offset: midpoint },
      { left: `${journey.toX / MAP_WIDTH * 100}%`, top: `${journey.toY / MAP_HEIGHT * 100}%`, offset: 1 },
    ], { duration, easing: 'linear', fill: 'forwards' });
    return () => animation.cancel();
  }, [journey, speed]);
  const base = journey ? { x: journey.fromX, y: journey.fromY } : point;
  const color = personColor(citizen, world);
  return <button
    ref={ref}
    type="button"
    onClick={onSelect}
    aria-label={`Inspect ${citizen.name}: ${currentActivity(citizen, world)}`}
    title={`${citizen.name} · ${currentActivity(citizen, world)}`}
    className={`group absolute z-20 h-[18px] w-[14px] -translate-x-1/2 -translate-y-1/2 focus:outline-none ${selected ? 'z-30 scale-125' : 'hover:z-30 hover:scale-125'}`}
    style={{ left: `${base.x / MAP_WIDTH * 100}%`, top: `${base.y / MAP_HEIGHT * 100}%` }}
  >
    <span className={`pointer-events-none absolute -inset-1 rounded-full border ${selected ? 'border-[#fff0b8] bg-[#fff0b8]/15' : 'border-transparent group-hover:border-white/50'}`} />
    <span className="pointer-events-none absolute bottom-[-2px] left-1/2 h-[5px] w-[13px] -translate-x-1/2 rounded-full bg-black/45 blur-[1px]" />
    <span className="pointer-events-none absolute left-1/2 top-[4px] h-[12px] w-[11px] -translate-x-1/2 rounded-[48%_48%_38%_38%] border border-[#251c13] shadow-sm" style={{ background: color, transform: `translateX(-50%) rotate(${facing}deg)` }} />
    <span className="pointer-events-none absolute left-1/2 top-0 h-[8px] w-[8px] -translate-x-1/2 rounded-full border border-[#34271b] bg-[#d7b88c] shadow-sm" />
    {citizen.hunger > 25 && <span className="pointer-events-none absolute -right-2 -top-2 grid h-3.5 w-3.5 place-items-center rounded-full bg-rose-600 text-[8px] font-bold text-white">!</span>}
  </button>;
}

function PersonInspector({ citizen, world }: { citizen?: Citizen; world: WorldState }) {
  if (!citizen) return <aside className="grid min-h-[380px] place-items-center rounded-2xl border border-dashed border-[#574a33] bg-gradient-to-b from-[#211b12] to-[#19150f] p-7 text-center"><div><MapPin className="mx-auto mb-3 text-[#c79a4b]" /><h3 className="font-serif text-xl text-[#f2dfb4]">Explore the estate</h3><p className="mt-2 max-w-[260px] text-xs leading-5 text-[#95876e]">Select a named field for its physical workload, or choose a resident marker for their family and livelihood.</p></div></aside>;
  const household = world.households.find((item) => item.id === citizen.householdId);
  const employer = world.businesses.find((business) => business.id === citizen.employerId);
  const partner = world.citizens.find((person) => person.id === citizen.partnerId);
  const children = world.citizens.filter((person) => person.parentIds.includes(citizen.id));
  const owned = world.businesses.filter((business) => household?.ownedBusinessIds.includes(business.id));
  const role = !citizen.adult ? 'Child' : citizen.retired ? 'Retired villager' : employer?.kind === 'estate' ? 'Guard or civic worker' : employer ? `${employer.kind} worker` : 'Household producer';
  return <aside className="rounded-2xl border border-[#4b3e29] bg-gradient-to-b from-[#231c12] to-[#19150f] p-5 shadow-xl">
    <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[0.2em] text-[#9b896a]">Resident record</p><h3 className="mt-1 font-serif text-2xl text-[#f4dfb1]">{citizen.name}</h3><p className="mt-1 text-xs text-[#a7977b]">Age {citizen.age} · {role}</p></div><div className="mt-1 h-4 w-4 rounded-full ring-4 ring-[#352b1b]" style={{ background: personColor(citizen, world) }} /></div>
    <div className="mt-5 rounded-xl border border-[#493d29] bg-[#2a2114] p-3"><div className="flex items-center gap-2 text-sm text-[#edd49c]"><Activity size={15} />{currentActivity(citizen, world)}</div><p className="mt-1 text-xs text-[#8f816a]">Day {world.day}, {String(world.hour).padStart(2, '0')}:00</p></div>
    <div className="mt-5 grid grid-cols-2 gap-4 text-sm"><div><span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#817560]"><Home size={12} />Household</span><span className="mt-1 block text-[#dfcfac]">{household?.name ?? 'None'}</span></div><div><span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#817560]"><BriefcaseBusiness size={12} />Work</span><span className="mt-1 block text-[#dfcfac]">{employer?.name ?? (citizen.adult ? 'Home economy' : 'Dependent')}</span></div><div><span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#817560]"><WalletCards size={12} />Contract</span><span className="mt-1 block text-[#dfcfac]">{employer ? `${employer.wageOffer.toFixed(1)}c / day` : 'No cash wage'}</span></div><div><span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#817560]"><Utensils size={12} />Food</span><span className="mt-1 block text-[#dfcfac]">{citizen.hunger < 15 ? 'Fed' : citizen.hunger < 40 ? 'Hungry' : 'Severely hungry'}</span></div></div>
    <div className="mt-5 space-y-3">{([['Health', citizen.health], ['Morale', citizen.morale], ['Food security', 100 - citizen.hunger]] as const).map(([label, value]) => <div key={label}><div className="mb-1 flex justify-between text-[11px] text-[#9b8d73]"><span>{label}</span><span>{Math.round(value)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#352d20]"><div className={`h-full ${barColor(value)}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div></div>)}</div>
    <div className="mt-5 border-t border-[#3c3223] pt-4 text-xs leading-5 text-[#a39479]"><p><span className="text-[#746a59]">Today:</span> {citizen.hoursWorkedToday.toFixed(1)} hours · {citizen.wagePaidToday.toFixed(1)}c paid</p><p><span className="text-[#746a59]">Household:</span> {household?.coins.toFixed(1) ?? '0.0'}c cash · {household?.goods.bread.toFixed(1) ?? '0.0'} bread</p><p><span className="text-[#746a59]">Family:</span> {partner ? `partnered with ${partner.name}` : 'no partner'} · {children.length} children</p><p><span className="text-[#746a59]">Assets:</span> {owned.length ? owned.map((business) => business.name).join(', ') : 'none'}</p></div>
  </aside>;
}

function FarmInspector({ business }: { business: Business }) {
  const farm = business.farm!;
  const task = farm.phase === 'prepare' ? 'Preparing and sowing' : farm.phase === 'harvest' ? 'Harvesting' : farm.phase === 'grow' ? 'Growing and tending' : 'Fallow maintenance';
  return <aside className="rounded-2xl border border-[#55613a] bg-gradient-to-b from-[#242015] to-[#19150f] p-5 shadow-xl"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[0.2em] text-[#9b896a]">Estate holding</p><h3 className="mt-1 font-serif text-2xl text-[#f4dfb1]">{business.name}</h3><p className="mt-1 text-xs text-[#a7977b]">{task} · {business.employeeIds.length}/{business.desiredWorkers} workers</p></div><Wheat className="text-[#d4ae55]" /></div>
    <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">{[['Holding', `${farm.landAcres} acres`], ['Cultivated', `${farm.cultivatedAcres} acres`], ['Dimensions', `${Math.round(farm.fieldWidthMeters)} × ${Math.round(farm.fieldHeightMeters)}m`], ['Town distance', `${Math.round(farm.distanceToTownMeters)}m`], ['Daily round trip', `${farm.travelHoursPerWorker.toFixed(2)} hours`], ['Productive shift', `${farm.productiveHoursPerWorker.toFixed(2)} hours`], ['Inside-field travel', `${farm.internalTravelHours.toFixed(1)} hours`], ['Work today', `${farm.dailyLaborHours.toFixed(1)} hours`], ['Task remaining', `${Math.ceil(farm.taskHoursRemaining)} hours`], ['Grain stored', `${Math.floor(business.goods.grain)}`]].map(([label, value]) => <div key={label}><span className="block text-[10px] uppercase tracking-wider text-[#817560]">{label}</span><span className="mt-1 block text-[#ded0ae]">{value}</span></div>)}</div>
    <div className="mt-5 rounded-xl border border-[#493d29] bg-[#282115] p-3 text-xs leading-5 text-[#b4a382]">{business.reason}</div><p className="mt-4 flex gap-2 text-[11px] leading-5 text-[#857861]"><Ruler className="mt-0.5 shrink-0" size={14} />The visible footprint equals the recorded acreage; long holdings add real internal travel time.</p></aside>;
}

export function VillageMap({ world, selectedId, onSelect, speed, onSpeedChange, onExpand, expansionCost }: { world: WorldState; selectedId: string | null; onSelect: (id: string | null) => void; speed: number; onSpeedChange: (speed: number) => void; onExpand: () => void; expansionCost: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [showPeople, setShowPeople] = useState(true);
  const selected = world.citizens.find((citizen) => citizen.id === selectedId);
  const selectedFarm = world.businesses.find((business) => business.id === selectedFarmId && business.farm);
  const farms = world.businesses.filter((business) => business.farm);
  const phase = world.hour < 5 ? 'Night watch' : world.hour < 7 ? 'Dawn' : world.hour < 16 ? 'Working day' : world.hour < 19 ? 'Market hours' : world.hour < 22 ? 'Evening' : 'Night watch';

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) drawMap(ctx, world, selectedFarmId);
  }, [world, selectedFarmId]);

  const selectPerson = (id: string) => { setSelectedFarmId(null); onSelect(id); };
  const selectFarm = (id: string) => { onSelect(null); setSelectedFarmId(id); };

  return <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
    <section className="overflow-hidden rounded-2xl border border-[#4b3e29] bg-[#1d180f] shadow-2xl shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#3b3223] bg-gradient-to-r from-[#251e13] to-[#1b160f] p-4"><div><div className="flex items-center gap-2"><Sparkles size={15} className="text-[#d0a452]" /><h2 className="font-serif text-xl text-[#f2dfb4]">The lord's survey</h2></div><p className="mt-1 text-xs text-[#887b65]">{world.households.length}/{world.settlement.housingCapacity} homes · {world.settlement.streets} named streets · growth follows buildable plots.</p></div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={onExpand} disabled={world.treasury < expansionCost} className="flex h-8 items-center gap-2 rounded-full border border-[#8f6e38] bg-[#352817] px-3 text-[11px] text-[#efd49b] disabled:opacity-35"><Route size={13} />New street · {expansionCost}c</button><button type="button" onClick={() => setShowPeople((value) => !value)} className={`flex h-8 items-center gap-2 rounded-full border px-3 text-[11px] ${showPeople ? 'border-[#8f6e38] bg-[#352817] text-[#efd49b]' : 'border-[#4e422d] text-[#9d8d70]'}`}><Users size={13} />Residents {showPeople ? 'on' : 'off'}</button><div className="rounded-full border border-[#4e422d] bg-[#18140e] px-3 py-1.5 text-[10px] text-[#bca77f]">1 unit = 1 metre</div></div></div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3b3223] bg-[#17130d] px-4 py-2"><div><span className="font-serif text-lg text-[#f5ddb0]">{String(world.hour).padStart(2, '0')}:00</span><span className="ml-2 text-[10px] uppercase tracking-[0.16em] text-[#a7916b]">{phase}</span></div><div className="flex flex-wrap items-center justify-end gap-1"><span className="mr-1 text-[9px] uppercase tracking-[0.16em] text-[#9c8967]">1× = 2 min/day</span>{SPEEDS.map((value) => <button key={value} type="button" onClick={() => onSpeedChange(value)} className={`h-7 min-w-9 rounded-md px-2 text-[10px] font-semibold ${speed === value ? 'bg-[#c59344] text-[#1b1409] shadow-inner' : 'border border-[#4e422d] bg-[#241e14] text-[#dec99f] hover:bg-[#302719]'}`}>{value}×</button>)}</div></div>
      <div className="relative overflow-hidden bg-[#566240]">
        <canvas ref={canvasRef} width={MAP_WIDTH} height={MAP_HEIGHT} className="block aspect-[11/9] w-full" aria-label="Illustrated scale map of the medieval township" />
        {farms.map((business) => { const farm = business.farm!; return <button key={business.id} type="button" onClick={() => selectFarm(business.id)} aria-label={`Inspect ${business.name}`} className={`absolute rounded-xl border-2 transition-colors ${selectedFarmId === business.id ? 'border-[#ffe6ad]/70' : 'border-transparent hover:border-[#ffe6ad]/45'}`} style={{ left: `${farm.fieldX / MAP_WIDTH * 100}%`, top: `${farm.fieldY / MAP_HEIGHT * 100}%`, width: `${farm.fieldWidthMeters / MAP_WIDTH * 100}%`, height: `${farm.fieldHeightMeters / MAP_HEIGHT * 100}%` }} />; })}
        {showPeople && world.citizens.map((citizen) => <CitizenPawn key={citizen.id} citizen={citizen} world={world} selected={selectedId === citizen.id} speed={speed} onSelect={() => selectPerson(citizen.id)} />)}
        <div className="pointer-events-none absolute bottom-3 right-3 flex flex-wrap justify-end gap-x-3 gap-y-1 rounded-full border border-white/10 bg-[#1b1911]/80 px-3 py-2 text-[9px] text-[#d7c6a7] shadow-xl backdrop-blur-sm">{[['#88b96a', 'farm'], ['#e8b95b', 'craft'], ['#c96464', 'civic'], ['#ead59e', 'child'], ['#ed6f64', 'hungry']].map(([color, label]) => <span key={label} className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: color }} />{label}</span>)}</div>
      </div>
    </section>
    {selectedFarm ? <FarmInspector business={selectedFarm} /> : <PersonInspector citizen={selected} world={world} />}
  </div>;
}
