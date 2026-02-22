'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { WeekInReviewData, getSharpInsight, getWeekAwards, getIgnoredGames, getFranchiseCheckIns, getHistoricalEchoes, getMomentumData, getRatingParadox } from '../lib/calculations';
import { Game } from '../lib/types';
import { OpeningScreen } from './story-screens/OpeningScreen';
import { TotalHoursScreen } from './story-screens/TotalHoursScreen';
import { TopGameScreen } from './story-screens/TopGameScreen';
import { Top3GamesScreen } from './story-screens/Top3GamesScreen';
import { DailyBreakdownScreen } from './story-screens/DailyBreakdownScreen';

import { GamingPersonalityScreen } from './story-screens/GamingPersonalityScreen';
import { AchievementsScreen } from './story-screens/AchievementsScreen';
import { GenreUniverseScreen } from './story-screens/GenreUniverseScreen';
import { CompletionOddsScreen } from './story-screens/CompletionOddsScreen';
import { BacklogUpdateScreen } from './story-screens/BacklogUpdateScreen';
import { ClosingScreen } from './story-screens/ClosingScreen';
import { BestValueScreen } from './story-screens/BestValueScreen';
import { ActivityPulseScreen } from './story-screens/ActivityPulseScreen';
import { AIBlurbScreen } from './story-screens/AIBlurbScreen';
import { GuildFreeScreen } from './story-screens/GuildFreeScreen';
import { WeekAwardsScreen } from './story-screens/WeekAwardsScreen';
import { SharpInsightScreen } from './story-screens/SharpInsightScreen';
import { YouIgnoredScreen } from './story-screens/YouIgnoredScreen';
import { FranchiseCheckInScreen } from './story-screens/FranchiseCheckInScreen';
import { ThisTimeLastYearScreen } from './story-screens/ThisTimeLastYearScreen';
import { SessionOfTheWeekScreen } from './story-screens/SessionOfTheWeekScreen';
import { MomentumReadScreen } from './story-screens/MomentumReadScreen';
import { RatingParadoxScreen } from './story-screens/RatingParadoxScreen';
import { HotTakeScreen, getHotTake } from './story-screens/HotTakeScreen';
import { VibeCheckScreen } from './story-screens/VibeCheckScreen';
import { WeekVsWeekScreen } from './story-screens/WeekVsWeekScreen';
import { AwardsSummaryCard, AwardPickInfo } from './story-screens/AwardsSummaryCard';
import { AwardsHub } from './AwardsHub';
import { generateMultipleBlurbs, AIBlurbType, AIBlurbResult } from '../lib/ai-service';
import { useAwards, awardWeekKey, awardWeekLabel } from '../hooks/useAwards';
import { GameWithMetrics } from '../hooks/useAnalytics';

interface WeekStoryModeProps {
  data: WeekInReviewData;
  allGames: Game[];
  onClose: () => void;
  prefetchedBlurbs?: Partial<Record<AIBlurbType, AIBlurbResult>>;
  isLoadingPrefetch?: boolean;
  weekTitle?: string;
  updateGame?: (id: string, updates: Partial<Game>) => Promise<Game>;
}

