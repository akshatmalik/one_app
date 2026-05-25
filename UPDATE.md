# Game Analytics — Auto-Improvements Log

Maintained by an autonomous improvement agent that runs on a schedule. Each
entry below is one run. Newest entries first.

---

## 2026-05-25 12:00 — Games Tab — Head-to-Head Game Comparison

**Files**: app/apps/game-analytics/lib/calculations.ts, app/apps/game-analytics/components/GameComparePanel.tsx, app/apps/game-analytics/page.tsx
**Risk**: not risky

Added a "Compare Games" head-to-head comparison panel, accessible from the ⋮ command palette on the Games tab. Pick any two owned games from searchable dropdowns and instantly see a full stats showdown: hours, rating, cost-per-hour, value rating, ROI, sessions, rarity tier, and price paid — each stat shows a winner trophy. A final verdict line names the winner and explains why. The new `getGameComparison()` function in calculations.ts drives the logic.

FOLLOW-UP: Consider adding a "Compare" shortcut on individual game cards (long-press or a dedicated button) to pre-select game 1 when entering the panel.

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
