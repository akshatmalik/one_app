'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Game } from '../lib/types';
import { QuarterInReviewData } from '../lib/calculations';
import { generateQuarterBlurbs, QuarterAIBlurbType, AIBlurbResult } from '../lib/ai-game-service';
import { useAwards, awardQuarterKey, awardQuarterLabel } from '../hooks/useAwards';
import { AwardsSummaryCard, AwardPickInfo } from './story-screens/AwardsSummaryCard';
import { AwardsHub } from './AwardsHub';
import { GameWithMetrics } from '../hooks/useAnalytics';

import { QuarterTitleScreen } from './story-screens/QuarterTitleScreen';
import { QuarterInNumbersScreen } from './story-screens/QuarterInNumbersScreen';
import { QuarterMonthArcScreen } from './story-screens/QuarterMonthArcScreen';
import { QuarterTopGameScreen } from './story-screens/QuarterTopGameScreen';
import { QuarterTop3Screen } from './story-screens/QuarterTop3Screen';
import { QuarterGenreScreen } from './story-screens/QuarterGenreScreen';
import { QuarterCompletionsScreen } from './story-screens/QuarterCompletionsScreen';
import { QuarterMoneyScreen } from './story-screens/QuarterMoneyScreen';
import { QuarterHotTakeScreen } from './story-screens/QuarterHotTakeScreen';
import { QuarterPersonalityScreen } from './story-screens/QuarterPersonalityScreen';
import { QuarterVsLastScreen } from './story-screens/QuarterVsLastScreen';
import { QuarterPlotTwistsScreen } from './story-screens/QuarterPlotTwistsScreen';
import { QuarterAIBlurbScreen } from './story-screens/QuarterAIBlurbScreen';
import { QuarterClosingScreen } from './story-screens/QuarterClosingScreen';

interface QuarterStoryModeProps {
  data: QuarterInReviewData;
  allGames: Game[];
  onClose: () => void;
  quarterTitle?: string;
  updateGame?: (id: string, updates: Partial<Game>) => Promise<Game>;
}

