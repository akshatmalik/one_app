import { Category } from '../lib/types';
import clsx from 'clsx';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  className?: string;
}

export function CategoryFilter({
  categories,
  selectedCategoryId,
  onSelectCategory,
  className,
}: CategoryFilterProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <div className={clsx('flex flex-wrap gap-2', className)}>
      <button
        onClick={() => onSelectCategory(null)}
        className={clsx(
          'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
          selectedCategoryId === null
            ? 'bg-purple-600 text-white'
            : 'bg-white/[0.02] border border-white/10 text-white/60 hover:text-white/80 hover:bg-white/[0.04]'
        )}
      >
        All Tags
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={clsx(
            'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
            selectedCategoryId === category.id
              ? 'text-white shadow-md'
              : 'bg-white/[0.02] border border-white/10 text-white/60 hover:text-white/80 hover:bg-white/[0.04]'
          )}
          style={{
            backgroundColor:
              selectedCategoryId === category.id ? category.color : undefined,
          }}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
