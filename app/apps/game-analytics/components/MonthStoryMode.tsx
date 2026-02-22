'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { MonthInReviewData, getMonthGrade, getMonthHotTake, getMonthAwards, getMonthMoodArc, getOscarAwards, parseLocalDate } from '../lib/calculations';
import { OscarAwardsScreen } from './story-screens/OscarAwardsScreen';
import { monthPeriodKey } from '../lib/oscar-storage';
import { Game } from '../lib/types';
import { generateMonthBlurbs, MonthAIBlurbType, AIBlurbResult } from '../lib/ai-service';
import { GamingAwardsScreen, AwardCategoryDef } from './GamingAwardsScreen';
import { useAwards, awardMonthKey, awardMonthLabel } from '../hooks/useAwards';

// Screen imports
import { MonthTitleScreen } from './story-screens/MonthTitleScreen';
import { MonthInNumbersScreen } from './story-screens/MonthInNumbersScreen';
import { MonthGradeScreen } from './story-screens/MonthGradeScreen';
import { MonthTopGameScreen } from './story-screens/MonthTopGameScreen';
import { MonthTop3Screen } from './story-screens/MonthTop3Screen';
import { MonthDiscoveryScreen } from './story-screens/MonthDiscoveryScreen';
import { MonthBiggestDayScreen } from './story-screens/MonthBiggestDayScreen';
import { MonthCalendarScreen } from './story-screens/MonthCalendarScreen';
import { MonthMoodArcScreen } from './story-screens/MonthMoodArcScreen';
import { MonthGenreScreen } from './story-screens/MonthGenreScreen';
import { MonthHotTakeScreen } from './story-screens/MonthHotTakeScreen';
import { MonthMoneyScreen } from './story-screens/MonthMoneyScreen';
import { MonthCompletionsScreen } from './story-screens/MonthCompletionsScreen';
import { MonthBestValueScreen } from './story-screens/MonthBestValueScreen';
import { MonthUnfinishedScreen } from './story-screens/MonthUnfinishedScreen';
import { MonthAwardsScreen } from './story-screens/MonthAwardsScreen';
import { MonthPersonalityScreen } from './story-screens/MonthPersonalityScreen';
import { MonthVsLastScreen } from './story-screens/MonthVsLastScreen';
import { MonthAIBlurbScreen } from './story-screens/MonthAIBlurbScreen';
import { MonthClosingScreen } from './story-screens/MonthClosingScreen';

interface MonthStoryModeProps {
  data: MonthInReviewData;
  allGames: Game[];
  onClose: () => void;
  monthTitle?: string;
  updateGame?: (id: string, updates: Partial<Game>) => Promise<Game>;
}

