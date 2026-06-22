'use client';

import { useEffect, useState } from 'react';
import { Undo2, X } from 'lucide-react';

interface UndoToastProps {
  message: string;
  durationMs: number;
  onUndo: () => void;
  onDismiss: () => void;
}

export function UndoToast({ message, durationMs, onUndo, onDismiss }: UndoToastProps) {
  const [visible, setVisible] = useState(false);
  const [barShrunk, setBarShrunk] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 20);
    const shrinkTimer = setTimeout(() => setBarShrunk(true), 40);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(shrinkTimer);
    };
  }, []);

  return (
    <div className="fixed bottom-20 sm:bottom-6 inset-x-0 z-[60] flex justify-center px-4 pointer-events-none">
      <div
        className={`pointer-events-auto flex items-center gap-3 rounded-xl bg-zinc-900 border border-white/10 shadow-2xl px-4 py-3 max-w-sm w-full transition-all duration-300 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        }`}
      >
        <span className="flex-1 text-sm text-white/90">{message}</span>
        <button
          onClick={onUndo}
          className="flex items-center gap-1 text-sm font-semibold text-purple-300 hover:text-purple-200 transition-colors shrink-0"
        >
          <Undo2 size={14} />
          Undo
        </button>
        <button
          onClick={onDismiss}
          className="text-white/30 hover:text-white/60 transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
        <div
          className="absolute left-0 bottom-0 h-0.5 bg-purple-400/70 rounded-full transition-[width] ease-linear"
          style={{ width: barShrunk ? '0%' : '100%', transitionDuration: `${durationMs}ms` }}
        />
      </div>
    </div>
  );
}
