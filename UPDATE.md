# Game Analytics — Auto-Improvements Log

Maintained by an autonomous improvement agent that runs on a schedule. Each
entry below is one run. Newest entries first.

---

## 2026-06-02 00:00 — Games Tab — Game Showdown (head-to-head comparison)

**Files**: app/apps/game-analytics/lib/calculations.ts, app/apps/game-analytics/components/GameCompareModal.tsx, app/apps/game-analytics/page.tsx
**Risk**: not risky

Added a "Game Showdown" head-to-head comparison modal, accessible via the ⋮ menu → "Compare Games". Pick any two games from your library and see them battle across 6 stats (hours, rating, cost/hour, sessions, ROI, price paid) with animated dual-bar visualisations, a per-metric winner indicator, an overall score, 5 verdict badges, and a plain-English narrative summary. The winner's panel is highlighted in color (blue vs purple), with a trophy icon. A swap button lets you flip the matchup.

FOLLOW-UP: Could add a "Share" screenshot export of the comparison card, or surface a "Compare" shortcut directly on individual game cards.

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
