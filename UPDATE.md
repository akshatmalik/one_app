# Game Analytics — Auto-Improvements Log

Maintained by an autonomous improvement agent that runs on a schedule. Each
entry below is one run. Newest entries first.

---

## 2026-06-20 09:30 — Up Next / Header — "Plan My Week" schedule planner with .ics export

**Files**: app/apps/game-analytics/lib/schedule-service.ts, app/apps/game-analytics/components/SchedulePlannerModal.tsx, app/apps/game-analytics/page.tsx, UPDATE.md, app/apps/game-analytics/data/whats-new.json
**Risk**: not risky

Every existing feature in this app is retrospective — stats, timelines, recaps all look backward at what you already played. There was no forward-looking "what should I actually play this week, and when" tool, despite already having all the ingredients: `getGameChemistry` (per-game match scoring) and the Up Next queue order. Added a new pure module, `lib/schedule-service.ts`: `getScheduleCandidates(allGames, queuedGames)` ranks eligible (owned, unfinished) games — queued games first by queue position, then by chemistry score — `buildWeeklyPlan(candidates, hoursByOffset, startTime)` greedily round-robins the ranked list across the next 7 days based on how many hours you say you have free each day, and `generateICS(slots)` serializes the resulting plan into a real RFC5545 `.ics` calendar file (floating local time, manual field escaping, one `VEVENT` per assigned day) downloaded via the existing `downloadFile()` helper from `export-service.ts`. Availability (hours per day) and a default start time persist to localStorage (`ga-schedule-availability-v1`, `ga-schedule-starttime-v1`) — the same device-local-planning-data precedent already established by `estimator-settings.ts` and `queue-preferences.ts`, so no Firestore rule changes were needed. New `components/SchedulePlannerModal.tsx` (styled after the existing `PlayTonightModal` modal shell) lets you tap quick hour buttons per day, hit "Generate Plan" to see a 7-day grid with each slot's assigned game, chemistry grade badge, and one-line justification, swap a slot to the next-ranked candidate, clear a slot, jump straight into a game's detail sheet, start the live session timer on today's slot, or export the whole week to your calendar app. Wired into the header's Command Palette as a new "Plan My Week" entry right under "Play Tonight." No changes to `lib/types.ts`, the storage/repository layer, or any existing `calculations.ts` function — only reads `getGameChemistry` and `Game[]`, never mutates game data. Verified with a clean `npm run build` (Next 14.2.35, 11/11 static pages — `npm install` was required first since `node_modules` wasn't present) and `npm run lint` (zero new warnings — confirmed the only output touching changed files was pre-existing `<img>`-vs-`<Image>` warnings already present elsewhere in this app, identical pattern to every prior run); this run also had headless Chromium available (installed Playwright into a throwaway `/tmp` sandbox, outside the repo), so the 375px mobile smoke test was a real one: loaded sample data, opened the Command Palette, opened "Plan My Week," generated a plan, and exported the `.ics` file — zero console errors or warnings on the new surface (the only console errors seen anywhere were pre-existing RAWG thumbnail-fetch network failures from this sandbox's lack of real internet access, unrelated to this change and present on every page load regardless of this feature).

FOLLOW-UP: Could let "Generate Plan" pull a smarter, non-round-robin allocation (e.g. weight longer days toward marathon-length games via the existing session-length signals), and could add a one-tap "Sync to Up Next" that reorders the queue to match the generated week instead of only reading from it.

## 2026-06-19 20:16 — Buy Queue — Price Watch alerts

