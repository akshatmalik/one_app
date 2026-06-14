'use client';

import { useEffect, useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { pickNextFeature, markFeatureSeen, dismissFeature, DiscoverableFeature } from '../lib/feature-discovery';

interface TryThisPromptProps {
  onNavigate?: (tab: string) => void;
}

// NewIdeas100-June2026 — #101 "Try This" discovery prompt.
export function TryThisPrompt({ onNavigate }: TryThisPromptProps) {
  const [feature, setFeature] = useState<DiscoverableFeature | null>(null);

  useEffect(() => {
    const next = pickNextFeature();
    if (next) {
      setFeature(next);
      markFeatureSeen(next.id);
    }
  }, []);

  if (!feature) return null;

  const dismiss = () => {
    dismissFeature(feature.id);
    setFeature(null);
  };

  return (
    <div className="mb-3 flex items-start gap-3 rounded-xl border border-yellow-400/20 bg-gradient-to-r from-yellow-500/10 to-amber-500/5 px-4 py-3">
      <Lightbulb size={18} className="mt-0.5 shrink-0 text-yellow-400" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-yellow-400/80">Try this</p>
        <p className="mt-0.5 text-sm text-white/80">{feature.blurb}</p>
        {feature.tab && feature.cta && (
          <button
            onClick={() => {
              onNavigate?.(feature.tab!);
              dismiss();
            }}
            className="mt-1.5 text-xs font-medium text-yellow-300 hover:text-yellow-200"
          >
            {feature.cta} →
          </button>
        )}
      </div>
      <button onClick={dismiss} className="shrink-0 text-white/30 transition-colors hover:text-white/70" aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}
