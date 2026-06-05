'use client';

import { useState } from 'react';
import { Game } from '../lib/types';
import { GoalsPanel } from './GoalsPanel';
import { StorySoFar } from './StorySoFar';
import { ActivityFeed } from './ActivityFeed';
import { GenreEpochs } from './GenreEpochs';
import clsx from 'clsx';

type Section = 'story' | 'goals' | 'activity' | 'genres';

const SECTIONS: { id: Section; emoji: string; label: string; sub: string }[] = [
  { id: 'story',    emoji: '📖', label: 'Story',    sub: 'Your gaming chronicle' },
  { id: 'goals',    emoji: '🎯', label: 'Goals',    sub: 'Track objectives' },
  { id: 'activity', emoji: '⚡', label: 'Activity', sub: 'Recent events' },
  { id: 'genres',   emoji: '🎭', label: 'Genres',   sub: 'Taste over time' },
];

interface ChronicleTabProps {
  games: Game[];
}

export function ChronicleTab({ games }: ChronicleTabProps) {
  const [section, setSection] = useState<Section>('story');

  return (
    <div className="space-y-5">
      {/* Section Picker */}
      <div className="grid grid-cols-4 gap-2">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={clsx(
              'flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border transition-all text-center',
              section === s.id
                ? 'bg-purple-500/15 border-purple-500/30 text-purple-200'
                : 'bg-white/[0.02] border-white/5 text-white/40 hover:bg-white/[0.04] hover:text-white/60'
            )}
          >
            <span className="text-xl leading-none">{s.emoji}</span>
            <span className="text-[11px] font-semibold leading-none">{s.label}</span>
            <span className="text-[9px] text-white/30 leading-none hidden sm:block">{s.sub}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {section === 'story' && <StorySoFar games={games} />}

      {section === 'goals' && <GoalsPanel games={games} />}

      {section === 'activity' && (
        <div>
          <p className="text-xs text-white/30 mb-4">
            Everything that happened — purchases, sessions, completions, and milestones — in one feed.
          </p>
          <ActivityFeed games={games} />
        </div>
      )}

      {section === 'genres' && (
        <div>
          <p className="text-xs text-white/30 mb-4">
            See how your genre preferences have shifted month by month — your taste in gaming has a story too.
          </p>
          <GenreEpochs games={games} />
        </div>
      )}
    </div>
  );
}
