# Phase 2: Survivors — Movement, Selection & Action Points

## Goal
By the end of this phase:
- Both survivors appear on the grid as colored circles (placeholder sprites)
- Click a survivor to select them; their reachable tiles highlight green
- Click a reachable tile to move there (costs 1 action)
- The Survivor Panel on the right shows name, HP, Nerve, and actions remaining

---

## How the Action Economy Works

In the original game, **free inventory slots = max actions per turn**.

```
actions_left = free_slots - actions_used + adrenaline - (1 if HP <= 2) - (1 if exhausted)
free_slots   = inventory_capacity (5) - items_in_inventory
```

A fully loaded survivor with 5 items has 0 actions. This makes inventory management a core tension: carry more stuff, do less.

---

## Step 1: SurvivorData Resource

Resources are Godot's data containers — like TypeScript interfaces but they can be edited in the inspector.

```gdscript
# resources/SurvivorData.gd
class_name SurvivorData
extends Resource

@export var survivor_name: String = "Survivor"
@export var max_hp: int = 8
@export var max_nerve: int = 10
@export var inventory_capacity: int = 5
@export var sprite_color: Color = Color.GREEN  # placeholder until sprites
```

---

## Step 2: GameState.gd — Survivor State

```gdscript
# autoloads/GameState.gd
extends Node

# ── Turn State ─────────────────────────────────────────
enum Phase { PLAYER, NOISE, ZOMBIE, CHECK }
var current_phase: Phase = Phase.PLAYER
var turn_number: int = 1

# ── Selection ──────────────────────────────────────────
var selected_survivor_index: int = -1  # -1 = none selected
var action_mode: String = "none"  # "move", "attack", "throw", "shoot"

# ── Survivors ──────────────────────────────────────────
# Each survivor is a Dictionary of their live state.
# We use Dictionaries here (not Resources) so state is trivially mutable.
var survivors: Array[Dictionary] = []

func init_stage_1() -> void:
    survivors = [
        _make_survivor("Scout",   Vector2i(3, 1),  Color(0.16, 0.42, 0.16)),
        _make_survivor("Fighter", Vector2i(10, 1), Color(0.16, 0.29, 0.55)),
    ]

func _make_survivor(sname: String, tile: Vector2i, color: Color) -> Dictionary:
    return {
        "name":             sname,
        "tile":             tile,
        "hp":               8,
        "max_hp":           8,
        "nerve":            10,
        "max_nerve":        10,
        "inventory":        [],          # Array of item dicts
        "inventory_cap":    5,
        "actions_used":     0,
        "color":            color,
        "state":            "active",    # active | downed | dead | grabbed
        "status":           [],          # ["bleeding", "adrenaline", "exhausted", "wounded"]
        "overwatch":        false,
        "disengaging":      false,
        "facing":           Vector2i(0, 1),  # direction facing
        "downed_timer":     0,           # turns until death if downed
        "adrenaline_bonus": 0,
    }

# ── Action Point Helpers ───────────────────────────────

func get_free_slots(survivor: Dictionary) -> int:
    return survivor["inventory_cap"] - survivor["inventory"].size()

func get_actions_left(survivor: Dictionary) -> int:
    var free: int = get_free_slots(survivor)
    var used: int = survivor["actions_used"]
    var bonus: int = survivor["adrenaline_bonus"]
    var critical_penalty: int = 1 if survivor["hp"] <= 2 else 0
    var exhausted_penalty: int = 1 if "exhausted" in survivor["status"] else 0
    var panicked_penalty: int = 1 if survivor["nerve"] <= 0 else 0
    return max(0, free - used + bonus - critical_penalty - exhausted_penalty - panicked_penalty)

func can_act(survivor: Dictionary) -> bool:
    return (survivor["state"] == "active" and
            get_actions_left(survivor) > 0 and
            current_phase == Phase.PLAYER)

func spend_action(survivor: Dictionary) -> void:
    survivor["actions_used"] += 1

func reset_actions() -> void:
    for s in survivors:
        s["actions_used"] = 0
        s["adrenaline_bonus"] = 0

# ── Turn End ───────────────────────────────────────────

func end_player_turn() -> void:
    current_phase = Phase.NOISE
    SignalBus.phase_changed.emit(Phase.NOISE)
```

