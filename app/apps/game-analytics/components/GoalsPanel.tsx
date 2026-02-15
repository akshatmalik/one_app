'use client';

import { useState, useMemo } from 'react';
import { Target, Trophy, Plus, Trash2, Edit3, Check, Clock, ChevronDown, ChevronUp, X, Gamepad2, DollarSign, Flame, Layers, Sparkles } from 'lucide-react';
import { Game, GamingGoal, GoalType, GoalStatus } from '../lib/types';
import { getTotalHours, parseLocalDate } from '../lib/calculations';
import { useGoals } from '../hooks/useGoals';
import { useAuthContext } from '@/lib/AuthContext';
import clsx from 'clsx';

const GOAL_TYPE_CONFIG: Record<GoalType, { label: string; icon: React.ReactNode; defaultUnit: string; color: string }> = {
  completion: { label: 'Complete Games', icon: <Trophy size={14} />, defaultUnit: 'games', color: 'emerald' },
  spending: { label: 'Spending Limit', icon: <DollarSign size={14} />, defaultUnit: 'dollars', color: 'red' },
  hours: { label: 'Hours Target', icon: <Clock size={14} />, defaultUnit: 'hours', color: 'blue' },
  genre_variety: { label: 'Genre Variety', icon: <Layers size={14} />, defaultUnit: 'genres', color: 'purple' },
  backlog: { label: 'Clear Backlog', icon: <Flame size={14} />, defaultUnit: 'games', color: 'yellow' },
  custom: { label: 'Custom Goal', icon: <Sparkles size={14} />, defaultUnit: '', color: 'cyan' },
};

function calculateGoalProgress(goal: GamingGoal, games: Game[]): number {
  const start = parseLocalDate(goal.startDate);
  const now = new Date();

  // Filter games relevant to the goal period
  const gamesInPeriod = (filterFn: (g: Game) => boolean) =>
    games.filter(g => filterFn(g));

  switch (goal.type) {
    case 'completion': {
      // Count games completed since startDate
      return gamesInPeriod(g => {
        if (g.status !== 'Completed' || !g.endDate) return false;
        const endDate = parseLocalDate(g.endDate);
        return endDate >= start && endDate <= now;
      }).length;
    }
    case 'spending': {
      // Total price of games purchased since startDate
      return gamesInPeriod(g => {
        if (g.status === 'Wishlist' || !g.datePurchased) return false;
        const purchaseDate = parseLocalDate(g.datePurchased);
        return purchaseDate >= start && purchaseDate <= now;
      }).reduce((sum, g) => sum + g.price, 0);
    }
    case 'hours': {
      // Total hours logged since startDate
      return games.reduce((total, g) => {
        const logHours = (g.playLogs || [])
          .filter(log => {
            const logDate = parseLocalDate(log.date);
            return logDate >= start && logDate <= now;
          })
          .reduce((sum, log) => sum + log.hours, 0);
        return total + logHours;
      }, 0);
    }
    case 'genre_variety': {
      // Count unique genres played since startDate
      const genres = new Set<string>();
      games.forEach(g => {
        if (!g.genre) return;
        const hasRecentActivity = (g.playLogs || []).some(log => {
          const logDate = parseLocalDate(log.date);
          return logDate >= start && logDate <= now;
        });
        if (hasRecentActivity) {
          genres.add(g.genre);
        }
      });
      return genres.size;
    }
    case 'backlog': {
      // Count of Not Started games (should decrease, so we invert the logic)
      // Target represents how many to clear; current = games started or completed since startDate that were previously Not Started
      return gamesInPeriod(g => {
        if (!g.startDate) return false;
        const startedDate = parseLocalDate(g.startDate);
        return startedDate >= start && startedDate <= now;
      }).length;
    }
    case 'custom':
    default:
      // Custom goals use manual currentValue
      return goal.currentValue;
  }
}

