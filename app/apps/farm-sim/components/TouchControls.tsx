'use client';

import { useCallback, useEffect, useRef } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Hand } from 'lucide-react';
import type { InputState } from '../lib/realtime/input';

interface Props {
  inputRef: React.MutableRefObject<InputState>;
  onAction: () => void; // fires a discrete action tap (for feedback)
}

/**
 * Virtual D-pad + action button for mobile.
 * Writes directly into inputRef (same object the rAF loop reads) so no
 * React state changes are needed — zero re-renders per touch event.
 *
 * Each button sets its direction on touchstart/mousedown and clears it on
 * touchend/mouseup. A single pointer can hold a direction while tapping
 * action with another finger because each button tracks its own pointer IDs.
 */
export function TouchControls({ inputRef, onAction }: Props) {
  // Track which pointer is holding each direction so we only clear it when
  // that specific pointer releases (multi-touch safe).
  const heldRef = useRef<Record<string, number | null>>({
    up: null, down: null, left: null, right: null, action: null,
  });

  const press = useCallback((dir: keyof InputState, pointerId: number) => {
    heldRef.current[dir] = pointerId;
    inputRef.current[dir] = true;
  }, [inputRef]);

  const release = useCallback((dir: keyof InputState) => {
    heldRef.current[dir] = null;
    inputRef.current[dir] = false;
  }, [inputRef]);

  // Release all directions if all touches lift (safety net for edge cases)
  useEffect(() => {
    const onTouchEnd = () => {
      // Don't clear everything — let individual pointers handle their own release
    };
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => window.removeEventListener('touchend', onTouchEnd);
  }, []);

  const dpadBtn = (
    dir: 'up' | 'down' | 'left' | 'right',
    Icon: typeof ArrowUp,
    label: string,
    extraClass: string,
  ) => (
    <button
      type="button"
      aria-label={label}
      className={`touch-dpad-btn ${extraClass}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        press(dir, e.pointerId);
      }}
      onPointerUp={() => release(dir)}
      onPointerCancel={() => release(dir)}
      onPointerLeave={() => release(dir)}
    >
      <Icon size={18} />
    </button>
  );

  return (
    <>
      {/* ── D-pad (bottom-left) ─────────────────────────────────────────── */}
      <div className="pointer-events-none absolute bottom-[4.5rem] left-2 z-20 select-none md:hidden">
        {/* Up */}
        <div className="flex justify-center pointer-events-auto">
          {dpadBtn('up', ArrowUp, 'Move up', 'dpad-up')}
        </div>
        {/* Middle row: Left + blank + Right */}
        <div className="flex items-center gap-0 pointer-events-auto">
          {dpadBtn('left', ArrowLeft, 'Move left', 'dpad-left')}
          <div className="h-10 w-10" />
          {dpadBtn('right', ArrowRight, 'Move right', 'dpad-right')}
        </div>
        {/* Down */}
        <div className="flex justify-center pointer-events-auto">
          {dpadBtn('down', ArrowDown, 'Move down', 'dpad-down')}
        </div>
      </div>

      {/* ── Action button (bottom-right) ────────────────────────────────── */}
      <button
        type="button"
        aria-label="Use selected tool"
        className="absolute bottom-[5.5rem] right-3 z-20 hidden h-14 w-14 select-none items-center justify-center rounded-full border border-[#f1d27a]/60 bg-[#18251d]/85 text-[#f1d27a] shadow-xl backdrop-blur-sm transition-transform active:scale-95 active:bg-[#263a2d] max-md:flex"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          press('action', e.pointerId);
        }}
        onPointerUp={() => {
          release('action');
          onAction();
        }}
        onPointerCancel={() => release('action')}
        onPointerLeave={() => release('action')}
      >
        <Hand size={23} />
      </button>

      <style jsx global>{`
        .touch-dpad-btn {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 0.5rem;
          background: rgba(0,0,0,0.55);
          border: 1px solid rgba(255,255,255,0.12);
          backdrop-filter: blur(4px);
          color: rgba(255,255,255,0.8);
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
        }
        .touch-dpad-btn:active {
          background: rgba(255,255,255,0.15);
          color: white;
        }
      `}</style>
    </>
  );
}
