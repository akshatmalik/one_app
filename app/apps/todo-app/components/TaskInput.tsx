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
    <div>
      <form onSubmit={handleSubmit} className="flex gap-3 mb-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What needs to be done? Use @category !1-4"
          className="flex-1 px-4 py-3 bg-white/[0.06] border border-white/10 text-white/95 rounded-xl text-sm focus:outline-none focus:bg-white/[0.09] focus:border-purple-400/40 focus:ring-2 focus:ring-purple-400/20 transition-all placeholder:text-white/45"
          disabled={isAdding}
        />
        <button
          type="submit"
          disabled={!text.trim() || isAdding}
          className="px-4 py-3 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-400 hover:to-pink-400 hover:shadow-lg hover:shadow-purple-500/30 disabled:from-white/10 disabled:to-white/10 disabled:text-white/35 disabled:shadow-none disabled:cursor-not-allowed transition-all"
        >
          <Plus size={18} className={isAdding ? 'animate-spin' : ''} />
        </button>
      </form>
      <p className="text-xs text-white/55 mb-4 px-1">
        Tip: Use <span className="text-purple-300 font-medium">@work</span> for categories, <span className="text-red-300 font-medium">!1</span> <span className="text-orange-300 font-medium">!2</span> <span className="text-blue-300 font-medium">!3</span> <span className="text-white/65 font-medium">!4</span> for priority
      </p>
    </div>
  );
}
