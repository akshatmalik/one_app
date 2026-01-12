# GitHub Copilot Instructions for One App

This file provides instructions for GitHub Copilot when working on the One App codebase.

## Project Overview

One App is a personal application hub built with Next.js that hosts multiple mini-applications from a single dashboard. Each mini-app is completely isolated and independent, following a modular architecture.

### Current Mini-Apps
- **Game Analytics** - Track game purchases, hours played, ratings, and calculate value metrics
- **Daily Tasks** - Daily task management with drag-and-drop reordering and date navigation
- **Time Tracker** - Track daily activities with timers and compare against planned schedules

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript 5.4+ (strict mode enabled)
- **Styling**: Tailwind CSS 3
- **State Management**: React hooks and local state
- **Data Persistence**: localStorage (with migration path to Firebase/API)
- **Authentication**: Firebase Auth (optional)
- **Icons**: lucide-react
- **Charts**: Recharts

## Key Architecture Patterns

### 1. Hub Model
```
/ (Home Page) → Hub displays all mini-apps as cards
  → Click card → Navigate to /apps/{app-id}
    → Mini-app runs with full functionality
```

### 2. Mini-App Isolation
Each mini-app MUST be completely isolated:
- Own components, hooks, utilities, types in `app/apps/{app-id}/`
- Own storage layer and business logic
- NO cross-mini-app imports (except shared UI components from `/components/ui/`)
- Can be developed independently

### 3. Repository Pattern (Data Layer)
All data operations MUST use the Repository pattern for easy migration from localStorage to API:

```typescript
// Define interface in lib/types.ts
export interface ItemRepository {
  getAll(): Promise<Item[]>;
  getById(id: string): Promise<Item | null>;
  create(item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<Item>;
  update(id: string, updates: Partial<Item>): Promise<Item>;
  delete(id: string): Promise<void>;
}

// Implement in lib/storage.ts
export class LocalStorageRepository implements ItemRepository {
  // Implementation with localStorage
}
```

**Important**: Always check `typeof window === 'undefined'` for SSR compatibility.

### 4. Custom Hooks Pattern
Encapsulate data operations in custom hooks:

```typescript
// hooks/useItems.ts
'use client';

export function useItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Always include: loading, error states
  // Call refresh() after mutations
  // Throw errors from mutations so components can handle them
}
```

### 5. HybridRepository for Firebase Integration
When Firebase is configured, use HybridRepository:
- **Not logged in**: Uses localStorage
- **Logged in**: Uses Firebase Firestore
- All data models include `userId` field

## Directory Structure

```
app/apps/{app-id}/          # Each mini-app in its own directory
├── page.tsx                # Main entry point (usually 'use client')
├── layout.tsx              # Optional app-specific layout
├── components/             # App-specific components
├── hooks/                  # Custom React hooks
├── lib/
│   ├── types.ts            # TypeScript interfaces
│   ├── storage.ts          # Repository implementation
│   └── calculations.ts     # Pure business logic functions
└── data/                   # Static/seed data
```

## Code Style & Conventions

### TypeScript
- **ALWAYS** use strict mode (already configured)
- **ALWAYS** type function parameters and returns
- **NEVER** use `any` type (use `unknown` if needed)
- Use interfaces for object shapes
- Use type aliases for unions
- Use `Partial<T>` for updates, `Omit<T, K>` for creation

### React Components
- Use functional components only
- Mark client components with `'use client'` directive
- Keep components focused (single responsibility)
- Extract reusable logic to custom hooks
- Components accept data via props, use hooks for data operations

### Naming Conventions
- **Components**: PascalCase (e.g., `GameForm.tsx`, `Button.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useGames.ts`)
- **Functions**: camelCase (e.g., `calculateMetrics()`)
- **Types/Interfaces**: PascalCase (e.g., `Game`, `GameRepository`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `STORAGE_KEY`)
- **Variables**: camelCase (e.g., `gameData`, `isLoading`)

