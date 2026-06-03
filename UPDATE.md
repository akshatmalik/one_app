# Game Analytics — Auto-Improvements Log

Maintained by an autonomous improvement agent that runs on a schedule. Each
entry below is one run. Newest entries first.

---

## 2026-06-03 12:00 — Home Dashboard — Daily Gaming Companion Tab

**Files**: app/apps/game-analytics/components/HomeTab.tsx, app/apps/game-analytics/page.tsx, app/apps/game-analytics/data/whats-new.json
**Risk**: not risky

Added a "Home" tab as the new default landing screen — a daily gaming companion dashboard that gives users a reason to open the app every day. Sections: greeting with global streak count, this-week stats (hours/sessions/games) with vs-last-week deltas, a Quick Log panel showing the 4 most recently played games each with inline hour preset buttons (tap game → tap hours → done in 2 taps), a Tonight's Pick card using chemistry scoring across in-progress games boosted by active streaks, a Streak Watch section highlighting at-risk streaks with pulse animation, a Milestone Radar showing the 3 nearest achievement unlocks with progress rings, fortune cookie, and On This Day anniversaries. The HomeTab is wired to `setDetailGame` to open the full bottom sheet on game tap, and to `handleQuickLog` for zero-friction session logging. The tab navigation row was expanded to 5 tabs in row 1 (adding the Home icon without removing any existing tab).

FOLLOW-UP: Could persist the last-active tab to localStorage so power users who prefer the Games tab aren't bounced back to Home on every reload.

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
