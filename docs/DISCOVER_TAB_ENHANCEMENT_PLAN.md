# Discover Tab Enhancement Plan: Upcoming & Released Game Recommendations

**Status**: Approved
**Date**: 2026-02-16
**Area**: Game Analytics — Discover Tab

---

## Overview

Enhance the existing Discover Tab recommendation engine with two explicit streams:

1. **Coming Soon** — Upcoming/unreleased games the user would like based on their taste profile
2. **For You** — Already-released games with better categorization (Hidden Gems, Genre Matches, Try Something Different)

The current system already recommends released games via AI (Gemini) + RAWG API + auto-built taste profile. This enhancement adds upcoming game discovery and structures released recommendations into meaningful categories.

---

## Current State

The Discover tab already has:
- AI-powered recommendations based on taste profile (auto-built from library data)
- RAWG API enrichment (thumbnails, metacritic, ratings, release dates)
- Status tracking (suggested → interested → wishlisted → played → dismissed)
- "Ask About a Game" single-game analysis
- Taste profile editing with auto + manual overrides
- HybridRepository storage (localStorage + Firebase)

---

## Stream 1: "Coming Soon — Games On Your Radar"

Upcoming/unreleased games the user would like, sourced from RAWG and scored by AI.

### A. Data Fetching — `getUpcomingGames()` in `rawg-api.ts`

- Use existing `browseRAWGGames()` with date filter: `dates={today},{today + 12 months}`
- Filter by user's top genres (mapped to RAWG slugs — mapping already exists in rawg-api.ts)
- Filter by user's platforms
- Fetch in batches by time window:
  - **This Month**: next 30 days
  - **Next Few Months**: 1-3 months out
  - **Later This Year**: 3-12 months out
- Cache results in localStorage with 24-hour expiry (upcoming data changes slowly)
- Minimum metacritic or RAWG rating threshold to filter noise

### B. AI Scoring — `scoreUpcomingGames()` in `ai-recommendation-service.ts`

- Send batch of upcoming games + user's taste profile to Gemini
- AI returns per game:
  - Match score (1-10)
  - Personalized reason explaining why this game fits the user
  - Hype level indicator
  - Comparison to owned games (e.g., "Similar to Elden Ring which you rated 10/10")
- Fallback: local heuristic scoring if AI is unavailable (genre match + platform match + metacritic)

### C. UI Section in Discover Tab

- New "Coming Soon" sub-tab in Discover
- Cards show: thumbnail, name, release date with countdown ("in 23 days"), platforms, genres, metacritic (if available), AI match reason
- Time grouping headers: "This Month" / "Next Few Months" / "Later This Year"
- Actions per card:
  - **Watch** — track this game for release updates (new status)
  - **Wishlist** — add directly to library as Wishlist status
  - **Not Interested** — dismiss
- "Refresh" button to fetch latest upcoming games

### D. Type Changes

- Add `'watching'` to `RecommendationStatus` union type
- Add `releaseWindow?: 'this-month' | 'next-few-months' | 'later'` to `GameRecommendation`
- Add `isUpcoming?: boolean` flag to `GameRecommendation`
- Add `hypeScore?: number` field (1-10 AI-generated match score)

### E. Storage

- Reuses existing `recommendation-storage.ts` HybridRepository
- Upcoming games stored as recommendations with `isUpcoming: true`
- Watched games persist across sessions
- 24-hour cache for RAWG upcoming game data

---

## Stream 2: "For You — Games You're Missing"

Already-released games the user doesn't own. Enhances existing recommendations with better categorization.

### A. Sub-Categories (AI-Labeled)

| Category | Description | Source Logic |
|----------|-------------|-------------|
| **"Hidden Gems You Missed"** | High-rated, lower popularity, matches user's genres | RAWG: high rating, lower added count |
| **"Popular in Your Genres"** | Top metacritic games in user's preferred genres | RAWG: genre filter + metacritic >= 75 |
| **"Because You Loved [Game]"** | Same franchise/studio/genre as user's highest-rated | AI: analyze top-rated games, find similar |
| **"Try Something Different"** | Genres user hasn't explored but might enjoy | AI: stretch genre based on play patterns |

### B. RAWG-Powered Browsing — `getReleasedRecommendations()` in `rawg-api.ts`

- Use `browseRAWGGames()` with date filter: released before today
- Filter by metacritic >= 70 (quality floor)
- Filter by user's top genres + one "stretch" genre for variety
- Exclude games already in user's library (name matching)
- Paginated results with "Load More" button

### C. AI Enhancement

- Enhance existing `generateRecommendations()` prompt to classify each recommendation into a category
- Add `recommendationCategory?: string` field to `GameRecommendation` type
- Categories displayed as section headers in the "For You" tab

---

## Unified UI Design

### Tab Structure Within Discover

