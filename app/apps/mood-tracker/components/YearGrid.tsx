'use client';

import { DayData, ViewMode, Tag, Category } from '../lib/types';
import { getYearDays, organizeDaysIntoGrid, getMonthName } from '../lib/utils';
import { DayBlock } from './DayBlock';
import { BLOCK_SIZE } from '../lib/constants';
import { useMemo } from 'react';

interface YearGridProps {
  year: number;
  startDate: string;
  dayDataMap: Map<number, DayData>;
  viewMode: ViewMode;
  selectedCategoryId: string | null;
  tags: Tag[];
  categories: Category[];
  onDayClick: (dayData: DayData) => void;
}

export function YearGrid({
  year,
  startDate,
  dayDataMap,
  viewMode,
  selectedCategoryId,
  tags,
  categories,
  onDayClick,
}: YearGridProps) {
  const yearDays = useMemo(() => getYearDays(year, startDate), [year, startDate]);
  const grid = useMemo(() => organizeDaysIntoGrid(yearDays), [yearDays]);

  // Get month labels for the grid
  const monthLabels = useMemo(() => {
    const labels: Array<{ month: string; weekIndex: number }> = [];
    let currentMonth = -1;

    grid.forEach((week, weekIndex) => {
      const firstDay = week.find(d => d !== null);
      if (firstDay && firstDay.month !== currentMonth) {
        labels.push({
          month: getMonthName(firstDay.month),
          weekIndex,
        });
        currentMonth = firstDay.month;
      }
    });

    return labels;
  }, [grid]);

  // Filter tags by selected category
  const filteredTags = useMemo(() => {
    if (!selectedCategoryId) return [];
    return tags.filter(tag => tag.categoryId === selectedCategoryId);
  }, [tags, selectedCategoryId]);

  if (yearDays.length === 0) {
    return (
      <div className="text-center text-white/40 py-8">
        No days to display for year {year}
      </div>
    );
  }

  const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="overflow-x-auto pb-4">
      <div className="inline-block min-w-full">
        {/* Month labels */}
        <div className="flex ml-12 mb-2 relative" style={{ height: '16px' }}>
          {monthLabels.map(({ month, weekIndex }) => (
            <div
              key={`${month}-${weekIndex}`}
              className="text-xs font-medium text-white/40 absolute"
              style={{
                left: `${weekIndex * (BLOCK_SIZE + 2)}px`,
              }}
            >
              {month}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex">
          {/* Weekday labels */}
          <div className="flex flex-col gap-0.5 mr-2 justify-start pt-0.5">
            {weekdayLabels.map((day, index) => (
              <div
                key={day}
                className="text-xs font-medium text-white/40 flex items-center justify-end"
                style={{ height: `${BLOCK_SIZE}px` }}
              >
                {index % 2 === 1 ? day : ''}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="flex gap-0.5">
            {grid.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-0.5">
                {week.map((day, dayIndex) => {
                  if (!day) {
                    return (
                      <div
                        key={dayIndex}
                        style={{
                          width: `${BLOCK_SIZE}px`,
                          height: `${BLOCK_SIZE}px`,
                        }}
                      />
                    );
                  }

                  const dayData =
                    dayDataMap.get(day.dayNumber) ||
                    ({
                      dayNumber: day.dayNumber,
                      date: day.date,
                      mood: null,
                      tags: [],
                      diaryContent: '',
                      hasEntry: false,
                    } as DayData);

                  // Filter tags if in tag view and category is selected
                  const displayTags =
                    viewMode === 'tags' && filteredTags.length > 0
                      ? dayData.tags.filter(tag => filteredTags.some(ft => ft.id === tag.id))
                      : [];

                  return (
                    <DayBlock
                      key={day.dayNumber}
                      dayData={dayData}
                      viewMode={viewMode}
                      filteredTags={displayTags}
                      onClick={() => onDayClick(dayData)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
