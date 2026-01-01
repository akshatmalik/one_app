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
    <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What needs to be done?"
        className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/5 text-white rounded-xl text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all placeholder:text-white/30"
        disabled={isAdding}
      />
      <button
        type="submit"
        disabled={!text.trim() || isAdding}
        className="px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-500 disabled:bg-white/5 disabled:text-white/20 disabled:cursor-not-allowed transition-all"
      >
        <Plus size={18} className={isAdding ? 'animate-spin' : ''} />
      </button>
    </form>
  );
}
