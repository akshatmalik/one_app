# Awards Redesign

## Overview

The awards system has one hub (**AwardsHub**) for user picks and shows results in story mode recaps. There is no separate "Oscar hub" — everything lives in one place.

---

## Architecture

```
AwardsHub (modal)
  └── GamingAwardsScreen (redesigned, per-category step flow)
        ├── Category 1: nominees → pick → reveal → collect
        ├── Category 2: nominees → pick → reveal → collect
        └── ...

Story mode recaps (Week / Month / Quarter / Year)
  └── AwardsSummaryCard (results only, links back to AwardsHub)
```

---

## What Existed Before This Redesign

- **GamingAwardsScreen**: All categories on one scrollable page. Nominees in horizontal scroll per category. No reveal flow.
- **WeekStoryMode / MonthStoryMode**: Had Oscar-specific story slides (`AwardIntroScreen`, `SingleAwardScreen`, `OscarSummaryScreen`) generated from a parallel `getOscarAwards()` system that stored votes in `oscar-storage.ts` separately from `game.awards[]`.
- **oscar-storage.ts**: Separate localStorage storage for a different Oscar vote system — not connected to AwardsHub. Orphaned after this redesign.

---

## New Design: GamingAwardsScreen

### UX Flow (per-category step-through)

```
[Progress: 1 / 3]

GAME OF THE WEEK 🎮
"Your MVP. The game that owned this week."
[AI dramatic narrator loads async, replaces description when ready]

┌─────────────┐  ┌─────────────┐
│  [thumb]    │  │  [thumb]    │
│  Game A     │  │  Game B     │
│  12.5h · 3  │  │  8.2h · 5  │
│  sessions   │  │  sessions  │
└─────────────┘  └─────────────┘
┌─────────────┐  ┌─────────────┐
│  [thumb]    │  │  [thumb]    │
│  Game C     │  │  Game D     │
│  5.0h · 2   │  │  3.1h · 1  │
│  sessions   │  │  session   │
└─────────────┘  └─────────────┘

  [Pick one to continue]
     ↓  (after pick)
  [🎁 Open Envelope]
     ↓  (after reveal)
  ┌─────────────────────────────┐
  │  YOU picked: Game A  ✓     │
  │  AI thought: Game B  🤖    │
  │  "AI's reasoning line"     │
  └─────────────────────────────┘
  [🏆 Collect Award · Next →]
```

### Phase States (per category)

| Phase    | Trigger                  | UI                                            |
|----------|--------------------------|-----------------------------------------------|
| `pick`   | Default on category load | 2-col nominee grid, all cards tappable        |
| `reveal` | User taps a nominee      | "Open Envelope" button appears                |
| `shown`  | User taps Open Envelope  | AI badge on nominees[0], You badge on pick    |
| `collected` | User taps Collect     | Advances to next category                     |

### AI Pick Logic

The top nominee (`nominees[0]`) in each `AwardCategoryDef` is the data-calculated best pick (already sorted by relevant metric in `award-categories.ts`). This is framed as "AI's pick."

If user picks nominees[0] too → "You and the AI agreed!" message.

### Descriptions

- **Template**: `category.description` shown immediately (already in AwardCategoryDef)
- **AI dramatic narrator**: `narrative.pitches[cat.id]` from existing `generateAwardNarrative()` call. When loaded, shown as italic text replacing/supplementing the template description.

### Nominee Card (2-column grid)

```
┌──────────────────┐
│                  │  ← thumbnail, full width, ~100px tall
│   [thumbnail]    │     (Gamepad2 placeholder if none)
│                  │
├──────────────────┤
│ Game Name        │  ← font-bold, truncate
│ 12.5h · 3 sess  │  ← reasonLine, small grey text
│ [AI] or [You]   │  ← badge shown post-reveal only
└──────────────────┘
```

State classes:
- **Unselected**: `border-white/8 bg-white/3`
- **Selected (pre-reveal)**: tier border glow + `bg-gradient-to-b` tier bg
- **AI pick (post-reveal, index 0)**: purple badge "AI 🤖"
- **User pick (post-reveal)**: tier-color badge "You ✓"
- **Agreed (same card)**: gold badge "🤝 You both agreed"

### Navigation

- Progress indicator at top: e.g. `● ○ ○` dots or `1 / 3`
- No back navigation (collect-and-advance only)
- Final summary screen shown after last category is collected

### Summary Screen (after all collected)

Replace current "Completion message" footer with a proper summary at the end:
- All picks listed with thumbnail, category icon, game name
- Scroll count: "You and AI agreed on X / N"
- Tier-colored completion header

---

## Story Mode Recaps

### Principle

Story mode shows **results only** — what you picked, whether AI agreed, links to AwardsHub for ceremony.

### Week Recap (WeekStoryMode.tsx)

**Remove**: `AwardIntroScreen`, `SingleAwardScreen`, `OscarSummaryScreen` imports and all Oscar ceremony logic.

**Keep**: `AwardsSummaryCard` screen already in the story — shows picks for 3 week categories, links to AwardsHub.

The `AwardsSummaryCard` receives picks from `useAwards` (game.awards[]) via `getPicksForPeriod()`.

### Month Recap (MonthStoryMode.tsx)

Same — remove Oscar ceremony slides, keep `AwardsSummaryCard` for 7 month categories.

### Quarter Recap

`QuarterAwardsModal.tsx` exists but no QuarterStoryMode exists yet. Out of scope for this redesign — when a quarter story mode is built, include `AwardsSummaryCard` for 8 categories.

### Year Recap

`YearAwardsModal.tsx` exists but no YearStoryMode. Same — out of scope for now, noted for future.

---

## Files Changed

| File | Change |
|------|--------|
| `components/GamingAwardsScreen.tsx` | Full redesign: per-category step flow, 2-col grid, pick→reveal→collect |
| `components/WeekStoryMode.tsx` | Remove Oscar slides, keep AwardsSummaryCard |
| `components/MonthStoryMode.tsx` | Remove Oscar slides, keep AwardsSummaryCard |
| `lib/oscar-storage.ts` | Orphaned — keep file but no new usage (AwardsHub uses game.awards[]) |
| `story-screens/AwardIntroScreen.tsx` | Orphaned — no longer used in story modes |
| `story-screens/SingleAwardScreen.tsx` | Orphaned — no longer used in story modes |
| `story-screens/OscarSummaryScreen.tsx` | Orphaned — no longer used in story modes |

---

## Not Changed

- `AwardsHub.tsx` — outer modal shell unchanged; still handles period tabs + period list
- `award-categories.ts` — nominees generation unchanged
- `useAwards.ts` — storage in game.awards[] unchanged
- `AwardsSummaryCard.tsx` — results display unchanged
- `QuarterAwardsModal.tsx` / `YearAwardsModal.tsx` — unchanged (separate modals, not story mode)
