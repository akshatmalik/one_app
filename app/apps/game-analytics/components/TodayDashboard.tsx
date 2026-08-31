'use client';

import { useMemo } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  Clock3,
  Gamepad2,
  Heart,
  ListOrdered,
  Play,
  Plus,
  Radar,
  Sparkles,
  Star,
} from 'lucide-react';
import { Game } from '../lib/types';
import {
  ReplayCandidate,
  WishlistAffordabilityItem,
  getTotalHours,
  parseLocalDate,
} from '../lib/calculations';
import { TimeCapsule } from '../lib/timecapsule-storage';
import { getEffectiveLoveLevel, getLoveMeta } from '../lib/love';
import { OnThisDayCard } from './OnThisDayCard';
import { FortuneCookie } from './FortuneCookie';
import { DailyQuestPanel } from './DailyQuestPanel';

interface TodayDashboardProps {
  games: Game[];
  userId: string;
  replayCandidate?: ReplayCandidate;
  wishlistNextAffordable?: WishlistAffordabilityItem;
  onPlayTonight: () => void;
  onOpenGame: (game: Game) => void;
  onLogTime: (game: Game) => void;
  onOpenStory: () => void;
  onOpenInsights: () => void;
  dueCapsules?: TimeCapsule[];
  onOpenTimeCapsule?: () => void;
  onOpenReplayRadar?: () => void;
  onOpenQueue?: () => void;
  onOpenReleases?: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'One more chapter?';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function latestPlayDate(game: Game): number {
  const latestLog = game.playLogs?.reduce((latest, log) => {
    const timestamp = parseLocalDate(log.date).getTime();
    return Math.max(latest, timestamp);
  }, 0) ?? 0;
  return latestLog || (game.startDate ? parseLocalDate(game.startDate).getTime() : 0);
}

function daysSince(timestamp: number): number | null {
  if (!timestamp) return null;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
}

export function TodayDashboard({
  games,
  userId,
  replayCandidate,
  wishlistNextAffordable,
  onPlayTonight,
  onOpenGame,
  onLogTime,
  onOpenStory,
  onOpenInsights,
  dueCapsules,
  onOpenTimeCapsule,
  onOpenReplayRadar,
  onOpenQueue,
  onOpenReleases,
}: TodayDashboardProps) {
  const greeting = useMemo(() => getGreeting(), []);
  const dateLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
    [],
  );

  const currentGame = useMemo(() => {
    const active = games.filter(game => game.status === 'In Progress');
    const candidates = active.length > 0
      ? active
      : games.filter(game => game.status !== 'Wishlist' && getTotalHours(game) > 0);
    return [...candidates].sort((a, b) => latestPlayDate(b) - latestPlayDate(a))[0];
  }, [games]);

