# Phase 1: Project Setup & The Grid

## Goal
By the end of this phase you have:
- A working Godot 4 project
- A 14×10 grid rendered with correct terrain types
- Clicking a tile prints its coordinates

---

## Step 1: Create the Project

1. Open Godot 4
2. **New Project** → name it `survivor_deckbuilder`
3. Renderer: **Compatibility** (fastest for 2D pixel art)
4. Create the folder structure from the README manually, or run this once from the Godot terminal

---

## Step 2: Configure Project Settings

Go to **Project → Project Settings**:

```
Display → Window:
  Width: 1280
  Height: 720
  Mode: Windowed
  Stretch Mode: canvas_items   ← pixel art scales cleanly

Rendering → 2D:
  Snap 2D Transforms: ON       ← prevents pixel shimmer
  Snap 2D Vertices: ON
```

---

## Step 3: Create Autoloads

Autoloads are global singletons. Create these empty files first, then register them:

**Project → Project Settings → Autoload**, add each:

| Path | Name |
|------|------|
| `res://autoloads/Constants.gd` | `Constants` |
| `res://autoloads/GameState.gd` | `GameState` |
| `res://autoloads/SignalBus.gd` | `SignalBus` |
| `res://autoloads/GridUtils.gd` | `GridUtils` |
| `res://autoloads/NoiseSystem.gd` | `NoiseSystem` |
| `res://autoloads/CombatSystem.gd` | `CombatSystem` |
| `res://autoloads/TurnManager.gd` | `TurnManager` |

Create each as an empty `extends Node` file for now. We'll fill them in each phase.

---

## Step 4: Constants.gd — Grid and Terrain

```gdscript
# autoloads/Constants.gd
extends Node

# ── Grid ─────────────────────────────────────────────
const GRID_COLS: int = 14
const GRID_ROWS: int = 10
const TILE_SIZE: int = 64  # pixels

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

# ── Tile Colors (used before sprites are added) ───────
const TERRAIN_COLORS: Dictionary = {
    Terrain.FLOOR:    Color(0.16, 0.16, 0.16),  # #2a2a2a
    Terrain.OBSTACLE: Color(0.35, 0.29, 0.16),  # #5a4a2a
    Terrain.DOOR:     Color(0.16, 0.29, 0.16),  # #2a4a2a
    Terrain.EXIT:     Color(0.16, 0.16, 0.29),  # #2a2a4a
    Terrain.GLASS:    Color(0.22, 0.29, 0.35),  # #3a4a5a
    Terrain.METAL:    Color(0.29, 0.29, 0.29),  # #4a4a4a
    Terrain.PUDDLE:   Color(0.16, 0.22, 0.29),  # #2a3a4a
}

# ── Stage 1: "The Laboratory" ─────────────────────────
# Obstacles: bottom wall
const STAGE_1_OBSTACLES: Array[Vector2i] = [
    Vector2i(0, 9), Vector2i(1, 9), Vector2i(2, 9), Vector2i(3, 9),
    Vector2i(4, 9), Vector2i(5, 9), Vector2i(7, 9), Vector2i(8, 9),
    Vector2i(9, 9), Vector2i(10, 9), Vector2i(11, 9), Vector2i(12, 9),
    Vector2i(13, 9)
]

const STAGE_1_TERRAIN: Dictionary = {
    # Glass tiles
    Vector2i(3, 4): Terrain.GLASS,
    Vector2i(7, 6): Terrain.GLASS,
    # Metal tiles
    Vector2i(5, 3): Terrain.METAL,
    Vector2i(9, 3): Terrain.METAL,
    # Puddles
    Vector2i(6, 5): Terrain.PUDDLE,
    Vector2i(8, 7): Terrain.PUDDLE,
}

const STAGE_1_EXIT: Vector2i = Vector2i(6, 8)
```

---

## Step 5: The Main Scene

Create `scenes/Main.tscn`:

```
Main (Node2D)
├── GameBoard (Node2D)   ← script: GameBoard.gd
└── UI (CanvasLayer)
```

In the **Scene** panel, right-click → **Add Child Node**:
- Root: `Node2D`, rename to `Main`
- Child: `Node2D`, rename to `GameBoard`
- Child: `CanvasLayer`, rename to `UI`

Save as `scenes/Main.tscn`. Set this as the **main scene** in Project Settings.

---

## Step 6: GameBoard.gd — Draw the Grid

Create `scenes/game/GameBoard.tscn` with a `Node2D` root and attach this script:

