'use client';

import { useRef, useCallback, type MouseEvent as ReactMouseEvent } from 'react';
import type { PanInfo } from 'framer-motion';

// Swipe thresholds: trigger navigation on a deliberate horizontal drag or a quick flick
const SWIPE_OFFSET_THRESHOLD = 50; // px dragged
const SWIPE_VELOCITY_THRESHOLD = 300; // px/s flick

type ClickHandler = (e: ReactMouseEvent<HTMLDivElement>) => void;

interface StorySwipe {
  // Spread onto the animating screen <motion.div> to enable horizontal swipe navigation
  dragProps: {
    drag: 'x';
    dragDirectionLock: true;
    dragConstraints: { left: 0; right: 0 };
    dragElastic: number;
    onDragStart: () => void;
    onDragEnd: (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
  };
  // Wraps the existing tap handler so a swipe doesn't also register as a tap-advance
  guardClick: (handler: ClickHandler) => ClickHandler;
}

/**
 * Adds Instagram-story-style swipe navigation to a story modal.
 * Swipe left → next screen, swipe right → previous screen. Tap navigation
 * still works via `guardClick`, which suppresses the click that fires at the
 * end of a swipe gesture.
 */
export function useStorySwipe(goToNext: () => void, goToPrevious: () => void): StorySwipe {
  const swipedRef = useRef(false);

  const onDragStart = useCallback(() => {
    swipedRef.current = false;
  }, []);

  const onDragEnd = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset, velocity } = info;
      const swipedLeft = offset.x < -SWIPE_OFFSET_THRESHOLD || velocity.x < -SWIPE_VELOCITY_THRESHOLD;
      const swipedRight = offset.x > SWIPE_OFFSET_THRESHOLD || velocity.x > SWIPE_VELOCITY_THRESHOLD;

      if (swipedLeft) {
        swipedRef.current = true;
        goToNext();
      } else if (swipedRight) {
        swipedRef.current = true;
        goToPrevious();
      }
    },
    [goToNext, goToPrevious]
  );

  const guardClick = useCallback(
    (handler: ClickHandler): ClickHandler =>
      (e) => {
        if (swipedRef.current) {
          swipedRef.current = false;
          return;
        }
        handler(e);
      },
    []
  );

  return {
    dragProps: {
      drag: 'x',
      dragDirectionLock: true,
      dragConstraints: { left: 0, right: 0 },
      dragElastic: 0.4,
      onDragStart,
      onDragEnd,
    },
    guardClick,
  };
}
