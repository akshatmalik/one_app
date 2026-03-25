# Phase 4: Noise System & Zombie State Machine

## Goal
By the end of this phase:
- All 5 zombie types spawn on the grid
- Zombies have a working state machine: Dormant → Alert → Wary → Agitated → Grabbing
- Noise events propagate outward, wake zombies, cascade secondary groans
- Visual noise ripple circles expand across the board
- The Zombie Phase runs: zombies move toward survivors or noise

---

## How the Noise System Works

```
Action happens → emit_noise(tile, radius, intensity)
  → find all zombies in radius
    → if zombie dormant:
        intensity >= 2 → Agitated
        intensity = 1  → Alert (investigate for 3 turns)
    → if zombie wary:
        any intensity  → Agitated
  → agitated zombie groans (secondary noise radius 2, intensity 1)
    → cascade: secondary noise may wake more zombies
```

Woken zombies also groan, which can wake MORE zombies. This cascade is why a single gunshot can wake the entire map.

---

## Step 1: ZombieData in Constants.gd

```gdscript
# In Constants.gd — add:

enum ZombieType { SHAMBLER, CRAWLER, BLOATER, SCREAMER, BRUTE }

const ZOMBIE_STATS: Dictionary = {
    ZombieType.SHAMBLER: {
        "type": ZombieType.SHAMBLER,
        "name": "Shambler",
        "emoji": "Z",
        "max_hp": 3, "damage": 2, "speed": 2,
        "can_grab": true, "explodes_on_death": false,
        "groans_when_agitated": false, "knockback_resistant": false,
        "color_dormant":   Color(0.20, 0.20, 0.20),
        "color_alert":     Color(0.53, 0.40, 0.13),
        "color_agitated":  Color(0.77, 0.27, 0.27),
    },
    ZombieType.CRAWLER: {
        "type": ZombieType.CRAWLER,
        "name": "Crawler",
        "emoji": "C",
        "max_hp": 2, "damage": 1, "speed": 3,
        "can_grab": false, "explodes_on_death": false,
        "groans_when_agitated": false, "knockback_resistant": false,
        "low_profile": true,  # harder to spot
        "color_dormant":   Color(0.15, 0.20, 0.15),
        "color_agitated":  Color(0.60, 0.30, 0.60),
    },
    ZombieType.BLOATER: {
        "type": ZombieType.BLOATER,
        "name": "Bloater",
        "emoji": "B",
        "max_hp": 6, "damage": 2, "speed": 2,
        "can_grab": false, "explodes_on_death": true,
        "explosion_damage": 3, "explosion_radius": 1,
        "explosion_noise_radius": 4, "explosion_noise_intensity": 2,
        "color_dormant":  Color(0.25, 0.20, 0.10),
        "color_agitated": Color(0.80, 0.55, 0.10),
    },
    ZombieType.SCREAMER: {
        "type": ZombieType.SCREAMER,
        "name": "Screamer",
        "emoji": "!",
        "max_hp": 2, "damage": 0, "speed": 0,  # stationary
        "can_grab": false, "explodes_on_death": false,
        "groans_when_agitated": true,  # every turn, radius 3
        "groan_radius": 3, "groan_intensity": 1,
        "color_dormant":  Color(0.20, 0.15, 0.25),
        "color_agitated": Color(0.80, 0.20, 0.80),
    },
    ZombieType.BRUTE: {
        "type": ZombieType.BRUTE,
        "name": "Brute",
        "emoji": "X",
        "max_hp": 8, "damage": 3, "speed": 2,
        "can_grab": false, "explodes_on_death": false,
        "knockback_resistant": true,
        "color_dormant":  Color(0.25, 0.10, 0.10),
        "color_agitated": Color(0.90, 0.10, 0.10),
    },
}

# ── Stage 1 Zombie Spawns ──────────────────────────────
const STAGE_1_ZOMBIES: Array[Dictionary] = [
    {"type": ZombieType.SHAMBLER, "tile": Vector2i(6, 3), "state": "dormant", "facing": Vector2i(0,  1)},
    {"type": ZombieType.SHAMBLER, "tile": Vector2i(3, 7), "state": "dormant", "facing": Vector2i(1,  0)},
    {"type": ZombieType.BLOATER,  "tile": Vector2i(9, 5), "state": "dormant", "facing": Vector2i(-1, 0)},
    {"type": ZombieType.CRAWLER,  "tile": Vector2i(2, 5), "state": "dormant", "facing": Vector2i(0,  1)},
    {"type": ZombieType.SCREAMER, "tile": Vector2i(11, 4),"state": "dormant", "facing": Vector2i(0, -1)},
    {"type": ZombieType.BRUTE,    "tile": Vector2i(7, 7), "state": "dormant", "facing": Vector2i(0, -1)},
]
```

