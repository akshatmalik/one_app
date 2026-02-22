/**
 * Award category definitions for each tier.
 *
 * Extracted from WeekStoryMode, MonthStoryMode, QuarterAwardsModal,
 * and YearAwardsModal so the AwardsHub can reuse them.
 */

import { Game } from './types';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { AwardCategoryDef, AwardNominee } from '../components/GamingAwardsScreen';
import { parseLocalDate } from './calculations';

// ── Week (3 categories) ─────────────────────────────────────────

export function buildWeekCategories(
  rawGames: Game[],
  allGames: GameWithMetrics[],
  weekStart: Date,
  weekEnd: Date,
): AwardCategoryDef[] {
  // Find games played in this week via play logs
  const gamesPlayed: Array<{ game: Game; hours: number; sessions: number }> = [];

  for (const game of rawGames) {
    const logs = (game.playLogs || []).filter(l => {
      const d = parseLocalDate(l.date);
      return d >= weekStart && d <= weekEnd;
    });
    if (logs.length > 0) {
      const hours = logs.reduce((s, l) => s + l.hours, 0);
      gamesPlayed.push({ game, hours, sessions: logs.length });
    }
  }

  gamesPlayed.sort((a, b) => b.hours - a.hours);

  // Find longest session
  let longestSession: { game: Game; hours: number } | null = null;
  for (const gp of gamesPlayed) {
    for (const log of (gp.game.playLogs || [])) {
      const d = parseLocalDate(log.date);
      if (d >= weekStart && d <= weekEnd) {
        if (!longestSession || log.hours > longestSession.hours) {
          longestSession = { game: gp.game, hours: log.hours };
        }
      }
    }
  }

  const nominees: AwardNominee[] = gamesPlayed.map(gp => ({
    game: gp.game,
    reasonLine: `${gp.hours.toFixed(1)}h this week · ${gp.sessions} session${gp.sessions !== 1 ? 's' : ''}`,
  }));

  return [
    {
      id: 'game_of_week',
      label: 'Game of the Week',
      icon: '🎮',
      description: 'Your MVP. The game that owned this week.',
      nominees,
    },
    {
      id: 'best_session',
      label: 'Best Session',
      icon: '⚡',
      description: 'Which game hosted your best single session?',
      nominees: nominees.map(n => {
        const best = longestSession?.game.id === n.game.id
          ? `Best session: ${longestSession?.hours.toFixed(1)}h`
          : n.reasonLine;
        return { ...n, reasonLine: best };
      }),
    },
    {
      id: 'guilty_pleasure',
      label: 'Guilty Pleasure',
      icon: '😏',
      description: "The one you kept going back to even if you won't brag about it.",
      nominees,
    },
  ];
}

// ── Month (7 categories) ────────────────────────────────────────

