export interface Task {
  id: string;
  text: string;
  completed: boolean;
  date: string; // ISO date string (YYYY-MM-DD)
  order: number; // For drag-and-drop reordering
  createdAt: string; // ISO datetime string
  updatedAt: string; // ISO datetime string
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