---

## Step 2: Zombie State in GameState.gd

```gdscript
# In GameState.gd — add:

var zombies: Array[Dictionary] = []

func _make_zombie(type: int, tile: Vector2i, initial_state: String, facing: Vector2i) -> Dictionary:
    var stats: Dictionary = Constants.ZOMBIE_STATS[type].duplicate(true)
    return {
        "id":             randi(),
        "type":           type,
        "tile":           tile,
        "hp":             stats["max_hp"],
        "max_hp":         stats["max_hp"],
        "damage":         stats["damage"],
        "speed":          stats["speed"],
        "state":          initial_state,     # dormant|alert|wary|agitated|grabbing|dead
        "facing":         facing,
        "staggered":      false,
        "grab_target":    -1,               # survivor index being grabbed (-1 = none)
        "alert_target":   Vector2i(-1, -1), # tile to investigate
        "alert_turns":    0,                # turns remaining in alert state
        "patrol_path":    [],               # optional patrol waypoints
        "patrol_index":   0,
        "stats":          stats,            # ref to base stats
    }

# In init_stage_1():
func init_stage_1() -> void:
    # survivors init...
    zombies = []
    for z_def in Constants.STAGE_1_ZOMBIES:
        zombies.append(_make_zombie(z_def["type"], z_def["tile"], z_def["state"], z_def["facing"]))

func get_survivor_at_tile(tile: Vector2i) -> int:
    for i in range(survivors.size()):
        if survivors[i]["tile"] == tile and survivors[i]["state"] != "dead":
            return i
    return -1

func get_zombie_at_tile(tile: Vector2i) -> Dictionary:
    for z in zombies:
        if z["tile"] == tile and z["state"] != "dead":
            return z
    return {}
```

---

## Step 3: NoiseSystem.gd

