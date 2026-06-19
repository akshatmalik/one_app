# Game Analytics — Auto-Improvements Log

Maintained by an autonomous improvement agent that runs on a schedule. Each
entry below is one run. Newest entries first.

---

## 2026-06-19 00:22 — Global Header — Notification Center / Alerts Inbox

**Files**: app/apps/game-analytics/lib/calculations.ts, app/apps/game-analytics/components/GoalsPanel.tsx, app/apps/game-analytics/page.tsx, app/apps/game-analytics/components/NotificationCenter.tsx (new), UPDATE.md, app/apps/game-analytics/data/whats-new.json
**Risk**: not risky

The app had accumulated several independent "you should know about this" signals — budget pace (`useBudget`), queue shame tiers (`getQueueShameData`), backlog triage candidates (`getBacklogTriageCandidates`), gaming goal deadlines (`useGoals`), and near-miss milestones (`getNextMilestone`) — but each only surfaced if you happened to be on the right tab or opened the right menu. Added a bell icon to the global header (visible on every tab) backed by a new `getAlertFeed(games, budgets, goals)` in `lib/calculations.ts`, which composes all five sources into one severity-sorted (`high`/`medium`/`low`) list of `AlertItem`s — budget exceeded/90%/75% thresholds, the top 3 most-embarrassing queued games, one backlog-triage summary alert, goal alerts for goals nearing their deadline/nearly complete/expired, and the top 3 in-progress games within 3 sessions of their next milestone. `components/NotificationCenter.tsx` renders the badge count (color matches highest severity present) and a dropdown feed; tapping an alert's action button routes to the right place (opens Backlog Triage, opens a game's detail sheet, or jumps to the Stats tab) and each alert can be dismissed individually or all at once, persisted for 24h via a `ga-alert-dismissed` localStorage map (same pattern as the existing triage-snooze map). Extracted the goal-progress math that used to live only inside `GoalsPanel.tsx` into a shared `getGoalProgress()` export so the new alert feed and the existing Goals panel use the identical calculation — no behavior change for the Goals panel itself. Dismiss buttons are always visible (not hover-gated), matching the project's mobile-first card guidance. Verified with `npm run build` (clean) and `npm run lint` (zero new errors/warnings — all pre-existing issues are in unrelated mini-apps), and a dev-server smoke test confirmed `/apps/game-analytics` compiles and serves with no SSR/console errors.

FOLLOW-UP: Could add a "notification preferences" toggle to mute specific alert categories, and could push the same `getAlertFeed()` data into the Daily Fortune Cookie / header area for a non-dismissible "most urgent thing today" callout.

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
