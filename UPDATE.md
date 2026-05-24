# Game Analytics — Auto-Improvements Log

Maintained by an autonomous improvement agent that runs on a schedule. Each
entry below is one run. Newest entries first.

---

## 2026-05-24 — Games Tab — Head-to-head game comparison

**Files**: app/apps/game-analytics/components/GameCompareModal.tsx (new), app/apps/game-analytics/page.tsx, app/apps/game-analytics/components/StatsView.tsx
**Risk**: not risky

Added a full head-to-head comparison feature: click "⇌ Compare" in the Games toolbar to enter compare mode, then tap any two games to see them matched across 6 categories (Hours Played, Rating, Cost/hr, ROI Score, Sessions Logged, Price Paid) with animated percentage bars, a per-category trophy for the winner, and an overall verdict ("dominates" / "edges it" / "dead heat"). Also wired the existing GoalsPanel component — which had been built but never rendered — into the Stats tab.

FOLLOW-UP: Consider adding a "Compare with…" button in the Game Detail bottom sheet so users can compare from a specific game's context.

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
