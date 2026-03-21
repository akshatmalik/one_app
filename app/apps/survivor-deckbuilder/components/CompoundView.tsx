'use client';

import { CardInstance, RawMaterials, CardCategory } from '../lib/types';
import { clsx } from 'clsx';

interface CompoundViewProps {
  deck: CardInstance[];
  rawMaterials: RawMaterials;
  onBack: () => void;
}

const CATEGORY_CONFIG: Record<CardCategory, { label: string; gradient: string; accent: string; icon: string }> = {
  survivor:  { label: 'Survivors',  gradient: 'from-stone-900 to-stone-950',    accent: 'border-stone-600',   icon: '◉' },
  weapon:    { label: 'Weapons',    gradient: 'from-red-950 to-stone-950',      accent: 'border-red-800',     icon: '⚔' },
  gear:      { label: 'Gear',       gradient: 'from-slate-900 to-stone-950',    accent: 'border-blue-800',    icon: '🛡' },
  medical:   { label: 'Medical',    gradient: 'from-emerald-950 to-stone-950',  accent: 'border-emerald-800', icon: '✚' },
  food:      { label: 'Food',       gradient: 'from-amber-950 to-stone-950',    accent: 'border-amber-800',   icon: '◆' },
  action:    { label: 'Actions',    gradient: 'from-purple-950 to-stone-950',   accent: 'border-purple-800',  icon: '⚡' },
  upgrade:   { label: 'Upgrades',   gradient: 'from-teal-950 to-stone-950',     accent: 'border-teal-800',    icon: '▲' },
  building:  { label: 'Buildings',  gradient: 'from-orange-950 to-stone-950',   accent: 'border-orange-800',  icon: '⬡' },
  seed:      { label: 'Seeds',      gradient: 'from-lime-950 to-stone-950',     accent: 'border-lime-800',    icon: '🌱' },
};

// Infer category from card if not explicitly set
function inferCategory(card: CardInstance): CardCategory {
  if (card.category) return card.category;
  if (card.type === 'survivor') return 'survivor';
  if (card.maxAmmo !== undefined) return 'weapon';
  if (card.itemType === 'action' || card.type === 'action') return 'action';
  if (card.bonusAttributes?.healing && (card.bonusAttributes.healing > 0)) return 'medical';
  if (card.itemType === 'equipment') return 'gear';
  return 'action';
}

const MAT_ICONS: Record<string, string> = {
  scrapMetal: '⚙',
  wood: '▤',
  cloth: '◫',
  medicalSupplies: '✚',
  food: '◆',
};

const MAT_LABELS: Record<string, string> = {
  scrapMetal: 'Scrap',
  wood: 'Wood',
  cloth: 'Cloth',
  medicalSupplies: 'Meds',
  food: 'Food',
};

// Workshop recipes
const CRAFT_RECIPES = [
  { id: 'r_medkit', name: 'Medical Kit', cost: { cloth: 3, medicalSupplies: 2 }, output: 'Heals +50', category: 'medical' as CardCategory },
  { id: 'r_bandages', name: 'Bandages', cost: { cloth: 1, medicalSupplies: 1 }, output: 'Heals +15', category: 'medical' as CardCategory },
  { id: 'r_shotgun', name: 'Improv. Shotgun', cost: { scrapMetal: 4, wood: 2 }, output: 'ATK +60, 4 shots', category: 'weapon' as CardCategory },
  { id: 'r_vest', name: 'Reinforced Vest', cost: { scrapMetal: 3, cloth: 2 }, output: 'DEF +30', category: 'gear' as CardCategory },
  { id: 'r_ration', name: 'Food Can', cost: { cloth: 1, medicalSupplies: 1 }, output: '+2 food', category: 'food' as CardCategory },
  { id: 'r_molotov', name: 'Molotov', cost: { food: 2, cloth: 1 }, output: 'ATK +35 AOE', category: 'action' as CardCategory },
];

function canCraft(recipe: typeof CRAFT_RECIPES[0], mats: RawMaterials): boolean {
  return Object.entries(recipe.cost).every(([key, val]) => {
    const have = (mats as unknown as Record<string, number>)[key] ?? 0;
    return have >= (val as number);
  });
}

