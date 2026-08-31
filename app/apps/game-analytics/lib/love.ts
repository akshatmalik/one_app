import { Game, LoveLevel } from './types';

export const LOVE_LEVELS: Array<{
  level: LoveLevel;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  { level: 1, label: "Didn't connect", shortLabel: 'No spark', description: 'I can see what it was doing, but it never became mine.' },
  { level: 2, label: 'Liked it', shortLabel: 'Liked', description: 'I enjoyed it, without a strong personal attachment.' },
  { level: 3, label: 'Loved it', shortLabel: 'Loved', description: 'It stayed with me beyond the score.' },
  { level: 4, label: 'All-time love', shortLabel: 'All-time', description: 'A personal forever game, flaws and all.' },
];

/** Existing “Special” games become Loved until the player chooses a precise level. */
export function getEffectiveLoveLevel(game: Pick<Game, 'loveLevel' | 'isSpecial'>): LoveLevel | undefined {
  return game.loveLevel ?? (game.isSpecial ? 3 : undefined);
}

export function getLoveMeta(level: LoveLevel | undefined) {
  return LOVE_LEVELS.find(option => option.level === level);
}

export function isLovedGame(game: Pick<Game, 'loveLevel' | 'isSpecial'>): boolean {
  return (getEffectiveLoveLevel(game) ?? 0) >= 3;
}
