'use client';

import { Check, Clock3, Coins, LockKeyhole, Star } from 'lucide-react';
import { CROPS } from '../data/crops';
import { REPUTATION_UNLOCKS } from '../lib/engine/contracts';
import { GameState, PlayerAction } from '../lib/types';

interface Props {
  state: GameState;
  dispatch: (action: PlayerAction) => boolean;
}

export function ContractBoard({ state, dispatch }: Props) {
  const nextUnlock = REPUTATION_UNLOCKS.find((unlock) => state.reputation < unlock.reputation);
  const previousThreshold = [...REPUTATION_UNLOCKS]
    .reverse()
    .find((unlock) => unlock.reputation <= state.reputation)?.reputation ?? 0;
  const progress = nextUnlock
    ? ((state.reputation - previousThreshold) / (nextUnlock.reputation - previousThreshold)) * 100
    : 100;

  return (
    <div className="space-y-3">
      <section className="border-b border-white/10 pb-3">
        <div className="mb-2 flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase text-[#d9b95f]">Farm reputation</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-lg font-bold"><Star size={17} /> {state.reputation}</div>
          </div>
          {nextUnlock ? (
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 text-xs font-semibold"><LockKeyhole size={12} /> {nextUnlock.name}</div>
              <div className="text-[10px] text-white/45">{nextUnlock.reputation - state.reputation} reputation to unlock</div>
            </div>
          ) : <div className="text-xs text-[#86c98a]">All systems unlocked</div>}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-black/35">
          <div className="h-full rounded-full bg-[#d9b95f] transition-[width]" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </div>
      </section>

      <div className="space-y-2">
        {state.contracts.map((contract) => {
          const crop = CROPS[contract.crop];
          const have = state.inventory[contract.crop] ?? 0;
          const complete = contract.status === 'completed';
          const canDeliver = !complete && have >= contract.quantity;
          const inventoryProgress = Math.min(100, (have / contract.quantity) * 100);
          return (
            <article key={contract.id} className={`rounded-md border p-3 ${complete ? 'border-[#86c98a]/35 bg-[#86c98a]/10' : 'border-white/10 bg-black/20'}`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl leading-none">{crop.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold">{contract.quantity} {crop.name}</h3>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-white/45">
                        <span className="flex items-center gap-1"><Clock3 size={11} /> {Math.max(0, contract.expiresDay - state.day + 1)} days</span>
                        <span className="flex items-center gap-1"><Coins size={11} /> {contract.rewardGold}</span>
                        <span className="flex items-center gap-1"><Star size={11} /> +{contract.rewardReputation}</span>
                      </div>
                    </div>
                    {complete ? <Check size={18} className="text-[#86c98a]" /> : null}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-black/35">
                      <div className="h-full rounded-full bg-[#86c98a]" style={{ width: `${inventoryProgress}%` }} />
                    </div>
                    <span className="w-12 text-right text-[10px] tabular-nums text-white/55">{Math.min(have, contract.quantity)}/{contract.quantity}</span>
                  </div>
                </div>
              </div>
              {!complete ? (
                <button
                  type="button"
                  disabled={!canDeliver}
                  onClick={() => dispatch({ type: 'deliverContract', contractId: contract.id })}
                  className="mt-3 w-full rounded-md bg-[#d9b95f] px-3 py-2 text-xs font-bold text-[#17201d] hover:bg-[#efd47c] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
                >
                  {canDeliver ? 'Deliver order' : `${contract.quantity - have} more needed`}
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
