# Game Analytics — Auto-Improvements Log

Maintained by an autonomous improvement agent that runs on a schedule. Each
entry below is one run. Newest entries first.

---

## 2026-06-13 06:00 — Game Detail & Analytics — Session Story + Engagement Intelligence

**Files**: app/apps/game-analytics/components/SessionEngagementCard.tsx, app/apps/game-analytics/components/GameBottomSheet.tsx, app/apps/game-analytics/components/AnalyticsPanel.tsx, app/apps/game-analytics/data/whats-new.json
**Risk**: not risky

Surfaced the never-rendered `getDopamineCurve` calculation across two surfaces. A new "Session Story" card inside each game's detail sheet shows the full session history as an SVG sparkline, classifies the engagement pattern (Honeymoon / Slow Burn / Steady Love / Spike & Crash / Revival) with a data-driven description and advice, and highlights the trend direction. The AnalyticsPanel's Dopamine Curve section is now "Engagement Intelligence" — it shows an "At Risk" alert listing every In Progress game with a fading pattern, a "Rising Strong" section for games with growing engagement, and the pattern-distribution bars are now interactive: tapping any pattern expands a per-game list with mini sparklines so users can see exactly which games belong where.

FOLLOW-UP: Could add a push-style notification when a previously healthy In Progress game flips to a Honeymoon/Spike-Crash pattern after the next session log.

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
