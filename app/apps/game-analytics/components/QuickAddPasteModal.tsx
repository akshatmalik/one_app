'use client';

import { useState } from 'react';
import { X, ClipboardList, Loader2 } from 'lucide-react';

interface QuickAddPasteModalProps {
  onAdd: (names: string[]) => Promise<void>;
  onClose: () => void;
}

// NewIdeas100-June2026 — #8 Quick-Add by Paste.
export function QuickAddPasteModal({ onAdd, onClose }: QuickAddPasteModalProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const names = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const submit = async () => {
    if (!names.length) return;
    setLoading(true);
    try {
      await onAdd(names);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#12121a] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <ClipboardList size={16} className="text-purple-400" /> Quick Add by Paste
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80">
            <X size={18} />
          </button>
        </div>
        <p className="mb-2 text-xs text-white/40">One game name per line. Each becomes a draft you can flesh out later.</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          autoFocus
          placeholder={'Elden Ring\nHades\nHollow Knight'}
          className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-purple-500/40 focus:outline-none"
        />
        <div className="mt-3 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading || !names.length}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Add {names.length || ''} game{names.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