  const weekStory = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    const logs = games.flatMap(game => (game.playLogs ?? []).map(log => ({ game, log })))
      .filter(({ log }) => parseLocalDate(log.date).getTime() >= start.getTime());
    const hours = logs.reduce((total, item) => total + item.log.hours, 0);
    const days = new Set(logs.map(item => item.log.date)).size;
    const perGame = new Map<string, { game: Game; hours: number }>();
    for (const item of logs) {
      const existing = perGame.get(item.game.id);
      perGame.set(item.game.id, { game: item.game, hours: (existing?.hours ?? 0) + item.log.hours });
    }
    const top = [...perGame.values()].sort((a, b) => b.hours - a.hours)[0];
    return { hours, days, sessions: logs.length, top };
  }, [games]);

  const nextRelease = useMemo(() => games
    .filter(game => game.status === 'Wishlist' && game.releaseDate && parseLocalDate(game.releaseDate).getTime() >= Date.now())
    .sort((a, b) => parseLocalDate(a.releaseDate!).getTime() - parseLocalDate(b.releaseDate!).getTime())[0], [games]);

  const lovedMemory = useMemo(() => games
    .filter(game => (getEffectiveLoveLevel(game) ?? 0) >= 3)
    .sort((a, b) => latestPlayDate(b) - latestPlayDate(a))[0], [games]);

  if (games.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-blue-500/5 px-6 py-16 text-center">
        <Gamepad2 size={38} className="mx-auto mb-4 text-purple-300/60" />
        <h2 className="text-xl font-semibold text-white">Your story starts with one game</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/45">Add what you are playing now. The library, stats, and Chronicle will grow from real play—not setup work.</p>
      </div>
    );
  }

  const currentHours = currentGame ? getTotalHours(currentGame) : 0;
  const currentLove = currentGame ? getLoveMeta(getEffectiveLoveLevel(currentGame)) : null;
  const currentLastPlayed = currentGame ? daysSince(latestPlayDate(currentGame)) : null;
  const expectedProgress = currentGame?.expectedHours
    ? Math.min(100, Math.round((currentHours / currentGame.expectedHours) * 100))
    : null;
  const nextReleaseDays = nextRelease?.releaseDate
    ? Math.max(0, Math.ceil((parseLocalDate(nextRelease.releaseDate).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <div className="space-y-5">
      <section className="relative min-h-[390px] overflow-hidden rounded-[28px] border border-white/10 bg-[#11111a] shadow-2xl shadow-black/20">
        {currentGame?.thumbnail ? (
          <img src={currentGame.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-[#11111a] to-blue-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/45 to-[#09090f]" />
        <div className="relative flex min-h-[390px] flex-col justify-between p-5 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-white">{greeting}</p>
              <p className="mt-0.5 text-xs text-white/55">{dateLabel}</p>
            </div>
            <button onClick={onPlayTonight} className="flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-black/35 px-4 text-xs font-semibold text-white/80 backdrop-blur-xl">
              <Play size={13} fill="currentColor" /> Pick for me
            </button>
          </div>

          {currentGame && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-purple-200/80">Continue your story</p>
              <h2 className="max-w-[92%] text-3xl font-black leading-[1.02] tracking-tight text-white sm:text-4xl">{currentGame.name}</h2>
              <p className="mt-2 text-sm text-white/60">
                {currentLastPlayed === 0 ? 'Played today' : currentLastPlayed === 1 ? 'Last played yesterday' : currentLastPlayed !== null ? `Last played ${currentLastPlayed} days ago` : 'Ready for its first chapter'}
                {currentGame.platform ? ` · ${currentGame.platform}` : ''}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-md"><Clock3 size={12} className="mr-1.5 inline" />{currentHours.toFixed(currentHours % 1 ? 1 : 0)}h played</span>
                {currentGame.rating > 0 && <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-md"><Star size={12} className="mr-1.5 inline text-amber-300" fill="currentColor" />{currentGame.rating}/10</span>}
                {currentLove && currentLove.level >= 3 && <span className="rounded-full bg-pink-500/20 px-3 py-1.5 text-xs font-semibold text-pink-100 backdrop-blur-md"><Heart size={12} className="mr-1.5 inline" fill="currentColor" />{currentLove.shortLabel}</span>}
              </div>

              {expectedProgress !== null && (
                <div className="mt-4 max-w-sm">
                  <div className="mb-1.5 flex justify-between text-[10px] text-white/45"><span>Your chapter</span><span>{expectedProgress}%</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-purple-400 to-fuchsia-400" style={{ width: `${expectedProgress}%` }} /></div>
                </div>
              )}

              <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
                <button onClick={() => onLogTime(currentGame)} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold text-black active:scale-[0.98]">
                  <Plus size={16} /> Log what you played
                </button>
                <button onClick={() => onOpenGame(currentGame)} aria-label={`Open ${currentGame.name}`} className="flex min-h-12 min-w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white backdrop-blur-md">
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-purple-300/70">This chapter</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Your last seven days</h3>
          </div>
          <button onClick={onOpenStory} className="flex min-h-10 items-center gap-1.5 rounded-xl bg-purple-500/10 px-3 text-xs font-semibold text-purple-200"><BookOpen size={14} /> Chronicle</button>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <StoryNumber value={`${weekStory.hours.toFixed(weekStory.hours % 1 ? 1 : 0)}h`} label="played" />
          <StoryNumber value={String(weekStory.days)} label="play days" />
          <StoryNumber value={String(weekStory.sessions)} label="sessions" />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-white/45">
          {weekStory.top
            ? `${weekStory.top.game.name} carried the week with ${weekStory.top.hours.toFixed(1)} hours.`
            : 'A quiet week so far. Your next log becomes the opening scene.'}
        </p>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Your orbit</p>
            <h3 className="mt-1 text-lg font-semibold text-white">What matters next</h3>
          </div>
          <button onClick={onOpenInsights} className="flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-white/55"><BarChart3 size={14} /> Player profile</button>
        </div>
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {nextRelease && nextReleaseDays !== null && (
            <OrbitCard icon={<CalendarDays size={16} />} eyebrow="On the horizon" title={nextRelease.name} detail={nextReleaseDays === 0 ? 'Releases today' : `${nextReleaseDays} days until release`} color="text-blue-300" onClick={onOpenReleases} />
          )}
          {replayCandidate && onOpenReplayRadar && (
            <OrbitCard icon={<Radar size={16} />} eyebrow="Another chapter?" title={replayCandidate.game.name} detail={replayCandidate.headline} color="text-emerald-300" onClick={onOpenReplayRadar} />
          )}
          {lovedMemory && (
            <OrbitCard icon={<Heart size={16} fill="currentColor" />} eyebrow="A game you loved" title={lovedMemory.name} detail={lovedMemory.review || lovedMemory.notes || `${getTotalHours(lovedMemory)} hours that stayed with you`} color="text-pink-300" onClick={() => onOpenGame(lovedMemory)} />
          )}
        </div>
      </section>

      {dueCapsules && dueCapsules.length > 0 && onOpenTimeCapsule && (
        <button onClick={onOpenTimeCapsule} className="flex w-full items-center gap-3 rounded-2xl border border-violet-400/20 bg-violet-500/[0.08] p-4 text-left">
          <Sparkles size={16} className="shrink-0 text-violet-300" />
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-violet-200">A note from your past self is ready</p><p className="mt-0.5 truncate text-xs text-white/40">&ldquo;{dueCapsules[0].note}&rdquo;</p></div>
          <ArrowRight size={15} className="text-white/30" />
        </button>
      )}

      <details className="group rounded-2xl border border-white/[0.06] bg-white/[0.015]">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold text-white/55">
          <span className="flex items-center gap-2"><Sparkles size={14} className="text-purple-300" /> More from your library</span>
          <ArrowRight size={14} className="transition-transform group-open:rotate-90" />
        </summary>
        <div className="space-y-4 border-t border-white/[0.06] p-4">
          <OnThisDayCard games={games} />
          <FortuneCookie games={games} replayCandidate={replayCandidate} wishlistNextAffordable={wishlistNextAffordable} />
          <DailyQuestPanel games={games} userId={userId} />
          {onOpenQueue && <button onClick={onOpenQueue} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white/5 text-xs font-semibold text-white/55"><ListOrdered size={14} /> Open your play plan</button>}
        </div>
      </details>
    </div>
  );
}

function StoryNumber({ value, label }: { value: string; label: string }) {
  return <div className="rounded-2xl bg-white/[0.04] px-3 py-3 text-center"><div className="text-xl font-black text-white">{value}</div><div className="mt-0.5 text-[10px] text-white/35">{label}</div></div>;
}

function OrbitCard({ icon, eyebrow, title, detail, color, onClick }: { icon: React.ReactNode; eyebrow: string; title: string; detail: string; color: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="min-w-[78vw] snap-start rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.045] to-white/[0.015] p-5 text-left sm:min-w-[280px]">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] ${color}`}>{icon}</span>
      <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">{eyebrow}</p>
      <h4 className="mt-1 line-clamp-1 text-base font-semibold text-white/85">{title}</h4>
      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/40">{detail}</p>
    </button>
  );
}
