'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

interface TaskInputProps {
  onAdd: (text: string) => Promise<void>;
}

export function TaskInput({ onAdd }: TaskInputProps) {
  const [text, setText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isAdding) return;

    try {
      setIsAdding(true);
      await onAdd(text.trim());
      setText('');
    } catch (error) {
      console.error('Failed to add task:', error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a task..."
        className="flex-1 px-3 py-2 bg-slate-700/50 dark:bg-slate-800/50 text-slate-100 dark:text-white rounded-lg text-sm focus:outline-none focus:bg-slate-700/70 dark:focus:bg-slate-800/70 transition-all duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
        disabled={isAdding}
      />
      <button
        type="submit"
        disabled={!text.trim() || isAdding}
        className="px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow"
      >
        <Plus size={16} className={isAdding ? 'animate-spin' : ''} />
      </button>
    </form>
  );
}
