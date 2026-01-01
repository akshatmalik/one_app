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
    match /tasks/{taskId} {
      allow read, write: if request.auth != null;
    }
    match /games/{gameId} {
      allow read, write: if request.auth != null;
    }
    match /budgetSettings/{budgetId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

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
│   │   └── game-analytics/        # Example mini-app
│   │       ├── components/        # App-specific components
│   │       │   ├── BlendScoreChart.tsx
│   │       │   ├── GameForm.tsx
│   │       │   ├── GameTable.tsx
│   │       │   └── StatsPanel.tsx
│   │       ├── hooks/             # Custom React hooks
│   │       │   ├── useAnalytics.ts
│   │       │   └── useGames.ts
│   │       ├── lib/               # Business logic & utilities
│   │       │   ├── calculations.ts  # Pure functions
│   │       │   ├── storage.ts       # Repository implementation
│   │       │   └── types.ts         # TypeScript interfaces
│   │       ├── data/              # Static/seed data
│   │       │   └── baseline-games.ts
│   │       ├── layout.tsx         # App layout (optional)
│   │       └── page.tsx           # Main entry point
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
// lib/types.ts
export interface Game {
  id: string;
  name: string;
  price: number;
  hours: number;
  rating: number;
  status: GameStatus;
  notes?: string;          // Optional fields with ?
  datePurchased?: string;
  createdAt: string;       // ISO date strings
  updatedAt: string;
}

export type GameStatus = 'Not Started' | 'In Progress' | 'Completed';
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

## Resources

- **Next.js Docs**: https://nextjs.org/docs
- **React Docs**: https://react.dev
- **TypeScript Docs**: https://www.typescriptlang.org/docs
- **Tailwind CSS Docs**: https://tailwindcss.com/docs
- **Recharts Docs**: https://recharts.org

---

## Changelog

### 2024-12-24
- Initial CLAUDE.md creation
- Documented architecture, patterns, and conventions
- Added comprehensive guidelines for AI assistants

---

**Last Updated**: 2024-12-24
**Version**: 1.0.0
**Maintained by**: AI assistants and contributors
