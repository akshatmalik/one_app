/**
 * Trophy System — 100 Data-Driven Trophies
 *
 * 9 categories, 4-tier progression (Bronze → Silver → Gold → Platinum),
 * plus 10 one-time milestone trophies worth 50pts each.
 *
 * Trophy Score: Bronze = 10pts, Silver = 25pts, Gold = 50pts, Platinum = 100pts
 */

export type TrophyTierLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

export type TrophyCategory =
  | 'grind'
  | 'money'
  | 'finisher'
  | 'explorer'
  | 'critic'
  | 'personality'
  | 'first'
  | 'legend'
  | 'secret';

export const TROPHY_CATEGORY_LABELS: Record<TrophyCategory, string> = {
  grind: 'The Grind',
  money: 'Money Moves',
  finisher: 'The Finisher',
  explorer: 'The Explorer',
  critic: 'The Critic',
  personality: 'The Personality',
  first: 'First Blood',
  legend: 'The Legend',
  secret: 'Secret Trophies',
};

export const TROPHY_CATEGORY_ICONS: Record<TrophyCategory, string> = {
  grind: '⚙️',
  money: '💰',
  finisher: '✅',
  explorer: '🌍',
  critic: '⭐',
  personality: '🎭',
  first: '🩸',
  legend: '👑',
  secret: '❓',
};

export interface TrophyTierThreshold {
  tier: TrophyTierLevel;
  threshold: number;
  label: string;
}

export interface TrophyDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: TrophyCategory;
  isMilestone: boolean;     // One-time (no tiers) — worth 50pts
  isSecret: boolean;        // Hidden until earned
  tiers?: TrophyTierThreshold[];  // Only for non-milestone trophies
}

export const TIER_POINTS: Record<TrophyTierLevel, number> = {
  bronze: 10,
  silver: 25,
  gold: 50,
  platinum: 100,
};

export const MILESTONE_POINTS = 50;

export const TIER_ORDER: TrophyTierLevel[] = ['bronze', 'silver', 'gold', 'platinum'];

// ────────────────────────────────────────────────────────────────
// Trophy Definitions — 100 Total
// ────────────────────────────────────────────────────────────────