```
┌─────────────────────────────────────────────┐
│ [Taste Profile Panel]  (collapsible, exists) │
├─────────────────────────────────────────────┤
│ [Coming Soon]  [For You]  [Interested]       │
├─────────────────────────────────────────────┤
│                                              │
│  Coming Soon tab:                            │
│    ┌ This Month ──────────────────────────┐  │
│    │ GameCard  GameCard  GameCard          │  │
│    └──────────────────────────────────────┘  │
│    ┌ Next Few Months ─────────────────────┐  │
│    │ GameCard  GameCard  GameCard  ...     │  │
│    └──────────────────────────────────────┘  │
│    ┌ Later This Year ─────────────────────┐  │
│    │ GameCard  GameCard  GameCard  ...     │  │
│    └──────────────────────────────────────┘  │
│                                              │
│  For You tab:                                │
│    ┌ Because You Loved Elden Ring ────────┐  │
│    │ GameCard  GameCard  GameCard          │  │
│    └──────────────────────────────────────┘  │
│    ┌ Hidden Gems You Missed ──────────────┐  │
│    │ GameCard  GameCard  GameCard          │  │
│    └──────────────────────────────────────┘  │
│    ┌ Try Something Different ─────────────┐  │
│    │ GameCard  GameCard                    │  │
│    └──────────────────────────────────────┘  │
│                                              │
│  Interested tab: (exists — saved games)      │
│  + Watching section (games being tracked)    │
│  + Dismissed section (collapsible, exists)   │
│                                              │
└─────────────────────────────────────────────┘
```

### "Ask About a Game" (Already Exists)

Works for both upcoming and released games — no changes needed.

---

## New/Modified Files

| File | Change | Effort |
|------|--------|--------|
| `lib/types.ts` | Add `watching` status, `isUpcoming`, `hypeScore`, `recommendationCategory`, `releaseWindow` fields | Low |
| `lib/rawg-api.ts` | Add `getUpcomingGames(tasteProfile)` and `getReleasedRecommendations(tasteProfile, ownedNames)` | Medium |
| `lib/ai-recommendation-service.ts` | Add `scoreUpcomingGames()`, enhance `generateRecommendations()` with categories | Medium |
| `lib/recommendation-storage.ts` | No changes (reuses existing HybridRepository) | — |
| `lib/calculations.ts` | Add `buildUpcomingFilters()`, `categorizeRecommendation()` | Low |
| `hooks/useRecommendations.ts` | Add `upcomingGames`, `generateUpcoming()`, `markWatching()`, sub-tab state | Medium |
| `components/DiscoverTab.tsx` | Add sub-tabs (Coming Soon / For You / Interested), render upcoming section, category groups | High |
| `components/RecommendationCard.tsx` | Add countdown badge, "Watch" button, hype score display, category label | Medium |

---

## New Calculation Functions

```typescript
// Build RAWG API filters from taste profile
buildUpcomingFilters(tasteProfile: TasteProfile): { genres: string[]; platforms: string[]; dateRange: { start: string; end: string } }

// Local heuristic scoring fallback when AI is unavailable
scoreUpcomingMatch(game: RAWGGameData, tasteProfile: TasteProfile): { score: number; reason: string }

// Classify a recommendation into a display category
categorizeRecommendation(game: GameRecommendation, tasteProfile: TasteProfile, library: Game[]): string
```

---

## Implementation Order

| # | Step | Files | Effort |
|---|------|-------|--------|
| 1 | Types — add new fields and status | `lib/types.ts` | Low |
| 2 | RAWG API — `getUpcomingGames()` with genre/platform/date filtering | `lib/rawg-api.ts` | Medium |
| 3 | Calculations — `buildUpcomingFilters()`, `scoreUpcomingMatch()`, `categorizeRecommendation()` | `lib/calculations.ts` | Low |
| 4 | AI Service — `scoreUpcomingGames()` for personalized match reasons | `lib/ai-recommendation-service.ts` | Medium |
| 5 | AI Service — add category classification to released recommendations | `lib/ai-recommendation-service.ts` | Low |
| 6 | Hook — upcoming state, generation, watching status, sub-tab management | `hooks/useRecommendations.ts` | Medium |
| 7 | RecommendationCard — countdown, watch button, hype score, category labels | `components/RecommendationCard.tsx` | Medium |
| 8 | DiscoverTab — sub-tabs, Coming Soon section, For You categories | `components/DiscoverTab.tsx` | High |
| 9 | Polish — loading states, empty states, error handling, caching | All files | Low |

---

## Technical Notes

### RAWG API Usage

- The `browseRAWGGames()` function already supports `dates`, `genres`, `platforms`, `metacritic`, `ordering`, and `page_size` filters
- Genre-to-RAWG-slug mapping already exists in `rawg-api.ts` (`GENRE_SLUG_MAP`)
- Rate limiting (200ms between batches) already implemented
- 7-day cache already exists for individual game searches; upcoming games use separate 24-hour cache

### AI Service

- Uses Firebase Gemini 2.5 Flash via `@google/genai` package
- Existing `generateRecommendations()` sends full library context including taste profile, franchises, reviews, active games
- New `scoreUpcomingGames()` follows the same pattern but focused on upcoming titles
- Category classification added to the system prompt for released recommendations

### Storage

- `RecommendationStatus` type is used across localStorage and Firebase
- Adding `'watching'` status requires no schema migration — it's a union type extension
- Upcoming recommendations use the same collection/key as regular recommendations, differentiated by `isUpcoming` flag

---

**Last Updated**: 2026-02-16