```gdscript
# autoloads/NoiseSystem.gd
extends Node

# Pending noise events to process at end of player action
var _pending_noise: Array[Dictionary] = []

func emit_noise(tile: Vector2i, radius: int, intensity: int) -> void:
    _pending_noise.append({"tile": tile, "radius": radius, "intensity": intensity})
    # Visual ripple
    SignalBus.noise_emitted.emit(tile, intensity, radius)

func resolve_all() -> void:
    # Process all pending noise (called at start of Noise Phase)
    var cascade_queue: Array[Dictionary] = _pending_noise.duplicate()
    _pending_noise.clear()

    # Prevent infinite loop: track which zombies already responded
    var already_responded: Dictionary = {}

    while cascade_queue.size() > 0:
        var noise: Dictionary = cascade_queue.pop_front()
        var new_groans: Array[Dictionary] = _apply_noise(noise, already_responded)
        cascade_queue.append_array(new_groans)

func _apply_noise(noise: Dictionary, already_responded: Dictionary) -> Array[Dictionary]:
    var new_groans: Array[Dictionary] = []

    for z in GameState.zombies:
        if z["state"] == "dead":
            continue
        if z["id"] in already_responded:
            continue

        var dist: int = GridUtils.manhattan(z["tile"], noise["tile"])
        if dist > noise["radius"]:
            continue

        already_responded[z["id"]] = true
        var woke_up: bool = _apply_noise_to_zombie(z, noise)

        # If zombie woke up, it groans (secondary noise)
        if woke_up and z["state"] == "agitated":
            new_groans.append({
                "tile": z["tile"],
                "radius": 2,
                "intensity": 1
            })

        # Screamer: groan every turn when agitated (handled in zombie phase)

    return new_groans

func _apply_noise_to_zombie(z: Dictionary, noise: Dictionary) -> bool:
    var state: String = z["state"]
    var intensity: int = noise["intensity"]

    match state:
        "dormant":
            if intensity >= 2:
                _set_agitated(z)
                return true
            elif intensity == 1:
                _set_alert(z, noise["tile"], 3)
                return true
        "alert":
            if intensity >= 2:
                _set_agitated(z)
                return true
        "wary":
            # Any noise agitates a wary zombie
            _set_agitated(z)
            return true
    return false

func _set_agitated(z: Dictionary) -> void:
    z["state"] = "agitated"
    z["alert_target"] = Vector2i(-1, -1)
    z["alert_turns"] = 0
    SignalBus.zombie_state_changed.emit(z["id"])

func _set_alert(z: Dictionary, target_tile: Vector2i, turns: int) -> void:
    z["state"] = "alert"
    z["alert_target"] = target_tile
    z["alert_turns"] = turns
    SignalBus.zombie_state_changed.emit(z["id"])

func _set_wary(z: Dictionary) -> void:
    z["state"] = "wary"
    z["alert_target"] = Vector2i(-1, -1)
    SignalBus.zombie_state_changed.emit(z["id"])
```

Add to `SignalBus.gd`:
```gdscript
signal zombie_state_changed(zombie_id: int)
signal zombie_died(zombie_id: int)
signal zombie_grabbed(zombie_id: int, survivor_idx: int)
```

---

## Step 4: Vision Cone in GridUtils.gd

```gdscript
# In GridUtils.gd — add:

# Returns true if `target` is in `observer`'s vision cone
# (within range, within 90° arc of facing direction, not blocked by obstacles)
func has_line_of_sight(observer_tile: Vector2i, facing: Vector2i,
                        target_tile: Vector2i, vision_range: int, board: Node) -> bool:
    var dist: int = manhattan(observer_tile, target_tile)
    if dist > vision_range:
        return false

    # Check facing arc: dot product with direction to target
    var to_target: Vector2i = target_tile - observer_tile
    # Normalize both to compare direction (approximate 180° arc for simplicity)
    # A facing of (0, 1) means south. We allow anything in the forward hemisphere.
    if facing != Vector2i(0, 0):
        var dot: float = (to_target.x * facing.x + to_target.y * facing.y)
        if dot <= 0:
            return false  # behind the zombie

    # Raycast: check each tile along the path
    return _raycast_clear(observer_tile, target_tile, board)

func _raycast_clear(from: Vector2i, to: Vector2i, board: Node) -> bool:
    # Bresenham line between from and to; check intermediate tiles for obstacles
    var dx: int = abs(to.x - from.x)
    var dy: int = abs(to.y - from.y)
    var sx: int = 1 if from.x < to.x else -1
    var sy: int = 1 if from.y < to.y else -1
    var err: int = dx - dy
    var cx: int = from.x
    var cy: int = from.y

    while Vector2i(cx, cy) != to:
        var e2: int = 2 * err
        if e2 > -dy:
            err -= dy
            cx += sx
        if e2 < dx:
            err += dx
            cy += sy
        if Vector2i(cx, cy) == to:
            break
        # Intermediate tile: blocked by obstacle?
        if not board.is_walkable(Vector2i(cx, cy)):
            return false

    return true
```

---

## Step 5: TurnManager.gd — Zombie Phase