---

## Step 3: SignalBus.gd

```gdscript
# autoloads/SignalBus.gd
extends Node

# Phase signals
signal phase_changed(new_phase: int)

# Selection signals
signal survivor_selected(index: int)
signal survivor_deselected()

# Move signals
signal survivor_moved(index: int, from_tile: Vector2i, to_tile: Vector2i)

# Noise signals
signal noise_emitted(tile: Vector2i, intensity: int, radius: int)

# UI update signals
signal ui_refresh_requested()
signal game_over(reason: String)
signal stage_cleared()
```

---

## Step 4: Survivor.tscn Scene

Create `scenes/game/Survivor.tscn`:

```
Survivor (Node2D)   ← Survivor.gd
├── Sprite2D        ← game art goes here later
├── ColorRect       ← placeholder colored circle
└── Label           ← name + HP display (temp)
```

In the **Inspector**:
- `ColorRect`: size 48×48, position (-24, -24) to center it on the tile

```gdscript
# scripts/game/Survivor.gd
extends Node2D

var survivor_index: int = -1  # which index in GameState.survivors

func _ready() -> void:
    _refresh_visual()

func _refresh_visual() -> void:
    if survivor_index < 0:
        return

    var data: Dictionary = GameState.survivors[survivor_index]

    # Placeholder color
    $ColorRect.color = data["color"]

    # Position on grid
    var pixel: Vector2 = GameBoard.tile_to_pixel(data["tile"]) + Vector2(Constants.TILE_SIZE / 2.0, Constants.TILE_SIZE / 2.0)
    position = pixel

    # Selection ring (show if selected)
    var is_selected: bool = (GameState.selected_survivor_index == survivor_index)
    $SelectionRing.visible = is_selected

    # Downed = dark color, show countdown
    if data["state"] == "downed":
        $ColorRect.color = Color(0.16, 0.08, 0.0)
        $StatusLabel.text = "☠ " + str(data["downed_timer"])

    # Panicked = red tint
    elif data["nerve"] <= 0:
        $ColorRect.color = Color(0.55, 0.16, 0.16)

func animate_move_to(target_tile: Vector2i) -> void:
    var target_pixel: Vector2 = GameBoard.tile_to_pixel(target_tile) + Vector2(Constants.TILE_SIZE / 2.0, Constants.TILE_SIZE / 2.0)
    var tween: Tween = create_tween()
    tween.tween_property(self, "position", target_pixel, 0.15)
    await tween.finished
```

---

## Step 5: GridUtils.gd — BFS Reachable Tiles

This replaces `lib/grid.ts`. BFS finds all tiles reachable in N steps.

