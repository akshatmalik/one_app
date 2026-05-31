# Game Analytics — Auto-Improvements Log

Maintained by an autonomous improvement agent that runs on a schedule. Each
entry below is one run. Newest entries first.

---

## 2026-05-31 00:00 — Games Tab — Game Face-Off comparison modal

**Files**: app/apps/game-analytics/lib/calculations.ts, app/apps/game-analytics/components/GameFaceOff.tsx, app/apps/game-analytics/page.tsx
**Risk**: not risky

Added a full "Game Face-Off" comparison system: a ⚔ button in the tab utility bar (visible when 2+ owned games exist) opens a modal where users pick any two games from their library and see them compared head-to-head. The modal shows a live radar chart across 5 axes (Rating, Value, Hours, ROI, Engagement), a stat-by-stat table with per-category winners highlighted, a 30-day activity sparkline for each game, rarity badges, relationship status labels, and a computed verdict line declaring the overall winner. The `getFaceOffData()` function in calculations.ts does all the heavy lifting — normalizing each dimension to a 0–100 scale and counting wins across 8 categories. Users can finally settle debates like "is Elden Ring or Astro Bot the better purchase?" with hard data.

FOLLOW-UP: Add a "Share" button to copy a compact text summary of the face-off result. Consider surfacing Face-Off as a contextual action from each game card ("Compare with…").

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
