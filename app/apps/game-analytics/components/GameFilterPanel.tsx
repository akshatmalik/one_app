'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Search, SlidersHorizontal, X, ChevronDown, ChevronUp,
  Star, Zap, Tag, Monitor, Package, Check, Bookmark,
  Save, Trash2, Clock,
} from 'lucide-react';
import { GameFilters, FilterPreset, QUICK_PRESETS, useGameFilters } from '../hooks/useGameFilters';
import { GameStatus } from '../lib/types';
import clsx from 'clsx';

type SetFilters = (fn: (prev: GameFilters) => GameFilters) => void;

interface GameFilterPanelProps {
  filters: GameFilters;
  setFilters: SetFilters;
  activeFilterCount: number;
  isFiltering: boolean;
  clearFilters: () => void;
  applyQuickPreset: (preset: FilterPreset) => void;
  savedPresets: FilterPreset[];
  onSavePreset: (name: string) => void;
  onLoadPreset: (id: string) => void;
  onDeletePreset: (id: string) => void;
  availableGenres: string[];
  availablePlatforms: string[];
  availablePurchaseSources: string[];
  resultCount: number;
  totalCount: number;
}

const STATUS_OPTIONS: GameStatus[] = [
  'In Progress',
  'Completed',
  'Not Started',
  'Abandoned',
  'Wishlist',
];

const STATUS_COLORS: Record<GameStatus, string> = {
  'In Progress':  'text-blue-400',
  'Completed':    'text-emerald-400',
  'Not Started':  'text-white/50',
  'Abandoned':    'text-red-400',
  'Wishlist':     'text-purple-400',
};

const VALUE_OPTIONS = ['Excellent', 'Good', 'Fair', 'Poor'];

const VALUE_COLORS: Record<string, string> = {
  Excellent: 'border-emerald-500/50 text-emerald-400',
  Good:      'border-blue-500/50 text-blue-400',
  Fair:      'border-yellow-500/50 text-yellow-400',
  Poor:      'border-red-500/50 text-red-400',
};

const PRICE_RANGES = [
  { id: 'all',   label: 'Any' },
  { id: '0-15',  label: '$0–15' },
  { id: '15-30', label: '$15–30' },
  { id: '30-50', label: '$30–50' },
  { id: '50-70', label: '$50–70' },
  { id: '70+',   label: '$70+' },
] as const;

function ToggleChip({
  active,
  onClick,
  children,
  className = '',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all',
        active
          ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
          : 'bg-white/[0.02] border-white/10 text-white/40 hover:text-white/70 hover:border-white/20',
        className,
      )}
    >
      {children}
    </button>
  );
}

