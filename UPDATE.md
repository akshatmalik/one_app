# Game Analytics — Auto-Improvements Log

Maintained by an autonomous improvement agent that runs on a schedule. Each
entry below is one run. Newest entries first.

---

## 2026-05-25 12:00 — Stats Tab — Alternate Realities: What-If Simulator

**Files**: app/apps/game-analytics/lib/calculations.ts, app/apps/game-analytics/components/WhatIfSimulator.tsx, app/apps/game-analytics/components/StatsView.tsx
**Risk**: not risky

Built a full interactive "Alternate Realities" What-If Simulator in the Stats tab. Five scenarios show how your library stats would look under different purchasing and playing decisions: (1) skipping games you barely played, (2) an adjustable rating-filter threshold showing how much low-rated games cost you, (3) what discounts have actually saved you, (4) how $/hr would improve if you cleared your backlog, and (5) a daily-habit slider projecting how playing X extra hours/day changes value. Scenarios 2 and 5 include interactive sliders. Added five new pure calculation functions (`whatIfSkippedUnplayed`, `whatIfOnlyHighRated`, `whatIfBoughtAtFullPrice`, `whatIfCompletedBacklogScenario`, `whatIfPlayedMorePerDay`) with a richer `WhatIfScenarioData` return type.

FOLLOW-UP: Could add a "combine scenarios" mode that shows the cumulative impact of selecting multiple scenarios at once.

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
