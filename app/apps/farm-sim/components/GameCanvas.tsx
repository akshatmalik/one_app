'use client';

import { useEffect, useRef, useCallback } from 'react';
import { GameState, PlayerAction, CropId } from '../lib/types';
import { GRID_SIZE } from '../lib/balance';
import { buildAtlas, resetAtlas } from '../render/atlas';
import { makeCamera, clampCamera, Camera } from '../render/camera';
import { TILE_PX } from '../render/camera';
import { renderWorld } from '../render/worldRenderer';
import {
  PlayerState,
  makePlayer,
  WALK_SPEED,
  RUN_SPEED,
  facingTileIdx,
} from '../lib/realtime/player';
import {
  InputState,
  makeInputState,
  attachKeyboard,
} from '../lib/realtime/input';
import { toolToAction } from '../lib/realtime/interact';
import type { ToolId } from '../lib/realtime/player';

// Sprite footprint at 2× scale: source is 12×18 → 24×36 screen px
const SPRITE_W = 24;
const SPRITE_H = 36;
// Hitbox inside the sprite (feet area)
const HIT_X0 = 4;
const HIT_X1 = 20;
const HIT_Y0 = 20;
const HIT_Y1 = 36;

/** Fixed-timestep simulation rate. */
const SIM_DT = 1 / 60;

interface Props {
  state: GameState;
  selectedCrop: CropId | null;
  onAction: (action: PlayerAction) => boolean;
  onToolChange: (tool: ToolId) => void;
  onPlayerMove?: (player: PlayerState) => void;
}

// ── Collision helper ─────────────────────────────────────────────────────────

function collidesWithTiles(
  px: number,
  py: number,
  tiles: GameState['tiles'],
): boolean {
  const x0 = px + HIT_X0;
  const x1 = px + HIT_X1;
  const y0 = py + HIT_Y0;
  const y1 = py + HIT_Y1;

  const cols = [
    Math.floor(x0 / TILE_PX),
    Math.floor((x1 - 1) / TILE_PX),
  ];
  const rows = [
    Math.floor(y0 / TILE_PX),
    Math.floor((y1 - 1) / TILE_PX),
  ];

  for (const r of rows) {
    for (const c of cols) {
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return true;
      const t = tiles[r * GRID_SIZE + c];
      if (t.kind === 'locked' || t.kind === 'reservoir') return true;
    }
  }
  return false;
}

// ── Player update (called at fixed 60 fps) ────────────────────────────────────

function updatePlayer(
  player: PlayerState,
  input: InputState,
  tiles: GameState['tiles'],
  dt: number,
): void {
  const speed = (input.run ? RUN_SPEED : WALK_SPEED) * TILE_PX * dt;

  let dx = 0;
  let dy = 0;
  if (input.left)  { dx -= 1; player.facing = 'left'; }
  if (input.right) { dx += 1; player.facing = 'right'; }
  if (input.up)    { dy -= 1; player.facing = 'up'; }
  if (input.down)  { dy += 1; player.facing = 'down'; }

  // Diagonal normalisation
  if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }

  player.isMoving = dx !== 0 || dy !== 0;

  if (player.isMoving) {
    const nx = player.x + dx * speed;
    if (!collidesWithTiles(nx, player.y, tiles)) player.x = nx;

    const ny = player.y + dy * speed;
    if (!collidesWithTiles(player.x, ny, tiles)) player.y = ny;

    // Walk animation: toggle frame every 8 ticks
    player.walkTick++;
    if (player.walkTick >= 8) {
      player.walkTick = 0;
      player.walkFrame = player.walkFrame === 0 ? 1 : 0;
    }
  } else {
    player.walkFrame = 0;
    player.walkTick  = 0;
  }
}

// ── Camera smooth-follow ──────────────────────────────────────────────────────