export function buildMonthCategories(
  rawGames: Game[],
  allGames: GameWithMetrics[],
  year: number,
  month: number,
  weeklyWinners: Array<{ label: string; gameName: string; icon: string }>,
): AwardCategoryDef[] {
  const mStart = new Date(year, month - 1, 1);
  const mEnd = new Date(year, month, 0, 23, 59, 59);

  // Games played this month
  const gamesPlayed: Array<{ game: Game; hours: number; sessions: number }> = [];
  for (const game of rawGames) {
    const logs = (game.playLogs || []).filter(l => {
      const d = parseLocalDate(l.date);
      return d >= mStart && d <= mEnd;
    });
    if (logs.length > 0) {
      const hours = logs.reduce((s, l) => s + l.hours, 0);
      gamesPlayed.push({ game, hours, sessions: logs.length });
    }
  }

  gamesPlayed.sort((a, b) => b.hours - a.hours);

  const nominees: AwardNominee[] = gamesPlayed.map(gp => ({
    game: gp.game,
    reasonLine: `${gp.hours.toFixed(1)}h this month · ${gp.sessions} session${gp.sessions !== 1 ? 's' : ''}`,
    isHighlight: weeklyWinners.some(w => w.gameName === gp.game.name),
  }));

  // Session nominees
  const sessionNominees = nominees.map(n => {
    const bestSession = Math.max(
      0,
      ...(n.game.playLogs || [])
        .filter(l => { const d = parseLocalDate(l.date); return d >= mStart && d <= mEnd; })
        .map(l => l.hours)
    );
    return { ...n, reasonLine: bestSession > 0 ? `Best session: ${bestSession.toFixed(1)}h` : n.reasonLine };
  }).sort((a, b) => parseFloat(b.reasonLine) - parseFloat(a.reasonLine));

  // Comeback nominees — games with 7+ day gap between sessions
  const comebackNominees = nominees.filter(n => {
    const logs = (n.game.playLogs || [])
      .filter(l => { const d = parseLocalDate(l.date); return d >= mStart && d <= mEnd; })
      .sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 1; i < logs.length; i++) {
      const gap = (parseLocalDate(logs[i].date).getTime() - parseLocalDate(logs[i - 1].date).getTime()) / 86400000;
      if (gap >= 7) return true;
    }
    return false;
  });

  // Value nominees
  const valueNominees = [...nominees].sort((a, b) => {
    const totalA = (a.game.playLogs || []).reduce((s, l) => s + l.hours, 0) + a.game.hours;
    const totalB = (b.game.playLogs || []).reduce((s, l) => s + l.hours, 0) + b.game.hours;
    const cphA = totalA > 0 && a.game.price > 0 ? a.game.price / totalA : 999;
    const cphB = totalB > 0 && b.game.price > 0 ? b.game.price / totalB : 999;
    return cphA - cphB;
  });

  return [
    { id: 'game_of_month', label: 'Game of the Month', icon: '🏅', description: 'Your overall pick for the month.', nominees },
    { id: 'best_session_month', label: 'Best Session', icon: '⚡', description: 'Which game hosted your best single session?', nominees: sessionNominees },
    { id: 'the_comeback', label: 'The Comeback', icon: '🔄', description: 'A game you returned to after a break.', nominees: comebackNominees.length > 0 ? comebackNominees : nominees },
    { id: 'best_value_month', label: 'Best Value', icon: '💰', description: 'Most for your money or time this month.', nominees: valueNominees },
    { id: 'underdog_month', label: 'The Underdog', icon: '🎲', description: 'Surprised you. Exceeded expectations.', nominees },
    { id: 'disappointment_month', label: 'Disappointment of the Month', icon: '😤', description: "It let you down. Didn't live up to the hype.", nominees },
    { id: 'ai_wild_card', label: 'AI Wild Card', icon: '🤖', description: "AI's surprise pick — a category and game you might not expect.", nominees, isAICategory: true },
  ];
}

// ── Quarter (8 categories) ──────────────────────────────────────

function hoursInQuarter(game: GameWithMetrics, year: number, quarter: number): number {
  const qStart = new Date(year, (quarter - 1) * 3, 1);
  const qEnd = new Date(year, quarter * 3, 0, 23, 59, 59);
  return (game.playLogs || [])
    .filter(l => { const d = parseLocalDate(l.date); return d >= qStart && d <= qEnd; })
    .reduce((s, l) => s + l.hours, 0);
}

function gamesPlayedInQuarter(games: GameWithMetrics[], year: number, quarter: number): GameWithMetrics[] {
  const qStart = new Date(year, (quarter - 1) * 3, 1);
  const qEnd = new Date(year, quarter * 3, 0, 23, 59, 59);
  return games.filter(g =>
    (g.playLogs || []).some(l => {
      const d = parseLocalDate(l.date);
      return d >= qStart && d <= qEnd;
    })
  );
}

