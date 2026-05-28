# Game Analytics — Auto-Improvements Log

Maintained by an autonomous improvement agent that runs on a schedule. Each
entry below is one run. Newest entries first.

---

## 2026-05-28 — Goals — Goals tab with smart suggestions

**Files**: app/apps/game-analytics/lib/calculations.ts, app/apps/game-analytics/components/GoalsTab.tsx, app/apps/game-analytics/page.tsx
**Risk**: not risky

Added a Goals tab (Target icon, second row of navigation) that surfaces the previously hidden GoalsPanel — a fully-built 630-line component with its own storage layer that had no entry point in the UI. The tab shows three header stats (active goals, completed this year, days until nearest deadline with urgency colour), a "Suggested for You" section powered by new `getSmartGoalSuggestions()` logic that analyses the user's real data (completion velocity, 30-day play pace, monthly spend average, genre count, backlog size) to generate up to 5 pre-filled goal cards, and the full GoalsPanel for manual goal creation and progress tracking. Each suggestion has a one-tap "Add" button that persists the goal and marks the card as added instantly.

FOLLOW-UP: Add a badge/indicator dot on the Goals tab icon when a goal deadline is within 7 days; surface the nearest active goal's progress as a mini bar on the main header stats row.

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
