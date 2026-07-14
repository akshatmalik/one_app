'use client';

import { useEffect, useRef, useCallback } from 'react';
import { GameState } from '../lib/types';
import { buildAtlas, resetAtlas } from '../render/atlas';
import { makeCamera, centerOnFarm, Camera } from '../render/camera';
import { renderWorld } from '../render/worldRenderer';

interface Props {
  state: GameState;
  selectedIdx: number | null;
  selectedSet?: Set<number>;
  onSelect: (idx: number) => void;
}

const TILE_PX = 32; // must match camera.ts TILE_PX
const GRID_SIZE = 12;

export function GameCanvas({ state, selectedIdx, selectedSet, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camRef = useRef<Camera | null>(null);
  const rafRef = useRef<number>(0);
  const stateRef = useRef(state);
  const selectedRef = useRef(selectedIdx);
  const selectedSetRef = useRef(selectedSet);

  // Keep refs current so the rAF closure always draws the latest state.
  stateRef.current = state;
  selectedRef.current = selectedIdx;
  selectedSetRef.current = selectedSet;

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const atlas = buildAtlas();

    // Size canvas to its CSS container.
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      camRef.current = centerOnFarm(makeCamera(canvas.width, canvas.height));
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // rAF render loop — 60 fps, pure draw (no update logic in R0).
    const loop = () => {
      const cam = camRef.current;
      if (!cam || !ctx) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // In multi-select mode, highlight the whole set; otherwise single tile.
      const selIdx = selectedSetRef.current?.size
        ? null
        : selectedRef.current;

      renderWorld(ctx, stateRef.current, atlas, cam, {
        tod: 'day',
        selectedIdx: selIdx,
      });

      // Draw selected set outline
      if (selectedSetRef.current?.size) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 220, 60, 0.9)';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(255, 220, 60, 0.10)';
        selectedSetRef.current.forEach((idx) => {
          const col = idx % GRID_SIZE;
          const row = Math.floor(idx / GRID_SIZE);
          const sx = col * TILE_PX - cam.x + 1;
          const sy = row * TILE_PX - cam.y + 1;
          ctx.strokeRect(sx, sy, TILE_PX - 2, TILE_PX - 2);
          ctx.fillRect(sx, sy, TILE_PX - 2, TILE_PX - 2);
        });
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      resetAtlas();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Tap → tile index ──────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const cam = camRef.current;
    if (!cam) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldX = screenX + cam.x;
    const worldY = screenY + cam.y;
    const col = Math.floor(worldX / TILE_PX);
    const row = Math.floor(worldY / TILE_PX);
    if (col < 0 || col >= GRID_SIZE || row < 0 || row >= GRID_SIZE) return;
    onSelect(row * GRID_SIZE + col);
  }, [onSelect]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full flex-1 block cursor-pointer touch-none"
      onPointerDown={handlePointerDown}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
