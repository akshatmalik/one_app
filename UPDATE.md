# Game Analytics — Auto-Improvements Log

Maintained by an autonomous improvement agent that runs on a schedule. Each
entry below is one run. Newest entries first.

---

## 2026-05-31 — Games Tab — Game Showdown head-to-head comparison

**Files**: app/apps/game-analytics/components/GameCompareModal.tsx, app/apps/game-analytics/page.tsx
**Risk**: not risky

Added a "⚔️ Compare" button to the Games tab toolbar that opens a new Game Showdown modal. Users pick any two owned games from a searchable list, then see a full head-to-head stat breakdown: rating, total hours, cost/hour, ROI, sessions, avg session, price paid, completion status, and current streak — each stat labeled with its winner. A weighted scoring system tallies the results and generates a contextual verdict narrative (e.g., "Elden Ring wins on both enjoyment and value — a clear champion"). The overall winner is highlighted with an amber trophy style at the bottom.

FOLLOW-UP: Consider adding the ability to share or screenshot a comparison card, or surface "Compare" as a card-level action on each game.

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
