# Racing Bar Chart Timeline & Additional Feature Ideas

Comprehensive documentation of the Racing Bar Chart Timeline, alternative timeline visualization concepts, and additional feature ideas for Game Analytics. Approved 2026-02-18.

---

## Table of Contents

1. [Racing Bar Chart Timeline](#racing-bar-chart-timeline)
2. [Alternative Timeline Concepts](#alternative-timeline-concepts)
3. [Additional Feature Ideas](#additional-feature-ideas)

---

## Racing Bar Chart Timeline

### Overview

A cinematic, animated "racing" horizontal bar chart that replays your gaming history over time. Inspired by the popular "bar chart race" format seen in data visualization videos — bars grow, shrink, overtake each other, and jockey for position as time advances. Each bar represents a game, and the chart shows cumulative hours played animating forward through time.

This is the **hero visualization** for the Timeline tab — a dramatic, watchable replay of your entire gaming journey.

### Core Concept

The chart plays forward through time (month by month or week by week), with horizontal bars representing each game's cumulative hours. As time advances:
- New games appear (slide in from the left with 0 hours)
- Active games grow (bars extend to the right)
- Games overtake each other (bars swap vertical positions with smooth animations)
- Inactive games hold their position but stop growing
- The current date/period is prominently displayed and advances as the animation plays

The result is a living, breathing replay of your gaming history — you literally watch Elden Ring climb from nothing to #1, see that brief Cricket 24 obsession spike, watch Astro Bot rocket up the ranks in a week.

### Visual Design

```
┌─────────────────────────────────────────────────────────────┐
│                    March 2025                                │
│                                                             │
│  Elden Ring      ████████████████████████████████  89.2h    │
│  Cricket 24      ██████████████████████           67.5h    │
│  Astro Bot       ████████████████                 48.0h    │
│  Zelda: TotK     ███████████████                  45.3h    │
│  Persona 5       ██████████                       32.1h    │
│  Hades II        ████████                         24.8h    │
│  Starfield       ██████                           18.5h    │
│  Spider-Man 2    █████                            15.2h    │
│  FF7 Rebirth     ████                             12.0h    │
│  Balatro         ███                               8.4h    │
│                                                             │
│  [◀◀] [▶ Play] [▶▶]           ●────────────○──── Mar 2025  │
└─────────────────────────────────────────────────────────────┘
```

### Detailed Specifications

#### Bar Rendering
- **Bar color**: Each game gets a unique color, ideally extracted from its thumbnail (reuse `useGameColors` hook from Card Redesign plan) with fallback to a hash-based color palette
- **Bar height**: Fixed height per bar (~28-32px on mobile, ~36px on desktop)
- **Bar label**: Game name on the left (truncated if needed), cumulative hours on the right end of the bar
- **Game thumbnail**: Small circular avatar (20x20) at the left edge of each bar, next to the game name
- **Max bars visible**: Top 10 or 12 games at any given time frame. Games outside the top N slide out the bottom; games entering the top N slide in
- **Bar transitions**: Smooth CSS transitions or requestAnimationFrame for position swaps (vertical) and width growth (horizontal). Bars should feel weighty — slight ease-in-out, not linear

#### Time Progression
- **Granularity**: Month-by-month by default. Option to switch to week-by-week for more granular animation
- **Period display**: Large, prominent current period label (e.g., "March 2025") that updates as the animation advances
- **Speed**: Default ~1.5 seconds per month. Adjustable via speed control (0.5x, 1x, 2x, 3x)
- **Data source**: Cumulative hours calculated from `playLogs` dates + baseline `hours` field (baseline hours attributed to the game's `startDate` or `datePurchased` month)

#### Playback Controls
- **Play/Pause**: Central play button, toggles to pause when playing
- **Scrubber/Slider**: Horizontal timeline slider showing the full date range. Draggable to scrub to any point in time
- **Step Forward/Back**: Skip forward or back one period at a time
- **Speed Control**: 0.5x / 1x / 2x / 3x toggle buttons
- **Auto-pause at end**: Stops at the current month with a subtle "caught up" indicator

#### Animations & Polish
- **Entry animation**: When a game first appears (first play log or purchase), the bar slides in from the left with a subtle flash/glow — "a new challenger appears"
- **Overtake animation**: When a game passes another in cumulative hours and they swap positions, a brief highlight/pulse on the overtaking game. Optional: small "overtake" particle effect
- **Exit animation**: Games dropping out of the top N fade and slide down/out
- **Completion marker**: When a game's status changes to "Completed" during the timeline, show a brief checkmark/trophy icon on the bar
- **Milestone markers**: At key cumulative thresholds (50h, 100h), a brief sparkle on the bar

#### Responsive Design
- **Mobile**: Full-width bars, stacked vertically, touch-friendly scrubber. 8-10 bars visible
- **Tablet**: Same layout, slightly more bars (10-12)
- **Desktop**: Can show 12-15 bars, wider scrubber, more breathing room

### Data & Calculation Logic

#### Core Function: `getRacingBarChartData(games)`

Returns an array of time-stamped snapshots, each containing the cumulative hours for every game at that point in time.

```typescript
interface RacingBarFrame {
  period: string;            // "2024-01", "2024-02", etc.
  periodLabel: string;       // "January 2024", "February 2024", etc.
  games: RacingBarEntry[];   // Sorted by cumulative hours descending
}

interface RacingBarEntry {
  gameId: string;
  gameName: string;
  thumbnail?: string;
  cumulativeHours: number;
  hoursThisPeriod: number;   // Hours added in this specific period
  rank: number;              // 1-based rank by cumulative hours
  previousRank: number;      // Rank in previous frame (for detecting overtakes)
  isNew: boolean;            // First appearance in this frame
  status: GameStatus;        // Current status at this point in time
  justCompleted: boolean;    // Status changed to "Completed" in this period
  color: string;             // Bar color for this game
}
```

**Algorithm**:
1. Determine date range: earliest `datePurchased` or `playLog.date` to today
2. Generate period list (monthly or weekly depending on granularity)
3. For each period:
   a. Sum all `playLog.hours` up to and including this period for each game
   b. Add baseline `hours` (if no play logs, attribute to `startDate` or `datePurchased` month)
   c. Sort games by cumulative hours descending
   d. Assign ranks, detect overtakes by comparing to previous frame
   e. Flag new entries (first period with hours > 0)
   f. Flag completions (status changed to "Completed" based on `endDate`)
4. Return array of frames

**Files**: `getRacingBarChartData(games)` in `calculations.ts`

#### Supporting Function: `getRacingBarHighlights(frames)`

Post-process the frames to extract narrative highlights for optional overlay text:

```typescript
interface RacingBarHighlight {
  period: string;
  type: 'overtake' | 'new_entry' | 'milestone' | 'completion' | 'dominant_month';
  description: string;       // "Elden Ring overtakes Cricket 24 for #1"
  gameId: string;
}
```

**Files**: `getRacingBarHighlights(frames)` in `calculations.ts`

### Component Architecture

#### `components/RacingBarChart.tsx`

Main component. Manages:
- Animation state (playing, paused, current frame index)
- Playback speed
- Frame interpolation (smooth transitions between discrete frames)
- Responsive sizing

**Props**:
```typescript
interface RacingBarChartProps {
  games: GameWithMetrics[];
  granularity?: 'monthly' | 'weekly';
  maxBars?: number;          // Default 10
  autoPlay?: boolean;        // Start playing on mount
  className?: string;
}
```

**Internal state**:
- `currentFrameIndex: number` — which frame we're on
- `isPlaying: boolean` — animation running
- `playbackSpeed: number` — 0.5, 1, 2, or 3
- `frames: RacingBarFrame[]` — precomputed from `getRacingBarChartData()`

**Animation approach**:
- Use `requestAnimationFrame` loop when playing
- Interpolate bar widths and positions between frames for smooth motion
- CSS `transition` on bar `transform: translateY()` for position swaps
- CSS `transition` on bar `width` for growth

#### Integration Point

The Racing Bar Chart lives in the **Timeline tab** of the Game Analytics page. It should be the **hero element** at the top of the Timeline view, above the existing monthly event timeline.

```
Timeline Tab:
┌──────────────────────────────┐
│ [Racing Bar Chart]           │  ← New hero visualization
│ Play/Pause, Scrubber         │
├──────────────────────────────┤
│ Period Cards (This Week etc) │  ← Existing
├──────────────────────────────┤
│ Monthly Event Timeline       │  ← Existing
└──────────────────────────────┘
```

**Files**: Integrate in `components/TimelineView.tsx`, add above existing content.

### Implementation Notes

- **Performance**: Pre-compute all frames on mount (or in a `useMemo`). The animation loop only reads from the precomputed array — no recalculation during playback
- **Empty state**: If fewer than 3 games have play data, show a placeholder encouraging the user to log more sessions
- **Keyboard**: Space = play/pause, Left/Right arrows = step back/forward
- **Touch**: Swipe left/right on the chart area to step through frames
- **Thumbnail loading**: Reuse existing `useGameThumbnails` hook. Show colored circle fallback while loading

### Effort Estimate

**High** — This is a significant new interactive visualization with custom animation logic, playback controls, and responsive design. Estimated 400-600 lines across calculation function + component.

---

## Alternative Timeline Concepts

Five additional timeline visualization ideas explored alongside the Racing Bar Chart. These are independent concepts that could complement or replace the existing monthly event list in the Timeline tab. Each offers a different lens on gaming history.

### Concept 1: Vertical River Timeline

#### Overview
A vertical, scrollable stream where the "river" width represents total gaming hours per period. Wide sections = heavy gaming months. Narrow sections = quiet months. Games appear as floating elements within the river, sized by their hours in that period.

#### Visual Design
```
        ╔══════╗
        ║ Jan  ║  ← Narrow (low activity)
        ╚══════╝
     ╔═══════════╗
     ║  February ║  ← Wide (heavy gaming)
     ║  🎮 🎮 🎮 ║
     ╚═══════════╝
       ╔════════╗
       ║ March  ║  ← Medium
       ╚════════╝
```

#### Key Details
- River flows top (oldest) to bottom (newest), matching natural scroll direction
- Game "bubbles" float within the river at their active month, sized by hours
- Clicking a bubble opens the game detail
- Width calculation: `monthHours / maxMonthHours * maxRiverWidth`
- Color shifts along the river based on dominant genre that month (warm = RPG, cool = sports, etc.)
- Milestones (completions, purchases, 100hr marks) appear as "rocks" or markers along the riverbank
- Responsive: on mobile, river takes full width with relative widths still visible

#### Data Function
```typescript
getRiverTimelineData(games) → {
  months: {
    period: string;
    totalHours: number;
    riverWidth: number;        // 0-1 normalized
    dominantGenre: string;
    color: string;
    games: { game, hours, isNew, isCompleted }[];
    milestones: { type, description }[];
  }[]
}
```

#### Files
`getRiverTimelineData(games)` in `calculations.ts`, `components/RiverTimeline.tsx`

#### Effort: Medium-High

---

### Concept 2: Filmstrip / Horizontal Scroll Timeline

#### Overview
A horizontal scrolling strip (like a film reel) where each "frame" is a month. Scroll left = past, scroll right = present. Each frame shows a snapshot: top game thumbnail as the hero image, key stats overlaid, mini bar chart of hours distribution.

#### Visual Design
```
◀ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ▶
  │ Jan 25 │ │ Feb 25 │ │ Mar 25 │ │ Apr 25 │ │ May 25 │
  │ [img]  │ │ [img]  │ │ [img]  │ │ [img]  │ │ [img]  │
  │ 42.5h  │ │ 67.2h  │ │ 31.0h  │ │ 55.8h  │ │ 48.3h  │
  │ 4 games│ │ 6 games│ │ 3 games│ │ 5 games│ │ 4 games│
  │ █▇▃▂   │ │ █▇▆▅▃▂│ │ █▅▂    │ │ █▇▅▃▂ │ │ █▆▃▂   │
  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
```

#### Key Details
- Horizontal scroll with snap points (each frame snaps into center)
- Current month highlighted with a glow/border
- Frame contents: month name, hero thumbnail (most-played game), total hours, game count, mini bar chart of top 5 games' hours
- Clicking a frame expands it to show full month details (games list, events, stats)
- Pinch/zoom on mobile to see more or fewer frames
- Optional: film sprocket holes along top/bottom edges for the aesthetic
- The center frame is always "in focus" (larger, full opacity); flanking frames are slightly smaller and dimmed

#### Data Function
```typescript
getFilmstripData(games) → {
  frames: {
    period: string;
    periodLabel: string;
    heroThumbnail: string;
    heroGameName: string;
    totalHours: number;
    gameCount: number;
    topGames: { name, hours }[];  // Top 5 for mini bar chart
    events: { type, description }[];
    isCurrentMonth: boolean;
  }[]
}
```

#### Files
`getFilmstripData(games)` in `calculations.ts`, `components/FilmstripTimeline.tsx`

#### Effort: Medium

---

### Concept 3: Social Feed / Activity Stream

#### Overview
A reverse-chronological feed of individual gaming events — like a social media timeline for your gaming life. Each event is a card: "You played Elden Ring for 3.5 hours", "You completed Astro Bot", "You purchased Starfield". Grouped by day with date headers.

#### Visual Design
```
── Today ──────────────────────
┌──────────────────────────────┐
│ 🎮 Played Elden Ring  3.5h  │
│    Session #47 · 7:30 PM    │
└──────────────────────────────┘
┌──────────────────────────────┐
│ 🎮 Played Cricket 24  1.2h  │
│    Session #12 · 2:15 PM    │
└──────────────────────────────┘

── Yesterday ──────────────────
┌──────────────────────────────┐
│ ✅ Completed Astro Bot!      │
│    Rating: 9/10 · 48h total │
└──────────────────────────────┘
┌──────────────────────────────┐
│ 🎮 Played Astro Bot   5.2h  │
│    Session #15 · Marathon!  │
└──────────────────────────────┘

── February 14 ────────────────
┌──────────────────────────────┐
│ 🛒 Purchased FF7 Rebirth    │
│    $49.99 · PlayStation     │
└──────────────────────────────┘
```

#### Key Details
- Event types: play session, purchase, completion, status change, start, milestone reached
- Each event card shows: icon, game thumbnail, event description, timestamp, relevant stat
- Day headers with relative labels ("Today", "Yesterday", "3 days ago", then dates)
- Infinite scroll loading older events
- Filter by event type (play, purchase, completion, all)
- Play sessions show session number, duration, and notes if any
- Purchase events show price and source
- Completion events are celebratory (confetti styling, rating prominently displayed)
- Milestone events (100h mark, streak records) get special treatment
- Each card is tappable to go to the game's detail view

#### Data Function
```typescript
getActivityFeed(games, options?) → {
  events: {
    id: string;
    date: string;
    type: 'play' | 'purchase' | 'completion' | 'start' | 'milestone' | 'status_change';
    gameId: string;
    gameName: string;
    thumbnail?: string;
    description: string;
    stats: Record<string, string | number>;  // Contextual stats
    metadata?: Record<string, unknown>;
  }[];
  hasMore: boolean;
}
```

#### Files
`getActivityFeed(games)` in `calculations.ts`, `components/ActivityFeed.tsx`

#### Effort: Medium

---

### Concept 4: Gaming Pulse / Heartbeat Line

#### Overview
A continuous line chart spanning your entire gaming history, where the Y-axis is daily/weekly hours and the line forms a "heartbeat" pattern — spikes during heavy gaming periods, flatlines during droughts. Annotated with key events along the timeline.

#### Visual Design
```
Hours
  │     ╱╲        ╱╲
  │    ╱  ╲   ╱╲ ╱  ╲        ╱╲
  │   ╱    ╲ ╱  ╲    ╲   ╱╲ ╱  ╲
  │  ╱      ╳    ╲    ╲ ╱  ╲    ╲
  │ ╱      ╱ ╲    ╲    ╳    ╲    ╲──
  │╱      ╱   ╲    ╲──╱ ╲    ╲
  └───────────────────────────────── Time
    Jan    Mar    May    Jul    Sep
           ↑             ↑
     "Elden Ring era"  "The Drought"
```

#### Key Details
- X-axis: full date range from first event to today
- Y-axis: hours per period (daily for recent, weekly for older data)
- Line is colored by dominant game in each period (gradient shifts as your focus changes)
- Clickable annotations at key moments: "Started Elden Ring", "Completed Astro Bot", "Biggest gaming day ever"
- Shaded regions under the line, colored by the game being played most
- Hover/tap on any point shows a tooltip: date, hours, game(s) played
- "Dead zones" (no activity) are visually distinct — the line drops to zero and the area turns grey
- Optional: overlay a second line for spending (dual-axis chart showing hours AND spending over time)
- Zoom in/out to adjust the time window

#### Data Function
```typescript
getGamingPulseData(games, granularity?) → {
  points: {
    date: string;
    hours: number;
    dominantGame: string;
    dominantGameColor: string;
    games: { name, hours }[];
  }[];
  annotations: {
    date: string;
    type: 'start' | 'completion' | 'purchase' | 'milestone' | 'drought_start' | 'drought_end';
    label: string;
    gameId?: string;
  }[];
  peaks: { date: string; hours: number; label: string }[];
  droughts: { start: string; end: string; days: number }[];
}
```

#### Files
`getGamingPulseData(games)` in `calculations.ts`, `components/GamingPulse.tsx`

#### Effort: Medium-High

---

### Concept 5: Stacked Area / Genre Epochs

#### Overview
A stacked area chart showing how your gaming time is distributed across genres (or games) over time. Each genre is a colored band. The total height is total hours per period. You see "eras" emerge — "The RPG Era", "The Sports Phase", "The Indie Summer".

#### Visual Design
```
Hours │ ┌──────────────────────────────┐
      │ │  Action    ████████          │
      │ │  RPG       ████████████████  │
      │ │  Sports    ██████            │
      │ │  Indie     ████              │
      │ │  Strategy  ██                │
      │ └──────────────────────────────┘
      └──────────────────────────────── Time
         Q1 2024     Q3 2024    Q1 2025
```

#### Key Details
- Each band = one genre (or one game, togglable)
- Stacked so total height = total hours that period
- Bands ordered by dominance (most hours on top or bottom, consistent)
- Color per genre (RPG = blue, Action = red, Sports = green, etc.)
- Hovering/tapping a band highlights it and shows the genre name + hours
- "Era labels" auto-generated: when a genre dominates (>50%) for 2+ months, label it as an era
- Transition points where dominance shifts are highlighted
- Toggle between genre view and individual game view
- Monthly granularity by default, quarterly for longer histories

#### Data Function
```typescript
getGenreEpochsData(games, mode?) → {
  periods: {
    period: string;
    bands: {
      genre: string;     // or gameName if mode='games'
      hours: number;
      color: string;
      percentage: number;
    }[];
    totalHours: number;
  }[];
  eras: {
    genre: string;
    startPeriod: string;
    endPeriod: string;
    label: string;        // "The RPG Era"
    dominancePercent: number;
  }[];
}
```

#### Files
`getGenreEpochsData(games)` in `calculations.ts`, `components/GenreEpochs.tsx`

#### Effort: Medium

---

### Timeline Concepts Summary

| # | Concept | Description | Effort |
|---|---------|-------------|--------|
| 1 | Racing Bar Chart | Animated bars racing as hours accumulate over time | High |
| 2 | Vertical River | Width-varying stream showing activity intensity | Medium-High |
| 3 | Filmstrip | Horizontal scrolling month frames like a film reel | Medium |
| 4 | Social Feed | Reverse-chronological event cards like a social timeline | Medium |
| 5 | Gaming Pulse | Heartbeat line chart of daily/weekly hours over time | Medium-High |
| 6 | Genre Epochs | Stacked area chart showing genre dominance shifts | Medium |

### Recommended Implementation Order

1. **Racing Bar Chart** — The hero. Most visually impressive, most "wow" factor. Implement first.
2. **Social Feed** — Complements the racing chart with a detail-oriented, browsable view. Good second addition.
3. **Genre Epochs** — Tells a different story (genre evolution) that the racing chart doesn't. Good third.
4. **Filmstrip** — Nice alternative browse experience. Fourth.
5. **Gaming Pulse** — Heartbeat is cool but overlaps somewhat with the racing chart's story. Fifth.
6. **Vertical River** — Most experimental/unusual. Sixth.

---

## Additional Feature Ideas

Additional feature concepts discussed for the Game Analytics app. These are independent ideas that complement the existing Enhancement Plan, Card Redesign, Stats Overhaul, and Timeline features documented elsewhere.

### 1. Discover Tab — Game Recommendations

A dedicated tab for discovering new games to play, powered by analysis of your existing library preferences.

#### Recommendation Engine
Analyze your library to build a preference profile:
- **Genre affinity**: Weighted by rating (genres you rate highly, not just play a lot)
- **Price sweet spot**: Your most-satisfied price bracket
- **Session length preference**: Quick games vs. long RPGs
- **Platform preference**: Where you play most
- **Franchise loyalty**: Sequels/prequels of games you loved

#### Sources
- Manual entry: Users can add games they're interested in with a "Recommended" status
- AI-powered suggestions: Use the AI service to suggest games based on library analysis
- Community popular picks by genre (static curated list as seed data)

#### Display
- Card-based grid similar to the Games tab but with "Add to Wishlist" / "Add to Queue" actions
- Match score showing why a game was recommended ("87% match — you love Action RPGs and games under $30")
- Filters by genre, platform, price range

#### Files
`components/DiscoverTab.tsx`, `lib/recommendation-engine.ts`, `getRecommendationProfile(games)` in calculations.ts

#### Effort: High

---

### 2. Data Export & Sharing

#### Export Formats
- **CSV export**: Full library data as CSV for spreadsheet analysis
- **JSON export**: Raw data backup/restore
- **Image export**: Generate shareable cards/images of key stats (library summary, year in review, game card)

#### Shareable Cards
- "My Gaming Year" summary card — total hours, top 3 games, personality type, credit score
- Individual game achievement cards — "My relationship with Elden Ring: Soulmate, 89h, $0.67/hr"
- Week/Month recap summary cards

#### Files
`lib/export-service.ts`, `components/ExportPanel.tsx`, `components/ShareableCard.tsx`

#### Effort: Medium

---

### 3. Platform-Specific Integrations

#### Steam Import
- Parse Steam library CSV export to bulk-import games
- Map Steam game names to RAWG for thumbnails
- Import playtime data from Steam

#### PlayStation / Xbox Import
- Manual bulk-import via formatted CSV/JSON
- Template files for each platform's data format

#### Files
`lib/import-service.ts`, `components/ImportWizard.tsx`

#### Effort: Medium-High

---

### 4. Gaming Calendar

A calendar view showing gaming activity overlaid on a traditional month calendar grid.

#### Features
- Color-coded days by hours played (heat-map style, like GitHub contribution graph)
- Click a day to see: games played, session details, total hours
- Monthly/weekly/yearly views
- Plan future gaming: mark dates for game releases, sales, gaming nights
- Integration with "On This Day" retrospective — show historical events on the calendar

#### Visual Design
```
        February 2026
  Mo  Tu  We  Th  Fr  Sa  Su
  ░░  ░░  ██  ██  ░░  ██  ██
  ░░  ██  ░░  ██  ██  ██  ██
  ░░  ░░  ░░  ██  ░░  ██  ██
  ░░  ░░  ██  ░░  ░░  ░░  ░░
```
(░░ = no/low activity, ██ = active gaming day, darkness proportional to hours)

#### Files
`components/GamingCalendar.tsx`, `getCalendarData(games, month, year)` in calculations.ts

#### Effort: Medium

---

### 5. Multi-Player / Shared Library Stats

#### Concept
Compare your library stats with friends or household members who also use the app.

#### Features
- Side-by-side stat comparison (hours, spending, completion rate, credit score)
- Shared games detector — games you both own, compare ratings and hours
- Friendly competition leaderboards
- Combined stats view ("Together you've played 3,400 hours across 180 games")

#### Notes
Requires Firebase multi-user queries. Could start with a simpler "compare by export code" approach where users share a stats snapshot code.

#### Effort: High (full implementation) / Low (snapshot comparison)

---

### 6. Price Tracker & Deal Alerts

#### Concept
Track game prices and get notified when wishlist games hit your target price.

#### Features
- Set target price for wishlist games
- RAWG/ITAD API integration for current prices (where available)
- "Best time to buy" analysis based on historical sale patterns (manual data)
- "Price dropped!" indicators on wishlist game cards
- Budget-aware: "You have $45 left in your budget — 3 wishlist games are under that"

#### Files
`lib/price-tracker.ts`, price display in game cards and wishlist view

#### Effort: Medium-High

---

### 7. Gaming Mood / Context Tags

#### Concept
Add mood/context tags to play sessions to enable richer analysis.

#### Tag Types
- **Mood**: Relaxed, Competitive, Focused, Social, Tired, Energized
- **Context**: Solo, Co-op, Online Multiplayer, Couch Co-op, Stream/Content
- **Vibe**: Wind-down, Grind, Exploration, Story, Achievement Hunting

#### Analysis Enabled
- "You game best (highest ratings) when Relaxed and Solo"
- "Your longest sessions are when you're Focused"
- "Competitive mood correlates with Sports genre"
- Mood-based game recommendations: "Feeling tired? You enjoy these games when tired"

#### Files
Extend `PlayLog` type with mood/context fields, `components/MoodTagger.tsx`, `getMoodAnalysis(games)` in calculations.ts

#### Effort: Medium

---

### 8. Custom Dashboard / Widget Builder

#### Concept
Let users customize the Stats tab by choosing which stat cards/charts to display and in what order.

#### Features
- Drag-and-drop widget grid
- Toggle individual stat sections on/off
- Resize widgets (small/medium/large)
- Save layouts per user (localStorage or Firebase)
- Preset layouts: "Overview", "Deep Dive", "Financial Focus", "Behavioral Analysis"

#### Files
`components/DashboardBuilder.tsx`, `hooks/useDashboardLayout.ts`, layout storage

#### Effort: High

---

### 9. Yearly Wrapped Experience

#### Concept
A Spotify Wrapped-style end-of-year recap that summarizes the entire year's gaming.

#### Screens (similar to Month Recap but grander)
1. Title Card — "Your 2025 Gaming Year"
2. Year in Numbers — animated stat counters
3. Top 10 Games — ranked by hours with thumbnails
4. Game of the Year — hero spotlight
5. Genre Evolution — how your tastes shifted month by month
6. Spending Report — total, monthly trend, best deals, budget performance
7. Completion Hall of Fame — all games finished this year
8. Personality Journey — how your personality evolved quarter by quarter
9. Achievement Showcase — all milestones and trophies earned
10. The Superlatives — longest session, fastest completion, biggest surprise, etc.
11. Credit Score Trend — how your gaming credit score changed through the year
12. Predictions for Next Year — AI-generated predictions based on trends
13. Closing Card — summary + sign-off

#### Files
`components/YearlyWrapped.tsx`, `components/wrapped-screens/*.tsx`, `getYearWrappedData(games, year)` in calculations.ts

#### Effort: High

---

### 10. Notification / Reminder System

#### Concept
Gentle nudges and reminders based on gaming patterns.

#### Notification Types
- "You haven't played [game] in 30 days — feeling nostalgic?"
- "You're 5 hours from Excellent value on [game]"
- "Budget alert: 80% spent with 3 months remaining"
- "Streak alert: Play today to maintain your 7-day streak!"
- "Game release: [wishlisted game] comes out tomorrow"
- "On This Day: 1 year ago you completed [game]"

#### Implementation
Browser Notification API for web push (with user permission). In-app notification bell with notification list. localStorage tracking of dismissed notifications.

#### Files
`hooks/useNotifications.ts`, `lib/notification-engine.ts`, `components/NotificationBell.tsx`

#### Effort: Medium

---

### Feature Ideas Summary

| # | Feature | Category | Effort |
|---|---------|----------|--------|
| 1 | Discover Tab — Recommendations | New Tab | High |
| 2 | Data Export & Sharing | Utility | Medium |
| 3 | Platform Import (Steam, PS, Xbox) | Utility | Medium-High |
| 4 | Gaming Calendar | Visualization | Medium |
| 5 | Multi-Player / Shared Stats | Social | High |
| 6 | Price Tracker & Deal Alerts | Utility | Medium-High |
| 7 | Gaming Mood / Context Tags | Data Enhancement | Medium |
| 8 | Custom Dashboard / Widget Builder | Customization | High |
| 9 | Yearly Wrapped Experience | Recap | High |
| 10 | Notification / Reminder System | Engagement | Medium |

---

## Changelog

### 2026-02-18 (v1.0.0)
- Initial document creation
- Documented Racing Bar Chart Timeline: core concept, visual design, detailed specs (bar rendering, time progression, playback controls, animations, responsive design), data model with `RacingBarFrame` and `RacingBarEntry` types, component architecture, integration point in Timeline tab
- Documented 5 Alternative Timeline Concepts: Vertical River, Filmstrip/Horizontal Scroll, Social Feed/Activity Stream, Gaming Pulse/Heartbeat Line, Stacked Area/Genre Epochs — each with visual design, key details, data functions, and effort estimates
- Documented 10 Additional Feature Ideas: Discover Tab with recommendation engine, Data Export & Sharing with shareable cards, Platform-Specific Imports (Steam/PS/Xbox), Gaming Calendar heat-map view, Multi-Player/Shared Stats, Price Tracker & Deal Alerts, Gaming Mood/Context Tags, Custom Dashboard/Widget Builder, Yearly Wrapped Experience (13 screens), Notification/Reminder System

---

**Last Updated**: 2026-02-18
**Version**: 1.0.0
