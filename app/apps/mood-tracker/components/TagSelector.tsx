import { Tag, Category } from '../lib/types';
import clsx from 'clsx';

interface TagSelectorProps {
  tags: Tag[];
  categories: Category[];
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
  className?: string;
}

export function TagSelector({
  tags,
  categories,
  selectedTagIds,
  onToggleTag,
  className,
}: TagSelectorProps) {
  if (tags.length === 0) {
    return (
      <div className={clsx('text-sm text-white/40', className)}>
        No tags available. Create tags in the tag manager first.
      </div>
    );
  }

  return (
    <div className={clsx('space-y-4', className)}>
      <label className="block text-sm font-medium text-white/70">
        Tags
      </label>
      <div className="space-y-3">
        {categories.map((category) => {
          const categoryTags = tags.filter(tag => tag.categoryId === category.id);
          if (categoryTags.length === 0) return null;

          return (
            <div key={category.id} className="space-y-2">
              <div
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: category.color }}
              >
                {category.name}
              </div>
              <div className="flex flex-wrap gap-2">
                {categoryTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => onToggleTag(tag.id)}
                    className={clsx(
                      'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                      'border-2 hover:scale-105',
                      selectedTagIds.includes(tag.id)
                        ? 'border-white/20 shadow-md scale-105'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    )}
                    style={{
                      backgroundColor: selectedTagIds.includes(tag.id)
                        ? category.color
                        : undefined,
                      color: selectedTagIds.includes(tag.id) ? '#ffffff' : undefined,
                    }}
                  >
                    <span className="mr-1">{tag.emoji}</span>
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
