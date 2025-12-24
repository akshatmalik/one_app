'use client';

import { getCurrentYear } from '../lib/calculations';

interface YearFilterProps {
  selectedYear: number | 'all';
  availableYears: number[];
  onYearChange: (year: number | 'all') => void;
}

export function YearFilter({ selectedYear, availableYears, onYearChange }: YearFilterProps) {
  const currentYear = getCurrentYear();

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onYearChange('all')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          selectedYear === 'all'
            ? 'bg-purple-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        All Time
      </button>

      {availableYears.map(year => (
        <button
          key={year}
          onClick={() => onYearChange(year)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedYear === year
              ? 'bg-purple-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          } ${year === currentYear ? 'ring-2 ring-purple-300' : ''}`}
        >
          {year}
          {year === currentYear && (
            <span className="ml-1 text-xs">📅</span>
          )}
        </button>
      ))}
    </div>
  );
}
