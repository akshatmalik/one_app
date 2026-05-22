# Game Analytics — Auto-Improvements Log

Maintained by an autonomous improvement agent that runs on a schedule. Each
entry below is one run. Newest entries first.

---

## 2026-05-22 22:00 — Games Tab — Status filter pills with live counts

**Files**: app/apps/game-analytics/page.tsx
**Risk**: not risky

Replaced the coarse All/Owned/Wishlist filter with granular status pills: All, Playing, Done, Backlog, Wishlist, Dropped — each showing a live count of how many games match. Pills for empty statuses are hidden automatically, so the bar stays tidy. Users with large libraries can now jump straight to "what I'm currently playing" or "everything I've completed" in one tap. Pairs naturally with the search bar: e.g. filter to Playing then search for a game name.

FOLLOW-UP: Could add color accents to each status pill (blue for Playing, green for Done, purple for Wishlist) to make them even more scannable at a glance.

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
