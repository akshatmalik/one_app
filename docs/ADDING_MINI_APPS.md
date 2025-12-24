# Adding a New Mini-App

This guide explains how to create and add a new mini-application to the Hub App.

## Quick Start

### 1. Generate a New Mini-App

```bash
./scripts/create-mini-app.sh my-app "My App" "App description"
```

This creates the directory structure at `app/apps/my-app/` with template files.

### 2. Register Your App

Edit `lib/mini-apps.ts` and add your app to the `MINI_APPS` array:

```typescript
{
  id: 'my-app',
  name: 'My App',
  description: 'App description',
  icon: '🚀',  // Emoji icon
  path: '/apps/my-app',
  color: '#10B981',  // Tailwind color or hex
  tags: ['category', 'optional'],
  isNew: true,  // Shows "New" badge
  isComingSoon: false,  // Makes app unclickable
}
```

### 3. Build Your App

Your app directory structure:

```
app/apps/my-app/
├── layout.tsx          # App layout (optional)
├── page.tsx            # Main page
├── components/         # App-specific components
│   ├── MyComponent.tsx
│   └── ...
├── hooks/              # Custom React hooks
│   ├── useMyHook.ts
│   └── ...
├── lib/
│   ├── types.ts        # TypeScript interfaces
│   ├── storage.ts      # Data persistence layer
│   ├── calculations.ts # Business logic
│   └── utils.ts        # Helper functions
└── data/               # Static data, seed data
    └── ...
```

## Storage Pattern

The recommended pattern for data persistence:

### 1. Define Types (`lib/types.ts`)

```typescript
export interface MyItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface MyRepository {
  getAll(): Promise<MyItem[]>;
  getById(id: string): Promise<MyItem | null>;
  create(item: Omit<MyItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<MyItem>;
  update(id: string, updates: Partial<MyItem>): Promise<MyItem>;
  delete(id: string): Promise<void>;
}
```

### 2. Implement localStorage (`lib/storage.ts`)

```typescript
'use client';

import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'my-app-items';

export class LocalStorageRepository implements MyRepository {
  async getAll(): Promise<MyItem[]> {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  async create(itemData): Promise<MyItem> {
    const item = {
      ...itemData,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const items = await this.getAll();
    items.push(item);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return item;
  }

  // Implement other methods...
}

export const repository = new LocalStorageRepository();
```

### 3. Create a Custom Hook

```typescript
'use client';

import { useState, useEffect } from 'react';
import { MyItem } from '../lib/types';
import { repository } from '../lib/storage';

export function useMyItems() {
  const [items, setItems] = useState<MyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    repository.getAll().then(setItems).finally(() => setLoading(false));
  }, []);

  const addItem = async (data: Omit<MyItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const item = await repository.create(data);
    setItems(prev => [...prev, item]);
    return item;
  };

  // Other methods...

  return { items, loading, addItem, updateItem, deleteItem };
}
```

### 4. Use in Components

```typescript
'use client';

import { useMyItems } from '../hooks/useMyItems';

export function MyAppPage() {
  const { items, addItem } = useMyItems();

  return (
    <div>
      <h1>My App</h1>
      {items.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

## Migration: localStorage → Backend API

When ready to move to a backend, implement a new repository class:

```typescript
// lib/api-storage.ts

export class ApiRepository implements MyRepository {
  async getAll(): Promise<MyItem[]> {
    const res = await fetch('/api/items');
    return res.json();
  }

  async create(itemData): Promise<MyItem> {
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData),
    });
    return res.json();
  }

  // ... other methods
}
```

Then swap in `storage.ts`:

```typescript
// Before:
// export const repository = new LocalStorageRepository();

// After:
export const repository = new ApiRepository();
```

**No component changes needed!** The repository abstraction handles the swap.

## Best Practices

### 1. Encapsulation
- Keep all app code in the app's directory
- Don't import from other mini-apps' internals
- Use shared components from `@/components/ui/`

### 2. TypeScript
- Define types for all data
- Use strict mode (`"strict": true` in tsconfig.json)
- Leverage type inference and autocomplete

### 3. Client Components
- Mark components with `'use client'` only when using hooks/state
- Prefer server components for static content

### 4. Naming Conventions
- Components: PascalCase (`MyComponent.tsx`)
- Hooks: camelCase with `use` prefix (`useMyHook.ts`)
- Types: PascalCase (interface/type keywords handle plurals)
- Constants: UPPER_SNAKE_CASE

### 5. Performance
- Use `useMemo` for expensive calculations
- Use `useCallback` for stable function refs
- Lazy load data with loading states
- Provide error handling

### 6. State Management
- Start with `useState` and custom hooks
- Use Context API if multiple components need shared state
- Avoid drilling props deeply

### 7. Styling
- Use Tailwind CSS classes
- Import shared UI components from `@/components/ui/`
- Keep app-specific styles in component files

### 8. Error Handling
- Always handle localStorage errors
- Provide error states in UI
- Log errors for debugging

## File Structure Examples

### Simple App (Task List)
```
app/apps/task-list/
├── page.tsx              # Main task list view
├── components/
│   ├── TaskForm.tsx      # Add/edit task
│   ├── TaskList.tsx      # Display tasks
│   └── TaskCard.tsx      # Individual task
├── hooks/
│   └── useTasks.ts       # CRUD operations
├── lib/
│   ├── types.ts          # Task type
│   └── storage.ts        # localStorage
└── data/
    └── seed-tasks.ts     # Optional seed data
```

### Complex App (Budget Tracker)
```
app/apps/budget/
├── page.tsx              # Dashboard
├── components/
│   ├── TransactionForm.tsx
│   ├── TransactionList.tsx
│   ├── BudgetChart.tsx   # Visualization
│   ├── CategoryBreakdown.tsx
│   └── SummaryCard.tsx
├── hooks/
│   ├── useTransactions.ts
│   └── useBudgetAnalytics.ts
├── lib/
│   ├── types.ts
│   ├── storage.ts
│   ├── calculations.ts   # Budget math
│   └── utils.ts
└── data/
    └── categories.ts     # Predefined categories
```

## Debugging

### localStorage Issues
If data isn't persisting:
1. Check browser DevTools → Application → Local Storage
2. Verify storage key matches
3. Ensure `typeof window !== 'undefined'` check in getAll()

### Type Errors
- Check tsconfig.json has `"strict": true`
- Import types correctly: `import { MyType } from '../lib/types'`
- Use proper type annotations on function params/returns

### State Not Updating
- Ensure you're calling `setItems` after data operations
- Check useEffect dependencies array
- Verify component is marked with `'use client'`

## Getting Help

- Refer to Game Analytics app (`app/apps/game-analytics/`) for a complete example
- Check Recharts docs for chart components
- Refer to Tailwind CSS docs for styling

---

Happy building! 🚀
