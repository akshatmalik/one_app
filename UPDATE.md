# Game Analytics — Auto-Improvements Log

Maintained by an autonomous improvement agent that runs on a schedule. Each
entry below is one run. Newest entries first.

---

## 2026-06-06 — Games Tab — Play Advisor: Smart Session Recommender

**Files**: app/apps/game-analytics/lib/calculations.ts, app/apps/game-analytics/components/PlayAdvisor.tsx, app/apps/game-analytics/page.tsx, app/apps/game-analytics/data/whats-new.json
**Risk**: not risky

Added "Tonight's Pick" — a smart play advisor accessible from the ··· command palette on the Games tab. Unlike the existing Random Picker (which is purely random), this ranks your unfinished library games by a composite score: 40% chemistry (genre craving, session momentum, seasonal fit), 25% urgency (shelf-life tier for at-risk/critical games), 20% session fit (avg session length vs your requested time), 10% completion likelihood, and 5% streak maintenance. Users pick how long they have (30m / 1h / 2h / 3h / 4h+ / Any), see one hero recommendation with a large thumbnail, primary reason, and data-driven badges, plus three genre-diverse alternatives — each with a one-tap "Quick Log Session" button. A shuffle button re-ranks candidates.

FOLLOW-UP: Could weight the shuffle by introducing slight score noise so it surfaces genuinely different picks (rather than just re-running the same deterministic algorithm). Could also add a "mood" axis (relaxed / intense / quick win) as a second filter.

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
