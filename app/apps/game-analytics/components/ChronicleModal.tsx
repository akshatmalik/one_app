'use client';

import { useState, useMemo } from 'react';
import {
  X, BookOpen, Layers, Zap, Calendar, Grid3X3,
  Gamepad2, DollarSign, TrendingUp, Clock, Trophy,
} from 'lucide-react';
import { Game } from '../lib/types';
import { FilmstripTimeline } from './FilmstripTimeline';
import { GenreEpochs } from './GenreEpochs';
import { HoursRace } from './HoursRace';
import { ActivityFeed } from './ActivityFeed';
import { StorySoFar } from './StorySoFar';
import { getTotalHours } from '../lib/calculations';
import clsx from 'clsx';

interface ChronicleModalProps {
  games: Game[];
  onClose: () => void;
}

function SectionDivider({ icon, label, subtitle }: { icon: React.ReactNode; label: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">{label}</div>
        {subtitle && <div className="text-[10px] text-white/20">{subtitle}</div>}
      </div>
      <div className="flex-1 h-px bg-white/[0.04] ml-2" />
    </div>
  );
}

export function ChronicleModal({ games, onClose }: ChronicleModalProps) {
  const [raceVisible, setRaceVisible] = useState(false);

  const ownedGames = useMemo(() => games.filter(g => g.status !== 'Wishlist'), [games]);

  const totalHours = useMemo(
    () => ownedGames.reduce((sum, g) => sum + getTotalHours(g), 0),
    [ownedGames],
  );

  const totalSpent = useMemo(
    () => ownedGames.filter(g => !g.acquiredFree).reduce((sum, g) => sum + g.price, 0),
    [ownedGames],
  );

  const completedCount = useMemo(
    () => ownedGames.filter(g => g.status === 'Completed').length,
    [ownedGames],
  );

  const abandonedCount = useMemo(
    () => ownedGames.filter(g => g.status === 'Abandoned').length,
    [ownedGames],
  );

  const avgCostPerHour = totalHours > 0 ? totalSpent / totalHours : 0;

  const firstGame = useMemo(
    () =>
      [...ownedGames]
        .filter(g => g.datePurchased)
        .sort((a, b) => a.datePurchased!.localeCompare(b.datePurchased!))[0],
    [ownedGames],
  );

  const mostPlayedGame = useMemo(
    () => [...ownedGames].sort((a, b) => getTotalHours(b) - getTotalHours(a))[0],
    [ownedGames],
  );

  const yearsActive = useMemo(() => {
    if (!firstGame?.datePurchased) return null;
    const start = new Date(firstGame.datePurchased);
    const now = new Date();
    const totalMonths =
      (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    if (totalMonths < 1) return 'Just started';
    if (totalMonths < 12) return `${totalMonths} month${totalMonths !== 1 ? 's' : ''}`;
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    if (months === 0) return `${years} year${years !== 1 ? 's' : ''}`;
    return `${years}y ${months}m`;
  }, [firstGame]);

  const firstGameDate = useMemo(() => {
    if (!firstGame?.datePurchased) return null;
    return new Date(firstGame.datePurchased).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [firstGame]);

  const hasGenreData = useMemo(() => games.some(g => g.genre), [games]);
  const hasPlayLogs = useMemo(() => games.some(g => g.playLogs && g.playLogs.length > 0), [games]);
  const hasEnoughForRace = useMemo(
    () => ownedGames.filter(g => getTotalHours(g) > 0).length >= 3,
    [ownedGames],
  );

  if (ownedGames.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#090910]">
      {/* ── Sticky header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/5 bg-[#090910]/95 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center">
            <BookOpen size={15} className="text-purple-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Gaming Chronicle</div>
            {yearsActive && (
              <div className="text-[11px] text-white/30 leading-none mt-0.5">{yearsActive} of gaming history</div>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
          aria-label="Close chronicle"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Scrollable content ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-6 py-6 pb-24 space-y-8 max-w-4xl mx-auto">

          {/* ── Hero: Lifetime Snapshot ───────────────────────────────── */}
          <div className="relative rounded-2xl overflow-hidden border border-purple-500/20">
            {/* Background: most-played game's thumbnail, very faint */}
            {mostPlayedGame?.thumbnail && (
              <>
                <img
                  src={mostPlayedGame.thumbnail}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-[0.08]"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-purple-950/70 via-black/50 to-[#090910]/90" />
              </>
            )}
            {!mostPlayedGame?.thumbnail && (
              <div className="absolute inset-0 bg-gradient-to-br from-purple-950/60 to-blue-950/40" />
            )}

            <div className="relative p-6 sm:p-8">
              {/* Label */}
              <div className="text-[10px] font-semibold text-purple-300/50 uppercase tracking-widest mb-3">
                Your Gaming Life
              </div>

              {/* Giant hours number */}
              <div className="flex items-end gap-2 mb-1">
                <span className="text-5xl sm:text-6xl font-black text-white leading-none">
                  {totalHours >= 1000
                    ? `${(totalHours / 1000).toFixed(1)}k`
                    : Math.round(totalHours).toLocaleString()}
                </span>
                <span className="text-2xl text-white/30 font-light pb-0.5">hours</span>
              </div>

              {/* Subtitle line */}
              <div className="text-white/40 text-sm mb-6">
                across{' '}
                <span className="text-white/60 font-medium">{ownedGames.length}</span>{' '}
                game{ownedGames.length !== 1 ? 's' : ''}
                {completedCount > 0 && (
                  <> ·{' '}
                    <span className="text-emerald-400/70">{completedCount} finished</span>
                  </>
                )}
                {totalSpent > 0 && (
                  <> · <span className="text-white/40">${totalSpent.toLocaleString('en-US', { maximumFractionDigits: 0 })} invested</span></>
                )}
              </div>

              {/* Key stats */}
              <div className="grid grid-cols-3 gap-3 sm:gap-6">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Gamepad2 size={11} className="text-white/25" />
                    <span className="text-[9px] text-white/25 uppercase tracking-wide font-medium">Library</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white">{ownedGames.length}</div>
                  <div className="text-xs text-white/30">
                    {completedCount} done{abandonedCount > 0 ? ` · ${abandonedCount} abandoned` : ''}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <DollarSign size={11} className="text-white/25" />
                    <span className="text-[9px] text-white/25 uppercase tracking-wide font-medium">Per Hour</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white">
                    {avgCostPerHour > 0 ? `$${avgCostPerHour.toFixed(2)}` : '—'}
                  </div>
                  <div className="text-xs text-white/30">avg cost/hr</div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <TrendingUp size={11} className="text-white/25" />
                    <span className="text-[9px] text-white/25 uppercase tracking-wide font-medium">Journey</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white">{yearsActive ?? '—'}</div>
                  <div className="text-xs text-white/30">of gaming</div>
                </div>
              </div>

              {/* Journey started line */}
              {firstGame && (
                <div className="mt-5 pt-4 border-t border-white/[0.06] text-[11px] text-white/25 leading-relaxed">
                  Journey started with{' '}
                  <span className="text-white/40 font-medium">{firstGame.name}</span>
                  {firstGameDate && <> on {firstGameDate}</>}
                  {mostPlayedGame && mostPlayedGame.id !== firstGame.id && (
                    <> · most hours on <span className="text-white/40 font-medium">{mostPlayedGame.name}</span></>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Film Strip ───────────────────────────────────────────── */}
          <div>
            <SectionDivider
              icon={<Grid3X3 size={13} className="text-purple-400" />}
              label="Monthly Film Strip"
              subtitle="Your gaming history, month by month"
            />
            <div className="mt-3">
              <FilmstripTimeline games={games} />
            </div>
          </div>

          {/* ── Genre Evolution ──────────────────────────────────────── */}
          {hasGenreData && (
            <div>
              <SectionDivider
                icon={<Layers size={13} className="text-indigo-400" />}
                label="Genre Evolution"
                subtitle="How your taste changed over time"
              />
              <div className="mt-3">
                <GenreEpochs games={games} />
              </div>
            </div>
          )}

          {/* ── Hours Race ───────────────────────────────────────────── */}
          {hasEnoughForRace && (
            <div>
              <SectionDivider
                icon={<Zap size={13} className="text-yellow-400" />}
                label="Hours Race"
                subtitle="An animated ranking of your most-played games"
              />
              <div className="mt-3">
                {raceVisible ? (
                  <div className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
                    <HoursRace games={games} maxBars={8} />
                  </div>
                ) : (
                  <button
                    onClick={() => setRaceVisible(true)}
                    className="w-full p-8 rounded-2xl border border-white/5 bg-white/[0.02] text-center hover:bg-white/[0.04] transition-colors group cursor-pointer"
                  >
                    <div className="text-4xl mb-3">🏁</div>
                    <p className="text-sm text-white/35 group-hover:text-white/55 transition-colors mb-4">
                      Watch your top games race to accumulate hours — an animated bar chart
                      across your whole gaming history
                    </p>
                    <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-500/10 text-yellow-300/80 text-sm font-medium border border-yellow-500/20 group-hover:bg-yellow-500/15 transition-colors">
                      <Zap size={14} />
                      Start the race
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Activity Feed ────────────────────────────────────────── */}
          {hasPlayLogs && (
            <div>
              <SectionDivider
                icon={<Calendar size={13} className="text-cyan-400" />}
                label="Activity Feed"
                subtitle="Every session, purchase, and milestone in chronological order"
              />
              <div className="mt-3">
                <ActivityFeed games={games} />
              </div>
            </div>
          )}

          {/* ── Story So Far ─────────────────────────────────────────── */}
          <div>
            <SectionDivider
              icon={<BookOpen size={13} className="text-emerald-400" />}
              label="Story So Far"
              subtitle="Your gaming journey, chapter by chapter, with AI narration"
            />
            <div className="mt-3">
              <StorySoFar games={games} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
