import { GameRecommendation } from '../lib/types';

type SeedRecommendation = Omit<GameRecommendation, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

const sampleDate = (daysFromNow: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
};

/** Sample-only Release Radar records. Relative dates keep countdowns useful over time. */
export function getBaselineReleaseRadar(): SeedRecommendation[] {
  const now = new Date().toISOString();
  return [
    {
      gameName: 'Pragmata',
      platform: 'PS5',
      genre: 'Action-Adventure',
      releaseDate: sampleDate(21),
      releaseDateCheckedAt: now,
      releaseDateSource: 'sample',
      aiReason: 'A focused sci-fi adventure that fits your taste for polished action and unusual worlds.',
      status: 'watching',
      isUpcoming: true,
      releaseWindow: 'this-month',
      hypeScore: 8,
      suggestedAt: now,
      respondedAt: now,
    },
    {
      gameName: '007 First Light',
      platform: 'PS5',
      genre: 'Action-Adventure',
      releaseDate: sampleDate(62),
      releaseDateCheckedAt: now,
      releaseDateSource: 'sample',
      aiReason: 'Cinematic stealth and action line up with the story-driven games you rate highly.',
      status: 'watching',
      isUpcoming: true,
      releaseWindow: 'next-few-months',
      hypeScore: 8,
      suggestedAt: now,
      respondedAt: now,
    },
    {
      gameName: 'Crimson Desert',
      platform: 'PS5',
      genre: 'Action RPG',
      releaseDate: sampleDate(14),
      releaseDateCheckedAt: now,
      releaseDateSource: 'sample',
      aiReason: 'Large-scale fantasy combat is a strong match for your time with Elden Ring and action RPGs.',
      status: 'suggested',
      isUpcoming: true,
      releaseWindow: 'this-month',
      hypeScore: 9,
      suggestedAt: now,
    },
    {
      gameName: 'The Blood of Dawnwalker',
      platform: 'PC',
      genre: 'RPG',
      releaseDate: sampleDate(75),
      releaseDateCheckedAt: now,
      releaseDateSource: 'sample',
      aiReason: 'Its dark choice-driven RPG structure overlaps with what you loved in Baldur’s Gate 3.',
      status: 'suggested',
      isUpcoming: true,
      releaseWindow: 'next-few-months',
      hypeScore: 8,
      suggestedAt: now,
    },
    {
      gameName: 'Intergalactic: The Heretic Prophet',
      platform: 'PS5',
      genre: 'Action-Adventure',
      releaseDateCheckedAt: now,
      releaseDateSource: 'sample',
      aiReason: 'A story-first adventure from a studio that matches your preference for cinematic games.',
      status: 'suggested',
      isUpcoming: true,
      releaseWindow: 'later',
      hypeScore: 7,
      suggestedAt: now,
    },
  ];
}