```gdscript
# scripts/game/GameBoard.gd
extends Node2D

# The grid: maps Vector2i → Terrain enum value
var terrain_map: Dictionary = {}

# Track which tile is currently highlighted
var highlighted_tiles: Array[Vector2i] = []
var selected_tile: Vector2i = Vector2i(-1, -1)

func _ready() -> void:
    _build_terrain_map()
    queue_redraw()  # triggers _draw()

func _build_terrain_map() -> void:
    # Fill every tile as FLOOR first
    for row in range(Constants.GRID_ROWS):
        for col in range(Constants.GRID_COLS):
            terrain_map[Vector2i(col, row)] = Constants.Terrain.FLOOR

    # Apply obstacles for stage 1
    for tile in Constants.STAGE_1_OBSTACLES:
        terrain_map[tile] = Constants.Terrain.OBSTACLE

    # Apply special terrain
    for tile in Constants.STAGE_1_TERRAIN:
        terrain_map[tile] = Constants.STAGE_1_TERRAIN[tile]

    # Mark the exit tile
    terrain_map[Constants.STAGE_1_EXIT] = Constants.Terrain.EXIT

func _draw() -> void:
    for tile in terrain_map:
        _draw_tile(tile)

func _draw_tile(tile: Vector2i) -> void:
    var terrain: int = terrain_map.get(tile, Constants.Terrain.FLOOR)
    var color: Color = Constants.TERRAIN_COLORS[terrain]

    # Highlight reachable tiles in green
    if tile in highlighted_tiles:
        color = Color(0.16, 0.23, 0.16)  # subtle green

    # Highlight selected tile with border
    var pixel_pos: Vector2 = tile_to_pixel(tile)
    var rect: Rect2 = Rect2(pixel_pos, Vector2(Constants.TILE_SIZE, Constants.TILE_SIZE))

    draw_rect(rect, color)

    # Grid line (dark border)
    draw_rect(rect, Color(0, 0, 0, 0.4), false, 1.0)

    # Selected tile: white border
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

func is_valid_tile(tile: Vector2i) -> bool:
    return (tile.x >= 0 and tile.x < Constants.GRID_COLS and
            tile.y >= 0 and tile.y < Constants.GRID_ROWS)

func is_walkable(tile: Vector2i) -> bool:
    var terrain: int = terrain_map.get(tile, Constants.Terrain.FLOOR)
    return terrain != Constants.Terrain.OBSTACLE

# ── Input: Click to select tile ───────────────────────

func _input(event: InputEvent) -> void:
    if event is InputEventMouseButton and event.pressed:
        if event.button_index == MOUSE_BUTTON_LEFT:
            var tile: Vector2i = pixel_to_tile(get_local_mouse_position())
            if is_valid_tile(tile):
                selected_tile = tile
                print("Selected tile: ", tile, " terrain: ", terrain_map.get(tile))
                queue_redraw()

# ── Public: Highlight a set of tiles ──────────────────

func set_highlighted_tiles(tiles: Array[Vector2i]) -> void:
    highlighted_tiles = tiles
    queue_redraw()

func clear_highlights() -> void:
    highlighted_tiles = []
    queue_redraw()
```

In `Main.tscn`, instantiate `GameBoard.tscn` as a child.

---

## Step 7: Center the Grid on Screen

In `Main.gd`:

```gdscript
# scripts/Main.gd
extends Node2D

func _ready() -> void:
    # Center the 14x10 grid on a 1280x720 window
    var grid_width: float = Constants.GRID_COLS * Constants.TILE_SIZE   # 896
    var grid_height: float = Constants.GRID_ROWS * Constants.TILE_SIZE  # 640

    var offset_x: float = (1280 - grid_width) / 2.0   # 192
    var offset_y: float = (720 - grid_height) / 2.0    # 40

    $GameBoard.position = Vector2(offset_x, offset_y)
```

---

## Step 8: Run It

Press **F5**. You should see:
- Dark grey floor tiles filling most of the screen
- A brown obstacle row across the bottom
- A blue exit tile at (6, 8)
- Clicking a tile prints its position in the Output panel

---

## Phase 1 Checklist

- [ ] Godot 4 project created, settings configured
- [ ] All autoload files registered (empty is fine)
- [ ] Constants.gd has terrain enum, colors, stage 1 layout
- [ ] GameBoard draws a 14×10 colored grid
- [ ] Clicking tiles shows coordinates
- [ ] Grid is centered on screen

---

## Next

[Phase 2: Survivors →](./phase-2-survivors.md)
