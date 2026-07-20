import { CROPS } from '../../data/crops';
import { CropId, FarmContract, GameState, UnlockId, UpgradeId } from '../types';
import { streamRng } from './rng';
import { seasonForDay } from './weather';

export const REPUTATION_UNLOCKS: ReadonlyArray<{
  id: UnlockId;
  reputation: number;
  name: string;
  description: string;
}> = [
  { id: 'irrigation', reputation: 4, name: 'Irrigation', description: 'Channels, wells, and sprinklers' },
  { id: 'mechanization', reputation: 8, name: 'Mechanization', description: 'Tractor field work' },
  { id: 'precisionPlanting', reputation: 16, name: 'Precision planting', description: 'Seeder field work' },
  { id: 'logistics', reputation: 26, name: 'Farm logistics', description: 'Truck deliveries' },
];

const UPGRADE_UNLOCK: Partial<Record<UpgradeId, UnlockId>> = {
  tractor: 'mechanization',
  seeder: 'precisionPlanting',
  truck: 'logistics',
};

export function requiredUnlockForUpgrade(upgrade: UpgradeId): UnlockId | null {
  return UPGRADE_UNLOCK[upgrade] ?? null;
}

export function unlocksForReputation(reputation: number): UnlockId[] {
  return REPUTATION_UNLOCKS.filter((unlock) => reputation >= unlock.reputation).map(
    (unlock) => unlock.id
  );
}

export function createContractOffers(
  seed: number,
  day: number,
  reputation: number,
  count: number
): FarmContract[] {
  const rng = streamRng(seed, day, 'contracts');
  const season = seasonForDay(day);
  const supplierCrops: CropId[] = reputation < 4
    ? ['wheat', 'potato']
    : reputation < 8
      ? ['wheat', 'potato', 'carrot', 'beans']
      : reputation < 16
        ? ['wheat', 'potato', 'carrot', 'beans', 'corn', 'rice']
        : Object.keys(CROPS) as CropId[];
  const crops = supplierCrops.filter((crop) =>
    CROPS[crop].seasons.includes(season)
  );

  for (let i = crops.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [crops[i], crops[j]] = [crops[j], crops[i]];
  }

  const tier = Math.floor(reputation / 10);
  return Array.from({ length: count }, (_, index) => {
    const crop = crops[index % crops.length];
    const quantity = 4 + tier * 2 + Math.floor(rng() * 4);
    const premium = 1.65 + rng() * 0.25;
    return {
      id: `contract-${day}-${index}-${crop}`,
      crop,
      quantity,
      rewardGold: Math.round(quantity * CROPS[crop].basePrice * premium + 15),
      rewardReputation: 2 + Math.floor(rng() * 2),
      offeredDay: day,
      expiresDay: day + Math.max(6, CROPS[crop].growDays + 2),
      status: 'available' as const,
    };
  });
}

export function refreshContracts(state: GameState): FarmContract[] {
  const active = state.contracts.filter(
    (contract) => contract.status === 'available' && contract.expiresDay >= state.day
  );
  if (active.length >= 3) return active.slice(0, 3);

  return [
    ...active,
    ...createContractOffers(state.seed, state.day, state.reputation, 3 - active.length),
  ].slice(0, 3);
}
