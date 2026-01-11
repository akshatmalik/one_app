'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { WeekInReviewData } from '../lib/calculations';
import { OpeningScreen } from './story-screens/OpeningScreen';
import { TotalHoursScreen } from './story-screens/TotalHoursScreen';
import { TopGameScreen } from './story-screens/TopGameScreen';
import { DailyBreakdownScreen } from './story-screens/DailyBreakdownScreen';
import { GamingPersonalityScreen } from './story-screens/GamingPersonalityScreen';
import { AchievementsScreen } from './story-screens/AchievementsScreen';
import { WeekVibeScreen } from './story-screens/WeekVibeScreen';
import { ComparisonScreen } from './story-screens/ComparisonScreen';
import { FunFactsScreen } from './story-screens/FunFactsScreen';
import { ClosingScreen } from './story-screens/ClosingScreen';
import { ValueUtilizedScreen } from './story-screens/ValueUtilizedScreen';
import { SessionTypesScreen } from './story-screens/SessionTypesScreen';

interface WeekStoryModeProps {
  data: WeekInReviewData;
  onClose: () => void;
}

export function WeekStoryMode({ data, onClose }: WeekStoryModeProps) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [direction, setDirection] = useState(0);

  // Define all screens with conditional rendering
  const screens = [
    <OpeningScreen key="opening" data={data} />,
    <TotalHoursScreen key="hours" data={data} />,
    data.topGame ? <TopGameScreen key="top-game" data={data} /> : null,
    <DailyBreakdownScreen key="daily" data={data} />,
    <SessionTypesScreen key="session-types" data={data} />,
    <GamingPersonalityScreen key="personality" data={data} />,
    (data.completedGames.length > 0 || data.newGamesStarted.length > 0 || data.milestonesReached.length > 0) ?
      <AchievementsScreen key="achievements" data={data} /> : null,
    <WeekVibeScreen key="vibe" data={data} />,
    data.totalValueUtilized > 0 ? <ValueUtilizedScreen key="value" data={data} /> : null,
    <ComparisonScreen key="comparison" data={data} />,
    <FunFactsScreen key="fun-facts" data={data} />,
    <ClosingScreen key="closing" data={data} />,
  ].filter(Boolean); // Remove null screens

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
    </div>
  );
}
