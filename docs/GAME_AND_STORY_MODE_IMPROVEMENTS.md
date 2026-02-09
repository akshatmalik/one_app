# Game Analytics & Story Mode Improvements

Comprehensive improvement plan covering three areas: Up Next tab enhancements, Game Detail View, and a full Story Mode overhaul.

---

## Table of Contents

1. [Workstream 1: Up Next Tab — Log Time Button](#workstream-1-up-next-tab--log-time-button)
2. [Workstream 2: Game Detail View](#workstream-2-game-detail-view)
3. [Workstream 3: Story Mode Overhaul](#workstream-3-story-mode-overhaul)
   - [The Problem](#the-problem)
   - [Screens to Cut (11)](#screens-to-cut-11)
   - [All 20 Kept Screens — Every One Upgraded](#all-20-kept-screens--every-one-upgraded)
   - [9 New Screens to Build](#9-new-screens-to-build)
   - [Story Flow Reorder (5 Acts)](#story-flow-reorder-5-acts)
4. [Workstream 4: AI Prompt Overhaul](#workstream-4-ai-prompt-overhaul)
5. [Implementation Order](#implementation-order)

---

## Workstream 1: Up Next Tab — Log Time Button

### Current State

- Only the **Hero card** (position #1, "Now Playing") has a "Log Play Session" button.
- Standard queue cards have **no way to log time** — you have to go back to the Games tab.
- This is the most obvious friction point in the Up Next flow.

### What to Build

Add a **Clock icon button** on each standard `QueueGameCard` that triggers the existing `onLogTime` callback.

**Behavior:**
- Desktop: appears on hover (matches the existing remove-button pattern with `sm:opacity-0 sm:group-hover:opacity-100`)
- Mobile: always visible (no hover state on touch devices)
- Icon: `Clock` from lucide-react, consistent with the hero card's log button
- Position: next to the existing remove (X) button on the right side of the card
- On click: opens `PlayLogModal` for that game (same as hero card behavior)

**Files to modify:**
- `app/apps/game-analytics/components/QueueGameCard.tsx` — add button to standard card layout

---

## Workstream 2: Game Detail View

### Current State

- Clicking a game card opens the **GameForm** (edit mode) — a form, not a detail view.
- There is **no read-only detail panel** (`GameDetailPanel.tsx` does not exist).
- The compact card view on the Games tab shows a lot of info but truncates reviews, hides full play history, and has no charts.

### What to Build

An **expandable slide-over panel** (or inline expansion below the card) that opens when clicking a game card, replacing the current behavior of jumping straight to the edit form.

**Design principles:**
- Keep the compact card list intact (user explicitly prefers it)
- An "Edit" button inside the detail view opens the existing GameForm
- Dark theme, consistent with existing styling patterns

### Sections

| Section | Description | Complexity |
|---------|-------------|------------|
| **Hero Banner** | Large thumbnail with gradient overlay, game name, status badge, platform/genre/franchise tags, value rating | Low |
| **Key Stats Bar** | Price, total hours, rating, cost/hr, ROI, blend score — all at a glance in a horizontal grid | Low |
| **Play History Timeline** | Visual timeline of all play sessions (date + hours + notes), like a mini activity feed with Calendar icons | Medium |
| **Value Trajectory Chart** | Line chart of cost-per-hour dropping over cumulative hours, with $1/$3/$5 horizontal reference lines. "12 more hours to reach Excellent value." | Medium |
| **Session Sparkline (expanded)** | Bar chart of ALL sessions (not just last 5 on the card), showing patterns over time | Low |
| **Completion Probability** | Probability badge with factor breakdown — genre completion rate, session decay, hours invested vs typical | Medium |
| **Franchise Context** | If part of a franchise: other games in the series, ratings across them, total franchise investment | Medium |
| **Quick Actions Bar** | Sticky bottom bar: Log Time, Change Status, Add to Queue, Edit, Delete | Low |
| **Review Section** | Full review text (not truncated), with inline edit capability | Low |
| **"What If" Mini** | "Play 5 more hours and your $/hr drops to $X.XX" — micro projection | Low |
| **Similar Games** | Other games in library with same genre/platform, sorted by rating | Low |

**Files to create:**
- `app/apps/game-analytics/components/GameDetailPanel.tsx`

**Files to modify:**
- `app/apps/game-analytics/page.tsx` — change card click to open detail panel instead of edit form
- `app/apps/game-analytics/lib/calculations.ts` — add `getValueOverTime(game)` function

---

## Workstream 3: Story Mode Overhaul

### The Problem

The **Timeline view** is sharp because every line earns its place — game names, deltas, cumulative context, no filler. The **Story Mode** has three core problems:

1. **Content redundancy** — 3 screens show the same "your gaming costs less than movies" data (FunFacts, TimeTravel, MoneyComparison)
2. **Generic text** — most screens show isolated numbers without context ("You played 14.5 hours" with no comparison to last week or your average)
3. **AI prompts produce fluff** — prompted with "Be punchy/creative/playful" instead of specific voices, resulting in generic encouragement rather than sharp analysis

**Goal:** Every screen should say something you couldn't guess. If it's just arithmetic ("14.5 hours = 7 movies"), cut it or fold it into one screen. If it names your games and tells you something about your behavior, keep it.

### Screens to Cut (11)

| Screen | Why it's cut |
|--------|-------------|
| **TopGame** | Redundant — top game is already #1 on the Top 3 podium |
| **ValueUtilized** | Overlaps with Best Value screen |
| **TimeTravel** | 90% overlap with FunFacts and MoneyComparison |
| **MoneyComparison** | Third time showing "cheaper than movies" |
| **FunFacts** | Reworked into the new Guilt-Free Gaming screen |
| **AI Blurb: Gaming DNA** | Too early in flow, no data shown yet — feels unearned |
| **AI Blurb: Top Game** | Follows a screen that's being cut |
| **AI Blurb: Journey** | Generic, better to replace with data |
| **AI Blurb: Backlog** | Backlog screen already has personality via humor tiers |
| **AI Blurb: Money** | Redundant with consolidated guilt-free data |
| **AI Blurb: Wrap/Epic** | Generic closers before a generic closer |

### All 20 Kept Screens — Every One Upgraded

#### 1. Opening Screen
**Current:** "Your Gaming Week Recap" + date + spinning gamepad. Generic splash.
**Upgrade:**
- Add the week's **vibe label** right on the splash (e.g., "YOUR WEEK: POWER GAMER MODE")
- One sharp summary line: "42h across 6 games. Your biggest week in a month."
- Pull total hours, game count, and comparison context into the opening so it hooks immediately

#### 2. Total Hours Screen
**Current:** Animated counter to total hours. Single isolated number.
**Upgrade:**
- Merge comparison data **inline**: show "+8h vs last week" and "32% above your 4-week average" right next to the animated counter
- Color-code the delta (emerald for up, red for down)
- Add sessions count and games count as secondary stats below

#### 3. Top 3 Podium Screen
**Current:** Podium with hours/percentage/sessions. One insight line about the #1 game "dominating."
**Upgrade:**
- Sharper insight lines per game — not just "dominated" but game-specific context
- For #1: "Back for week 3 straight" or "First time on the podium"
- For #2/#3: "Climbed from #5 last week" or "Debut appearance"
- Show trend arrows if data exists from previous weeks

#### 4. Daily Breakdown Screen
**Current:** Stacked bar chart by day. Identifies busiest day.
**Upgrade:**
- Peak day callout: "Saturday ate 40% of your week"
- Rest day commentary: "Monday and Wednesday were recovery days — 0 hours"
- Weekend vs weekday split percentage
- If one day had a massive session, highlight it specifically

#### 5. Session Types Screen
**Current:** Bar chart of marathon/power/quick sessions. Has a **bug** — all `sessionEmoji` values are empty strings.
**Upgrade:**
- **Fix the empty emoji bug** (lines 22-33 in SessionTypesScreen.tsx)
- Add comparison to historical average session length: "Your avg session was 2.3h — up from your usual 1.8h"
- Add longest session highlight with game name: "Longest: 4.5h on Elden Ring (Tuesday)"

#### 6. Gaming Heatmap Screen
**Current:** 7-day grid with intensity. Shows streak, active days, weekend/weekday split.
**Upgrade:**
- Streak callout: "Day 5 of your current streak" or "Streak broken — last played 3 days ago"
- Compare to longest streak: "Your record is 12 days"
- Add time-density insight: "You packed 80% of your hours into 3 days"

#### 7. Gaming Personality Screen
**Current:** Four personality types with descriptions and traits. Focus score. Already the strongest screen.
**Upgrade:**
- Add evolution context: "Last week you were a Dabbler, now you're Monogamous"
- Add the actual games driving the personality classification
- Sharpen trait descriptions to reference specific behavior from this week

#### 8. Genre Universe Screen
**Current:** Genre bars with percentages, diversity score tiers.
**Upgrade:**
- Trend context: "Third straight RPG-dominant week" or "Branched into Strategy for the first time in 2 months"
- New genre discovery callout if applicable
- Genre fatigue warning if same genre >80% for 3+ weeks

#### 9. Completion Odds Screen
**Current:** Completion probability per in-progress game with color-coded indicators.
**Upgrade:**
- Sharper per-game verdicts with specific reasoning: "Slowing down — sessions dropped 60% over 2 weeks"
- Add "most at risk" callout for the game most likely to be abandoned
- Add positive callout: "On track — consistent 3 sessions/week"

#### 10. Backlog Update Screen
**Current:** Backlog count, humor tier, completion rate, week impact.
**Upgrade:**
- Polish humor tier descriptions to be even sharper
- Add net change: "Net -1 this week (completed 2, bought 1)" with clear delta
- Add "weeks to clear at current pace" with historical trend
- "Your backlog grew 15% this month — the doomsday clock moved forward"

#### 11. Comparison Screen
**Current:** vs Last Week and vs 4-Week Average with generic text.
**Upgrade:**
- Make it punchier with specific inline deltas per metric (hours, games, sessions, completions)
- Add a "verdict" line: "Your most active week since [date]" or "Quietest week in a month"
- Show a mini sparkline of the last 4 weeks for visual trend

#### 12. Best Value Screen
**Current:** Ranked value leaderboard with medal emojis, cost-per-hour, star ratings.
**Upgrade:**
- Add specific callouts: "Hades just hit Excellent value this week" (if a game crossed a threshold)
- Highlight biggest mover: "Zelda improved from $4.20/hr to $3.10/hr this week"
- Add context for the worst value game too — don't just celebrate

#### 13. Activity Pulse Screen
**Current:** Activity status + Guilt-Free multiplier.
**Upgrade:**
- Add trend context: "You've been 'On Fire' for 3 weeks straight" or "Cooling off after last week's marathon"
- Show pulse history as a mini timeline (last 4 weeks of pulse levels)
- Make the guilt-free comparison more specific with actual dollar amounts saved

#### 14. Achievements Screen
**Current:** Confetti + cards for completions, new starts, milestones. Text is structural.
**Upgrade:**
- Replace generic "Games Completed: 1" with specific: "Completed Astro Bot after 23 hours and 18 days"
- Milestones should reference actual events: "Crossed 100 hours on Elden Ring"
- Add "near misses": milestones you're close to hitting ("3 more hours to join the Century Club")

#### 15. Week Vibe Screen
**Current:** Big vibe label + summary stats + badges.
**Upgrade:**
- Add behavioral data backing the label: "Power Gamer because: 40+ hours, 3 games, daily sessions"
- Show what would change the vibe: "5 fewer hours and you'd be 'Quality Gaming' instead"
- Add comparison: "This is your 3rd 'Power Gamer' week out of the last 8"

#### 16-19. Remaining AI Blurb Screens (4 kept, repositioned)
**Current:** "Write a SHORT, fun observation. Be punchy!"
**Upgrade:**
- Re-prompt with specific voices (see Workstream 4)
- Position strategically after data screens that provide context
- Each blurb should have a different analytical angle

#### 20. Closing Screen
**Current:** "That's a Wrap!" + generic tiered motivation ("Every gaming session counts!").
**Upgrade:**
- Real summary with specifics: "This week: [vibe]. [X]h, [Y] games, [Z] completed."
- Highlight the single most interesting thing: "Your longest streak / best value / biggest session was [specific thing]"
- Forward-looking: "Next week, [game] hits 50 hours if you play 3 more"
- Kill all generic motivation lines

### 9 New Screens to Build

#### N1. Guilt-Free Gaming Screen
**Replaces:** FunFacts, TimeTravel, MoneyComparison (3 screens → 1)

One consolidated bar chart comparing your gaming $/hr against other entertainment:
- Movies (~$12/hr)
- Concerts (~$25/hr)
- Dining Out (~$15/hr)
- Streaming (~$2/hr)
- Gym (~$3/hr)
- Books (~$5/hr)

Your gaming bar highlighted in purple. Headline: "Your gaming costs $1.80/hr — 6.7x cheaper than movies. You saved $X this week vs equivalent movie hours."

Show both your weekly average AND your best game's cost-per-hour.

**Files:** New `story-screens/GuildFreeScreen.tsx`, calculation helper in `calculations.ts`

#### N2. Week Awards Screen
Auto-generated award nominees with game-name-specific winners:

| Award | Logic |
|-------|-------|
| **MVP** | Most hours played this week |
| **Best Value** | Lowest cost-per-hour among games played this week |
| **Biggest Surprise** | Game that wasn't played recently but got significant hours this week |
| **Most Improved** | Game whose $/hr improved the most this week |
| **Speedrun Award** | Fastest completion (if any completions this week) |

Award ribbon/badge styling. Each winner shows game thumbnail + the stat that earned it.

**Files:** New `story-screens/WeekAwardsScreen.tsx`, `getWeekAwards()` in calculations.ts

#### N3. One Sharp Insight Screen
A single data-driven observation that is the "takeaway" of the week. **Calculated, not AI-generated.** Prioritized list of possible insights (show the first one that applies):

1. "You completed 2 games this week — you've only done that twice before."
2. "Your cost-per-hour dropped below $2 for the first time."
3. "You haven't touched your top-rated game in 12 days."
4. "This is your longest gaming streak ever — 8 consecutive days."
5. "You spent more this week ($120) than the previous 4 weeks combined."
6. "First time playing [genre] since [date]."
7. "3 of your 5 most-played games this week are from the same franchise."
8. "[Game] went from 'Not Started' to 'Completed' in one week."
9. "Your average rating this week (8.5) is the highest in any week."
10. "You played [X] games but only logged sessions for [Y] — the rest were baseline hours."

Big typography. Minimal decoration. The insight IS the screen.

**Files:** New `story-screens/SharpInsightScreen.tsx`, `getSharpInsight()` in calculations.ts

#### N4. "You Ignored" Screen
Games in your queue or active library that you **didn't touch** this week, with days-since-last-play.

Honest, not celebratory. Sorted by dust level:
- "Persona 5 — 34 days. Gathering dust."
- "Cyberpunk 2077 — 12 days. Cooling off."
- "Zelda — in your queue at #2 but 0 hours this week."

Max 5 games shown. If nothing was ignored, screen is skipped.

Tone: matter-of-fact, not guilt-tripping. Just awareness.

**Files:** New `story-screens/YouIgnoredScreen.tsx`, `getIgnoredGames()` in calculations.ts

#### N5. Franchise Check-in Screen
If any game played this week is part of a franchise with 2+ entries in the library:

"Your [Franchise] journey: [X] games, [Y]h total, ratings: 7 → 8 → 9. Getting better every time."

Show mini cards for each franchise entry: thumbnail, hours, rating, status. Highlight the one played this week.

If no franchise games were played, screen is skipped.

**Files:** New `story-screens/FranchiseCheckInScreen.tsx`, leverage existing franchise data in games

#### N6. "This Time Last Year" Screen
If historical data exists from ~1 year ago (or 6 months, 3 months):

"A year ago this week, you were 20h deep into Breath of the Wild."
"6 months ago, you completed Hades and called it 'a masterpiece'."

Show the historical game's thumbnail, hours at that point, and any review snippet.

If no historical data matches, screen is skipped.

**Files:** New `story-screens/ThisTimeLastYearScreen.tsx`, `getHistoricalEchoes()` in calculations.ts

#### N7. Session of the Week Screen
Highlight the single most notable session:

- Criteria: longest session, or the one with the most interesting note, or a completion session
- Display: "Tuesday, 4.5h of Elden Ring"
- If the session has a note: show it prominently — "Your note: 'Finally beat Malenia.'"
- If it was a completion session: celebration styling
- Context: "This was your Xth longest session ever"

**Files:** New `story-screens/SessionOfTheWeekScreen.tsx`

#### N8. The Momentum Read Screen
Multi-week trend analysis. Are you accelerating or decelerating?

- "3 weeks of increasing hours. You're in a groove." (with upward trend line)
- "Hours dropped 40% — cooling off after last week's marathon." (with downward trend)
- "Steady at ~15h/week for a month. Consistent." (with flat line)

Show a mini line chart of the last 4-6 weeks of hours. Highlight the trend direction.

Add game-level momentum: "Elden Ring sessions are accelerating. Zelda is fading."

**Files:** New `story-screens/MomentumReadScreen.tsx`, `getMomentumData()` in calculations.ts

#### N9. Rating vs Hours Paradox Screen
Surface the disconnect between what you rate highly and what you actually play:

- "You played Destiny 2 for 12h this week but rate it 6/10."
- "Meanwhile, your 9/10 Celeste got 0 hours."
- "Your most-played genre this week (Shooters, avg 6.5) isn't your highest-rated (RPGs, avg 8.2)."

Show a simple two-column comparison: "What you play" vs "What you love."

If no paradox exists (ratings and hours align), show a positive version: "Your playtime matches your taste — you play what you love."

**Files:** New `story-screens/RatingParadoxScreen.tsx`, `getRatingParadox()` in calculations.ts

### Story Flow Reorder (5 Acts)

The story mode screens are organized into 5 narrative acts for a natural flow:

#### Act 1: "The Week at a Glance" (hook them fast)
1. Opening (upgraded with vibe + summary)
2. Total Hours (with inline comparisons)
3. Top 3 Podium (with trend context)

#### Act 2: "How You Played" (patterns & behavior)
4. Daily Breakdown (peak day callout)
5. AI Blurb: Patterns (re-prompted as TV narrator analyzing rhythm)
6. Session Types (fixed + historical comparison)
7. Gaming Heatmap (streak callout)
8. Gaming Personality (evolution context)
9. Session of the Week (**NEW**)

#### Act 3: "What You Played" (the games themselves)
10. Genre Universe (trend context)
11. AI Blurb: Your Games (re-prompted as sports commentator)
12. Completion Odds (sharper verdicts)
13. Backlog Update (polished humor tiers)
14. Franchise Check-in (**NEW**, conditional)
15. Rating vs Hours Paradox (**NEW**)

#### Act 4: "The Value Story" (money, consolidated)
16. Best Value (threshold crossings highlighted)
17. Guilt-Free Gaming (**NEW**, replaces 3 redundant screens)
18. Activity Pulse (trend context)
19. The Momentum Read (**NEW**)

#### Act 5: "The Verdict" (wrap with punch)
20. Achievements (specific milestone callouts)
21. Week Awards (**NEW**)
22. You Ignored (**NEW**, conditional)
23. This Time Last Year (**NEW**, conditional)
24. AI Blurb: Analysis (re-prompted with specific voice)
25. Comparison (punchier with sparkline)
26. Week Vibe (behavioral backing)
27. One Sharp Insight (**NEW**)
28. Closing (real summary, no generic motivation)

**Note:** Conditional screens (Franchise Check-in, You Ignored, This Time Last Year) are skipped if no relevant data exists, keeping the flow tight.

---

## Workstream 4: AI Prompt Overhaul

### Current Problem

All story mode AI prompts end with: "Be punchy/creative/playful. Keep it brief!" This produces Buzzfeed energy — generic encouragement, exclamation marks, no real insight.

Compare to the Timeline's AI prompts which instruct: "Write like a TV narrator doing a 'previously on...' recap. Engaging but concise." — this produces specific, game-referencing, terse analysis.

### New Prompt Strategy

Each remaining AI blurb gets a **specific voice and angle**:

| Blurb Position | Current Prompt Style | New Voice |
|----------------|---------------------|-----------|
| After Daily Breakdown | "Fun observation about patterns" | "You're a TV narrator analyzing their weekly rhythm. Reference specific days and hours. One observation. No encouragement." |
| After Genre Universe | "Creative observation about genres" | "You're a sports commentator doing post-game analysis. Name the games. Reference hours. One hot take. No emojis." |
| Before Closing | "Wrap-up observation" | "You're a film critic writing a one-sentence review of their gaming week. Be specific. Reference what stood out and what was missing." |
| Mid-flow wildcard | "Fun observation about sessions" | "You're a data analyst briefing a client. One surprising pattern. Use a specific number. No pleasantries." |

### Prompt Template

**Before:**
```
Write a SHORT, fun 2-3 line observation about their gaming patterns. Be punchy and creative! Keep it brief!
```

**After:**
```
You're a [SPECIFIC ROLE] analyzing this player's week. Their data: [CONTEXT].
Write ONE sentence. Reference a specific game name and a specific number.
No encouragement, no emojis, no "great job." Just the insight.
```

### Fallback Blurbs

Current fallbacks are extremely generic: "Your gaming week has its own unique rhythm and story."

Replace with data-driven fallbacks that use the available stats:
- "You spent [X]h across [Y] games — [top game] took [Z]% of that."
- "[X] sessions this week, averaging [Y]h each."

---

## Implementation Order

| Phase | Tasks | Est. Screens |
|-------|-------|-------------|
| **Phase A** | Cut 11 redundant screens, reorder remaining into 5-act flow | Restructure |
| **Phase B** | Upgrade all 20 kept screens (sharper text, context, fixes) | 20 screens |
| **Phase C** | Build 9 new screens + calculation functions | 9 screens |
| **Phase D** | AI prompt overhaul (re-prompt 4 blurbs, update fallbacks) | 4 blurbs |
| **Phase E** | Add Log Time button to QueueGameCards | 1 component |
| **Phase F** | Build Game Detail View panel | 1 component |
| **Phase G** | Integration, testing, build verification | All |

### Task Checklist

- [ ] Add Log Time button to standard QueueGameCards
- [ ] Build Game Detail View panel (GameDetailPanel.tsx)
- [ ] Cut 11 redundant story screens
- [ ] Upgrade: Opening screen (vibe label + sharp summary)
- [ ] Upgrade: Total Hours screen (inline comparisons)
- [ ] Upgrade: Top 3 Podium screen (trend context)
- [ ] Upgrade: Daily Breakdown screen (peak day callout)
- [ ] Upgrade: Session Types screen (fix emoji bug + historical comparison)
- [ ] Upgrade: Gaming Heatmap screen (streak callout)
- [ ] Upgrade: Gaming Personality screen (evolution context)
- [ ] Upgrade: Genre Universe screen (trend context)
- [ ] Upgrade: Completion Odds screen (sharper verdicts)
- [ ] Upgrade: Backlog Update screen (polish humor tiers)
- [ ] Upgrade: Comparison screen (punchier deltas + sparkline)
- [ ] Upgrade: Best Value screen (threshold crossings)
- [ ] Upgrade: Activity Pulse screen (trend context)
- [ ] Upgrade: Achievements screen (specific milestones + confetti)
- [ ] Upgrade: Week Vibe screen (behavioral backing)
- [ ] Upgrade: Closing screen (real summary)
- [ ] Upgrade: 4 remaining AI Blurb screens (re-prompted)
- [ ] Build NEW: Guilt-Free Gaming screen
- [ ] Build NEW: Week Awards screen
- [ ] Build NEW: One Sharp Insight screen
- [ ] Build NEW: You Ignored screen
- [ ] Build NEW: Franchise Check-in screen
- [ ] Build NEW: This Time Last Year screen
- [ ] Build NEW: Session of the Week screen
- [ ] Build NEW: The Momentum Read screen
- [ ] Build NEW: Rating vs Hours Paradox screen
- [ ] Overhaul AI prompts (4 blurbs + fallbacks)
- [ ] Reorder story flow into 5 narrative acts
- [ ] Build and verify (npm run build)
- [ ] Commit and push

---

**Created:** 2026-02-09
**Status:** Planning complete, ready for implementation
