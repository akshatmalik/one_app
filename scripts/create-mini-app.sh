#!/bin/bash

# Create Mini-App Template Generator
# Usage: ./scripts/create-mini-app.sh my-app "My App" "Description of the app"

set -e

APP_SLUG=$1
APP_NAME=$2
APP_DESC=$3

if [ -z "$APP_SLUG" ]; then
  echo "❌ Error: App slug required"
  echo ""
  echo "Usage: ./scripts/create-mini-app.sh my-app 'My App' 'Description'"
  echo ""
  echo "Examples:"
  echo "  ./scripts/create-mini-app.sh task-manager 'Task Manager' 'Track your daily tasks'"
  echo "  ./scripts/create-mini-app.sh budget-tracker 'Budget Tracker' 'Manage your finances'"
  exit 1
fi

APP_DIR="app/apps/$APP_SLUG"

if [ -d "$APP_DIR" ]; then
  echo "❌ Error: Directory $APP_DIR already exists"
  exit 1
fi

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p "$APP_DIR"/{components,hooks,lib,data}

# Create layout.tsx
cat > "$APP_DIR/layout.tsx" << 'EOF'
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
EOF

# Create page.tsx
cat > "$APP_DIR/page.tsx" << EOF
export default function Page() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-gray-900">$APP_NAME</h1>
      <p className="text-gray-600 mt-2">$APP_DESC</p>
    </div>
  );
}
EOF

# Create lib/types.ts
cat > "$APP_DIR/lib/types.ts" << 'EOF'
// Define your app-specific types here
export interface ExampleItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExampleRepository {
  getAll(): Promise<ExampleItem[]>;
  getById(id: string): Promise<ExampleItem | null>;
  create(item: Omit<ExampleItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExampleItem>;
  update(id: string, updates: Partial<ExampleItem>): Promise<ExampleItem>;
  delete(id: string): Promise<void>;
}
EOF

# Create lib/storage.ts (localStorage template)
cat > "$APP_DIR/lib/storage.ts" << 'EOF'
'use client';

import { v4 as uuidv4 } from 'uuid';
import { ExampleItem, ExampleRepository } from './types';

const STORAGE_KEY = 'example-app-items';

export class LocalStorageRepository implements ExampleRepository {
  async getAll(): Promise<ExampleItem[]> {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  async getById(id: string): Promise<ExampleItem | null> {
    const items = await this.getAll();
    return items.find(i => i.id === id) || null;
  }

  async create(itemData: Omit<ExampleItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExampleItem> {
    const item: ExampleItem = {
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

  async update(id: string, updates: Partial<ExampleItem>): Promise<ExampleItem> {
    const items = await this.getAll();
    const index = items.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Item not found');

    items[index] = {
      ...items[index],
      ...updates,
      id,
      createdAt: items[index].createdAt,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return items[index];
  }

  async delete(id: string): Promise<void> {
    const items = await this.getAll();
    const filtered = items.filter(i => i.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
}

export const repository = new LocalStorageRepository();
EOF

echo "✅ Created mini-app at $APP_DIR"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Register the app in lib/mini-apps.ts:"
echo ""
echo "   {"
echo "     id: '$APP_SLUG',"
echo "     name: '$APP_NAME',"
echo "     description: '$APP_DESC',"
echo "     icon: '📱',"
echo "     path: '/apps/$APP_SLUG',"
echo "     color: '#3B82F6',"
echo "   },"
echo ""
echo "2. Build your app:"
echo "   - Edit: $APP_DIR/page.tsx (main page)"
echo "   - Create: $APP_DIR/components/ (React components)"
echo "   - Create: $APP_DIR/hooks/ (Custom hooks)"
echo ""
echo "3. Add to git and push:"
echo "   git add ."
echo "   git commit -m 'Add $APP_NAME mini-app'"
echo "   git push"
echo ""
