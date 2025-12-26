export type Priority = 'p1' | 'p2' | 'p3' | 'p4' | null;

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  date: string; // ISO date string (YYYY-MM-DD)
  category?: string; // Extracted from @category
  priority?: Priority; // Extracted from #p1, #p2, #p3, #p4
  createdAt: string; // ISO datetime string
  updatedAt: string; // ISO datetime string
}

// Parse task text to extract category and priority
export function parseTaskText(text: string): {
  cleanText: string;
  category?: string;
  priority?: Priority;
} {
  let cleanText = text;
  let category: string | undefined;
  let priority: Priority = null;

  // Extract @category
  const categoryMatch = text.match(/@(\w+)/);
  if (categoryMatch) {
    category = categoryMatch[1];
    cleanText = cleanText.replace(/@\w+/g, '').trim();
  }

  // Extract #priority (p1, p2, p3, p4)
  const priorityMatch = text.match(/#(p[1-4])/i);
  if (priorityMatch) {
    priority = priorityMatch[1].toLowerCase() as Priority;
    cleanText = cleanText.replace(/#p[1-4]/gi, '').trim();
  }

  return { cleanText, category, priority };
}

export interface TaskRepository {
  getAll(): Promise<Task[]>;
  getByDate(date: string): Promise<Task[]>;
  getIncompleteBefore(date: string): Promise<Task[]>;
  getById(id: string): Promise<Task | null>;
  create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task>;
  update(id: string, updates: Partial<Task>): Promise<Task>;
  delete(id: string): Promise<void>;
}
