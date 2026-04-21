'use client';

import { useMemo, useState } from 'react';
import { Sparkles, Shuffle } from 'lucide-react';

interface SillyQuickStartsProps {
  onAdd: (text: string) => Promise<void>;
}

const QUICK_STARTS = [
  { emoji: '💧', label: 'Sip some water', text: '💧 Sip some water like a functional adult !4 @wellness' },
  { emoji: '🌱', label: 'Touch grass', text: '🌱 Touch grass for 5 whole minutes !4 @outside' },
  { emoji: '🧘', label: 'Breathe on purpose', text: '🧘 Breathe on purpose for 1 minute !4 @wellness' },
  { emoji: '🛏️', label: 'Make the bed', text: '🛏️ Make the bed (victory unlocked) !4 @adulting' },
  { emoji: '📬', label: 'Slay one email', text: '📬 Slay exactly one ugly email !3 @work' },
  { emoji: '🧺', label: 'Tiny tidy', text: '🧺 Tiny tidy: 3 things put away !4 @adulting' },
  { emoji: '☕', label: 'Caffeinate gently', text: '☕ Caffeinate gently, not chaotically !4 @fuel' },
  { emoji: '🚶', label: '10-min walk', text: '🚶 Take a 10-minute walk and feel smug !4 @wellness' },
  { emoji: '📞', label: 'Text a friend', text: '📞 Text a friend something nice !4 @social' },
  { emoji: '🧠', label: 'Brain dump', text: '🧠 Brain dump everything for 5 min !3 @focus' },
  { emoji: '🧹', label: '2-min desk sweep', text: '🧹 2-minute desk sweep !4 @adulting' },
  { emoji: '🎉', label: 'Celebrate nothing', text: '🎉 Celebrate nothing in particular !4 @vibes' },
];

export function SillyQuickStarts({ onAdd }: SillyQuickStartsProps) {
  const [adding, setAdding] = useState<string | null>(null);
  const [seed, setSeed] = useState(0);

  const visible = useMemo(() => {
    const shuffled = [...QUICK_STARTS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6);
    // `seed` forces re-shuffle when user hits the shuffle button
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const handleClick = async (item: typeof QUICK_STARTS[number]) => {
    if (adding) return;
    try {
      setAdding(item.label);
      await onAdd(item.text);
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1.5">
          <Sparkles size={11} className="text-pink-300" />
          <span className="text-[10px] font-semibold text-white/55 uppercase tracking-widest">
            Silly quick starts
          </span>
        </div>
        <button
          onClick={() => setSeed(s => s + 1)}
          className="flex items-center gap-1 text-[10px] text-white/55 hover:text-purple-200 transition-colors"
          aria-label="Shuffle quick starts"
        >
          <Shuffle size={11} />
          Shuffle
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {visible.map((item) => (
          <button
            key={item.label}
            onClick={() => handleClick(item)}
            disabled={adding === item.label}
            className="group flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] hover:bg-gradient-to-br hover:from-purple-500/25 hover:to-pink-500/20 border border-white/10 hover:border-purple-300/40 rounded-full text-xs text-white/85 hover:text-white transition-all disabled:opacity-50 hover:shadow-sm hover:shadow-purple-500/20"
          >
            <span className="text-sm group-hover:scale-110 transition-transform">{item.emoji}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