export function QuarterStoryMode({ data, allGames, onClose, quarterTitle, updateGame }: QuarterStoryModeProps) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [direction, setDirection] = useState(0);
  const [aiBlurbs, setAiBlurbs] = useState<Partial<Record<QuarterAIBlurbType, AIBlurbResult>>>({});
  const [isLoadingAI, setIsLoadingAI] = useState(true);
  const [showAwardsHub, setShowAwardsHub] = useState(false);

  const currentScreenRef = useRef(0);
  const totalScreensRef = useRef(0);
  useEffect(() => { currentScreenRef.current = currentScreen; }, [currentScreen]);

  const goToNext = useCallback(() => {
    if (currentScreenRef.current < totalScreensRef.current - 1) {
      setDirection(1);
      setCurrentScreen(currentScreenRef.current + 1);
    }
  }, []);

  const goToPrevious = useCallback(() => {
    if (currentScreenRef.current > 0) {
      setDirection(-1);
      setCurrentScreen(currentScreenRef.current - 1);
    }
  }, []);

  // Award summary data
  const qDate = new Date(data.year, (data.quarter - 1) * 3, 1);
  const quarterAwardKey = useMemo(() => awardQuarterKey(qDate), [data.year, data.quarter]);
  const quarterAwardLabel = useMemo(() => awardQuarterLabel(data.year, data.quarter), [data.year, data.quarter]);
  const { getPicksForPeriod } = useAwards(allGames, updateGame || (async (id: string) => allGames.find(g => g.id === id) as Game));
  const quarterPicks = useMemo(() => getPicksForPeriod('quarter', quarterAwardKey), [getPicksForPeriod, quarterAwardKey]);

  const QUARTER_CATEGORIES = [
    { id: 'game_of_quarter', label: 'Game of the Quarter', icon: '🥇' },
    { id: 'the_grower', label: 'The Grower', icon: '📈' },
    { id: 'most_consistent', label: 'Most Consistent', icon: '🎯' },
    { id: 'best_discovery', label: 'Best Discovery', icon: '💎' },
    { id: 'disappointment_quarter', label: 'Biggest Disappointment', icon: '😤' },
    { id: 'the_grind', label: 'The Grind', icon: '💪' },
    { id: 'genre_pioneer', label: 'Genre Pioneer', icon: '🎭' },
    { id: 'ai_spotlight', label: 'AI Spotlight', icon: '🤖' },
  ];

  const awardPickInfos: AwardPickInfo[] = useMemo(() => {
    return QUARTER_CATEGORIES.map(cat => {
      const pickedGameId = quarterPicks[cat.id];
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
  }, [quarterPicks, allGames]);

  // Load AI blurbs
  useEffect(() => {
    if (data.totalHours === 0) { setIsLoadingAI(false); return; }
    const load = async () => {
      try {
        setIsLoadingAI(true);
        const blurbs = await generateQuarterBlurbs(
          data.quarterLabel,
          data.topGame?.game.name || null,
          data.totalHours,
          data.topGenre,
          data.completedGames.length,
        );
        setAiBlurbs(blurbs);
      } catch { /* silently fail */ }
      finally { setIsLoadingAI(false); }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hotTake = aiBlurbs['quarter-hot-take']?.text || null;

  // Build screens
  const screens = [
    // ─── ACT 1: THE CHAPTER OPENS ───
    <QuarterTitleScreen key="title" data={data} quarterTitle={quarterTitle} aiBlurb={aiBlurbs['quarter-opening']?.text} />,
    <QuarterInNumbersScreen key="numbers" data={data} />,
    <QuarterMonthArcScreen key="arc" data={data} />,
    <QuarterAIBlurbScreen key="ai-opening" blurb={aiBlurbs['quarter-opening']?.text || null} type="quarter-opening" isLoading={isLoadingAI && !aiBlurbs['quarter-opening']} quarterLabel={data.quarterLabel} />,

    // ─── ACT 2: THE STARS ───
    data.top3Games.length >= 3 ? <QuarterTop3Screen key="top3" data={data} /> : null,
    data.topGame ? <QuarterTopGameScreen key="top-game" data={data} /> : null,
    data.genreBreakdown.length > 0 ? <QuarterGenreScreen key="genre" data={data} /> : null,
    <QuarterCompletionsScreen key="completions" data={data} />,

    // ─── ACT 3: THE RECKONING ───
    <QuarterMoneyScreen key="money" data={data} />,
    hotTake ? <QuarterHotTakeScreen key="hot-take" hotTake={hotTake} quarterLabel={data.quarterLabel} isLoading={isLoadingAI && !hotTake} /> : null,
    <QuarterPersonalityScreen key="personality" data={data} />,
    <QuarterVsLastScreen key="vs-last" data={data} />,
    data.plotTwists.length > 0 ? <QuarterPlotTwistsScreen key="plot-twists" data={data} /> : null,

    // ─── ACT 4: AWARDS & CLOSING ───
    data.gamesPlayed.length > 0 ? (
      <AwardsSummaryCard
        key="awards"
        periodType="quarter"
        periodLabel={quarterAwardLabel}
        picks={awardPickInfos}
        totalCategories={8}
        onOpenAwardsHub={() => setShowAwardsHub(true)}
      />
    ) : null,
    <QuarterAIBlurbScreen key="ai-closing" blurb={aiBlurbs['quarter-closing']?.text || null} type="quarter-closing" isLoading={isLoadingAI && !aiBlurbs['quarter-closing']} quarterLabel={data.quarterLabel} />,
    <QuarterClosingScreen key="closing" data={data} quarterTitle={quarterTitle} />,
  ].filter(Boolean);

  totalScreensRef.current = screens.length;
  const totalScreens = screens.length;

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goToNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goToPrevious(); }
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [goToNext, goToPrevious, onClose]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left < rect.width * 0.3) goToPrevious();
    else goToNext();
  };

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f] overflow-hidden">
      {/* Close */}
      <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm">
        <X size={24} className="text-white" />
      </button>

      {/* Progress dots */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-4 max-w-[80%] overflow-x-auto">
        {screens.map((_, i) => (
          <button key={i} onClick={() => { setDirection(i > currentScreen ? 1 : -1); setCurrentScreen(i); }} className="group shrink-0">
            <div className={`h-1 rounded-full transition-all duration-300 ${i === currentScreen ? 'bg-white w-6' : i < currentScreen ? 'bg-white/60 w-4' : 'bg-white/20 w-4'} group-hover:bg-white/80`} />
          </button>
        ))}
      </div>

      {/* Nav arrows */}
      {currentScreen > 0 && (
        <button onClick={goToPrevious} className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm hidden md:flex items-center justify-center">
          <ChevronLeft size={24} className="text-white" />
        </button>
      )}
      {currentScreen < totalScreens - 1 && (
        <button onClick={goToNext} className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm hidden md:flex items-center justify-center">
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
            transition={{ x: { type: 'spring', stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
            className="h-full w-full flex items-center justify-center p-4 pt-14 pb-16 md:p-8 md:pt-16 overflow-y-auto"
          >
            {screens[currentScreen]}
          </motion.div>
        </AnimatePresence>
      </div>

      {currentScreen === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 text-white/40 text-sm">
          Tap to continue
        </motion.div>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 text-white/30 text-xs">
        {currentScreen + 1} / {totalScreens}
      </div>

      {showAwardsHub && updateGame && (
        <AwardsHub
          allGames={(allGames as unknown) as GameWithMetrics[]}
          rawGames={allGames}
          updateGame={updateGame}
          onClose={() => setShowAwardsHub(false)}
          initialTab="quarter"
          initialPeriodKey={quarterAwardKey}
        />
      )}
    </div>
  );
}
