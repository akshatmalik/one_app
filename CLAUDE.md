# CLAUDE.md - AI Assistant Guide

This document provides comprehensive guidance for AI assistants working with the One App codebase. It covers architecture, patterns, conventions, and workflows to ensure consistent and high-quality contributions.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture & Design Philosophy](#architecture--design-philosophy)
4. [Directory Structure](#directory-structure)
5. [Key Patterns & Conventions](#key-patterns--conventions)
6. [Development Workflow](#development-workflow)
7. [Code Style Guidelines](#code-style-guidelines)
8. [Common Tasks](#common-tasks)
9. [Testing & Quality](#testing--quality)
10. [Important Notes for AI Assistants](#important-notes-for-ai-assistants)
11. [Game Analytics Enhancement Plan](#game-analytics-enhancement-plan-approved)
12. [Game Timeline & Recap Overhaul](#game-timeline--recap-overhaul-approved)
13. [Card Redesign & Detail Panel Overhaul](#card-redesign--detail-panel-overhaul-approved)
14. [Card Info Enhancements](#card-info-enhancements-approved)
15. [Stats Overhaul Plan](#stats-overhaul-plan-approved)

---

## Project Overview

**One App** is a personal application hub built with Next.js that allows running multiple mini-applications from a single dashboard. It follows a modular architecture where each mini-app is completely isolated and independent.

### Key Features
- Central hub dashboard for launching mini-apps
- Modular mini-app architecture
- localStorage-first data persistence with migration path to backend
- Responsive design (desktop, tablet, mobile)
- TypeScript for full type safety
- Auto-deployment to Vercel on push to master

### Current Mini-Apps
1. **Game Analytics** - Track game purchases, hours played, ratings, and calculate value metrics (cost-per-hour, blend scores)
2. **Daily Tasks (Todo App)** - Daily task management with drag-and-drop reordering, date navigation, and past task review

---

## Technology Stack

### Core Technologies
- **Next.js 14** with App Router - React framework
- **TypeScript 5.4+** - Type safety with strict mode enabled
- **React 18** - UI library
- **Tailwind CSS 3** - Utility-first styling
- **Recharts 2** - Data visualization

### Key Libraries
- `uuid` - Generate unique IDs
- `clsx` - Conditional className composition
- `lucide-react` - Icon library
- `date-fns` - Date manipulation
- `firebase` - Authentication and Firestore database

### Development Tools
- **ESLint** - Linting with Next.js config
- **PostCSS** - CSS processing for Tailwind
- **Vercel** - Deployment platform with auto-deploy

### Build Configuration
- `tsconfig.json` - Strict mode, path aliases (`@/*`), ES2017 target
- `.eslintrc.json` - Next.js core-web-vitals config
- `tailwind.config.ts` - Scans `app/**` and `components/**`

---

## Architecture & Design Philosophy

### Hub Model
```
/ (Home Page)
  └─ Hub displays all mini-apps as cards
      └─ Click card → Navigate to /apps/{app-id}
          └─ Mini-app runs with full functionality
```

### Mini-App Isolation
Each mini-app is **completely isolated**:
- Own components, hooks, utilities, types
- Own storage layer and business logic
- Can be developed independently
- Easy to extract to separate package later
- NO cross-mini-app imports (except shared UI components)

### Data Persistence Strategy
**Pattern**: HybridRepository with localStorage fallback

The app uses a **HybridRepository** pattern:
- **Not logged in**: Uses localStorage (local-only mode)
- **Logged in**: Uses Firebase Firestore (cloud sync)

```typescript
// HybridRepository switches based on auth state
class HybridRepository implements Repository {
  setUserId(userId: string): void {
    this.useFirebase = !!userId && isFirebaseConfigured();
  }

  private get repo(): Repository {
    return this.useFirebase ? this.firebaseRepo : this.localRepo;
  }
}
```

### Authentication
- **Firebase Auth** with Google sign-in
- Global auth state via `AuthContext` and `useAuthContext` hook
- Sign-in/sign-out in Navigation bar
- All data models include `userId` field for per-user data

### Firestore Security Rules
Required rules in Firebase Console → Firestore → Rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Daily Tasks app
    match /tasks/{taskId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    // Game Analytics app
    match /games/{gameId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    // Budget Tracker app
    match /budgetSettings/{budgetId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    // Daily Tasks app - Settings
    match /todoAppSettings/{settingId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    // Daily Tasks app - Day Notes
    match /dayNotes/{noteId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    // Time Tracker app - Categories
    match /timeTrackerCategories/{categoryId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    // Time Tracker app - Schedule Presets
    match /timeTrackerPresets/{presetId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    // Time Tracker app - Time Entries
    match /timeTrackerEntries/{entryId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    // Last Light game - Game States
    match /lastLightGames/{gameId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    // Game Analytics - Recommendations (Discover tab)
    match /gameRecommendations/{recId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

**Note**: These rules ensure users can only access their own data by validating the `userId` field matches the authenticated user's UID.

### Design Principles
1. **Encapsulation** - Keep all app code in its directory
2. **Type Safety** - Strict TypeScript everywhere
3. **Simplicity** - Start simple, add complexity only when needed
4. **Modularity** - Each mini-app is independent
5. **Migration Path** - Design for future backend without breaking changes

---

## Directory Structure

```
one_app/
├── app/                           # Next.js App Router
│   ├── apps/                      # Mini-apps directory
│   │   └── game-analytics/        # Flagship mini-app (see Deep Dive section below)
│   │       ├── components/        # App-specific components (~20 files)
│   │       │   ├── AIChatModal.tsx       # Chat interface for AI analysis
│   │       │   ├── AIChatTab.tsx         # AI coach tab with context-aware analysis
│   │       │   ├── AdvancedCharts.tsx    # Multi-chart visualizations
│   │       │   ├── DailyActivityChart.tsx # Day-by-day activity chart
│   │       │   ├── ExpandedStatsPanel.tsx # Detailed stat breakdowns
│   │       │   ├── FunStatsPanel.tsx     # Fun/personality stats, achievements, gems, regrets
│   │       │   ├── GameBreakdownChart.tsx # Genre/platform spending breakdown
│   │       │   ├── GameCharts.tsx        # Multi-chart view of metrics
│   │       │   ├── GameForm.tsx          # Add/edit game modal (all fields)
│   │       │   ├── GameListModal.tsx     # Select games from list
│   │       │   ├── GamingHeatmap.tsx     # Visual gaming pattern heatmap
│   │       │   ├── PeriodStatsPanel.tsx  # Period-based stats (7d, 30d, etc.)
│   │       │   ├── PlayLogModal.tsx      # Log individual play sessions
│   │       │   ├── QueueGameCard.tsx     # Game card for Up Next queue
│   │       │   ├── QuickAddTimeModal.tsx # Quick play session entry
│   │       │   ├── StatsView.tsx         # Comprehensive stats dashboard
│   │       │   ├── TimelinePeriodCards.tsx # Timeline period summary cards
│   │       │   ├── TimelineView.tsx      # Monthly timeline of gaming events
│   │       │   ├── UpNextTab.tsx         # Drag-and-drop queue management
│   │       │   ├── WeekInReview.tsx      # Weekly stats visualization
│   │       │   ├── WeekStoryMode.tsx     # Narrative-style week summary
│   │       │   └── story-screens/        # Individual story mode screens (~18 files)
│   │       │       ├── OpeningScreen.tsx, TopGameScreen.tsx, Top3GamesScreen.tsx,
│   │       │       ├── TotalHoursScreen.tsx, DailyBreakdownScreen.tsx,
│   │       │       ├── SessionTypesScreen.tsx, BestValueScreen.tsx,
│   │       │       ├── GamingPersonalityScreen.tsx, GenreUniverseScreen.tsx,
│   │       │       ├── GamingHeatmapScreen.tsx, ValueUtilizedScreen.tsx,
│   │       │       ├── MoneyComparisonScreen.tsx, AchievementsScreen.tsx,
│   │       │       ├── ComparisonScreen.tsx, FunFactsScreen.tsx,
│   │       │       ├── WeekVibeScreen.tsx, TimeTravelScreen.tsx,
│   │       │       ├── AIBlurbScreen.tsx, ClosingScreen.tsx
│   │       ├── hooks/             # Custom React hooks
│   │       │   ├── useAnalytics.ts      # Metrics calculation & memoization
│   │       │   ├── useBudget.ts         # Yearly budget tracking
│   │       │   ├── useGameQueue.ts      # "Up Next" queue management
│   │       │   ├── useGameThumbnails.ts # Auto-fetch RAWG thumbnails
│   │       │   └── useGames.ts          # Core game CRUD operations
│   │       ├── lib/               # Business logic & utilities
│   │       │   ├── ai-service.ts        # AI analysis service
│   │       │   ├── budget-storage.ts    # Budget repository (Hybrid)
│   │       │   ├── calculations.ts      # 70+ pure functions (~2300 lines)
│   │       │   ├── rawg-api.ts          # RAWG API integration for thumbnails
│   │       │   ├── storage.ts           # Game repository (Hybrid)
│   │       │   └── types.ts             # TypeScript interfaces
│   │       ├── data/              # Static/seed data
│   │       │   └── baseline-games.ts    # Sample games for demo/onboarding
│   │       ├── layout.tsx         # App layout
│   │       └── page.tsx           # Main entry point (tab-based: Games, Timeline, Stats, AI Coach, Up Next)
│   ├── layout.tsx                 # Root layout with Navigation
│   ├── page.tsx                   # Hub home page
│   └── globals.css                # Global styles
│
├── components/                    # Shared components
│   ├── ui/                        # Reusable UI primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── Table.tsx
│   ├── HubCard.tsx               # App launcher card
│   ├── HubGrid.tsx               # App grid layout
│   └── Navigation.tsx            # Top navigation bar
│
├── lib/                          # Shared utilities
│   ├── mini-apps.ts              # Registry of all apps
│   └── utils.ts                  # Helper functions
│
├── types/                        # Global types
│   └── mini-app.ts               # MiniApp interface
│
├── docs/                         # Documentation
│   └── ADDING_MINI_APPS.md       # Guide to create new apps
│
├── scripts/                      # Automation scripts
│   └── create-mini-app.sh        # Template generator
│
├── .gitignore
├── .eslintrc.json
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── README.md                     # User-facing documentation
└── CLAUDE.md                     # This file
```

---

## Key Patterns & Conventions

### 1. Repository Pattern (Data Layer)

**Purpose**: Abstract data storage to enable easy migration from localStorage to API.

**Structure**:
```typescript
// lib/types.ts - Define interface
export interface ItemRepository {
  getAll(): Promise<Item[]>;
  getById(id: string): Promise<Item | null>;
  create(item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<Item>;
  update(id: string, updates: Partial<Item>): Promise<Item>;
  delete(id: string): Promise<void>;
}

// lib/storage.ts - Implement with localStorage
export class LocalStorageRepository implements ItemRepository {
  async getAll(): Promise<Item[]> {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }
  // ... implement other methods
}

export const repository = new LocalStorageRepository();
```

**Important**: Always check `typeof window === 'undefined'` in `getAll()` for SSR compatibility.

### 2. Custom Hooks Pattern

**Purpose**: Encapsulate data operations and state management.

**Structure**:
```typescript
// hooks/useItems.ts
'use client';

import { useState, useEffect } from 'react';
import { repository } from '../lib/storage';

export function useItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      const data = await repository.getAll();
      setItems(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const addItem = async (data) => {
    try {
      const item = await repository.create(data);
      await refresh();
      return item;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  return { items, loading, error, addItem, updateItem, deleteItem, refresh };
}
```

**Key points**:
- Always include `loading` and `error` states
- Call `refresh()` after mutations to update UI
- Throw errors from mutations so components can handle them
- Mark with `'use client'` directive

### 3. Type-First Development

**All data must be typed**:
```typescript
// lib/types.ts - Game Analytics example (see Deep Dive for full types)
export type GameStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Wishlist' | 'Abandoned';
export type PurchaseSource = 'Steam' | 'PlayStation' | 'Xbox' | 'Nintendo' | 'Epic' | 'GOG' | 'Physical' | 'Other';
export type SubscriptionSource = 'PS Plus' | 'Game Pass' | 'Epic Free' | 'Prime Gaming' | 'Humble Choice' | 'Other';

export interface Game {
  id: string;
  userId: string;
  name: string;
  price: number;
  hours: number;           // Baseline hours (manual entry)
  rating: number;          // 1-10
  status: GameStatus;
  platform?: string;
  genre?: string;
  franchise?: string;      // Game series (e.g., "Final Fantasy")
  purchaseSource?: PurchaseSource;
  acquiredFree?: boolean;  // Free/subscription game tracking
  originalPrice?: number;  // For calculating savings
  subscriptionSource?: SubscriptionSource;
  notes?: string;
  review?: string;         // Personal review/thoughts
  datePurchased?: string;
  startDate?: string;      // When started playing
  endDate?: string;        // When finished/stopped
  playLogs?: PlayLog[];    // Individual play sessions
  thumbnail?: string;      // Auto-fetched from RAWG API
  queuePosition?: number;  // Position in "Up Next" queue
  createdAt: string;       // ISO date strings
  updatedAt: string;
}
```

**Type conventions**:
- Interfaces for objects
- Type aliases for unions/primitives
- Use `Omit<Type, 'field'>` for creation data
- Use `Partial<Type>` for updates
- Optional fields with `?`
- String literals for enums (when few options)

### 4. Business Logic Separation

**Keep calculations pure** in `lib/calculations.ts`:
```typescript
// Pure functions - no side effects, easy to test
export function calculateCostPerHour(price: number, hours: number): number {
  return hours > 0 ? price / hours : 0;
}

export function calculateMetrics(game: Game): GameMetrics {
  const costPerHour = calculateCostPerHour(game.price, game.hours);
  return {
    costPerHour,
    blendScore: calculateBlendScore(game.rating, costPerHour),
    normalizedCost: costPerHour / BASELINE_COST,
  };
}
```

**Benefits**:
- Easy to test (pure functions)
- Reusable across components
- No React dependencies
- Clear separation of concerns

### 5. Component Organization

**Page components** (`page.tsx`):
- Entry point for the route
- Compose sub-components
- Usually client components for interactivity

**Feature components** (`components/`):
- Focused on single responsibility
- Accept data via props
- Use custom hooks for data operations

**UI components** (`components/ui/`):
- Generic, reusable across apps
- Accept variants/sizes via props
- Use `clsx` for conditional classes

**Example UI component**:
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        'font-medium rounded-lg transition-colors',
        {
          'px-3 py-2 text-sm': size === 'sm',
          'px-4 py-2 text-base': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',
        },
        {
          'bg-purple-600 text-white hover:bg-purple-700': variant === 'primary',
          'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary',
        },
        className
      )}
      {...props}
    />
  );
}
```

### 6. Mini-App Registration

**All mini-apps must be registered** in `lib/mini-apps.ts`:
```typescript
export const MINI_APPS: MiniApp[] = [
  {
    id: 'game-analytics',           // URL slug
    name: 'Game Analytics',          // Display name
    description: 'Track game purchases, hours played, and value metrics',
    icon: '🎮',                      // Emoji icon
    path: '/apps/game-analytics',    // Route path
    color: '#8B5CF6',                // Brand color (hex)
    tags: ['analytics', 'gaming'],   // Optional tags
    isNew: true,                     // Optional "New" badge
    isComingSoon: false,             // Optional disabled state
  },
];
```

---

## Development Workflow

### Setting Up a New Mini-App

1. **Generate template** (recommended):
   ```bash
   ./scripts/create-mini-app.sh my-app "My App" "Description"
   ```

2. **Or create manually**:
   ```
   app/apps/my-app/
   ├── page.tsx
   ├── layout.tsx (optional)
   ├── components/
   ├── hooks/
   ├── lib/
   │   ├── types.ts
   │   └── storage.ts
   └── data/
   ```

3. **Register in `lib/mini-apps.ts`**

4. **Develop features**:
   - Define types first
   - Implement repository
   - Create custom hook
   - Build UI components
   - Test in browser

5. **Commit and push**:
   ```bash
   git add .
   git commit -m "Add My App mini-app"
   git push
   ```

### Local Development

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Build for production
npm run start    # Run production build locally
npm run lint     # Check for linting errors
```

### Git Workflow

- **Main branch**: `master` (auto-deploys to production)
- **Feature branches**: `feature/my-feature`
- **Commit messages**: Clear, descriptive (e.g., "Add task filtering to game analytics")
- **Pull requests**: For collaborative work
- **Auto-deployment**: Merging to `master` triggers Vercel deployment

### Deployment

- **Platform**: Vercel
- **Auto-deploy**: Push to `master` → Production
- **Preview deploys**: Pull requests → Preview URL
- **Environment**: Set env vars in Vercel dashboard

---

## Code Style Guidelines

### TypeScript

✅ **DO**:
- Enable strict mode (already configured)
- Type all function parameters and returns
- Use interfaces for object shapes
- Use type aliases for unions
- Leverage type inference where clear
- Use `Partial<T>` and `Omit<T, K>` utilities

❌ **DON'T**:
- Use `any` (use `unknown` if truly needed)
- Disable strict checks
- Over-specify obvious types

**Example**:
```typescript
// Good
interface User {
  id: string;
  name: string;
}

async function getUser(id: string): Promise<User | null> {
  // Type inference works for 'user'
  const user = await repository.getById(id);
  return user;
}

// Bad
async function getUser(id: any): Promise<any> {
  const user: any = await repository.getById(id);
  return user;
}
```

### React

✅ **DO**:
- Use functional components
- Use hooks for state and effects
- Mark client components with `'use client'`
- Keep components focused (single responsibility)
- Extract reusable logic to custom hooks
- Use `children` prop for composition

❌ **DON'T**:
- Use class components
- Put `'use client'` on everything (use only when needed)
- Make components do too much
- Duplicate logic across components

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `GameForm.tsx`, `Button.tsx` |
| Hooks | camelCase with `use` prefix | `useGames.ts`, `useAnalytics.ts` |
| Functions | camelCase | `calculateMetrics()`, `formatCurrency()` |
| Types/Interfaces | PascalCase | `Game`, `GameRepository` |
| Constants | UPPER_SNAKE_CASE | `STORAGE_KEY`, `BASELINE_COST` |
| Variables | camelCase | `gameData`, `isLoading` |
| Files (util) | kebab-case or camelCase | `calculations.ts`, `utils.ts` |

### File Organization

**One component per file**:
```typescript
// GameForm.tsx
export function GameForm() { /* ... */ }

// NOT: components.tsx with multiple exports
```

**Barrel exports** (optional):
```typescript
// components/index.ts
export { GameForm } from './GameForm';
export { GameTable } from './GameTable';
```

### Styling with Tailwind

✅ **DO**:
- Use Tailwind utility classes
- Use `clsx` for conditional classes
- Keep responsive design in mind (`sm:`, `md:`, `lg:`)
- Use semantic color names where possible

❌ **DON'T**:
- Write custom CSS unless absolutely necessary
- Use inline styles
- Create one-off utility classes

**Example**:
```typescript
<div className={clsx(
  'rounded-lg p-6',
  'bg-white shadow-sm',
  'hover:shadow-md transition-shadow',
  isActive && 'border-2 border-purple-600'
)}>
  Content
</div>
```

### Comments

**When to comment**:
- Complex business logic or algorithms
- Non-obvious workarounds
- Public API documentation (JSDoc)
- TODO/FIXME markers

**When NOT to comment**:
- Obvious code (`// set loading to true`)
- Redundant descriptions
- Commented-out code (delete it)

**Example**:
```typescript
// Good - explains WHY
// Normalize cost against $3.50/hour baseline to make blend scores comparable
const normalizedCost = costPerHour / BASELINE_COST;

// Bad - explains WHAT (already obvious)
// Calculate the average rating
const avgRating = totalRating / games.length;
```

---

## Common Tasks

### Adding a New Component

1. Create file in appropriate directory:
   - App-specific: `app/apps/{app}/components/`
   - Shared UI: `components/ui/`
   - Shared feature: `components/`

2. Define props interface:
   ```typescript
   interface MyComponentProps {
     title: string;
     onSubmit: (data: FormData) => void;
     className?: string;
   }
   ```

3. Implement component:
   ```typescript
   export function MyComponent({ title, onSubmit, className }: MyComponentProps) {
     return <div className={className}>{/* ... */}</div>;
   }
   ```

### Adding a New Hook

1. Create in `app/apps/{app}/hooks/`
2. Mark with `'use client'`
3. Follow the pattern:
   ```typescript
   'use client';

   export function useMyFeature() {
     const [data, setData] = useState();
     const [loading, setLoading] = useState(false);

     // Logic here

     return { data, loading, /* methods */ };
   }
   ```

### Adding New Types

1. Define in `lib/types.ts` within the mini-app
2. Export for use in other files
3. Use meaningful names
4. Document complex types with comments

### Migrating from localStorage to API

1. **Create API route** (`app/api/items/route.ts`):
   ```typescript
   export async function GET() {
     const items = await db.getItems();
     return Response.json(items);
   }
   ```

2. **Implement ApiRepository**:
   ```typescript
   export class ApiRepository implements ItemRepository {
     async getAll(): Promise<Item[]> {
       const res = await fetch('/api/items');
       return res.json();
     }
   }
   ```

3. **Swap implementation**:
   ```typescript
   // lib/storage.ts
   export const repository = new ApiRepository(); // Was: LocalStorageRepository
   ```

4. **No component changes needed!**

---

## Testing & Quality

### Pre-commit Checklist

Before committing:
- [ ] Run `npm run build` - Ensure no TypeScript errors
- [ ] Run `npm run lint` - Ensure no linting errors
- [ ] Test in browser - Verify functionality works
- [ ] Check responsive design - Test mobile/tablet views
- [ ] Review changes - Ensure no unintended modifications

### Code Quality

**TypeScript strict mode** catches:
- Null/undefined errors
- Type mismatches
- Missing return values
- Unused variables

**ESLint** enforces:
- React best practices
- Next.js conventions
- Code consistency

### Manual Testing

Test these scenarios:
1. **CRUD operations** - Create, read, update, delete data
2. **Edge cases** - Empty states, zero values, long text
3. **Error handling** - Network failures, validation errors
4. **localStorage** - Clear storage, reload page
5. **Responsive** - Mobile, tablet, desktop views

### Performance Considerations

- Use `useMemo` for expensive calculations
- Use `useCallback` for stable function references
- Lazy load images if needed
- Check Next.js build output for bundle sizes

---

## Important Notes for AI Assistants

### Understanding the Codebase

1. **Read before modifying**: Always read the current file state before making changes.

2. **Context is key**: This is a hub for mini-apps. Each app is isolated. Don't mix concerns.

3. **Follow existing patterns**: Look at `game-analytics` as the reference implementation for new mini-apps.

4. **TypeScript strict mode**: All code must pass strict type checking. No `any` types.

### Making Changes

1. **Minimal changes**: Only modify what's necessary. Don't refactor unrelated code.

2. **Preserve patterns**: Follow the repository pattern, custom hooks pattern, and component organization.

3. **Type safety first**: Define types before implementing features.

4. **Test locally**: Changes should work with `npm run build` and `npm run dev`.

### Common Pitfalls to Avoid

❌ **Don't**:
- Import from other mini-apps' internals (except shared `components/ui/`)
- Use `any` type
- Skip the repository pattern (always abstract storage)
- Create tightly coupled components
- Mix business logic into components
- Forget `'use client'` on components using hooks
- Skip `typeof window === 'undefined'` check in storage
- Hardcode values that should be configurable
- Add dependencies without considering bundle size

✅ **Do**:
- Follow the existing directory structure
- Use the repository pattern for all data operations
- Keep components focused and testable
- Separate business logic into pure functions
- Use TypeScript's type system fully
- Handle loading and error states in UI
- Make responsive designs
- Write clear commit messages

### When Adding New Features

1. **Understand the request**: Ask clarifying questions if needed.

2. **Check existing code**: See if similar functionality exists.

3. **Plan the changes**:
   - What types are needed?
   - What repository methods?
   - What components?
   - Where in the file structure?

4. **Implement incrementally**:
   - Types first
   - Repository/storage layer
   - Custom hooks
   - Components
   - UI polish

5. **Verify**:
   - TypeScript compiles
   - Linting passes
   - Functionality works in browser

### Working with the Hub Model

**The hub (`app/page.tsx`)** shows all mini-apps. To add a new app:

1. Create directory: `app/apps/{app-slug}/`
2. Add to registry: `lib/mini-apps.ts`
3. App appears automatically on hub

**Navigation**: The `Navigation` component is global. Mini-apps don't need their own nav.

**Layouts**: Mini-apps can have custom layouts (`app/apps/{app}/layout.tsx`) or use root layout.

### Data Persistence Guidelines

**Current state**: All data in localStorage

**Future state**: Backend API

**Your responsibility**: Follow the repository pattern so migration is seamless.

**Example scenario**:
- User asks to "add a database"
- Don't refactor components
- Just implement `ApiRepository` and swap in `storage.ts`

### Deployment Awareness

- **Auto-deploy**: Pushing to `master` deploys to production
- **Feature branches**: Use for work in progress
- **Environment vars**: Set in Vercel, not committed
- **Build errors**: Fix before pushing (run `npm run build`)

### Documentation Updates

When adding features:
- Update `README.md` if user-facing
- Update `ADDING_MINI_APPS.md` if pattern changes
- Update this file (`CLAUDE.md`) if conventions change
- Keep documentation in sync with code

---

## Quick Reference

### Import Paths

```typescript
// Shared components
import { Button } from '@/components/ui/Button';
import { HubCard } from '@/components/HubCard';

// Shared utilities
import { MINI_APPS } from '@/lib/mini-apps';

// App-specific (relative)
import { useGames } from '../hooks/useGames';
import { Game } from '../lib/types';
```

### Common Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Run production build
npm run lint         # Check linting

# Mini-apps
./scripts/create-mini-app.sh <slug> "<name>" "<description>"

# Git
git checkout -b feature/my-feature
git add .
git commit -m "Clear message"
git push -u origin feature/my-feature
```

### File Templates

**Component**:
```typescript
interface MyComponentProps {
  // Props here
}

export function MyComponent({ }: MyComponentProps) {
  return (
    <div>
      {/* Content */}
    </div>
  );
}
```

**Hook**:
```typescript
'use client';

import { useState, useEffect } from 'react';

export function useMyHook() {
  const [data, setData] = useState();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load data
  }, []);

  return { data, loading };
}
```

**Types**:
```typescript
export interface MyType {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface MyRepository {
  getAll(): Promise<MyType[]>;
  getById(id: string): Promise<MyType | null>;
  create(item: Omit<MyType, 'id' | 'createdAt' | 'updatedAt'>): Promise<MyType>;
  update(id: string, updates: Partial<MyType>): Promise<MyType>;
  delete(id: string): Promise<void>;
}
```

---

## Game Analytics Deep Dive

This section provides comprehensive documentation of the Game Analytics mini-app — the flagship app in the hub. It is the most complex mini-app with ~11,400 lines of code across 50+ files. **Read this section before modifying any game-analytics code.**

### File Inventory (~11,400 LOC)

| File | Purpose | LOC (approx) |
|------|---------|---------------|
| `page.tsx` | Main entry: tab nav (Games/Timeline/Stats/AI Coach/Up Next), header stats, game cards, sort/filter | ~600 |
| `lib/types.ts` | All interfaces: Game, PlayLog, GameMetrics, AnalyticsSummary, BudgetSettings, GameRepository | ~123 |
| `lib/calculations.ts` | 70+ pure functions for metrics, analytics, personality, achievements | ~2,300 |
| `lib/storage.ts` | HybridRepository: LocalStorage + Firebase game CRUD | ~200 |
| `lib/budget-storage.ts` | HybridRepository for yearly budget settings | ~200 |
| `lib/rawg-api.ts` | RAWG API integration: search, batch fetch, 7-day localStorage cache | ~150 |
| `lib/ai-service.ts` | AI analysis service for gaming coach | ~100 |
| `hooks/useGames.ts` | Core CRUD: games, loading, error, addGame, updateGame, deleteGame, refresh | ~80 |
| `hooks/useAnalytics.ts` | Memoized: gamesWithMetrics (enriched games), summary (aggregate stats) | ~50 |
| `hooks/useBudget.ts` | Budget CRUD: budgets, setBudget, deleteBudget, getBudgetForYear | ~60 |
| `hooks/useGameQueue.ts` | Queue: queuedGames, availableGames, addToQueue, removeFromQueue, reorderQueue | ~80 |
| `hooks/useGameThumbnails.ts` | Auto-fetch RAWG thumbnails with rate limiting + localStorage cache | ~60 |
| `components/StatsView.tsx` | Dashboard: charts, breakdowns by genre/platform/source, budget tracking | ~800 |
| `components/FunStatsPanel.tsx` | Fun stats: personality, achievements, hidden gems, regret purchases, streaks | ~600 |
| `components/TimelineView.tsx` | Monthly timeline of all gaming events (purchases, starts, completions, logs) | ~500 |
| `components/WeekStoryMode.tsx` | Instagram-story-style weekly wrap with 18 animated screens | ~300 |
| `components/WeekInReview.tsx` | Weekly stats visualization | ~200 |
| `components/UpNextTab.tsx` | Drag-and-drop queue management with search | ~250 |
| `components/GameForm.tsx` | Full game add/edit modal with all fields | ~400 |
| `components/PlayLogModal.tsx` | Add play sessions with date, hours, notes | ~200 |
| `components/AIChatTab.tsx` | AI coach tab with week/month context | ~150 |
| `components/AdvancedCharts.tsx` | Scatter, radar, area charts | ~300 |
| `components/GamingHeatmap.tsx` | Visual gaming pattern heatmap | ~200 |
| `data/baseline-games.ts` | Sample games for demo/onboarding | ~500 |
| `story-screens/*.tsx` | 18 individual story mode screens | ~1,500 total |

### Data Model

**Core Types** (in `lib/types.ts`):
- `Game` — 20+ fields: id, userId, name, price, hours, rating, status, platform, genre, franchise, purchaseSource, acquiredFree, originalPrice, subscriptionSource, notes, review, datePurchased, startDate, endDate, playLogs[], thumbnail, queuePosition, createdAt, updatedAt
- `PlayLog` — id, date, hours, notes (individual play sessions)
- `GameStatus` — 'Not Started' | 'In Progress' | 'Completed' | 'Wishlist' | 'Abandoned'
- `PurchaseSource` — Steam, PlayStation, Xbox, Nintendo, Epic, GOG, Physical, Other
- `SubscriptionSource` — PS Plus, Game Pass, Epic Free, Prime Gaming, Humble Choice, Other
- `GameMetrics` — costPerHour, blendScore, normalizedCost, valueRating, roi, daysToComplete
- `AnalyticsSummary` — 30+ aggregate fields: counts, financial, time, completion, highlights, breakdowns by genre/platform/source/year/franchise, subscription stats
- `BudgetSettings` — id, userId, year, yearlyBudget, createdAt, updatedAt
- `GameRepository` — setUserId, getAll, getById, create, update, delete

### Calculations Engine (~70 exported functions)

**Core Metrics:**
- `getTotalHours(game)` — baseline hours + sum of playLog hours
- `calculateCostPerHour(price, hours)` — price / hours
- `calculateBlendScore(rating, costPerHour)` — combines rating (0-10) and cost efficiency against $3.50/hr baseline
- `getValueRating(costPerHour)` — Excellent (<=1), Good (<=3), Fair (<=5), Poor (>5)
- `calculateROI(rating, hours, price)` — exponential rating weight formula (calibrated: $70, 15h, 9/10 = ROI of 10)
- `calculateDaysToComplete(startDate, endDate)` — days between dates
- `calculateMetrics(game)` — returns full GameMetrics object
- `calculateSummary(games)` — returns full AnalyticsSummary with all breakdowns

**Time-Based Analytics:**
- `getAllPlayLogs(games)` — all play sessions across all games, sorted by date
- `getHoursByMonth(games)` — hours aggregated by month
- `getSpendingByMonth(games)` — spending aggregated by month
- `getCumulativeSpending(games)` — monthly cumulative spend chart data
- `getPeriodStats(games, days)` / `getPeriodStatsForRange(games, start, end)` — gamesPlayed, totalHours, totalSessions, mostPlayedGame, avgSessionLength for any period
- `getLastWeekStats(games)` / `getLastMonthStats(games)` — convenience wrappers
- `getWeekStatsForOffset(games, offset)` — comprehensive WeekInReviewData (~500 lines of logic): daily breakdown, achievements, personality, session analysis, comparisons to previous week, fun facts, money stats, genre/platform charts
- `getLastCompletedWeekStats(games)` — auto-finds last week with activity
- `getAvailableWeeksCount(games)` — how many weeks back have data
- `getGamesPlayedInTimeRange(games, start, end)` — filter games by date range

**Discovery & Insights:**
- `findHiddenGems(games)` — low price, high hours, high rating
- `findRegretPurchases(games)` — expensive, low playtime with regretScore
- `findShelfWarmers(games)` — unstarted games sitting 30+ days
- `getHiddenGems(games)` — alternate: games with high hours + high rating + low cost
- `getValueChampion(games)` — lowest cost-per-hour paid game

**Personality & Behavior:**
- `getGamingPersonality(games)` — 7 types with scores: Completionist, Deep Diver, Sampler, Backlog Hoarder, Balanced Gamer, Speedrunner, Explorer
- `getSessionAnalysis(games)` — 5 styles: Marathon Runner (3+hrs), Snack Gamer (<=1hr), Weekend Warrior, Consistent Player, Binge & Rest
- `getRotationStats(games)` — active games (last 14 days), cooling off (30-60+ days), rotation health: Obsessed/Focused/Healthy/Juggling/Overwhelmed

**Streaks & Velocity:**
- `getCurrentGamingStreak(games)` / `getLongestGamingStreak(games)` — consecutive days with play logs
- `getGamingVelocity(games, days)` — hours per day over period
- `getBestGamingMonth(games)` — highest hour month
- `getCompletionVelocity(games)` — games completed per month

**Fun/Creative Stats:**
- `getImpulseBuyerStat(games)` — avg days between purchase and first play
- `getBacklogInDays(games)` — estimated days to clear backlog (20h/game)
- `getGenreDiversity(games)` — unique genres as % of total
- `getCommitmentScore(games)` — % of library with 10+ hours
- `getFastestCompletion(games)` / `getSlowestCompletion(games)` — completion speed records
- `getLongestSession(games)` — longest single play session
- `getCenturyClubGames(games)` — games with 100+ hours
- `getQuickFixGames(games)` — games under 5 hours total
- `getPatientGamerStats(games)` — games bought on discount: count, avgDiscount, totalSaved
- `getCompletionistRate(games)` — various completion metrics
- `getMostInvestedFranchise(games)` — franchise with most spending/hours
- `getAverageDiscount(games)` — average discount % across discounted games
- `getNightOwlScore(games)` — placeholder for time-of-day analysis

**Advanced Analytics:**
- `getDiscountEffectiveness(games)` — avgSavings per discounted game, bestDeal
- `getPlatformPreference(games)` — hours and score by platform
- `getMoneyStats(games)` — comprehensive money analysis for story mode
- `getGamingAchievements(games)` — 20+ fun achievements with name, description, earned status
- `getYearInReview(games, year)` — comprehensive yearly stats
- `getLifetimeStats(games)` — lifetime totals across all data
- `getPredictedBacklogClearance(games)` — when backlog will be finished
- `getGenreRutAnalysis(games)` — detect if stuck in one genre
- `getMonthlyTrends(games, monthCount)` — trends over months for forecasting
- `getROIRating(roi)` — Excellent/Good/Fair/Poor for ROI values

### UI Architecture

**Main Page Layout** (`page.tsx`):
```
┌─────────────────────────────────────────────────────┐
│ Header: 6 stat cards (games, hours, spent, avg      │
│         rating, cost/hr, completion rate)            │
│ Highlights: best value, most played game             │
├─────────────────────────────────────────────────────┤
│ Tab Bar: [Games] [Timeline] [Stats] [AI Coach] [Up Next] │
├─────────────────────────────────────────────────────┤
│ Games Tab:                                           │
│   Filter: All | Owned | Wishlist                     │
│   Sort: Recently Played | Date Added | Name |        │
│         Price | Hours | Rating | Value                │
│   Game Cards: thumbnail, status, tags, value rating, │
│              stats grid, review, play log summary,    │
│              action buttons (log time, queue, delete) │
│   + Add Game button / Load Samples (empty state)     │
├─────────────────────────────────────────────────────┤
│ Timeline Tab: monthly groups of events               │
│ Stats Tab: charts, breakdowns, budget, fun stats     │
│ AI Coach Tab: AI-powered gaming analysis             │
│ Up Next Tab: drag-and-drop priority queue            │
└─────────────────────────────────────────────────────┘
```

**Component Hierarchy**:
- `page.tsx` → orchestrates all hooks, manages state, renders tabs
  - `GameForm` → modal for add/edit with all game fields
  - `PlayLogModal` → modal for logging play sessions
  - `TimelineView` → monthly event timeline with `TimelinePeriodCards`
  - `StatsView` → dashboard with sub-panels:
    - `PeriodStatsPanel` — last 7d / 30d stats
    - `FunStatsPanel` — personality, achievements, gems, regrets, streaks
    - `AdvancedCharts` — scatter, radar, area charts
    - `GamingHeatmap` — visual gaming patterns
    - `ExpandedStatsPanel` — detailed breakdowns
  - `AIChatTab` → AI coach with `AIChatModal`
  - `UpNextTab` → queue with `QueueGameCard`
  - `WeekInReview` → weekly stats with `WeekStoryMode` → 18 `story-screens/*`

### Storage Layer

**Pattern**: HybridRepository (same pattern for games and budgets)
- **Not logged in** → `LocalStorageGameRepository` (key: `game-analytics-games-{userId}`)
- **Logged in** → `FirebaseGameRepository` (Firestore collection: `games`, filtered by userId)
- `HybridRepository` switches based on `setUserId()` + `isFirebaseConfigured()`
- Budget uses same pattern: `LocalStorageBudgetRepository` / `FirebaseBudgetRepository` / `HybridBudgetRepository`

**External Integrations:**
- **RAWG API** (`lib/rawg-api.ts`): auto-fetches game thumbnails, 7-day localStorage cache, 300ms rate limiting, cleans game names for better search accuracy

### Current Features Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Game CRUD (add/edit/delete) | Done | Full form with 20+ fields |
| Play session logging | Done | Individual sessions with date, hours, notes |
| Auto-start on first play | Done | Changes status from 'Not Started' to 'In Progress' |
| Sort by 7 criteria | Done | Recently played, date added, name, price, hours, rating, value |
| Filter owned/wishlist | Done | Tab-style filter |
| 50+ calculated metrics | Done | Personality, achievements, streaks, velocity, etc. |
| Weekly story mode | Done | Instagram-story-style 18-screen weekly wrap |
| Budget tracking | Done | Yearly budgets with spend tracking |
| Up Next queue | Done | Drag-and-drop priority queue |
| Timeline view | Done | Monthly event groupings |
| RAWG thumbnails | Done | Auto-fetched with caching |
| AI Coach | Done | Context-aware gaming analysis |
| Charts (bar, pie, line, scatter, radar, area) | Done | Recharts library |
| Gaming heatmap | Done | Visual play patterns |
| Sample data loading | Done | Baseline games for new users |
| Firebase cloud sync | Done | HybridRepository pattern |

---

## Game Analytics Enhancement Plan (Approved)

24 features approved, organized into 5 implementation phases. User feedback incorporated.

### Phase 1: Stats & Insights (Pure calculations + display panels)

#### 1. Guilt-Free Gaming Calculator
Compare your gaming cost-per-hour against other entertainment: Movies (~$12/hr), Concerts (~$25/hr), Dining Out (~$15/hr), Streaming (~$2/hr), Gym (~$3/hr), Books (~$5/hr). Bar chart with your gaming highlighted. Headline: "Your gaming costs $1.80/hr — 6.7x cheaper than movies. You've saved $2,340 vs equivalent movie hours." Show both your average AND your best game's cost-per-hour.
**Files**: `components/ValueComparison.tsx`, `getEntertainmentComparison()` in calculations.ts, embed in StatsView.

#### 2. Backlog Doomsday Clock
Enhance existing `getPredictedBacklogClearance()` with visual component. Dramatic countdown with ticking clock aesthetic. Track whether doomsday is getting closer or further: "You added 3 games and completed 1 — doomsday moved 47 days further." Humor tiers: "Heat Death of Universe" (never), "Retirement Project" (10+ yrs), "Long Haul" (3-10), "Getting There" (1-3), "Almost Free" (<1yr), "Backlog Zero" (cleared!).
**Files**: `components/BacklogDoomsday.tsx`, enhance calculation with trend data, add to FunStatsPanel.

#### 3. Spending Forecast
Project annual spend from monthly patterns. "At your current pace, you'll spend ~$840 this year." Line chart: actual (solid) vs projected (dashed) vs budget (red). Traffic light: green (under), yellow (within 10%), red (over). Monthly progress showing where you are vs where you should be.
**Files**: `getSpendingForecast(games, year)` in calculations.ts, chart section in StatsView budget area.

#### 4. "On This Day" Retrospective
Subtle card above tab bar when historical events match today's date. "1 year ago you started Elden Ring" / "6 months ago you completed Astro Bot." Match month+day across years from all date fields. Support shorter durations too — show 1-month, 3-month, 6-month, 1-year lookbacks. Carousel if multiple events. Game thumbnail + event + time ago.
**Files**: `getOnThisDay(games)` in calculations.ts, `components/OnThisDayCard.tsx`, embed at top of page.tsx.
**User note**: Include shorter durations (1mo, 3mo, 6mo), not just yearly anniversaries.

#### 5. Price Sweet Spot + Discount Effectiveness
Group games by price bracket ($0-15, $15-30, $30-50, $50-70, $70+). Per bracket: avg rating, avg hours, avg cost-per-hour, completion rate, count. "Your best value games are $15-30." **Plus discount analysis**: avg savings on discounted games, best deal ever, completion rate of discounted vs full-price games, "Discounted games give you 2x more hours on average."
**Files**: `getPriceBracketAnalysis(games)` and `getDiscountInsights(games)` in calculations.ts, new section in StatsView.
**User note**: Include discount-specific insights alongside price brackets.

#### 6. Cost-Per-Completion
Total spent / games completed = your cost to finish a game. Show both "clean" (just completed) and "true" (including abandoned waste). Trend over time. "It costs you $125 on average to complete a game. If you stopped buying abandoned-genre games, it'd be $85."
**Files**: `getCostPerCompletion(games)` in calculations.ts, display in ExpandedStatsPanel.

#### 7. Activity Pulse
Real-time indicator in page header showing current gaming state. Based on recent play frequency: "On Fire" (daily this week), "Cruising" (3-5 days), "Casual" (1-2 days), "Cooling Off" (nothing this week), "Hibernating" (2+ weeks). Pulsing glow animation — faster when more active. Makes the app feel alive.
**Files**: `getActivityPulse(games)` in calculations.ts, visual component in page.tsx header, CSS pulse animation.

#### 8. Rating Distribution & Bias Analysis
Histogram of 1-10 ratings. Are you generous (mostly 7-10) or tough? Show average, median, mode. "You're a generous rater — 70% of games are 7+." Detect rating inflation over time (newer games rated higher?). Compare to balanced distribution.
**Files**: `getRatingDistribution(games)` in calculations.ts, chart in StatsView.

### Phase 2: Analytics (Complex calculations + visualizations)

#### 9. Completion Probability Predictor
Per-game prediction: likelihood you'll finish based on your history. Factors: genre completion rate, session frequency decay, days since last session, hours invested vs typical for genre. Badge on game cards: "73% likely to complete." Factor breakdown in detail view.
**Files**: `getCompletionProbability(game, allGames)` in calculations.ts, badge display in page.tsx game cards.

#### 10. Genre Satisfaction Matrix
Bubble chart. X: avg hours per genre, Y: avg rating per genre, bubble size: game count. Four quadrants: "Love & Play" (high-high), "Love but Skip" (high rating, low hours), "Guilty Pleasure" (low rating, high hours), "Why Buy These?" (low-low). Actionable insight text.
**Files**: `getGenreSatisfactionMatrix(games)` in calculations.ts, `components/GenreMatrix.tsx` or embed in AdvancedCharts.

#### 11. Day-of-Week & Seasonal Patterns
Two charts from play log date analysis. (1) Day-of-week bar: hours Mon-Sun. "Weekend warrior — 68% Sat/Sun." (2) Monthly heatmap across years. "You game 3x more in Dec than June." Identify most productive day and least active month.
**Files**: `getDayOfWeekPattern(games)` and `getSeasonalPattern(games)` in calculations.ts, charts in StatsView.

#### 12. Abandonment Autopsy
For abandoned games, pattern analysis. Genre correlation (abandon certain genres more?), price bracket correlation, session decay pattern before abandonment, competing games (started something new right before?). "You've abandoned 4/6 open-world games after 8-12 hours. Do you enjoy open-world or just the idea of it?"
**Files**: `getAbandonmentAnalysis(games)` in calculations.ts, panel in FunStatsPanel.

### Phase 3: Engagement (Interactive features + gamification)

#### 13. Random Game Picker ("Spin the Wheel")
Modal with filters: genre, platform, mood (quick session / deep dive / anything). Slot-machine reel animation spinning through game thumbnails. Only owned, unfinished games. "Lock in" (changes status to In Progress) or "Spin again." Shows picked game's stats.
**Files**: `components/RandomPicker.tsx`, floating action button or modal trigger on Games tab.

#### 14. Milestone Celebrations
Track + celebrate gaming milestones. Expanded list: 50th/100th/500th/1000th hour, 5th/10th/25th/50th game completed, first 10/10 rating, first sub-$0.50/hr game, 7-day/30-day streak, first game in new genre, library hits 25/50/100 games, backlog cleared 50%, budget under target full quarter, first franchise with 3+ entries. Toast with confetti on trigger. Milestones section showing earned + upcoming with progress bars. localStorage tracking of shown milestones.
**Files**: `hooks/useMilestones.ts`, `components/MilestoneCelebration.tsx`, milestone definitions in calculations or `lib/milestones.ts`, integrate with page.tsx.
**User note**: "More" milestones — expanded list beyond basics.

#### 15. Collection Trophies
Visual trophy shelf — NOT just time-based. Trophy categories:
- **Time**: Century Club (50/100/200hrs on one game), Marathon Master (8hr+ session), Night Owl (late sessions)
- **Money**: Bargain Hunter (avg discount >40%), Thrift King (5+ games under $10), Big Spender (spent $1000+)
- **Completion**: Finisher (10/25/50 completed), Speedrunner (completed in <7 days), Perfectionist (80%+ completion rate)
- **Variety**: Genre Explorer (5/10/15 genres), Platform Hopper (4+ platforms), Franchise Devotee (3+ games in one franchise)
- **Behavior**: Consistent (30-day streak), Impulse Buyer (bought+played same day 5x), Patient Gamer (avg 30+ days before first play)
- **Rating**: Tough Critic (avg rating <6), Enthusiast (avg rating >8), Balanced (std dev <1.5)
Bronze/silver/gold tiers. Progress bars for locked. Trophy count in header.
**Files**: `lib/trophies.ts` or extend `getGamingAchievements()`, `components/TrophyCase.tsx`.
**User note**: Not purely time-based — trophies for genre, behavior, spending, rating patterns.

#### 16. Game of the Month/Year Awards
Auto-generated award nominees + **user picks the winner**. Categories: Most Played, Best Value, Biggest Surprise, Most Regretted, Fastest Completion, Best ROI. Show top 3 nominees per category (auto-selected from data), user taps to pick their winner. Year-end summary collecting all monthly winners. Award ribbon/badge styling.
**Files**: `getAwardNominees(games, month, year)` in calculations.ts, `components/AwardsPanel.tsx`, localStorage for user picks.
**User note**: User ability to choose winners, not purely auto-generated.

### Phase 4: Structure (New views + storage layers)

#### 17. "What If" Simulator
Interactive toggles showing alternate realities:
- "What if you bought all games at full price?" → total savings
- "What if you never bought games played <2 hours?" → wasted spend
- "What if you only bought games rated 7+?" → hypothetical library
- "What if you completed every started game?" → potential hours
Each toggle recalculates summary showing delta. Eye-opening for future purchase decisions.
**Files**: `components/WhatIfSimulator.tsx`, pure calculation functions.

#### 18. Value Over Time Chart (per-game)
For games with play logs: line chart of cost-per-hour dropping over cumulative hours. Horizontal reference lines at $1/$3/$5 thresholds. Predictive line: "12 more hours to reach Excellent value." Integrate into Game Detail View.
**Files**: `getValueOverTime(game)` in calculations.ts, chart component for detail view.

#### 19. Game Detail View (Additive — Keep Compact Cards)
Expandable detail panel or slide-over — NOT replacing current compact card view. Shows: large thumbnail + hero metadata, play history graph (hours over time), value trajectory (#18), session timeline with notes, quick actions (log time, edit, status change), franchise context, completion probability (#9). Click card to expand into detail.
**Files**: `components/GameDetailPanel.tsx` or `components/GameDetailView.tsx`, integrate with page.tsx.
**User note**: "I like the compact view, don't change that, just add this."

#### 20. Gaming Goals & Challenges
Personal goals with progress tracking. Types: completion count, spending limit, hours target, genre variety, backlog clearance, custom. Progress bars. Goal history (past goals + whether hit). Needs own storage layer (HybridRepository). Firestore rules update needed.
**Files**: Goal interface in `lib/types.ts`, `lib/goals-storage.ts`, `hooks/useGoals.ts`, `components/GoalsPanel.tsx`.

#### 21. Personality Evolution Timeline
Calculate personality per quarter using `getGamingPersonality()` on time-windowed subsets. Horizontal timeline: "Q1: Backlog Hoarder → Q2: Sampler → Q3: Deep Diver → Q4: Completionist." Insight: "Your Completionist score rose 40% in 6 months."
**Files**: `getPersonalityEvolution(games, quarters)` in calculations.ts, visualization in ExpandedStatsPanel.

#### 22. Weekly Digest / Gaming Journal
Auto-generated weekly narrative. "This week: 3 games, 14.5 hours. Great progress on Zelda (8hrs). Velocity up 20%. Cost-per-hour improved to $1.50. Milestone: 100 hours on Elden Ring!" Combine `getWeekStatsForOffset()` with narrative templates. Archivable past digests.
**Files**: `components/WeeklyDigest.tsx`, narrative template logic, integrate with Week in Review.

#### 23. Franchise Deep Dive
Franchise analytics panel for series with 2+ games. Total investment, rating trajectory (line chart — sequels better or worse?), hours per entry, cost-per-hour across franchise, time between entries. "Your Final Fantasy journey: 4 games, 280hrs, $180, ratings trending up."
**Files**: `components/FranchiseAnalytics.tsx`, calculations using existing franchise data.

#### 24. "What Should I Play Next?" Recommender
Smart backlog recommendation. Factors: genre preference (weighted by rating), mood (quick/deep/anything), recent genres (avoid fatigue), time available (slider), queue position. Top 3 with match score + reasoning. "Based on your love of RPGs and 2-hour window: try Persona 5."
**Files**: `getRecommendations(games, preferences)` in calculations.ts, `components/GameRecommender.tsx`.

### Phase 5: Week in Review Integration

Bring the best new stats into the Week in Review story mode screens:
- Activity Pulse indicator (#7)
- Guilt-Free comparison stat (from #1)
- Completion probability for active games (#9)
- Milestone celebrations triggered during recap (#14)
- Doomsday clock update (#2)
- Rating bias insight (#8)
- Award nominees for the month (#16)

### Implementation Order

| # | Feature | Phase | Effort |
|---|---------|-------|--------|
| 1 | Guilt-Free Gaming Calculator | 1 | Low |
| 2 | Backlog Doomsday Clock | 1 | Low |
| 3 | Spending Forecast | 1 | Low |
| 4 | "On This Day" Retrospective | 1 | Low |
| 5 | Price Sweet Spot + Discounts | 1 | Low |
| 6 | Cost-Per-Completion | 1 | Low |
| 7 | Activity Pulse | 1 | Low |
| 8 | Rating Distribution & Bias | 1 | Low |
| 9 | Completion Probability | 2 | Medium |
| 10 | Genre Satisfaction Matrix | 2 | Medium |
| 11 | Day-of-Week & Seasonal | 2 | Medium |
| 12 | Abandonment Autopsy | 2 | Medium |
| 13 | Random Game Picker | 3 | Medium |
| 14 | Milestone Celebrations | 3 | Medium |
| 15 | Collection Trophies | 3 | Medium |
| 16 | Game of Month/Year Awards | 3 | Medium |
| 17 | "What If" Simulator | 4 | Medium |
| 18 | Value Over Time Chart | 4 | Medium |
| 19 | Game Detail View | 4 | High |
| 20 | Gaming Goals | 4 | High |
| 21 | Personality Evolution | 4 | Medium |
| 22 | Weekly Digest | 4 | Medium |
| 23 | Franchise Deep Dive | 4 | Medium |
| 24 | Play Next Recommender | 4 | Medium |
| -- | Week in Review integration | 5 | Medium |

---

## Game Timeline & Recap Overhaul (Approved)

13 changes across 4 areas: Timeline, Week Recap, Games Tab, and a new Monthly Recap. Approved 2025-02-09.

### A. Timeline Updates

#### A1. AI Month Chapter Titles
Generate creative 3-5 word AI titles for each month in the timeline, matching the existing quarter chapter title treatment. Quarters currently get AI-generated narrative titles (e.g., "The Conquest Era") displayed with a sparkle icon and decorative divider. Months should get the same treatment but slightly smaller/different color to maintain hierarchy (quarter = purple sparkles, month = blue/cyan sparkles).
**Files**: `lib/ai-game-service.ts` (add `generateMonthChapterTitles()`), `components/TimelineView.tsx` (render month titles above each month header).

#### A2. AI Week Titles in Period Cards
Each period card (This Week, Last Week, This Month, Last Month) gets a short AI-generated subtitle. Example: "This Week — *The RPG Deep Dive*". Generated based on the games played and activity during that period.
**Files**: `lib/ai-game-service.ts` (add `generateWeekTitle()`), `components/TimelinePeriodCards.tsx` (display subtitle in each card).

#### A3. Week Title in Recap Banner + Opening Screen
Show the AI-generated week title in the WeekInReview banner as a subtitle (under the week vibe text). Also display it on the WeekStoryMode opening screen as the "episode name", giving the recap a named episode feel.
**Files**: `components/WeekInReview.tsx`, `components/story-screens/OpeningScreen.tsx`.

### B. Week Recap Changes

#### B4. Remove 2 AI Blurb Screens
Cut `top-game-deep-dive` (Act 2) and `session-patterns` (Act 3) AI blurb screens from the story. Keep only `opening-personality` (Act 1) and `closing-reflection` (Act 5) since those bookend the story naturally. Update prefetch to only request 2 blurb types instead of 4.
**Files**: `components/WeekStoryMode.tsx`, `components/WeekInReview.tsx`.

#### B5. Remove SessionTypesScreen
The marathon/power/quick session breakdown screen is not useful when most sessions are under 2 hours. Remove it from the story screen list.
**Files**: `components/WeekStoryMode.tsx`.

#### B6. Cinematic Week Title Card
Enhance the opening screen with a Netflix-style cold open: large AI chapter title in prominent text, date range underneath, subtle gradient background. The week gets a named "episode" feel.
**Files**: `components/story-screens/OpeningScreen.tsx`.

#### B7. "Hot Take" Screen
One bold, provocative AI-generated sentence displayed huge and centered with a flame icon. Not a paragraph — just one sharp line. Example: "You spent more time on Cricket 24 this week than some people spend at their jobs."
**Files**: new `components/story-screens/HotTakeScreen.tsx`, `components/WeekStoryMode.tsx`.

#### B8. "Vibe Check" Mood Gradient Screen
Visual screen showing the week's intensity as a gradient bar from cool blues (chill) to hot reds (intense). Marker showing where this week lands, based on session lengths and frequency. Mostly visual, minimal text.
**Files**: new `components/story-screens/VibeCheckScreen.tsx`, `components/WeekStoryMode.tsx`.

#### B9. Mini Scoreboard vs Last Week
This week vs last week side by side with animated counters. Hours, games, sessions, streak — each with a green/red arrow showing improvement or decline. Simple, competitive feel against yourself.
**Files**: new `components/story-screens/WeekVsWeekScreen.tsx`, `components/WeekStoryMode.tsx`.

### C. Games Tab Updates

#### C10. Collapsible Stats Panel
The 6 stat cards (Games, Spent, Hours, $/Hour, Avg Rating, Wishlist) plus the Best Value and Most Played highlights become collapsible. Small chevron button to expand/collapse. Persist collapsed state in localStorage so it remembers the user's preference across sessions.
**Files**: `page.tsx`.

### D. Monthly Recap (NEW)

A full Instagram-story-style recap experience for the month, similar to the existing Week Recap but with monthly scope. Triggered from a "View Recap" button shown per-month in the timeline.

#### D11. Month Recap Infrastructure
Story modal with the same swipe/tap/keyboard navigation pattern from WeekStoryMode. Banner component with "View Recap" button, shown in the timeline per-month. AI month chapter title generation already covered by A1.
**Files**: new `components/MonthStoryMode.tsx`, new `components/MonthInReview.tsx`, `components/TimelineView.tsx` (integrate banner).

#### D12. Month Recap Screens

| Screen | Description |
|--------|------------|
| **Title Card** | Cinematic month name + AI chapter title + date range. Large text, gradient background. |
| **Month in Numbers** | Rapid-fire animated stats: total hours, sessions, games, purchases, completions. Staggered animations for impact. |
| **Top 3 Games** | The 3 most-played games of the month with hours, thumbnails, and percentage of total playtime. |
| **Game of the Month** | Spotlight on #1 game — hours, sessions, rating, cost/hr, how it compares to library average. |
| **Activity Heatmap** | 30-day calendar grid, color-coded by hours per day. See the month's rhythm at a glance. |
| **Week-by-Week** | 4 mini bars comparing each week within the month. Which week was the biggest? Trend arrows. |
| **Spending Report** | What was bought this month, total spent, best deal, budget progress (if budget is set). |
| **Genre Breakdown** | Pie/donut showing genre split for the month. "80% RPG, 15% Sports, 5% Action". |
| **Completions & Milestones** | Games finished, milestones hit, achievements earned this month. Celebratory styling. |
| **Best Value** | Lowest cost-per-hour game of the month with stats breakdown. |
| **vs Last Month** | Side-by-side comparison — hours, games, sessions, spending, completions with trend arrows. |
| **Biggest Day** | The most intense gaming day of the month — which day, how many hours, what was played. |
| **Personality Snapshot** | Gaming personality calculated for this specific month (may differ from overall personality). |
| **AI Reflection** | One AI-generated closing paragraph reflecting on the month's gaming story. |
| **Closing Card** | Summary with final month stats + "See you next month" sign-off. |

### Implementation Summary

| # | Change | Effort | Area |
|---|--------|--------|------|
| A1 | AI month chapter titles in timeline | Low | Timeline |
| A2 | AI week titles in period cards | Low | Timeline |
| A3 | Week title in recap banner + opening | Low | Timeline/Recap |
| B4 | Remove 2 AI blurb screens from week recap | Low | Week Recap |
| B5 | Remove SessionTypesScreen from week recap | Low | Week Recap |
| B6 | Cinematic week title card on opening | Low | Week Recap |
| B7 | "Hot Take" single-line AI screen | Low | Week Recap |
| B8 | "Vibe Check" mood gradient screen | Medium | Week Recap |
| B9 | Mini scoreboard vs last week | Medium | Week Recap |
| C10 | Collapsible stats panel on Games tab | Low | Games Tab |
| D11 | Month Recap infrastructure (modal + banner) | Medium | Month Recap |
| D12 | 15 Month Recap screens | High | Month Recap |

---

## Card Redesign & Detail Panel Overhaul (Approved)

Mobile-first redesign of game cards and detail panel. Two view modes: **Poster** (new default, visual-first) and **Compact** (current layout with fixes). 18 features across 4 areas. Approved 2026-02-11.

**Design Philosophy**: Mobile-first. No hover. Visual > text. The game art does the talking. Every card tells a story, not a spreadsheet row. Think PlayStation app meets trading card collection.

### View Mode Toggle

A toggle between **Poster** and **Compact** modes, persisted in localStorage:
- **Poster Mode** (new default): Visual-first cards with large game art, rarity borders, relationship labels, streak flames, color tints
- **Compact Mode**: Current card layout with fixes — tags spread full-width (not clustered left), action buttons moved into the card body (not hidden behind hover), cleaner spacing

**Files**: Toggle in `page.tsx`, localStorage key `game-analytics-card-view-mode`.

---

### A. Card Visual Identity

#### A1. Poster Cards
The current 64x64 thumbnail is a postage stamp on a phone. Make the game art the hero:
- Full-width banner image across the top of the card (~120px tall on mobile)
- Game name + status overlaid on a gradient at the bottom of the image (like the detail panel hero, but on every card)
- Stats, tags, and actions sit below the image in a clean section
- For games without thumbnails: gradient placeholder with a large centered icon
- The card becomes a mini movie poster. Scrolling the list feels like browsing a shelf of games, not a data table

**Files**: `page.tsx` game card rendering (lines 486-843).

#### A2. Trading Card Rarity Borders
Every game gets a **rarity tier** based on a composite score (rating weight 40%, value rating 30%, hours 20%, completion 10%):

| Tier | Border Style | Criteria |
|------|-------------|----------|
| **Common** | Subtle grey border (`border-white/10`) | Composite < 30 |
| **Uncommon** | Green border glow | Composite 30-50 |
| **Rare** | Blue animated border glow | Composite 50-70 |
| **Epic** | Purple animated border with subtle shimmer | Composite 70-85 |
| **Legendary** | Gold animated border with particle shimmer | Composite 85+, requires rating >= 8 |

Gamers instantly understand this language. You scroll and SEE your legendaries glowing. Makes the collection feel like a collection. Rarity tier name shown as a tiny label on the card.

**Files**: `getCardRarity(game)` in calculations.ts, CSS animations in globals.css, applied in `page.tsx`.

#### A3. Color-Tinted Cards
Extract the dominant color from each game's thumbnail and use it as a very subtle background tint for that card (`rgba(dominant, 0.03-0.06)`). Each card feels unique — Elden Ring gets warm amber, Astro Bot gets cool blue. The list stops looking like a spreadsheet. Implementation: use a small canvas to sample the thumbnail's average color on load, cache in localStorage per game ID.

**Files**: `hooks/useGameColors.ts` (color extraction + cache), applied as inline style in `page.tsx`.

#### A4. Card "Aging" Effect
Cards for games not touched in a long time get subtle visual aging:
- **Fresh** (played in last 7 days): Full vibrancy, crisp
- **Recent** (7-30 days): Normal
- **Dusty** (30-90 days): Thumbnail slightly desaturated (CSS `saturate(0.7)`), very faint dust overlay
- **Forgotten** (90+ days): More desaturated (`saturate(0.4)`), slight opacity reduction on the whole card

Like actual game cases gathering dust on a shelf. Active games POP visually. Neglected ones fade. You feel the pull to go back.

**Files**: `getCardFreshness(game)` in calculations.ts, CSS classes in globals.css, applied in `page.tsx`.

---

### B. Card Personality & Data

#### B5. Relationship Status Labels
Replace dry status badges ("In Progress", "Completed") with **emotional labels** that change based on actual behavioral data. The label is the PRIMARY badge — the technical status shows in tiny text underneath.

| Label | Criteria | Visual |
|-------|----------|--------|
| **"Obsessed"** | Played 4+ of last 7 days | Warm red/orange pulse |
| **"Going Strong"** | 2-3 sessions in last 7 days | Healthy blue |
| **"It's Complicated"** | Abandoned after 20+ hours | Purple, conflicted |
| **"Soulmate"** | 100+ hours AND rating >= 8 | Golden glow |
| **"Love at First Sight"** | Rating >= 9, under 10 hours played | Pink sparkle |
| **"Ghosted"** | In Progress but no session in 30+ days | Grey, fading |
| **"Rebound"** | Started within 3 days of completing another game | Teal |
| **"The One That Got Away"** | Wishlist for 60+ days | Purple, wistful |
| **"Dusty Shelf"** | Not Started, owned 60+ days | Brown, dusty |
| **"Speed Run"** | Completed in under 14 days | Lightning bolt, yellow |
| **"Slow Burn"** | In Progress 90+ days, still active (session in last 14 days) | Amber, warm |
| **"Comfort Game"** | 50+ hours, still playing, sessions spread over 60+ days | Cozy green |
| **"Fresh Start"** | Started in the last 7 days | Bright, new |
| **"Victory Lap"** | Completed, rated 8+, still logging sessions | Gold with stars |
| **"Buyer's Remorse"** | Paid $40+, under 2 hours, no session in 30+ days | Red, regretful |

Each relationship status gets its OWN subtle visual treatment on the card — "Obsessed" cards feel warm, "Ghosted" cards look slightly faded, "Soulmate" cards have a permanent gentle golden shimmer. The card's MOOD matches its relationship.

**Innovation**: Show a micro-evolution line: tiny dots showing the last 3 relationship status changes. "Fresh Start → Going Strong → Obsessed". You see the journey, not just the destination.

**Files**: `getRelationshipStatus(game, allGames)` in calculations.ts, status display in `page.tsx`.

#### B6. Streak Flames
If you've played a game 3+ days in a row (consecutive days with play logs), show a **flame badge** on the card:
- 3-4 days: Small single flame
- 5-6 days: Medium double flame
- 7+ days: Large triple flame with glow
- The flame count shows inside: "5" with a flame icon

Positioned on the thumbnail corner (replacing the health dot, which the flame subsumes). Gamers are wired for streaks. This creates a "don't break the chain" loop.

**Files**: `getGameStreak(game)` in calculations.ts, visual in `page.tsx`, CSS flame animation in globals.css.

#### B7. Rating Stars
Replace "8/10" text in the stats grid with **visual star display**:
- 5 stars total (each star = 2 rating points)
- Filled, half-filled, and empty states
- Color matches value: gold for 8+, silver for 5-7, dim for under 5
- Small enough to fit in the stat cell, but instantly scannable

Numbers are for spreadsheets. Stars are for humans.

**Files**: Small `RatingStars` component, used in `page.tsx` stat grid and detail panel.

#### B8. Hero Number
The wasted space on the right side of each card gets a **single prominent number** — the most important stat for that game right now:
- **In Progress**: Completion probability percentage, large ("73%")
- **Completed**: Cost per hour ("$0.67/hr")
- **Wishlist**: Days waiting ("142d")
- **Not Started**: Days owned ("34d")
- **Abandoned**: Total hours sunk ("23h")

Big. Readable. One thumb-scroll tells the story of every game. Positioned in the top-right area of the card, large font with appropriate color coding.

**Files**: `getHeroNumber(game)` in calculations.ts, rendered in `page.tsx`.

---

### C. Card List Experience

#### C9. "Now Playing" Pinned Card
If there's a game played in the last 48 hours, pin it at the **top of the list** in a special expanded format:
- Larger thumbnail/poster section
- Prominent "Check In" button (one-tap to log time)
- Current streak flame if applicable
- This week's hours on this game
- Relationship status front and center
- Distinct visual treatment: slightly larger, maybe a "NOW PLAYING" header label with a pulsing dot

Like Spotify's "Now Playing" bar. Your most active game greets you when you open the app. Not buried in a sorted list.

**Files**: Rendered above the main game list in `page.tsx`, uses same card component but with `variant="now-playing"` styling.

#### C10. Card Sections with Personality
Instead of a flat sorted list, group games into **sections with personality**:

| Section | Criteria | Vibe |
|---------|----------|------|
| **"On Fire"** | Played in last 7 days | Warm, active, pulsing |
| **"Cooling Off"** | In Progress, no session in 14-60 days | Cool blue, fading |
| **"The Collection"** | Completed games | Gold/emerald, proud |
| **"Waiting Room"** | Not Started, owned | Neutral, patient |
| **"The Shelf"** | Wishlist | Purple, aspirational |
| **"The Graveyard"** | Abandoned | Dark, muted |

Each section has a header with the name + game count + a one-line insight ("3 games on fire — your most active week in a month"). Sections are collapsible. The sort option works WITHIN sections. If a section is empty, it doesn't show.

This tells you the state of your gaming life at a glance. You know where your attention is and what's been neglected.

**Files**: `getGameSections(games)` in calculations.ts, section rendering in `page.tsx`. Sort/filter still works within the grouping.

#### C11. Compact Mode Tag Fix
In Compact mode (the current layout), fix the tag spacing issue:
- Move the tags row out of the nested flex column and into its own full-width row
- Tags span the entire card width between the name row and the stats grid
- Action buttons (log time, queue, special, delete) move to a row below the stats grid, always visible (no hover dependency), styled as subtle icon buttons
- This is the "fixed" version of the current layout for users who prefer density over visuals

**Files**: `page.tsx` compact mode rendering.

---

### D. Detail Panel Redesign

#### D12. Bottom Sheet (Replace Side Panel)
Replace the right-sliding detail panel with a **mobile-native bottom sheet**:
- Slides up from the bottom of the screen
- Starts at ~60% screen height (hero image + key stats visible)
- Drag handle at the top to pull to full screen
- Drag down to dismiss (with velocity-based snap: gentle pull = snap back, firm pull = dismiss)
- The game list is still visible above the sheet, maintaining spatial context
- Background dims but doesn't fully black out
- Smooth spring animation on open/close

This is THE mobile interaction pattern (Maps, Uber, Spotify, every modern app). The current `animate-slide-in-right` with `max-w-xl` is a desktop pattern that feels foreign on a phone.

**Files**: New `components/GameBottomSheet.tsx` replacing `GameDetailPanel.tsx`, integrate in `page.tsx`.

#### D13. Game Biography
Auto-generated **narrative paragraph** at the top of the detail view, built entirely from data (no AI needed):

> *"Picked up Elden Ring for $60 on March 3. You couldn't wait — started just 2 days later. Over 47 days and 15 sessions, your longest being a 6-hour Saturday marathon. Completed it with a perfect 10/10 and a cost of $0.67/hr — that's better than 95% of your library. One of only 3 games you've ever rated that highly."*

**Innovation — Narrative Voice Styles** based on the game's data:
- **Epic/Heroic** (high-rated RPGs, 50+ hours): *"An epic 47-day odyssey through the Lands Between..."*
- **Casual/Playful** (sports, party games): *"Quick pickup sessions of Cricket 24 became your go-to wind-down..."*
- **Dramatic** (abandoned games): *"It started with such promise. 3 sessions in 2 days. Then... silence."*
- **Celebratory** (completed gems, excellent value): *"A triumph. $60 well spent, 89 hours well lived."*
- **Regretful** (high price, low hours, low rating): *"$70 for 2 hours. We don't talk about this one."*

**Innovation — Contextual Comparisons** woven into the narrative:
- "This is your 3rd longest relationship with a game"
- "Only 2 other games cost less per hour"
- "Your fastest completion — 8 days from start to finish"
- "You've spent more hours here than on your entire Nintendo library"

**Files**: `generateGameBiography(game, allGames)` in calculations.ts, displayed in bottom sheet.

#### D14. "Your Verdict" Section
A dedicated verdicts area that frames cold data as human judgments:

| Verdict | Logic | Display |
|---------|-------|---------|
| **Value** | Based on cost-per-hour | "Bargain" / "Fair Deal" / "Overpaid" / "Robbery" on a visual scale |
| **Commitment** | Hours + session pattern | "Deep Dive" / "Casual Fling" / "One Night Stand" / "Life Partner" |
| **In Your Library** | Percentile rank by hours, rating, or value | "Top 5%" / "Above Average" / "Middle of the Pack" / "Bottom Shelf" |
| **Would You Buy Again?** | Rating >= 7 AND value Good+ = Yes | "In a heartbeat" / "Probably" / "Hmm, maybe on sale" / "Absolutely not" |
| **The Vibe** | Genre + hours + rating combo | "Comfort food" / "Mind-blowing" / "Guilty pleasure" / "Background noise" |

Each verdict is a small card with the label, the answer, and a one-line justification. The section reads like a quick review you'd give a friend.

**Files**: `getGameVerdicts(game, allGames)` in calculations.ts, rendered in bottom sheet.

#### D15. Visual Journey Map
Replace the session list with a **visual path** from "Purchased" to "Now" (or "Completed"):
- A winding road/path drawn vertically
- Dots at each milestone: purchase, first play, each session, completion
- Dot size proportional to session length
- Path color shifts from warm (early excitement) to the game's current state color
- Gaps in the path show breaks in play (visible gap = "you didn't play for 3 weeks")
- Key milestones labeled: "First session", "Longest session (6h)", "Hit 50 hours", "Completed"

You see the game's entire lifecycle as a visual story. Was this a binge? A slow burn? Did you take a 3-week break and come back? All visible instantly.

**Files**: `getGameJourney(game)` in calculations.ts, `components/GameJourney.tsx`, rendered in bottom sheet.

#### D16. Quick Check-In
Reframe "Log Time" as a **check-in** with a streamlined flow:
- Big beautiful button with the game's thumbnail as background: "Check in to Elden Ring"
- One tap opens a minimal overlay (not a full modal)
- Hour slider defaulting to average session length for this game
- Optional one-tap mood: [Great] [Good] [Meh] [Grind] (stored in playLog as mood field)
- "Done" — two taps total for the common case
- "Add details" expand link for the full PlayLogModal (date picker, notes) when needed

The fast path should be FAST. You just finished a session, you're on the couch, you want to log it in 2 seconds.

**Files**: `components/QuickCheckIn.tsx`, integrate as primary action in bottom sheet and Now Playing card.

---

### E. Extra Innovations

#### E17. Animated Card Transitions
When sorting or filtering, cards don't just reorder — they **animate into their new positions**. Cards that leave (filtered out) fade and shrink. Cards that enter fade in. Cards that move slide smoothly to their new position. Like a deck of cards being shuffled. Satisfying to watch, and it maintains spatial context so you don't lose track of where things are.

**Files**: Wrap card list in animation container in `page.tsx`. Use CSS `layout` animations or framer-motion `layoutId`.

#### E18. Micro-Stat Interactions
On the stats grid, tapping any stat reveals a **contextual tooltip/popover** with deeper context:
- Tap **price**: "You saved $25 vs full price" or "Paid full price"
- Tap **hours**: "Average session: 2.3h" + mini sparkline
- Tap **rating**: "Higher than 70% of your library"
- Tap **$/hr**: "Was $15/hr after first session, now $0.67"
- Tap **ROI**: "Top 10% ROI in your collection"

Each stat becomes a discoverable moment. The card stays compact but has hidden depth.

**Files**: Stat popover component, integrated in `page.tsx` stat grid cells.

---

### Implementation Order

| # | Feature | Area | Effort |
|---|---------|------|--------|
| A1 | Poster Cards | Card Visual | High |
| A2 | Trading Card Rarity Borders | Card Visual | Medium |
| A3 | Color-Tinted Cards | Card Visual | Medium |
| A4 | Card Aging Effect | Card Visual | Low |
| B5 | Relationship Status Labels | Card Data | Medium |
| B6 | Streak Flames | Card Data | Low |
| B7 | Rating Stars | Card Data | Low |
| B8 | Hero Number | Card Data | Low |
| C9 | Now Playing Pinned Card | List Experience | Medium |
| C10 | Card Sections with Personality | List Experience | Medium |
| C11 | Compact Mode Tag Fix | List Experience | Low |
| D12 | Bottom Sheet Detail Panel | Detail Panel | High |
| D13 | Game Biography | Detail Panel | Medium |
| D14 | Your Verdict Section | Detail Panel | Medium |
| D15 | Visual Journey Map | Detail Panel | Medium |
| D16 | Quick Check-In | Detail Panel | Medium |
| E17 | Animated Card Transitions | Extra | Medium |
| E18 | Micro-Stat Interactions | Extra | Low |

### New Calculation Functions Needed

```
getCardRarity(game) → { tier, label, score, borderClass }
getRelationshipStatus(game, allGames) → { label, emoji, color, bgColor, evolution[] }
getGameStreak(game) → { days, level, isActive }
getHeroNumber(game) → { value, label, color }
getGameSections(games) → { section, label, insight, games[] }[]
getCardFreshness(game) → { level, saturation, opacity }
generateGameBiography(game, allGames) → string
getGameVerdicts(game, allGames) → { category, verdict, justification, scale }[]
getGameJourney(game) → { milestones[], path[] }
```

### New Components Needed

```
components/GameBottomSheet.tsx    — Mobile bottom sheet replacing side panel
components/GameJourney.tsx        — Visual journey path
components/QuickCheckIn.tsx       — Streamlined play logging
components/RatingStars.tsx        — Visual star rating display
hooks/useGameColors.ts            — Dominant color extraction from thumbnails
```

### New CSS Animations Needed

```
rarity-glow-uncommon   — Subtle green border pulse
rarity-glow-rare       — Blue border pulse
rarity-glow-epic       — Purple border shimmer
rarity-glow-legendary  — Gold border with particle effect
streak-flame           — Flame flicker animation
card-aging-dust        — Subtle dust overlay for neglected games
bottom-sheet-slide     — Spring-based slide up/down
card-layout-move       — Smooth position transitions on sort/filter
```

---

## Card Info Enhancements (Approved)

6 enhancements to add depth to game cards without cluttering the existing visual design. Approved 2026-02-14.

**Philosophy**: The cards already look great — rarity borders, relationship status, streak flames, hero numbers, freshness aging. These additions layer in MORE depth while keeping the front clean. Reward curiosity. Every card has hidden depth.

### 1. Card Flip — "The Back of the Card"

Like a trading card, tapping a card flips it (CSS 3D transform, perspective + rotateY) to reveal a **second face**. The front stays untouched. The back shows:

- **AI Whisper**: One AI-generated contextual sentence about this game right now. Not generic — specific. *"You're 8 hours from Excellent value"* or *"Your longest break from this game — 47 days and counting"* or *"This is your 2nd most played RPG but your lowest rated one."*
- **Mini Sparkline**: Tiny 30-day session dot chart showing play frequency (horizontal dots, sized by session length)
- **Library Rank**: "#3 most played" / "Top 10% value" / "#1 most expensive" — the game's position in your collection
- **Next Milestone**: Progress bar toward the nearest achievement/trophy for THIS game (e.g., "Century Club: 67/100 hours" or "12 more hours to Good value tier")
- **Quick Verdicts**: 3 tiny verdict chips from `getGameVerdicts()` — Value: Bargain | Commitment: Deep Dive | Vibe: Comfort Food

**Files**: Card flip CSS in globals.css, back-face rendering in `page.tsx`, `getCardBackData(game, allGames)` in calculations.ts.

### 2. Contextual AI Whisper Line

Subtle rotating italic line on the card front (below the smart one-liner). Picks the most interesting observation about this game RIGHT NOW from a pool of contextual observations:
- Value trajectory: *"Was $15/hr after session 1, now $0.67/hr"*
- Streak context: *"Day 5 — your longest streak on any game this year"*
- Comparative: *"More hours than your entire Nintendo library"*
- Milestone proximity: *"3 more hours to hit Century Club"*
- Neglect nudge: *"Last played 43 days ago — your 2nd longest gap"*

Rotates on each app visit or every 30 seconds. Small italic text, subtle but discoverable.

**Files**: `getContextualWhisper(game, allGames)` in calculations.ts, rendered in `page.tsx` card body.

### 3. Session Momentum Sparkline

Tiny 5-dot visual in the card's stat area showing the last 5 sessions' hours. Each dot sized proportionally to session length. Green tint = trending up, red tint = trending down, neutral = flat. At a glance: is this game heating up or cooling down?

Already have `getSessionMomentum()` — just needs a compact visual component.

**Files**: Small `MomentumDots` component, rendered in `page.tsx` stat grid.

### 4. Library Rank Badge

Small subtle badge positioned opposite the rarity badge: "#3" or "Top 5%". Rank by the **current sort criterion** — if sorted by hours, show hours rank. If sorted by value, show value rank. Dynamic and contextually relevant.

**Files**: `getLibraryRank(game, allGames, sortCriterion)` in calculations.ts, rendered in `page.tsx`.

### 5. Micro-Progress Ring

Circular progress ring rendered around the hero number. For In Progress games: ring shows completion probability filling up. For games approaching a value tier threshold: ring shows progress toward next tier. The number stays the same, but the ring adds a "progress toward something" feel.

**Files**: Small `ProgressRing` SVG component, wrapped around hero number in `page.tsx`.

### 6. Mood Pulse Color Strip

2px colored strip along the bottom edge of each card. Shifts based on recent activity:
- **Hot pink/red** = obsessed (daily play)
- **Warm amber** = consistent (2-3 sessions/week)
- **Cool blue** = casual (1 session/week)
- **Grey** = dormant (no recent activity)
- **No strip** = never played

Subtle but when you scroll the list, you SEE the energy distribution across your collection.

**Files**: `getCardMoodPulse(game)` in calculations.ts, CSS in `page.tsx` card wrapper.

### Implementation Order

| # | Feature | Effort |
|---|---------|--------|
| 1 | Card Flip | High |
| 2 | AI Whisper Line | Medium |
| 3 | Session Momentum Sparkline | Low |
| 4 | Library Rank Badge | Low |
| 5 | Micro-Progress Ring | Medium |
| 6 | Mood Pulse Color Strip | Low |

### New Calculation Functions Needed

```
getCardBackData(game, allGames) → { whisper, sparkline[], rank, nextMilestone, verdicts[] }
getContextualWhisper(game, allGames) → { text, type, priority }
getLibraryRank(game, allGames, sortBy) → { rank, total, percentile, label }
getCardMoodPulse(game) → { level, color, label }
```

### New Components Needed

```
components/MomentumDots.tsx      — 5-dot session trend sparkline
components/ProgressRing.tsx      — Circular SVG progress ring for hero number
```

---

## Stats Overhaul Plan (Approved)

Comprehensive stats audit and overhaul: 12 redundancy removals, 10 dead code cleanups, 28 new stats. Approved 2026-02-14.

### Part 1: Stats Redundancy Removals (12 sections)

These sections show data that's already displayed better elsewhere. Remove to declutter the Stats tab.

| # | Section to Remove | Location | Why Redundant | Better Version |
|---|-------------------|----------|---------------|----------------|
| 1 | **Franchise Stats** section | StatsView | Shows per-franchise spent/hours/cost-per-hour | DiscoverPanel's Franchise Analytics is richer — has rating trends, individual games, trend arrows |
| 2 | **Backlog Boss** key insight | FunStatsPanel (Key Insights grid) | Shows "days to clear backlog" | InsightsPanel's Backlog Doomsday Clock has humor tiers, clearance date, trend, acquisition vs completion rate |
| 3 | **Backlog Clearance Prediction** card | ExpandedStatsPanel | Shows clearance date + days remaining | Same — Doomsday Clock is the definitive version |
| 4 | **Avg cost per completion** stat | ExpandedStatsPanel → Money Deep Dive grid | Shows single number | InsightsPanel has a dedicated Cost Per Completion section with clean vs abandoned breakdown |
| 5 | **Gaming Personality** standalone card | ExpandedStatsPanel | Shows type, traits, score | DiscoverPanel's Personality Evolution includes current type PLUS historical timeline — strictly better |
| 6 | **Gaming Achievements** section (20+) | ExpandedStatsPanel | Grid of achievements with progress | TrophyRoom has Milestones + Collection Trophies with bronze/silver/gold/platinum tiers — supersedes this older system |
| 7 | **All-Time Summary Cards** (6 cards at bottom) | StatsView | Shows Games, Spent, Hours, $/hr, Rating, Completion % | Period Selector at the top already shows these same stats and switches between All Time / per year. Duplicate when "All Time" selected |
| 8 | **Bargain Hunter** card | FunStatsPanel | Shows avg discount % | Patient Gamer badge covers discount game count + modal; InsightsPanel has full Discount vs Full Price analysis with hours and completion comparison |
| 9 | **Best Bargain** in Money Deep Dive | ExpandedStatsPanel | Shows single best value game | FunStatsPanel's Value Champion section is the same concept, more prominently displayed |
| 10 | **Biggest Regret** in Money Deep Dive | ExpandedStatsPanel | Shows single worst game | FunStatsPanel's Buyer's Remorse section shows top 3 with regret scores — better version |
| 11 | **Genre Diversity** key insight | FunStatsPanel (Key Insights grid) | Shows "% unique genres" | ExpandedStatsPanel's Genre Rut Analysis has dominant genre, suggestions, untouched genres — deeper version |
| 12 | **Best ROI Rankings** chart | StatsView charts grid | Bar chart of top 8 by ROI | Period ROI Rankings section above already shows a ranked list with thumbnails, badges, and more detail. Same data twice |

### Part 2: Dead Code Cleanup (10 functions)

Exported functions in `calculations.ts` that are never imported anywhere. Remove to reduce file size and confusion.

| # | Function | Reason for Removal |
|---|----------|--------------------|
| 1 | `calculateCostPerHour()` | Never called directly; metrics calculated internally in `calculateMetrics()` |
| 2 | `calculateBlendScore()` | Never called directly; used only via metrics object |
| 3 | `calculateROI()` | Never called directly; stored in `metrics.roi` |
| 4 | `calculateDaysToComplete()` | Logic calculated inline in components wherever needed |
| 5 | `calculateMetrics()` | Only called inside `useAnalytics` hook, never from components |
| 6 | `getPeriodStatsForRange()` | Never used; `getPeriodStats(days)` covers all use cases |
| 7 | `getLastCompletedWeekStats()` | Never used anywhere in UI |
| 8 | `getDiscountEffectiveness()` | Replaced by `getDiscountInsights()` which has better data |
| 9 | `getNightOwlScore()` | Placeholder function with no implementation or UI |
| 10 | `getHiddenGems()` | Duplicate of `findHiddenGems()` which is the primary version used in FunStatsPanel |

**Note**: `whatIfMoreHours()` and `whatIfNeverBought()` are Phase 4 planned features. Keep them — they'll be used when the full What-If Simulator UI is built.

### Part 3: New Stats (28 features)

28 new stats organized by the story they tell about you as a gamer. Each stat has a specific panel destination and effort level.

---

#### Category: Spending Psychology (3 stats)

##### Stat 9: The Impulse Tax
Total money spent on games played less than 2 hours — your literal cost of impulsive buying. Annual figure with year-over-year comparison. *"Your impulse tax this year: $185 across 7 games. That's 22% of your total spend on games you barely touched."*
**Where**: InsightsPanel | **Effort**: Low
**Files**: `getImpulseTax(games, year?)` in calculations.ts, section in InsightsPanel.

##### Stat 10: Purchase Rhythm Detector
Analyze timing of purchases to classify your buying personality:
- **Binge Buyer** — purchases cluster together (3+ in a week, then nothing for months)
- **Steady Drip** — roughly even spacing between purchases
- **Sale Chaser** — clusters align with major sale periods (June/Nov/Dec)
- **Reward Buyer** — tends to buy after completing a game
- **Drought Breaker** — long gaps then sudden sprees

Visual: dot timeline of purchases showing clusters and gaps. Current state: *"12 days since last purchase (your average gap is 18 days)"*
**Where**: InsightsPanel | **Effort**: Medium
**Files**: `getPurchaseRhythm(games)` in calculations.ts, section in InsightsPanel.

##### Stat 11: Price Creep / Price Discipline
Is your average purchase price going up or down over time? Quarterly trend line. *"Your average game price rose from $22 to $38 over the last year — you're buying more premium titles."* Or: *"Down from $45 to $18 — your patience is paying off."*
**Where**: InsightsPanel | **Effort**: Low
**Files**: `getPriceCreep(games)` in calculations.ts, small chart/card in InsightsPanel.

---

#### Category: Behavioral Patterns (5 stats)

##### Stat 12: The "Just One More Hour" Games
Games where your average session length is significantly above your overall average. The games that make you lose track of time. Ranked list with stickiness multiplier. *"Elden Ring sessions average 3.2h — 2.1x your normal session. It's your stickiest game."*
**Where**: FunStatsPanel | **Effort**: Low
**Files**: `getStickyGames(games)` in calculations.ts, section in FunStatsPanel.

##### Stat 13: Attention Span Spectrum
How long do you stay engaged with a game before moving on? Measure active play window (first session to last session before 30+ day gap or new game started). Histogram:
- **Quick Fling** (<7 days active)
- **Short Affair** (1-4 weeks)
- **Steady Relationship** (1-3 months)
- **Long-Term Commitment** (3+ months)

*"65% of your games are Quick Flings. You cycle through games fast."*
**Where**: AnalyticsPanel | **Effort**: Medium
**Files**: `getAttentionSpanSpectrum(games)` in calculations.ts, chart in AnalyticsPanel.

##### Stat 14: Sunk Cost Hall of Shame
Games with the most hours despite a rating of 6 or below. You kept playing even though you weren't enjoying it. Ranked by hours × (10 - rating) — the "regret-hours" formula. *"You put 34 hours into a game you rated 5/10. That's the sunk cost fallacy in action."*
**Where**: FunStatsPanel | **Effort**: Low
**Files**: `getSunkCostGames(games)` in calculations.ts, section in FunStatsPanel.

##### Stat 15: The Replacement Chain
When you abandon or ghost a game, what did you start playing instead? Map the chain: Game A ghosted → Game B started 3 days later → Game B ghosted → Game C started. Shows what pulls your attention away. *"You ghosted 3 games for Elden Ring. It was the attention black hole of 2024."*
**Where**: AnalyticsPanel | **Effort**: Medium
**Files**: `getReplacementChains(games)` in calculations.ts, visual chain in AnalyticsPanel.

##### Stat 16: Finishing Sprint Score
For completed games: what % of total playtime happened in the final week before completion? High % = you sprint to the finish. Low % = steady pace throughout. *"You sprint-finish 60% of your games — the last week accounts for 40% of total playtime on average."*
**Where**: FunStatsPanel | **Effort**: Low
**Files**: `getFinishingSprintScore(games)` in calculations.ts, card in FunStatsPanel.

---

#### Category: Time & Engagement (5 stats)

##### Stat 17: Dopamine Curve
Per-game engagement trajectory. Plot session length over time for a game. Classify the pattern:
- **Honeymoon** — big sessions early, tapering off (novelty wore off)
- **Slow Burn** — small sessions growing bigger (it grew on you)
- **Steady Love** — consistent session lengths throughout
- **Spike & Crash** — one massive session then nothing (binge regret?)
- **Revival** — dropped off, then came back strong

Show the dominant pattern across your library. *"70% of your games follow the Honeymoon curve — you front-load your excitement."*
**Where**: AnalyticsPanel | **Effort**: High
**Files**: `getDopamineCurve(game)` and `getLibraryDopamineProfile(games)` in calculations.ts, chart in AnalyticsPanel.

##### Stat 18: Genre Fatigue Detector
After playing a lot of one genre in a short period, do your ratings drop? Measure: when you play 3+ games of the same genre within 60 days, does the 3rd+ game get rated lower? *"Your RPG ratings drop 1.5 points after 3 consecutive RPGs. You might benefit from mixing it up."*
**Where**: AnalyticsPanel | **Effort**: Medium
**Files**: `getGenreFatigue(games)` in calculations.ts, card in AnalyticsPanel.

##### Stat 19: Session Time-of-Week Heatmap
Not just day-of-week — a proper 7×4 grid: day of week × week of month. Reveals patterns like "you game hardest on the first weekend of the month" or "mid-week is dead." More granular than the existing day-of-week chart in Play Patterns.
**Where**: AnalyticsPanel | **Effort**: Medium
**Files**: `getWeekOfMonthHeatmap(games)` in calculations.ts, heatmap grid in AnalyticsPanel.

##### Stat 20: The Dead Zone
Identify your longest consecutive period with zero gaming activity. When was it? How long? What broke the streak? *"Your longest gaming drought was 23 days in March 2025. You came back with a 6-hour Elden Ring binge."*
**Where**: FunStatsPanel | **Effort**: Low
**Files**: `getDeadZone(games)` in calculations.ts, card in FunStatsPanel.

##### Stat 21: Library DNA Fingerprint
Unique radial visualization of your library's composition: genre split, platform split, price range split, status split, session length preference — all in one radar/spider chart. No two gamers have the same DNA. Compact, visual, instantly shows what kind of gamer you are at a glance.
**Where**: ExpandedStatsPanel | **Effort**: Medium
**Files**: `getLibraryDNA(games)` in calculations.ts, radar chart in ExpandedStatsPanel.

---

#### Category: Library Meta-Stats (3 stats)

##### Stat 22: Rating Confidence Score
Ratings on games with <5 hours are "low confidence" — you barely experienced them. Recalculate top 10 weighted by hours played. Does the list change? *"Your 'confident' top 10 (rated after 20+ hours) differs from your raw top 10 by 4 games. Your quick ratings tend to be more generous."*
**Where**: InsightsPanel | **Effort**: Low
**Files**: `getRatingConfidence(games)` in calculations.ts, comparison card in InsightsPanel.

##### Stat 23: The Pareto Games (Power Law)
Beyond 80/20 — show the full power law curve. Your top 3 games probably account for a shocking % of total hours. *"Your top 3 games (5% of library) account for 45% of all your gaming hours. You know what you like."* Visual: stacked bar or cumulative % line chart.
**Where**: InsightsPanel | **Effort**: Low
**Files**: `getParetoAnalysis(games)` in calculations.ts, chart in InsightsPanel.

##### Stat 24: Library Age Profile
Histogram of when your games were purchased. Is your library young and growing, or mature and stable? *"72% of your library was bought in the last 12 months. You're in an active acquisition phase."* Or: *"Your oldest game is from 2019 and you're still playing it."*
**Where**: ExpandedStatsPanel | **Effort**: Low
**Files**: `getLibraryAgeProfile(games)` in calculations.ts, histogram in ExpandedStatsPanel.

---

#### Category: Predictive & Comparative (4 stats)

##### Stat 25: Value Velocity Chart
For each game: how quickly did it become "worth the money"? Plot cost-per-hour after each session. Some games are great value from session 1 ($15 game, 5-hour first session = $3/hr immediately). Others take 30 hours to reach Fair value. *"Astro Bot hit Excellent value in 4 sessions. Starfield took 22 sessions and still hasn't."*
**Where**: AnalyticsPanel | **Effort**: Medium
**Files**: `getValueVelocity(games)` in calculations.ts, multi-line chart in AnalyticsPanel.

##### Stat 26: Cross-Genre Affinity Map
Which genres do you tend to play in the same time periods? Network graph where genres that co-occur within the same month get connected. Thick lines = strong pairing. *"You always pair RPGs with Sports — they're your peanut butter and jelly."*
**Where**: AnalyticsPanel | **Effort**: High
**Files**: `getCrossGenreAffinity(games)` in calculations.ts, network/chord visualization in AnalyticsPanel.

##### Stat 27: Seasonal Genre Drift
What genres dominate each season? Stacked area chart: Jan-Dec, colored by genre share. *"Winter is your RPG season (55% of hours). Summer shifts to Sports and Action."* Helps predict what you'll want to play next based on time of year.
**Where**: AnalyticsPanel | **Effort**: Medium
**Files**: `getSeasonalGenreDrift(games)` in calculations.ts, stacked area chart in AnalyticsPanel.

##### Stat 28: "If You Stopped Today" Snapshot
Freeze your library right now. Final stats: total hours, total spent, overall cost-per-hour, games completed, completion rate, longest game, best value, worst value. Frame it like a lifetime achievement summary. *"If you never bought another game, your gaming career stands at: 1,247 hours across 64 games, at $1.82/hr. Not bad."*
**Where**: ExpandedStatsPanel | **Effort**: Low
**Files**: `getIfYouStoppedToday(games)` in calculations.ts, summary card in ExpandedStatsPanel.

---

#### Category: Composite Scores & Dashboards (4 stats)

##### Stat 1: Gaming Credit Score
Single 300-850 composite score grading your spending habits. Factors:
- % of library actually played (30% weight)
- Average cost-per-hour (25% weight)
- Completion rate (25% weight)
- Regret rate — low = good (20% weight)

Visual gauge/dial. Labels: "Excellent Spender" (750+) / "Smart Buyer" (650-749) / "Average" (550-649) / "Impulse Risk" (450-549) / "Needs Work" (<450). One number that answers: "Am I spending my gaming money well?"
**Where**: InsightsPanel (hero position) | **Effort**: Medium
**Files**: `getGamingCreditScore(games)` in calculations.ts, gauge component in InsightsPanel.

##### Stat 2: Completion Funnel
Visual funnel diagram showing where you lose games:
- Games Owned → Started (played at all) → Past 10h → Past 50% estimated → Completed

Shows the biggest drop-off point. *"You start 75% of your games but only 30% make it past 10 hours. The 10-hour mark is where you lose interest."*
**Where**: AnalyticsPanel | **Effort**: Medium
**Files**: `getCompletionFunnel(games)` in calculations.ts, funnel visualization in AnalyticsPanel.

##### Stat 3: The 80/20 Rule (Pareto Lite)
*"82% of your gaming hours come from 18% of your library."* Visual: ranked games with a cumulative % line chart overlaid. Reveals how concentrated vs distributed your play is. High concentration = you know what you like. Low = you spread thin.
**Where**: InsightsPanel | **Effort**: Low
**Files**: `getPareto8020(games)` in calculations.ts, chart in InsightsPanel.

##### Stat 8: Library Health Dashboard
One compact hero visual at the top of the Stats tab showing the "vital signs" of your entire collection:
- **Active rate** — % played in last 30 days (green)
- **Completion rate** — % completed (blue)
- **Abandonment rate** — % abandoned (red)
- **Dust rate** — % untouched 60+ days (grey)

Four-bar horizontal visual, color-coded. Quick glance tells you: is my collection healthy or neglected?
**Where**: Top of Stats tab (hero position) | **Effort**: Medium
**Files**: `getLibraryHealth(games)` in calculations.ts, dashboard component at top of StatsView.

---

#### Category: Play Style Analysis (4 stats)

##### Stat 4: Game Length Sweet Spot
Group games by actual playtime: Quick (<10h), Medium (10-30h), Long (30-60h), Epic (60+h). Per bucket: avg rating, completion rate, count, avg cost-per-hour. *"Your sweet spot is Medium games (10-30h) — highest avg rating and 80% completion rate."*
**Where**: AnalyticsPanel | **Effort**: Low
**Files**: `getGameLengthSweetSpot(games)` in calculations.ts, bracket display in AnalyticsPanel.

##### Stat 5: Money Efficiency Trend
Is your spending getting smarter? Line chart of avg cost-per-hour for games bought each quarter. Downward trend = improving value instincts. *"Your Q4 2025 purchases average $1.20/hr vs $4.50/hr in Q1 2025 — you're getting better at finding value."*
**Where**: InsightsPanel | **Effort**: Medium
**Files**: `getMoneyEfficiencyTrend(games)` in calculations.ts, line chart in InsightsPanel.

##### Stat 6: Return Rate / Comeback Analysis
Of games with a 30+ day play gap, what % did you return to? Shows if you're a "one and done" or "revisitor" type. *"You've returned to 40% of games you stopped playing — higher than typical."* List top comebacks with gap duration.
**Where**: FunStatsPanel | **Effort**: Medium
**Files**: `getReturnRate(games)` in calculations.ts, section in FunStatsPanel.

##### Stat 7: Session Consistency Score
How regular is your gaming? Based on standard deviation of gaps between sessions. Visual heartbeat-style line. Labels:
- **Metronome** — very consistent (low std dev)
- **Rhythm Player** — mostly steady
- **Burst Gamer** — spikes and valleys
- **Chaos Mode** — totally random

**Where**: ExpandedStatsPanel (replaces removed personality card) | **Effort**: Low
**Files**: `getSessionConsistency(games)` in calculations.ts, card in ExpandedStatsPanel.

---

### Implementation Order (All Stats)

| Priority | # | Feature | Panel | Effort |
|----------|---|---------|-------|--------|
| **High** | 1 | Gaming Credit Score | InsightsPanel | Medium |
| **High** | 8 | Library Health Dashboard | StatsView top | Medium |
| **High** | 2 | Completion Funnel | AnalyticsPanel | Medium |
| **High** | 3 | The 80/20 Rule | InsightsPanel | Low |
| **Medium** | 9 | The Impulse Tax | InsightsPanel | Low |
| **Medium** | 12 | "Just One More Hour" Games | FunStatsPanel | Low |
| **Medium** | 14 | Sunk Cost Hall of Shame | FunStatsPanel | Low |
| **Medium** | 20 | The Dead Zone | FunStatsPanel | Low |
| **Medium** | 16 | Finishing Sprint Score | FunStatsPanel | Low |
| **Medium** | 22 | Rating Confidence Score | InsightsPanel | Low |
| **Medium** | 23 | Pareto Games (Power Law) | InsightsPanel | Low |
| **Medium** | 24 | Library Age Profile | ExpandedStatsPanel | Low |
| **Medium** | 28 | "If You Stopped Today" | ExpandedStatsPanel | Low |
| **Medium** | 7 | Session Consistency Score | ExpandedStatsPanel | Low |
| **Medium** | 11 | Price Creep/Discipline | InsightsPanel | Low |
| **Medium** | 4 | Game Length Sweet Spot | AnalyticsPanel | Low |
| **Medium** | 6 | Return Rate / Comeback | FunStatsPanel | Medium |
| **Medium** | 10 | Purchase Rhythm Detector | InsightsPanel | Medium |
| **Medium** | 5 | Money Efficiency Trend | InsightsPanel | Medium |
| **Lower** | 13 | Attention Span Spectrum | AnalyticsPanel | Medium |
| **Lower** | 15 | Replacement Chain | AnalyticsPanel | Medium |
| **Lower** | 18 | Genre Fatigue Detector | AnalyticsPanel | Medium |
| **Lower** | 19 | Session Time-of-Week Heatmap | AnalyticsPanel | Medium |
| **Lower** | 25 | Value Velocity Chart | AnalyticsPanel | Medium |
| **Lower** | 27 | Seasonal Genre Drift | AnalyticsPanel | Medium |
| **Lower** | 21 | Library DNA Fingerprint | ExpandedStatsPanel | Medium |
| **Lower** | 17 | Dopamine Curve | AnalyticsPanel | High |
| **Lower** | 26 | Cross-Genre Affinity Map | AnalyticsPanel | High |

### New Calculation Functions Needed (28)

```
getGamingCreditScore(games) → { score, label, factors: { played, value, completion, regret }, color }
getCompletionFunnel(games) → { stages: { label, count, percentage, dropoff }[] }
getPareto8020(games) → { topPercent, hoursPercent, topGames[], cumulativeData[] }
getGameLengthSweetSpot(games) → { brackets: { label, count, avgRating, completionRate, avgCostPerHour }[] }
getMoneyEfficiencyTrend(games) → { quarters: { period, avgCostPerHour }[], trend, improvement }
getReturnRate(games) → { returnRate, totalGapped, returnedCount, topComebacks: { game, gapDays }[] }
getSessionConsistency(games) → { score, label, stdDev, avgGap, pattern[] }
getLibraryHealth(games) → { activeRate, completionRate, abandonmentRate, dustRate }
getImpulseTax(games, year?) → { total, gameCount, percentOfSpend, yearOverYear? }
getPurchaseRhythm(games) → { type, avgGap, daysSinceLast, clusters[], timeline[] }
getPriceCreep(games) → { trend, quarterlyAvgPrice[], direction, change }
getStickyGames(games) → { games: { game, avgSession, multiplier }[], overallAvgSession }
getAttentionSpanSpectrum(games) → { buckets: { label, count, percent }[], dominantType }
getSunkCostGames(games) → { games: { game, hours, rating, regretHours }[] }
getReplacementChains(games) → { chains: { abandoned, replacement, gapDays }[], biggestAttractor }
getFinishingSprintScore(games) → { avgSprintPercent, sprintFinishers, steadyFinishers }
getDopamineCurve(game) → { pattern, sessionTrend[] }
getLibraryDopamineProfile(games) → { dominantPattern, distribution: { pattern, count }[] }
getGenreFatigue(games) → { fatigueGenres: { genre, ratingDrop, gamesBeforeFatigue }[] }
getWeekOfMonthHeatmap(games) → { grid: number[][] (7×4), peakCell, deadCell }
getDeadZone(games) → { longestDrought, startDate, endDate, whatBrokeIt }
getLibraryDNA(games) → { axes: { label, value }[] } (for radar chart)
getRatingConfidence(games) → { confidentTop10[], rawTop10[], differences, generosityBias }
getParetoAnalysis(games) → { topN, percentOfTotal, cumulativeChart[] }
getLibraryAgeProfile(games) → { histogram: { period, count }[], medianAge, oldestGame, newestGame }
getValueVelocity(games) → { fastValueGames[], slowValueGames[], neverWorthIt[] }
getCrossGenreAffinity(games) → { pairs: { genre1, genre2, strength }[] }
getSeasonalGenreDrift(games) → { months: { month, genreShares: { genre, percent }[] }[] }
getIfYouStoppedToday(games) → { totalHours, totalSpent, costPerHour, completed, completionRate, bestValue, worstValue, longestGame }
```

### Panel Destination Summary

| Panel | Stats Added | Stats Removed |
|-------|-------------|---------------|
| **StatsView** | Library Health Dashboard (top), remove All-Time Summary Cards, remove Franchise Stats, remove Best ROI chart | -3 sections |
| **InsightsPanel** | Gaming Credit Score, 80/20 Rule, Impulse Tax, Purchase Rhythm, Price Creep, Money Efficiency, Rating Confidence, Pareto Games | +8 sections |
| **AnalyticsPanel** | Completion Funnel, Game Length Sweet Spot, Attention Span, Replacement Chain, Dopamine Curve, Genre Fatigue, Session Heatmap, Value Velocity, Cross-Genre Affinity, Seasonal Genre Drift | +10 sections |
| **FunStatsPanel** | "Just One More Hour", Sunk Cost Hall, Dead Zone, Finishing Sprint, Return Rate, remove Backlog Boss, remove Genre Diversity, remove Bargain Hunter | +5/-3 sections |
| **ExpandedStatsPanel** | Session Consistency, Library DNA, Library Age Profile, "If You Stopped Today", remove Gaming Personality, remove Achievements, remove Backlog Clearance, remove Best Bargain, remove Biggest Regret, remove Cost Per Completion | +4/-6 sections |
| **TrophyRoom** | No changes | — |
| **DiscoverPanel** | No changes | — |

---

## Resources

- **Next.js Docs**: https://nextjs.org/docs
- **React Docs**: https://react.dev
- **TypeScript Docs**: https://www.typescriptlang.org/docs
- **Tailwind CSS Docs**: https://tailwindcss.com/docs
- **Recharts Docs**: https://recharts.org

---

## Changelog

### 2026-02-14 (v2.4.0)
- Added Card Info Enhancements plan: 6 features (card flip, AI whisper, momentum sparkline, library rank, progress ring, mood pulse)
- Added Stats Overhaul Plan: comprehensive audit with 12 redundancy removals, 10 dead code cleanups, 28 new stats
- Redundancy removals: duplicate franchise stats, backlog predictions, cost-per-completion, personality card, achievements, all-time summary cards, bargain hunter, best bargain, biggest regret, genre diversity, ROI chart
- New stats categories: Spending Psychology (impulse tax, purchase rhythm, price creep), Behavioral Patterns (sticky games, attention span, sunk cost, replacement chain, finishing sprint), Time & Engagement (dopamine curve, genre fatigue, session heatmap, dead zone, library DNA), Library Meta (rating confidence, pareto games, library age), Predictive (value velocity, cross-genre affinity, seasonal genre drift, if you stopped today), Composite Scores (gaming credit score, completion funnel, 80/20 rule, library health dashboard), Play Style (game length sweet spot, money efficiency trend, return rate, session consistency)

### 2026-02-11 (v2.3.0)
- Added Card Redesign & Detail Panel Overhaul plan: 18 features across 5 areas
- Cards: Poster mode with large game art, trading card rarity borders, color-tinted cards, card aging effect
- Card Data: Relationship status labels (15 emotional states), streak flames, visual rating stars, hero numbers
- List: Now Playing pinned card, personality-based sections (On Fire/Cooling Off/Collection/etc.), compact mode tag fix
- Detail Panel: Mobile-native bottom sheet, auto-generated game biographies with narrative voice styles, Your Verdict section, visual journey map, quick check-in flow
- Extra: Animated card transitions on sort/filter, micro-stat interactions with contextual tooltips

### 2025-02-09 (v2.2.0)
- Added Game Timeline & Recap Overhaul plan: 13 changes across 4 areas (Timeline, Week Recap, Games Tab, Monthly Recap)
- Timeline: AI chapter titles for months and weeks (matching existing quarter treatment)
- Week Recap: Remove SessionTypesScreen and 2 AI blurb screens, add Hot Take / Vibe Check / WeekVsWeek screens, cinematic title card
- Games Tab: Collapsible stats panel with localStorage persistence
- Monthly Recap: Full story-mode experience with 15 screens (Title Card, Month in Numbers, Top 3, Game of Month, Heatmap, Week-by-Week, Spending, Genre, Completions, Best Value, vs Last Month, Biggest Day, Personality, AI Reflection, Closing)

### 2025-02-06 (v2.1.0)
- Refined Enhancement Plan: 24 approved features across 5 phases with user feedback
- Added new features: Activity Pulse, Rating Bias, Cost-Per-Completion, What If Simulator, Abandonment Autopsy, Discount Insights
- Incorporated user preferences: shorter "On This Day" durations, genre-based trophies, user-selectable awards, keep compact cards

### 2025-02-06 (v2.0.0)
- Added comprehensive Game Analytics Deep Dive section (~400 lines)
- Documented all 70+ calculation functions, 20+ components, 5 hooks
- Added full data model documentation with all types
- Added UI architecture diagram and component hierarchy
- Added initial Enhancement Plan with 20 features across 3 phases
- Updated directory structure to reflect actual file inventory
- Updated Game type example to match current 20+ field model

### 2024-12-24
- Initial CLAUDE.md creation
- Documented architecture, patterns, and conventions
- Added comprehensive guidelines for AI assistants

---

**Last Updated**: 2026-02-14
**Version**: 2.4.0
**Maintained by**: AI assistants and contributors
