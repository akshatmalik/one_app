# Phase 1: Project Setup & The Grid (Mobile-First)

## Goal
By the end of this phase:
- Godot 4 project configured for **portrait mobile** (390×844)
- A 14×10 grid rendered at 56px tiles (~8 tiles visible at once)
- Camera pans smoothly over the grid with touch drag
- Camera snaps to follow the selected survivor
- Tapping a tile prints its coordinates

---

## Mobile-First Design Decisions

This game is designed portrait-first. The layout is:

```
┌──────────────────────┐ 390px wide
│  HUD (turn / phase)  │ ~60px tall
├──────────────────────┤
│                      │
│   SCROLLABLE GRID    │ ~580px tall
│                      │ (camera pans over 14×10 grid)
│   (pan by dragging)  │
│                      │
├──────────────────────┤
│  PINNED ACTION PANEL │ ~200px tall — always visible
│  (stats + buttons)   │ thumb-reachable zone
└──────────────────────┘
```

The grid is **784×560** (14×56px tiles). On a 390px wide screen, you see ~7 columns at a time. The user drags the grid to see the rest, or the camera auto-follows the selected survivor.

---

## Step 1: Create the Project

1. Open Godot 4
2. **New Project** → name `survivor_deckbuilder`
3. Renderer: **Compatibility** (best performance on mobile + web)
4. Create the folder structure from the README

---

## Step 2: Project Settings — Portrait Mobile

**Project → Project Settings:**

```
Display → Window:
  Width:          390
  Height:         844
  Stretch Mode:   canvas_items        ← scales UI cleanly
  Stretch Aspect: expand              ← fills different screen sizes
  Orientation:    Portrait            ← locks to portrait

Rendering → 2D:
  Snap 2D Transforms: ON
  Snap 2D Vertices:   ON

Input:
  Emulate Touch From Mouse: ON        ← lets you test touch in editor with mouse
  Emulate Mouse From Touch: ON        ← backwards compat
```

**For the HTML5 export** (used by CI/CD), the canvas fills the browser window automatically via `canvas_resize_policy=1` in the export preset.

---

## Step 3: Autoloads

Register these in **Project → Project Settings → Autoload**:

| Path | Name |
|------|------|
| `res://autoloads/Constants.gd` | `Constants` |
| `res://autoloads/GameState.gd` | `GameState` |
| `res://autoloads/SignalBus.gd` | `SignalBus` |
| `res://autoloads/GridUtils.gd` | `GridUtils` |
| `res://autoloads/NoiseSystem.gd` | `NoiseSystem` |
| `res://autoloads/CombatSystem.gd` | `CombatSystem` |
| `res://autoloads/TurnManager.gd` | `TurnManager` |

Create each as an empty `extends Node` file for now.

---

## Step 4: Constants.gd — Grid and Terrain

```gdscript
# autoloads/Constants.gd
extends Node

# ── Grid ─────────────────────────────────────────────
const GRID_COLS: int = 14
const GRID_ROWS: int = 10
const TILE_SIZE: int = 56          # 56px: visible ~7 cols on 390px screen

# ── Layout ───────────────────────────────────────────
const HUD_HEIGHT: int     = 60     # top bar (turn, phase)
const PANEL_HEIGHT: int   = 210    # pinned bottom panel
const GRID_VIEWPORT_H: int = 844 - HUD_HEIGHT - PANEL_HEIGHT  # ~574px

# Total grid pixel size
const GRID_PIXEL_W: int = GRID_COLS * TILE_SIZE   # 784
const GRID_PIXEL_H: int = GRID_ROWS * TILE_SIZE   # 560

# ── Terrain Types ─────────────────────────────────────
enum Terrain {
    FLOOR,
    OBSTACLE,
    DOOR,
    EXIT,
    GLASS,
    METAL,
    PUDDLE
}

const TERRAIN_COLORS: Dictionary = {
    Terrain.FLOOR:    Color(0.16, 0.16, 0.16),
    Terrain.OBSTACLE: Color(0.35, 0.29, 0.16),
    Terrain.DOOR:     Color(0.16, 0.29, 0.16),
    Terrain.EXIT:     Color(0.16, 0.16, 0.48),
    Terrain.GLASS:    Color(0.22, 0.29, 0.35),
    Terrain.METAL:    Color(0.29, 0.29, 0.29),
    Terrain.PUDDLE:   Color(0.16, 0.22, 0.29),
}

# ── Stage 1: "The Laboratory" ─────────────────────────
const STAGE_1_OBSTACLES: Array[Vector2i] = [
    Vector2i(0, 9), Vector2i(1, 9), Vector2i(2, 9), Vector2i(3, 9),
    Vector2i(4, 9), Vector2i(5, 9), Vector2i(7, 9), Vector2i(8, 9),
    Vector2i(9, 9), Vector2i(10, 9), Vector2i(11, 9), Vector2i(12, 9),
    Vector2i(13, 9)
]

const STAGE_1_TERRAIN: Dictionary = {
    Vector2i(3, 4): Terrain.GLASS,
    Vector2i(7, 6): Terrain.GLASS,
    Vector2i(5, 3): Terrain.METAL,
    Vector2i(9, 3): Terrain.METAL,
    Vector2i(6, 5): Terrain.PUDDLE,
    Vector2i(8, 7): Terrain.PUDDLE,
}

const STAGE_1_EXIT: Vector2i = Vector2i(6, 8)

# ── Helpers ───────────────────────────────────────────
static func is_valid_tile(tile: Vector2i) -> bool:
    return (tile.x >= 0 and tile.x < GRID_COLS and
            tile.y >= 0 and tile.y < GRID_ROWS)
```

