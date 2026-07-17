'use client';

import { useState } from 'react';
import { SaveSlotInfo } from '../lib/types';
import { AUTOSAVE_SLOT, MANUAL_SLOTS } from '../lib/storage';
import { seasonForDay, dayOfSeason } from '../lib/engine/weather';

interface Props {
  hasSave: boolean;
  slots: SaveSlotInfo[];
  inGame: boolean;
  onNewGame: (seed?: number) => void;
  onContinue: () => void;
  onLoadSlot: (slot: number) => void;
  onSaveSlot: (slot: number) => void;
  onDeleteSlot: (slot: number) => void;
  onClose: () => void;
}

function slotLabel(info?: SaveSlotInfo): string {
  if (!info) return 'empty';
  return `${seasonForDay(info.day)} · Day ${dayOfSeason(info.day) + 1} · 💰${Math.round(info.gold)}`;
}

export function MenuScreen({
  hasSave,
  slots,
  inGame,
  onNewGame,
  onContinue,
  onLoadSlot,
  onSaveSlot,
  onDeleteSlot,
  onClose,
}: Props) {
  const [showSeed, setShowSeed] = useState(false);
  const [seedText, setSeedText] = useState('');
  const slotMap = new Map(slots.map((s) => [s.slot, s]));

  const start = () => {
    const trimmed = seedText.trim();
    const seed = trimmed ? Math.abs(hashText(trimmed)) : undefined;
    onNewGame(seed);
  };

  return (
    <div className="fixed inset-0 z-40 bg-emerald-950 text-white flex flex-col items-center justify-center p-6 gap-4 overflow-y-auto">
      <div className="text-center">
        <div className="text-5xl">🌾</div>
        <h1 className="text-2xl font-bold mt-2">Farm Sim</h1>
        <p className="text-emerald-300/70 text-sm">A turn-based farming optimization puzzle</p>
      </div>

      <div className="w-full max-w-xs space-y-2">
        {inGame && (
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-emerald-600 py-3 font-bold"
          >
            ▸ Resume
          </button>
        )}
        {!inGame && hasSave && (
          <button
            onClick={onContinue}
            className="w-full rounded-lg bg-emerald-600 py-3 font-bold"
          >
            ▸ Continue
          </button>
        )}

        {!showSeed ? (
          <button
            onClick={() => onNewGame(undefined)}
            className="w-full rounded-lg bg-emerald-800 py-3 font-semibold"
          >
            + New Game
          </button>
        ) : null}

        <button
          onClick={() => setShowSeed((s) => !s)}
          className="w-full rounded-lg bg-slate-700 py-2 text-xs"
        >
          {showSeed ? 'Cancel custom seed' : 'New game with custom seed…'}
        </button>

        {showSeed && (
          <div className="flex gap-2">
            <input
              value={seedText}
              onChange={(e) => setSeedText(e.target.value)}
              placeholder="any word or number"
              className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm"
            />
            <button onClick={start} className="rounded-lg bg-emerald-600 px-4 font-bold">
              Go
            </button>
          </div>
        )}
      </div>

      {/* Save slots */}
      <div className="w-full max-w-xs space-y-2 mt-2">
        <div className="text-xs text-emerald-300/60">Save slots</div>
        {MANUAL_SLOTS.map((slot) => {
          const info = slotMap.get(slot);
          return (
            <div key={slot} className="flex items-center gap-2 rounded-lg bg-slate-800 p-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold">Slot {slot}</div>
                <div className="text-[10px] text-slate-400 truncate">{slotLabel(info)}</div>
              </div>
              {inGame && (
                <button
                  onClick={() => onSaveSlot(slot)}
                  className="rounded bg-emerald-700 px-2 py-1 text-[10px] font-bold"
                >
                  Save
                </button>
              )}
              {info && (
                <>
                  <button
                    onClick={() => onLoadSlot(slot)}
                    className="rounded bg-sky-700 px-2 py-1 text-[10px] font-bold"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => onDeleteSlot(slot)}
                    className="rounded bg-red-800 px-2 py-1 text-[10px] font-bold"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Small stable string hash for seed words.
function hashText(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