```gdscript
# autoloads/TurnManager.gd
extends Node

func run_noise_phase() -> void:
    GameState.current_phase = GameState.Phase.NOISE
    NoiseSystem.resolve_all()
    await get_tree().create_timer(0.3).timeout  # brief pause
    run_zombie_phase()

func run_zombie_phase() -> void:
    GameState.current_phase = GameState.Phase.ZOMBIE
    SignalBus.phase_changed.emit(GameState.Phase.ZOMBIE)

    for z in GameState.zombies:
        if z["state"] == "dead":
            continue
        await _act_zombie(z)
        await get_tree().create_timer(0.15).timeout  # stagger animations

    _spawn_reinforcements()
    _check_downed_survivors()
    check_game_state()

func _act_zombie(z: Dictionary) -> void:
    var board = get_tree().get_first_node_in_group("game_board")

    # Staggered: skip action, reset stagger
    if z["staggered"]:
        z["staggered"] = false
        return

    # Grabbing: deal damage each turn
    if z["state"] == "grabbing":
        _deal_grab_damage(z)
        return

    # Screamer: groan if agitated or alert
    if z["stats"].get("groans_when_agitated", false) and z["state"] in ["agitated", "alert"]:
        NoiseSystem.emit_noise(z["tile"], z["stats"]["groan_radius"], z["stats"]["groan_intensity"])
        # Screamer doesn't move
        return

    match z["state"]:
        "dormant":
            _handle_dormant(z, board)
        "alert":
            _handle_alert(z, board)
        "wary":
            pass  # just stays alert, no movement
        "agitated":
            _handle_agitated(z, board)

func _handle_dormant(z: Dictionary, board: Node) -> void:
    # Patrol behavior
    if z["patrol_path"].size() > 0:
        var next_tile: Vector2i = z["patrol_path"][z["patrol_index"]]
        _move_zombie(z, next_tile, board)
        z["patrol_index"] = (z["patrol_index"] + 1) % z["patrol_path"].size()

    # Check vision for survivors
    _check_vision(z, board)

func _handle_alert(z: Dictionary, board: Node) -> void:
    z["alert_turns"] -= 1
    _move_toward(z, z["alert_target"], board, 1)
    _check_vision(z, board)

    if z["alert_turns"] <= 0:
        NoiseSystem._set_wary(z)

func _handle_agitated(z: Dictionary, board: Node) -> void:
    _check_herd_behavior(z)

    var nearest_survivor: int = _find_nearest_survivor(z)
    if nearest_survivor < 0:
        return

    var target_tile: Vector2i = GameState.survivors[nearest_survivor]["tile"]
    var dist: int = GridUtils.manhattan(z["tile"], target_tile)

    if dist == 1:
        # Adjacent: attack or grab
        _attempt_melee(z, nearest_survivor)
    else:
        _move_toward(z, target_tile, board, z["speed"])

    _check_vision(z, board)

func _check_vision(z: Dictionary, board: Node) -> void:
    for i in range(GameState.survivors.size()):
        var s: Dictionary = GameState.survivors[i]
        if s["state"] == "dead":
            continue
        var low_profile: bool = z["stats"].get("low_profile", false)
        var vision_range: int = 3 if low_profile else 5
        if GridUtils.has_line_of_sight(z["tile"], z["facing"], s["tile"], vision_range, board):
            if z["state"] != "agitated":
                NoiseSystem._set_agitated(z)

func _move_zombie(z: Dictionary, to: Vector2i, board: Node) -> void:
    if not board.is_walkable(to):
        return
    if GameState.get_zombie_at_tile(to) != {}:
        return  # occupied by another zombie

    z["facing"] = to - z["tile"]  # update facing
    z["tile"] = to
    SignalBus.zombie_moved.emit(z["id"])

    # Check for traps on new tile
    _check_traps(z)

func _move_toward(z: Dictionary, target: Vector2i, board: Node, steps: int) -> void:
    for _step in range(steps):
        var path: Array[Vector2i] = GridUtils.find_path(z["tile"], target, board)
        if path.size() < 2:
            break
        _move_zombie(z, path[1], board)

func _find_nearest_survivor(z: Dictionary) -> int:
    var best_idx: int = -1
    var best_dist: int = 9999
    for i in range(GameState.survivors.size()):
        var s: Dictionary = GameState.survivors[i]
        if s["state"] == "dead":
            continue
        var d: int = GridUtils.manhattan(z["tile"], s["tile"])
        if d < best_dist:
            best_dist = d
            best_idx = i
    return best_idx

func _check_herd_behavior(z: Dictionary) -> void:
    # If 2+ agitated zombies within 3 tiles, converge on same survivor
    var nearby_agitated: int = 0
    var herd_target: int = -1
    for other in GameState.zombies:
        if other["id"] == z["id"] or other["state"] != "agitated":
            continue
        if GridUtils.manhattan(z["tile"], other["tile"]) <= 3:
            nearby_agitated += 1
    # (simplified: herd picks the nearest survivor of the first agitated zombie)
    # Full herd logic: find which survivor the group is targeting

func _attempt_melee(z: Dictionary, survivor_idx: int) -> void:
    # Covered in depth in Phase 5 (CombatSystem)
    # For now: deal damage directly
    var s: Dictionary = GameState.survivors[survivor_idx]
    s["hp"] -= z["damage"]

    if z["stats"].get("can_grab", false) and s["state"] == "active":
        # 50% chance to grab on melee hit
        if randf() < 0.5:
            z["state"] = "grabbing"
            z["grab_target"] = survivor_idx
            s["state"] = "grabbed"
            SignalBus.zombie_grabbed.emit(z["id"], survivor_idx)

    # Emit combat noise
    NoiseSystem.emit_noise(z["tile"], 2, 1)
    SignalBus.ui_refresh_requested.emit()

func _deal_grab_damage(z: Dictionary) -> void:
    var s_idx: int = z["grab_target"]
    if s_idx < 0:
        return
    var s: Dictionary = GameState.survivors[s_idx]

    if s["state"] == "dead":
        z["state"] = "agitated"
        z["grab_target"] = -1
        return

    s["hp"] -= z["damage"]
    s["nerve"] -= 2  # grabbing is terrifying

    if s["hp"] <= 0:
        _handle_survivor_downed(s_idx)

func _handle_survivor_downed(survivor_idx: int) -> void:
    var s: Dictionary = GameState.survivors[survivor_idx]
    if s["state"] == "grabbed":
        # Grabbed + downed = instant death
        s["state"] = "dead"
        SignalBus.game_over.emit("A survivor was killed while grabbed.")
    else:
        s["state"] = "downed"
        s["downed_timer"] = 3
        s["hp"] = 0

func _check_downed_survivors() -> void:
    for s in GameState.survivors:
        if s["state"] == "downed":
            s["downed_timer"] -= 1
            if s["downed_timer"] <= 0:
                s["state"] = "dead"

func _check_traps(z: Dictionary) -> void:
    for trap in GameState.traps:
        if trap["tile"] == z["tile"]:
            var td: Dictionary = trap["data"]
            # Apply trap effects
            if "damage" in td:
                z["hp"] -= td["damage"]
            if "stagger" in td.get("special", []):
                z["staggered"] = true
            if td.get("noise_radius", 0) > 0:
                NoiseSystem.emit_noise(z["tile"], td["noise_radius"], td.get("noise_intensity", 1))
            GameState.traps.erase(trap)
            break

func _spawn_reinforcements() -> void:
    if GameState.turn_number % 8 != 0:
        return
    # Spawn a Shambler from a random free edge tile
    var edge_tiles: Array[Vector2i] = _get_free_edge_tiles()
    if edge_tiles.is_empty():
        return
    var spawn_tile: Vector2i = edge_tiles[randi() % edge_tiles.size()]
    var reinforcement: Dictionary = GameState._make_zombie(
        Constants.ZombieType.SHAMBLER, spawn_tile, "agitated",
        Vector2i(0, 0)  # will be set on first move
    )
    reinforcement["max_hp"] = 4
    reinforcement["hp"] = 4
    GameState.zombies.append(reinforcement)
    SignalBus.zombie_spawned.emit(reinforcement["id"])

func _get_free_edge_tiles() -> Array[Vector2i]:
    var board = get_tree().get_first_node_in_group("game_board")
    var result: Array[Vector2i] = []
    var cols: int = Constants.GRID_COLS
    var rows: int = Constants.GRID_ROWS
    # Top and bottom rows, left and right columns
    for col in range(cols):
        for tile in [Vector2i(col, 0), Vector2i(col, rows - 1)]:
            if board.is_walkable(tile) and GameState.get_zombie_at_tile(tile) == {} and GameState.get_survivor_at_tile(tile) < 0:
                result.append(tile)
    for row in range(1, rows - 1):
        for tile in [Vector2i(0, row), Vector2i(cols - 1, row)]:
            if board.is_walkable(tile) and GameState.get_zombie_at_tile(tile) == {} and GameState.get_survivor_at_tile(tile) < 0:
                result.append(tile)
    return result

func check_game_state() -> void:
    # Check game over
    var all_dead: bool = true
    for s in GameState.survivors:
        if s["state"] != "dead":
            all_dead = false
            break
    if all_dead:
        SignalBus.game_over.emit("All survivors are dead.")
        return

    # Check stage clear (all alive survivors at exit)
    var exit_tile: Vector2i = Constants.STAGE_1_EXIT
    var all_at_exit: bool = true
    for s in GameState.survivors:
        if s["state"] != "dead" and s["tile"] != exit_tile:
            all_at_exit = false
            break
    if all_at_exit:
        SignalBus.stage_cleared.emit()

    # Back to player phase
    GameState.turn_number += 1
    GameState.reset_actions()
    GameState.current_phase = GameState.Phase.PLAYER
    SignalBus.phase_changed.emit(GameState.Phase.PLAYER)
    SignalBus.ui_refresh_requested.emit()
```

