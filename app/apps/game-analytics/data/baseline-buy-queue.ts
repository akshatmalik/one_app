import { PurchaseQueueEntry } from '../lib/types';

type SeedEntry = Omit<PurchaseQueueEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

const today = new Date();
const iso = (d: Date) => d.toISOString();
const daysFromNow = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

/**
 * Sample Buy Queue entries for testing the budget tools.
 *
 * Designed to exercise every scenario in the redesigned Buy Queue tab:
 *  - Full price vs. deal price gap (msrpEstimate > targetPrice)
 *  - "How many fit" overflow once committed picks exceed the budget
 *  - Maybe / Deferred buckets (excluded from the budget plan)
 *  - A deal already at target price (triggers the deal alert)
 *  - A purchased item so the "Bought" view has savings to show
 */
export const BASELINE_BUY_QUEUE: SeedEntry[] = [
  // ── Watching (committed) — these count toward the budget plan ──
  {
    gameName: 'Grand Theft Auto VI',
    platform: 'PlayStation',
    genre: 'Action',
    releaseDate: daysFromNow(110),
    isDayOneBuy: true,
    msrpEstimate: 70,
    targetPrice: 70,
    currentPrice: 70,
    notes: 'Day-one, no waiting on this one.',
    priority: 1,
    purchased: false,
    intent: 'committed',
    addedAt: iso(today),
  },
  {
    gameName: 'Monster Hunter Wilds',
    platform: 'PlayStation',
    genre: 'RPG',
    releaseDate: daysFromNow(-90),
    isDayOneBuy: false,
    msrpEstimate: 70,
    targetPrice: 50,
    currentPrice: 60,
    priority: 2,
    purchased: false,
    intent: 'committed',
    addedAt: iso(today),
  },
  {
    gameName: 'Civilization VII',
    platform: 'Steam',
    genre: 'Strategy',
    releaseDate: daysFromNow(-120),
    isDayOneBuy: false,
    msrpEstimate: 70,
    targetPrice: 40,
    currentPrice: 55,
    notes: 'Wait for the first proper sale.',
    priority: 3,
    purchased: false,
    intent: 'committed',
    addedAt: iso(today),
  },
  {
    gameName: 'Hollow Knight: Silksong',
    platform: 'Nintendo',
    genre: 'Metroidvania',
    releaseDate: daysFromNow(-30),
    isDayOneBuy: false,
    msrpEstimate: 30,
    targetPrice: 20,
    currentPrice: 30,
    priority: 4,
    purchased: false,
    intent: 'committed',
    addedAt: iso(today),
  },

  // ── Maybe — soft interest, excluded from the budget plan ──
  {
    gameName: 'Death Stranding 2: On the Beach',
    platform: 'PlayStation',
    genre: 'Action',
    releaseDate: daysFromNow(40),
    isDayOneBuy: false,
    msrpEstimate: 70,
    targetPrice: 50,
    priority: 5,
    purchased: false,
    intent: 'maybe',
    addedAt: iso(today),
  },
  {
    gameName: 'Elden Ring: Nightreign',
    platform: 'Steam',
    genre: 'RPG',
    releaseDate: daysFromNow(-10),
    isDayOneBuy: false,
    msrpEstimate: 40,
    targetPrice: 30,
    currentPrice: 40,
    priority: 6,
    purchased: false,
    intent: 'maybe',
    addedAt: iso(today),
  },

  // ── Deferred — waiting for a discount (home of deal alerts) ──
  {
    gameName: 'Metaphor: ReFantazio',
    platform: 'Xbox',
    genre: 'RPG',
    releaseDate: daysFromNow(-200),
    isDayOneBuy: false,
    msrpEstimate: 70,
    targetPrice: 35,
    currentPrice: 35, // at target → fires the deal alert
    priceHistory: [
      { date: daysFromNow(-30), price: 50 },
      { date: daysFromNow(-7), price: 42 },
      { date: daysFromNow(0), price: 35 },
    ],
    priority: 7,
    purchased: false,
    intent: 'deferred',
    addedAt: iso(today),
  },
  {
    gameName: 'Star Wars Outlaws',
    platform: 'PlayStation',
    genre: 'Action',
    releaseDate: daysFromNow(-260),
    isDayOneBuy: false,
    msrpEstimate: 70,
    targetPrice: 25,
    currentPrice: 30,
    priority: 8,
    purchased: false,
    intent: 'deferred',
    addedAt: iso(today),
  },

  // ── Already bought from the queue — populates the "Bought" view ──
  {
    gameName: 'Astro Bot',
    platform: 'PlayStation',
    genre: 'Platformer',
    releaseDate: daysFromNow(-150),
    isDayOneBuy: false,
    msrpEstimate: 60,
    targetPrice: 40,
    currentPrice: 40,
    priority: 9,
    purchased: true,
    purchasedAt: daysFromNow(-45),
    purchasePrice: 40,
    intent: 'committed',
    addedAt: daysFromNow(-80),
  },
];
