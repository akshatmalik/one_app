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
            ? 'bg-gray-900 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