function getDaysRemaining(endDate: string): number {
  const end = parseLocalDate(endDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getGoalColorClasses(color: string) {
  const map: Record<string, { bg: string; border: string; text: string; progressBg: string; progressBar: string }> = {
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', progressBg: 'bg-emerald-500/10', progressBar: 'bg-emerald-500' },
    red: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', progressBg: 'bg-red-500/10', progressBar: 'bg-red-500' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', progressBg: 'bg-blue-500/10', progressBar: 'bg-blue-500' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', progressBg: 'bg-purple-500/10', progressBar: 'bg-purple-500' },
    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400', progressBg: 'bg-yellow-500/10', progressBar: 'bg-yellow-500' },
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', progressBg: 'bg-cyan-500/10', progressBar: 'bg-cyan-500' },
  };
  return map[color] || map.cyan;
}

export function GoalsPanel({ games }: { games: Game[] }) {
  const { user } = useAuthContext();
  const { goals, loading, addGoal, updateGoal, deleteGoal } = useGoals(user?.uid ?? null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<GoalType>('completion');
  const [formTarget, setFormTarget] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formStartDate, setFormStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [formEndDate, setFormEndDate] = useState(() => {
    const now = new Date();
    now.setMonth(now.getMonth() + 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [formCurrentValue, setFormCurrentValue] = useState('');

  const activeGoals = useMemo(() => goals.filter(g => g.status === 'active'), [goals]);
  const historyGoals = useMemo(() => goals.filter(g => g.status !== 'active'), [goals]);

  // Auto-calculate progress for active goals
  const goalsWithProgress = useMemo(() => {
    return activeGoals.map(goal => {
      const currentValue = calculateGoalProgress(goal, games);
      const percent = goal.targetValue > 0 ? Math.min((currentValue / goal.targetValue) * 100, 100) : 0;
      const daysRemaining = getDaysRemaining(goal.endDate);
      return { ...goal, calculatedValue: currentValue, percent, daysRemaining };
    });
  }, [activeGoals, games]);

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormType('completion');
    setFormTarget('');
    setFormUnit('');
    setFormCurrentValue('');
    const now = new Date();
    setFormStartDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    setFormEndDate(`${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`);
    setEditingGoalId(null);
  };

  const handleSubmit = async () => {
    if (!formTitle.trim() || !formTarget) return;

    const target = parseFloat(formTarget);
    if (isNaN(target) || target <= 0) return;

    const unit = formUnit || GOAL_TYPE_CONFIG[formType].defaultUnit;
    const currentValue = formType === 'custom' ? parseFloat(formCurrentValue) || 0 : 0;

    if (editingGoalId) {
      await updateGoal(editingGoalId, {
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        type: formType,
        targetValue: target,
        currentValue,
        unit,
        startDate: formStartDate,
        endDate: formEndDate,
      });
    } else {
      await addGoal({
        userId: user?.uid || 'local-user',
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        type: formType,
        targetValue: target,
        currentValue,
        unit,
        startDate: formStartDate,
        endDate: formEndDate,
        status: 'active',
      });
    }

    resetForm();
    setShowAddForm(false);
  };

  const startEdit = (goal: GamingGoal) => {
    setFormTitle(goal.title);
    setFormDescription(goal.description || '');
    setFormType(goal.type);
    setFormTarget(goal.targetValue.toString());
    setFormUnit(goal.unit);
    setFormStartDate(goal.startDate);
    setFormEndDate(goal.endDate);
    setFormCurrentValue(goal.currentValue.toString());
    setEditingGoalId(goal.id);
    setShowAddForm(true);
  };

  const handleCompleteGoal = async (goalId: string) => {
    await updateGoal(goalId, { status: 'completed' });
  };

  const handleFailGoal = async (goalId: string) => {
    await updateGoal(goalId, { status: 'failed' });
  };

  const handleDeleteGoal = async (goalId: string) => {
    await deleteGoal(goalId);
  };

  // Update custom goal current value
  const handleUpdateCustomValue = async (goalId: string, value: number) => {
    await updateGoal(goalId, { currentValue: value });
  };

  if (loading) {
    return (
      <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Target size={18} className="text-cyan-400" />
          <h2 className="text-base font-semibold text-white">Gaming Goals</h2>
        </div>
        <div className="text-center py-8">
          <div className="text-white/30 text-sm">Loading goals...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-cyan-400" />
          <h2 className="text-base font-semibold text-white">Gaming Goals</h2>
          {activeGoals.length > 0 && (
            <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
              {activeGoals.length} active
            </span>
          )}
        </div>
        {!showAddForm && (
          <button
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg text-xs font-medium transition-all"
          >
            <Plus size={14} />
            Add Goal
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="mb-5 p-4 bg-white/[0.03] border border-white/10 rounded-xl space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-medium text-white/70">
              {editingGoalId ? 'Edit Goal' : 'New Goal'}
            </h3>
            <button
              onClick={() => {
                resetForm();
                setShowAddForm(false);
              }}
              className="p-1 text-white/30 hover:text-white/60 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Title */}
          <input
            type="text"
            value={formTitle}
            onChange={e => setFormTitle(e.target.value)}
            placeholder="Goal title (e.g., Complete 5 games this month)"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:border-cyan-500/50 placeholder:text-white/20"
          />

          {/* Description */}
          <input
            type="text"
            value={formDescription}
            onChange={e => setFormDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:border-cyan-500/50 placeholder:text-white/20"
          />

          {/* Type Selector */}
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(GOAL_TYPE_CONFIG) as [GoalType, typeof GOAL_TYPE_CONFIG[GoalType]][]).map(([type, config]) => (
              <button
                key={type}
                onClick={() => {
                  setFormType(type);
                  setFormUnit(config.defaultUnit);
                }}
                className={clsx(
                  'flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all border',
                  formType === type
                    ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
                    : 'bg-white/[0.02] border-white/5 text-white/40 hover:text-white/60 hover:border-white/10'
                )}
              >
                {config.icon}
                <span className="truncate">{config.label}</span>
              </button>
            ))}
          </div>

          {/* Target & Unit */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1 block">Target</label>
              <input
                type="number"
                min="0"
                step="any"
                value={formTarget}
                onChange={e => setFormTarget(e.target.value)}
                placeholder="e.g., 5"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:border-cyan-500/50 placeholder:text-white/20"
              />
            </div>
            <div className="w-28">
              <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1 block">Unit</label>
              <input
                type="text"
                value={formUnit || GOAL_TYPE_CONFIG[formType].defaultUnit}
                onChange={e => setFormUnit(e.target.value)}
                placeholder="unit"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:border-cyan-500/50 placeholder:text-white/20"
              />
            </div>
          </div>

          {/* Custom goal manual value */}
          {formType === 'custom' && (
            <div>
              <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1 block">Current Progress</label>
              <input
                type="number"
                min="0"
                step="any"
                value={formCurrentValue}
                onChange={e => setFormCurrentValue(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:border-cyan-500/50 placeholder:text-white/20"
              />
            </div>
          )}

          {/* Dates */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1 block">Start Date</label>
              <input
                type="date"
                value={formStartDate}
                onChange={e => setFormStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:border-cyan-500/50 [color-scheme:dark]"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1 block">End Date</label>
              <input
                type="date"
                value={formEndDate}
                onChange={e => setFormEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:border-cyan-500/50 [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSubmit}
              disabled={!formTitle.trim() || !formTarget}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Check size={16} />
              {editingGoalId ? 'Save Changes' : 'Create Goal'}
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowAddForm(false);
              }}
              className="px-4 py-2.5 bg-white/5 text-white/40 hover:bg-white/10 rounded-lg text-sm transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Active Goals */}
      {goalsWithProgress.length > 0 ? (
        <div className="space-y-3">
          {goalsWithProgress.map(goal => {
            const typeConfig = GOAL_TYPE_CONFIG[goal.type];
            const colors = getGoalColorClasses(typeConfig.color);
            const isComplete = goal.calculatedValue >= goal.targetValue;
            const isOverdue = goal.daysRemaining < 0;
            const isSpending = goal.type === 'spending';
            // For spending goals, being under target is good (inverted logic)
            const spendingOk = isSpending && goal.calculatedValue <= goal.targetValue;

            return (
              <div
                key={goal.id}
                className={clsx(
                  'p-4 rounded-xl border transition-all',
                  isComplete && !isSpending ? 'bg-emerald-500/10 border-emerald-500/20' :
                  isComplete && isSpending ? 'bg-red-500/10 border-red-500/20' :
                  spendingOk ? 'bg-emerald-500/10 border-emerald-500/20' :
                  'bg-white/[0.03] border-white/5'
                )}
              >
                {/* Goal Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={colors.text}>{typeConfig.icon}</span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium text-white truncate">{goal.title}</h4>
                      {goal.description && (
                        <p className="text-xs text-white/30 truncate">{goal.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => startEdit(goal)}
                      className="p-1.5 text-white/20 hover:text-white/50 transition-colors"
                      title="Edit goal"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1.5 text-white/20 hover:text-red-400 transition-colors"
                      title="Delete goal"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-2">
                  <div className="flex items-end justify-between mb-1">
                    <span className="text-lg font-bold text-white">
                      {goal.type === 'spending' ? '$' : ''}{goal.calculatedValue.toFixed(goal.calculatedValue % 1 === 0 ? 0 : 1)}
                    </span>
                    <span className="text-xs text-white/30">
                      of {goal.type === 'spending' ? '$' : ''}{goal.targetValue} {goal.unit}
                    </span>
                  </div>
                  <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        'h-full rounded-full transition-all duration-500',
                        isComplete && !isSpending ? 'bg-emerald-500' :
                        isComplete && isSpending ? 'bg-red-500' :
                        spendingOk ? 'bg-emerald-500' :
                        colors.progressBar
                      )}
                      style={{ width: `${Math.min(goal.percent, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className={clsx(
                      'text-xs font-medium',
                      isComplete && !isSpending ? 'text-emerald-400' :
                      isComplete && isSpending ? 'text-red-400' :
                      spendingOk ? 'text-emerald-400' :
                      'text-white/40'
                    )}>
                      {goal.percent.toFixed(0)}%
                    </span>
                    <span className={clsx(
                      'text-xs flex items-center gap-1',
                      isOverdue ? 'text-red-400' : 'text-white/30'
                    )}>
                      <Clock size={10} />
                      {isOverdue
                        ? `${Math.abs(goal.daysRemaining)}d overdue`
                        : goal.daysRemaining === 0
                          ? 'Due today'
                          : `${goal.daysRemaining}d left`
                      }
                    </span>
                  </div>
                </div>

                {/* Custom goal: manual update */}
                {goal.type === 'custom' && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                    <span className="text-xs text-white/30">Update progress:</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      defaultValue={goal.currentValue}
                      onBlur={e => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val !== goal.currentValue) {
                          handleUpdateCustomValue(goal.id, val);
                        }
                      }}
                      className="w-20 px-2 py-1 bg-white/5 border border-white/10 text-white rounded text-xs focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                )}

                {/* Action buttons */}
                {(isComplete && !isSpending) && (
                  <button
                    onClick={() => handleCompleteGoal(goal.id)}
                    className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg text-xs font-medium transition-all"
                  >
                    <Trophy size={14} />
                    Complete Goal
                  </button>
                )}
                {isOverdue && !isComplete && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleFailGoal(goal.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-medium transition-all"
                    >
                      Mark Failed
                    </button>
                    <button
                      onClick={() => startEdit(goal)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-white/5 text-white/40 hover:bg-white/10 rounded-lg text-xs font-medium transition-all"
                    >
                      Extend Deadline
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : !showAddForm ? (
        <div className="text-center py-8">
          <Target size={32} className="mx-auto mb-3 text-white/10" />
          <p className="text-white/30 text-sm">No active goals</p>
          <p className="text-white/20 text-xs mt-1">Set a goal to track your gaming progress</p>
        </div>
      ) : null}

      {/* Goal History */}
      {historyGoals.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between px-1 py-1.5 text-white/40 hover:text-white/60 transition-colors"
          >
            <span className="text-xs font-medium">Past Goals ({historyGoals.length})</span>
            {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showHistory && (
            <div className="mt-2 space-y-2">
              {historyGoals
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .map(goal => {
                  const typeConfig = GOAL_TYPE_CONFIG[goal.type];
                  const progress = calculateGoalProgress(goal, games);
                  const percent = goal.targetValue > 0 ? Math.min((progress / goal.targetValue) * 100, 100) : 0;

                  return (
                    <div key={goal.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-white/30">{typeConfig.icon}</span>
                          <span className="text-xs text-white/50 truncate">{goal.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={clsx(
                            'text-[10px] font-medium px-2 py-0.5 rounded',
                            goal.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : goal.status === 'failed'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-white/10 text-white/40'
                          )}>
                            {goal.status === 'completed' ? 'Completed' : goal.status === 'failed' ? 'Failed' : 'Archived'}
                          </span>
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="p-1 text-white/20 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-white/30">
                        <span>{progress.toFixed(goal.type === 'spending' ? 0 : 1)} / {goal.targetValue} {goal.unit}</span>
                        <span>({percent.toFixed(0)}%)</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