Add to `SignalBus.gd`:
```gdscript
signal zombie_moved(zombie_id: int)
signal zombie_spawned(zombie_id: int)
```

---

## Step 6: Zombie.tscn Scene

Create `scenes/game/Zombie.tscn`:

```
Zombie (Node2D)   ← Zombie.gd
├── ColorRect     ← 48x48 placeholder
├── Label         ← emoji (Z, C, B, !, X) + HP
├── StateLabel    ← "!", "?", "GRAB" indicator
└── FacingArrow   ← tiny arrow Node2D (rotated to show facing)
```

```gdscript
# scripts/game/Zombie.gd
extends Node2D

var zombie_id: int = -1

func _ready() -> void:
    SignalBus.zombie_state_changed.connect(_on_state_changed)
    SignalBus.zombie_moved.connect(_on_moved)
    _refresh_visual()

func setup(z_id: int) -> void:
    zombie_id = z_id
    _refresh_visual()

func _get_zombie() -> Dictionary:
    for z in GameState.zombies:
        if z["id"] == zombie_id:
            return z
    return {}

func _refresh_visual() -> void:
    var z: Dictionary = _get_zombie()
    if z.is_empty():
        return

    # Color by state
    var stats: Dictionary = z["stats"]
    var color: Color = stats.get("color_dormant", Color.GRAY)
    match z["state"]:
        "alert":   color = stats.get("color_alert",   Color(0.53, 0.40, 0.13))
        "wary":    color = Color(0.40, 0.35, 0.20)
        "agitated","grabbing": color = stats.get("color_agitated", Color(0.77, 0.27, 0.27))

    $ColorRect.color = color
    $Label.text = stats["emoji"] + "\n%d/%d" % [z["hp"], z["max_hp"]]

    # State indicator
    match z["state"]:
        "agitated": $StateLabel.text = "!"
        "alert":    $StateLabel.text = "?"
        "grabbing": $StateLabel.text = "GRAB"
        _:          $StateLabel.text = ""

    # Stagger indicator
    if z["staggered"]:
        $StateLabel.text = "STGR"

    # Position
    var pixel: Vector2 = GameBoard.tile_to_pixel(z["tile"]) + Vector2(Constants.TILE_SIZE / 2.0, Constants.TILE_SIZE / 2.0)
    position = pixel

    # Facing arrow rotation
    var facing: Vector2i = z["facing"]
    $FacingArrow.rotation = Vector2(facing).angle()

func _on_state_changed(z_id: int) -> void:
    if z_id == zombie_id:
        _refresh_visual()

func _on_moved(z_id: int) -> void:
    if z_id == zombie_id:
        var z: Dictionary = _get_zombie()
        if z.is_empty(): return
        var target_pixel: Vector2 = GameBoard.tile_to_pixel(z["tile"]) + Vector2(Constants.TILE_SIZE / 2.0, Constants.TILE_SIZE / 2.0)
        var tween: Tween = create_tween()
        tween.tween_property(self, "position", target_pixel, 0.2)
```

