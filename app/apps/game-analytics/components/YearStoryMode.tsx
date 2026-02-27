'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Game } from '../lib/types';
import { YearInReviewFullData } from '../lib/calculations';
import { generateYearBlurbs, YearAIBlurbType, AIBlurbResult } from '../lib/ai-game-service';
import { useAwards, awardYearKey, awardQuarterKey } from '../hooks/useAwards';
import { AwardsSummaryCard, AwardPickInfo } from './story-screens/AwardsSummaryCard';
import { AwardsHub } from './AwardsHub';
import { GameWithMetrics } from '../hooks/useAnalytics';

import { YearTitleScreen } from './story-screens/YearTitleScreen';
import { YearInNumbersScreen } from './story-screens/YearInNumbersScreen';
import { YearChaptersScreen } from './story-screens/YearChaptersScreen';
import { YearGameOfYearScreen } from './story-screens/YearGameOfYearScreen';
import { YearTop10Screen } from './story-screens/YearTop10Screen';
import { YearGenreScreen } from './story-screens/YearGenreScreen';
import { YearBestMonthScreen } from './story-screens/YearBestMonthScreen';
import { YearCompletionWallScreen } from './story-screens/YearCompletionWallScreen';
import { YearMoneyScreen } from './story-screens/YearMoneyScreen';
import { YearPlotTwistsScreen } from './story-screens/YearPlotTwistsScreen';
import { YearPersonalityEvolutionScreen } from './story-screens/YearPersonalityEvolutionScreen';
import { YearAIBlurbScreen } from './story-screens/YearAIBlurbScreen';
import { YearClosingScreen } from './story-screens/YearClosingScreen';

interface YearStoryModeProps {
  data: YearInReviewFullData;
  allGames: Game[];
  onClose: () => void;
  yearTitle?: string;
  chapterTitles?: Record<string, string>;
  updateGame?: (id: string, updates: Partial<Game>) => Promise<Game>;
}