```gdscript
# autoloads/GridUtils.gd
extends Node

const DIRECTIONS: Array[Vector2i] = [
    Vector2i(0, -1),  # North
    Vector2i(0,  1),  # South
    Vector2i(-1, 0),  # West
    Vector2i( 1, 0),  # East
]

# Returns all tiles reachable from `start` within `steps` moves.
# Blocked by: obstacles, other survivors, (optionally) zombies.
func get_reachable_tiles(start: Vector2i, steps: int, board: Node) -> Array[Vector2i]:
    var visited: Dictionary = {start: true}
    var frontier: Array[Vector2i] = [start]
    var reachable: Array[Vector2i] = []

    for _step in range(steps):
        var next_frontier: Array[Vector2i] = []
        for tile in frontier:
            for dir in DIRECTIONS:
                var neighbor: Vector2i = tile + dir
                if neighbor in visited:
                    continue
                if not Constants.is_valid_tile(neighbor):
                    continue
                if not board.is_walkable(neighbor):
                    continue
                if _is_occupied_by_survivor(neighbor):
                    continue
                visited[neighbor] = true
                next_frontier.append(neighbor)
                reachable.append(neighbor)
        frontier = next_frontier

    return reachable

func _is_occupied_by_survivor(tile: Vector2i) -> bool:
    for s in GameState.survivors:
        if s["tile"] == tile and s["state"] != "dead":
            return true
    return false

# BFS pathfinding: returns array of tiles from start to goal (inclusive)
func find_path(start: Vector2i, goal: Vector2i, board: Node) -> Array[Vector2i]:
    if start == goal:
        return [start]

    var came_from: Dictionary = {start: null}
    var queue: Array[Vector2i] = [start]

    while queue.size() > 0:
        var current: Vector2i = queue.pop_front()
        if current == goal:
            return _reconstruct_path(came_from, goal)
        for dir in DIRECTIONS:
            var neighbor: Vector2i = current + dir
            if neighbor in came_from:
                continue
            if not Constants.is_valid_tile(neighbor):
                continue
            if not board.is_walkable(neighbor):
                continue
            came_from[neighbor] = current
            queue.append(neighbor)

    return []  # no path found

func _reconstruct_path(came_from: Dictionary, goal: Vector2i) -> Array[Vector2i]:
    var path: Array[Vector2i] = []
    var current: Vector2i = goal
    while came_from[current] != null:
        path.push_front(current)
        current = came_from[current]
    path.push_front(current)
    return path

# Manhattan distance
func manhattan(a: Vector2i, b: Vector2i) -> int:
    return abs(a.x - b.x) + abs(a.y - b.y)

# All tiles within radius (not just walkable — for noise)
func get_tiles_in_radius(center: Vector2i, radius: int) -> Array[Vector2i]:
    var result: Array[Vector2i] = []
    for row in range(center.y - radius, center.y + radius + 1):
        for col in range(center.x - radius, center.x + radius + 1):
            var tile := Vector2i(col, row)
            if Constants.is_valid_tile(tile) and manhattan(center, tile) <= radius:
                result.append(tile)
    return result
```

Add to `Constants.gd`:

```gdscript
# In Constants.gd — add this helper
static func is_valid_tile(tile: Vector2i) -> bool:
    return (tile.x >= 0 and tile.x < GRID_COLS and
            tile.y >= 0 and tile.y < GRID_ROWS)
```

---

## Step 6: Hooking It All Together in GameBoard.gd

Update `GameBoard.gd` to spawn survivors and handle click-to-move:

```gdscript
# In GameBoard.gd — add to _ready():

var survivor_nodes: Array = []
var zombie_nodes: Array = []
var board_ref: Node  # reference to self for GridUtils calls

func _ready() -> void:
    board_ref = self
    GameState.init_stage_1()
    _build_terrain_map()
    _spawn_survivors()
    SignalBus.survivor_selected.connect(_on_survivor_selected)
    SignalBus.survivor_moved.connect(_on_survivor_moved)
    queue_redraw()

func _spawn_survivors() -> void:
    var SurvivorScene = preload("res://scenes/game/Survivor.tscn")
    for i in range(GameState.survivors.size()):
        var node = SurvivorScene.instantiate()
        node.survivor_index = i
        add_child(node)
        survivor_nodes.append(node)

func _on_survivor_selected(index: int) -> void:
    # Highlight reachable tiles for the selected survivor
    var s: Dictionary = GameState.survivors[index]
    var steps: int = GameState.get_actions_left(s)
    var reachable: Array[Vector2i] = GridUtils.get_reachable_tiles(s["tile"], steps, self)
    set_highlighted_tiles(reachable)
    queue_redraw()
    SignalBus.ui_refresh_requested.emit()

func _on_survivor_moved(index: int, from_tile: Vector2i, to_tile: Vector2i) -> void:
    survivor_nodes[index].animate_move_to(to_tile)
    clear_highlights()
    queue_redraw()
    SignalBus.ui_refresh_requested.emit()

func _input(event: InputEvent) -> void:
    if event is InputEventMouseButton and event.pressed:
        if event.button_index == MOUSE_BUTTON_LEFT:
            var tile: Vector2i = pixel_to_tile(get_local_mouse_position())
            if not Constants.is_valid_tile(tile):
                return
            _handle_click(tile)

func _handle_click(tile: Vector2i) -> void:
    var sel_idx: int = GameState.selected_survivor_index

    # Click on a survivor → select them
    for i in range(GameState.survivors.size()):
        var s: Dictionary = GameState.survivors[i]
        if s["tile"] == tile and s["state"] != "dead":
            GameState.selected_survivor_index = i
            SignalBus.survivor_selected.emit(i)
            return

    # Click on a highlighted tile while survivor selected → move
    if sel_idx >= 0 and tile in highlighted_tiles:
        var s: Dictionary = GameState.survivors[sel_idx]
        if GameState.can_act(s) and is_walkable(tile):
            var from_tile: Vector2i = s["tile"]
            s["tile"] = tile
            GameState.spend_action(s)
            SignalBus.survivor_moved.emit(sel_idx, from_tile, tile)
            # Re-highlight for remaining actions
            _on_survivor_selected(sel_idx)
            return

    # Click on empty space → deselect
    GameState.selected_survivor_index = -1
    clear_highlights()
    SignalBus.ui_refresh_requested.emit()
```