---

## Step 5: Scene Tree

Create `scenes/Main.tscn`:

```
Main (Node2D)                      ← Main.gd, group: "main"
├── GridViewport (SubViewportContainer)
│   ├── SubViewport
│   │   ├── GameBoard (Node2D)     ← GameBoard.gd, group: "game_board"
│   │   └── Camera2D               ← GridCamera.gd
│   └── (anchors: fill top area)
└── UI (CanvasLayer)
    ├── HUD (Control)              ← top 60px
    └── ActionPanel (Control)      ← pinned bottom 210px
```

**Why SubViewport?**
The grid needs its own camera that can scroll independently of the pinned UI panels. `SubViewportContainer` clips the grid to the middle section of the screen while UI elements sit outside it at fixed positions.

**Alternatively** (simpler for now): Use a single `Camera2D` on the main scene and position UI nodes using `CanvasLayer` (which is unaffected by camera movement). This is the simpler path — use this first.

### Simpler approach (recommended to start):

```
Main (Node2D)                      ← Main.gd
├── GameBoard (Node2D)             ← GameBoard.gd, group: "game_board"
├── Camera2D                       ← GridCamera.gd
└── UI (CanvasLayer)               ← unaffected by camera
    ├── HUD                        ← top
    └── ActionPanel                ← pinned bottom
```

`CanvasLayer` nodes ignore the `Camera2D` — they always render at fixed screen positions. This means your action panel stays at the bottom regardless of where the camera is panning.

---

## Step 6: GameBoard.gd — Draw the Grid

```gdscript
# scripts/game/GameBoard.gd
extends Node2D

var terrain_map: Dictionary = {}
var highlighted_tiles: Array[Vector2i] = []
var selected_tile: Vector2i = Vector2i(-1, -1)

func _ready() -> void:
    add_to_group("game_board")
    _build_terrain_map()
    queue_redraw()

func _build_terrain_map() -> void:
    for row in range(Constants.GRID_ROWS):
        for col in range(Constants.GRID_COLS):
            terrain_map[Vector2i(col, row)] = Constants.Terrain.FLOOR

    for tile in Constants.STAGE_1_OBSTACLES:
        terrain_map[tile] = Constants.Terrain.OBSTACLE
    for tile in Constants.STAGE_1_TERRAIN:
        terrain_map[tile] = Constants.STAGE_1_TERRAIN[tile]
    terrain_map[Constants.STAGE_1_EXIT] = Constants.Terrain.EXIT

func _draw() -> void:
    for tile in terrain_map:
        _draw_tile(tile)

func _draw_tile(tile: Vector2i) -> void:
    var terrain: int = terrain_map.get(tile, Constants.Terrain.FLOOR)
    var color: Color = Constants.TERRAIN_COLORS[terrain]

    if tile in highlighted_tiles:
        # Reachable: subtle green tint
        color = color.lerp(Color(0.2, 0.6, 0.2), 0.35)

    var pixel_pos: Vector2 = tile_to_pixel(tile)
    var rect: Rect2 = Rect2(pixel_pos, Vector2(Constants.TILE_SIZE, Constants.TILE_SIZE))

    draw_rect(rect, color)
    draw_rect(rect, Color(0, 0, 0, 0.35), false, 1.0)  # grid line

    if tile == selected_tile:
        draw_rect(rect, Color.WHITE, false, 2.0)

# ── Coordinate Helpers ────────────────────────────────

func tile_to_pixel(tile: Vector2i) -> Vector2:
    return Vector2(tile.x * Constants.TILE_SIZE, tile.y * Constants.TILE_SIZE)

func pixel_to_tile(pixel: Vector2) -> Vector2i:
    return Vector2i(
        int(pixel.x / Constants.TILE_SIZE),
        int(pixel.y / Constants.TILE_SIZE)
    )

func is_walkable(tile: Vector2i) -> bool:
    return terrain_map.get(tile, Constants.Terrain.FLOOR) != Constants.Terrain.OBSTACLE

func set_highlighted_tiles(tiles: Array[Vector2i]) -> void:
    highlighted_tiles = tiles
    queue_redraw()

func clear_highlights() -> void:
    highlighted_tiles = []
    queue_redraw()
```

