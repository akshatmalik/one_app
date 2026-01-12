'use client';

import { useState } from 'react';
import { Tag, Category } from '../lib/types';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import clsx from 'clsx';

interface TagManagerProps {
  tags: Tag[];
  categories: Category[];
  onCreateTag: (name: string, emoji: string, categoryId: string) => Promise<void>;
  onDeleteTag: (tagId: string) => Promise<void>;
  onCreateCategory: (name: string, color: string) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onClose: () => void;
}

export function TagManager({
  tags,
  categories,
  onCreateTag,
  onDeleteTag,
  onCreateCategory,
  onDeleteCategory,
  onClose,
}: TagManagerProps) {
  const [activeTab, setActiveTab] = useState<'tags' | 'categories'>('tags');

  // Tag form state
  const [tagName, setTagName] = useState('');
  const [tagEmoji, setTagEmoji] = useState('🏷️');
  const [tagCategoryId, setTagCategoryId] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Category form state
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#8B5CF6');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim() || !tagCategoryId) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onCreateTag(tagName.trim(), tagEmoji, tagCategoryId);
      setTagName('');
      setTagEmoji('🏷️');
      setShowEmojiPicker(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setError('Please enter a category name');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onCreateCategory(categoryName.trim(), categoryColor);
      setCategoryName('');
      setCategoryColor('#8B5CF6');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;
    try {
      setSaving(true);
      setError(null);
      await onDeleteTag(tagId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const categoryTags = tags.filter(t => t.categoryId === categoryId);
    if (categoryTags.length > 0) {
      setError('Cannot delete category with existing tags. Delete the tags first.');
      return;
    }
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      setSaving(true);
      setError(null);
      await onDeleteCategory(categoryId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setTagEmoji(emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const predefinedColors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
    '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
    '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
    '#EC4899', '#F43F5E',
  ];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Manage Tags & Categories</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('tags')}
              className={clsx(
                'flex-1 py-3 px-4 font-medium transition-colors',
                activeTab === 'tags'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Tags ({tags.length})
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={clsx(
                'flex-1 py-3 px-4 font-medium transition-colors',
                activeTab === 'categories'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Categories ({categories.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {activeTab === 'tags' && (
            <>
              {/* Create Tag Form */}
              <form onSubmit={handleCreateTag} className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900">Create New Tag</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tag Name
                    </label>
                    <input
                      type="text"
                      value={tagName}
                      onChange={(e) => setTagName(e.target.value)}
                      placeholder="e.g., Running"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={tagCategoryId}
                      onChange={(e) => setTagCategoryId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={saving}
                    >
                      <option value="">Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emoji
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-2xl"
                    disabled={saving}
                  >
                    {tagEmoji}
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute z-10 mt-2">
                      <EmojiPicker onEmojiClick={handleEmojiClick} />
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  disabled={saving || !tagName.trim() || !tagCategoryId}
                >
                  {saving ? 'Creating...' : 'Create Tag'}
                </button>
              </form>

              {/* Tags List */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Existing Tags</h3>
                {tags.length === 0 ? (
                  <p className="text-sm text-gray-500">No tags yet. Create one above!</p>
                ) : (
                  <div className="space-y-2">
                    {categories.map((category) => {
                      const categoryTags = tags.filter(t => t.categoryId === category.id);
                      if (categoryTags.length === 0) return null;

                      return (
                        <div key={category.id} className="space-y-2">
                          <div
                            className="text-xs font-semibold uppercase tracking-wide"
                            style={{ color: category.color }}
                          >
                            {category.name}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {categoryTags.map((tag) => (
                              <div
                                key={tag.id}
                                className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-lg"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">{tag.emoji}</span>
                                  <span className="text-sm font-medium">{tag.name}</span>
                                </div>
                                <button
                                  onClick={() => handleDeleteTag(tag.id)}
                                  className="text-red-400 hover:text-red-600 text-sm"
                                  disabled={saving}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'categories' && (
            <>
              {/* Create Category Form */}
              <form onSubmit={handleCreateCategory} className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900">Create New Category</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="e.g., Health"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {predefinedColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCategoryColor(color)}
                        className={clsx(
                          'w-8 h-8 rounded-full transition-all',
                          categoryColor === color && 'ring-2 ring-gray-900 ring-offset-2'
                        )}
                        style={{ backgroundColor: color }}
                        disabled={saving}
                      />
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  disabled={saving || !categoryName.trim()}
                >
                  {saving ? 'Creating...' : 'Create Category'}
                </button>
              </form>

              {/* Categories List */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Existing Categories</h3>
                {categories.length === 0 ? (
                  <p className="text-sm text-gray-500">No categories yet. Create one above!</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {categories.map((category) => {
                      const categoryTags = tags.filter(t => t.categoryId === category.id);
                      return (
                        <div
                          key={category.id}
                          className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            <div>
                              <div className="font-medium">{category.name}</div>
                              <div className="text-xs text-gray-500">
                                {categoryTags.length} tag{categoryTags.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="text-red-400 hover:text-red-600"
                            disabled={saving}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
