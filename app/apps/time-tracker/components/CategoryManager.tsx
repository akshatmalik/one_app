'use client';

import { useState } from 'react';
import { useCategories } from '../hooks/useCategories';
import { Plus, Trash2, Tag } from 'lucide-react';

const PRESET_COLORS = [
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
];

export function CategoryManager() {
  const { categories, addCategory, deleteCategory } = useCategories();
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);

  const handleAdd = async () => {
    if (!name.trim()) return;

    try {
      await addCategory({ name: name.trim(), color });
      setName('');
      setColor(PRESET_COLORS[0]);
      setIsAdding(false);
    } catch (error) {
      alert('Error creating category: ' + (error as Error).message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Delete category "${name}"? This won't delete associated time entries.`)) {
      try {
        await deleteCategory(id);
      } catch (error) {
        alert('Error deleting category: ' + (error as Error).message);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Categories</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {isAdding && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Category name"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') setIsAdding(false);
              }}
              autoFocus
            />
            <button
              onClick={handleAdd}
              disabled={!name.trim()}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
          <div className="flex gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded transition-all ${
                  color === c ? 'ring-2 ring-purple-500 ring-offset-2' : ''
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>
      )}

      {categories.length === 0 ? (
        <div className="text-center py-4">
          <Tag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No categories yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 transition-colors group"
            >
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: category.color }}
              />
              <span className="flex-1 text-sm text-gray-700">{category.name}</span>
              <button
                onClick={() => handleDelete(category.id, category.name)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
