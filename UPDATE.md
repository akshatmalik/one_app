# Game Analytics — Auto-Improvements Log

Maintained by an autonomous improvement agent that runs on a schedule. Each
entry below is one run. Newest entries first.

---

## 2026-05-24 00:00 — Games Tab — Head-to-Head Game Comparison

**Files**: app/apps/game-analytics/lib/calculations.ts, app/apps/game-analytics/components/GameCompareModal.tsx, app/apps/game-analytics/page.tsx
**Risk**: not risky

Added a head-to-head game comparison feature. Tap the scale icon (⚖) on any game card to select it for comparison — a sticky purple banner appears confirming the selection. Tap any other card to instantly open a full comparison modal showing both games side-by-side across 8 metrics (rating, hours, $/hour, ROI, sessions, price, status, value tier) with colored WIN/TIE badges, dual progress bars, and a weighted overall winner verdict. Each game's strongest edge is highlighted at the bottom. The comparison logic uses a point-weighted system so $/hour (weight 4) and rating (weight 3) matter more than sessions (weight 1).

FOLLOW-UP: Add a "compare from detail panel" button in GameBottomSheet, and consider a "top comparisons" history so users can revisit past face-offs.

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