export function MonthStoryMode({ data, allGames, onClose, monthTitle, updateGame }: MonthStoryModeProps) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [direction, setDirection] = useState(0);
  const [aiBlurbs, setAiBlurbs] = useState<Partial<Record<MonthAIBlurbType, AIBlurbResult>>>({});
  const [isLoadingAI, setIsLoadingAI] = useState(true);

  // Pre-compute derived data
  const grade = useMemo(() => getMonthGrade(data), [data]);
  const hotTake = useMemo(() => getMonthHotTake(data), [data]);
  const awards = useMemo(() => getMonthAwards(data), [data]);
  const moodArc = useMemo(() => getMonthMoodArc(data), [data]);
  const monthOscars = useMemo(() => {
    const start = new Date(data.year, data.month - 1, 1);
    const end = new Date(data.year, data.month, 0, 23, 59, 59);
    return getOscarAwards(allGames, start, end);
  }, [allGames, data.year, data.month]);
  const monthPKey = useMemo(() => monthPeriodKey(data.year, data.month), [data.year, data.month]);

  // Interactive month awards
  const monthAwardPeriodKey = useMemo(() => awardMonthKey(new Date(data.year, data.month - 1, 1)), [data.year, data.month]);
  const monthAwardPeriodLabel = useMemo(() => awardMonthLabel(data.year, data.month), [data.year, data.month]);
  const { getPicksForPeriod } = useAwards(allGames, updateGame || (async (id, u) => allGames.find(g => g.id === id) as Game));
  const monthExistingPicks = useMemo(() => getPicksForPeriod('month', monthAwardPeriodKey), [getPicksForPeriod, monthAwardPeriodKey]);

  // Weekly award winners from this month (for context banner)
  const weeklyWinnersThisMonth = useMemo(() => {
    const result: Array<{ label: string; gameName: string; icon: string }> = [];
    for (const g of allGames) {
      for (const a of (g.awards || [])) {
        if (a.periodType === 'week' && a.periodKey.startsWith(`${data.year}-W`)) {
          // Check if this week falls in the month
          const weekDate = new Date(data.year, data.month - 1, 1);
          result.push({ label: a.categoryLabel, gameName: g.name, icon: a.categoryIcon });
        }
      }
    }
    return result.slice(0, 8);
  }, [allGames, data.year, data.month]);

  const monthAwardCategories: AwardCategoryDef[] = useMemo(() => {
    const nominees = data.gamesPlayed.map(gp => ({
      game: gp.game,
      reasonLine: `${gp.hours.toFixed(1)}h this month · ${gp.sessions} session${gp.sessions !== 1 ? 's' : ''}`,
      isHighlight: weeklyWinnersThisMonth.some(w => w.gameName === gp.game.name),
    }));
    // Best session nominees — pick games with longest sessions this month
    const sessionNominees = nominees.map(n => {
      const mStart = new Date(data.year, data.month - 1, 1);
      const mEnd = new Date(data.year, data.month, 0, 23, 59, 59);
      const bestSession = Math.max(
        0,
        ...(n.game.playLogs || [])
          .filter(l => { const d = parseLocalDate(l.date); return d >= mStart && d <= mEnd; })
          .map(l => l.hours)
      );
      return { ...n, reasonLine: bestSession > 0 ? `Best session: ${bestSession.toFixed(1)}h` : n.reasonLine };
    }).sort((a, b) => parseFloat(b.reasonLine) - parseFloat(a.reasonLine));
    // Comeback nominees — games with 7+ day gap in sessions
    const comebackNominees = nominees.filter(n => {
      const logs = (n.game.playLogs || []).sort((a, b) => a.date.localeCompare(b.date));
      for (let i = 1; i < logs.length; i++) {
        const gap = (parseLocalDate(logs[i].date).getTime() - parseLocalDate(logs[i - 1].date).getTime()) / 86400000;
        if (gap >= 7) return true;
      }
      return false;
    });
    return [
      { id: 'game_of_month', label: 'Game of the Month', icon: '🏅', description: 'Your overall pick for the month.', nominees },
      { id: 'best_session_month', label: 'Best Session', icon: '⚡', description: 'Which game hosted your best single session?', nominees: sessionNominees },
      { id: 'the_comeback', label: 'The Comeback', icon: '🔄', description: 'A game you returned to after a break.', nominees: comebackNominees.length > 0 ? comebackNominees : nominees },
      { id: 'best_value_month', label: 'Best Value', icon: '💰', description: 'Most for your money or time this month.', nominees: [...nominees].sort((a, b) => {
        const totalA = (a.game.playLogs || []).reduce((s, l) => s + l.hours, 0) + a.game.hours;
        const totalB = (b.game.playLogs || []).reduce((s, l) => s + l.hours, 0) + b.game.hours;
        const cphA = totalA > 0 && a.game.price > 0 ? a.game.price / totalA : 999;
        const cphB = totalB > 0 && b.game.price > 0 ? b.game.price / totalB : 999;
        return cphA - cphB;
      }) },
      { id: 'underdog_month', label: 'The Underdog', icon: '🎲', description: 'Surprised you. Exceeded expectations.', nominees },
      { id: 'disappointment_month', label: 'Disappointment of the Month', icon: '😤', description: "It let you down. Didn't live up to the hype.", nominees },
      { id: 'ai_wild_card', label: 'AI Wild Card', icon: '🤖', description: "AI's surprise pick — a category and game you might not expect.", nominees, isAICategory: true },
    ];
  }, [data, weeklyWinnersThisMonth]);

  // Generate AI blurbs on mount
  useEffect(() => {
    if (data.totalHours === 0) {
      setIsLoadingAI(false);
      return;
    }

    const loadBlurbs = async () => {
      try {
        setIsLoadingAI(true);
        const blurbs = await generateMonthBlurbs(data);
        setAiBlurbs(blurbs);
      } catch (error) {
        console.error('Failed to generate month AI blurbs:', error);
      } finally {
        setIsLoadingAI(false);
      }
    };

    loadBlurbs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── 5-ACT FLOW ────────────────────────────────────────────
  //
  // Act 1: HOOK (3-4 screens)
  //   Title → Month in Numbers → Grade Card → AI Opening
  //
  // Act 2: SPOTLIGHT (3-4 screens)
  //   Top Game → Top 3 → Discovery → Biggest Day
  //
  // Act 3: PATTERNS (3-4 screens)
  //   Calendar → Mood Arc → Genre Split → Hot Take
  //
  // Act 4: MONEY & PROGRESS (3-4 screens)
  //   Money Story → Completions → Best Value → Unfinished Business
  //
  // Act 5: WRAP-UP (4-5 screens)
  //   Awards → Personality → vs Last Month → AI Closing → Closing

  const hasCompletionsOrStarts = data.completedGames.length > 0 || data.newGamesStarted.length > 0;

  const screens = [
    // ─── ACT 1: HOOK ───
    <MonthTitleScreen key="title" data={data} monthTitle={monthTitle} />,
    <MonthInNumbersScreen key="numbers" data={data} />,
    <MonthGradeScreen key="grade" grade={grade} monthLabel={data.monthLabel} />,
    <MonthAIBlurbScreen
      key="ai-opening"
      blurb={aiBlurbs['month-opening']?.text || null}
      type="month-opening"
      isLoading={isLoadingAI && !aiBlurbs['month-opening']}
      isFallback={aiBlurbs['month-opening']?.isFallback}
    />,

    // ─── ACT 2: SPOTLIGHT ───
    data.top3Games.length >= 3 ? <MonthTop3Screen key="top3" data={data} /> : null,
    data.topGame ? <MonthTopGameScreen key="top-game" data={data} /> : null,
    data.discoveryGame ? <MonthDiscoveryScreen key="discovery" data={data} /> : null,
    data.biggestDay ? <MonthBiggestDayScreen key="biggest-day" data={data} /> : null,

    // ─── ACT 3: PATTERNS ───
    data.dailyHours.length > 0 ? <MonthCalendarScreen key="calendar" data={data} /> : null,
    moodArc.length > 1 ? <MonthMoodArcScreen key="mood-arc" moodArc={moodArc} /> : null,
    data.genreBreakdown.length > 1 ? <MonthGenreScreen key="genre" data={data} /> : null,
    hotTake ? <MonthHotTakeScreen key="hot-take" hotTake={hotTake} /> : null,

    // ─── ACT 4: MONEY & PROGRESS ───
    data.totalSpent > 0 ? <MonthMoneyScreen key="money" data={data} /> : null,
    hasCompletionsOrStarts ? <MonthCompletionsScreen key="completions" data={data} /> : null,
    data.bestValueGame ? <MonthBestValueScreen key="best-value" data={data} /> : null,
    data.unfinishedGames.length > 0 ? <MonthUnfinishedScreen key="unfinished" data={data} /> : null,

    // ─── ACT 5: WRAP-UP ───
    awards.length > 0 ? <MonthAwardsScreen key="awards" awards={awards} /> : null,
    monthOscars.awards.length > 0 ? (
      <OscarAwardsScreen
        key="oscar-awards"
        data={monthOscars}
        allPlayedGames={data.gamesPlayed.map(gp => gp.game)}
        periodType="month"
        periodYear={data.year}
        periodMonth={data.month}
        periodKeyOverride={monthPKey}
      />
    ) : null,
    data.gamesPlayed.length > 0 ? (
      <GamingAwardsScreen
        key="month-golden-awards"
        periodType="month"
        periodKey={monthAwardPeriodKey}
        periodLabel={monthAwardPeriodLabel}
        ceremonyTitle={`${monthAwardPeriodLabel} — Awards Night`}
        categories={monthAwardCategories}
        existingPicks={monthExistingPicks}
        onPick={(_catId, _game, _oldId) => {}}
        contextBanner={weeklyWinnersThisMonth.length > 0 ? `Weekly MVPs this month: ${[...new Set(weeklyWinnersThisMonth.map(w => w.gameName))].join(', ')}` : undefined}
        contextWinners={weeklyWinnersThisMonth}
        allGames={allGames}
        updateGame={updateGame || (async (id) => allGames.find(g => g.id === id) as Game)}
      />
    ) : null,
    <MonthPersonalityScreen key="personality" data={data} allGames={allGames} />,
    <MonthVsLastScreen key="vs-last" data={data} />,
    <MonthAIBlurbScreen
      key="ai-closing"
      blurb={aiBlurbs['month-closing']?.text || null}
      type="month-closing"
      isLoading={isLoadingAI && !aiBlurbs['month-closing']}
      isFallback={aiBlurbs['month-closing']?.isFallback}
    />,
    <MonthClosingScreen key="closing" data={data} monthTitle={monthTitle} />,
  ].filter(Boolean);

  const totalScreens = screens.length;

  // Navigation
  const goToNext = useCallback(() => {
    if (currentScreen < totalScreens - 1) {
      setDirection(1);
      setCurrentScreen(prev => prev + 1);
    }
  }, [currentScreen, totalScreens]);

  const goToPrevious = useCallback(() => {
    if (currentScreen > 0) {
      setDirection(-1);
      setCurrentScreen(prev => prev - 1);
    }
  }, [currentScreen]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [goToNext, goToPrevious, onClose]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.3) goToPrevious();
    else goToNext();
  };

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f] overflow-hidden">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm"
        aria-label="Close story"
      >
        <X size={24} className="text-white" />
      </button>

      {/* Progress dots */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-4 max-w-[80%] overflow-x-auto">
        {screens.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setDirection(index > currentScreen ? 1 : -1);
              setCurrentScreen(index);
            }}
            className="group shrink-0"
            aria-label={`Go to screen ${index + 1}`}
          >
            <div
              className={`h-1 rounded-full transition-all duration-300 ${
                index === currentScreen
                  ? 'bg-white w-6'
                  : index < currentScreen
                  ? 'bg-white/60 w-4'
                  : 'bg-white/20 w-4'
              } group-hover:bg-white/80`}
            />
          </button>
        ))}
      </div>

      {/* Nav arrows (desktop) */}
      {currentScreen > 0 && (
        <button
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm hidden md:flex items-center justify-center"
          aria-label="Previous screen"
        >
          <ChevronLeft size={24} className="text-white" />
        </button>
      )}
      {currentScreen < totalScreens - 1 && (
        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm hidden md:flex items-center justify-center"
          aria-label="Next screen"
        >
          <ChevronRight size={24} className="text-white" />
        </button>
      )}

      {/* Screen container */}
      <div className="h-full w-full cursor-pointer" onClick={handleClick}>
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentScreen}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="h-full w-full flex items-center justify-center p-4 pt-14 pb-16 md:p-8 md:pt-16 overflow-y-auto"
          >
            {screens[currentScreen]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Tap instruction hint */}
      {currentScreen === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 text-white/40 text-sm"
        >
          Tap to continue
        </motion.div>
      )}

      {/* Screen counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 text-white/30 text-xs">
        {currentScreen + 1} / {totalScreens}
      </div>
    </div>
  );
}
