# NewIdeas100-June2026

A backlog of **102 feature ideas** for the **Game Analytics** mini-app, brainstormed June 2026. This is an idea bank — not an approved build plan. Each entry includes a short description plus a **How to build** note grounded in the app's existing architecture.

## How these map to the existing architecture

Most ideas reuse patterns already in the app — read the "Game Analytics Deep Dive" in `/CLAUDE.md` first. Quick reference:

- **Pure stats / scores** → add a function to `lib/calculations.ts` (70+ pure functions already live here), surface it in a panel (`StatsView`, `FunStatsPanel`, `ExpandedStatsPanel`, `InsightsPanel`, `AnalyticsPanel`).
- **AI features** → use `lib/ai-service.ts` / `lib/ai-game-service.ts` (Gemini, same grounding pattern as `lib/subscription-games-service.ts`). Keep prompts data-driven from the user's actual games.
- **New persisted data** (goals, XP, tags, preferences) → follow the **HybridRepository** pattern (`lib/storage.ts`): `LocalStorage*` + `Firebase*` + `Hybrid*`, plus a `use*` hook. Device-local-only planning data can skip Firestore (precedent: `lib/queue-preferences.ts`, `estimator-settings`).
- **Cards** → rendered in `page.tsx` game card section; card-derived values go through `calculations.ts` (e.g. `getRelationshipStatus`, `getCardRarity`).
- **Recaps / story mode** → `WeekStoryMode.tsx` + `story-screens/*`, `MonthStoryMode.tsx` + `month-screens/*`.
- **Timeline** → `TimelineView.tsx`.
- **Up Next** → `UpNextTab.tsx` / `QueueGameCard.tsx`, queue logic in `useGameQueue.ts`.

Legend: ✨ = brand-new in this round. Effort: **L** low / **M** medium / **H** high.

---

## 🎮 Core Play Loop

