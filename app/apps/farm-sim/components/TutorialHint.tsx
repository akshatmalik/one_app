'use client';

import { GameState } from '../lib/types';

interface Props {
  state: GameState;
}

const HINTS = [
  '👆 Tap a grass tile, then Till it to prepare soil.',
  '🌱 Tap tilled soil and Plant your wheat seeds.',
  '💧 Tap a planted tile and Water it so it grows tonight.',
  '🌙 Press END DAY to let the night pass — crops grow while you sleep.',
  '💰 When a crop is ripe, Harvest it, then open Market to sell.',
];

// Show the hint for the current tutorial step. tutorialStep advances as the
// player performs each action (handled in page.tsx). -1 = finished.
export function TutorialHint({ state }: Props) {
  if (state.tutorialStep < 0 || state.tutorialStep >= HINTS.length) return null;
  return (
    <div className="mx-3 my-1 rounded-lg bg-yellow-500/90 text-yellow-950 text-xs font-semibold px-3 py-2 shadow">
      {HINTS[state.tutorialStep]}
    </div>
  );
}