### Styling
- **ALWAYS** use Tailwind CSS utility classes
- Use `clsx` for conditional classes
- **NEVER** write custom CSS unless absolutely necessary
- Consider responsive design (`sm:`, `md:`, `lg:` breakpoints)

### Business Logic
- Keep calculations pure in `lib/calculations.ts`
- No side effects in calculation functions
- Easy to test and reuse
- No React dependencies in business logic

## Adding a New Mini-App

### Quick Start
```bash
./scripts/create-mini-app.sh my-app "My App" "Description"
```

### Manual Steps
1. Create directory structure: `app/apps/my-app/`
2. Define types first in `lib/types.ts`
3. Implement repository in `lib/storage.ts`
4. Create custom hook in `hooks/`
5. Build UI components in `components/`
6. Register in `lib/mini-apps.ts`:
   ```typescript
   {
     id: 'my-app',
     name: 'My App',
     description: 'App description',
     icon: '🚀',
     path: '/apps/my-app',
     color: '#10B981',
     tags: ['category'],
   }
   ```

## Development Workflow

### Commands
- `npm run dev` - Start dev server (localhost:3000)
- `npm run build` - Build for production (catches TypeScript errors)
- `npm run start` - Run production build locally
- `npm run lint` - Check for linting errors

### Git Workflow
- Main branch: `master` (auto-deploys to Vercel)
- Feature branches: `feature/my-feature`
- Clear commit messages
- Merging to `master` triggers auto-deployment

## Important Rules

### DO:
- Follow existing patterns (see `game-analytics` as reference)
- Use TypeScript strict mode
- Implement Repository pattern for all data operations
- Keep mini-apps isolated
- Include loading and error states in hooks
- Handle `typeof window === 'undefined'` for SSR
- Use Tailwind CSS for styling
- Write pure functions for business logic
- Test changes with `npm run build` before committing

### DON'T:
- Import from other mini-apps' internals
- Use `any` type
- Skip Repository pattern
- Create tightly coupled components
- Mix business logic into components
- Write custom CSS (use Tailwind)
- Forget `'use client'` on components using hooks
- Add dependencies without checking bundle size
- Commit without running build

## Common Tasks Reference

### Create Component
```typescript
interface MyComponentProps {
  title: string;
  onSubmit: (data: FormData) => void;
  className?: string;
}

export function MyComponent({ title, onSubmit, className }: MyComponentProps) {
  return <div className={clsx('base-classes', className)}>Content</div>;
}
```

### Create Hook
```typescript
'use client';

export function useMyFeature() {
  const [data, setData] = useState<Data[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Implementation

  return { data, loading, error, /* methods */ };
}
```

### Import Paths
```typescript
// Shared components
import { Button } from '@/components/ui/Button';

// App-specific (use relative paths)
import { useGames } from '../hooks/useGames';
import { Game } from '../lib/types';
```

## Firebase Integration (Optional)

When Firebase is configured:
- Authentication via `AuthContext` and `useAuthContext` hook
- Sign-in/sign-out in Navigation bar
- HybridRepository switches based on auth state
- All data includes `userId` field for per-user isolation
- Firestore security rules ensure users can only access their own data

## Testing Checklist

Before committing:
- [ ] Run `npm run build` - No TypeScript errors
- [ ] Run `npm run lint` - No linting errors
- [ ] Test in browser - Functionality works
- [ ] Test responsive design - Mobile/tablet views
- [ ] Test CRUD operations - Create, read, update, delete
- [ ] Test edge cases - Empty states, zero values
- [ ] Clear localStorage and reload - Data persistence works

## Additional Resources

- Full documentation: `/CLAUDE.md`
- Mini-app guide: `/docs/ADDING_MINI_APPS.md`
- Next.js docs: https://nextjs.org/docs
- Tailwind CSS docs: https://tailwindcss.com/docs