---

## Step 7: GridCamera.gd — Scrollable + Touch Pan

This is the core of the mobile grid experience:

```gdscript
# scripts/game/GridCamera.gd
extends Camera2D

# ── Bounds ───────────────────────────────────────────
# Camera is clamped so you can't scroll outside the grid
# Add half the viewport height so top/bottom don't go beyond the grid

var _grid_rect: Rect2  # pixel bounds of the full grid

# ── Touch Pan State ───────────────────────────────────
var _is_panning: bool = false
var _pan_start_pos: Vector2 = Vector2.ZERO
var _pan_start_camera: Vector2 = Vector2.ZERO
var _pan_touch_index: int = -1

# ── Follow State ──────────────────────────────────────
var _follow_target: Vector2 = Vector2.ZERO
var _is_following: bool = false

func _ready() -> void:
    # Grid bounds in world space
    _grid_rect = Rect2(
        Vector2.ZERO,
        Vector2(Constants.GRID_PIXEL_W, Constants.GRID_PIXEL_H)
    )

    # Start camera centered on the grid
    position = _grid_rect.get_center()

    SignalBus.survivor_selected.connect(_on_survivor_selected)

func _process(delta: float) -> void:
    _apply_bounds()

    # Smoothly follow target when a survivor is selected
    if _is_following and not _is_panning:
        position = position.lerp(_follow_target, delta * 8.0)
        if position.distance_to(_follow_target) < 2.0:
            _is_following = false

func _apply_bounds() -> void:
    # Get how much of the grid is visible (half viewport size)
    var vp_size: Vector2 = get_viewport().get_visible_rect().size / zoom

    # Account for the HUD and action panel
    var top_margin: float    = Constants.HUD_HEIGHT / zoom.y
    var bottom_margin: float = Constants.PANEL_HEIGHT / zoom.y

    var min_x: float = _grid_rect.position.x + vp_size.x / 2.0
    var max_x: float = _grid_rect.end.x - vp_size.x / 2.0
    var min_y: float = _grid_rect.position.y + (vp_size.y - top_margin - bottom_margin) / 2.0
    var max_y: float = _grid_rect.end.y - (vp_size.y - top_margin - bottom_margin) / 2.0

    # If the grid is smaller than the viewport in either axis, center it
    if max_x < min_x: min_x = max_x = _grid_rect.get_center().x
    if max_y < min_y: min_y = max_y = _grid_rect.get_center().y

    position.x = clamp(position.x, min_x, max_x)
    position.y = clamp(position.y, min_y, max_y)

# ── Touch/Mouse Input ─────────────────────────────────

func _input(event: InputEvent) -> void:
    # Touch: single finger drag = pan
    if event is InputEventScreenTouch:
        if event.pressed and _pan_touch_index < 0:
            _pan_touch_index = event.index
            _pan_start_pos = event.position
            _pan_start_camera = position
            _is_panning = false
        elif not event.pressed and event.index == _pan_touch_index:
            _pan_touch_index = -1
            # If barely moved, treat as a tap (not a pan)
            if not _is_panning:
                _handle_tap(event.position)
            _is_panning = false

    elif event is InputEventScreenDrag:
        if event.index == _pan_touch_index:
            var drag_delta: Vector2 = event.position - _pan_start_pos
            if drag_delta.length() > 8.0:   # 8px threshold before pan starts
                _is_panning = true
                _is_following = false
                position = _pan_start_camera - drag_delta / zoom

    # Mouse (editor testing)
    elif event is InputEventMouseButton:
        if event.button_index == MOUSE_BUTTON_LEFT:
            if event.pressed:
                _pan_start_pos = event.position
                _pan_start_camera = position
                _is_panning = false
            else:
                if not _is_panning:
                    _handle_tap(event.position)
                _is_panning = false

    elif event is InputEventMouseMotion:
        if Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
            var drag_delta: Vector2 = event.position - _pan_start_pos
            if drag_delta.length() > 6.0:
                _is_panning = true
                _is_following = false
                position = _pan_start_camera - drag_delta / zoom

func _handle_tap(screen_pos: Vector2) -> void:
    # Convert screen position → world position → tile
    var world_pos: Vector2 = get_canvas_transform().affine_inverse() * screen_pos
    var board = get_tree().get_first_node_in_group("game_board")
    if board == null:
        return
    var tile: Vector2i = board.pixel_to_tile(world_pos)
    if Constants.is_valid_tile(tile):
        board._handle_click(tile)

# ── Follow Survivor ───────────────────────────────────

func _on_survivor_selected(index: int) -> void:
    var s: Dictionary = GameState.survivors[index]
    _follow_to_tile(s["tile"])

func _follow_to_tile(tile: Vector2i) -> void:
    var board = get_tree().get_first_node_in_group("game_board")
    if board == null: return
    var tile_center: Vector2 = board.tile_to_pixel(tile) + Vector2(Constants.TILE_SIZE / 2.0, Constants.TILE_SIZE / 2.0)

    # Offset upward to account for pinned panel at bottom
    var panel_offset: float = Constants.PANEL_HEIGHT / 2.0 / zoom.y
    _follow_target = tile_center - Vector2(0, panel_offset)
    _is_following = true

func pan_to_tile(tile: Vector2i) -> void:
    _follow_to_tile(tile)
```

