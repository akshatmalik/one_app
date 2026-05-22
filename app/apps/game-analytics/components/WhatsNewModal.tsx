'use client';

import { useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import whatsNewData from '../data/whats-new.json';

interface WhatsNewEntry {
  date: string;
  area: string;
  title: string;
  body: string;
}

interface WhatsNewModalProps {
  onClose: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function WhatsNewModal({ onClose }: WhatsNewModalProps) {
  const entries = (whatsNewData.entries ?? []) as WhatsNewEntry[];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <Sparkles size={16} className="text-purple-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">What&apos;s New</p>
            <p className="text-[11px] text-white/40">
              {entries.length === 0 ? 'No updates yet' : `${entries.length} update${entries.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {entries.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">✨</div>
              <p className="text-sm text-white/40">Nothing new yet</p>
              <p className="text-xs text-white/20 mt-1">Updates will appear here as the app improves</p>
            </div>
          ) : (
            entries.map((entry, i) => (
              <div
                key={`${entry.date}-${i}`}
                className="border border-white/10 bg-white/5 rounded-lg p-3"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] uppercase tracking-wide text-purple-300/80 bg-purple-500/10 px-1.5 py-0.5 rounded">
                    {entry.area}
                  </span>
                  <span className="text-[10px] text-white/30">{formatDate(entry.date)}</span>
                </div>
                <p className="text-sm font-medium text-white leading-snug">{entry.title}</p>
                <p className="text-xs text-white/60 mt-1 leading-relaxed">{entry.body}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
