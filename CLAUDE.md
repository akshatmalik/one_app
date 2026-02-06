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

## Game Analytics Enhancement Plan

### Phase 1: High Impact, Lower Effort

#### 1. Random Game Picker ("Spin the Wheel")
**What**: Can't decide what to play? Animated randomizer picks from your backlog.
**Details**:
- Filter by genre, platform, estimated length, mood (quick session vs. deep dive)
- Animated wheel/slot-machine spin for delight
- "Lock in" or "spin again" buttons
- Only picks from owned, unfinished games
**Files to modify**: New component `components/RandomPicker.tsx`, add to `page.tsx` tabs or as modal
**New calculations**: None needed (just filters existing games)

#### 2. Gaming Goals & Challenges
**What**: Set personal goals and track progress with visual progress bars.
**Examples**: "Complete 12 games this year", "Spend under $500", "Try 3 new genres", "Clear 5 backlog games this month"
**Details**:
- Goal types: completion count, spending limit, genre variety, backlog clearance, hours target
- Progress bars with percentage, visual milestones
- Goal history: see past goals and whether you met them
**Files to modify**: New `lib/goals-storage.ts`, new `hooks/useGoals.ts`, new `components/GoalsPanel.tsx`, update `lib/types.ts` with Goal interface
**New types**: `Goal { id, userId, type, target, period, startDate, endDate, createdAt, updatedAt }`

#### 3. Completion Probability Predictor
**What**: Based on your history, predict how likely you are to finish a game.
**Details**:
- Analyze: genre completion rates, hours-to-abandon ratio, session frequency decay, days since last session
- Per-game probability displayed on game cards: "73% likely to complete based on your RPG history"
- Factors: genre match, current momentum (recent sessions), historical pattern for similar games
**Files to modify**: Add to `lib/calculations.ts`, display in `page.tsx` game cards
**New calculations**: `getCompletionProbability(game, allGames)` → number (0-100)

#### 4. Spending Forecast
**What**: Project annual spend based on monthly purchase patterns.
**Details**:
- "At your current pace, you'll spend ~$840 this year"
- Trend line chart showing actual vs. projected vs. budget
- Warning when on track to exceed budget
**Files to modify**: Add to `lib/calculations.ts`, display in `StatsView.tsx`
**New calculations**: `getSpendingForecast(games, year)` → { projected, monthlyAvg, onTrack }

#### 5. Genre Satisfaction Matrix
**What**: Scatter plot showing genre vs. average rating and average hours.
**Details**:
- X-axis: average hours per genre, Y-axis: average rating per genre
- Bubble size: number of games in genre
- Quadrants labeled: "Love & Play" (high-high), "Love but Skip" (high rating, low hours), "Guilty Pleasure" (low rating, high hours), "Why Do You Buy These?" (low-low)
**Files to modify**: New chart in `AdvancedCharts.tsx` or new `components/GenreMatrix.tsx`
**New calculations**: `getGenreSatisfactionMatrix(games)` → Array<{ genre, avgRating, avgHours, count }>

#### 6. Guilt-Free Gaming Calculator
**What**: Compare gaming cost-per-hour to other entertainment to show gaming's value.
**Details**:
- Bar chart: Gaming ($1.80/hr) vs Movies ($12/hr) vs Concerts ($25/hr) vs Dining ($15/hr) vs Streaming ($2/hr)
- "Your gaming is 6.7x cheaper than going to the movies"
- Uses your actual average cost-per-hour
**Files to modify**: New component `components/ValueComparison.tsx`, add to StatsView
**New calculations**: `getEntertainmentComparison(avgCostPerHour)` → comparison data

#### 7. Backlog Doomsday Clock
**What**: Humorous countdown showing when your backlog will be cleared.
**Details**:
- "At your average completion rate of 1.3 games/month, your backlog will be cleared on March 15, 2028"
- Visual clock/countdown animation
- Updates dynamically as you complete games or add new ones
- "You added games faster than you finished them last month — doomsday moved 2 months further!"
**Files to modify**: Already partially exists as `getPredictedBacklogClearance()` in calculations.ts. New visual component `components/BacklogDoomsday.tsx`, add to StatsView or FunStatsPanel
**Enhancement**: Add trend direction (getting better or worse) and humorous messaging

