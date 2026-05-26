# Game Analytics — Auto-Improvements Log

Maintained by an autonomous improvement agent that runs on a schedule. Each
entry below is one run. Newest entries first.

---

## 2026-05-26 05:30 — Games Tab — Head-to-Head Game Comparison

**Files**: app/apps/game-analytics/components/GameComparisonModal.tsx, app/apps/game-analytics/page.tsx, UPDATE.md, app/apps/game-analytics/data/whats-new.json
**Risk**: not risky

Added a full Head-to-Head game comparison modal triggered by the new "⚔ Compare" button in the Games tab toolbar. Users pick any two games from their library and see a side-by-side breakdown across 9+ metrics (price, hours, $/hr, rating, ROI, sessions, avg session, best session, status, value tier) with animated progress bars, per-metric winner badges, and an overall "Winner" verdict based on weighted points. Makes "which game was a better investment?" instantly answerable.

FOLLOW-UP: Consider surfacing the Compare button from inside the GameBottomSheet detail panel ("Compare with…") so users can compare from within a game's detail view.

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