export function YearStoryMode({ data, allGames, onClose, yearTitle, chapterTitles, updateGame }: YearStoryModeProps) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [direction, setDirection] = useState(0);
  const [aiBlurbs, setAiBlurbs] = useState<Partial<Record<YearAIBlurbType, AIBlurbResult>>>({});
  const [isLoadingAI, setIsLoadingAI] = useState(true);
  const [showAwardsHub, setShowAwardsHub] = useState(false);

  const currentScreenRef = useRef(0);
  const totalScreensRef = useRef(0);
  useEffect(() => { currentScreenRef.current = currentScreen; }, [currentScreen]);

  const goToNext = useCallback(() => {
    if (currentScreenRef.current < totalScreensRef.current - 1) {
      setDirection(1); setCurrentScreen(currentScreenRef.current + 1);
    }
  }, []);

  const goToPrevious = useCallback(() => {
    if (currentScreenRef.current > 0) {
      setDirection(-1); setCurrentScreen(currentScreenRef.current - 1);
    }
  }, []);

  // Award summary
  const yearDate = new Date(data.year, 0, 1);
  const yearAwardKey = useMemo(() => awardYearKey(yearDate), [data.year]);
  const { getPicksForPeriod } = useAwards(allGames, updateGame || (async (id: string) => allGames.find(g => g.id === id) as Game));
  const yearPicks = useMemo(() => getPicksForPeriod('year', yearAwardKey), [getPicksForPeriod, yearAwardKey]);

  const YEAR_CATEGORIES = [
    { id: 'game_of_year', label: 'Game of the Year', icon: '🏆' },
    { id: 'soulmate', label: 'The Soulmate', icon: '💛' },
    { id: 'biggest_surprise', label: 'Biggest Surprise', icon: '😮' },
    { id: 'endurance', label: 'The Endurance Award', icon: '⏳' },
    { id: 'best_investment', label: 'Best Investment', icon: '💰' },
    { id: 'session_of_year', label: 'Session of the Year', icon: '⚡' },
    { id: 'one_that_got_away', label: 'The One That Got Away', icon: '👻' },
    { id: 'legacy', label: 'The Legacy', icon: '🌟' },
    { id: 'ai_choice', label: 'AI Choice Award', icon: '🤖' },
  ];

  const awardPickInfos: AwardPickInfo[] = useMemo(() => {
    return YEAR_CATEGORIES.map(cat => {
      const pickedGameId = yearPicks[cat.id];
      const pickedGame = pickedGameId ? allGames.find(g => g.id === pickedGameId) : undefined;
      return { categoryId: cat.id, categoryLabel: cat.label, categoryIcon: cat.icon, gameId: pickedGame?.id, gameName: pickedGame?.name, gameThumbnail: pickedGame?.thumbnail };
    });
  }, [yearPicks, allGames]);

  // Load AI
  useEffect(() => {
    if (!data.hasData) { setIsLoadingAI(false); return; }
    const load = async () => {
      try {
        setIsLoadingAI(true);
        const blurbs = await generateYearBlurbs(data.year, data.topGame?.game.name || null, data.totalHours, data.topGenre, data.completedGames.length, data.totalSpent);
        setAiBlurbs(blurbs);
      } catch { /* silent */ }
      finally { setIsLoadingAI(false); }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const screens = [
    // ─── ACT 1: THE YEAR OPENS ───
    <YearTitleScreen key="title" data={data} yearTitle={yearTitle} aiBlurb={aiBlurbs['year-opening']?.text} />,
    <YearInNumbersScreen key="numbers" data={data} />,
    <YearAIBlurbScreen key="ai-opening" blurb={aiBlurbs['year-opening']?.text || null} type="year-opening" isLoading={isLoadingAI && !aiBlurbs['year-opening']} year={data.year} />,
    <YearChaptersScreen key="chapters" data={data} chapterTitles={chapterTitles} />,

    // ─── ACT 2: THE HALL OF FAME ───
    data.topGame ? <YearGameOfYearScreen key="goty" data={data} /> : null,
    data.top10Games.length >= 3 ? <YearTop10Screen key="top10" data={data} /> : null,
    data.genreBreakdown.length > 0 ? <YearGenreScreen key="genre" data={data} /> : null,
    data.peakMonth ? <YearBestMonthScreen key="best-month" data={data} /> : null,
    <YearCompletionWallScreen key="completions" data={data} />,

    // ─── ACT 3: MONEY & MILESTONES ───
    <YearMoneyScreen key="money" data={data} />,
    data.plotTwists.length > 0 ? <YearPlotTwistsScreen key="plot-twists" data={data} /> : null,
    <YearPersonalityEvolutionScreen key="personality" data={data} />,

    // ─── ACT 4: HOT TAKE ───
    aiBlurbs['year-hot-take']?.text ? (
      <YearAIBlurbScreen key="hot-take" blurb={aiBlurbs['year-hot-take']?.text || null} type="year-hot-take" isLoading={isLoadingAI && !aiBlurbs['year-hot-take']} year={data.year} />
    ) : null,

    // ─── ACT 5: AWARDS & EPILOGUE ───
    data.gamesPlayed.length > 0 ? (
      <AwardsSummaryCard
        key="awards"
        periodType="year"
        periodLabel={`${data.year} Awards`}
        picks={awardPickInfos}
        totalCategories={9}
        onOpenAwardsHub={() => setShowAwardsHub(true)}
      />
    ) : null,
    <YearAIBlurbScreen key="ai-closing" blurb={aiBlurbs['year-closing']?.text || null} type="year-closing" isLoading={isLoadingAI && !aiBlurbs['year-closing']} year={data.year} />,
    <YearClosingScreen key="closing" data={data} yearTitle={yearTitle} />,
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
    if (e.clientX - rect.left < rect.width * 0.3) goToPrevious(); else goToNext();
  };

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050508] overflow-hidden">
      {/* Subtle starfield bg */}
      <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(245,158,11,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(168,85,247,0.08) 0%, transparent 50%)' }} />

      <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm">
        <X size={24} className="text-white" />
      </button>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-4 max-w-[80%] overflow-x-auto">
        {screens.map((_, i) => (
          <button key={i} onClick={() => { setDirection(i > currentScreen ? 1 : -1); setCurrentScreen(i); }} className="group shrink-0">
            <div className={`h-1.5 rounded-full transition-all duration-300 ${i === currentScreen ? 'bg-amber-400 w-8' : i < currentScreen ? 'bg-amber-400/40 w-4' : 'bg-white/15 w-4'} group-hover:bg-amber-400/70`} />
          </button>
        ))}
      </div>

      {currentScreen > 0 && (
        <button onClick={goToPrevious} className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm hidden md:flex">
          <ChevronLeft size={24} className="text-white" />
        </button>
      )}
      {currentScreen < totalScreens - 1 && (
        <button onClick={goToNext} className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm hidden md:flex">
          <ChevronRight size={24} className="text-white" />
        </button>
      )}

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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }} className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 text-white/30 text-sm">
          Tap to continue
        </motion.div>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 text-white/20 text-xs">
        {currentScreen + 1} / {totalScreens}
      </div>

      {showAwardsHub && updateGame && (
        <AwardsHub
          allGames={(allGames as unknown) as GameWithMetrics[]}
          rawGames={allGames}
          updateGame={updateGame}
          onClose={() => setShowAwardsHub(false)}
          initialTab="year"
          initialPeriodKey={yearAwardKey}
        />
      )}
    </div>
  );
}
