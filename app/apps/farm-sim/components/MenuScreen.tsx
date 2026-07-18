'use client';

import { useState } from 'react';
import { Download, Play, Plus, Save, Sprout, Trash2 } from 'lucide-react';
import { SaveSlotInfo } from '../lib/types';
import { MANUAL_SLOTS } from '../lib/storage';
import { seasonForDay, dayOfSeason } from '../lib/engine/weather';

interface Props {
  hasSave: boolean;
  slots: SaveSlotInfo[];
  inGame: boolean;
  error?: string | null;
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
  error,
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
    <div
      className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-5 overflow-y-auto bg-[#102019] p-6 text-white"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-center">
        <Sprout size={38} strokeWidth={1.5} className="mx-auto text-[#d9b95f]" />
        <h1 className="mt-2 text-3xl font-bold">Farm Sim</h1>
        <p className="mt-1 text-sm text-[#86c98a]">Grow. Connect. Automate.</p>
      </div>

      {error ? <p className="w-full max-w-xs rounded-md border border-[#e88979]/40 bg-[#7f3028]/35 px-3 py-2 text-center text-xs font-semibold text-[#f5b4a7]" role="alert">{error}</p> : null}

      <div className="w-full max-w-xs space-y-2">
        {inGame && (
          <button
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[#d9b95f] py-3 font-bold text-[#17201d] hover:bg-[#efd47c]"
          >
            <Play size={16} fill="currentColor" /> Resume
          </button>
        )}
        {!inGame && hasSave && (
          <button
            onClick={onContinue}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[#d9b95f] py-3 font-bold text-[#17201d] hover:bg-[#efd47c]"
          >
            <Play size={16} fill="currentColor" /> Continue
          </button>
        )}

        {!showSeed ? (
          <button
            onClick={() => onNewGame(undefined)}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 py-3 font-semibold hover:bg-white/10"
          >
            <Plus size={16} /> New farm
          </button>
        ) : null}

        <button
          onClick={() => setShowSeed((s) => !s)}
          className="w-full rounded-md py-2 text-xs text-white/50 hover:bg-white/5 hover:text-white"
        >
          {showSeed ? 'Cancel custom seed' : 'New game with custom seed…'}
        </button>

        {showSeed && (
          <div className="flex gap-2">
            <input
              value={seedText}
              onChange={(e) => setSeedText(e.target.value)}
              placeholder="any word or number"
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[#d9b95f]"
            />
            <button onClick={start} className="rounded-md bg-[#d9b95f] px-4 font-bold text-[#17201d]">
              Go
            </button>
          </div>
        )}
      </div>

      {/* Save slots */}
      <div className="w-full max-w-xs space-y-2 mt-2">
        <div className="text-[10px] font-semibold uppercase text-[#86c98a]">Save slots</div>
        {MANUAL_SLOTS.map((slot) => {
          const info = slotMap.get(slot);
          return (
            <div key={slot} className="flex items-center gap-2 rounded-md border border-white/10 bg-black/20 p-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold">Slot {slot}</div>
                <div className="truncate text-[10px] text-white/40">{slotLabel(info)}</div>
              </div>
              {inGame && (
                <button
                  onClick={() => onSaveSlot(slot)}
                  title="Save"
                  aria-label={`Save to slot ${slot}`}
                  className="grid h-8 w-8 place-items-center rounded-md text-[#86c98a] hover:bg-white/10"
                >
                  <Save size={14} />
                </button>
              )}
              {info && (
                <>
                  <button
                    onClick={() => onLoadSlot(slot)}
                    title="Load"
                    aria-label={`Load slot ${slot}`}
                    className="grid h-8 w-8 place-items-center rounded-md text-[#75bde7] hover:bg-white/10"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    onClick={() => onDeleteSlot(slot)}
                    title="Delete"
                    aria-label={`Delete slot ${slot}`}
                    className="grid h-8 w-8 place-items-center rounded-md text-[#e88979] hover:bg-white/10"
                  >
                    <Trash2 size={14} />
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
