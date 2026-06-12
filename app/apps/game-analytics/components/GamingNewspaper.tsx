'use client';

import { useMemo } from 'react';
import { X } from 'lucide-react';
import { Game } from '../lib/types';
import {
  getAllPlayLogs,
  getActivityPulse,
  getGamingPersonality,
  calculateSummary,
  getPeriodStats,
  getCurrentGamingStreak,
  getRotationStats,
  findRegretPurchases,
  getValueChampion,
  getTotalHours,
  calculateMetrics,
  parseLocalDate,
  GamingPersonalityType,
} from '../lib/calculations';

interface Props {
  games: Game[];
  onClose: () => void;
}

// ── News event generation ─────────────────────────────────────

interface NewsEvent {
  priority: number;
  headline: string;
  article: string;
}

function getNewsEvents(games: Game[]): NewsEvent[] {
  const events: NewsEvent[] = [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Priority 10: Recent completion
  const recentlyCompleted = games
    .filter(g => g.status === 'Completed' && g.endDate)
    .filter(g => parseLocalDate(g.endDate!) >= sevenDaysAgo)
    .sort((a, b) => (b.endDate ?? '').localeCompare(a.endDate ?? ''));

  if (recentlyCompleted.length > 0) {
    const game = recentlyCompleted[0];
    const hours = getTotalHours(game);
    const metrics = calculateMetrics(game);
    const daysToComplete = (game.startDate && game.endDate)
      ? Math.round((parseLocalDate(game.endDate).getTime() - parseLocalDate(game.startDate).getTime()) / 86400000)
      : null;
    const sentiment = game.rating >= 9
      ? 'a landmark personal achievement'
      : game.rating >= 7
        ? 'a satisfying conclusion'
        : 'a complicated relationship finally resolved';
    events.push({
      priority: 10,
      headline: `GAMER FINISHES ${game.name.toUpperCase()}${daysToComplete ? ` IN ${daysToComplete}-DAY CAMPAIGN` : ''}`,
      article: `In what is being described as ${sentiment}, ${game.name} has been officially completed${game.rating > 0 ? `, awarded a ${game.rating}/10 rating in post-match analysis` : ''}. A total of ${hours.toFixed(1)} hours were logged${(game.playLogs?.length ?? 0) > 0 ? ` across ${game.playLogs!.length} sessions` : ''}. At $${metrics.costPerHour.toFixed(2)}/hour, financial analysts classify this as "${metrics.valueRating.toLowerCase()} value."`
    });
  }

  // Priority 8: Active streak
  const streak = getCurrentGamingStreak(games);
  if (streak >= 5) {
    events.push({
      priority: 8,
      headline: `GAMING STREAK ENTERS DAY ${streak}, OBSERVERS TAKE NOTE`,
      article: `What began as routine play sessions has now extended to ${streak} consecutive days. "The data is unambiguous," the play log archive stated. No end to the streak is currently anticipated. Analysts have begun filing preliminary reports.`
    });
  }

  // Priority 7: Marathon session in last 7 days
  const allLogs = getAllPlayLogs(games);
  const recentMarathon = allLogs.find(({ log }) => {
    const logDate = parseLocalDate(log.date);
    return logDate >= sevenDaysAgo && log.hours >= 5;
  });
  if (recentMarathon) {
    const { game: marathonGame, log: marathonLog } = recentMarathon;
    const dayName = new Date(marathonLog.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
    events.push({
      priority: 7,
      headline: `${Math.round(marathonLog.hours)}-HOUR SESSION CONFIRMED FOR ${marathonGame.name.toUpperCase()}`,
      article: `Records indicate a ${marathonLog.hours.toFixed(1)}-hour uninterrupted session involving ${marathonGame.name}, logged on ${dayName}. Witnesses were unavailable for comment. Meals consumed during this period remain unconfirmed. The session ranks among the most committed in recent memory.`
    });
  }

  // Priority 6: Recent purchase
  const recentPurchases = games
    .filter(g => g.datePurchased && g.status !== 'Wishlist')
    .filter(g => parseLocalDate(g.datePurchased!) >= sevenDaysAgo)
    .sort((a, b) => (b.datePurchased ?? '').localeCompare(a.datePurchased ?? ''));

  if (recentPurchases.length > 0) {
    const game = recentPurchases[0];
    const acquiredDesc = game.acquiredFree ? 'at no charge' : `for $${game.price}`;
    const playedDesc = game.status === 'Not Started'
      ? 'The title remains in the proverbial shrink wrap, joining an expectant queue.'
      : 'Play has already commenced — analysts describe this as "a promising sign."';
    events.push({
      priority: 6,
      headline: `ACQUISITION CONFIRMED: ${game.name.toUpperCase()} ENTERS THE COLLECTION`,
      article: `The library has grown. ${game.name} was officially acquired ${acquiredDesc}${game.genre ? `, genre classification: ${game.genre}` : ''}. ${playedDesc}`
    });
  }

  // Default fallback
  if (events.length === 0) {
    const pulse = getActivityPulse(games);
    if (pulse.level === 'Hibernating' || pulse.level === 'Cooling Off') {
      const daysDesc = pulse.lastPlayedDaysAgo === Infinity
        ? 'an extended period'
        : `${pulse.lastPlayedDaysAgo} day${pulse.lastPlayedDaysAgo === 1 ? '' : 's'}`;
      events.push({
        priority: 1,
        headline: `CORRESPONDENT REPORTS ALL QUIET ON THE GAMING FRONT`,
        article: `Sources indicate a period of low activity — the most recent session was logged ${daysDesc} ago. Analysts describe this as either a natural recovery cycle or classic backlog denial. The games, for their part, remain patient.`
      });
    } else {
      events.push({
        priority: 1,
        headline: `STEADY PACE MAINTAINED AS LIBRARY REPORTS NO MAJOR INCIDENTS`,
        article: `The latest play log data shows a consistent stream of sessions with no dramatic developments. The gaming continues at a measured "${pulse.level.toLowerCase()}" pace. All systems are nominal. The backlog is watching.`
      });
    }
  }

  return events.sort((a, b) => b.priority - a.priority);
}

// ── Feature article generation ────────────────────────────────

interface FeatureArticle {
  title: string;
  byline: string;
  body: string;
}

function getFeatureArticle(games: Game[]): FeatureArticle {
  const personality = getGamingPersonality(games);
  const pulse = getActivityPulse(games);
  const rotation = getRotationStats(games);
  const ownedGames = games.filter(g => g.status !== 'Wishlist');

  const articles: Record<GamingPersonalityType, { title: string; body: string }> = {
    'Completionist': {
      title: "THE COMPLETIONIST'S BURDEN: WHEN EVERY GAME MUST REACH ITS END",
      body: `There is a breed of gamer for whom rolling credits are not a reward, but an obligation — a contract honoured. The play log here confirms this species. ${rotation.activeGames.length > 0 ? `Currently, ${rotation.activeGames.length} open title${rotation.activeGames.length > 1 ? 's represent' : ' represents'} unresolved business — entries on a ledger that refuses to balance until completed.` : 'The active queue, for once, stands clear.'} The completion rate is not a metric. It is a matter of record. ${pulse.level === 'On Fire' || pulse.level === 'Cruising' ? 'Activity this week reflects appropriate urgency.' : 'Even quieter periods carry the weight of the unfinished.'}`
    },
    'Deep Diver': {
      title: "HOURS WELL SPENT: THE ART OF FULL IMMERSION",
      body: `Not every gamer picks up a title to browse. Some commit entirely. The session logs here read as a dedication — long, immersive, deliberate. Each game entered is a game given proper time and attention. ${rotation.activeGames.length > 0 ? `Current focus: ${rotation.activeGames.slice(0, 2).map(g => g.name).join(' and ')} — titles receiving the kind of sustained attention most games never see.` : 'Between deep dives, a rare surface for air.'} Critics call it tunnel vision. The play log calls it thoroughly reasonable.`
    },
    'Sampler': {
      title: "ACROSS ALL GENRES: DISPATCHES FROM THE GREAT VARIETY SHOW",
      body: `Categorising this library is, frankly, an impossible exercise. RPGs sit beside sports titles, indie gems beside action games. The collection reads like a curiosity museum without a theme — and that is precisely the intent. ${rotation.activeGames.length > 1 ? `Currently running ${rotation.activeGames.length} games in active rotation, because starting a new game before finishing the last is apparently optional.` : 'Between samples, a brief pause to consolidate.'} This is not aimlessness. It is omnivorous curiosity, and the data respects it.`
    },
    'Backlog Hoarder': {
      title: "THE GROWING PILE: AN OPTIMIST'S GUIDE TO ASPIRATIONAL COLLECTING",
      body: `The mathematics here are simple: games acquired exceed games played. The unstarted pile grows with each sale, each word-of-mouth recommendation, each "I'll get to this eventually." And sometimes, eventually arrives. ${ownedGames.filter(g => g.status === 'Not Started').length > 0 ? `Currently, ${ownedGames.filter(g => g.status === 'Not Started').length} titles await their moment, patient and unjudging.` : 'The backlog, in a minor miracle, is currently under control.'} Each unplayed game is not a failure. It is a standing commitment to future enjoyment.`
    },
    'Balanced Gamer': {
      title: "THE MEASURED APPROACH: GAMING AS A PART OF LIFE, NOT A REPLACEMENT",
      body: `Not all gaming philosophies require an extreme. The data here tells a story of considered engagement — regular sessions, varied titles, games seen through without obsession. ${pulse.level === 'On Fire' || pulse.level === 'Cruising' ? 'Activity is above baseline this period, which happens, and is healthy.' : 'A quieter stretch is underway — the balanced gamer knows when rest is the move.'} The completion numbers are respectable. The spending is thoughtful. Some call this approach boring. The play log calls it sustainable.`
    },
    'Speedrunner': {
      title: "FAST FINISHES: THE ART OF EXTRACTING MAXIMUM VALUE IN MINIMUM TIME",
      body: `Time is finite. Games are many. The efficient conclusion: move quickly. The data reveals a clear preference for titles that respect the player's investment — clean experiences, clear endings, satisfaction without filler. ${ownedGames.filter(g => g.status === 'Completed').length > 0 ? `${ownedGames.filter(g => g.status === 'Completed').length} titles have been completed and filed.` : 'The completion drive is evident in every session.'} In an era of 100-hour epics, finishing a game and calling it done is almost radical. This gamer has no objection to epics. They will simply be efficient ones.`
    },
    'Explorer': {
      title: "UNCHARTED TERRITORY: ONE GAMER'S FIELD REPORT FROM ACROSS THE MAP",
      body: `Genre diversity metrics in this library read like a survey of gaming itself. Where others specialise, this correspondent explores. Each unfamiliar genre represents an expedition — with all the risk and reward that implies. ${rotation.activeGames.length > 0 ? `Current expeditions include ${rotation.activeGames.slice(0, 2).map(g => g.name).join(' and ')}.` : 'Between expeditions, the explorer surveys the map for the next destination.'} Not every genre proves hospitable. The abandoned titles are evidence. That, apparently, is the point. Discovery matters more than comfort.`
    },
  };

  const article = articles[personality.type];
  return {
    title: article.title,
    byline: `Our Gaming Correspondent  ·  ${games.length} title${games.length !== 1 ? 's' : ''} in the archive`,
    body: article.body
  };
}

// ── Classifieds generation ────────────────────────────────────

interface Classified {
  label: string;
  name: string;
  detail: string;
}

function getClassifieds(games: Game[]): Classified[] {
  const ads: Classified[] = [];
  const ownedGames = games.filter(g => g.status !== 'Wishlist');

  // FOR PLAY: oldest unstarted games
  const backlog = ownedGames
    .filter(g => g.status === 'Not Started')
    .sort((a, b) => {
      const dA = a.datePurchased
        ? (Date.now() - parseLocalDate(a.datePurchased).getTime()) : 0;
      const dB = b.datePurchased
        ? (Date.now() - parseLocalDate(b.datePurchased).getTime()) : 0;
      return dB - dA;
    })
    .slice(0, 2);

  backlog.forEach(g => {
    const daysOwned = g.datePurchased
      ? Math.floor((Date.now() - parseLocalDate(g.datePurchased).getTime()) / 86400000)
      : null;
    ads.push({
      label: 'FOR PLAY',
      name: g.name,
      detail: daysOwned
        ? `Owned ${daysOwned} day${daysOwned === 1 ? '' : 's'}, never started`
        : 'Awaiting first session'
    });
  });

  // BUYER'S REMORSE: worst regret purchase
  const regrets = findRegretPurchases(games);
  if (regrets.length > 0) {
    const worst = regrets[0];
    const hours = getTotalHours(worst.game);
    ads.push({
      label: "BUYER'S REMORSE",
      name: worst.game.name,
      detail: `$${worst.game.price} paid · ${hours.toFixed(1)}h played — the math is brutal`
    });
  }

  // COMPLETION WATCH: most-invested in-progress game
  const inProgress = ownedGames
    .filter(g => g.status === 'In Progress')
    .sort((a, b) => getTotalHours(b) - getTotalHours(a))
    .slice(0, 1);

  inProgress.forEach(g => {
    ads.push({
      label: 'COMPLETION WATCH',
      name: g.name,
      detail: `${getTotalHours(g).toFixed(1)}h invested — close enough to feel it`
    });
  });

  return ads;
}

// ── Helpers ───────────────────────────────────────────────────

function formatEditionDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getEditionNumber(games: Game[]): number {
  if (games.length === 0) return 1;
  const now = new Date();
  const oldest = games.reduce((min, g) => {
    const raw = g.createdAt?.split('T')[0];
    if (!raw) return min;
    const d = parseLocalDate(raw);
    return d < min ? d : min;
  }, now);
  return Math.max(1, Math.floor((now.getTime() - oldest.getTime()) / 86400000));
}

// ── Divider ───────────────────────────────────────────────────

function Rule() {
  return <div className="border-t border-[#2a1f10]/25 my-3" />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[9px] tracking-[0.35em] uppercase mb-2 opacity-50"
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      {children}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export function GamingNewspaper({ games, onClose }: Props) {
  const events = useMemo(() => getNewsEvents(games), [games]);
  const feature = useMemo(() => getFeatureArticle(games), [games]);
  const classifieds = useMemo(() => getClassifieds(games), [games]);
  const summary = useMemo(() => calculateSummary(games), [games]);
  const weekStats = useMemo(() => getPeriodStats(games, 7), [games]);
  const streak = useMemo(() => getCurrentGamingStreak(games), [games]);
  const pulse = useMemo(() => getActivityPulse(games), [games]);
  const champion = useMemo(() => getValueChampion(games), [games]);
  const personality = useMemo(() => getGamingPersonality(games), [games]);
  const edition = useMemo(() => getEditionNumber(games), [games]);

  const topEvent = events[0];
  const secondEvent = events[1] ?? null;

  const today = formatEditionDate(new Date());

  // Not enough data
  if (games.length < 3) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div
          className="bg-[#f5f0e5] text-[#2a1f10] rounded-xl max-w-sm w-full p-8 text-center shadow-2xl"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          <div className="text-5xl mb-4">📰</div>
          <h2 className="text-2xl font-black mb-2">The Gaming Post</h2>
          <p
            className="text-sm opacity-60 mb-6 leading-relaxed"
            style={{ fontFamily: 'system-ui, sans-serif' }}
          >
            Add a few more games to your library to receive your first edition.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#2a1f10] text-[#f5f0e5] rounded-lg text-sm font-medium"
            style={{ fontFamily: 'system-ui, sans-serif' }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-3 px-3"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-[#f5f0e5] text-[#2a1f10] w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden"
        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
      >

        {/* ── Masthead ─────────────────────────────────────── */}
        <div className="border-b-[3px] border-[#2a1f10] px-5 pt-4 pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div
                className="text-[9px] tracking-[0.3em] uppercase opacity-40 mb-0.5"
                style={{ fontFamily: 'system-ui, sans-serif' }}
              >
                Established the day you started tracking
              </div>
              <h1 className="text-3xl sm:text-4xl font-black leading-none tracking-tight">
                THE GAMING POST
              </h1>
              <div
                className="text-[10px] italic opacity-50 mt-0.5"
                style={{ fontFamily: 'system-ui, sans-serif' }}
              >
                &ldquo;All the news that&apos;s fit to play&rdquo;
              </div>
            </div>
            <div className="text-right shrink-0">
              <button
                onClick={onClose}
                className="flex items-center gap-1 text-[#2a1f10]/40 hover:text-[#2a1f10]/70 transition-colors mb-1 ml-auto"
                style={{ fontFamily: 'system-ui, sans-serif', fontSize: 11 }}
              >
                <X size={10} /> Close
              </button>
              <div
                className="text-[10px] opacity-50 leading-relaxed"
                style={{ fontFamily: 'system-ui, sans-serif' }}
              >
                {today}
              </div>
              <div
                className="text-[10px] opacity-30"
                style={{ fontFamily: 'system-ui, sans-serif' }}
              >
                Edition&nbsp;#{edition}
              </div>
            </div>
          </div>

          {/* Status bar below masthead */}
          <div
            className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-2 pt-2 border-t border-[#2a1f10]/20"
            style={{ fontFamily: 'system-ui, sans-serif', fontSize: 9 }}
          >
            {[
              `${games.length} games in library`,
              `${summary.totalHours.toFixed(0)} hours logged`,
              `${pulse.level} mode`,
              streak > 0 ? `${streak}-day streak` : null,
              `${summary.completionRate.toFixed(0)}% completion rate`,
            ]
              .filter(Boolean)
              .map((item, i, arr) => (
                <span key={i} className="opacity-50 tracking-[0.2em] uppercase">
                  {item}
                  {i < arr.length - 1 && <span className="ml-4 opacity-50">·</span>}
                </span>
              ))}
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────── */}
        <div className="px-5 py-4 space-y-0">

          {/* Banner Headline */}
          <div>
            <SectionLabel>◆ Breaking News ◆</SectionLabel>
            <h2 className="text-lg sm:text-xl font-black leading-snug mb-2">
              {topEvent.headline}
            </h2>
            <p className="text-sm leading-relaxed opacity-75">{topEvent.article}</p>

            {secondEvent && (
              <div
                className="mt-2 pt-2 border-t border-[#2a1f10]/15 flex gap-2"
                style={{ fontFamily: 'system-ui, sans-serif', fontSize: 11 }}
              >
                <span className="uppercase tracking-widest opacity-40 shrink-0">Also:</span>
                <span className="font-semibold opacity-60 leading-tight">{secondEvent.headline}</span>
              </div>
            )}
          </div>

          <Rule />

          {/* Two-column: Week in Brief + Market Watch */}
          <div className="grid grid-cols-2 gap-4">
            {/* Week in Brief */}
            <div className="border-r border-[#2a1f10]/20 pr-4">
              <SectionLabel>This Week in Gaming</SectionLabel>
              {weekStats.totalHours > 0 ? (
                <div className="space-y-1" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  {[
                    ['Hours logged', `${weekStats.totalHours.toFixed(1)}h`],
                    ['Sessions', `${weekStats.totalSessions}`],
                    weekStats.mostPlayedGame
                      ? ['Top game', weekStats.mostPlayedGame.name]
                      : null,
                    streak > 0 ? ['Streak', `${streak}d 🔥`] : null,
                  ]
                    .filter((row): row is [string, string] => row !== null)
                    .map(([label, value]) => (
                      <div key={label} className="flex justify-between items-baseline gap-2 text-xs">
                        <span className="opacity-55 shrink-0">{label}</span>
                        <span className="font-bold text-right truncate max-w-[110px]">{value}</span>
                      </div>
                    ))}
                </div>
              ) : (
                <p
                  className="text-xs opacity-45 italic leading-relaxed"
                  style={{ fontFamily: 'system-ui, sans-serif' }}
                >
                  No sessions logged this week. The games wait without complaint.
                </p>
              )}
            </div>

            {/* Market Watch */}
            <div>
              <SectionLabel>Market Watch</SectionLabel>
              <div className="space-y-1" style={{ fontFamily: 'system-ui, sans-serif' }}>
                {[
                  ['Total invested', `$${summary.totalSpent.toFixed(0)}`],
                  ['Avg $/hour', `$${summary.averageCostPerHour.toFixed(2)}`],
                  champion ? ['Best value', champion.game.name] : null,
                  ['Avg rating', `${summary.averageRating.toFixed(1)}/10`],
                ]
                  .filter((row): row is [string, string] => row !== null)
                  .map(([label, value]) => (
                    <div key={label} className="flex justify-between items-baseline gap-2 text-xs">
                      <span className="opacity-55 shrink-0">{label}</span>
                      <span className="font-bold text-right truncate max-w-[110px]">{value}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <Rule />

          {/* Feature Article */}
          <div>
            <SectionLabel>◆ Feature Report ◆</SectionLabel>
            <h3 className="text-base sm:text-lg font-black leading-snug mb-0.5">
              {feature.title}
            </h3>
            <div
              className="text-[10px] italic opacity-40 mb-2"
              style={{ fontFamily: 'system-ui, sans-serif' }}
            >
              {feature.byline}
            </div>
            <p className="text-sm leading-relaxed opacity-75">{feature.body}</p>
          </div>

          <Rule />

          {/* Three-column section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Opinion */}
            <div className="sm:border-r border-[#2a1f10]/20 sm:pr-3">
              <SectionLabel>Opinion</SectionLabel>
              <p className="text-xs font-bold mb-1 leading-tight">&ldquo;Is your rating system honest?&rdquo;</p>
              <p
                className="text-xs leading-relaxed opacity-65"
                style={{ fontFamily: 'system-ui, sans-serif' }}
              >
                {summary.averageRating >= 8
                  ? `Your ${summary.averageRating.toFixed(1)} average marks you as a generous rater. Either you have impeccable taste, or everything genuinely has been good. We choose to believe it's both.`
                  : summary.averageRating >= 6.5
                    ? `At ${summary.averageRating.toFixed(1)}, your ratings show a balanced and honest eye. Neither a pushover nor a cynic. Exactly the right disposition.`
                    : `A ${summary.averageRating.toFixed(1)} average marks you as a discerning judge. Not every game earns a high score. Yours have to work for it.`}
              </p>
            </div>

            {/* Box Scores */}
            <div className="sm:border-r border-[#2a1f10]/20 sm:pr-3">
              <SectionLabel>Box Scores</SectionLabel>
              <div
                className="space-y-0.5"
                style={{ fontFamily: 'system-ui, sans-serif' }}
              >
                {([
                  ['Games', summary.totalGames],
                  ['Completed', summary.completedCount],
                  ['In Progress', summary.inProgressCount],
                  ['Wishlist', summary.wishlistCount],
                  ['Abandoned', summary.abandonedCount],
                ] as [string, number][]).map(([label, val]) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span className="opacity-55">{label}</span>
                    <span className="font-bold">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gaming Profile */}
            <div>
              <SectionLabel>Gaming Profile</SectionLabel>
              <p className="text-xs font-black mb-0.5">{personality.type}</p>
              <p
                className="text-[11px] leading-relaxed opacity-65 mb-1.5"
                style={{ fontFamily: 'system-ui, sans-serif' }}
              >
                {personality.description}
              </p>
              <div
                className="flex flex-wrap gap-1"
                style={{ fontFamily: 'system-ui, sans-serif' }}
              >
                {personality.traits.map(t => (
                  <span
                    key={t}
                    className="text-[9px] tracking-wide uppercase px-1.5 py-0.5 border border-[#2a1f10]/25 rounded opacity-55"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Classifieds */}
          {classifieds.length > 0 && (
            <>
              <Rule />
              <div>
                <SectionLabel>◆ Classifieds ◆</SectionLabel>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {classifieds.map((ad, i) => (
                    <div
                      key={i}
                      className="border border-[#2a1f10]/20 rounded-md p-2.5"
                    >
                      <div
                        className="text-[8px] tracking-[0.3em] uppercase font-bold opacity-45 mb-0.5"
                        style={{ fontFamily: 'system-ui, sans-serif' }}
                      >
                        {ad.label}
                      </div>
                      <div className="text-sm font-black leading-tight">{ad.name}</div>
                      <div
                        className="text-[10px] opacity-50 mt-0.5 leading-snug"
                        style={{ fontFamily: 'system-ui, sans-serif' }}
                      >
                        {ad.detail}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div
            className="mt-4 pt-3 border-t border-[#2a1f10]/25 flex items-center justify-between"
            style={{ fontFamily: 'system-ui, sans-serif' }}
          >
            <span className="text-[9px] italic opacity-35 tracking-wide">
              The Gaming Post · All data sourced from your play logs · No algorithms harmed
            </span>
            <button
              onClick={onClose}
              className="text-[10px] opacity-45 hover:opacity-70 transition-opacity px-3 py-1 border border-[#2a1f10]/20 rounded"
            >
              Close edition
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