export const TROPHY_DEFINITIONS: TrophyDefinition[] = [

  // ═══════════════════════════════════════════════════════════════
  // CATEGORY 1: THE GRIND (Time & Dedication) — 12 Trophies
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'century-club', name: 'Century Club', icon: '💯',
    description: 'One game, one hundred hours',
    category: 'grind', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 50, label: '50h on 1 game' },
      { tier: 'silver', threshold: 100, label: '100h on 1 game' },
      { tier: 'gold', threshold: 200, label: '200h on 1 game' },
      { tier: 'platinum', threshold: 500, label: '500h on 1 game' },
    ],
  },
  {
    id: 'iron-lungs', name: 'Iron Lungs', icon: '🫁',
    description: 'Longest single session without stopping',
    category: 'grind', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 4, label: '4h session' },
      { tier: 'silver', threshold: 6, label: '6h session' },
      { tier: 'gold', threshold: 8, label: '8h session' },
      { tier: 'platinum', threshold: 12, label: '12h+ session' },
    ],
  },
  {
    id: 'the-streak', name: 'The Streak', icon: '🔥',
    description: 'Consecutive days with a play session',
    category: 'grind', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 7, label: '7-day streak' },
      { tier: 'silver', threshold: 14, label: '14-day streak' },
      { tier: 'gold', threshold: 30, label: '30-day streak' },
      { tier: 'platinum', threshold: 60, label: '60-day streak' },
    ],
  },
  {
    id: 'the-thousand', name: 'The Thousand', icon: '1️⃣',
    description: 'Total lifetime gaming hours',
    category: 'grind', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 250, label: '250 hours' },
      { tier: 'silver', threshold: 500, label: '500 hours' },
      { tier: 'gold', threshold: 1000, label: '1,000 hours' },
      { tier: 'platinum', threshold: 2500, label: '2,500 hours' },
    ],
  },
  {
    id: 'daily-ritual', name: 'Daily Ritual', icon: '📅',
    description: 'Most days with a session in a single month',
    category: 'grind', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 15, label: '15 days in a month' },
      { tier: 'silver', threshold: 20, label: '20 days' },
      { tier: 'gold', threshold: 25, label: '25 days' },
      { tier: 'platinum', threshold: 28, label: 'Every day' },
    ],
  },
  {
    id: 'weekend-warrior', name: 'Weekend Warrior', icon: '🛡️',
    description: 'Percentage of hours on Saturday + Sunday',
    category: 'grind', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 60, label: '60% weekend' },
      { tier: 'silver', threshold: 70, label: '70% weekend' },
      { tier: 'gold', threshold: 80, label: '80% weekend' },
      { tier: 'platinum', threshold: 90, label: '90%+ weekend' },
    ],
  },
  {
    id: 'comeback-kid', name: 'The Comeback Kid', icon: '🪃',
    description: 'Return to a game after a long gap and play 5+ more hours',
    category: 'grind', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 30, label: '30-day gap' },
      { tier: 'silver', threshold: 60, label: '60-day gap' },
      { tier: 'gold', threshold: 90, label: '90-day gap' },
      { tier: 'platinum', threshold: 180, label: '180-day gap' },
    ],
  },
  {
    id: 'marathon-month', name: 'Marathon Month', icon: '🏔️',
    description: 'Total hours in a single calendar month',
    category: 'grind', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 30, label: '30h in a month' },
      { tier: 'silver', threshold: 50, label: '50h in a month' },
      { tier: 'gold', threshold: 80, label: '80h in a month' },
      { tier: 'platinum', threshold: 120, label: '120h+ in a month' },
    ],
  },
  {
    id: 'the-binger', name: 'The Binger', icon: '🍿',
    description: 'Hours on a single game in a single day',
    category: 'grind', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 4, label: '4h in one day' },
      { tier: 'silver', threshold: 6, label: '6h in one day' },
      { tier: 'gold', threshold: 8, label: '8h in one day' },
      { tier: 'platinum', threshold: 12, label: '12h+ in one day' },
    ],
  },
  {
    id: 'slow-burn', name: 'Slow Burn', icon: '🕯️',
    description: 'Play a single game across a long timespan',
    category: 'grind', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 60, label: '60-day span' },
      { tier: 'silver', threshold: 120, label: '120-day span' },
      { tier: 'gold', threshold: 180, label: '180-day span' },
      { tier: 'platinum', threshold: 365, label: '365+ day span' },
    ],
  },
  {
    id: 'monthly-regular', name: 'Monthly Regular', icon: '📆',
    description: 'Log at least one session every month consecutively',
    category: 'grind', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 3, label: '3 months' },
      { tier: 'silver', threshold: 6, label: '6 months' },
      { tier: 'gold', threshold: 9, label: '9 months' },
      { tier: 'platinum', threshold: 12, label: '12 months' },
    ],
  },
  {
    id: 'the-grinder', name: 'The Grinder', icon: '⚙️',
    description: 'Total play sessions logged across all games',
    category: 'grind', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 50, label: '50 sessions' },
      { tier: 'silver', threshold: 150, label: '150 sessions' },
      { tier: 'gold', threshold: 400, label: '400 sessions' },
      { tier: 'platinum', threshold: 1000, label: '1,000 sessions' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // CATEGORY 2: MONEY MOVES (Spending & Value) — 12 Trophies
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'bargain-bin-king', name: 'Bargain Bin King', icon: '🏷️',
    description: 'Games acquired under $10',
    category: 'money', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 5, label: '5 games' },
      { tier: 'silver', threshold: 10, label: '10 games' },
      { tier: 'gold', threshold: 20, label: '20 games' },
      { tier: 'platinum', threshold: 50, label: '50 games' },
    ],
  },
  {
    id: 'penny-pincher', name: 'Penny Pincher', icon: '🪙',
    description: 'Average cost-per-hour across entire library',
    category: 'money', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 3, label: '<$3/hr' },
      { tier: 'silver', threshold: 2, label: '<$2/hr' },
      { tier: 'gold', threshold: 1, label: '<$1/hr' },
      { tier: 'platinum', threshold: 0.5, label: '<$0.50/hr' },
    ],
  },
  {
    id: 'big-spender', name: 'Big Spender', icon: '💰',
    description: 'Total lifetime spend on games',
    category: 'money', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 250, label: '$250' },
      { tier: 'silver', threshold: 500, label: '$500' },
      { tier: 'gold', threshold: 1000, label: '$1,000' },
      { tier: 'platinum', threshold: 2500, label: '$2,500' },
    ],
  },
  {
    id: 'the-freeloader', name: 'The Freeloader', icon: '🎁',
    description: 'Free or subscription-acquired games in library',
    category: 'money', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 5, label: '5 free' },
      { tier: 'silver', threshold: 10, label: '10 free' },
      { tier: 'gold', threshold: 20, label: '20 free' },
      { tier: 'platinum', threshold: 50, label: '50 free' },
    ],
  },
  {
    id: 'discount-sniper', name: 'Discount Sniper', icon: '🎯',
    description: 'Games bought at 50%+ discount',
    category: 'money', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 3, label: '3 games' },
      { tier: 'silver', threshold: 8, label: '8 games' },
      { tier: 'gold', threshold: 15, label: '15 games' },
      { tier: 'platinum', threshold: 30, label: '30 games' },
    ],
  },
  {
    id: 'budget-master', name: 'Budget Master', icon: '📋',
    description: 'Months where spending stayed under budget pace',
    category: 'money', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 3, label: '3 months' },
      { tier: 'silver', threshold: 6, label: '6 months' },
      { tier: 'gold', threshold: 9, label: '9 months' },
      { tier: 'platinum', threshold: 12, label: '12 months' },
    ],
  },
  {
    id: 'the-investor', name: 'The Investor', icon: '📈',
    description: 'Games where value rating is "Excellent" (<$1/hr)',
    category: 'money', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 3, label: '3 games' },
      { tier: 'silver', threshold: 8, label: '8 games' },
      { tier: 'gold', threshold: 15, label: '15 games' },
      { tier: 'platinum', threshold: 30, label: '30 games' },
    ],
  },
  {
    id: 'value-flipper', name: 'Value Flipper', icon: '🔄',
    description: 'Games that went from Poor to Excellent value through play',
    category: 'money', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 game' },
      { tier: 'silver', threshold: 3, label: '3 games' },
      { tier: 'gold', threshold: 5, label: '5 games' },
      { tier: 'platinum', threshold: 10, label: '10 games' },
    ],
  },
  {
    id: 'full-price-supporter', name: 'Full Price Supporter', icon: '🫡',
    description: 'Games bought at full price (no discount)',
    category: 'money', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 5, label: '5 games' },
      { tier: 'silver', threshold: 10, label: '10 games' },
      { tier: 'gold', threshold: 20, label: '20 games' },
      { tier: 'platinum', threshold: 40, label: '40 games' },
    ],
  },
  {
    id: 'cost-conscious', name: 'Cost Conscious', icon: '🧮',
    description: 'Average purchase price across library stays low',
    category: 'money', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 30, label: '<$30 avg' },
      { tier: 'silver', threshold: 25, label: '<$25 avg' },
      { tier: 'gold', threshold: 20, label: '<$20 avg' },
      { tier: 'platinum', threshold: 15, label: '<$15 avg' },
    ],
  },
  {
    id: 'the-whale', name: 'The Whale', icon: '🐳',
    description: 'Single most expensive game purchase',
    category: 'money', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 60, label: '$60+ game' },
      { tier: 'silver', threshold: 80, label: '$80+ game' },
      { tier: 'gold', threshold: 100, label: '$100+ game' },
      { tier: 'platinum', threshold: 150, label: '$150+ game' },
    ],
  },
  {
    id: 'budget-warrior', name: 'Budget Warrior', icon: '⚔️',
    description: 'Total hours achieved while keeping total spend low',
    category: 'money', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 250, label: '250h under $500' },
      { tier: 'silver', threshold: 500, label: '500h under $500' },
      { tier: 'gold', threshold: 750, label: '750h under $400' },
      { tier: 'platinum', threshold: 1000, label: '1000h under $350' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // CATEGORY 3: THE FINISHER (Completion & Progress) — 12 Trophies
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'completionist', name: 'Completionist', icon: '✅',
    description: 'Total games completed',
    category: 'finisher', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 5, label: '5 completed' },
      { tier: 'silver', threshold: 15, label: '15 completed' },
      { tier: 'gold', threshold: 30, label: '30 completed' },
      { tier: 'platinum', threshold: 75, label: '75 completed' },
    ],
  },
  {
    id: 'speedrunner', name: 'Speedrunner', icon: '⚡',
    description: 'Complete a game within N days of starting',
    category: 'finisher', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 14, label: '14 days' },
      { tier: 'silver', threshold: 7, label: '7 days' },
      { tier: 'gold', threshold: 3, label: '3 days' },
      { tier: 'platinum', threshold: 1, label: '1 day' },
    ],
  },
  {
    id: 'the-closer', name: 'The Closer', icon: '🔒',
    description: 'Completion rate across owned library',
    category: 'finisher', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 25, label: '25%' },
      { tier: 'silver', threshold: 40, label: '40%' },
      { tier: 'gold', threshold: 60, label: '60%' },
      { tier: 'platinum', threshold: 80, label: '80%' },
    ],
  },
  {
    id: 'no-game-left-behind', name: 'No Game Left Behind', icon: '🧹',
    description: 'Minimize unstarted owned games',
    category: 'finisher', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 10, label: '<10 unstarted' },
      { tier: 'silver', threshold: 5, label: '<5 unstarted' },
      { tier: 'gold', threshold: 2, label: '<2 unstarted' },
      { tier: 'platinum', threshold: 0, label: '0 unstarted' },
    ],
  },
  {
    id: 'backlog-slayer', name: 'Backlog Slayer', icon: '🗡️',
    description: 'Complete games that sat unstarted for 30+ days',
    category: 'finisher', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 3, label: '3 games' },
      { tier: 'silver', threshold: 7, label: '7 games' },
      { tier: 'gold', threshold: 15, label: '15 games' },
      { tier: 'platinum', threshold: 30, label: '30 games' },
    ],
  },
  {
    id: 'completion-streak', name: 'Completion Streak', icon: '⛓️',
    description: 'Complete at least one game in consecutive months',
    category: 'finisher', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 3, label: '3 months' },
      { tier: 'silver', threshold: 6, label: '6 months' },
      { tier: 'gold', threshold: 9, label: '9 months' },
      { tier: 'platinum', threshold: 12, label: '12 months' },
    ],
  },
  {
    id: 'the-sprint', name: 'The Sprint', icon: '🏃',
    description: 'Complete 3+ games in a single month',
    category: 'finisher', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 time' },
      { tier: 'silver', threshold: 3, label: '3 times' },
      { tier: 'gold', threshold: 6, label: '6 times' },
      { tier: 'platinum', threshold: 12, label: '12 times' },
    ],
  },
  {
    id: 'resurrection', name: 'Resurrection', icon: '🐦‍🔥',
    description: 'Complete a game you previously abandoned',
    category: 'finisher', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 game' },
      { tier: 'silver', threshold: 3, label: '3 games' },
      { tier: 'gold', threshold: 5, label: '5 games' },
      { tier: 'platinum', threshold: 10, label: '10 games' },
    ],
  },
  {
    id: 'one-and-done', name: 'One and Done', icon: '☝️',
    description: 'Complete a game in a single play session',
    category: 'finisher', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 game' },
      { tier: 'silver', threshold: 3, label: '3 games' },
      { tier: 'gold', threshold: 5, label: '5 games' },
      { tier: 'platinum', threshold: 10, label: '10 games' },
    ],
  },
  {
    id: 'the-minimalist', name: 'The Minimalist', icon: '🎯',
    description: 'Complete a game in under 5 total hours',
    category: 'finisher', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 game' },
      { tier: 'silver', threshold: 3, label: '3 games' },
      { tier: 'gold', threshold: 5, label: '5 games' },
      { tier: 'platinum', threshold: 10, label: '10 games' },
    ],
  },
  {
    id: 'epic-journey', name: 'Epic Journey', icon: '🗺️',
    description: 'Complete a game you spent 100+ hours on',
    category: 'finisher', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 game' },
      { tier: 'silver', threshold: 2, label: '2 games' },
      { tier: 'gold', threshold: 3, label: '3 games' },
      { tier: 'platinum', threshold: 5, label: '5 games' },
    ],
  },
  {
    id: 'the-ender', name: 'The Ender', icon: '💀',
    description: 'Complete 2+ games in a single week',
    category: 'finisher', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 time' },
      { tier: 'silver', threshold: 3, label: '3 times' },
      { tier: 'gold', threshold: 6, label: '6 times' },
      { tier: 'platinum', threshold: 12, label: '12 times' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // CATEGORY 4: THE EXPLORER (Variety & Discovery) — 10 Trophies
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'genre-tourist', name: 'Genre Tourist', icon: '🌍',
    description: 'Unique genres in your library',
    category: 'explorer', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 5, label: '5 genres' },
      { tier: 'silver', threshold: 8, label: '8 genres' },
      { tier: 'gold', threshold: 12, label: '12 genres' },
      { tier: 'platinum', threshold: 15, label: '15+ genres' },
    ],
  },
  {
    id: 'platform-hopper', name: 'Platform Hopper', icon: '🎮',
    description: 'Unique platforms played across library',
    category: 'explorer', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 2, label: '2 platforms' },
      { tier: 'silver', threshold: 3, label: '3 platforms' },
      { tier: 'gold', threshold: 4, label: '4 platforms' },
      { tier: 'platinum', threshold: 6, label: '6+ platforms' },
    ],
  },
  {
    id: 'franchise-devotee', name: 'Franchise Devotee', icon: '👨‍👩‍👧‍👦',
    description: 'Games within a single franchise',
    category: 'explorer', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 3, label: '3 in one' },
      { tier: 'silver', threshold: 5, label: '5 in one' },
      { tier: 'gold', threshold: 8, label: '8 in one' },
      { tier: 'platinum', threshold: 12, label: '12+ in one' },
    ],
  },
  {
    id: 'new-horizons', name: 'New Horizons', icon: '🧭',
    description: 'Start a game in a genre you\'ve never tried before',
    category: 'explorer', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 new genre' },
      { tier: 'silver', threshold: 3, label: '3 new genres' },
      { tier: 'gold', threshold: 5, label: '5 new genres' },
      { tier: 'platinum', threshold: 8, label: '8 new genres' },
    ],
  },
  {
    id: 'the-collector', name: 'The Collector', icon: '🏆',
    description: 'Total games in library',
    category: 'explorer', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 25, label: '25 games' },
      { tier: 'silver', threshold: 50, label: '50 games' },
      { tier: 'gold', threshold: 100, label: '100 games' },
      { tier: 'platinum', threshold: 200, label: '200 games' },
    ],
  },
  {
    id: 'source-diversifier', name: 'Source Diversifier', icon: '🛒',
    description: 'Unique purchase sources used',
    category: 'explorer', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 3, label: '3 sources' },
      { tier: 'silver', threshold: 5, label: '5 sources' },
      { tier: 'gold', threshold: 6, label: '6 sources' },
      { tier: 'platinum', threshold: 7, label: 'All sources' },
    ],
  },
  {
    id: 'variety-hour', name: 'Variety Hour', icon: '🎨',
    description: 'Play games from 5+ genres in a single month',
    category: 'explorer', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 time' },
      { tier: 'silver', threshold: 4, label: '4 times' },
      { tier: 'gold', threshold: 8, label: '8 times' },
      { tier: 'platinum', threshold: 15, label: '15 times' },
    ],
  },
  {
    id: 'genre-breaker', name: 'Genre Breaker', icon: '💥',
    description: 'Highest-rated game is in your least-played genre',
    category: 'explorer', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 occurrence' },
      { tier: 'silver', threshold: 2, label: 'Rating 9+' },
      { tier: 'gold', threshold: 3, label: 'Rating 10' },
      { tier: 'platinum', threshold: 4, label: 'Two such games' },
    ],
  },
  {
    id: 'the-rotation', name: 'The Rotation', icon: '🔁',
    description: 'Play 3+ different games in a single day',
    category: 'explorer', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 time' },
      { tier: 'silver', threshold: 5, label: '5 times' },
      { tier: 'gold', threshold: 12, label: '12 times' },
      { tier: 'platinum', threshold: 25, label: '25 times' },
    ],
  },
  {
    id: 'seasonal-gamer', name: 'Seasonal Gamer', icon: '🍂',
    description: 'Log sessions in all 4 seasons of a calendar year',
    category: 'explorer', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 year' },
      { tier: 'silver', threshold: 2, label: '2 years' },
      { tier: 'gold', threshold: 3, label: '3 years' },
      { tier: 'platinum', threshold: 5, label: '5 years' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // CATEGORY 5: THE CRITIC (Ratings & Opinions) — 10 Trophies
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'tough-critic', name: 'Tough Critic', icon: '⚖️',
    description: 'Average rating across library is low',
    category: 'critic', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 7, label: 'Avg <7' },
      { tier: 'silver', threshold: 6, label: 'Avg <6' },
      { tier: 'gold', threshold: 5, label: 'Avg <5' },
      { tier: 'platinum', threshold: 4, label: 'Avg <4' },
    ],
  },
  {
    id: 'eternal-optimist', name: 'Eternal Optimist', icon: '⭐',
    description: 'Average rating across library is high',
    category: 'critic', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 7, label: 'Avg >7' },
      { tier: 'silver', threshold: 7.5, label: 'Avg >7.5' },
      { tier: 'gold', threshold: 8, label: 'Avg >8' },
      { tier: 'platinum', threshold: 8.5, label: 'Avg >8.5' },
    ],
  },
  {
    id: 'perfect-10', name: 'Perfect 10', icon: '💎',
    description: 'Give a game a 10/10 rating',
    category: 'critic', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 game' },
      { tier: 'silver', threshold: 3, label: '3 games' },
      { tier: 'gold', threshold: 5, label: '5 games' },
      { tier: 'platinum', threshold: 10, label: '10 games' },
    ],
  },
  {
    id: 'balanced-palate', name: 'Balanced Palate', icon: '⚖️',
    description: 'Rating standard deviation is low (consistent taste)',
    category: 'critic', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 2.5, label: 'σ < 2.5' },
      { tier: 'silver', threshold: 2.0, label: 'σ < 2.0' },
      { tier: 'gold', threshold: 1.5, label: 'σ < 1.5' },
      { tier: 'platinum', threshold: 1.0, label: 'σ < 1.0' },
    ],
  },
  {
    id: 'the-reviewer', name: 'The Reviewer', icon: '✍️',
    description: 'Write a review or notes for your games',
    category: 'critic', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 5, label: '5 reviews' },
      { tier: 'silver', threshold: 15, label: '15 reviews' },
      { tier: 'gold', threshold: 30, label: '30 reviews' },
      { tier: 'platinum', threshold: 50, label: '50 reviews' },
    ],
  },
  {
    id: 'surprise-hit', name: 'Surprise Hit', icon: '🤯',
    description: 'Rate a game you paid <$10 at 9 or 10',
    category: 'critic', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 game' },
      { tier: 'silver', threshold: 3, label: '3 games' },
      { tier: 'gold', threshold: 5, label: '5 games' },
      { tier: 'platinum', threshold: 10, label: '10 games' },
    ],
  },
  {
    id: 'money-pit', name: 'Money Pit', icon: '🕳️',
    description: 'Own a game you paid $50+ and rated below 5',
    category: 'critic', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 game' },
      { tier: 'silver', threshold: 2, label: '2 games' },
      { tier: 'gold', threshold: 3, label: '3 games' },
      { tier: 'platinum', threshold: 5, label: '5 games' },
    ],
  },
  {
    id: 'the-contrarian', name: 'The Contrarian', icon: '🙃',
    description: 'Rate a game 3+ points different from your genre average',
    category: 'critic', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 game' },
      { tier: 'silver', threshold: 3, label: '3 games' },
      { tier: 'gold', threshold: 5, label: '5 games' },
      { tier: 'platinum', threshold: 10, label: '10 games' },
    ],
  },
  {
    id: 'critics-choice', name: 'Critic\'s Choice', icon: '🏅',
    description: 'Games rated 9+ that are also Excellent value',
    category: 'critic', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 game' },
      { tier: 'silver', threshold: 3, label: '3 games' },
      { tier: 'gold', threshold: 5, label: '5 games' },
      { tier: 'platinum', threshold: 8, label: '8 games' },
    ],
  },
  {
    id: 'rating-evolution', name: 'Rating Evolution', icon: '📊',
    description: 'Use the full 1-10 rating spectrum',
    category: 'critic', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 5, label: '5 unique ratings' },
      { tier: 'silver', threshold: 7, label: '7 unique ratings' },
      { tier: 'gold', threshold: 9, label: '9 unique ratings' },
      { tier: 'platinum', threshold: 10, label: 'All 10 ratings' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // CATEGORY 6: THE PERSONALITY (Behavioral Quirks) — 14 Trophies
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'monogamist', name: 'Monogamist', icon: '💍',
    description: 'Play only 1 game for an entire month',
    category: 'personality', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 month' },
      { tier: 'silver', threshold: 3, label: '3 months' },
      { tier: 'gold', threshold: 6, label: '6 months' },
      { tier: 'platinum', threshold: 12, label: '12 months' },
    ],
  },
  {
    id: 'juggler', name: 'Juggler', icon: '🤹',
    description: 'Play 5+ different games in a single week',
    category: 'personality', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 time' },
      { tier: 'silver', threshold: 4, label: '4 times' },
      { tier: 'gold', threshold: 10, label: '10 times' },
      { tier: 'platinum', threshold: 25, label: '25 times' },
    ],
  },
  {
    id: 'patient-gamer', name: 'The Patient Gamer', icon: '⏳',
    description: 'Wait 90+ days after purchase before first play',
    category: 'personality', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 game' },
      { tier: 'silver', threshold: 5, label: '5 games' },
      { tier: 'gold', threshold: 10, label: '10 games' },
      { tier: 'platinum', threshold: 20, label: '20 games' },
    ],
  },
  {
    id: 'binge-and-purge', name: 'Binge & Purge', icon: '🎢',
    description: '20+ hour week followed by <2 hour week',
    category: 'personality', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 time' },
      { tier: 'silver', threshold: 3, label: '3 times' },
      { tier: 'gold', threshold: 6, label: '6 times' },
      { tier: 'platinum', threshold: 12, label: '12 times' },
    ],
  },
  {
    id: 'creature-of-habit', name: 'Creature of Habit', icon: '🕰️',
    description: 'Play the same game on the same weekday, 4+ consecutive weeks',
    category: 'personality', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 game' },
      { tier: 'silver', threshold: 3, label: '3 games' },
      { tier: 'gold', threshold: 5, label: '5 games' },
      { tier: 'platinum', threshold: 10, label: '10 games' },
    ],
  },
  {
    id: 'the-abandoner', name: 'The Abandoner', icon: '👻',
    description: 'Abandon games — this is self-awareness',
    category: 'personality', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 3, label: '3 abandoned' },
      { tier: 'silver', threshold: 8, label: '8 abandoned' },
      { tier: 'gold', threshold: 15, label: '15 abandoned' },
      { tier: 'platinum', threshold: 30, label: '30 abandoned' },
    ],
  },
  {
    id: 'sunk-cost-survivor', name: 'Sunk Cost Survivor', icon: '⚓',
    description: 'Rate a 30+ hour game below 5/10',
    category: 'personality', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 game' },
      { tier: 'silver', threshold: 3, label: '3 games' },
      { tier: 'gold', threshold: 5, label: '5 games' },
      { tier: 'platinum', threshold: 8, label: '8 games' },
    ],
  },
  {
    id: 'day-one', name: 'Day One', icon: '🎉',
    description: 'Start playing a game the same day you buy it',
    category: 'personality', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 3, label: '3 games' },
      { tier: 'silver', threshold: 8, label: '8 games' },
      { tier: 'gold', threshold: 15, label: '15 games' },
      { tier: 'platinum', threshold: 30, label: '30 games' },
    ],
  },
  {
    id: 'queue-skipper', name: 'Queue Skipper', icon: '🏃‍♂️',
    description: 'Start a game that wasn\'t in your Up Next queue while queue has 3+ games',
    category: 'personality', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 time' },
      { tier: 'silver', threshold: 5, label: '5 times' },
      { tier: 'gold', threshold: 10, label: '10 times' },
      { tier: 'platinum', threshold: 20, label: '20 times' },
    ],
  },
  {
    id: 'parallel-player', name: 'Parallel Player', icon: '🔀',
    description: 'Have 5+ games In Progress simultaneously',
    category: 'personality', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 5, label: '5 in progress' },
      { tier: 'silver', threshold: 7, label: '7 in progress' },
      { tier: 'gold', threshold: 10, label: '10 in progress' },
      { tier: 'platinum', threshold: 15, label: '15 in progress' },
    ],
  },
  {
    id: 'the-decider', name: 'The Decider', icon: '✂️',
    description: 'Clear all In Progress games (0 in progress)',
    category: 'personality', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 time' },
      { tier: 'silver', threshold: 3, label: '3 times' },
      { tier: 'gold', threshold: 6, label: '6 times' },
      { tier: 'platinum', threshold: 12, label: '12 times' },
    ],
  },
  {
    id: 'hibernation-breaker', name: 'Hibernation Breaker', icon: '❄️',
    description: 'First session after a 14+ day total gaming drought',
    category: 'personality', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 time' },
      { tier: 'silver', threshold: 3, label: '3 times' },
      { tier: 'gold', threshold: 5, label: '5 times' },
      { tier: 'platinum', threshold: 10, label: '10 times' },
    ],
  },
  {
    id: 'the-revisionist', name: 'The Revisionist', icon: '🔙',
    description: 'Play a completed game again',
    category: 'personality', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 game' },
      { tier: 'silver', threshold: 3, label: '3 games' },
      { tier: 'gold', threshold: 5, label: '5 games' },
      { tier: 'platinum', threshold: 10, label: '10 games' },
    ],
  },
  {
    id: 'impulse-hour', name: 'Impulse Hour', icon: '⚡',
    description: 'Buy a game AND log 2+ hours on it the same day',
    category: 'personality', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 time' },
      { tier: 'silver', threshold: 3, label: '3 times' },
      { tier: 'gold', threshold: 5, label: '5 times' },
      { tier: 'platinum', threshold: 10, label: '10 times' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // CATEGORY 7: FIRST BLOOD (One-Time Milestones) — 10 Trophies
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'first-blood', name: 'First Blood', icon: '🩸',
    description: 'Log your very first play session ever',
    category: 'first', isMilestone: true, isSecret: false,
  },
  {
    id: 'the-collection-begins', name: 'The Collection Begins', icon: '📦',
    description: 'Add your 1st game to the library',
    category: 'first', isMilestone: true, isSecret: false,
  },
  {
    id: 'first-completion', name: 'First Completion', icon: '🎓',
    description: 'Complete your first game',
    category: 'first', isMilestone: true, isSecret: false,
  },
  {
    id: 'first-perfect-score', name: 'First Perfect Score', icon: '💯',
    description: 'Give your first 10/10 rating',
    category: 'first', isMilestone: true, isSecret: false,
  },
  {
    id: 'first-heartbreak', name: 'First Heartbreak', icon: '💔',
    description: 'Abandon your first game',
    category: 'first', isMilestone: true, isSecret: false,
  },
  {
    id: 'first-freebie', name: 'First Freebie', icon: '🆓',
    description: 'Add your first free/subscription game',
    category: 'first', isMilestone: true, isSecret: false,
  },
  {
    id: 'first-franchise', name: 'First Franchise', icon: '🏰',
    description: 'Own 2+ games in the same franchise',
    category: 'first', isMilestone: true, isSecret: false,
  },
  {
    id: 'first-streak', name: 'First Streak', icon: '🔥',
    description: 'Hit a 3-day play streak for the first time',
    category: 'first', isMilestone: true, isSecret: false,
  },
  {
    id: 'first-budget', name: 'First Budget Set', icon: '💵',
    description: 'Set your first yearly budget',
    category: 'first', isMilestone: true, isSecret: false,
  },
  {
    id: 'first-queue', name: 'First Queue', icon: '📋',
    description: 'Add your first game to the Up Next queue',
    category: 'first', isMilestone: true, isSecret: false,
  },

  // ═══════════════════════════════════════════════════════════════
  // CATEGORY 8: THE LEGEND (Epic Compound Achievements) — 10 Trophies
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'library-titan', name: 'Library Titan', icon: '🏛️',
    description: 'Trophy Score total across all other trophies',
    category: 'legend', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 200, label: '200 pts' },
      { tier: 'silver', threshold: 500, label: '500 pts' },
      { tier: 'gold', threshold: 1000, label: '1,000 pts' },
      { tier: 'platinum', threshold: 2000, label: '2,000 pts' },
    ],
  },
  {
    id: 'the-historian', name: 'The Historian', icon: '📚',
    description: 'Play logs spanning a long time period',
    category: 'legend', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 180, label: '6 months' },
      { tier: 'silver', threshold: 365, label: '1 year' },
      { tier: 'gold', threshold: 730, label: '2 years' },
      { tier: 'platinum', threshold: 1825, label: '5 years' },
    ],
  },
  {
    id: 'golden-ratio', name: 'Golden Ratio', icon: '♾️',
    description: 'Own a game with 100+ hours, 9+ rating, AND <$1/hr',
    category: 'legend', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 game' },
      { tier: 'silver', threshold: 2, label: '2 games' },
      { tier: 'gold', threshold: 3, label: '3 games' },
      { tier: 'platinum', threshold: 5, label: '5 games' },
    ],
  },
  {
    id: 'backlog-zero', name: 'Backlog Zero', icon: '🧘',
    description: 'Zero unstarted + zero stalled in-progress games',
    category: 'legend', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: 'Reach once' },
      { tier: 'silver', threshold: 2, label: 'Reach 2 times' },
      { tier: 'gold', threshold: 3, label: 'Reach 3 times' },
      { tier: 'platinum', threshold: 5, label: 'Reach 5 times' },
    ],
  },
  {
    id: 'triple-threat', name: 'Triple Threat', icon: '🏆',
    description: 'Complete 3+ games rated 9 or higher',
    category: 'legend', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 3, label: '3 games' },
      { tier: 'silver', threshold: 5, label: '5 games' },
      { tier: 'gold', threshold: 8, label: '8 games' },
      { tier: 'platinum', threshold: 12, label: '12 games' },
    ],
  },
  {
    id: 'the-untouchable', name: 'The Untouchable', icon: '👑',
    description: 'Have multiple Legendary rarity cards simultaneously',
    category: 'legend', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 3, label: '3 legendaries' },
      { tier: 'silver', threshold: 5, label: '5 legendaries' },
      { tier: 'gold', threshold: 8, label: '8 legendaries' },
      { tier: 'platinum', threshold: 12, label: '12 legendaries' },
    ],
  },
  {
    id: 'soulmate-collector', name: 'Soulmate Collector', icon: '💛',
    description: 'Games with 100h+ and 8+ rating (Soulmate status)',
    category: 'legend', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 soulmate' },
      { tier: 'silver', threshold: 3, label: '3 soulmates' },
      { tier: 'gold', threshold: 5, label: '5 soulmates' },
      { tier: 'platinum', threshold: 8, label: '8 soulmates' },
    ],
  },
  {
    id: 'perfect-month', name: 'Perfect Month', icon: '🌟',
    description: 'Complete 2+ games, log 20+ sessions in one month',
    category: 'legend', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 1, label: '1 month' },
      { tier: 'silver', threshold: 3, label: '3 months' },
      { tier: 'gold', threshold: 6, label: '6 months' },
      { tier: 'platinum', threshold: 12, label: '12 months' },
    ],
  },
  {
    id: 'the-polymath', name: 'The Polymath', icon: '🎭',
    description: 'Completed games across 5+ genres, all rated 7+',
    category: 'legend', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 3, label: '3 genres' },
      { tier: 'silver', threshold: 5, label: '5 genres' },
      { tier: 'gold', threshold: 7, label: '7 genres' },
      { tier: 'platinum', threshold: 10, label: '10 genres' },
    ],
  },
  {
    id: 'year-one', name: 'Year One', icon: '🎂',
    description: 'Data spanning a full year with regular entries',
    category: 'legend', isMilestone: false, isSecret: false,
    tiers: [
      { tier: 'bronze', threshold: 90, label: '3 months' },
      { tier: 'silver', threshold: 180, label: '6 months' },
      { tier: 'gold', threshold: 270, label: '9 months' },
      { tier: 'platinum', threshold: 365, label: '12 months' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // CATEGORY 9: SECRET TROPHIES — 10 Trophies
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'shelf-of-shame', name: 'The Shelf of Shame', icon: '😰',
    description: 'Own 10+ games with 0 hours played',
    category: 'secret', isMilestone: true, isSecret: true,
  },
  {
    id: 'deja-vu', name: 'Déjà Vu', icon: '🔄',
    description: 'Buy a game in a franchise where you abandoned a previous entry',
    category: 'secret', isMilestone: true, isSecret: true,
  },
  {
    id: 'the-flipper', name: 'The Flipper', icon: '🏓',
    description: 'Start and abandon 3 different games within 30 days',
    category: 'secret', isMilestone: true, isSecret: true,
  },
  {
    id: 'guilty-pleasure', name: 'Guilty Pleasure', icon: '🤫',
    description: 'Put 50+ hours into a game you rated 5 or below',
    category: 'secret', isMilestone: true, isSecret: true,
  },
  {
    id: 'the-ghost', name: 'The Ghost', icon: '🫥',
    description: 'No gaming activity for 30+ days, then come back',
    category: 'secret', isMilestone: true, isSecret: true,
  },
  {
    id: 'speedrun-shopper', name: 'Speedrun Shopper', icon: '🛒',
    description: 'Buy 3+ games in a single day',
    category: 'secret', isMilestone: true, isSecret: true,
  },
  {
    id: 'the-contrarian-ii', name: 'The Contrarian II', icon: '🙃',
    description: 'Your most-played game (by hours) has your lowest rating',
    category: 'secret', isMilestone: true, isSecret: true,
  },
  {
    id: 'two-timer', name: 'Two-Timer', icon: '👀',
    description: 'Log sessions on 2+ games on the same day, 10+ times',
    category: 'secret', isMilestone: true, isSecret: true,
  },
  {
    id: 'the-archivist', name: 'The Archivist', icon: '🗄️',
    description: 'Every game in your library has notes, a rating, and play logs',
    category: 'secret', isMilestone: true, isSecret: true,
  },
  {
    id: 'trophy-hunter', name: 'Trophy Hunter', icon: '🏅',
    description: 'Earn 50+ trophies total (any tier)',
    category: 'secret', isMilestone: true, isSecret: true,
  },
];