In `GameBoard.gd _ready()`, add:

```gdscript
func _spawn_zombies() -> void:
    var ZombieScene = preload("res://scenes/game/Zombie.tscn")
    for z in GameState.zombies:
        var node = ZombieScene.instantiate()
        add_child(node)
        node.setup(z["id"])

# Also connect:
SignalBus.zombie_spawned.connect(func(z_id):
    var ZombieScene = preload("res://scenes/game/Zombie.tscn")
    var node = ZombieScene.instantiate()
    add_child(node)
    node.setup(z_id)
)
```

---

## Step 7: NoiseRipple.tscn — Visual Effect

Create `scenes/game/NoiseRipple.tscn`:

```
NoiseRipple (Node2D)   ← NoiseRipple.gd
```

```gdscript
# scripts/game/NoiseRipple.gd
extends Node2D

var radius_px: float = 0.0
var max_radius_px: float = 64.0
var color: Color = Color.BLUE
var lifetime: float = 1.0
var elapsed: float = 0.0

func setup(tile: Vector2i, noise_radius: int, intensity: int) -> void:
    position = Vector2(tile.x * Constants.TILE_SIZE + Constants.TILE_SIZE / 2.0,
                       tile.y * Constants.TILE_SIZE + Constants.TILE_SIZE / 2.0)
    max_radius_px = noise_radius * Constants.TILE_SIZE

    # Color by intensity
    match intensity:
        1: color = Color(0.2, 0.4, 0.8, 0.6)   # blue: alert
        2: color = Color(0.9, 0.5, 0.1, 0.6)   # orange: agitate
        _: color = Color(0.9, 0.1, 0.1, 0.6)   # red: extreme

func _process(delta: float) -> void:
    elapsed += delta
    var t: float = elapsed / lifetime
    radius_px = max_radius_px * t
    modulate.a = 1.0 - t
    queue_redraw()
    if elapsed >= lifetime:
        queue_free()

func _draw() -> void:
    draw_arc(Vector2.ZERO, radius_px, 0, TAU, 32, color, 2.0)
```

