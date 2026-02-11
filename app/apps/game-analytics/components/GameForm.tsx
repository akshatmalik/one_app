'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Tag, DollarSign, Calendar, MessageSquare, Sparkles } from 'lucide-react';
import { Game, GameStatus, PurchaseSource, SubscriptionSource } from '../lib/types';
import { calculateCostPerHour, getValueRating } from '../lib/calculations';
import clsx from 'clsx';

interface GameFormProps {
  onSubmit: (game: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onClose: () => void;
  initialGame?: Game;
  existingFranchises?: string[];
}

const PLATFORMS = ['PC', 'PS5', 'PS4', 'Xbox Series', 'Xbox One', 'Switch', 'Mobile', 'Other'];
const GENRES = ['Action', 'Action-Adventure', 'RPG', 'JRPG', 'Horror', 'Platformer', 'Strategy', 'Simulation', 'Sports', 'Racing', 'Puzzle', 'Metroidvania', 'Roguelike', 'Souls-like', 'FPS', 'TPS', 'MMO', 'Indie', 'Adventure', 'Other'];
const PURCHASE_SOURCES: PurchaseSource[] = ['Steam', 'PlayStation', 'Xbox', 'Nintendo', 'Epic', 'GOG', 'Physical', 'Other'];
const SUBSCRIPTION_SOURCES: SubscriptionSource[] = ['PS Plus', 'Game Pass', 'Epic Free', 'Prime Gaming', 'Humble Choice', 'Other'];

const STATUS_CONFIG: { status: GameStatus; label: string; dotClass: string; activeClass: string }[] = [
  { status: 'Not Started', label: 'Backlog', dotClass: 'bg-white/40', activeClass: 'bg-white/10 text-white/80 ring-1 ring-white/20' },
  { status: 'In Progress', label: 'Playing', dotClass: 'bg-blue-400', activeClass: 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50' },
  { status: 'Completed', label: 'Done', dotClass: 'bg-emerald-400', activeClass: 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50' },
  { status: 'Wishlist', label: 'Wishlist', dotClass: 'bg-purple-400', activeClass: 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/50' },
  { status: 'Abandoned', label: 'Dropped', dotClass: 'bg-red-400', activeClass: 'bg-red-500/20 text-red-400 ring-1 ring-red-500/50' },
];

const RATING_LABELS: Record<number, string> = {
  1: 'Awful', 2: 'Bad', 3: 'Poor', 4: 'Weak', 5: 'Meh',
  6: 'Decent', 7: 'Good', 8: 'Great', 9: 'Amazing', 10: 'Masterpiece',
};

function toTitleCase(str: string): string {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function getValueColor(rating: string) {
  switch (rating) {
    case 'Excellent': return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
    case 'Good': return 'text-blue-400 bg-blue-500/15 border-blue-500/30';
    case 'Fair': return 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30';
    case 'Poor': return 'text-red-400 bg-red-500/15 border-red-500/30';
    default: return 'text-white/50 bg-white/5 border-white/10';
  }
}

function getRatingColor(rating: number) {
  if (rating >= 9) return 'bg-amber-500 text-black';
  if (rating >= 7) return 'bg-emerald-500 text-white';
  if (rating >= 5) return 'bg-blue-500 text-white';
  if (rating >= 3) return 'bg-orange-500 text-white';
  return 'bg-red-500 text-white';
}

// Collapsible section component
function Section({ title, icon, defaultOpen = false, children, badge }: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-white/5 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.02] active:bg-white/[0.05] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-white/30">{icon}</span>
          <span className="text-sm font-medium text-white/80">{title}</span>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/40">{badge}</span>
          )}
        </div>
        <ChevronDown size={16} className={clsx(
          'text-white/30 transition-transform duration-200',
          isOpen && 'rotate-180'
        )} />
      </button>
      <div className={clsx(
        'transition-all duration-200 overflow-hidden',
        isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
      )}>
        <div className="p-4 pt-2 space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
}

export function GameForm({ onSubmit, onClose, initialGame, existingFranchises = [] }: GameFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: initialGame?.name || '',
    price: initialGame?.price !== undefined ? initialGame.price.toString() : '',
    hours: initialGame?.hours !== undefined ? initialGame.hours.toString() : '',
    rating: initialGame?.rating || 8,
    status: (initialGame?.status || 'Not Started') as GameStatus,
    platform: initialGame?.platform || 'PS5',
    genre: initialGame?.genre || '',
    franchise: initialGame?.franchise || '',
    purchaseSource: initialGame?.purchaseSource || 'PlayStation' as PurchaseSource | '',
    acquiredFree: initialGame?.acquiredFree || false,
    originalPrice: initialGame?.originalPrice !== undefined ? initialGame.originalPrice.toString() : '',
    subscriptionSource: initialGame?.subscriptionSource || '' as SubscriptionSource | '',
    notes: initialGame?.notes || '',
    review: initialGame?.review || '',
    datePurchased: initialGame?.datePurchased || new Date().toISOString().split('T')[0],
    startDate: initialGame?.startDate || '',
    endDate: initialGame?.endDate || '',
    playLogs: initialGame?.playLogs || [],
    isSpecial: initialGame?.isSpecial || false,
  });

