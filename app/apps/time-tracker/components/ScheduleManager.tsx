'use client';

import { useState } from 'react';
import { SchedulePreset, TimeBlock, DayOfWeek, DAYS_OF_WEEK } from '../lib/types';
import { useSchedules } from '../hooks/useSchedules';
import { useCategories } from '../hooks/useCategories';
import { v4 as uuidv4 } from 'uuid';
import {
  calculateDuration,
  formatDuration,
  generateTimeOptions,
  hasTimeOverlap,
  sortTimeBlocks,
} from '../lib/utils';
import { Plus, Trash2, Edit2, Calendar, Save, X } from 'lucide-react';

export function ScheduleManager() {
  const { schedules, addSchedule, updateSchedule, deleteSchedule } = useSchedules();
  const { categories } = useCategories();

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    daysOfWeek: [] as DayOfWeek[],
    isActive: true,
  });

  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [newBlock, setNewBlock] = useState({
    activityName: '',
    categoryId: '',
    startTime: '09:00',
    endTime: '10:00',
  });

  const timeOptions = generateTimeOptions();

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setFormData({ name: '', daysOfWeek: [], isActive: true });
    setTimeBlocks([]);
  };

  const handleStartEdit = (schedule: SchedulePreset) => {
    setEditingId(schedule.id);
    setIsCreating(false);
    setFormData({
      name: schedule.name,
      daysOfWeek: schedule.daysOfWeek,
      isActive: schedule.isActive,
    });
    setTimeBlocks(schedule.timeBlocks);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({ name: '', daysOfWeek: [], isActive: true });
    setTimeBlocks([]);
  };

  const handleAddBlock = () => {
    if (!newBlock.activityName.trim()) return;

    const duration = calculateDuration(newBlock.startTime, newBlock.endTime);
    if (duration <= 0) {
      alert('End time must be after start time');
      return;
    }

    const block: TimeBlock = {
      id: uuidv4(),
      activityName: newBlock.activityName.trim(),
      categoryId: newBlock.categoryId || undefined,
      startTime: newBlock.startTime,
      endTime: newBlock.endTime,
      duration,
    };

    if (hasTimeOverlap(block, timeBlocks)) {
      alert('This time block overlaps with an existing block');
      return;
    }

    setTimeBlocks([...timeBlocks, block]);
    setNewBlock({
      activityName: '',
      categoryId: '',
      startTime: newBlock.endTime,
      endTime: newBlock.endTime === '23:45' ? '23:45' : timeOptions[timeOptions.indexOf(newBlock.endTime) + 1] || '23:45',
    });
  };

  const handleRemoveBlock = (id: string) => {
    setTimeBlocks(timeBlocks.filter(b => b.id !== id));
  };

  const handleToggleDay = (day: DayOfWeek) => {
    setFormData(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day],
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a schedule name');
      return;
    }

    if (formData.daysOfWeek.length === 0) {
      alert('Please select at least one day');
      return;
    }

    if (timeBlocks.length === 0) {
      alert('Please add at least one time block');
      return;
    }

    const data = {
      name: formData.name.trim(),
      daysOfWeek: formData.daysOfWeek,
      timeBlocks: sortTimeBlocks(timeBlocks),
      isActive: formData.isActive,
    };

    try {
      if (editingId) {
        await updateSchedule(editingId, data);
      } else {
        await addSchedule(data);
      }
      handleCancel();
    } catch (error) {
      alert('Error saving schedule: ' + (error as Error).message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Delete schedule "${name}"?`)) {
      try {
        await deleteSchedule(id);
      } catch (error) {
        alert('Error deleting schedule: ' + (error as Error).message);
      }
    }
  };

  const handleToggleActive = async (schedule: SchedulePreset) => {
    try {
      await updateSchedule(schedule.id, { isActive: !schedule.isActive });
    } catch (error) {
      alert('Error updating schedule: ' + (error as Error).message);
    }
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return 'No category';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  const getCategoryColor = (categoryId?: string) => {
    if (!categoryId) return '#E5E7EB';
    const category = categories.find(c => c.id === categoryId);
    return category?.color || '#E5E7EB';
  };

  if (isCreating || editingId) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingId ? 'Edit Schedule' : 'Create Schedule'}
          </h3>
          <button
            onClick={handleCancel}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schedule Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Workday, Weekend, Deep Work Day"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Days of Week *
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = formData.daysOfWeek.includes(day);
                return (
                  <button
                    key={day}
                    onClick={() => handleToggleDay(day)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Blocks *
            </label>

            {timeBlocks.length > 0 && (
              <div className="mb-4 space-y-2">
                {sortTimeBlocks(timeBlocks).map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
                  >
                    <div
                      className="w-1 h-10 rounded"
                      style={{ backgroundColor: getCategoryColor(block.categoryId) }}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{block.activityName}</div>
                      <div className="text-xs text-gray-500">{getCategoryName(block.categoryId)}</div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {block.startTime} - {block.endTime}
                    </div>
                    <div className="text-sm text-gray-500 min-w-[60px] text-right">
                      {formatDuration(block.duration)}
                    </div>
                    <button
                      onClick={() => handleRemoveBlock(block.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="text-sm text-gray-600 text-right">
                  Total: {formatDuration(timeBlocks.reduce((sum, b) => sum + b.duration, 0))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-12 gap-2">
              <input
                type="text"
                value={newBlock.activityName}
                onChange={(e) => setNewBlock({ ...newBlock, activityName: e.target.value })}
                placeholder="Activity name"
                className="col-span-4 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
              <select
                value={newBlock.categoryId}
                onChange={(e) => setNewBlock({ ...newBlock, categoryId: e.target.value })}
                className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <select
                value={newBlock.startTime}
                onChange={(e) => setNewBlock({ ...newBlock, startTime: e.target.value })}
                className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              >
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
              <select
                value={newBlock.endTime}
                onChange={(e) => setNewBlock({ ...newBlock, endTime: e.target.value })}
                className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              >
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddBlock}
                disabled={!newBlock.activityName.trim()}
                className="col-span-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              <Save className="w-5 h-5" />
              {editingId ? 'Update Schedule' : 'Create Schedule'}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Schedule Presets</h3>
        <button
          onClick={handleStartCreate}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          New Schedule
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-2">No schedule presets yet</p>
          <p className="text-sm text-gray-400">
            Create a schedule to plan your daily time blocks
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {schedules.map((schedule) => {
            const totalDuration = schedule.timeBlocks.reduce((sum, b) => sum + b.duration, 0);

            return (
              <div
                key={schedule.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{schedule.name}</h4>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          schedule.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {schedule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {schedule.daysOfWeek.map(d => d.slice(0, 3)).join(', ')} • {formatDuration(totalDuration)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleActive(schedule)}
                      className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                      title={schedule.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStartEdit(schedule)}
                      className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(schedule.id, schedule.name)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  {sortTimeBlocks(schedule.timeBlocks).map((block) => (
                    <div
                      key={block.id}
                      className="flex items-center gap-2 text-sm bg-gray-50 rounded p-2"
                    >
                      <div
                        className="w-1 h-6 rounded"
                        style={{ backgroundColor: getCategoryColor(block.categoryId) }}
                      />
                      <div className="flex-1 font-medium text-gray-700">{block.activityName}</div>
                      <div className="text-gray-500">
                        {block.startTime} - {block.endTime}
                      </div>
                      <div className="text-gray-600 min-w-[50px] text-right">
                        {formatDuration(block.duration)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