---

## Step 8: Main.gd — Initial Setup

```gdscript
# scripts/Main.gd
extends Node2D

func _ready() -> void:
    add_to_group("main")
    GameState.init_stage_1()
    TurnManager.start_game()
```

The grid does NOT need to be manually positioned — the Camera2D handles the viewpoint. The `GameBoard` node sits at `position = (0, 0)` and the camera pans over it.

---

## Step 9: Run It

Press **F5**. On a 390×844 simulated window you should see:
- The grid rendered, showing ~7 columns at a time
- Mouse drag pans the grid (simulates touch)
- Clicking a tile prints its coordinates
- The grid is clamped — you can't pan past the edges

---

## Mobile Testing Tips

**In Godot editor:**
- Set the game window to 390×844 manually (or use the remote debugger with a real device)
- Enable **Emulate Touch From Mouse** in Project Settings to test touch with your mouse

**On device (HTML5):**
- After CI deploys to GitHub Pages, open on your phone
- Pinch to zoom works out of the box with Camera2D
- Touch drag pans

**Useful tweak — add pinch-to-zoom:**

```gdscript
# In GridCamera.gd — add to _input():

var _pinch_distance: float = 0.0

elif event is InputEventMagnifyGesture:
    # Two-finger pinch zoom
    zoom = (zoom * event.factor).clamp(Vector2(0.6, 0.6), Vector2(2.0, 2.0))
```

---

## Phase 1 Checklist

- [ ] Project configured: 390×844 portrait, Compatibility renderer
- [ ] `Constants.gd` has TILE_SIZE=56, layout heights defined
- [ ] `GameBoard` draws the 14×10 grid (all terrain types)
- [ ] `GridCamera` pans with touch drag / mouse drag
- [ ] Camera clamped to grid bounds (can't scroll off-edge)
- [ ] Tapping a tile triggers `_handle_click(tile)` (prints for now)
- [ ] Camera smoothly follows when survivor selected (Phase 2 wires this up)
- [ ] `export_presets.cfg` created with HTML5 preset
- [ ] `.github/workflows/export.yml` created
- [ ] First push succeeds, GitHub Actions build passes

---

## Next

[Phase 2: Survivors →](./phase-2-survivors.md)