export function CompoundView({ deck, rawMaterials, onBack }: CompoundViewProps) {
  // Group cards by category
  const grouped: Partial<Record<CardCategory, CardInstance[]>> = {};
  deck.forEach(card => {
    const cat = inferCategory(card);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat]!.push(card);
  });

  const categoryOrder: CardCategory[] = ['survivor', 'weapon', 'gear', 'medical', 'food', 'action', 'seed', 'upgrade', 'building'];

  return (
    <div className="min-h-screen bg-stone-950 text-stone-300 flex flex-col">
      {/* Header */}
      <div className="px-5 pt-6 pb-3 border-b border-stone-900 sticky top-0 bg-stone-950 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-stone-600 hover:text-stone-400 font-mono text-xs uppercase transition-colors"
          >
            ← BACK
          </button>
          <div>
            <p className="text-[8px] text-stone-700 font-mono tracking-widest uppercase">HOME BASE</p>
            <h1 className="text-lg font-bold text-stone-200 uppercase tracking-wider font-mono leading-none">
              THE COMPOUND
            </h1>
          </div>
        </div>

        {/* Materials summary */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {Object.entries(rawMaterials).map(([key, val]) => {
            if ((val ?? 0) === 0) return null;
            return (
              <div key={key} className="flex items-center gap-1 border border-stone-800 bg-stone-900 px-2 py-1 rounded">
                <span className="text-stone-600 text-xs">{MAT_ICONS[key] ?? '?'}</span>
                <span className="text-[9px] text-stone-500 font-mono">{MAT_LABELS[key]}</span>
                <span className="text-xs font-mono font-bold text-stone-300 ml-0.5">{val}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 px-5 pb-8">

        {/* Workshop — crafting section */}
        <div className="mt-5">
          <p className="text-[8px] text-stone-700 font-mono tracking-widest uppercase mb-2">WORKSHOP · CRAFT</p>
          <div className="space-y-1.5">
            {CRAFT_RECIPES.map(recipe => {
              const catConf = CATEGORY_CONFIG[recipe.category];
              const craftable = canCraft(recipe, rawMaterials);
              return (
                <div
                  key={recipe.id}
                  className={clsx(
                    'border rounded px-3 py-2.5 flex items-center gap-3',
                    `bg-gradient-to-r ${catConf.gradient}`,
                    craftable ? catConf.accent : 'border-stone-800/50'
                  )}
                >
                  <span className="text-base opacity-50">{catConf.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-bold text-stone-300 uppercase">{recipe.name}</p>
                    <p className="text-[9px] text-stone-600 font-mono">{recipe.output}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex gap-1 flex-wrap justify-end mb-1">
                      {Object.entries(recipe.cost).map(([mat, val]) => {
                        const have = (rawMaterials as unknown as Record<string, number>)[mat] ?? 0;
                        const enough = have >= (val as number);
                        return (
                          <span
                            key={mat}
                            className={`text-[9px] font-mono ${enough ? 'text-stone-500' : 'text-red-800'}`}
                          >
                            {MAT_ICONS[mat]}{val as number}
                          </span>
                        );
                      })}
                    </div>
                    <span className={`text-[8px] font-mono uppercase ${craftable ? 'text-amber-700' : 'text-stone-700'}`}>
                      {craftable ? 'CRAFTABLE' : 'NEED MATS'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card categories */}
        {categoryOrder.map(cat => {
          const cards = grouped[cat];
          if (!cards || cards.length === 0) return null;
          const conf = CATEGORY_CONFIG[cat];

          return (
            <div key={cat} className="mt-5">
              <p className="text-[8px] text-stone-700 font-mono tracking-widest uppercase mb-2">
                {conf.icon} {conf.label} ({cards.length})
              </p>
              <div className="space-y-1.5">
                {cards.map(card => {
                  const hp = card.currentHealth ?? card.maxHealth ?? 100;
                  const maxHp = card.maxHealth ?? 100;
                  const hpPct = (hp / maxHp) * 100;

                  return (
                    <div
                      key={card.id}
                      className={clsx(
                        'border rounded px-3 py-2 flex items-center gap-3',
                        `bg-gradient-to-r ${conf.gradient}`,
                        card.exhausted ? 'border-stone-800/30 opacity-50' : conf.accent
                      )}
                    >
                      <span className="text-sm opacity-40">{conf.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono font-bold text-stone-300 truncate uppercase">{card.name}</p>
                        <p className="text-[9px] text-stone-600 font-mono capitalize">
                          {card.type === 'survivor' ? card.role : card.itemType ?? card.type}
                          {card.exhausted ? ` · ${card.recoveryTime}d recovery` : ''}
                          {card.assignment ? ` · ${card.assignment}` : ''}
                        </p>
                      </div>

                      {/* Survivor HP */}
                      {card.type === 'survivor' && (
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-0.5 bg-stone-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${hpPct > 60 ? 'bg-stone-500' : hpPct > 30 ? 'bg-amber-700' : 'bg-red-800'}`}
                              style={{ width: `${hpPct}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-stone-600 font-mono tabular-nums">{hp}</span>
                        </div>
                      )}

                      {/* Weapon ammo */}
                      {card.maxAmmo !== undefined && (
                        <div className="flex gap-0.5 items-center">
                          {Array.from({ length: Math.min(card.maxAmmo, 6) }).map((_, i) => (
                            <span
                              key={i}
                              className={`text-[8px] ${i < (card.ammo ?? card.maxAmmo ?? 0) ? 'text-red-700' : 'text-stone-800'}`}
                            >
                              ●
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Food value */}
                      {card.foodValue !== undefined && (
                        <span className="text-[10px] text-amber-700 font-mono">+{card.foodValue}◆</span>
                      )}

                      {/* Status badge */}
                      {card.exhausted && (
                        <span className="text-[8px] font-mono text-stone-700 border border-stone-800 px-1 py-0.5 rounded">
                          {card.recoveryTime}d
                        </span>
                      )}
                      {!card.exhausted && card.type !== 'survivor' && (
                        <span className="text-[8px] font-mono text-green-800">READY</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}
