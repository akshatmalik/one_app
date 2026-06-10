'use client';

import { useState, useMemo } from 'react';
import {
  Target, Trophy, Plus, Trash2, Edit3, Check, Clock,
  ChevronDown, ChevronUp, X, DollarSign, Flame,
  Layers, Sparkles,
} from 'lucide-react';
import { Game, GamingGoal, GoalType, GoalStatus } from '../lib/types';
import { parseLocalDate } from '../lib/calculations';
import { useGoals } from '../hooks/useGoals';
import { useAuthContext } from '@/lib/AuthContext';
import clsx from 'clsx';

// ── Type config ────────────────────────────────────────────────────────

interface TypeConfig {
  label: string;
  emoji: string;
  icon: React.ReactNode;
  defaultUnit: string;
  color: string;
  bg: string;
  border: string;
  hint: string;
  defaultTarget: number;
  placeholder: string;
}

const GOAL_TYPE_CONFIG: Record<GoalType, TypeConfig> = {
  completion: {
    label: 'Complete Games',
    emoji: '🎯',
    icon: <Trophy size={13} />,
    defaultUnit: 'games',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    hint: 'Finish X games',
    defaultTarget: 5,
    placeholder: '5',
  },
  spending: {
    label: 'Budget Limit',
    emoji: '💰',
    icon: <DollarSign size={13} />,
    defaultUnit: '$',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    hint: 'Stay under $X',
    defaultTarget: 150,
    placeholder: '150',
  },
  hours: {
    label: 'Play Hours',
    emoji: '⏱️',
    icon: <Clock size={13} />,
    defaultUnit: 'hours',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    hint: 'Log X hours',
    defaultTarget: 50,
    placeholder: '50',
  },
  genre_variety: {
    label: 'Genre Explorer',
    emoji: '🌍',
    icon: <Layers size={13} />,
    defaultUnit: 'genres',
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/30',
    hint: 'Play X genres',
    defaultTarget: 4,
    placeholder: '4',
  },
  backlog: {
    label: 'Backlog Buster',
    emoji: '📦',
    icon: <Flame size={13} />,
    defaultUnit: 'games',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    hint: 'Start X unplayed games',
    defaultTarget: 5,
    placeholder: '5',
  },
  custom: {
    label: 'Custom Goal',
    emoji: '✏️',
    icon: <Sparkles size={13} />,
    defaultUnit: '',
    color: 'text-white/50',
    bg: 'bg-white/5',
    border: 'border-white/10',
    hint: 'Track anything',
    defaultTarget: 1,
    placeholder: '1',
  },
};

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; bar: string }> = {
  violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', bar: 'bg-violet-500' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', bar: 'bg-emerald-500' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', bar: 'bg-blue-500' },
  teal: { bg: 'bg-teal-500/10', border: 'border-teal-500/20', text: 'text-teal-400', bar: 'bg-teal-500' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', bar: 'bg-orange-500' },
  gray: { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400', bar: 'bg-gray-500' },
  red: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', bar: 'bg-red-500' },
};

const TYPE_COLOR: Record<GoalType, string> = {
  completion: 'violet',
  spending: 'emerald',
  hours: 'blue',
  genre_variety: 'teal',
  backlog: 'orange',
  custom: 'gray',
};

// ── Date preset helpers ────────────────────────────────────────────────

type DatePreset = 'week' | 'month' | 'quarter' | 'year';

function getPresetRange(preset: DatePreset): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  if (preset === 'week') {
    const dow = now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((dow + 6) % 7));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { start: fmt(mon), end: fmt(sun) };
  }
  if (preset === 'month') {
    return { start: `${y}-${String(m + 1).padStart(2, '0')}-01`, end: fmt(new Date(y, m + 1, 0)) };
  }
  if (preset === 'quarter') {
    const q = Math.floor(m / 3);
    return { start: fmt(new Date(y, q * 3, 1)), end: fmt(new Date(y, q * 3 + 3, 0)) };
  }
  return { start: `${y}-01-01`, end: `${y}-12-31` };
}

const DATE_PRESETS: { label: string; value: DatePreset }[] = [
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Quarter', value: 'quarter' },
  { label: 'This Year', value: 'year' },
];

