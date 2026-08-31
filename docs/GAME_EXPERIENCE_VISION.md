# Game Experience Vision

This is the canonical product direction for the Game Analytics mini-app.

The app should help a player choose well, play deliberately, and remember what
their gaming life felt like. It is not primarily a timer, spreadsheet, finance
dashboard, or collection of unrelated analytics panels.

## Product defaults

- Mobile first. The primary viewport is a phone held in one hand.
- PlayStation first. New games default to PlayStation/PS5 and the experience
  prioritizes PS Plus, PlayStation releases, and trophy-oriented views.
- Check-ins over timers. Timers are hidden by default and remain an optional
  power-user capability.
- Lightweight reactions over mood tracking. Mood and vibe are optional details,
  never required and never primary card content.
- Cards, shelves, Chronicle, recaps, Wrapped, and sharing are the emotional core.
- Sample data must exercise every new surface without becoming indistinguishable
  from personal data.
- Rich functionality is progressively disclosed; depth must not create clutter.

## Product architecture

The long-term navigation model has four primary spaces:

1. **Today** — the next useful action, current PlayStation activity, and one memory.
2. **Library** — living game cards arranged into automatic and personal shelves.
3. **Plan** — what to play, what is releasing, and what deserves to be bought.
4. **Chronicle** — the timeline, recaps, Wrapped archive, and shareable stories.

Discovery, PS Plus, releases, trophies, rankings, detailed statistics, and AI
remain available as contextual tools inside these spaces.

## Feature program

### 1. Player preferences

- Persist preferred ecosystem, default platform, default purchase source, PS Plus
  tier, currency/region, logging detail, timer visibility, and reaction visibility.
- Start with PlayStation, PS5, and PlayStation Store defaults.
- Hide timers and mood-heavy presentation by default.
- Use the preferences consistently in forms, recommendations, release results,
  library filters, sample data, and share cards.

### 2. Living game cards

- Give card fronts a strict content budget: artwork, relationship, one hero fact,
  and one next action.
- Adapt cards to their shelf: Playing emphasizes check-in, Wishlist emphasizes
  release/availability, Completed emphasizes rating and memory.
- Turn the back into a Game Passport containing lifecycle stamps, records,
  personal awards, recap appearances, and memorable sessions.
- Support card graduation between shelves, PlayStation/PS Plus ribbons, related
  edition/playthrough stacks, and shareable single-game cards.
- Preserve poster and compact density choices while keeping tap targets and text
  readable on mobile.

### 3. Automatic and selected shelves

- Keep the existing automatic activity shelves, but make their rules visible.
- Allow multi-select in the Library and create a shelf from the selection.
- A shelf can be static or smart. Smart shelves update from editable rules.
- Suggest PlayStation-focused shelves such as PS Plus Leaving Soon, Claimed but
  Unplayed, Near Platinum, Short PS5 Games, Current Rotation, Sequel Prep, and
  Release Runway.
- Generate shelf names, descriptions, and cover collages from the selected games.
- Allow a shelf to become a play plan, a share card, or its own Wrapped.
- Archive shelf seasons so prior rotations retain their history.

### 4. Chronicle and story timeline

- Present one continuous, editable story of purchases, starts, sessions, pauses,
  completions, releases, trophies, and personal moments.
- Support Day, Week, Month, Quarter, Year, and Lifetime zoom levels.
- Offer Director's Cut and Full History densities.
- Use editable month and year chapter covers.
- Allow a user to isolate one game's thread through the full timeline.
- Promote ordinary sessions into pinned story moments.
- Provide a PlayStation lane for trophies, PS Plus claims/departures, console
  generations, and platform milestones.

### 5. Recaps and Wrapped Vault

- Preserve the existing Week, Month, Quarter, and Year story modes.
- Give each cadence a distinct identity within a shared visual and narrative system:
  Week Replay, Monthly Chapter, Quarter Season, Year Wrapped, and Lifetime Story.
- Save every generated recap in a Wrapped Vault.
- Add Game Wrapped, Shelf Wrapped, PS Plus Wrapped, franchise/genre Wrapped, and
  custom-range Wrapped.
