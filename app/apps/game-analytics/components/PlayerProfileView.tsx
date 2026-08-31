'use client';

import { ReactNode, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Clock3,
  Compass,
  Gamepad2,
  Heart,
  Layers3,
  Sparkles,
  Star,
  Target,
  Trophy,
  Wallet,
} from 'lucide-react';
import { AnalyticsSummary } from '../lib/types';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { getEffectiveLoveLevel } from '../lib/love';
import { getTotalHours, parseLocalDate } from '../lib/calculations';

interface PlayerProfileViewProps {
  games: GameWithMetrics[];
  summary: AnalyticsSummary;
  preferredEcosystem: 'PlayStation' | 'Multi-platform';
  onOpenStory: () => void;
  onOpenRankings: () => void;
  deepStats: ReactNode;
}

export function PlayerProfileView({ games, summary, preferredEcosystem, onOpenStory, onOpenRankings, deepStats }: PlayerProfileViewProps) {
  const [showDeepStats, setShowDeepStats] = useState(false);
  const profile = useMemo(() => {
    const owned = games.filter(game => game.status !== 'Wishlist');
    const played = owned.filter(game => getTotalHours(game) > 0);
    const loved = played.filter(game => (getEffectiveLoveLevel(game) ?? 0) >= 3);
    const sessions = played.reduce((total, game) => total + (game.playLogs?.length ?? 0), 0);
    const genres = new Set(played.map(game => game.genre).filter(Boolean));
    const platforms = owned.reduce<Record<string, number>>((totals, game) => {
      const rawPlatform = game.platform || 'Unknown';
      const platform = /^(ps\d|playstation)/i.test(rawPlatform) ? 'PlayStation' : rawPlatform;
      totals[platform] = (totals[platform] ?? 0) + 1;
      return totals;
    }, {});
    const topPlatform = preferredEcosystem === 'PlayStation'
      ? 'PlayStation'
      : Object.entries(platforms).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'your console';
    const topGenre = Object.entries(summary.hoursByGenre).sort((a, b) => b[1] - a[1])[0];
    const averageDepth = played.length > 0 ? summary.totalHours / played.length : 0;
    const loveRate = played.length > 0 ? Math.round((loved.length / played.length) * 100) : 0;

    let archetype = 'The Selective Player';
    if (summary.completionRate >= 60) archetype = 'The Story Finisher';
    else if (averageDepth >= 45) archetype = 'The Deep-Dive Player';
    else if (genres.size >= 7) archetype = 'The Curious Explorer';
    else if (loveRate >= 35) archetype = 'The Heart-First Player';

    const currentYear = new Date().getFullYear();
    const allLogs = played.flatMap(game => (game.playLogs ?? []).map(log => ({ game, log })));
    const loggedYears = allLogs.map(item => parseLocalDate(item.log.date).getFullYear());
    const year = loggedYears.includes(currentYear)
      ? currentYear
      : loggedYears.length > 0 ? Math.max(...loggedYears) : currentYear;
    const yearLogs = allLogs.filter(item => parseLocalDate(item.log.date).getFullYear() === year);
    const yearHours = yearLogs.reduce((total, item) => total + item.log.hours, 0);
    const yearGames = new Set(yearLogs.map(item => item.game.id)).size;
    const yearDays = new Set(yearLogs.map(item => item.log.date)).size;

    const latestLogTime = allLogs.reduce((latest, item) => Math.max(latest, parseLocalDate(item.log.date).getTime()), 0);
    const rhythmAnchor = latestLogTime ? new Date(latestLogTime) : new Date();
    const rhythmStart = new Date(rhythmAnchor.getFullYear(), rhythmAnchor.getMonth(), 1);
    const rhythmEnd = new Date(rhythmAnchor.getFullYear(), rhythmAnchor.getMonth() + 1, 1);
    const previousStart = new Date(rhythmAnchor.getFullYear(), rhythmAnchor.getMonth() - 1, 1);
    const rhythmLogs = allLogs.filter(item => {
      const date = parseLocalDate(item.log.date);
      return date >= rhythmStart && date < rhythmEnd;
    });
    const previousLogs = allLogs.filter(item => {
      const date = parseLocalDate(item.log.date);
      return date >= previousStart && date < rhythmStart;
    });
    const rhythmHours = rhythmLogs.reduce((total, item) => total + item.log.hours, 0);
    const previousHours = previousLogs.reduce((total, item) => total + item.log.hours, 0);
    const rhythmByGame = new Map<string, { game: GameWithMetrics; hours: number }>();
    for (const item of rhythmLogs) {
      const existing = rhythmByGame.get(item.game.id);
      rhythmByGame.set(item.game.id, { game: item.game, hours: (existing?.hours ?? 0) + item.log.hours });
    }
    const rhythmTop = [...rhythmByGame.values()].sort((a, b) => b.hours - a.hours)[0];
    const rhythmFocus = rhythmHours > 0 && rhythmTop ? Math.round((rhythmTop.hours / rhythmHours) * 100) : 0;
    const rhythmIsCurrent = rhythmStart.getFullYear() === currentYear && rhythmStart.getMonth() === new Date().getMonth();

    return {
      owned,
      played,
      loved,
      sessions,
      topPlatform,
      topGenre,
      averageDepth,
      loveRate,
      archetype,
      year,
      yearHours,
      yearGames,
      yearDays,
      rhythm: {
        label: rhythmStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
        isCurrent: rhythmIsCurrent,
        hours: rhythmHours,
        previousHours,
        days: new Set(rhythmLogs.map(item => item.log.date)).size,
        sessions: rhythmLogs.length,
        top: rhythmTop,
        focus: rhythmFocus,
      },
    };
  }, [games, preferredEcosystem, summary]);

  const topGenreShare = profile.topGenre && summary.totalHours > 0
    ? Math.round((profile.topGenre[1] / summary.totalHours) * 100)
    : 0;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] border border-purple-300/15 bg-gradient-to-br from-purple-950/90 via-[#151321] to-blue-950/70 p-6 sm:p-8">
        <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-purple-200/60">Your player profile</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">{profile.archetype}</h2>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-purple-200"><Gamepad2 size={20} /></span>
          </div>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/55 sm:text-base">
            {profile.topPlatform} is home{profile.topGenre ? `, and ${profile.topGenre[0]} has claimed the largest part of your playtime` : ''}. You tend to {profile.averageDepth >= 35 ? 'live inside a game once it earns your attention' : 'move between games until one truly clicks'}.
          </p>

          <div className="mt-7 grid grid-cols-3 gap-2">
            <ProfileStat value={`${summary.totalHours.toFixed(0)}h`} label="played" />
            <ProfileStat value={`${summary.completionRate.toFixed(0)}%`} label="finished" />
            <ProfileStat value={String(profile.loved.length)} label="loved" />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">{profile.year === new Date().getFullYear() ? `${profile.year} so far` : 'Latest active year'}</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Your {profile.year} chapter</h3>
          </div>
          <button onClick={onOpenStory} className="flex min-h-10 items-center gap-1.5 rounded-xl bg-purple-500/10 px-3 text-xs font-semibold text-purple-200"><BookOpen size={14} /> See story</button>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <ProfileStat value={`${profile.yearHours.toFixed(profile.yearHours % 1 ? 1 : 0)}h`} label="hours logged" muted />
          <ProfileStat value={String(profile.yearGames)} label="games played" muted />
          <ProfileStat value={String(profile.yearDays)} label="play days" muted />
        </div>
      </section>

      {profile.rhythm.hours > 0 && (
        <section className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300/60">{profile.rhythm.isCurrent ? 'This month' : 'Latest active month'} · {profile.rhythm.label}</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Your recent rhythm</h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/50">
            {profile.rhythm.top
              ? `${profile.rhythm.top.game.name} held ${profile.rhythm.focus}% of your attention with ${profile.rhythm.top.hours.toFixed(1)} hours.`
              : 'Your next play log will begin this chapter.'}
            {profile.rhythm.previousHours > 0
              ? ` That is ${Math.abs(Math.round(((profile.rhythm.hours - profile.rhythm.previousHours) / profile.rhythm.previousHours) * 100))}% ${profile.rhythm.hours >= profile.rhythm.previousHours ? 'more' : 'less'} playtime than the month before.`
              : ''}
          </p>
          <div className="mt-5 grid grid-cols-4 gap-2">
            <ProfileStat value={`${profile.rhythm.hours.toFixed(profile.rhythm.hours % 1 ? 1 : 0)}h`} label="logged" muted />
            <ProfileStat value={String(profile.rhythm.days)} label="play days" muted />
            <ProfileStat value={String(profile.rhythm.sessions)} label="sessions" muted />
            <ProfileStat value={`${profile.rhythm.focus}%`} label="top-game focus" muted />
          </div>
        </section>
      )}

      <button onClick={onOpenRankings} className="flex min-h-16 w-full items-center gap-4 rounded-3xl border border-amber-300/15 bg-gradient-to-r from-amber-500/[0.09] to-purple-500/[0.06] px-5 text-left">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300"><Trophy size={18} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-white/85">Open your ELO rankings</span>
          <span className="mt-0.5 block text-xs text-white/40">Head-to-head battles, tiers, and your all-time game order</span>
        </span>
        <ArrowRight size={16} className="shrink-0 text-white/25" />
      </button>

      <section>
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Not one score</p>
          <h3 className="mt-1 text-lg font-semibold text-white">How you play</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ProfileDimension icon={<Clock3 size={16} />} label="Depth" evidence={`${profile.averageDepth.toFixed(0)}h / game`} headline={`${profile.averageDepth.toFixed(0)} hours per played game`} detail={profile.averageDepth >= 35 ? 'You commit deeply once a game earns its place.' : 'You sample broadly and keep only what holds you.'} />
          <ProfileDimension icon={<Target size={16} />} label="Finish" evidence={`${summary.completionRate.toFixed(0)}%`} headline={`${summary.completedCount} stories completed`} detail={`${summary.notStartedCount} are still waiting for their opening scene.`} />
          <ProfileDimension icon={<Heart size={16} />} label="Attachment" evidence={`${profile.loved.length} / ${profile.played.length}`} headline={`${profile.loved.length} ${profile.loved.length === 1 ? 'game' : 'games'} you love`} detail="Love stays separate from quality—this is what became yours." />
          <ProfileDimension icon={<Compass size={16} />} label="Variety" evidence={`${new Set(profile.played.map(game => game.genre).filter(Boolean)).size} genres`} headline={`${new Set(profile.played.map(game => game.genre).filter(Boolean)).size} genres explored`} detail={profile.topGenre ? `${profile.topGenre[0]} owns ${topGenreShare}% of all your hours.` : 'Your taste map will form as you log games.'} />
        </div>
      </section>

      <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.015] p-5">
        <div className="flex items-center gap-2"><Sparkles size={15} className="text-amber-300" /><h3 className="text-sm font-semibold text-white">Your library in four truths</h3></div>
        <div className="mt-4 divide-y divide-white/[0.06]">
          <TruthRow icon={<Trophy size={15} />} label="Most played" value={summary.mostPlayed ? `${summary.mostPlayed.name} · ${summary.mostPlayed.hours.toFixed(0)}h` : 'Still emerging'} />
          <TruthRow icon={<Star size={15} />} label="Highest rated" value={summary.highestRated ? `${summary.highestRated.name} · ${summary.highestRated.rating}/10` : 'Not rated yet'} />
          <TruthRow icon={<Wallet size={15} />} label="Library value" value={summary.averageCostPerHour > 0 ? `$${summary.averageCostPerHour.toFixed(2)} per hour` : 'No spend needed'} />
          <TruthRow icon={<Layers3 size={15} />} label="PS Plus saved" value={summary.totalSaved > 0 ? `$${summary.totalSaved.toFixed(0)} across ${summary.freeGamesCount} games` : 'No claimed value logged yet'} />
        </div>
      </section>

      <section className="rounded-3xl border border-white/[0.08] bg-white/[0.02]">
        <button onClick={() => setShowDeepStats(value => !value)} className="flex min-h-16 w-full items-center justify-between px-5 text-left">
          <div>
            <p className="text-sm font-semibold text-white/80">Deep stats lab</p>
            <p className="mt-0.5 text-xs text-white/35">Charts, budgets, trophies, comparisons, and every raw breakdown</p>
          </div>
          <ChevronDown size={17} className={showDeepStats ? 'shrink-0 rotate-180 text-white/35 transition-transform' : 'shrink-0 text-white/35 transition-transform'} />
        </button>
        {showDeepStats && <div className="border-t border-white/[0.07] p-4 sm:p-6">{deepStats}</div>}
      </section>
    </div>
  );
}

function ProfileStat({ value, label, muted = false }: { value: string; label: string; muted?: boolean }) {
  return <div className={muted ? 'rounded-2xl bg-white/[0.035] px-3 py-3 text-center' : 'rounded-2xl border border-white/[0.08] bg-black/20 px-3 py-3 text-center backdrop-blur-sm'}><p className="text-xl font-black text-white">{value}</p><p className="mt-0.5 text-[10px] text-white/35">{label}</p></div>;
}

function ProfileDimension({ icon, label, evidence, headline, detail }: { icon: ReactNode; label: string; evidence: string; headline: string; detail: string }) {
  return (
    <article className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5">
      <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-white/40">{icon}{label}</span><span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] font-bold text-white/55">{evidence}</span></div>
      <p className="mt-4 text-base font-semibold text-white/85">{headline}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-white/40">{detail}</p>
    </article>
  );
}

function TruthRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-purple-200/70">{icon}</span><div className="min-w-0"><p className="text-[10px] uppercase tracking-[0.13em] text-white/30">{label}</p><p className="mt-0.5 truncate text-sm font-medium text-white/75">{value}</p></div><ArrowRight size={14} className="ml-auto shrink-0 text-white/15" /></div>;
}