export function WeekStoryMode({ data, allGames, onClose, prefetchedBlurbs, isLoadingPrefetch, weekTitle, updateGame }: WeekStoryModeProps) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [direction, setDirection] = useState(0);
  const [aiBlurbs, setAiBlurbs] = useState<Partial<Record<AIBlurbType, AIBlurbResult>>>(prefetchedBlurbs || {});
  const [isLoadingAI, setIsLoadingAI] = useState(isLoadingPrefetch ?? true);
  const [showAwardsHub, setShowAwardsHub] = useState(false);

  // Pre-compute data for new screens
  const sharpInsight = useMemo(() => getSharpInsight(data, allGames), [data, allGames]);
  const weekAwards = useMemo(() => getWeekAwards(data), [data]);
  const ignoredGames = useMemo(() => getIgnoredGames(data, allGames), [data, allGames]);
  const franchiseCheckIns = useMemo(() => getFranchiseCheckIns(data, allGames), [data, allGames]);
  const historicalEchoes = useMemo(() => getHistoricalEchoes(data, allGames), [data, allGames]);
  const momentumData = useMemo(() => getMomentumData(allGames, data), [allGames, data]);
  const ratingParadox = useMemo(() => getRatingParadox(data, allGames), [data, allGames]);
  const hotTake = useMemo(() => getHotTake(data), [data]);

  // Awards summary data — replaces the 3 broken interactive award screens
  const weekAwardPeriodKey = useMemo(() => awardWeekKey(data.weekStart), [data.weekStart]);
  const weekAwardPeriodLabel = useMemo(() => awardWeekLabel(data.weekStart, data.weekEnd), [data.weekStart, data.weekEnd]);
  const { getPicksForPeriod } = useAwards(allGames, updateGame || (async (id: string) => allGames.find(g => g.id === id) as Game));
  const weekExistingPicks = useMemo(() => getPicksForPeriod('week', weekAwardPeriodKey), [getPicksForPeriod, weekAwardPeriodKey]);

  // Build AwardsSummaryCard pick info
  const WEEK_CATEGORIES = [
    { id: 'game_of_week', label: 'Game of the Week', icon: '🎮' },
    { id: 'best_session', label: 'Best Session', icon: '⚡' },
    { id: 'guilty_pleasure', label: 'Guilty Pleasure', icon: '😏' },
  ];

  const awardPickInfos: AwardPickInfo[] = useMemo(() => {
    return WEEK_CATEGORIES.map(cat => {
      const pickedGameId = weekExistingPicks[cat.id];
      const pickedGame = pickedGameId ? allGames.find(g => g.id === pickedGameId) : undefined;
      return {
        categoryId: cat.id,
        categoryLabel: cat.label,
        categoryIcon: cat.icon,
        gameId: pickedGame?.id,
        gameName: pickedGame?.name,
        gameThumbnail: pickedGame?.thumbnail,
      };
    });
  }, [weekExistingPicks, allGames]);

  // Use prefetched blurbs if available, otherwise generate them
  useEffect(() => {
    if (prefetchedBlurbs && Object.keys(prefetchedBlurbs).length > 0) {
      setAiBlurbs(prefetchedBlurbs);
      setIsLoadingAI(isLoadingPrefetch ?? false);
      return;
    }

    const loadAIBlurbs = async () => {
      try {
        // 2 AI blurb slots: opening + closing bookends
        const blurbTypes: AIBlurbType[] = [
          'opening-personality',
          'closing-reflection',
        ];

        const generatedBlurbs = await generateMultipleBlurbs(data, blurbTypes);
        setAiBlurbs(generatedBlurbs);
      } catch (error) {
        console.error('Failed to generate AI blurbs:', error);
      } finally {
        setIsLoadingAI(false);
      }
    };

    loadAIBlurbs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── 5-ACT FLOW ────────────────────────────────────────────
  //
  // Act 1: HOOK (4-5 screens)
  //   Opening → TotalHours → ActivityPulse → VibeCheck → AI:Opening
  //
  // Act 2: DEEP DIVE (5-7 screens)
  //   TopGame/Top3 → DailyBreakdown → WeekVsWeek → SessionOfTheWeek → GenreUniverse
  //
  // Act 3: INSIGHTS (4-6 screens)
  //   GamingPersonality → HotTake → CompletionOdds → RatingParadox → GuildFree → BestValue
  //
  // Act 4: CONTEXT (4-6 screens)
  //   Achievements → BacklogUpdate → YouIgnored → FranchiseCheckIn → ThisTimeLastYear → Momentum
  //
  // Act 5: WRAP-UP (3-4 screens)
  //   WeekAwards → AI:Closing → SharpInsight → Closing

  const hasAchievements = data.completedGames.length > 0 || data.newGamesStarted.length > 0 || data.milestonesReached.length > 0;

  const screens = [
    // ─── ACT 1: HOOK ───
    <OpeningScreen key="opening" data={data} weekTitle={weekTitle} />,
    <TotalHoursScreen key="hours" data={data} />,
    <ActivityPulseScreen key="pulse" data={data} />,
    <VibeCheckScreen key="vibe-check" data={data} />,

    // AI: Opening personality
    <AIBlurbScreen
      key="ai-opening"
      blurb={aiBlurbs['opening-personality']?.text || null}
      type="opening-personality"
      isLoading={isLoadingAI && !aiBlurbs['opening-personality']}
      error={aiBlurbs['opening-personality']?.error}
      isFallback={aiBlurbs['opening-personality']?.isFallback}
    />,

    // ─── ACT 2: DEEP DIVE ───
    data.gamesPlayed.length >= 3 ? <Top3GamesScreen key="top-3" data={data} /> : null,
    data.topGame ? <TopGameScreen key="top-game" data={data} /> : null,

    <DailyBreakdownScreen key="daily" data={data} />,
    <WeekVsWeekScreen key="vs-week" data={data} />,
    data.longestSession ? <SessionOfTheWeekScreen key="session-week" data={data} /> : null,
    data.genresPlayed.length > 0 ? <GenreUniverseScreen key="genres" data={data} /> : null,

    // ─── ACT 3: INSIGHTS ───
    <GamingPersonalityScreen key="personality" data={data} />,
    hotTake ? <HotTakeScreen key="hot-take" hotTake={hotTake} /> : null,

    data.weekCompletionProbabilities.length > 0 ? <CompletionOddsScreen key="odds" data={data} /> : null,
    ratingParadox.hasParadox ? <RatingParadoxScreen key="paradox" paradox={ratingParadox} /> : null,
    data.totalCostPerHour > 0 ? <GuildFreeScreen key="guilt-free" data={data} /> : null,
    data.gamesPlayed.filter(g => g.game.price > 0).length > 0 ? <BestValueScreen key="best-value" data={data} /> : null,

    // ─── ACT 4: CONTEXT ───
    hasAchievements ? <AchievementsScreen key="achievements" data={data} /> : null,
    data.backlogStatus.backlogCount > 0 ? <BacklogUpdateScreen key="backlog" data={data} /> : null,
    ignoredGames.length > 0 ? <YouIgnoredScreen key="ignored" ignoredGames={ignoredGames} /> : null,
    franchiseCheckIns.length > 0 ? <FranchiseCheckInScreen key="franchise" checkIns={franchiseCheckIns} /> : null,
    historicalEchoes.length > 0 ? <ThisTimeLastYearScreen key="echoes" echoes={historicalEchoes} /> : null,
    <MomentumReadScreen key="momentum" momentum={momentumData} />,

    // ─── ACT 5: WRAP-UP ───
    weekAwards.length > 0 ? <WeekAwardsScreen key="awards" data={data} /> : null,
    data.gamesPlayed.length > 0 ? (
      <AwardsSummaryCard
        key="awards-summary"
        periodType="week"
        periodLabel={weekAwardPeriodLabel}
        picks={awardPickInfos}
        totalCategories={3}
        onOpenAwardsHub={() => setShowAwardsHub(true)}
      />
    ) : null,

    // AI: Closing reflection
    <AIBlurbScreen
      key="ai-closing"
      blurb={aiBlurbs['closing-reflection']?.text || null}
      type="closing-reflection"
      isLoading={isLoadingAI && !aiBlurbs['closing-reflection']}
      error={aiBlurbs['closing-reflection']?.error}
      isFallback={aiBlurbs['closing-reflection']?.isFallback}
    />,

    sharpInsight ? <SharpInsightScreen key="insight" insight={sharpInsight} /> : null,
    <ClosingScreen key="closing" data={data} />,
  ].filter(Boolean);

  const totalScreens = screens.length;

  // Navigation handlers
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

  // Keyboard navigation
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
  }, [currentScreen, totalScreens, goToNext, goToPrevious, onClose]);

  // Click navigation - left/right halves
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width * 0.3) {
      goToPrevious();
    } else if (x > width * 0.3) {
      goToNext();
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? '-100%' : '100%',
      opacity: 0,
    }),
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

      {/* Navigation arrows - only on desktop */}
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

      {/* Screen container with click navigation */}
      <div
        className="h-full w-full cursor-pointer"
        onClick={handleClick}
      >
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

      {/* Awards Hub modal — opens on top of story mode */}
      {showAwardsHub && updateGame && (
        <AwardsHub
          allGames={(allGames as unknown) as GameWithMetrics[]}
          rawGames={allGames}
          updateGame={updateGame}
          onClose={() => setShowAwardsHub(false)}
          initialTab="week"
          initialPeriodKey={weekAwardPeriodKey}
        />
      )}
    </div>
  );
}
