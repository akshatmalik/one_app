'use client';

import { useState } from 'react';
import { X, Activity, Film, BookOpen, Layers, Flag, Clock, Gamepad2 } from 'lucide-react';
import { Game } from '../lib/types';
import { GamingPulse } from './GamingPulse';
import { FilmstripTimeline } from './FilmstripTimeline';
import { StorySoFar } from './StorySoFar';
import { GenreEpochs } from './GenreEpochs';
import { HoursRace } from './HoursRace';
import clsx from 'clsx';

interface GamingHistoryModalProps {
  games: Game[];
  totalHours: number;
  onClose: () => void;
}

type Section = 'pulse' | 'reel' | 'story' | 'genres' | 'race';

interface SectionDef {
  id: Section;
  label: string;
  icon: React.ReactNode;
  tagline: string;
  description: string;
  gradient: string;
  accent: string;
}

const SECTIONS: SectionDef[] = [
  {
    id: 'pulse',
    label: 'Activity Pulse',
    icon: <Activity size={15} />,
    tagline: 'The heartbeat of your gaming life',
    description: 'Every session, every drought, every binge — charted over time.',
    gradient: 'from-violet-600/20 to-purple-900/10',
    accent: 'text-violet-400',
  },
  {
    id: 'reel',
    label: 'Monthly Reel',
    icon: <Film size={15} />,
    tagline: 'Your gaming seasons, frame by frame',
    description: 'Swipe through each month — top game, hours played, purchases, completions.',
    gradient: 'from-blue-600/20 to-indigo-900/10',
    accent: 'text-blue-400',
  },
  {
    id: 'story',
    label: 'Story So Far',
    icon: <BookOpen size={15} />,
    tagline: 'Your gaming journey, told in chapters',
    description: 'Narrative chronicles of your biggest gaming stretches, with AI commentary.',
    gradient: 'from-amber-600/20 to-orange-900/10',
    accent: 'text-amber-400',
  },
  {
    id: 'genres',
    label: 'Genre Eras',
    icon: <Layers size={15} />,
    tagline: 'How your tastes evolved over time',
    description: 'See which genres dominated each month and how your palette shifted.',
    gradient: 'from-emerald-600/20 to-teal-900/10',
    accent: 'text-emerald-400',
  },
  {
    id: 'race',
    label: 'Hours Race',
    icon: <Flag size={15} />,
    tagline: 'Watch your games compete for your time',
    description: 'An animated race showing which game pulled ahead — day by day, month by month.',
    gradient: 'from-rose-600/20 to-pink-900/10',
    accent: 'text-rose-400',
  },
];

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <Gamepad2 size={32} className="text-white/15" />
      <p className="text-white/30 text-sm">Add some play sessions to see your history</p>
    </div>
  );
}

export function GamingHistoryModal({ games, totalHours, onClose }: GamingHistoryModalProps) {
  const [section, setSection] = useState<Section>('pulse');

  const current = SECTIONS.find(s => s.id === section)!;
  const ownedGames = games.filter(g => g.status !== 'Wishlist');
  const hasPlayData = ownedGames.some(g => (g.playLogs?.length ?? 0) > 0);

  return (
    <div
      className="fixed inset-0 z-[70] bg-[#0a0a12] flex flex-col"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      tabIndex={-1}
    >
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 px-4 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
        {/* Section accent line */}
        <div className={clsx('w-1 h-10 rounded-full shrink-0 mt-0.5', current.id === 'pulse' ? 'bg-violet-500' : current.id === 'reel' ? 'bg-blue-500' : current.id === 'story' ? 'bg-amber-500' : current.id === 'genres' ? 'bg-emerald-500' : 'bg-rose-500')} />
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-white/90">Gaming History</h2>
          <p className={clsx('text-xs mt-0.5 font-medium', current.accent)}>{current.tagline}</p>
          <p className="text-[10px] text-white/30 mt-0.5 leading-snug">{current.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Total hours badge */}
          {totalHours > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
              <Clock size={10} className="text-white/30" />
              <span className="text-[10px] text-white/40 font-medium">{totalHours.toFixed(0)}h total</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Section nav ──────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-4 py-3 overflow-x-auto scrollbar-hide shrink-0 border-b border-white/[0.03]">
        {SECTIONS.map(s => {
          const isActive = section === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-150',
                isActive
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-white/35 hover:text-white/55 hover:bg-white/[0.03]'
              )}
            >
              <span className={clsx('shrink-0', isActive ? s.accent : 'text-white/30')}>
                {s.icon}
              </span>
              {s.label}
            </button>
          );
        })}
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-5 min-h-full">
          {!hasPlayData ? (
            <EmptyState />
          ) : (
            <>
              {section === 'pulse' && <GamingPulse games={games} />}
              {section === 'reel' && <FilmstripTimeline games={games} />}
              {section === 'story' && <StorySoFar games={games} />}
              {section === 'genres' && <GenreEpochs games={games} />}
              {section === 'race' && <HoursRace games={games} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
