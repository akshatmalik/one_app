'use client';

import { useEffect, useRef, useCallback } from 'react';
import { GameState, PlayerAction, CropId } from '../lib/types';
import { BuildTool } from './BuildPanel';
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
  CAN_MAX_CHARGES,
} from '../lib/realtime/player';
import {
  InputState,
  makeInputState,
  attachKeyboard,
} from '../lib/realtime/input';
import { toolToAction } from '../lib/realtime/interact';
import type { ToolId } from '../lib/realtime/player';
import { clockToTimeOfDay } from '../render/lighting';
import { lockedScenery } from '../lib/worldScenery';
import { TouchControls } from './TouchControls';

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
const WATER_EFFECT_MS = 900;

interface Props {
  state: GameState;
  selectedCrop: CropId | null;
  activeTool: ToolId;           // controlled from parent — synced into playerRef each frame
  buildTool: BuildTool | null;
  onAction: (action: PlayerAction) => boolean;
  onToolChange: (tool: ToolId) => void;
  onPlayerMove?: (player: PlayerState) => void;
}

// ── Collision helper ─────────────────────────────────────────────────────────

function collidesWithTiles(
  px: number,
  py: number,
  tiles: GameState['tiles'],
  seed: number,
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
      if (t.kind === 'reservoir' || t.kind === 'shed' || t.kind === 'mill' || t.kind === 'depot' || t.kind === 'crate' || t.kind === 'brush' || t.kind === 'rock' || t.kind === 'marsh') return true;
      if (t.kind === 'locked' && lockedScenery(seed, r * GRID_SIZE + c)) return true;
    }
  }
  return false;
}

// ── Player update (called at fixed 60 fps) ────────────────────────────────────