  // Drag-to-dismiss
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const currentTranslateY = useRef(0);
  const isDragging = useRef(false);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleDragStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.drag-handle')) {
      isDragging.current = true;
      dragStartY.current = e.touches[0].clientY;
    }
  };

  const handleDragMove = (e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return;
    const deltaY = e.touches[0].clientY - dragStartY.current;
    if (deltaY > 0) {
      currentTranslateY.current = deltaY;
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  };

  const handleDragEnd = () => {
    if (!isDragging.current || !sheetRef.current) return;
    isDragging.current = false;
    if (currentTranslateY.current > 150) {
      onClose();
    } else {
      sheetRef.current.style.transform = 'translateY(0)';
      sheetRef.current.style.transition = 'transform 0.2s ease-out';
      setTimeout(() => {
        if (sheetRef.current) sheetRef.current.style.transition = '';
      }, 200);
    }
    currentTranslateY.current = 0;
  };

  const priceNum = parseFloat(formData.price) || 0;
  const hoursNum = parseFloat(formData.hours) || 0;
  const costPerHour = calculateCostPerHour(priceNum, hoursNum);
  const valueRating = getValueRating(costPerHour);

  const isOwned = formData.status !== 'Wishlist';
  const showPlayDates = isOwned && (formData.status === 'In Progress' || formData.status === 'Completed' || formData.status === 'Abandoned');
  const showRating = formData.status !== 'Not Started' && formData.status !== 'Wishlist';

  const paidPrice = parseFloat(formData.price) || 0;
  const origPrice = parseFloat(formData.originalPrice) || 0;
  const discount = origPrice > paidPrice && paidPrice >= 0 ? ((origPrice - paidPrice) / origPrice) * 100 : 0;
  const savings = origPrice - paidPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        name: toTitleCase(formData.name.trim()),
        franchise: formData.franchise ? toTitleCase(formData.franchise.trim()) : undefined,
        price: parseFloat(formData.price) || 0,
        hours: parseFloat(formData.hours) || 0,
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined,
        purchaseSource: formData.purchaseSource || undefined,
        acquiredFree: formData.acquiredFree || undefined,
        subscriptionSource: formData.acquiredFree && formData.subscriptionSource ? formData.subscriptionSource : undefined,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        isSpecial: formData.isSpecial || undefined,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (status: GameStatus) => {
    const today = new Date().toISOString().split('T')[0];
    const updates: Partial<typeof formData> = { status };
    if (status === 'Completed' && !formData.endDate) updates.endDate = today;
    if (status === 'In Progress' && !formData.startDate) updates.startDate = today;
    if (status === 'Abandoned' && !formData.endDate) updates.endDate = today;
    setFormData({ ...formData, ...updates });
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-[#12121a] rounded-t-2xl max-h-[92vh] flex flex-col animate-bottom-sheet-up"
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        {/* Drag Handle + Header */}
        <div className="drag-handle flex-shrink-0 pt-3 pb-2 px-4 cursor-grab">
          <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              {initialGame ? 'Edit Game' : 'Add Game'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-white/40 active:text-white/70 active:bg-white/5 rounded-lg p-1.5 transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 pb-24">
          <div className="space-y-4 pb-2">

            {/* Hero Thumbnail (edit mode) */}
            {initialGame?.thumbnail && (
              <div className="relative -mx-4 -mt-1 h-32 overflow-hidden">
                <img
                  src={initialGame.thumbnail}
                  alt={initialGame.name}
                  className="w-full h-full object-cover opacity-50"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] via-[#12121a]/60 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <div className="text-[10px] text-white/40 uppercase tracking-wider">Editing</div>
                  <div className="text-white font-semibold truncate">{initialGame.name}</div>
                </div>
              </div>
            )}

            {/* Game Name */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Game Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-3 bg-white/[0.03] border border-white/5 text-white rounded-xl text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all placeholder:text-white/30"
                placeholder="Enter game name"
              />
            </div>

            {/* Status Picker — bigger pills with icons */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-2">Status</label>
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                {STATUS_CONFIG.map(({ status, label, dotClass, activeClass }) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleStatusChange(status)}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex-shrink-0',
                      formData.status === status
                        ? activeClass
                        : 'bg-white/[0.03] text-white/40 active:bg-white/[0.06]'
                    )}
                  >
                    <span className={clsx('w-1.5 h-1.5 rounded-full', dotClass)} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Row — Paid + Original together */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">
                  Paid Price ($) {formData.acquiredFree && <span className="text-emerald-400 text-[10px]">• Free</span>}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-3 bg-white/[0.03] border border-white/5 text-white rounded-xl text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
                  placeholder="0.00"
                  disabled={formData.acquiredFree}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Original Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.originalPrice}
                  onChange={e => setFormData({ ...formData, originalPrice: e.target.value })}
                  className="w-full px-3 py-3 bg-white/[0.03] border border-white/5 text-white rounded-xl text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Discount Display */}
            {discount > 0 && (
              <div className="px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm flex items-center justify-between">
                <span className="font-medium">{discount.toFixed(0)}% discount</span>
                <span className="text-xs opacity-70">Saved ${savings.toFixed(2)}</span>
              </div>
            )}

            {/* Hours */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Total Hours</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.hours}
                onChange={e => setFormData({ ...formData, hours: e.target.value })}
                className="w-full px-3 py-3 bg-white/[0.03] border border-white/5 text-white rounded-xl text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
                placeholder="0.0"
              />
            </div>

            {/* Live Value Card */}
            {hoursNum > 0 && priceNum > 0 && (
              <div className={clsx(
                'flex items-center justify-between px-4 py-3 rounded-xl border transition-all',
                getValueColor(valueRating)
              )}>
                <div>
                  <div className="text-lg font-bold">${costPerHour.toFixed(2)}<span className="text-xs font-normal opacity-70">/hr</span></div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold">{valueRating}</div>
                  <div className="text-[10px] opacity-60">value rating</div>
                </div>
              </div>
            )}

            {/* Rating — tap-to-rate circles */}
            {showRating && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-white/50">Your Rating</label>
                  <span className={clsx(
                    'text-xs font-semibold px-2 py-0.5 rounded-full',
                    getRatingColor(formData.rating)
                  )}>
                    {RATING_LABELS[formData.rating]}
                  </span>
                </div>
                <div className="flex gap-1.5 justify-between">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating: n })}
                      className={clsx(
                        'w-8 h-8 rounded-full text-xs font-bold transition-all flex items-center justify-center',
                        formData.rating === n
                          ? getRatingColor(n)
                          : n <= formData.rating
                            ? 'bg-white/10 text-white/60'
                            : 'bg-white/[0.03] text-white/25'
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* --- Collapsible Sections --- */}

            {/* Details Section */}
            <Section title="Details" icon={<Tag size={14} />} defaultOpen={!initialGame} badge={[formData.platform, formData.genre].filter(Boolean).join(' · ') || undefined}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Platform</label>
                  <select
                    value={formData.platform}
                    onChange={e => setFormData({ ...formData, platform: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-xl text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
                  >
                    <option value="">Select...</option>
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Genre</label>
                  <select
                    value={formData.genre}
                    onChange={e => setFormData({ ...formData, genre: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-xl text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
                  >
                    <option value="">Select...</option>
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Source</label>
                  <select
                    value={formData.purchaseSource}
                    onChange={e => setFormData({ ...formData, purchaseSource: e.target.value as PurchaseSource })}
                    className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-xl text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
                  >
                    <option value="">Select...</option>
                    {PURCHASE_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Franchise</label>
                  <input
                    type="text"
                    list="franchise-suggestions"
                    value={formData.franchise}
                    onChange={e => setFormData({ ...formData, franchise: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-xl text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all placeholder:text-white/30"
                    placeholder="e.g. Souls"
                  />
                  <datalist id="franchise-suggestions">
                    {existingFranchises.map(f => <option key={f} value={f} />)}
                  </datalist>
                </div>
              </div>
            </Section>

            {/* Subscription / Free Section */}
            {isOwned && (
              <Section
                title="Subscription / Free"
                icon={<DollarSign size={14} />}
                badge={formData.acquiredFree ? 'Free' : undefined}
              >
                {/* Acquired Free Toggle */}
                <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl">
                  <div>
                    <div className="text-sm text-white/80">Acquired Free</div>
                    <div className="text-[10px] text-white/40">From PS Plus, Game Pass, etc.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newFree = !formData.acquiredFree;
                      setFormData({ ...formData, acquiredFree: newFree, price: newFree ? '0' : formData.price });
                    }}
                    className={clsx(
                      'w-11 h-6 rounded-full transition-all relative',
                      formData.acquiredFree ? 'bg-emerald-500' : 'bg-white/10'
                    )}
                  >
                    <div className={clsx(
                      'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all',
                      formData.acquiredFree ? 'left-5' : 'left-0.5'
                    )} />
                  </button>
                </div>

                {formData.acquiredFree && (
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5">Subscription Source</label>
                    <select
                      value={formData.subscriptionSource}
                      onChange={e => setFormData({ ...formData, subscriptionSource: e.target.value as SubscriptionSource })}
                      className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-xl text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
                    >
                      <option value="">Select...</option>
                      {SUBSCRIPTION_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </Section>
            )}

            {/* Dates Section */}
            {isOwned && (
              <Section
                title="Dates"
                icon={<Calendar size={14} />}
                badge={formData.datePurchased ? `Bought ${formData.datePurchased}` : undefined}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className={showPlayDates ? '' : 'col-span-2'}>
                    <label className="block text-xs font-medium text-white/50 mb-1.5">Purchased</label>
                    <input
                      type="date"
                      value={formData.datePurchased}
                      onChange={e => setFormData({ ...formData, datePurchased: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-xl text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
                    />
                  </div>
                  {showPlayDates && (
                    <div>
                      <label className="block text-xs font-medium text-white/50 mb-1.5">Started</label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-xl text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
                      />
                    </div>
                  )}
                </div>
                {showPlayDates && (
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5">
                      {formData.status === 'Abandoned' ? 'Dropped' : 'Finished'}
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-xl text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all"
                    />
                  </div>
                )}
              </Section>
            )}

            {/* Your Take Section */}
            <Section
              title="Your Take"
              icon={<MessageSquare size={14} />}
              badge={formData.review ? 'Has review' : undefined}
            >
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Quick Note</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-xl text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all placeholder:text-white/30"
                  placeholder="e.g. Day one purchase, recommended by friend"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Review</label>
                <textarea
                  value={formData.review}
                  onChange={e => setFormData({ ...formData, review: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-xl text-sm focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all resize-none placeholder:text-white/30"
                  rows={3}
                  placeholder="What did you love? What could be better?"
                />
              </div>

              {/* Special Game Toggle */}
              <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className={clsx(formData.isSpecial ? 'text-amber-400' : 'text-white/30')} />
                  <div>
                    <div className="text-sm text-white/80">Special Game</div>
                    <div className="text-[10px] text-white/40">Mark as an exceptional game you love</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isSpecial: !formData.isSpecial })}
                  className={clsx(
                    'w-11 h-6 rounded-full transition-all relative',
                    formData.isSpecial ? 'bg-amber-500' : 'bg-white/10'
                  )}
                >
                  <div className={clsx(
                    'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all',
                    formData.isSpecial ? 'left-5' : 'left-0.5'
                  )} />
                </button>
              </div>
            </Section>
          </div>
        </form>

        {/* Sticky Save Bar */}
        <div className="flex-shrink-0 absolute bottom-0 left-0 right-0 px-4 py-3 bg-[#12121a] border-t border-white/5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-white/5 text-white/70 rounded-xl active:bg-white/10 transition-all text-sm font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => {
              // Trigger form submit
              const form = sheetRef.current?.querySelector('form');
              if (form) form.requestSubmit();
            }}
            disabled={loading || !formData.name.trim()}
            className={clsx(
              'flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50',
              loading ? 'bg-purple-600/50 text-white/70' : 'bg-purple-600 text-white active:bg-purple-500'
            )}
          >
            {loading ? 'Saving...' : initialGame ? 'Update Game' : 'Add Game'}
          </button>
        </div>
      </div>
    </div>
  );
}