1. **Active Session Timer** (M) — Tap a game to start a live clock; tap to stop and auto-create a `PlayLog` with the elapsed hours. *How:* timer state in `page.tsx`/a small `useActiveSession` hook (persist start time to localStorage so a refresh doesn't lose it); on stop, call `addPlayLog`. Feeds streaks, momentum, Now Playing card.
2. **Daily Play Goal Ring** (M) — Apple-Watch-style ring in the header filling toward a daily/weekly hours target. *How:* target in a settings store; compute today's hours from `getAllPlayLogs`; SVG ring component.
3. **Mood-Based Quick Log** (L) — Tag each session Great/Good/Meh/Grind. *How:* add optional `mood` to `PlayLog` type; selector in `PlayLogModal`/`QuickCheckIn`; powers a "which games actually make you happy" stat.
4. **Backlog Roulette+** (M) — Spin-the-wheel weighted by Chemistry + time available, not pure random. *How:* extend the planned `RandomPicker` with weights from `getGameChemistry`.
5. **"Finish This One" Focus Mode** (M) — Pick one game; UI dims everything else and tracks a mini-campaign to completion with ETA. *How:* `focusGameId` state; reuse completion-ETA calc (#21).

## 🧹 Data Quality & Entry (non-AI)

6. **Nullable "Unrated" ratings** (M) — `rating` defaults to `null`, not a forced number. *How:* change `Game.rating` to `number | null` in `lib/types.ts`; null-guard every consumer in `calculations.ts` (rating averages, bias, ROI, blend score, "Soulmate"/"Love at First Sight" labels must exclude unrated); GameForm gets a "Skip / rate later" state; cards show "Not yet rated". **High synergy — most rating-driven stats depend on this being honest.**
7. **Bulk Edit Mode** (M) — Multi-select cards, batch-change status/platform/genre/tags. *How:* selection state in `page.tsx`; reuse `updateManyGames` (already added for queue batching).
8. **Quick-Add by Paste** (L) — Paste game names → draft cards to fill in later. *How:* textarea modal → `addGame` per line with minimal fields; RAWG thumbnail auto-fetch already handles art.
9. **Duplicate Detector & Merge** (M) — Flag same-name entries, offer merge. *How:* name-normalize compare in a util; merge combines `playLogs` and keeps newest fields.
10. **Undo / Trash Bin** (M) — Deletes go to a 30-day trash. *How:* soft-delete flag `deletedAt` on `Game`; filter it out of normal queries; restore/purge UI.
11. **CSV Import / Export** (M) — Spreadsheet round-trip + backup. *How:* client-side CSV serialize/parse of the `Game[]`; map columns to the type.
12. **Custom Fields** (M) — User-defined fields (e.g. "Co-op partner"). *How:* `customFields: Record<string,string>` on `Game`; dynamic inputs in GameForm; filterable.
13. **Pin Favorites** (L) — Pin games to the top regardless of sort. *How:* `pinned?: boolean`; sort pinned first in `page.tsx`.

## 🗂️ Organization (non-AI)

14. **Tag System** (M) — Free-form tags + tag cloud + tag filtering. *How:* `tags?: string[]`; tag input in GameForm; filter chips in `page.tsx`.
15. **Saved Filters / Smart Lists** (M) — Save filter+sort combos as named views. *How:* persist filter configs in a settings store; quick-switch dropdown.
16. **✨ Replayability rating field** (L) — Separate "would replay" score. *How:* `replayability?: number` on `Game`; show on detail panel; feeds recommender.
17. **✨ Platinum / 100% Trophy Tracker** (L) — Track full-completion separate from "Completed". *How:* `platinum?: boolean` / `completionPercent?: number`; badge on card; new completionist stat.

## 📊 Insights & Stats

18. **Taste Twin Genres** (M) — "You rate soulslikes like roguelikes." *How:* correlate per-genre rating/hours vectors in `calculations.ts`; display in InsightsPanel.
19. **Hours-to-Money Mirror** (M) — One toggle flips every stat between time and money lenses. *How:* a view-mode context consumed by stat components.
20. **Regret Refund Estimator** (L) — Total theoretical "refund" of barely-touched games. *How:* sum `price` where `getTotalHours < 2`; reuse `findRegretPurchases`.
21. **Completion ETA Per Game** (M) — Predicted finish date per in-progress game. *How:* `getCompletionETA(game, allGames)` from personal pace by genre/length; badge on card.
22. **Value Tier Progress Bars** (L) — "X more hours to Excellent value." *How:* derive from `getValueRating` thresholds vs current cost-per-hour; small bar on card.
23. **Personal Records Board** (L) — Living "world records" page. *How:* aggregate existing record functions (`getLongestSession`, `getFastestCompletion`, lowest $/hr, longest streak) into one panel.
24. **Stat of the Day** (L) — A surprising daily fun-fact from your data. *How:* `getStatOfTheDay(games)` seeded by date; card in header.
25. **Cost in Real-World Units** (L) — "4.5 lattes/hr saved vs cinema." *How:* extend `getEntertainmentComparison` with playful unit conversions.

## 🏆 Gamification

26. **Quest Log** (M) — Auto-generated weekly micro-quests granting XP. *How:* `generateQuests(games, weekOffset)` in calculations; track completion in a store.
27. **Gamer Level & XP** (M) — Persistent level from hours/completions/quests + prestige. *How:* `useProgression` hook + store; XP formula in calculations.
28. **Seasonal Challenges** (M) — Time-boxed themed events vs your past seasons. *How:* challenge defs + progress store; leaderboard = your own history.
29. **Streak Insurance** (L) — Monthly "freeze" token protecting a streak. *How:* token count in store; streak calc honors freeze days.
30. **Combo Multiplier** (L) — Consecutive-day combo meter boosting XP. *How:* derive from `getCurrentGamingStreak`; multiplier in XP formula.
31. **Backlog Boss Battles** (M) — Backlog has an HP bar; completions deal damage; AI names the boss. *How:* HP = est. hours to clear (`getBacklogInDays` basis); damage on completion; optional AI name.
32. **Loot Drops** (M) — Completions/streaks drop cosmetic rewards by rarity. *How:* reward table + inventory store; ties to #52 frames, #95 themes.
33. **Title System** (M) — Equippable titles ("Backlog Hoarder Supreme"). *How:* unlock conditions reuse trophy/achievement logic; equipped title on profile.
34. **Daily Spin** (L) — Once-a-day reward wheel for XP/cosmetics. *How:* date-gated in store; reward pool.
35. **Achievement Hunter** (M) — AI invents hyper-specific personalized achievements. *How:* `lib/ai-game-service.ts` prompt seeded with stat outliers.
36. **New Game+ tracker** (L) — Track replays separately with their own stats. *How:* `newGamePlus?: boolean` runs or a `replayCount`; separate hours bucket.
37. **✨ Gaming Bingo** (M) — Monthly 5×5 bingo card of gaming tasks. *How:* `generateBingoCard(month)` from achievable goals; auto-check against play data.
38. **Genre Goals checklist** (L) — "Play 5 genres this year." *How:* count distinct genres played in range vs target.
39. **✨ Hours-as-currency clicker** (M) — A toy mini-game spending your logged hours as currency. *How:* purely cosmetic store; currency = lifetime hours; pure fun.

## 🃏 Cards & Game Personality

40. **Game Pairing Suggestions** (M) — "Plays well alongside X" (heavy + palate-cleanser). *How:* pair by rotation history + session-length contrast in calculations.
41. **"Since You Last Played" card** (M) — Reopening a stalled game shows days away + last notes + nudge. *How:* compute gap + pull latest `PlayLog.notes`.
42. **Card Comparison Mode** (M) — Long-press two cards → head-to-head stat sheet. *How:* compare panel reusing `calculateMetrics`.
43. **Thumbnail Gradient Themes** (M) — Extend dominant-color tint into a cohesive per-game theme. *How:* build on planned `useGameColors`.
44. **Notes Timeline** (L) — All play-log notes as a journal thread per game. *How:* render sorted `playLogs[].notes` in the detail panel.
45. **Talking Games** (M) — Each game gets an AI "voice" leaving a sassy line. *How:* AI line seeded by relationship status + stats; cache per game/day.
46. **Game Tinder** (M) — Swipe the backlog; AI writes a witty bio; right → queue. *How:* swipe UI + `addToQueue`; bios via AI.
47. **Trading Card Pack Opening** (M) — New games "open" with a rarity reveal; milestones upgrade foil. *How:* animation on add using `getCardRarity`.
48. **Game Mugshots** (L) — Abandoned games get WANTED posters. *How:* template over thumbnail; "crimes" from price/hours/rating.
49. **Pet Game (Tamagotchi)** (M) — Adopt one game; mood reflects play/neglect, AI-voiced. *How:* mood from recency; optional AI line.
50. **Card Battles** (M) — Two games duel using stats as moves; AI narrates. *How:* deterministic stat duel + AI flavor text.
51. **Aura Reading** (L) — AI assigns each game an aura color/vibe. *How:* AI or rule-based mapping from genre+rating+relationship.
52. **Custom Card Frames** (M) — Cosmetic unlockable frames. *How:* frame asset + equipped-frame field; ties to loot (#32).
53. **Progress Bars on cards** (L) — Visual completion bar on in-progress games. *How:* manual `completionPercent` or estimate from hours vs genre median.
54. **✨ Where-I-Left-Off bookmark** (L) — Save a note + screenshot of where you stopped. *How:* `lastCheckpoint?: { note, image }` on `Game`; image as data URL/storage.
55. **Completion Confidence Meter** (L) — Non-AI heuristic bar (recency + hours + genre rate). *How:* `getCompletionConfidence(game, allGames)`; ring/bar on card.
56. **Manual Value Override** (L) — Mark "worth it"/"regret" by hand. *How:* `valueOverride?: 'worth'|'regret'`; respected by value displays.

## 📅 Timeline & History

57. **This Year vs Last Year overlay** (M) — Ghost pace line on the timeline. *How:* compute same-period cumulative for prior year; overlay in `TimelineView`.
58. **Era Tags** (M) — Auto-label timeline stretches ("The RPG Era") and scrub chapters. *How:* segment by dominant genre/intensity windows.
59. **Acquisition vs Completion Race** (M) — Dual line; the gap is your backlog. *How:* `getSpendingByMonth`-style counts for buys vs completions.
60. **Memory Lane Notifications** (L) — Daily "On This Day" re-engagement. *How:* build on the planned `getOnThisDay`.
61. **Session Heat Calendar** (M) — GitHub-style contribution grid of gaming days. *How:* day-bucket `getAllPlayLogs`; grid component; click-through to that day.
62. **Compare Two Time Periods** (M) — Diff every stat across two date ranges. *How:* reuse `getPeriodStatsForRange` twice; side-by-side.
63. **Memory Match flashback card** (L) — A flippable "on this day" flashback. *How:* reuse #60 data with a flip animation.

## 🔮 Up Next & Discovery

64. **Smart Queue Auto-Sort** (M) — One tap sorts by Chemistry + Shelf Life. *How:* `setQueueOrder` with combined score from `getGameChemistry` + `getShelfLifeExpiry`.
65. **Mood Filter on Queue** (M) — "1 hour, something chill." *How:* filter queue by expected session type + length.
66. **Wishlist Price Watch** (M) — Target prices + "good deal" flag. *How:* `targetPrice?` on wishlist games; compare to estimate (reuse subscription price estimator).
67. **Next 3 Months Forecast** (M) — Project what you'll play/finish. *How:* queue + pace → mini future-timeline (reuse `buildPlaythroughTimeline`).
68. **Backlog Bracket** (M) — Seed 8/16 games into a tournament you judge round-by-round. *How:* bracket state machine; champion → top of queue.
69. **Coin Flip / Dice Picker** (L) — Dead-simple "can't decide" tools. *How:* trivial random over a shortlist.
70. **The Vault** (M) — Curated drawer of owned-but-forgotten gems, weekly refresh. *How:* reuse `findShelfWarmers`/`findHiddenGems`, date-seeded rotation.
71. **What-Should-I-Buy-Next engine** (M) — Suggests *types* of games to seek based on highest-satisfaction patterns. *How:* invert eulogy logic — find your best-value/highest-rated clusters.
72. **✨ Game Release Radar / Hype Calendar** (M) — Track upcoming releases you're eyeing. *How:* AI web-search lineup (subscription-service pattern) + a tracked-releases store; ties to `detectGap`.
73. **Backlog Budget Planner** (M) — Hours/week → calendar of completion dates. *How:* extend the Estimator's `buildPlaythroughTimeline` with the shared weekly-pace control.
74. **✨ "Beat the Clock"** (M) — Set a deadline to finish before a sequel/related release drops. *How:* `deadline?` on a game; countdown badge; pace check vs ETA.
75. **Price History Log** (M) — Record paid vs original over time; visualize discipline. *How:* `priceHistory?: {date,price}[]`; chart in InsightsPanel.

## 🤖 AI Coach & Personality

76. **Weekly Check-In Conversation** (M) — AI opens with a tailored question. *How:* `ai-game-service` prompt seeded with the week's stalled games/streaks.
77. **Buy/Skip Advisor** (M) — Judge a tempting game against your taste + backlog. *How:* AI prompt with your genre completion/abandon rates.
78. **Goal Negotiator** (M) — Plain-language goal → trackable goals + quests. *How:* AI parses intent → structured goal objects (#20 goals storage).
79. **Roast My Library** (M) — Loving brutality, shareable one-liners. *How:* AI prompt seeded with outliers; export via #98.
80. **AI Gamer Horoscope** (M) — Daily horoscope from your patterns. *How:* date-seeded AI line; cache per day.
81. **Therapist Mode** (M) — Comedic compassion about backlog guilt. *How:* AI persona over abandonment/backlog stats.
82. **Hype Man** (L) — Over-the-top cheerleader; toggle. *How:* AI persona variant.
83. **Rival AI "Vincent"** (M) — Fictional rival with stats just above yours that taunts you. *How:* derive rival stats as a small delta over yours; AI taunt lines.
84. **AI Dream Journal** (M) — Psychoanalyzes genre/rating patterns into a funny profile. *How:* AI prompt over `getLibraryDNA`/personality data.
85. **Conspiracy Theory Mode** (M) — Absurd theories from your data. *How:* AI persona seeded with correlations.
86. **AI Oracle** (M) — "Will I finish this?" with sass + probability. *How:* AI flavor wrapping `getCompletionProbability`.
87. **Tonight's Forecast** (M) — Nightly "tonight feels like a 2-hour Hades run." *How:* day-of-week play patterns per game → AI one-liner.
88. **Backlog Tarot** (M) — Draw 3 backlog "cards" read as past/present/future. *How:* random 3 from backlog + AI reading.
89. **The Algorithm Knows** (M) — Predicts your next purchase, tracks accuracy. *How:* `getPurchaseRhythm` + genre lean → prediction; log hit/miss.
90. **AI Inside Jokes + Mood Ring Header** (M) — Running gags referencing your patterns; header gradient shifts to your current mood. *How:* AI remembers recurring patterns; header color from recent activity/`getActivityPulse`.

## 🎬 Recap & Wrapped Upgrades (improve the existing ones)

91. **Recap Voice Layer** (H) — AI Narrator voiceover + selectable Host personas (Sassy/Wholesome/Brutal/Shakespearean) + a mood-matched soundtrack. *How:* AI rewrites each screen's copy in the chosen voice; optional TTS; royalty-free audio bed keyed to Vibe Check intensity. Applies to both `WeekStoryMode` and `MonthStoryMode`.
92. **Director's Cut + AI Plot Recap** (M) — Short (6-screen) vs full cut, and an opening that narrates the period as a 3-act story. *How:* screen-list variants; AI plot intro screen seeded with the arc (`getStoryArc`).
93. **Interactive Recap** (M) — Prediction prompts ("guess your #1") + a trivia round on your own data + a "Lowlights" reel + a Time Machine that shows last year side-by-side. *How:* new story screens; trivia/lowlights from existing stats; Time Machine reuses prior-period aggregates.

## 🎨 Visuals & Themes (non-AI)

94. **Poster Wall + Shelf View** (M) — A pure box-art grid, and a bookshelf view where spine height = hours. *How:* alternate render modes in `page.tsx`; no stats, just art.
95. **Theme Engine** (M) — Pixel/Retro skin + auto Seasonal Skins + Dark/Light/OLED + accent-color picker. *How:* theme context + CSS variables; date-based seasonal switch.
96. **Library Visualizations** (M) — Color-by-Mood grid recolor + Library Constellation star-map + "If Your Library Were a City." *How:* recolor by chosen dimension; star/city layouts from genre+hours.
97. **✨ Juice Layer** (M) — Confetti + sound + haptics on wins, Easter eggs (Konami code → retro theme), and a Mascot that levels up with you. *How:* shared celebration util fired on milestones; hidden key listeners; mascot tied to #27 XP.

## 🤝 Social & Identity

98. **Exportable Identity** (M) — Shareable stat cards + a "Gaming Trainer Card" + a tongue-in-cheek Gaming Resume. *How:* render-to-image of a styled summary; pulls personality + top stats.
99. **Social Challenges** (M) — Challenge-a-friend cards, Guess-My-Game riddles, Hot-or-Not library review — all via shareable links (no friend system needed). *How:* encode a challenge/riddle into a URL; AI generates clues for riddles.
100. **Surprise Me Button** (M) — One tap → a random delight: roast, memory, hidden gem, fun stat, spirit animal, restaurant-style review, yearbook caption, time capsule, or genre weather forecast. *How:* a dispatcher that randomly invokes one of the above generators; the grab-bag home for smaller fun ideas.

---

## Meta features

101. **"Try This" Discovery Prompts** (M) — An occasional, dismissible in-app nudge surfacing a feature the user hasn't used yet: *"✨ Try this: spin the Backlog Bracket to settle what to play next →"*. Rotates through underused features, tracks what's been tried so it only suggests fresh ones, and never repeats too soon. Turns 100+ features into something *discoverable* instead of buried.
*How:* a `feature-discovery` localStorage store recording which features the user has interacted with; a registry of features each with `{ id, blurb, deepLink }`; a small `TryThisPrompt` component in `page.tsx` that picks an untried/under-used feature on an interval and links to it.

102. **Standing rule — every new feature ships with a discovery blurb** — Add an instruction to `/CLAUDE.md` that no feature is "done" until it includes a short, friendly blurb prompting the user to use it, registered into #101's rotation. Building the feature and teaching the user about it become one step, so the app never grows features nobody finds.
*How:* extend the pre-commit checklist / "When Adding New Features" section in `CLAUDE.md`; the blurb is the registry entry consumed by #101.

---

**Created:** June 2026 · **Status:** Idea bank (not yet approved for build) · **App:** `app/apps/game-analytics`