### Phase 2: High Impact, Medium Effort

#### 8. Game Detail View
**What**: Dedicated full-page view for each game instead of cramming into cards/modals.
**Details**:
- Play history graph (hours over time from play logs)
- Value trajectory chart (cost-per-hour dropping over time as you play more)
- Session timeline with notes
- All metadata cleanly laid out
- Quick actions: log time, edit, change status
- Related games in same franchise
**Files to modify**: New route `app/apps/game-analytics/game/[id]/page.tsx` or modal-based detail view
**Impact**: Major UX uplift — the single biggest structural improvement

#### 9. Advanced Filtering & Search
**What**: Real filter bar with multi-criteria search.
**Details**:
- Text search by name
- Multi-select: genre, platform, status, purchase source
- Range sliders: price, rating, hours played
- Saved filter presets
- Active filter indicator with clear button
**Files to modify**: New `components/FilterBar.tsx`, update `page.tsx` filtering logic

#### 10. Value Over Time Chart (per-game)
**What**: Chart showing how a game's cost-per-hour drops as you accumulate play hours.
**Details**:
- X-axis: cumulative hours (from play logs), Y-axis: cost-per-hour at that point
- Horizontal lines at value thresholds (Excellent/Good/Fair/Poor)
- Shows the inflection point where a game becomes "worth it"
- "After 12 more hours, this game reaches Excellent value"
**Files to modify**: Add to game detail view, new calculation `getValueOverTime(game)` → Array<{ hours, costPerHour }>

#### 11. Price Sweet Spot Analysis
**What**: Which price brackets give you the best value and satisfaction?
**Details**:
- Group games by price range ($0-15, $15-30, $30-50, $50-70, $70+)
- Show: avg rating, avg hours, avg cost-per-hour, completion rate per bracket
- "Your best value games are in the $15-30 range"
**Files to modify**: Add to `lib/calculations.ts` and `StatsView.tsx`
**New calculations**: `getPriceBracketAnalysis(games)` → Array<{ bracket, avgRating, avgHours, avgCostPerHour, completionRate, count }>

#### 12. Shareable Stats Cards (Gaming Wrapped)
**What**: Export beautiful stat summary cards as images, like Spotify Wrapped.
**Details**:
- Top 5 games, total hours, personality type, favorite genre
- Designed for sharing (social-media-friendly aspect ratios)
- Seasonal/yearly/monthly variants
- Uses html2canvas or similar for image export
**Files to modify**: New `components/ShareableCard.tsx`, export logic
**Dependency**: May need `html2canvas` package

### Phase 3: Fun & Engagement Features

#### 13. Milestone Celebrations
**What**: Pop-up celebrations for gaming milestones.
**Examples**: 100th hour logged, 10th game completed, first 10/10 rating, sub-$0.50/hr cost-per-hour achieved, 7-day streak
**Details**:
- Toast/modal notification with confetti animation
- Milestone history log
- Track which milestones have been shown
**Files to modify**: New `hooks/useMilestones.ts`, milestone tracking in localStorage, integrate with `page.tsx`

#### 14. "On This Day" Retrospective
**What**: Nostalgia triggers from your gaming history.
**Examples**: "One year ago today you started Elden Ring", "6 months ago you completed Astro Bot"
**Details**:
- Show on main page as a subtle card when relevant events exist
- Pull from playLogs, datePurchased, startDate, endDate
**Files to modify**: New calculation `getOnThisDay(games)`, display component

#### 15. Game of the Month/Year Awards
**What**: Auto-generated awards at period end.
**Categories**: Most Played, Best Value, Biggest Surprise, Most Regretted, Fastest Completion, Best ROI
**Details**:
- Auto-selects winners from data
- Presentation card with "award" styling
- Year-end summary collecting all monthly winners
**Files to modify**: New `calculations` functions + `components/AwardsPanel.tsx`