- Recaps should remember earlier predictions and revisit them later.
- Every screen must earn its place through a specific fact, comparison, moment,
  or forward-looking thread.
- Users can edit titles, hide screens, choose cover art, and regenerate after data
  corrections without losing the original snapshot.

### 6. Share Studio

- Provide a one-tap "What I Played" snapshot for week, month, or custom range.
- Let users choose games, metrics, recap screens, artwork, title, theme, and privacy.
- Export 9:16 Story, 4:5 feed, square, wallpaper, and long-scroll formats.
- Export Wrapped as an ordered image deck and later as a short vertical video.
- Support privacy presets: Everything, Hide Spending, Hide Hours, Highlights Only,
  and Custom.
- Allow sharing from a game card, shelf, period card, Chronicle chapter, or Wrapped.
- Use the native mobile share sheet and keep an immutable history of shared snapshots.

### 7. PlayStation and PS Plus

- Distinguish Purchased, Essential Claimed, Catalog Access, Trial, and No Longer
  Available.
- Build a PS Plus command center for This Month, Claim Before Deadline, Leaving
  Soon, Saved, Claimed but Unplayed, and Best Matches.
- Check PS Plus entitlement before recommending a purchase.
- Rank leaving-soon games by personal fit, remaining length, and available time.
- Add trophy shelves and PlayStation-specific Release Radar metadata.
- Feed PlayStation and PS Plus events into cards, shelves, Chronicle, recaps,
  Wrapped, and sharing rather than isolating them in one panel.

### 8. Mobile experience

- Use thumb-reachable primary navigation and bottom-sheet actions.
- Render shelves as horizontal rails with clear continuation affordances.
- Support one-handed selection and a bottom bulk-action bar.
- Give detail sheets multiple snap points: action, story, full detail.
- Make story navigation tap/swipe based with pause, resume, and reduced motion.
- Restore the exact shelf, card, chapter, or Wrapped screen after app switching.
- Lazy-load heavy charts and story systems; keep check-ins and saved snapshots
  available offline.

### 9. Data and trust

- Establish canonical game identity across library, wishlist, recommendations,
  releases, PS Plus, purchases, editions, and playthroughs.
- Show the source and freshness of imported metadata.
- Provide data-health, duplicate-merge, undo, and complete export/restore tools.
- AI proposes and explains changes; users preview and approve them.
- The core Library, Chronicle, check-in, shelf, and sharing workflows remain usable
  when AI or external services are unavailable.

## Single-PR delivery plan

This branch is the implementation branch for the complete feature program. It
ships as one pull request so the entire connected experience can be tested
together. Work is organized into internal, reviewable workstreams—not separate
branches or follow-up PRs:

1. Persist PlayStation-first experience preferences.
2. Hide timer and mood emphasis by default.
3. Seed sample PlayStation, PS Plus, release, session, and recap-ready data.
4. Select games and create saved shelves with generated names and covers.
5. Browse saved and automatic shelves in a mobile-first shelf rail.
6. Generate a shareable "What I Played" period snapshot.
7. Expose Week, Month, Quarter, and Year recaps through a Wrapped Vault entry point.

## Acceptance criteria for this PR

- Loading sample data produces useful Library shelves, PS Plus data, release data,
  multiple months of sessions, and at least one completed-game story.
- A user can select multiple library cards and create a named shelf on a phone.
- Saved shelves survive a reload and can be deleted without deleting games.
- A user can generate and share/download a period snapshot without exposing spend
  unless they explicitly choose it.
- Timer controls and mood decoration are not shown in the default experience.
- New game defaults prefer PS5 and PlayStation.
- The current Week/Month/Quarter/Year story modes remain available.
- The production build and focused mobile browser verification pass.

## Safety boundaries

The PR implements each product idea at the strongest level supported by the
current app and its available data. Features that would otherwise require private
PSN APIs, public hosting infrastructure, or a destructive data migration receive
a complete in-app/local version with a clear extension point. No feature is split
into a separate pull request.
