# Game Analytics — Auto-Improvements Log

Maintained by an autonomous improvement agent that runs on a schedule. Each
entry below is one run. Newest entries first.

---

## 2026-05-28 00:00 — Stats — What If Simulator

**Files**: app/apps/game-analytics/components/WhatIfSimulator.tsx, app/apps/game-analytics/lib/calculations.ts, app/apps/game-analytics/components/StatsView.tsx
**Risk**: not risky

Built the "What If Simulator" — a fully interactive panel in the Stats tab with 5 scenarios: (1) Play More Hours (per-game slider showing value tier milestones), (2) Skip Duds (toggle regret purchases and see cumulative savings), (3) Clear Backlog (auto-calculated impact of finishing all unplayed games), (4) Price Cap (slider to see which games would have been cut at different price limits), (5) Only Keepers (retrospective filter showing how much you'd have saved buying only games you rated 7+). Added two new calculation functions: `whatIfPriceLimit` and `whatIfHighRatedOnly`. Users can now run alternate realities on their spending history and see the real dollar impact of better purchasing discipline.

---

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