function updatePlayer(
  player: PlayerState,
  input: InputState,
  tiles: GameState['tiles'],
  seed: number,
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
    if (!collidesWithTiles(nx, player.y, tiles, seed)) player.x = nx;

    const ny = player.y + dy * speed;
    if (!collidesWithTiles(player.x, ny, tiles, seed)) player.y = ny;

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
  activeTool,
  buildTool,
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
  const actionCooldownRef = useRef<number>(0);
  const fpsRef       = useRef<number>(60);
  const fpsCountRef  = useRef<number>(0);
  const fpsTimeRef   = useRef<number>(0);
  const waterEffectsRef = useRef<Array<{ idx: number; startedAt: number }>>([]);

  // Mirror latest React state into refs so the rAF closure always reads fresh.
  const stateRef        = useRef(state);
  const selectedCropRef = useRef(selectedCrop);
  const activeToolRef   = useRef(activeTool);
  const buildToolRef    = useRef(buildTool);
  const onActionRef     = useRef(onAction);
  const onToolChangeRef = useRef(onToolChange);
  const onPlayerMoveRef = useRef(onPlayerMove);

  stateRef.current        = state;
  selectedCropRef.current = selectedCrop;
  activeToolRef.current   = activeTool;
  buildToolRef.current    = buildTool;
  onActionRef.current     = onAction;
  onToolChangeRef.current = onToolChange;
  onPlayerMoveRef.current = onPlayerMove;

  // Keep playerRef.tool in sync with the HUD's authoritative tool selection.
  // This prevents the rAF onPlayerMove callback from reverting tool picks.
  playerRef.current.tool = activeTool;

  // ── Boot ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const atlas = buildAtlas();

    const resize = () => {
      const worldW = GRID_SIZE * TILE_PX;
      const worldH = GRID_SIZE * TILE_PX;
      const renderScale = Math.max(
        1,
        canvas.offsetWidth / worldW,
        canvas.offsetHeight / worldH
      );
      const nextWidth = Math.ceil(canvas.offsetWidth / renderScale);
      const nextHeight = Math.ceil(canvas.offsetHeight / renderScale);
      if (canvas.width !== nextWidth) canvas.width = nextWidth;
      if (canvas.height !== nextHeight) canvas.height = nextHeight;
      if (!camRef.current) {
        const player = playerRef.current;
        // Center camera on player at boot.
        const initX = player.x + 12 - canvas.width / 2;
        const initY = player.y + 18 - canvas.height / 2;
        camRef.current = clampCamera({
          x: initX, y: initY,
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
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const gs = stateRef.current;
      const TOOLS: ToolId[] = ['hand', 'hoe', 'can', 'seeds', 'builder'];
      if (gs.upgrades.includes('tractor')) TOOLS.push('tractor');
      if (gs.upgrades.includes('seeder')) TOOLS.push('seeder');

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
        updatePlayer(player, input, gs.tiles, gs.seed, SIM_DT);

        const wantsAction = input.action || input.actionQueued;

        // Refill watering can: action while can is equipped + facing reservoir/channel/well
        if (wantsAction && player.tool === 'can' && actionCooldownRef.current <= 0) {
          const facingIdx = facingTileIdx(player, GRID_SIZE);
          if (facingIdx !== null) {
            const ft = gs.tiles[facingIdx];
            if (ft && (ft.kind === 'reservoir' || ft.kind === 'channel' || ft.kind === 'well')) {
              player.waterCharges = CAN_MAX_CHARGES;
              actionCooldownRef.current = 30;
            }
          }
        }

        // Action button: fire tool on facing tile, with cooldown for hold-to-repeat
        if (wantsAction) {
          if (actionCooldownRef.current <= 0) {
            const act = toolToAction(player, gs, selectedCropRef.current);
            if (act) {
              const ok = onActionRef.current(act);
              if (ok) {
                if (act.type === 'water') {
                  waterEffectsRef.current.push({ idx: act.idx, startedAt: now });
                  player.waterCharges = Math.max(0, player.waterCharges - 1);
                }
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
        input.actionQueued = false;
      }

      // Camera follow
      if (camRef.current) {
        if (camRef.current.viewW !== canvas.width || camRef.current.viewH !== canvas.height) {
          camRef.current = clampCamera({
            ...camRef.current,
            viewW: canvas.width,
            viewH: canvas.height,
          });
        }
        camRef.current = followPlayer(camRef.current, player);
      }

      // FPS counter (updates once per second)
      fpsCountRef.current++;
      if (now - fpsTimeRef.current >= 1000) {
        fpsRef.current = fpsCountRef.current;
        fpsCountRef.current = 0;
        fpsTimeRef.current = now;
      }

      // Notify page of player position (for HUD facing tile)
      onPlayerMoveRef.current?.(player);

      // Render
      const cam = camRef.current;
      if (cam && ctx) {
        waterEffectsRef.current = waterEffectsRef.current.filter(
          (effect) => now - effect.startedAt < WATER_EFFECT_MS
        );
        renderWorld(ctx, gs, atlas, cam, {
          tod: clockToTimeOfDay(gs.time),
          player,
          waterEffects: waterEffectsRef.current.map((effect) => ({
            idx: effect.idx,
            progress: (now - effect.startedAt) / WATER_EFFECT_MS,
          })),
          showIrrigation: activeToolRef.current === 'builder',
          buildTool: buildToolRef.current,
        });
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    // ── window.__farm console API ──────────────────────────────────────────
    if (typeof window !== 'undefined') {
      (window as any).__farm = {
        getState: () => stateRef.current,
        getPlayer: () => playerRef.current,
        getFps: () => fpsRef.current,
        dispatch: (action: PlayerAction) => onActionRef.current(action),
        tp: (row: number, col: number) => {
          playerRef.current.x = col * TILE_PX + 4;
          playerRef.current.y = row * TILE_PX;
          console.log(`[farm] teleported to tile (${row}, ${col})`);
        },
        addGold: (n: number) => onActionRef.current({ type: 'sell', crop: 'wheat', qty: 0 } as any) || console.log('[farm] use dispatch directly: __farm.dispatch({type:"sell",...})'),
        tillAll: () => {
          const gs = stateRef.current;
          let count = 0;
          gs.tiles.forEach((t, idx) => {
            if (t.kind === 'grass') {
              onActionRef.current({ type: 'till', idx });
              count++;
            }
          });
          console.log(`[farm] tilled ${count} tiles`);
        },
        waterAll: () => {
          const gs = stateRef.current;
          let count = 0;
          gs.tiles.forEach((t, idx) => {
            if (t.kind === 'tilled') {
              onActionRef.current({ type: 'water', idx });
              count++;
            }
          });
          console.log(`[farm] watered ${count} tiles`);
        },
        help: () => console.log(
          '[farm API]\n' +
          '  __farm.getState()       — full GameState\n' +
          '  __farm.getPlayer()      — player position/tool/charges\n' +
          '  __farm.getFps()         — current FPS\n' +
          '  __farm.tp(row, col)     — teleport player to tile\n' +
          '  __farm.dispatch(action) — fire any PlayerAction\n' +
          '  __farm.tillAll()        — till every grass tile\n' +
          '  __farm.waterAll()       — water every tilled tile\n' +
          '  Press ` (backtick) in-game to toggle dev overlay'
        ),
      };
      console.log('[farm] dev API ready — type __farm.help() for commands');
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      detachKeys();
      window.removeEventListener('keydown', onKeyDown);
      resetAtlas();
      if (typeof window !== 'undefined') delete (window as any).__farm;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Canvas tap → walk to tile (or show tile info) ─────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const cam = camRef.current;
    if (!cam) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const screenX = (e.clientX - rect.left) * (canvasRef.current!.width / rect.width);
    const screenY = (e.clientY - rect.top) * (canvasRef.current!.height / rect.height);
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

    // Try to use tool on the tapped tile if it's adjacent to where the player is standing
    const standingRow = Math.floor((player.y + 24) / TILE_PX);
    const standingCol = Math.floor((player.x + 12) / TILE_PX);

    // We allow interaction if the tapped tile is adjacent (including diagonals)
    if (Math.abs(row - standingRow) <= 1 && Math.abs(col - standingCol) <= 1) {
      const tappedIdx = row * GRID_SIZE + col;

      let act: PlayerAction | null = null;
      const currentBuildTool = buildToolRef.current;
      if (currentBuildTool) {
        if (currentBuildTool === 'channel') act = { type: 'buildChannel', idx: tappedIdx };
        else if (currentBuildTool === 'well') act = { type: 'digWell', idx: tappedIdx };
        else if (currentBuildTool === 'sprinkler') act = { type: 'buildSprinkler', idx: tappedIdx };
        else if (currentBuildTool === 'crate') act = { type: 'buildFieldCrate', idx: tappedIdx };
        else if (currentBuildTool === 'clear') act = { type: 'clearLand', idx: tappedIdx };
        else if (currentBuildTool === 'demolish') act = { type: 'demolish', idx: tappedIdx };
      } else {
        act = toolToAction(player, stateRef.current, selectedCropRef.current, tappedIdx);
      }

      if (act) {
        const ok = onActionRef.current(act);
        if (ok && act.type === 'water') {
          waterEffectsRef.current.push({ idx: act.idx, startedAt: performance.now() });
          playerRef.current.waterCharges = Math.max(0, playerRef.current.waterCharges - 1);
        }
      }
    }
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full touch-none"
        onPointerDown={handlePointerDown}
        style={{ imageRendering: 'pixelated', cursor: 'crosshair' }}
      />
      <TouchControls
        inputRef={inputRef}
        onAction={() => { inputRef.current.actionQueued = true; }}
      />
    </>
  );
}