function MultiToggle<T extends string>({
  label,
  icon,
  options,
  value,
  onChange,
  renderOption,
}: {
  label: string;
  icon: React.ReactNode;
  options: T[];
  value: T[];
  onChange: (v: T[]) => void;
  renderOption?: (o: T) => React.ReactNode;
}) {
  if (options.length === 0) return null;
  const toggle = (opt: T) => {
    const next = value.includes(opt) ? value.filter(x => x !== opt) : [...value, opt];
    onChange(next);
  };
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5 text-white/40 text-[10px] uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="flex flex-wrap gap-1">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={clsx(
              'px-2 py-0.5 rounded text-[11px] border transition-all',
              value.includes(opt)
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                : 'bg-white/[0.02] border-white/10 text-white/50 hover:text-white/80 hover:border-white/20',
            )}
          >
            {renderOption ? renderOption(opt) : opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export function GameFilterPanel({
  filters,
  setFilters,
  activeFilterCount,
  isFiltering,
  clearFilters,
  applyQuickPreset,
  savedPresets,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  availableGenres,
  availablePlatforms,
  availablePurchaseSources,
  resultCount,
  totalCount,
}: GameFilterPanelProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [savePresetName, setSavePresetName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close panel on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (panelOpen) setPanelOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [panelOpen]);

  const handleSavePreset = () => {
    if (!savePresetName.trim()) return;
    onSavePreset(savePresetName.trim());
    setSavePresetName('');
    setShowSaveInput(false);
  };

  const setField = <K extends keyof GameFilters>(key: K, value: GameFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleBoolean = (key: 'acquiredFree' | 'hasPlayLogs' | 'hasReview' | 'isSpecial', wantTrue: boolean) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key] === wantTrue ? null : wantTrue,
    }));
  };

  return (
    <div className="space-y-2">
      {/* ── Search Bar Row ── */}
      <div className="flex items-center gap-2">
        {/* Search input */}
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
          />
          <input
            ref={searchRef}
            type="text"
            value={filters.searchText}
            onChange={e => setField('searchText', e.target.value)}
            placeholder="Search games, notes, reviews…"
            className="w-full pl-8 pr-8 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-purple-500/40 transition-colors"
          />
          {filters.searchText && (
            <button
              onClick={() => setField('searchText', '')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setPanelOpen(p => !p)}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs transition-all shrink-0',
            panelOpen || activeFilterCount > 0
              ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
              : 'bg-white/[0.02] border-white/10 text-white/40 hover:text-white/70',
          )}
        >
          <SlidersHorizontal size={13} />
          Filter
          {activeFilterCount > 0 && (
            <span className="ml-0.5 bg-purple-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Clear button */}
        {isFiltering && (
          <button
            onClick={clearFilters}
            className="px-2 py-2 rounded-lg border border-white/10 bg-white/[0.02] text-white/30 hover:text-white/60 text-xs transition-all shrink-0"
            title="Clear all filters"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* ── Quick Presets Row ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {QUICK_PRESETS.map(preset => (
          <button
            key={preset.id}
            onClick={() => applyQuickPreset(preset)}
            className="px-2.5 py-0.5 rounded-full text-[10px] font-medium border border-white/10 text-white/35 hover:text-white/70 hover:border-white/25 bg-white/[0.02] transition-all"
          >
            {preset.name}
          </button>
        ))}
        {savedPresets.map(preset => (
          <div key={preset.id} className="flex items-center gap-0.5">
            <button
              onClick={() => onLoadPreset(preset.id)}
              className="px-2.5 py-0.5 rounded-l-full text-[10px] font-medium border border-white/10 text-purple-400/60 hover:text-purple-300 bg-purple-500/5 transition-all"
            >
              {preset.name}
            </button>
            <button
              onClick={() => onDeletePreset(preset.id)}
              className="px-1.5 py-0.5 rounded-r-full text-[10px] border border-white/10 text-white/20 hover:text-red-400 bg-white/[0.02] transition-all"
              title="Delete preset"
            >
              <X size={9} />
            </button>
          </div>
        ))}
      </div>

      {/* ── Advanced Filter Panel ── */}
      {panelOpen && (
        <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-4">

          {/* Row: Status */}
          <MultiToggle
            label="Status"
            icon={<Tag size={11} />}
            options={STATUS_OPTIONS}
            value={filters.statuses as GameStatus[]}
            onChange={v => setField('statuses', v)}
            renderOption={opt => (
              <span className={STATUS_COLORS[opt as GameStatus]}>{opt}</span>
            )}
          />

          {/* Row: Genre */}
          {availableGenres.length > 0 && (
            <MultiToggle
              label="Genre"
              icon={<Package size={11} />}
              options={availableGenres}
              value={filters.genres}
              onChange={v => setField('genres', v)}
            />
          )}

          {/* Row: Platform */}
          {availablePlatforms.length > 0 && (
            <MultiToggle
              label="Platform"
              icon={<Monitor size={11} />}
              options={availablePlatforms}
              value={filters.platforms}
              onChange={v => setField('platforms', v)}
            />
          )}

          {/* Row: Value Rating */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5 text-white/40 text-[10px] uppercase tracking-wider">
              <Zap size={11} />
              Value Rating
            </div>
            <div className="flex flex-wrap gap-1">
              {VALUE_OPTIONS.map(vr => (
                <button
                  key={vr}
                  onClick={() => {
                    const current = filters.valueRatings;
                    setField(
                      'valueRatings',
                      current.includes(vr) ? current.filter(x => x !== vr) : [...current, vr],
                    );
                  }}
                  className={clsx(
                    'px-2.5 py-0.5 rounded text-[11px] border transition-all',
                    filters.valueRatings.includes(vr)
                      ? `bg-white/10 ${VALUE_COLORS[vr]}`
                      : 'bg-white/[0.02] border-white/10 text-white/40 hover:text-white/70',
                  )}
                >
                  {vr}
                </button>
              ))}
            </div>
          </div>

          {/* Row: Price Range */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5 text-white/40 text-[10px] uppercase tracking-wider">
              <Star size={11} />
              Price Range
            </div>
            <div className="flex flex-wrap gap-1">
              {PRICE_RANGES.map(pr => (
                <button
                  key={pr.id}
                  onClick={() => setField('priceRange', pr.id as GameFilters['priceRange'])}
                  className={clsx(
                    'px-2.5 py-0.5 rounded text-[11px] border transition-all',
                    filters.priceRange === pr.id
                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                      : 'bg-white/[0.02] border-white/10 text-white/40 hover:text-white/70',
                  )}
                >
                  {pr.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row: Quick toggles */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5 text-white/40 text-[10px] uppercase tracking-wider">
              <Clock size={11} />
              Other Filters
            </div>
            <div className="flex flex-wrap gap-1.5">
              <ToggleChip
                active={filters.acquiredFree === true}
                onClick={() => toggleBoolean('acquiredFree', true)}
              >
                Free / Subscription
              </ToggleChip>
              <ToggleChip
                active={filters.acquiredFree === false}
                onClick={() => toggleBoolean('acquiredFree', false)}
              >
                Purchased
              </ToggleChip>
              <ToggleChip
                active={filters.hasPlayLogs === true}
                onClick={() => toggleBoolean('hasPlayLogs', true)}
              >
                Has Sessions
              </ToggleChip>
              <ToggleChip
                active={filters.hasPlayLogs === false}
                onClick={() => toggleBoolean('hasPlayLogs', false)}
              >
                No Sessions
              </ToggleChip>
              <ToggleChip
                active={filters.hasReview === true}
                onClick={() => toggleBoolean('hasReview', true)}
              >
                Has Review
              </ToggleChip>
              <ToggleChip
                active={filters.isSpecial === true}
                onClick={() => toggleBoolean('isSpecial', true)}
              >
                ★ Special / Beloved
              </ToggleChip>
            </div>
          </div>

          {/* ── Purchase Sources ── */}
          {availablePurchaseSources.length > 1 && (
            <MultiToggle
              label="Store / Source"
              icon={<Bookmark size={11} />}
              options={availablePurchaseSources}
              value={filters.purchaseSources}
              onChange={v => setField('purchaseSources', v)}
            />
          )}

          {/* ── Footer: result count + save preset ── */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-3">
            <span className="text-xs text-white/30">
              {isFiltering
                ? `${resultCount} of ${totalCount} games`
                : `${totalCount} games`}
            </span>
            <div className="flex items-center gap-2">
              {isFiltering && !showSaveInput && (
                <button
                  onClick={() => setShowSaveInput(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.04] border border-white/10 text-white/40 hover:text-white/70 text-[11px] transition-all"
                >
                  <Save size={11} />
                  Save preset
                </button>
              )}
              {showSaveInput && (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    type="text"
                    value={savePresetName}
                    onChange={e => setSavePresetName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSavePreset();
                      if (e.key === 'Escape') setShowSaveInput(false);
                    }}
                    placeholder="Preset name…"
                    className="w-28 px-2 py-1 text-[11px] bg-white/[0.04] border border-white/20 rounded text-white placeholder:text-white/25 focus:outline-none focus:border-purple-500/40"
                  />
                  <button
                    onClick={handleSavePreset}
                    disabled={!savePresetName.trim()}
                    className="px-2 py-1 text-[11px] bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded disabled:opacity-40 hover:bg-purple-500/30 transition-all"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowSaveInput(false)}
                    className="text-white/30 hover:text-white/60"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              {isFiltering && (
                <button
                  onClick={clearFilters}
                  className="px-2 py-1 rounded bg-white/[0.04] border border-white/10 text-white/30 hover:text-red-400 text-[11px] transition-all"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Active filter chips (when panel closed) ── */}
      {!panelOpen && isFiltering && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.statuses.map(s => (
            <Chip key={s} onRemove={() => setField('statuses', filters.statuses.filter(x => x !== s))}>
              {s}
            </Chip>
          ))}
          {filters.genres.map(g => (
            <Chip key={g} onRemove={() => setField('genres', filters.genres.filter(x => x !== g))}>
              {g}
            </Chip>
          ))}
          {filters.platforms.map(p => (
            <Chip key={p} onRemove={() => setField('platforms', filters.platforms.filter(x => x !== p))}>
              {p}
            </Chip>
          ))}
          {filters.valueRatings.map(v => (
            <Chip key={v} onRemove={() => setField('valueRatings', filters.valueRatings.filter(x => x !== v))}>
              {v} value
            </Chip>
          ))}
          {filters.priceRange !== 'all' && (
            <Chip onRemove={() => setField('priceRange', 'all')}>
              {PRICE_RANGES.find(r => r.id === filters.priceRange)?.label}
            </Chip>
          )}
          {filters.acquiredFree === true && (
            <Chip onRemove={() => setField('acquiredFree', null)}>Free/Sub</Chip>
          )}
          {filters.acquiredFree === false && (
            <Chip onRemove={() => setField('acquiredFree', null)}>Purchased</Chip>
          )}
          {filters.hasPlayLogs === true && (
            <Chip onRemove={() => setField('hasPlayLogs', null)}>Has sessions</Chip>
          )}
          {filters.hasPlayLogs === false && (
            <Chip onRemove={() => setField('hasPlayLogs', null)}>No sessions</Chip>
          )}
          {filters.hasReview === true && (
            <Chip onRemove={() => setField('hasReview', null)}>Has review</Chip>
          )}
          {filters.isSpecial === true && (
            <Chip onRemove={() => setField('isSpecial', null)}>★ Special</Chip>
          )}
          {filters.purchaseSources.map(ps => (
            <Chip key={ps} onRemove={() => setField('purchaseSources', filters.purchaseSources.filter(x => x !== ps))}>
              {ps}
            </Chip>
          ))}
        </div>
      )}

      {/* ── Result count (when filtering, panel closed) ── */}
      {!panelOpen && isFiltering && (
        <p className="text-xs text-white/30">
          {resultCount === 0
            ? 'No games match your filters'
            : `${resultCount} of ${totalCount} games`}
        </p>
      )}
    </div>
  );
}

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-purple-500/15 border border-purple-500/25 text-purple-300">
      {children}
      <button onClick={onRemove} className="hover:text-white transition-colors">
        <X size={9} />
      </button>
    </span>
  );
}