// ── Auto-title generation ──────────────────────────────────────────────

function autoTitle(type: GoalType, target: number): string {
  switch (type) {
    case 'completion': return `Complete ${target} game${target === 1 ? '' : 's'}`;
    case 'spending': return `Stay under $${target}`;
    case 'hours': return `Play ${target} hours`;
    case 'genre_variety': return `Explore ${target} genre${target === 1 ? '' : 's'}`;
    case 'backlog': return `Start ${target} unplayed game${target === 1 ? '' : 's'}`;
    case 'custom': return 'My custom goal';
  }
}

// ── Progress calculation ───────────────────────────────────────────────

function calculateGoalProgress(goal: GamingGoal, games: Game[]): number {
  const start = parseLocalDate(goal.startDate);
  const now = new Date();

  switch (goal.type) {
    case 'completion':
      return games.filter(g => {
        if (g.status !== 'Completed' || !g.endDate) return false;
        const d = parseLocalDate(g.endDate);
        return d >= start && d <= now;
      }).length;

    case 'spending':
      return games
        .filter(g => {
          if (g.status === 'Wishlist' || !g.datePurchased) return false;
          const d = parseLocalDate(g.datePurchased);
          return d >= start && d <= now;
        })
        .reduce((s, g) => s + g.price, 0);

    case 'hours':
      return games.reduce((total, g) => {
        const h = (g.playLogs || [])
          .filter(l => {
            const d = parseLocalDate(l.date);
            return d >= start && d <= now;
          })
          .reduce((s, l) => s + l.hours, 0);
        return total + h;
      }, 0);

    case 'genre_variety': {
      const genres = new Set<string>();
      games.forEach(g => {
        if (!g.genre) return;
        const active = (g.playLogs || []).some(l => {
          const d = parseLocalDate(l.date);
          return d >= start && d <= now;
        });
        if (active) genres.add(g.genre);
      });
      return genres.size;
    }

    case 'backlog':
      return games.filter(g => {
        if (!g.startDate) return false;
        const d = parseLocalDate(g.startDate);
        return d >= start && d <= now;
      }).length;

    case 'custom':
    default:
      return goal.currentValue;
  }
}