**Files**: app/apps/game-analytics/lib/calculations.ts, app/apps/game-analytics/hooks/useAlerts.ts, app/apps/game-analytics/page.tsx, app/apps/game-analytics/components/BuyQueueTab.tsx, UPDATE.md, app/apps/game-analytics/data/whats-new.json
**Risk**: risky (touches 4 files outside a single self-contained component, including a widened exported type in `calculations.ts`)
**Snapshot tag**: master-stable-2026-06-19-2016 (this environment's git proxy rejects tag pushes with HTTP 403 — confirmed via a branch-push/branch-delete/tag-push probe that only tag pushes and ref deletions are blocked, plain branch creation works — so the pre-change snapshot of `master` at commit `f183932` was pushed as a branch named `master-stable-2026-06-19-2016` instead, same naming convention, same rollback purpose: `git checkout master-stable-2026-06-19-2016`)

`PurchaseQueueEntry.intent`'s own doc comment calls out `'deferred'` as "the home for deal alerts," and `BuyQueueTab.tsx` already computes a `dealsAtTarget` list (entries whose `currentPrice` has reached `targetPrice`) — but that computation only ever rendered a banner local to the Buy Queue tab, and `currentPrice` itself only ever updated through a one-at-a-time manual "refresh price" tap on each card. Closed both gaps. Added `getPriceWatchAlerts(entries)` in `calculations.ts` — a pure, additive function (existing `getActiveAlerts` body untouched) that turns a hit target price into a `warning` alert and a new all-time-low price (price below every prior `priceHistory` observation) into an `info` alert; widened the exported `AlertCategory` union with `'price'` and exported the previously-private `ALERT_SEVERITY_ORDER` so `useAlerts` could merge-and-resort both alert sources. `useAlerts` now takes an optional 6th `purchaseQueue` parameter (default `[]`, so any other caller is unaffected) and merges `getPriceWatchAlerts` into the feed. `page.tsx` now passes the Buy Queue's full `entries` array through, and `handleAlertAction` routes `'price'`-category alerts to the Buy Queue tab — `AlertsCenter.tsx` itself needed zero changes since it already styles purely by `severity`, not by category. Also added a one-tap "Check all prices (N)" button at the top of the Buy Queue tab that sequentially calls the existing `fetchCheapestPrice()` CheapShark lookup for every active/maybe/deferred entry, appends to each entry's `priceHistory` and updates `currentPrice` via the same `updateEntry` path `BuyQueueCard`'s per-card refresh already uses, then reports a toast summary ("Checked 8 games — 3 price drops — 1 at target!"). No changes to `lib/types.ts`, the storage/repository layer, or any existing calculation function's body. Verified with a clean `npm run build` (Next 14.2.35, 11/11 static pages — `npm install` was required first since `node_modules` wasn't present in this environment) and `npm run lint` (zero new warnings — the only warnings/errors in the full lint output are pre-existing and in unrelated mini-apps: `game-interest-tracker`, `mood-tracker`, `survivor-deckbuilder`, `time-tracker`, `todo-app`); no headless browser is available in this sandbox, so the 375px mobile/console check was substituted with a dev-server HTTP 200 fetch of `/apps/game-analytics` showing a clean compile with no server-side errors.