#### 16. Personality Evolution Timeline
**What**: Track how your gaming personality changes over time.
**Details**:
- Calculate personality per month/quarter
- Timeline showing personality shifts
- "You started as a Backlog Hoarder but evolved into a Completionist over 6 months"
**Files to modify**: New calculation using `getGamingPersonality()` per time window, new visualization

#### 17. Collection Trophies
**What**: Visual trophy case for gaming achievements.
**Examples**: "Century Club" (100+ hrs), "Bargain Hunter" (avg discount >40%), "Genre Explorer" (10+ genres), "Completionist Elite" (80%+ completion), "Marathon Master" (single 8+ hr session)
**Details**:
- Trophy shelf UI with earned/locked states
- Bronze/silver/gold tiers per trophy
- Progress bars for locked trophies
**Files to modify**: Extend `getGamingAchievements()`, new `components/TrophyCase.tsx`

#### 18. "What Should I Play Next?" Recommender
**What**: Smart recommendation from your backlog based on your preferences.
**Details**:
- Factors: genre preference (rating correlation), current mood (quick vs. deep), recent genres (avoid fatigue), time available, queue position
- "Based on your love of RPGs and your 2-hour window, try Persona 5"
- Multiple suggestions ranked by match score
**Files to modify**: New `getRecommendation(games, preferences)` in calculations, new component

#### 19. Day-of-Week & Seasonal Patterns
**What**: When do you game most?
**Details**:
- Day-of-week chart from play log dates
- Monthly/seasonal trends
- "You're a weekend warrior — 68% of sessions on Sat/Sun"
- "You game 3x more in December than June"
**Files to modify**: New calculations from play log date analysis, charts in StatsView

#### 20. Franchise Deep Dive
**What**: Dedicated franchise analytics page/panel.
**Details**:
- Total investment across all entries
- Rating trajectory (are sequels getting better or worse?)
- Hours per entry
- Cost-per-hour across franchise
- Average time between entries
**Files to modify**: New `components/FranchiseAnalytics.tsx`, calculations using existing franchise data

### Implementation Priority

**Recommended order** (value vs. effort):
1. Random Game Picker (#1) — fun, lightweight, immediate delight
2. Guilt-Free Calculator (#6) — fun conversation piece, easy to build
3. Backlog Doomsday Clock (#7) — builds on existing calculation, humorous
4. Spending Forecast (#4) — practical, builds on existing budget feature
5. Completion Probability (#3) — genuinely novel insight
6. Genre Satisfaction Matrix (#5) — powerful visualization
7. Gaming Goals (#2) — drives engagement, needs storage layer
8. Game Detail View (#8) — biggest UX uplift, most effort
9. Advanced Filtering (#9) — power user essential
10. Everything in Phase 3 — fun additions after core improvements

---

## Resources

- **Next.js Docs**: https://nextjs.org/docs
- **React Docs**: https://react.dev
- **TypeScript Docs**: https://www.typescriptlang.org/docs
- **Tailwind CSS Docs**: https://tailwindcss.com/docs
- **Recharts Docs**: https://recharts.org

---

## Changelog

### 2025-02-06
- Added comprehensive Game Analytics Deep Dive section (~400 lines)
- Documented all 70+ calculation functions, 20+ components, 5 hooks
- Added full data model documentation with all types
- Added UI architecture diagram and component hierarchy
- Added Game Analytics Enhancement Plan with 20 features across 3 phases
- Updated directory structure to reflect actual file inventory
- Updated Game type example to match current 20+ field model

### 2024-12-24
- Initial CLAUDE.md creation
- Documented architecture, patterns, and conventions
- Added comprehensive guidelines for AI assistants

---

**Last Updated**: 2025-02-06
**Version**: 2.0.0
**Maintained by**: AI assistants and contributors
