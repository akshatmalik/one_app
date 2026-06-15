'use client';

import { useState, useMemo } from 'react';
import {
  Target, Trophy, Plus, Trash2, Edit3, Check, Clock,
  X, Gamepad2, DollarSign, Flame, Layers, Sparkles,
  Lightbulb, ChevronDown, ChevronUp, CheckCircle2, AlertCircle,
  Calendar, Zap,
} from 'lucide-react';
import { Game, GamingGoal, GoalType, GoalStatus } from '../lib/types';
import { getTotalHours, parseLocalDate, getSmartGoalSuggestions, SmartGoalSuggestion } from '../lib/calculations';
import { useGoals } from '../hooks/useGoals';
import { useAuthContext } from '@/lib/AuthContext';
import clsx from 'clsx';

// ── types ─────────────────────────────────────────────────────

const GOAL_TYPE_CONFIG: Record<GoalType, {
  label: string;
  icon: React.ReactNode;
  defaultUnit: string;
  color: string;
  accentClass: string;
}> = {
  completion:    { label: 'Complete Games', icon: <Trophy size={13} />,   defaultUnit: 'games',   color: 'emerald', accentClass: 'text-emerald-400' },
  spending:      { label: 'Spending Limit', icon: <DollarSign size={13} />, defaultUnit: 'dollars', color: 'rose',    accentClass: 'text-rose-400' },
  hours:         { label: 'Hours Target',   icon: <Clock size={13} />,      defaultUnit: 'hours',   color: 'sky',     accentClass: 'text-sky-400' },
  genre_variety: { label: 'Genre Variety',  icon: <Layers size={13} />,     defaultUnit: 'genres',  color: 'violet',  accentClass: 'text-violet-400' },
  backlog:       { label: 'Clear Backlog',  icon: <Flame size={13} />,      defaultUnit: 'games',   color: 'amber',   accentClass: 'text-amber-400' },
  custom:        { label: 'Custom',         icon: <Sparkles size={13} />,   defaultUnit: '',        color: 'cyan',    accentClass: 'text-cyan-400' },
};

const COLOR_MAP: Record<string, { track: string; fill: string; bg: string; border: string; text: string }> = {
  emerald: { track: 'bg-emerald-500/10', fill: 'bg-emerald-500',   bg: 'bg-emerald-500/10',  border: 'border-emerald-500/25', text: 'text-emerald-400' },
  rose:    { track: 'bg-rose-500/10',    fill: 'bg-rose-500',      bg: 'bg-rose-500/10',     border: 'border-rose-500/25',    text: 'text-rose-400' },
  sky:     { track: 'bg-sky-500/10',     fill: 'bg-sky-500',       bg: 'bg-sky-500/10',      border: 'border-sky-500/25',     text: 'text-sky-400' },
  violet:  { track: 'bg-violet-500/10',  fill: 'bg-violet-500',    bg: 'bg-violet-500/10',   border: 'border-violet-500/25',  text: 'text-violet-400' },
  amber:   { track: 'bg-amber-500/10',   fill: 'bg-amber-500',     bg: 'bg-amber-500/10',    border: 'border-amber-500/25',   text: 'text-amber-400' },
  cyan:    { track: 'bg-cyan-500/10',    fill: 'bg-cyan-500',      bg: 'bg-cyan-500/10',     border: 'border-cyan-500/25',    text: 'text-cyan-400' },
};

// ── progress calculation ───────────────────────────────────────

function calculateGoalProgress(goal: GamingGoal, games: Game[]): number {
  const start = parseLocalDate(goal.startDate);
  const now = new Date();

  switch (goal.type) {
    case 'completion':
      return games.filter(g => {
        if (g.status !== 'Completed' || !g.endDate) return false;
        const end = parseLocalDate(g.endDate);
        return end >= start && end <= now;
      }).length;

    case 'spending':
      return games
        .filter(g => {
          if (g.status === 'Wishlist' || !g.datePurchased) return false;
          const d = parseLocalDate(g.datePurchased);
          return d >= start && d <= now;
        })
        .reduce((sum, g) => sum + g.price, 0);

    case 'hours':
      return games.reduce((total, g) => {
        return total + (g.playLogs || []).filter(log => {
          const d = parseLocalDate(log.date);
          return d >= start && d <= now;
        }).reduce((s, l) => s + l.hours, 0);
      }, 0);

    case 'genre_variety': {
      const genres = new Set<string>();
      games.forEach(g => {
        if (!g.genre) return;
        const played = (g.playLogs || []).some(log => parseLocalDate(log.date) >= start && parseLocalDate(log.date) <= now);
        if (played) genres.add(g.genre);
      });
      return genres.size;
    }

    case 'backlog':
      return games.filter(g => {
        if (!g.startDate) return false;
        const s = parseLocalDate(g.startDate);
        return s >= start && s <= now;
      }).length;

    case 'custom':
    default:
      return goal.currentValue;
  }
}