In `GameBoard.gd`, connect the noise signal:

```gdscript
func _ready() -> void:
    # ...existing...
    SignalBus.noise_emitted.connect(_on_noise_emitted)

func _on_noise_emitted(tile: Vector2i, intensity: int, radius: int) -> void:
    var RippleScene = preload("res://scenes/game/NoiseRipple.tscn")
    var ripple = RippleScene.instantiate()
    add_child(ripple)
    ripple.setup(tile, radius, intensity)
```

---

## Phase 4 Checklist

- [ ] All 5 zombie types defined in Constants with correct stats
- [ ] Zombies spawn on the grid as colored squares with emoji labels
- [ ] Zombie state machine: dormant → alert → wary → agitated → grabbing
- [ ] `NoiseSystem.emit_noise()` wakes nearby zombies correctly
- [ ] Cascade works: woken zombies' groans can wake more zombies
- [ ] `TurnManager` runs Noise Phase and Zombie Phase on End Turn
- [ ] Zombies move toward survivors when agitated
- [ ] Screamers groan every zombie turn
- [ ] Bloaters are marked to explode on death (Phase 5 handles explosion)
- [ ] Reinforcement spawns every 8 turns
- [ ] Noise ripple circles animate outward with correct colors
- [ ] Downed survivor countdown works

---

## Next

[Phase 5: Combat →](./phase-5-combat.md)