function getDaysRemaining(endDate: string): number {
  const end = parseLocalDate(endDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Main component ─────────────────────────────────────────────────────

export function GoalsPanel({ games }: { games: Game[] }) {
  const { user } = useAuthContext();
  const { goals, loading, addGoal, updateGoal, deleteGoal } = useGoals(user?.uid ?? null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formTitleTouched, setFormTitleTouched] = useState(false);
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<GoalType>('completion');
  const [formTarget, setFormTarget] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formCurrentValue, setFormCurrentValue] = useState('');
  const [activePreset, setActivePreset] = useState<DatePreset | null>(null);

  const activeGoals = useMemo(() => goals.filter(g => g.status === 'active'), [goals]);
  const historyGoals = useMemo(() => goals.filter(g => g.status !== 'active'), [goals]);

  const goalsWithProgress = useMemo(() => {
    return activeGoals.map(goal => {
      const currentValue = calculateGoalProgress(goal, games);
      const percent = goal.targetValue > 0
        ? Math.min((currentValue / goal.targetValue) * 100, 100)
        : 0;
      const daysRemaining = getDaysRemaining(goal.endDate);
      return { ...goal, calculatedValue: currentValue, percent, daysRemaining };
    });
  }, [activeGoals, games]);

  // ── Form helpers ──

  function applyPreset(preset: DatePreset) {
    const { start, end } = getPresetRange(preset);
    setFormStartDate(start);
    setFormEndDate(end);
    setActivePreset(preset);
  }

  function handleTypeChange(type: GoalType) {
    setFormType(type);
    setFormUnit(GOAL_TYPE_CONFIG[type].defaultUnit);
    if (!formTitleTouched) {
      const target = parseFloat(formTarget) || GOAL_TYPE_CONFIG[type].defaultTarget;
      setFormTitle(autoTitle(type, target));
    }
  }

  function handleTargetChange(val: string) {
    setFormTarget(val);
    if (!formTitleTouched) {
      const num = parseFloat(val) || GOAL_TYPE_CONFIG[formType].defaultTarget;
      setFormTitle(autoTitle(formType, num));
    }
  }

  function resetForm() {
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    setFormTitle(autoTitle('completion', 5));
    setFormTitleTouched(false);
    setFormDescription('');
    setFormType('completion');
    setFormTarget('');
    setFormUnit(GOAL_TYPE_CONFIG['completion'].defaultUnit);
    setFormCurrentValue('');
    setFormStartDate(today);
    setFormEndDate(nextMonth.toISOString().split('T')[0]);
    setEditingGoalId(null);
    setActivePreset(null);
  }

  function openAddForm() {
    resetForm();
    // Default to "this month" preset
    applyPreset('month');
    setFormTitle(autoTitle('completion', 5));
    setShowAddForm(true);
  }

  function startEdit(goal: GamingGoal) {
    setFormTitle(goal.title);
    setFormTitleTouched(true);
    setFormDescription(goal.description || '');
    setFormType(goal.type);
    setFormTarget(goal.targetValue.toString());
    setFormUnit(goal.unit);
    setFormStartDate(goal.startDate);
    setFormEndDate(goal.endDate);
    setFormCurrentValue(goal.currentValue.toString());
    setEditingGoalId(goal.id);
    setActivePreset(null);
    setShowAddForm(true);
  }

  async function handleSubmit() {
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

    setShowAddForm(false);
    resetForm();
  }

  async function handleCompleteGoal(id: string) {
    await updateGoal(id, { status: 'completed' });
  }

  async function handleFailGoal(id: string) {
    await updateGoal(id, { status: 'failed' });
  }

  async function handleDeleteGoal(id: string) {
    await deleteGoal(id);
  }

  async function handleUpdateCustomValue(id: string, value: number) {
    await updateGoal(id, { currentValue: value });
  }

  if (loading) {
    return (
      <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Target size={18} className="text-violet-400" />
          <h2 className="text-base font-semibold text-white">Goals & Challenges</h2>
        </div>
        <div className="text-center py-6 text-white/30 text-sm">Loading goals…</div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 rounded-2xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-violet-400" />
          <h2 className="text-base font-semibold text-white">Goals & Challenges</h2>
          {activeGoals.length > 0 && (
            <span className="text-[10px] font-semibold bg-violet-500/15 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full">
              {activeGoals.length}
            </span>
          )}
        </div>
        {!showAddForm && (
          <button
            onClick={openAddForm}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-medium transition-colors"
          >
            <Plus size={13} />
            New Goal
          </button>
        )}
      </div>

      {/* ── Add / Edit Form ── */}
      {showAddForm && (
        <div className="mb-5 p-4 bg-white/[0.03] border border-white/10 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white/70">
              {editingGoalId ? 'Edit Goal' : 'New Goal'}
            </h3>
            <button
              onClick={() => { setShowAddForm(false); resetForm(); }}
              className="p-1 text-white/30 hover:text-white/60 transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Goal type grid */}
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Goal Type</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(GOAL_TYPE_CONFIG) as [GoalType, TypeConfig][]).map(([type, cfg]) => (
                <button
                  key={type}
                  onClick={() => handleTypeChange(type)}
                  className={clsx(
                    'flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-center transition-all',
                    formType === type
                      ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                      : 'bg-white/[0.02] border-white/5 text-white/30 hover:text-white/60 hover:border-white/15'
                  )}
                >
                  <span className="text-base leading-none">{cfg.emoji}</span>
                  <span className="text-[10px] font-medium leading-tight">{cfg.label}</span>
                  <span className="text-[9px] text-white/25 leading-tight">{cfg.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Target */}
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">
              {formType === 'spending' ? 'Budget Limit' : formType === 'backlog' ? 'Games to Start' : 'Target'}
            </p>
            <div className="flex items-center gap-2">
              {formType === 'spending' && <span className="text-white/50 text-sm font-medium">$</span>}
              <input
                type="number"
                min="1"
                value={formTarget}
                onChange={e => handleTargetChange(e.target.value)}
                placeholder={GOAL_TYPE_CONFIG[formType].placeholder}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-white/20"
              />
              {formType !== 'spending' && (
                <span className="text-white/30 text-sm shrink-0">
                  {GOAL_TYPE_CONFIG[formType].defaultUnit}
                </span>
              )}
            </div>
          </div>

          {/* Date range + quick presets */}
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Time Period</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {DATE_PRESETS.map(p => (
                <button
                  key={p.value}
                  onClick={() => applyPreset(p.value)}
                  className={clsx(
                    'px-2.5 py-1 rounded-lg text-xs border transition-all',
                    activePreset === p.value
                      ? 'bg-violet-500/20 border-violet-500/40 text-violet-300 font-medium'
                      : 'bg-white/[0.03] border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-white/25 block mb-1">Start</label>
                <input
                  type="date"
                  value={formStartDate}
                  onChange={e => { setFormStartDate(e.target.value); setActivePreset(null); }}
                  className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 text-white rounded-lg text-xs focus:outline-none focus:border-violet-500/50 [color-scheme:dark]"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-white/25 block mb-1">End</label>
                <input
                  type="date"
                  value={formEndDate}
                  onChange={e => { setFormEndDate(e.target.value); setActivePreset(null); }}
                  className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 text-white rounded-lg text-xs focus:outline-none focus:border-violet-500/50 [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* Custom goal current value */}
          {formType === 'custom' && (
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Current Progress</p>
              <input
                type="number"
                min="0"
                step="any"
                value={formCurrentValue}
                onChange={e => setFormCurrentValue(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-white/20"
              />
            </div>
          )}

          {/* Title */}
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Title</p>
            <input
              type="text"
              value={formTitle}
              onChange={e => { setFormTitle(e.target.value); setFormTitleTouched(true); }}
              placeholder="Goal title"
              maxLength={80}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-white/20"
            />
          </div>

          {/* Description */}
          <div>
            <input
              type="text"
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-white/20"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSubmit}
              disabled={!formTitle.trim() || !formTarget}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Check size={15} />
              {editingGoalId ? 'Save Changes' : 'Create Goal'}
            </button>
            <button
              onClick={() => { setShowAddForm(false); resetForm(); }}
              className="px-4 py-2.5 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60 rounded-xl text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Active Goals ── */}
      {goalsWithProgress.length > 0 ? (
        <div className="space-y-3">
          {goalsWithProgress.map(goal => {
            const cfg = GOAL_TYPE_CONFIG[goal.type];
            const colorKey = TYPE_COLOR[goal.type];
            const colors = COLOR_MAP[colorKey] ?? COLOR_MAP.gray;
            const isComplete = goal.calculatedValue >= goal.targetValue;
            const isOverdue = goal.daysRemaining < 0;
            const isSpending = goal.type === 'spending';
            const spendingOver = isSpending && goal.calculatedValue > goal.targetValue;

            // Progress bar color logic
            const barBg = isComplete && !isSpending
              ? 'bg-emerald-500'
              : spendingOver
              ? 'bg-red-500'
              : isSpending && goal.percent >= 80
              ? 'bg-yellow-500'
              : colors.bar;

            // Card border/bg logic
            const cardClass = isComplete && !isSpending
              ? 'bg-emerald-500/5 border-emerald-500/15'
              : spendingOver
              ? 'bg-red-500/5 border-red-500/15'
              : 'bg-white/[0.02] border-white/5';

            return (
              <div key={goal.id} className={clsx('p-4 rounded-xl border transition-all', cardClass)}>

                {/* Goal header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="text-xl leading-none shrink-0">{cfg.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white/90 truncate">{goal.title}</p>
                      {goal.description && (
                        <p className="text-xs text-white/35 truncate mt-0.5">{goal.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center shrink-0 ml-2">
                    <button
                      onClick={() => startEdit(goal)}
                      className="p-1.5 text-white/20 hover:text-white/50 transition-colors"
                      title="Edit"
                    >
                      <Edit3 size={11} />
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1.5 text-white/20 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-2">
                  <div className="flex items-end justify-between mb-1.5">
                    <span className="text-lg font-bold text-white tabular-nums">
                      {isSpending ? '$' : ''}
                      {goal.type === 'hours'
                        ? goal.calculatedValue.toFixed(1)
                        : isSpending
                        ? goal.calculatedValue.toFixed(0)
                        : goal.calculatedValue}
                    </span>
                    <span className="text-xs text-white/30">
                      / {isSpending ? '$' : ''}{goal.targetValue} {isSpending ? '' : goal.unit}
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full transition-all duration-700', barBg)}
                      style={{ width: `${Math.min(goal.percent, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className={clsx(
                      'text-xs font-medium',
                      isComplete && !isSpending ? 'text-emerald-400' :
                      spendingOver ? 'text-red-400' :
                      'text-white/40'
                    )}>
                      {goal.percent.toFixed(0)}%
                    </span>
                    <span className={clsx(
                      'text-xs flex items-center gap-1',
                      isOverdue ? 'text-red-400' : goal.daysRemaining <= 3 ? 'text-yellow-400' : 'text-white/30'
                    )}>
                      <Clock size={10} />
                      {isOverdue
                        ? `${Math.abs(goal.daysRemaining)}d overdue`
                        : goal.daysRemaining === 0
                        ? 'Due today'
                        : `${goal.daysRemaining}d left`}
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
                      className="w-20 px-2 py-1 bg-white/5 border border-white/10 text-white rounded text-xs focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                )}

                {/* Action buttons */}
                {isComplete && !isSpending && (
                  <button
                    onClick={() => handleCompleteGoal(goal.id)}
                    className="w-full mt-3 flex items-center justify-center gap-2 py-2 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Trophy size={13} />
                    Archive as Completed
                  </button>
                )}
                {isOverdue && !isComplete && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleFailGoal(goal.id)}
                      className="flex-1 py-2 bg-white/5 text-white/30 hover:bg-red-500/10 hover:text-red-400 rounded-xl text-xs font-medium transition-colors"
                    >
                      Mark Failed
                    </button>
                    <button
                      onClick={() => startEdit(goal)}
                      className="flex-1 py-2 bg-white/5 text-white/40 hover:bg-white/10 rounded-xl text-xs font-medium transition-colors"
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
        <div className="text-center py-10">
          <div className="text-5xl mb-3">🎯</div>
          <p className="text-sm font-medium text-white/50 mb-1">No active goals</p>
          <p className="text-xs text-white/25 mb-4">
            Set a goal to stay motivated and track your gaming progress.
          </p>
          <button
            onClick={openAddForm}
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={14} />
            Create your first goal
          </button>
        </div>
      ) : null}

      {/* ── History ── */}
      {historyGoals.length > 0 && (
        <div className="mt-5 pt-4 border-t border-white/5">
          <button
            onClick={() => setShowHistory(v => !v)}
            className="w-full flex items-center justify-between text-white/30 hover:text-white/50 transition-colors"
          >
            <span className="text-xs font-medium">
              Past Goals ({historyGoals.length})
            </span>
            {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showHistory && (
            <div className="mt-3 space-y-2">
              {historyGoals
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .map(goal => {
                  const cfg = GOAL_TYPE_CONFIG[goal.type];
                  const progress = calculateGoalProgress(goal, games);
                  const pct = goal.targetValue > 0
                    ? Math.min((progress / goal.targetValue) * 100, 100)
                    : 0;

                  return (
                    <div key={goal.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-base">{cfg.emoji}</span>
                          <span className="text-xs text-white/50 truncate">{goal.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={clsx(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                            goal.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : goal.status === 'failed'
                              ? 'bg-red-500/15 text-red-400'
                              : 'bg-white/10 text-white/40'
                          )}>
                            {goal.status === 'completed' ? '✓ Done' : goal.status === 'failed' ? '✗ Failed' : 'Archived'}
                          </span>
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="p-1 text-white/15 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-white/25 mt-1">
                        {goal.type === 'spending' ? '$' : ''}{progress.toFixed(goal.type === 'hours' ? 1 : 0)} / {goal.targetValue} {goal.unit} ({pct.toFixed(0)}%)
                      </p>
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
