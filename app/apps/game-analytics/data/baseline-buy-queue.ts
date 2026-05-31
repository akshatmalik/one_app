import { PurchaseQueueEntry } from '../lib/types';

type SeedEntry = Omit<PurchaseQueueEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

const today = new Date();
const iso = (d: Date) => d.toISOString();
const day = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

/**
 * Sample Buy Queue entries for testing the budget + pricing tools.
 *
 * Deliberately spread across every dimension the redesigned tab cares about:
 *  - Dates: upcoming (various distances), released/available-now, and TBA (no date)
 *  - Price gap: MSRP well above target so the Full vs Deal price toggle moves
 *  - Price history: multi-point drops so the sparkline + "best yet" render
 *  - A deal already at target (fires the deal alert)
 *  - Maybe / Deferred buckets (excluded from the budget plan)
 *  - Bought items with real savings so the Bought view has a spend story
 */
export const BASELINE_BUY_QUEUE: SeedEntry[] = [
  // ── Committed, DATED, upcoming ──────────────────────────────
  {
    gameName: 'Grand Theft Auto VI',
    platform: 'PlayStation',
    genre: 'Action',
    releaseDate: day(112),
    isDayOneBuy: true,
    msrpEstimate: 80,
    targetPrice: 80,
    currentPrice: 80,
    notes: 'Day-one, no waiting on this one.',
    priority: 1,
    purchased: false,
    intent: 'committed',
    addedAt: iso(today),
  },
  {
    gameName: 'Death Stranding 2: On the Beach',
    platform: 'PlayStation',
    genre: 'Action',
    releaseDate: day(34),
    isDayOneBuy: false,
    msrpEstimate: 70,
    targetPrice: 50,
    currentPrice: 70,
    priority: 2,
    purchased: false,
    intent: 'committed',
    addedAt: iso(today),
  },

  // ── Committed, DATED, released / available now (with price history) ──
  {
    gameName: 'Monster Hunter Wilds',
    platform: 'PlayStation',
    genre: 'RPG',
    releaseDate: day(-92),
    isDayOneBuy: false,
    msrpEstimate: 70,
    targetPrice: 50,
    currentPrice: 60,
    priceHistory: [
      { date: day(-60), price: 70 },
      { date: day(-25), price: 65 },
      { date: day(-3), price: 60 },
    ],
    priority: 3,
    purchased: false,
    intent: 'committed',
    addedAt: iso(today),
  },
  {
    gameName: 'Civilization VII',
    platform: 'Steam',
    genre: 'Strategy',
    releaseDate: day(-124),
    isDayOneBuy: false,
    msrpEstimate: 70,
    targetPrice: 40,
    currentPrice: 50,
    priceHistory: [
      { date: day(-90), price: 70 },
      { date: day(-40), price: 60 },
      { date: day(-10), price: 50 },
    ],
    notes: 'Wait for the first real sale.',
    priority: 4,
    purchased: false,
    intent: 'committed',
    addedAt: iso(today),
  },

  // ── Committed, NO DATE (TBA) ────────────────────────────────
  {
    gameName: 'Hades II',
    platform: 'Steam',
    genre: 'Roguelike',
    isDayOneBuy: false,
    msrpEstimate: 30,
    targetPrice: 25,
    currentPrice: 30,
    priority: 5,
    purchased: false,
    intent: 'committed',
    addedAt: iso(today),
  },

  // ── Maybe — soft interest, excluded from the budget plan ────
  {
    gameName: 'Elden Ring: Nightreign',
    platform: 'Steam',
    genre: 'RPG',
    releaseDate: day(-12),
    isDayOneBuy: false,
    msrpEstimate: 40,
    targetPrice: 30,
    currentPrice: 40,
    priority: 6,
    purchased: false,
    intent: 'maybe',
    addedAt: iso(today),
  },
  {
    gameName: 'Ghost of Yotei',
    platform: 'PlayStation',
    genre: 'Action',
    releaseDate: day(78),
    isDayOneBuy: false,
    msrpEstimate: 70,
    targetPrice: 45,
    priority: 7,
    purchased: false,
    intent: 'maybe',
    addedAt: iso(today),
  },

  // ── Deferred — waiting for a discount (home of deal alerts) ──
  {
    gameName: 'Metaphor: ReFantazio',
    platform: 'Xbox',
    genre: 'RPG',
    releaseDate: day(-205),
    isDayOneBuy: false,
    msrpEstimate: 70,
    targetPrice: 35,
    currentPrice: 35, // at target → fires the deal alert
    priceHistory: [
      { date: day(-60), price: 55 },
      { date: day(-30), price: 50 },
      { date: day(-7), price: 42 },
      { date: day(0), price: 35 },
    ],
    priority: 8,
    purchased: false,
    intent: 'deferred',
    addedAt: iso(today),
  },
  {
    gameName: 'Star Wars Outlaws',
    platform: 'PlayStation',
    genre: 'Action',
    releaseDate: day(-265),
    isDayOneBuy: false,
    msrpEstimate: 70,
    targetPrice: 25,
    currentPrice: 30,
    priceHistory: [
      { date: day(-120), price: 70 },
      { date: day(-60), price: 45 },
      { date: day(-5), price: 30 },
    ],
    priority: 9,
    purchased: false,
    intent: 'deferred',
    addedAt: iso(today),
  },

  // ── Already bought from the queue — populates the Bought view ──
  {
    gameName: 'Astro Bot',
    platform: 'PlayStation',
    genre: 'Platformer',
    releaseDate: day(-150),
    isDayOneBuy: false,
    msrpEstimate: 60,
    targetPrice: 40,
    currentPrice: 40,
    priority: 10,
    purchased: true,
    purchasedAt: day(-45),
    purchasePrice: 40,
    intent: 'committed',
    addedAt: day(-80),
  },
  {
    gameName: "Baldur's Gate 3",
    platform: 'Steam',
    genre: 'RPG',
    releaseDate: day(-300),
    isDayOneBuy: false,
    msrpEstimate: 60,
    targetPrice: 50,
    currentPrice: 50,
    priority: 11,
    purchased: true,
    purchasedAt: day(-120),
    purchasePrice: 48,
    intent: 'committed',
    addedAt: day(-160),
  },
];