function followPlayer(cam: Camera, player: PlayerState): Camera {
  const targetX = player.x + SPRITE_W / 2 - cam.viewW / 2;
  const targetY = player.y + SPRITE_H / 2 - cam.viewH / 2;
  const lerp = 0.08;
  return clampCamera({
    ...cam,
    x: cam.x + (targetX - cam.x) * lerp,
    y: cam.y + (targetY - cam.y) * lerp,
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GameCanvas({
  state,
  selectedCrop,
  onAction,
  onToolChange,
  onPlayerMove,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // All mutable runtime state lives in refs — no React re-renders per frame.
  const camRef       = useRef<Camera | null>(null);
  const playerRef    = useRef<PlayerState>(makePlayer(GRID_SIZE));
  const inputRef     = useRef<InputState>(makeInputState());
  const rafRef       = useRef<number>(0);
  const accumRef     = useRef<number>(0);
  const lastTimeRef  = useRef<number>(0);
  const actionCooldownRef = useRef<number>(0); // frames until next auto-repeat action

  // Mirror latest React state into refs so the rAF closure always reads fresh.
  const stateRef      = useRef(state);
  const selectedCropRef = useRef(selectedCrop);
  const onActionRef   = useRef(onAction);
  const onToolChangeRef = useRef(onToolChange);
  const onPlayerMoveRef = useRef(onPlayerMove);

  stateRef.current      = state;
  selectedCropRef.current = selectedCrop;
  onActionRef.current   = onAction;
  onToolChangeRef.current = onToolChange;
  onPlayerMoveRef.current = onPlayerMove;

  // ── Boot ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const atlas = buildAtlas();

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      if (!camRef.current) {
        const worldW = GRID_SIZE * TILE_PX;
        const worldH = GRID_SIZE * TILE_PX;
        camRef.current = clampCamera({
          x: 0, y: 0,
          viewW: canvas.width,
          viewH: canvas.height,
          worldW,
          worldH,
        });
      } else {
        camRef.current = clampCamera({
          ...camRef.current,
          viewW: canvas.width,
          viewH: canvas.height,
        });
      }
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Keyboard
    const detachKeys = attachKeyboard(inputRef.current);

    // Q/E tool cycling
    const TOOLS: ToolId[] = ['hand', 'hoe', 'can', 'seeds', 'builder'];
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'q' || e.key === 'Q') {
        const cur = playerRef.current.tool;
        const idx = TOOLS.indexOf(cur);
        const next = TOOLS[(idx - 1 + TOOLS.length) % TOOLS.length];
        playerRef.current.tool = next;
        onToolChangeRef.current(next);
      } else if (e.key === 'e' || e.key === 'E') {
        const cur = playerRef.current.tool;
        const idx = TOOLS.indexOf(cur);
        const next = TOOLS[(idx + 1) % TOOLS.length];
        playerRef.current.tool = next;
        onToolChangeRef.current(next);
      }
    };
    window.addEventListener('keydown', onKeyDown);

    // rAF loop with fixed-timestep simulation
    const loop = (now: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = now;
      const rawDt = Math.min((now - lastTimeRef.current) / 1000, 0.1); // cap at 100ms
      lastTimeRef.current = now;
      accumRef.current += rawDt;

      const player = playerRef.current;
      const input  = inputRef.current;
      const gs     = stateRef.current;

      // Fixed-step simulation
      while (accumRef.current >= SIM_DT) {
        accumRef.current -= SIM_DT;
        updatePlayer(player, input, gs.tiles, SIM_DT);

        // Action button: fire tool on facing tile, with cooldown for hold-to-repeat
        if (input.action) {
          if (actionCooldownRef.current <= 0) {
            const act = toolToAction(player, gs, selectedCropRef.current);
            if (act) {
              const ok = onActionRef.current(act);
              if (ok) {
                // First press: 30-frame delay before repeat; then 12-frame repeat
                actionCooldownRef.current = actionCooldownRef.current === 0 ? 30 : 12;
              }
            }
          } else {
            actionCooldownRef.current--;
          }
        } else {
          actionCooldownRef.current = 0;
        }
      }

      // Camera follow
      if (camRef.current) {
        camRef.current = followPlayer(camRef.current, player);
      }

      // Notify page of player position (for HUD facing tile)
      onPlayerMoveRef.current?.(player);

      // Render
      const cam = camRef.current;
      if (cam && ctx) {
        renderWorld(ctx, gs, atlas, cam, {
          tod: 'day',
          player,
        });
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      detachKeys();
      window.removeEventListener('keydown', onKeyDown);
      resetAtlas();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Canvas tap → walk to tile (or show tile info) ─────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const cam = camRef.current;
    if (!cam) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldX  = screenX + cam.x;
    const worldY  = screenY + cam.y;

    // Snap to tile centre and walk player toward it (direct, no pathfinding yet)
    const col = Math.floor(worldX / TILE_PX);
    const row = Math.floor(worldY / TILE_PX);
    if (col < 0 || col >= GRID_SIZE || row < 0 || row >= GRID_SIZE) return;

    // Set player facing toward the tapped tile relative to current position
    const player = playerRef.current;
    const centerX = col * TILE_PX + TILE_PX / 2;
    const centerY = row * TILE_PX + TILE_PX / 2;
    const px = player.x + SPRITE_W / 2;
    const py = player.y + SPRITE_H / 2;
    const absDx = Math.abs(centerX - px);
    const absDy = Math.abs(centerY - py);
    if (absDx >= absDy) {
      player.facing = centerX > px ? 'right' : 'left';
    } else {
      player.facing = centerY > py ? 'down' : 'up';
    }

    // Try to use tool on the tapped tile directly if it's adjacent
    const facingIdx = facingTileIdx(player, GRID_SIZE);
    const tappedIdx = row * GRID_SIZE + col;
    if (facingIdx === tappedIdx) {
      const act = toolToAction(player, stateRef.current, selectedCropRef.current);
      if (act) onActionRef.current(act);
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block touch-none"
      onPointerDown={handlePointerDown}
      style={{ imageRendering: 'pixelated', cursor: 'crosshair' }}
    />
  );
}
