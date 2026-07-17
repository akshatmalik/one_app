'use client';

import { useState } from 'react';
import { CropId, GameState, PlayerAction, UpgradeId } from '../lib/types';
import { CROPS, CROP_IDS } from '../data/crops';
import { getPrice, previewPriceAfterSell } from '../lib/engine/market';
import { UPGRADES, AP_COST } from '../lib/balance';

interface Props {
  state: GameState;
  dispatch: (a: PlayerAction) => boolean;
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return <div className="w-16 h-5" />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 60;
      const y = 18 - ((v - min) / range) * 16;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const up = data[data.length - 1] >= data[0];
  return (
    <svg width="60" height="20" className="shrink-0">
      <polyline
        points={pts}
        fill="none"
        stroke={up ? '#34d399' : '#f87171'}
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function MarketPanel({ state, dispatch }: Props) {
  const [tab, setTab] = useState<'sell' | 'seeds' | 'shop'>('sell');
  const [sellCrop, setSellCrop] = useState<CropId | null>(null);
  const [qty, setQty] = useState(1);

  const tripUsed = state.marketVisitedToday || state.upgrades.includes('cart');

  return (
    <div className="bg-slate-800 rounded-t-xl p-3 max-h-[46vh] overflow-y-auto text-white">
      <div className="flex gap-1 mb-2">
        {(['sell', 'seeds', 'shop'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize ${
              tab === t ? 'bg-emerald-600' : 'bg-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {!tripUsed && tab === 'sell' && (
        <div className="text-[10px] text-amber-300/80 mb-1">
          First sale today costs {AP_COST.marketTrip}⚡ (a trip to town).
        </div>
      )}

      {/* ── SELL ── */}
      {tab === 'sell' && (
        <div className="space-y-1.5">
          {CROP_IDS.map((crop) => {
            const def = CROPS[crop];
            const price = getPrice(state, crop);
            const have = state.inventory[crop] ?? 0;
            const prev = def && state.market[crop].history.length >= 2
              ? state.market[crop].history[state.market[crop].history.length - 2]
              : price;
            const delta = price - prev;
            return (
              <div key={crop} className="rounded-lg bg-slate-900/60 p-2">
                <button
                  onClick={() => {
                    setSellCrop(sellCrop === crop ? null : crop);
                    setQty(Math.max(1, have));
                  }}
                  className="w-full flex items-center gap-2"
                >
                  <span className="text-lg">{def.emoji}</span>
                  <span className="text-sm font-semibold w-16 text-left">{def.name}</span>
                  <span className="text-sm tabular-nums">{price.toFixed(1)}g</span>
                  <span
                    className={`text-[10px] ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                  >
                    {delta >= 0 ? '▲' : '▼'}
                  </span>
                  <Sparkline data={state.market[crop].history} />
                  <span className="ml-auto text-xs text-slate-400">×{have}</span>
                </button>

                {sellCrop === crop && have > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={have}
                      value={Math.min(qty, have)}
                      onChange={(e) => setQty(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs w-8 tabular-nums">{Math.min(qty, have)}</span>
                    <button
                      onClick={() => {
                        if (dispatch({ type: 'sell', crop, qty: Math.min(qty, have) })) {
                          setSellCrop(null);
                        }
                      }}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold"
                    >
                      Sell +{Math.round(price * Math.min(qty, have))}g
                    </button>
                  </div>
                )}
                {sellCrop === crop && have > 0 && (
                  <div className="mt-1 text-[10px] text-amber-300/70">
                    After selling {Math.min(qty, have)}: price drops to{' '}
                    {previewPriceAfterSell(state, crop, Math.min(qty, have)).toFixed(1)}g
                  </div>
                )}
                {sellCrop === crop && have === 0 && (
                  <div className="mt-1 text-[10px] text-slate-500">Nothing to sell.</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── SEEDS ── */}
      {tab === 'seeds' && (
        <div className="grid grid-cols-2 gap-2">
          {CROP_IDS.map((crop) => {
            const def = CROPS[crop];
            return (
              <div key={crop} className="rounded-lg bg-slate-900/60 p-2 flex items-center gap-2">
                <span className="text-lg">{def.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{def.name}</div>
                  <div className="text-[10px] text-slate-400">
                    {def.seedCost}g · have {state.seeds[crop] ?? 0}
                  </div>
                </div>
                <button
                  onClick={() => dispatch({ type: 'buySeeds', crop, qty: 1 })}
                  disabled={state.gold < def.seedCost}
                  className="rounded bg-emerald-600 px-2 py-1 text-xs font-bold disabled:opacity-40"
                >
                  +1
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── SHOP (upgrades) ── */}
      {tab === 'shop' && (
        <div className="space-y-2">
          {(Object.keys(UPGRADES) as UpgradeId[]).map((id) => {
            const u = UPGRADES[id];
            const owned = state.upgrades.includes(id);
            return (
              <div key={id} className="rounded-lg bg-slate-900/60 p-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold">{u.name}</div>
                  <div className="text-[10px] text-slate-400">{u.effect}</div>
                </div>
                <button
                  onClick={() => dispatch({ type: 'buyUpgrade', upgrade: id })}
                  disabled={owned || state.gold < u.cost}
                  className="rounded bg-purple-600 px-2 py-1 text-xs font-bold disabled:opacity-40 shrink-0"
                >
                  {owned ? 'Owned' : `${u.cost}g`}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