---

## Step 7: Basic Survivor Panel UI

Create `scenes/ui/SurvivorPanel.tscn`:

```
SurvivorPanel (PanelContainer)   ← anchored right side
└── VBoxContainer
    ├── Label: "name_label"
    ├── Label: "state_label"
    ├── HBoxContainer
    │   ├── Label: "HP:"
    │   └── ProgressBar: "hp_bar"
    ├── HBoxContainer
    │   ├── Label: "Nerve:"
    │   └── ProgressBar: "nerve_bar"
    ├── Label: "actions_label"    ← "Actions: 3/5"
    └── Label: "inventory_label" ← temp, full UI in Phase 6
```

```gdscript
# scripts/ui/SurvivorPanel.gd
extends PanelContainer

func _ready() -> void:
    SignalBus.ui_refresh_requested.connect(_refresh)
    SignalBus.survivor_selected.connect(func(_i): _refresh())
    _refresh()

func _refresh() -> void:
    var idx: int = GameState.selected_survivor_index
    if idx < 0:
        $VBox/name_label.text = "No survivor selected"
        return

    var s: Dictionary = GameState.survivors[idx]
    $VBox/name_label.text = s["name"]
    $VBox/state_label.text = s["state"].to_upper()

    $VBox/HPRow/hp_bar.max_value = s["max_hp"]
    $VBox/HPRow/hp_bar.value = s["hp"]

    $VBox/NerveRow/nerve_bar.max_value = s["max_nerve"]
    $VBox/NerveRow/nerve_bar.value = s["nerve"]

    var actions_left: int = GameState.get_actions_left(s)
    var free_slots: int = GameState.get_free_slots(s)
    $VBox/actions_label.text = "Actions: %d  |  Slots free: %d" % [actions_left, free_slots]
    $VBox/inventory_label.text = "Items: %d/%d" % [s["inventory"].size(), s["inventory_cap"]]
```

Anchor the panel to the right side in the scene (anchors: right=1, top=0, bottom=1).

---

## Step 8: End Turn Button

Add a `Button` node to the UI:

```gdscript
# In SurvivorPanel.gd or a separate script
func _on_end_turn_pressed() -> void:
    GameState.selected_survivor_index = -1
    SignalBus.survivor_deselected.emit()
    GameState.end_player_turn()
    TurnManager.run_noise_phase()  # Phase 4 fills this in
```

---

## Phase 2 Checklist

- [ ] `SurvivorData` resource defined
- [ ] `GameState` has survivor state dictionaries + action helpers
- [ ] `SignalBus` has core signals
- [ ] `GridUtils` can BFS reachable tiles and find paths
- [ ] Two survivors spawn on the grid as colored squares
- [ ] Clicking a survivor selects it + highlights reachable tiles
- [ ] Clicking a highlighted tile moves the survivor (costs 1 action)
- [ ] `SurvivorPanel` shows name, HP, Nerve, actions left
- [ ] End Turn button exists

---

## Next

[Phase 3: Items & Inventory →](./phase-3-inventory.md)