FOLLOW-UP: Could add a "last checked" timestamp + staleness nudge to the bulk button itself (mirroring `getPriceFreshness`'s per-card staleness logic), and could let "Check all prices" run automatically once a day in the background rather than requiring a tap.

## 2026-06-19 15:00 — Header — Alerts Center

**Files**: app/apps/game-analytics/lib/calculations.ts, app/apps/game-analytics/hooks/useAlerts.ts, app/apps/game-analytics/components/AlertsCenter.tsx, app/apps/game-analytics/page.tsx, UPDATE.md, app/apps/game-analytics/data/whats-new.json
**Risk**: not risky

The app already calculates a pile of "you should know about this" signals — budget overage (`getBudgetImpactPreview`), queue shame tiers (`getQueueShameData`), shelf-life expiry (`getShelfLifeExpiry`), goal deadlines (`useGoals`), even the live session timer — but every one of them was buried inside its own tab, so nothing surfaced unless you happened to scroll to the right panel. Added a new `getActiveAlerts(games, budgets, goals, liveSession?)` pure function in `calculations.ts` that composes those existing calculations into a single severity-sorted (`critical` → `warning` → `info`) alert feed: budget pressure at 75/90/100% of yearly budget, queue items in the "embarrassing"/"hall of shame" shame tiers, shelf-life games at "critical"/"expired", active goals with 0-7 days left and incomplete progress, and a nudge if a live session has been running 3+ hours. A new `useAlerts` hook layers in localStorage-persisted dismiss/snooze state (keyed by `id:severity` so an escalating alert like a budget warning-turned-critical resurfaces even if you dismissed the milder version) and an opt-in browser `Notification` ping fired once per alert for critical/warning tiers. Surfaced as a bell icon in the header (next to the error log button, only shown once you have games) with a red/amber badge count and a dropdown panel — tapping an alert's action button routes you to the right tab (Stats for budget/goals, Up Next for queue) or opens the relevant game's detail sheet. No changes to `lib/types.ts`, the storage/repository layer, or any existing function's signature — `getActiveAlerts` only calls existing exports. Verified with a clean `npm run build` (Next 14.2.35, 11/11 static pages) and `npm run lint` (zero new warnings — confirmed no matches for the new files in the full lint output); no headless browser is available in this sandbox, so the 375px mobile/console check was substituted with a dev-server HTTP 200 fetch of `/apps/game-analytics` showing a clean compile and no server-side errors, plus manual review of the responsive Tailwind classes used (`w-[320px] max-w-[90vw]`, `max-h-[70vh]`).

FOLLOW-UP: Could add an alert for "On This Day"-style anniversaries and for trophy/milestone proximity (e.g., "3 hours from Century Club"), and could let users mute a whole alert category from a small settings affordance in the panel itself.

## 2026-06-19 09:00 — Games Tab — Live Session Timer ("Now Playing" bar)

**Files**: app/apps/game-analytics/hooks/useLiveSession.ts, app/apps/game-analytics/components/LiveSessionBar.tsx, app/apps/game-analytics/lib/format.ts, app/apps/game-analytics/page.tsx, app/apps/game-analytics/components/GameBottomSheet.tsx, UPDATE.md, app/apps/game-analytics/data/whats-new.json
**Risk**: not risky

Logging play time has always been after-the-fact (manual hour entry once you're done). Added a persistent, global live session timer: `useLiveSession()` stores a single active timer in localStorage (`ga-live-session-v1`) with a `firstStartedAt` (set once, used to date the eventual PlayLog) separate from `startedAt` (reset on every resume, used to compute live elapsed time), so pause/resume cycles spanning midnight still log against the correct date. A new floating `LiveSessionBar` (Tailwind-only, no new keyframes — `app/globals.css` is out of scope) renders a Spotify-style "Now Playing" pill with a live `formatClock()` readout and pause/resume/stop controls; tapping stop expands it into a "Stop & Log Session" sheet that pre-fills hours (rounded to the nearest 0.1h from live elapsed time) and lets you tag a mood before saving into the existing PlayLog-append path. Wired a "Start Timer" entry point into all four places a session can begin: `NowPlayingCard`, `PosterCard`, `CompactCard`, and the `GameBottomSheet` detail panel — only one timer can run at a time, and active-game cards show a "Timing" state. No changes to `lib/types.ts`, the storage/repository layer, or any existing `calculations.ts` function. Verified with a clean `npm run build` (Next 14.2.35, 11/11 static pages) and `npm run lint` (no new warnings); no headless browser is available in this environment, so the 375px mobile check was substituted with a full manual diff review plus a dev-server HTTP 200 fetch of `/apps/game-analytics` showing a clean compile.

FOLLOW-UP: Could surface elapsed live-session time as a subtle pulse on the corresponding game's card itself (beyond the bar), and could let the timer survive a full browser/tab close notification ("you left a timer running") via a visibility-change listener.

## 2026-06-18 20:14 — Games Tab — Budget Impact Preview in Add/Edit Game

**Files**: app/apps/game-analytics/lib/calculations.ts, app/apps/game-analytics/components/GameForm.tsx, app/apps/game-analytics/page.tsx, UPDATE.md, app/apps/game-analytics/data/whats-new.json
**Risk**: not risky

Yearly budgets (`useBudget`/`BudgetSettings`) have existed in the Stats tab for a while, but the budget was invisible at the exact moment it mattered most: while actually entering a purchase. Added a `getBudgetImpactPreview()` pure function (price, purchase date, all games, budgets → year/budget amount/spend before & after/percent used/overage) and wired it into `GameForm` as a live "Budget Impact Preview" card — shown whenever you're entering a price for an owned, non-free game and a budget exists for that purchase's year. A two-segment progress bar (existing spend in white, this purchase's slice in green/amber/red) and a one-line readout ("$142.50 left after this purchase" or "$30.00 over budget") update as you type, before you ever hit save. Purely additive: no changes to the budget storage layer, `GameRepository`, or any existing calculation function. Verified with `npm run build` and `npm run lint` (zero new errors/warnings), and a dev-server smoke test confirmed `/apps/game-analytics` compiles and serves cleanly with no console errors.

FOLLOW-UP: Could surface the same preview in the Buy Queue / Backlog Triage flows wherever a price is entered, and could add a one-tap "bump this year's budget by $X" shortcut right from the over-budget state.

## 2026-06-18 07:30 — Games Tab — Bulk Import (CSV/JSON)

**Files**: app/apps/game-analytics/lib/import-service.ts, app/apps/game-analytics/components/ImportModal.tsx, app/apps/game-analytics/page.tsx, UPDATE.md, app/apps/game-analytics/data/whats-new.json
**Risk**: not risky

`ExportPanel.tsx` has shipped CSV/JSON export for a long time, but there was no way back in — no import path existed anywhere in the app, so a user's only on-ramp was typing every game into `GameForm` by hand. Added a new "Import games" entry to the ⋮ More menu, opening `ImportModal.tsx`: pick a `.csv`/`.json` file or paste CSV text, see a parsed preview with per-row checkboxes (rows matching an existing library name are flagged "already in library" and unchecked by default), then import. `lib/import-service.ts` hand-rolls an RFC4180-ish CSV parser (handles quoted fields with embedded commas/newlines) plus a header-alias map so it accepts both the app's own export headers and free-form spreadsheet headers (`Game`/`Title` → name, `Cost` → price, etc.), and a JSON parser that accepts either the app's own `{games:[...]}` export shape or a bare array. Only `name` is required — every other field is optional and defaults sensibly. Imports loop sequential `addGame()` calls through the existing `useGames` hook (no changes to `lib/storage.ts`, `GameRepository`, or `calculations.ts`), so risk is contained to two new self-contained files plus four additive lines in `page.tsx`. Verified end-to-end with Playwright at 375px width: pasted a 2-row CSV, confirmed the preview parsed both rows correctly, imported, and confirmed the games appeared in the live library with full card rendering, stats, and value ratings — zero console errors (the one pre-existing RAWG-thumbnail-fetch network warning is unrelated and occurs for any newly added game in this sandboxed environment).

FOLLOW-UP: Could add a "skip duplicates automatically" toggle, or support direct re-import of a previously exported JSON backup as a full restore (currently it's additive-only — re-importing doesn't update existing games' play logs).

## 2026-06-18 01:30 — Stats Tab — Social Gaming Breakdown

**Files**: app/apps/game-analytics/lib/calculations.ts, app/apps/game-analytics/components/PlayLogModal.tsx, app/apps/game-analytics/components/AnalyticsPanel.tsx, UPDATE.md, app/apps/game-analytics/data/whats-new.json
**Risk**: not risky

`PlayLog.context` (`solo | co-op | online | couch-co-op | stream`) has existed on the data model since the session-tagging feature shipped, but nothing in the app ever set it or read it. Added a "Who'd you play with?" tag picker to the play-session logging modal (alongside the existing Mood and Vibe tags) and a new `getSocialGamingStats()` pure function that turns tagged sessions into a solo-vs-social hours split, a per-context breakdown, and a one-line insight ("62% of your tagged hours are social" / your go-to co-op game). Surfaced as a new "Social Gaming Breakdown" section in the Stats tab's Analytics panel, with a helpful empty state for users who haven't tagged any sessions yet.

FOLLOW-UP: Could feed `getGameChemistry()`'s "Mood Momentum" factor with this context data once enough users have tagged sessions.

## 2026-06-18 00:00 — Games Tab — Backlog Triage

**Files**: app/apps/game-analytics/lib/calculations.ts, app/apps/game-analytics/components/BacklogTriageModal.tsx, app/apps/game-analytics/page.tsx, UPDATE.md, app/apps/game-analytics/data/whats-new.json
**Risk**: not risky

Added a "Backlog Triage" flow accessible via the ⋮ command menu (badge shows the count of games needing a decision). A new pure function, `getBacklogTriageCandidates()`, surfaces every owned, unstarted-or-in-progress game whose shelf life isn't "thriving" — built entirely from the existing `getShelfLifeExpiry()` and `getRelationshipStatus()` calculations — sorted worst-first (expired → critical → at risk → stable). `BacklogTriageModal.tsx` presents these one at a time, Tinder-card style, with three swipe-style actions: Queue it (adds to Up Next via the existing queue hook), Let it go (marks Abandoned), or Snooze (hides the game from triage for 21 days via a localStorage map, `ga-triage-snoozed`). A completion screen tallies the session's decisions and the hours/spend finally resolved. Tapping a card opens its full detail sheet without leaving the flow.

FOLLOW-UP: Could add an "undo" toast after each decision in case of a mis-swipe.

## 2026-06-17 00:18 — Stats Tab — Activated Gaming Goals & Challenges

**Files**: app/apps/game-analytics/components/StatsView.tsx, UPDATE.md, app/apps/game-analytics/data/whats-new.json
**Risk**: not risky

Wired up the fully-built but completely orphaned Gaming Goals feature (`GoalsPanel.tsx`, `useGoals.ts`, `goals-storage.ts`) into the Stats tab. Users can now set personal goals — completion count, spending limit, hours target, genre variety, backlog clearance, or a custom metric — with live progress bars, start/end dates, and a collapsible history of past goals (completed/failed/archived). No new types or storage logic were needed; everything already existed, it just had no UI entry point until now.

FOLLOW-UP: The Firestore security rules documented in CLAUDE.md don't yet include a `gamingGoals` rule — logged-in users currently fall back through HybridRepository's Firebase path without an explicit rule entry; this should be added in the Firebase console.

## 2026-06-10 12:00 — Games Tab — Play Tonight Smart Recommender

**Files**: app/apps/game-analytics/components/PlayTonightModal.tsx, app/apps/game-analytics/page.tsx, app/apps/game-analytics/data/whats-new.json
**Risk**: not risky

Added a "Play Tonight" modal accessible via the ⋮ command menu on the Games tab. It ranks every owned, unfinished game against four time windows (Quick/Standard/Long/Marathon) using the existing chemistry score plus a session-length fit bonus and momentum signals. The top result gets a hero card with a prominent reason sentence; four runner-ups appear in a compact ranked list. Tapping any result opens the game's detail sheet so the user can log time immediately.

FOLLOW-UP: Could persist the last-used time slot in localStorage so the preferred window is pre-selected on next open.

## 2026-06-01 06:00 — Game Detail — Head-to-Head Game Comparison

**Files**: app/apps/game-analytics/components/GameCompareModal.tsx, app/apps/game-analytics/components/GameBottomSheet.tsx, app/apps/game-analytics/page.tsx, app/apps/game-analytics/data/whats-new.json
**Risk**: not risky

Added a head-to-head comparison modal accessible from the game detail bottom sheet via a new ⇄ button. Users pick any second game from their library through a searchable list, then see a full side-by-side stats table (price, hours, rating, cost-per-hour, ROI, sessions) with per-category winner highlighting, a recharts RadarChart plotting both games across five normalised axes, and an overall verdict. Relationship status cards for each game are shown at the bottom.

FOLLOW-UP: Could add a "swap games" button to quickly flip which game is game1/game2, or persist recent comparison pairs.

## 2026-06-01 00:00 — Stats Tab — What-If Simulator

**Files**: app/apps/game-analytics/lib/calculations.ts, app/apps/game-analytics/components/WhatIfSimulator.tsx, app/apps/game-analytics/components/StatsView.tsx
**Risk**: not risky

Added an interactive "Alternate Reality Simulator" to the Stats tab with four thought-provoking scenarios: skipping impulse buys, never buying games you later abandoned, completing your backlog, and buying on sale vs. full price. Each scenario shows a before/after stat comparison, the specific games affected (with thumbnails), and a punchy insight tailored to the user's data. Users with messy buying habits will see high-impact warnings; users with clean habits get positive confirmation.

FOLLOW-UP: Could add a 5th scenario — "only bought games rated 7+" — showing the hypothetical quality-filtered library.

## 2026-05-22 18:00 — Games Tab — Game search bar

**Files**: app/apps/game-analytics/page.tsx
**Risk**: not risky

Added a full-width search bar to the Games tab that filters by name, genre, platform, franchise, and notes. Shows a live result count ("3 of 42 games") while typing, an X to clear, and a helpful empty state with a "Clear search" link when no games match. Users with large libraries can now find any game instantly without scrolling.

FOLLOW-UP: Consider adding keyboard shortcut (Cmd/Ctrl+K) to focus the search bar, and optionally persist the search query across tab switches.

## 2026-05-22 14:00 — Infrastructure — Bootstrap update logs surface

**Files**: UPDATE.md, app/apps/game-analytics/data/whats-new.json, app/apps/game-analytics/components/WhatsNewModal.tsx, app/apps/game-analytics/page.tsx
**Risk**: not risky

Bootstrapped the continuous-improvement loop: created this log file, a
user-facing `whats-new.json` data file, a "What's New" modal, and a header
button to open it. The cron agent will append to both `UPDATE.md` (technical,
this file) and `whats-new.json` (user-friendly) each run.

FOLLOW-UP: First feature-loop run should pick the highest-value improvement.