export function buildQuarterCategories(
  allGames: GameWithMetrics[],
  rawGames: Game[],
  year: number,
  quarter: number,
  monthlyWinners: Array<{ label: string; gameName: string; icon: string }>,
): AwardCategoryDef[] {
  const played = gamesPlayedInQuarter(allGames, year, quarter);
  const byHours = [...played].sort((a, b) => hoursInQuarter(b, year, quarter) - hoursInQuarter(a, year, quarter));

  const toNominee = (g: GameWithMetrics, overrideReason?: string): AwardNominee => {
    const qHours = hoursInQuarter(g, year, quarter);
    const wins = monthlyWinners.filter(w => w.gameName === g.name).length;
    return {
      game: g,
      reasonLine: overrideReason ?? `${qHours.toFixed(1)}h this quarter · rated ${g.rating}/10`,
      isHighlight: wins > 0,
    };
  };

  // Grower: avg session length increased over the quarter
  const qStart = new Date(year, (quarter - 1) * 3, 1);
  const qEnd = new Date(year, quarter * 3, 0, 23, 59, 59);

  const growerNominees = played.filter(g => {
    const logs = (g.playLogs || [])
      .filter(l => { const d = parseLocalDate(l.date); return d >= qStart && d <= qEnd; })
      .sort((a, b) => a.date.localeCompare(b.date));
    if (logs.length < 3) return false;
    const firstHalf = logs.slice(0, Math.floor(logs.length / 2));
    const secondHalf = logs.slice(Math.floor(logs.length / 2));
    const avgFirst = firstHalf.reduce((s, l) => s + l.hours, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, l) => s + l.hours, 0) / secondHalf.length;
    return avgSecond > avgFirst * 1.2;
  });

  // Consistent: evenly-spaced sessions
  const consistentNominees = played.filter(g => {
    const logs = (g.playLogs || [])
      .filter(l => { const d = parseLocalDate(l.date); return d >= qStart && d <= qEnd; })
      .sort((a, b) => a.date.localeCompare(b.date));
    if (logs.length < 3) return false;
    const gaps = logs.slice(1).map((l, i) =>
      (parseLocalDate(l.date).getTime() - parseLocalDate(logs[i].date).getTime()) / 86400000
    );
    const avg = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    const variance = gaps.reduce((s, g) => s + (g - avg) ** 2, 0) / gaps.length;
    return Math.sqrt(variance) < avg * 0.6 && avg < 15;
  });

  // Discovery: first session this quarter
  const discoveryNominees = played.filter(g => {
    const firstLog = (g.playLogs || []).sort((a, b) => a.date.localeCompare(b.date))[0];
    if (!firstLog) return false;
    return parseLocalDate(firstLog.date) >= qStart;
  });

  // Grind: high hours despite low rating
  const grindNominees = played
    .filter(g => g.rating > 0 && g.rating <= 7 && hoursInQuarter(g, year, quarter) >= 5)
    .sort((a, b) => hoursInQuarter(b, year, quarter) - hoursInQuarter(a, year, quarter));

  // Genre pioneer: new genre this quarter
  const priorGenres = new Set<string>();
  for (const g of allGames) {
    if (!g.genre) continue;
    const hasPreQ = (g.playLogs || []).some(l => parseLocalDate(l.date) < qStart);
    if (hasPreQ || (g.startDate && parseLocalDate(g.startDate) < qStart)) {
      priorGenres.add(g.genre);
    }
  }
  const pioneerNominees = played.filter(g => g.genre && !priorGenres.has(g.genre));

  return [
    { id: 'game_of_quarter', label: 'Game of the Quarter', icon: '🥇', description: 'The defining game of these three months.', nominees: byHours.slice(0, 6).map(g => toNominee(g)) },
    { id: 'the_grower', label: 'The Grower', icon: '📈', description: 'Sessions got longer and better as you played more.', nominees: (growerNominees.length > 0 ? growerNominees : byHours.slice(0, 4)).map(g => toNominee(g, `Sessions grew · ${hoursInQuarter(g, year, quarter).toFixed(1)}h total`)) },
    { id: 'most_consistent', label: 'Most Consistent', icon: '🎯', description: 'Showed up regularly — steady sessions all quarter.', nominees: (consistentNominees.length > 0 ? consistentNominees : byHours.slice(0, 4)).map(g => toNominee(g, `Regular sessions · ${(g.playLogs || []).filter(l => { const d = parseLocalDate(l.date); return d >= qStart && d <= qEnd; }).length} sessions`)) },
    { id: 'best_discovery', label: 'Best Discovery', icon: '💎', description: 'A standout game you found for the first time this quarter.', nominees: (discoveryNominees.length > 0 ? discoveryNominees : byHours.slice(0, 4)).map(g => toNominee(g, `First played this quarter · rated ${g.rating}/10`)) },
    { id: 'disappointment_quarter', label: 'Biggest Disappointment', icon: '😤', description: "It let you down. The game that didn't live up.", nominees: byHours.slice(0, 5).map(g => toNominee(g)) },
    { id: 'the_grind', label: 'The Grind', icon: '💪', description: 'You put in the hours even when it was hard.', nominees: (grindNominees.length > 0 ? grindNominees : byHours.slice(0, 4)).map(g => toNominee(g, `${hoursInQuarter(g, year, quarter).toFixed(1)}h despite rating ${g.rating}/10`)) },
    { id: 'genre_pioneer', label: 'Genre Pioneer', icon: '🎭', description: "Ventured into a genre you hadn't explored before.", nominees: (pioneerNominees.length > 0 ? pioneerNominees : byHours.slice(0, 4)).map(g => toNominee(g, `First ${g.genre || 'new'} game · ${hoursInQuarter(g, year, quarter).toFixed(1)}h`)) },
    { id: 'ai_spotlight', label: 'AI Spotlight', icon: '🤖', description: "The AI's pick — something interesting worth recognising.", nominees: byHours.slice(0, 5).map(g => toNominee(g)), isAICategory: true },
  ];
}

