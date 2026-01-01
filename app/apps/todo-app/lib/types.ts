export type Priority = 1 | 2 | 3 | 4;

export interface Task {
  id: string;
  userId: string; // Owner of the task
  text: string;
  completed: boolean;
  date: string; // ISO date string (YYYY-MM-DD)
  order: number; // For drag-and-drop reordering
  category?: string; // Task category (extracted from @mention)
  priority: Priority; // 1=P1 (highest), 4=P4 (lowest)
  points: number; // Points earned (default: 1)
  completedAt?: string; // ISO datetime when completed
  createdAt: string; // ISO datetime string
  updatedAt: string; // ISO datetime string
}

export interface TaskRepository {
  setUserId(userId: string): void;
  getAll(): Promise<Task[]>;
  getByDate(date: string): Promise<Task[]>;
  getIncompleteBefore(date: string): Promise<Task[]>;
  getById(id: string): Promise<Task | null>;
  getCompletedInRange(startDate: string, endDate: string): Promise<Task[]>;
  getAllCompleted(): Promise<Task[]>;
  create(task: Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Task>;
  update(id: string, updates: Partial<Task>): Promise<Task>;
  delete(id: string): Promise<void>;
}

export interface TaskStats {
  // Period stats
  completed: number;
  total: number;
  points: number;
  completionRate: number;

  // By priority
  byPriority: Record<Priority, { completed: number; total: number }>;

  // By category
  byCategory: Record<string, { completed: number; total: number; points: number }>;

  // Streaks
  currentStreak: number;
  longestStreak: number;
}

export interface DailyCompletion {
  date: string;
  completed: number;
  points: number;
}