function getDaysRemaining(endDate: string): number {
  const end = parseLocalDate(endDate);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / 86400000);
}

// ── sub-components ────────────────────────────────────────────

interface GoalCardProps {
  goal: GamingGoal;
  games: Game[];
  onEdit: (goal: GamingGoal) => void;
  onDelete: (id: string) => void;
  onMarkComplete: (id: string) => void;
  onUpdateCustomValue: (id: string, value: number) => void;
}

function GoalCard({ goal, games, onEdit, onDelete, onMarkComplete, onUpdateCustomValue }: GoalCardProps) {
  const typeConfig = GOAL_TYPE_CONFIG[goal.type];
  const colors = COLOR_MAP[typeConfig.color];
  const current = calculateGoalProgress(goal, games);
  const percent = goal.targetValue > 0 ? Math.min((current / goal.targetValue) * 100, 100) : 0;
  const daysLeft = getDaysRemaining(goal.endDate);

  const isSpending = goal.type === 'spending';
  const isComplete = isSpending ? current >= goal.targetValue : current >= goal.targetValue;
  const isOverBudget = isSpending && current > goal.targetValue;
  const spendingOk = isSpending && current <= goal.targetValue;

  const statusColor = isOverBudget
    ? 'text-rose-400'
    : isComplete
    ? 'text-emerald-400'
    : daysLeft < 3 && percent < 80
    ? 'text-amber-400'
    : colors.text;

  const barColor = isOverBudget
    ? 'bg-rose-500'
    : isComplete && !isSpending
    ? 'bg-emerald-500'
    : spendingOk
    ? 'bg-emerald-500'
    : colors.fill;

  const displayValue = isSpending
    ? `$${current.toFixed(2)}`
    : goal.type === 'hours'
    ? `${current.toFixed(1)}h`
    : current.toFixed(0);

  const displayTarget = isSpending
    ? `$${goal.targetValue}`
    : goal.type === 'hours'
    ? `${goal.targetValue}h`
    : `${goal.targetValue} ${goal.unit}`;

  return (
    <div className={clsx('rounded-xl border p-3.5 transition-all', colors.bg, colors.border)}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={clsx('shrink-0', typeConfig.accentClass)}>{typeConfig.icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{goal.title}</p>
            {goal.description && (
              <p className="text-[11px] text-white/40 truncate mt-0.5">{goal.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => onEdit(goal)} className="p-1.5 text-white/20 hover:text-white/60 transition-colors">
            <Edit3 size={11} />
          </button>
          <button onClick={() => onDelete(goal.id)} className="p-1.5 text-white/20 hover:text-rose-400 transition-colors">
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Progress row */}
      <div className="flex items-center gap-3 mb-2">
        {/* Circular progress ring */}
        <div className="relative shrink-0 w-12 h-12">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/5" />
            <circle
              cx="18" cy="18" r="15" fill="none"
              stroke={isOverBudget ? '#f43f5e' : isComplete ? '#10b981' : undefined}
              strokeWidth="3"
              strokeDasharray={`${percent * 0.942} 94.2`}
              strokeLinecap="round"
              className={clsx(!isOverBudget && !isComplete && colors.fill.replace('bg-', 'stroke-'))}
              style={!isOverBudget && !isComplete ? { stroke: undefined } : undefined}
            />
          </svg>
          {/* Fallback: overlay a colored circle with clip */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={clsx('text-[10px] font-bold', statusColor)}>
              {Math.round(percent)}%
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className={clsx('text-xl font-bold', statusColor)}>{displayValue}</span>
            <span className="text-xs text-white/30">of {displayTarget}</span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={clsx('h-full rounded-full transition-all duration-700', barColor)}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
          {/* Days / status */}
          <div className="flex items-center justify-between mt-1">
            {isComplete && !isSpending ? (
              <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={11} /> Completed!
              </span>
            ) : isOverBudget ? (
              <span className="text-[11px] text-rose-400 flex items-center gap-1">
                <AlertCircle size={11} /> Over budget
              </span>
            ) : daysLeft > 0 ? (
              <span className="text-[11px] text-white/30">
                {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
              </span>
            ) : (
              <span className="text-[11px] text-white/20">Ended</span>
            )}
            {goal.type === 'custom' && (
              <button
                onClick={() => {
                  const raw = prompt('Update progress:', String(goal.currentValue));
                  if (raw !== null) {
                    const v = parseFloat(raw);
                    if (!isNaN(v)) onUpdateCustomValue(goal.id, v);
                  }
                }}
                className="text-[11px] text-cyan-400 hover:text-cyan-300"
              >
                Update
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── suggestion cards ───────────────────────────────────────────

function SuggestionCard({ s, onAccept }: { s: SmartGoalSuggestion; onAccept: (s: SmartGoalSuggestion) => void }) {
  const urgencyDot = s.urgency === 'high' ? 'bg-rose-500' : s.urgency === 'medium' ? 'bg-amber-500' : 'bg-sky-500';
  return (
    <div className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-xl hover:border-white/10 transition-all">
      <span className="text-xl shrink-0">{s.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-sm font-medium text-white truncate">{s.title}</p>
          <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', urgencyDot)} />
        </div>
        <p className="text-[11px] text-white/40 leading-snug">{s.reason}</p>
      </div>
      <button
        onClick={() => onAccept(s)}
        className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 rounded-lg text-xs font-medium transition-all"
      >
        <Plus size={11} />
        Add
      </button>
    </div>
  );
}

// ── quick-start presets ────────────────────────────────────────

interface QuickPreset {
  label: string;
  type: GoalType;
  targetValue: number;
  unit: string;
  emoji: string;
  daysFromNow: number;
}

const QUICK_PRESETS: QuickPreset[] = [
  { label: '20h this month',   type: 'hours',      targetValue: 20,  unit: 'hours',  emoji: '⏱️', daysFromNow: 0 },
  { label: 'Finish 2 games',   type: 'completion', targetValue: 2,   unit: 'games',  emoji: '🏆', daysFromNow: 0 },
  { label: 'Under $60',        type: 'spending',   targetValue: 60,  unit: 'dollars',emoji: '💰', daysFromNow: 0 },
  { label: 'Start 3 from backlog', type: 'backlog',targetValue: 3,   unit: 'games',  emoji: '📦', daysFromNow: 0 },
  { label: '50 hours this month',  type: 'hours',  targetValue: 50,  unit: 'hours',  emoji: '🔥', daysFromNow: 0 },
  { label: 'No new purchases', type: 'spending',   targetValue: 0,   unit: 'dollars',emoji: '🛑', daysFromNow: 0 },
];

// ── main component ────────────────────────────────────────────

export function GoalsPanel({ games }: { games: Game[] }) {
  const { user } = useAuthContext();
  const { goals, loading, addGoal, updateGoal, deleteGoal } = useGoals(user?.uid ?? null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Form state
  const [formTitle, setFormTitle]           = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType]             = useState<GoalType>('completion');
  const [formTarget, setFormTarget]         = useState('');
  const [formUnit, setFormUnit]             = useState('');
  const [formCurrentValue, setFormCurrentValue] = useState('');
  const [formStartDate, setFormStartDate]   = useState('');
  const [formEndDate, setFormEndDate]       = useState('');

  const initFormDates = () => {
    const now = new Date();
    const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    setFormStartDate(start);
    setFormEndDate(endStr);
  };

  const resetForm = () => {
    setFormTitle(''); setFormDescription(''); setFormType('completion');
    setFormTarget(''); setFormUnit(''); setFormCurrentValue('');
    initFormDates();
    setEditingGoalId(null);
  };

  const openNewForm = () => { resetForm(); setShowAddForm(true); };

  const suggestions = useMemo(() => getSmartGoalSuggestions(games), [games]);
  const activeGoals = useMemo(() => goals.filter(g => g.status === 'active'), [goals]);
  const historyGoals = useMemo(() => goals.filter(g => g.status !== 'active'), [goals]);

  const handleAcceptSuggestion = (s: SmartGoalSuggestion) => {
    setFormTitle(s.title);
    setFormDescription(s.description);
    setFormType(s.type);
    setFormTarget(String(s.targetValue));
    setFormUnit(s.unit);
    setFormStartDate(s.startDate);
    setFormEndDate(s.endDate);
    setFormCurrentValue('0');
    setEditingGoalId(null);
    setShowAddForm(true);
  };

  const handleAcceptPreset = (p: QuickPreset) => {
    const now = new Date();
    const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
    setFormTitle(p.label);
    setFormDescription('');
    setFormType(p.type);
    setFormTarget(String(p.targetValue));
    setFormUnit(p.unit);
    setFormStartDate(start);
    setFormEndDate(end);
    setFormCurrentValue('0');
    setEditingGoalId(null);
    setShowAddForm(true);
  };

  const handleSubmit = async () => {
    if (!formTitle.trim() || !formTarget) return;
    const target = parseFloat(formTarget);
    if (isNaN(target) || target < 0) return;
    const unit = formUnit || GOAL_TYPE_CONFIG[formType].defaultUnit;
    const currentValue = formType === 'custom' ? (parseFloat(formCurrentValue) || 0) : 0;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (editingGoalId) {
      await updateGoal(editingGoalId, {
        title: formTitle.trim(), description: formDescription.trim() || undefined,
        type: formType, targetValue: target, currentValue, unit,
        startDate: formStartDate || todayStr, endDate: formEndDate,
      });
    } else {
      await addGoal({
        userId: user?.uid || 'local-user',
        title: formTitle.trim(), description: formDescription.trim() || undefined,
        type: formType, targetValue: target, currentValue, unit,
        startDate: formStartDate || todayStr, endDate: formEndDate,
        status: 'active',
      });
    }
    resetForm(); setShowAddForm(false);
  };

  const startEdit = (goal: GamingGoal) => {
    setFormTitle(goal.title); setFormDescription(goal.description || '');
    setFormType(goal.type); setFormTarget(String(goal.targetValue));
    setFormUnit(goal.unit); setFormCurrentValue(String(goal.currentValue));
    setFormStartDate(goal.startDate); setFormEndDate(goal.endDate);
    setEditingGoalId(goal.id); setShowAddForm(true);
  };

  if (loading) return null;

  // Stats summary for header
  const onTrackCount = activeGoals.filter(g => {
    const cur = calculateGoalProgress(g, games);
    const pct = g.targetValue > 0 ? (cur / g.targetValue) * 100 : 0;
    const daysLeft = getDaysRemaining(g.endDate);
    const daysTotal = Math.max(1, Math.ceil(
      (parseLocalDate(g.endDate).getTime() - parseLocalDate(g.startDate).getTime()) / 86400000
    ));
    const elapsed = 1 - daysLeft / daysTotal;
    // On-track if progress % >= elapsed %
    return pct >= elapsed * 100 - 10;
  }).length;

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Gaming Goals</h3>
          {activeGoals.length > 0 && (
            <span className="text-[11px] px-1.5 py-0.5 bg-white/5 text-white/40 rounded-full">
              {onTrackCount}/{activeGoals.length} on track
            </span>
          )}
        </div>
        {!showAddForm && (
          <button
            onClick={openNewForm}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 rounded-lg text-xs font-medium transition-all"
          >
            <Plus size={12} /> New Goal
          </button>
        )}
      </div>

      <div className="px-4 pb-4 space-y-3">
        {/* ── Add / Edit Form ─────────────────────────────── */}
        {showAddForm && (
          <div className="p-4 bg-white/[0.03] border border-white/10 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-white/70">{editingGoalId ? 'Edit Goal' : 'New Goal'}</h4>
              <button onClick={() => { resetForm(); setShowAddForm(false); }} className="p-1 text-white/30 hover:text-white/60">
                <X size={15} />
              </button>
            </div>

            <input
              type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)}
              placeholder="Goal title (e.g., Complete 3 games this month)"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:border-cyan-500/40 placeholder:text-white/20"
            />
            <input
              type="text" value={formDescription} onChange={e => setFormDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:border-cyan-500/40 placeholder:text-white/20"
            />

            {/* Type selector */}
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.entries(GOAL_TYPE_CONFIG) as [GoalType, typeof GOAL_TYPE_CONFIG[GoalType]][]).map(([type, cfg]) => (
                <button
                  key={type}
                  onClick={() => { setFormType(type); setFormUnit(cfg.defaultUnit); }}
                  className={clsx(
                    'flex items-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all border',
                    formType === type
                      ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300'
                      : 'bg-white/[0.02] border-white/5 text-white/40 hover:text-white/60'
                  )}
                >
                  {cfg.icon}<span className="truncate">{cfg.label}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1">Target</label>
                <input
                  type="number" min="0" step="any" value={formTarget}
                  onChange={e => setFormTarget(e.target.value)} placeholder="e.g., 5"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:border-cyan-500/40 placeholder:text-white/20"
                />
              </div>
              <div className="w-24">
                <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1">Unit</label>
                <input
                  type="text" value={formUnit || GOAL_TYPE_CONFIG[formType].defaultUnit}
                  onChange={e => setFormUnit(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:border-cyan-500/40"
                />
              </div>
            </div>

            {formType === 'custom' && (
              <div>
                <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1">Current Progress</label>
                <input
                  type="number" min="0" step="any" value={formCurrentValue}
                  onChange={e => setFormCurrentValue(e.target.value)} placeholder="0"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:border-cyan-500/40"
                />
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1">Start</label>
                <input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm [color-scheme:dark]" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1">End</label>
                <input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm [color-scheme:dark]" />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSubmit}
                disabled={!formTitle.trim() || !formTarget}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 rounded-lg text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <Check size={14} />{editingGoalId ? 'Save Changes' : 'Create Goal'}
              </button>
              <button
                onClick={() => { resetForm(); setShowAddForm(false); }}
                className="px-4 py-2.5 bg-white/5 text-white/40 hover:bg-white/10 rounded-lg text-sm transition-all"
              >Cancel</button>
            </div>
          </div>
        )}

        {/* ── Active Goals ────────────────────────────────── */}
        {activeGoals.length > 0 && (
          <div className="space-y-2">
            {activeGoals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                games={games}
                onEdit={startEdit}
                onDelete={deleteGoal}
                onMarkComplete={id => updateGoal(id, { status: 'completed' })}
                onUpdateCustomValue={(id, v) => updateGoal(id, { currentValue: v })}
              />
            ))}
          </div>
        )}

        {/* ── Smart Suggestions ───────────────────────────── */}
        {suggestions.length > 0 && !showAddForm && (
          <div>
            <button
              onClick={() => setShowSuggestions(v => !v)}
              className="flex items-center gap-2 w-full text-left mb-2"
            >
              <Lightbulb size={13} className="text-yellow-400 shrink-0" />
              <span className="text-xs font-medium text-white/50">Smart Suggestions</span>
              <div className="flex-1 border-t border-white/5" />
              {showSuggestions ? <ChevronUp size={12} className="text-white/30" /> : <ChevronDown size={12} className="text-white/30" />}
            </button>
            {showSuggestions && (
              <div className="space-y-2">
                {suggestions.map(s => (
                  <SuggestionCard key={s.id} s={s} onAccept={handleAcceptSuggestion} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Quick Start Presets ─────────────────────────── */}
        {activeGoals.length === 0 && !showAddForm && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={13} className="text-purple-400 shrink-0" />
              <span className="text-xs font-medium text-white/50">Quick Start</span>
              <div className="flex-1 border-t border-white/5" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => handleAcceptPreset(p)}
                  className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.03] border border-white/5 rounded-xl text-xs text-white/60 hover:text-white/90 hover:border-white/10 hover:bg-white/[0.05] transition-all text-left"
                >
                  <span>{p.emoji}</span>
                  <span className="truncate">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty state (no goals, no suggestions) ─────── */}
        {activeGoals.length === 0 && suggestions.length === 0 && !showAddForm && (
          <div className="text-center py-6">
            <Target size={32} className="text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/30 mb-3">No active goals yet</p>
            <button
              onClick={openNewForm}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg text-sm font-medium transition-all"
            >
              <Plus size={14} /> Create your first goal
            </button>
          </div>
        )}

        {/* ── History ─────────────────────────────────────── */}
        {historyGoals.length > 0 && (
          <div>
            <button
              onClick={() => setShowHistory(v => !v)}
              className="flex items-center gap-2 w-full text-left"
            >
              <Calendar size={12} className="text-white/30" />
              <span className="text-xs text-white/30 hover:text-white/50 transition-colors">
                {showHistory ? 'Hide' : 'Show'} history ({historyGoals.length})
              </span>
              <div className="flex-1 border-t border-white/5" />
              {showHistory ? <ChevronUp size={12} className="text-white/20" /> : <ChevronDown size={12} className="text-white/20" />}
            </button>
            {showHistory && (
              <div className="mt-2 space-y-2">
                {historyGoals.map(goal => {
                  const cur = calculateGoalProgress(goal, games);
                  const pct = goal.targetValue > 0 ? Math.min((cur / goal.targetValue) * 100, 100) : 0;
                  const isCompleted = goal.status === 'completed';
                  return (
                    <div key={goal.id} className="flex items-center justify-between px-3 py-2.5 bg-white/[0.02] rounded-xl border border-white/5">
                      <div className="flex items-center gap-2 min-w-0">
                        {isCompleted
                          ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                          : <X size={13} className="text-rose-400 shrink-0" />}
                        <p className="text-sm text-white/50 truncate">{goal.title}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-xs text-white/30">{pct.toFixed(0)}%</span>
                        <button onClick={() => deleteGoal(goal.id)} className="p-1 text-white/15 hover:text-white/40">
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