// ── Year (9 categories) ─────────────────────────────────────────

function hoursInYear(game: GameWithMetrics, year: number): number {
  return (game.playLogs || [])
    .filter(l => parseLocalDate(l.date).getFullYear() === year)
    .reduce((s, l) => s + l.hours, 0);
}

function bestSessionInYear(game: GameWithMetrics, year: number): number {
  return Math.max(
    0,
    ...(game.playLogs || [])
      .filter(l => parseLocalDate(l.date).getFullYear() === year)
      .map(l => l.hours)
  );
}

export function buildYearCategories(
  allGames: GameWithMetrics[],
  rawGames: Game[],
  year: number,
  quarterlyWinners: Array<{ label: string; gameName: string; icon: string }>,
): AwardCategoryDef[] {
  const played = allGames.filter(g =>
    (g.playLogs || []).some(l => parseLocalDate(l.date).getFullYear() === year)
  );
  const byHours = [...played].sort((a, b) => hoursInYear(b, year) - hoursInYear(a, year));

  const toNominee = (g: GameWithMetrics, overrideReason?: string): AwardNominee => {
    const yHours = hoursInYear(g, year);
    const wins = quarterlyWinners.filter(w => w.gameName === g.name).length;
    return {
      game: g,
      reasonLine: overrideReason ?? `${yHours.toFixed(1)}h in ${year} · rated ${g.rating}/10`,
      isHighlight: wins > 0,
    };
  };

  // Soulmate: high hours AND high rating
  const soulmates = [...played]
    .filter(g => g.rating >= 7 && hoursInYear(g, year) >= 10)
    .sort((a, b) => (hoursInYear(b, year) * b.rating) - (hoursInYear(a, year) * a.rating));

  // Surprise
  const surprises = [...played]
    .filter(g => g.rating >= 7)
    .sort((a, b) => hoursInYear(b, year) - hoursInYear(a, year));

  // Best investment: lowest CPH
  const bestValue = [...played]
    .filter(g => !g.acquiredFree && g.price > 0 && hoursInYear(g, year) > 0)
    .sort((a, b) => (a.price / hoursInYear(a, year)) - (b.price / hoursInYear(b, year)));

  // Session champs
  const sessionChamps = [...played]
    .filter(g => bestSessionInYear(g, year) > 0)
    .sort((a, b) => bestSessionInYear(b, year) - bestSessionInYear(a, year));

  // One that got away
  const gotAway = allGames
    .filter(g => g.status === 'Abandoned' || (g.status === 'In Progress' && hoursInYear(g, year) === 0 && (g.playLogs || []).length > 0))
    .sort((a, b) => (b.playLogs || []).reduce((s, l) => s + l.hours, 0) - (a.playLogs || []).reduce((s, l) => s + l.hours, 0));

  return [
    { id: 'game_of_year', label: 'Game of the Year', icon: '🏆', description: `Your personal GOTY for ${year}. The one that defined your year.`, nominees: byHours.slice(0, 8).map(g => toNominee(g)) },
    { id: 'soulmate', label: 'The Soulmate', icon: '💛', description: 'The game you felt most connected to — hours, love, and all.', nominees: (soulmates.length > 0 ? soulmates : byHours).slice(0, 6).map(g => toNominee(g, `${hoursInYear(g, year).toFixed(1)}h · rated ${g.rating}/10 · a keeper`)) },
    { id: 'biggest_surprise', label: 'Biggest Surprise', icon: '😮', description: "You didn't see it coming. It exceeded every expectation.", nominees: (surprises.length > 0 ? surprises : byHours).slice(0, 6).map(g => toNominee(g)) },
    { id: 'endurance', label: 'The Endurance Award', icon: '⏳', description: 'Most committed. Most hours. The long haul game.', nominees: byHours.slice(0, 6).map(g => toNominee(g, `${hoursInYear(g, year).toFixed(1)}h in ${year}`)) },
    { id: 'best_investment', label: 'Best Investment', icon: '💰', description: 'Best value for money — the most per dollar.', nominees: (bestValue.length > 0 ? bestValue : byHours).slice(0, 6).map(g => { const cph = g.price > 0 ? g.price / hoursInYear(g, year) : 0; return toNominee(g, cph > 0 ? `$${cph.toFixed(2)}/hr · $${g.price} for ${hoursInYear(g, year).toFixed(1)}h` : `${hoursInYear(g, year).toFixed(1)}h · free`); }) },
    { id: 'session_of_year', label: 'Session of the Year', icon: '⚡', description: 'The game that hosted your single greatest gaming moment.', nominees: (sessionChamps.length > 0 ? sessionChamps : byHours).slice(0, 6).map(g => toNominee(g, `Best session: ${bestSessionInYear(g, year).toFixed(1)}h`)) },
    { id: 'one_that_got_away', label: 'The One That Got Away', icon: '👻', description: "A game you wish you'd spent more time on.", nominees: (gotAway.length > 0 ? gotAway : allGames.filter(g => g.status === 'In Progress')).slice(0, 6).map(g => toNominee(g, g.status === 'Abandoned' ? `Abandoned after ${(g.playLogs || []).reduce((s, l) => s + l.hours, 0).toFixed(1)}h` : `Still unfinished`)) },
    { id: 'legacy', label: 'The Legacy', icon: '🌟', description: 'The game that changed how you think about gaming.', nominees: byHours.slice(0, 8).map(g => toNominee(g)) },
    { id: 'ai_choice', label: 'AI Choice Award', icon: '🤖', description: "The AI's surprising pick you might not have expected.", nominees: byHours.slice(0, 6).map(g => toNominee(g)), isAICategory: true },
  ];
}
