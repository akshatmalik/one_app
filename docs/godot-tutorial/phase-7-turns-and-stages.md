# Phase 7: Turn Phases, Win/Lose & Stage 2

## Goal
By the end of this phase:
- All 4 turn phases execute in order and chain correctly
- Downed survivor countdown and stabilize works
- Sustained noise sources (flare, alarm clock) tick each turn
- Stage 2 "The Warehouse" loads with survivors carrying items
- Campaign win screen when both stages cleared

---

## Step 1: Sustained Noise Sources

Some thrown items (flare, brick, alarm clock) create a noise source that lasts multiple turns — they re-emit noise at the start of each Noise Phase.

Add to `GameState.gd`:

```gdscript
# Persistent noise sources: tile keeps emitting noise for N more turns
var active_noise_sources: Array[Dictionary] = []

func add_noise_source(tile: Vector2i, radius: int, intensity: int, turns_remaining: int) -> void:
    active_noise_sources.append({
        "tile": tile,
        "radius": radius,
        "intensity": intensity,
        "turns_remaining": turns_remaining,
    })

func tick_noise_sources() -> void:
    var to_remove: Array = []
    for source in active_noise_sources:
        if source["turns_remaining"] > 0:
            NoiseSystem.emit_noise(source["tile"], source["radius"], source["intensity"])
            source["turns_remaining"] -= 1
        if source["turns_remaining"] <= 0:
            to_remove.append(source)
    for s in to_remove:
        active_noise_sources.erase(s)
```

Update `CombatSystem.throw_item()` to add sustained sources:

```gdscript
# In CombatSystem._emit_distraction_noise():
func _emit_distraction_noise(item: Dictionary, tile: Vector2i) -> void:
    var radius: int   = item.get("noise_radius", 3)
    var intensity: int = item.get("noise_intensity", 1)
    var duration: int  = item.get("alert_duration", 1)

    # First immediate noise
    NoiseSystem.emit_noise(tile, radius, intensity)

    # Persistent source for multi-turn items
    if duration > 1:
        GameState.add_noise_source(tile, radius, intensity, duration - 1)
```

---

## Step 2: TurnManager.gd — Complete Flow

```gdscript
# autoloads/TurnManager.gd
extends Node

var _is_running: bool = false

func start_game() -> void:
    GameState.current_phase = GameState.Phase.PLAYER
    _is_running = true
    SignalBus.phase_changed.emit(GameState.Phase.PLAYER)
    SignalBus.ui_refresh_requested.emit()

# Called by UI "End Turn" button
func end_player_turn() -> void:
    if GameState.current_phase != GameState.Phase.PLAYER:
        return
    # Clear per-turn attack tracking (for focus fire stagger)
    CombatSystem._last_attacked.clear()
    # Clear disengage flags
    for s in GameState.survivors:
        s["disengaging"] = false
    run_noise_phase()

func run_noise_phase() -> void:
    GameState.current_phase = GameState.Phase.NOISE
    SignalBus.phase_changed.emit(GameState.Phase.NOISE)

    # Tick sustained noise sources first
    GameState.tick_noise_sources()

    # Resolve all queued noise events
    NoiseSystem.resolve_all()

    await get_tree().create_timer(0.4).timeout
    run_zombie_phase()

func run_zombie_phase() -> void:
    GameState.current_phase = GameState.Phase.ZOMBIE
    SignalBus.phase_changed.emit(GameState.Phase.ZOMBIE)

    # Tick downed countdown before zombie acts
    # (so zombies react to state changes this turn)
    _tick_downed_survivors()

    for z in GameState.zombies.duplicate():  # duplicate() so we can modify during iteration
        if z["state"] == "dead":
            continue
        await _act_zombie(z)
        await get_tree().create_timer(0.12).timeout

    # Reinforcements
    if GameState.turn_number % 8 == 0:
        _spawn_reinforcements()

    await check_game_state()

# ── Actions inlined from Phase 4 ─────────────────────
# (Moved all _act_zombie, _handle_*, _find_nearest etc. here)

func _tick_downed_survivors() -> void:
    for s in GameState.survivors:
        if s["state"] == "downed":
            s["downed_timer"] -= 1
            if s["downed_timer"] <= 0:
                s["state"] = "dead"
                SignalBus.ui_refresh_requested.emit()

func check_game_state() -> void:
    # ── Check game over ────────────────────────────────
    var all_dead: bool = true
    for s in GameState.survivors:
        if s["state"] != "dead":
            all_dead = false
            break
    if all_dead:
        SignalBus.game_over.emit("All survivors are dead.")
        return

    # ── Check stage cleared ────────────────────────────
    var exit_tile: Vector2i = GameState.current_stage_exit()
    var escaped: Array[int] = []
    for i in range(GameState.survivors.size()):
        var s: Dictionary = GameState.survivors[i]
        if s["state"] != "dead" and s["tile"] == exit_tile:
            escaped.append(i)

    # All alive survivors at exit
    var alive_count: int = 0
    for s in GameState.survivors:
        if s["state"] != "dead":
            alive_count += 1

    if escaped.size() == alive_count and alive_count > 0:
        await get_tree().create_timer(0.5).timeout
        _advance_stage()
        return

    # ── Next turn ─────────────────────────────────────
    GameState.turn_number += 1
    GameState.reset_actions()
    GameState.current_phase = GameState.Phase.PLAYER
    SignalBus.phase_changed.emit(GameState.Phase.PLAYER)
    SignalBus.ui_refresh_requested.emit()

func _advance_stage() -> void:
    var next_stage: int = GameState.current_stage + 1
    if next_stage > GameState.total_stages:
        SignalBus.campaign_won.emit()
        return
    GameState.load_stage(next_stage)
    SignalBus.stage_cleared.emit()
```

---

## Step 3: Multi-Stage Support in GameState.gd

```gdscript
# In GameState.gd — add:

var current_stage: int = 1
var total_stages: int = 2

func current_stage_exit() -> Vector2i:
    match current_stage:
        1: return Constants.STAGE_1_EXIT
        2: return Constants.STAGE_2_EXIT
    return Vector2i(-1, -1)

func load_stage(stage_num: int) -> void:
    current_stage = stage_num
    turn_number = 1

    # Carry survivors forward (reset position, keep inventory + status)
    match stage_num:
        2: _carry_survivors_to_stage_2()

    # Clear entities
    zombies = []
    ground_items = []
    containers = []
    traps = []
    active_noise_sources = []

    # Load new stage data
    match stage_num:
        2: _init_stage_2()

    SignalBus.stage_loaded.emit(stage_num)

func _carry_survivors_to_stage_2() -> void:
    var start_positions: Array[Vector2i] = [Vector2i(3, 8), Vector2i(10, 8)]
    for i in range(survivors.size()):
        if survivors[i]["state"] == "dead":
            continue
        survivors[i]["tile"] = start_positions[i]
        survivors[i]["actions_used"] = 0
        survivors[i]["overwatch"] = false
        survivors[i]["disengaging"] = false
        # Status carries over — wounded, bleeding, etc.

func _init_stage_2() -> void:
    # Stage 2: "The Warehouse"
    for z_def in Constants.STAGE_2_ZOMBIES:
        zombies.append(_make_zombie(z_def["type"], z_def["tile"], z_def["state"], z_def.get("facing", Vector2i(0,1))))

    for loot in Constants.STAGE_2_LOOT:
        ground_items.append(_make_ground_item(loot["id"], loot["tile"]))

    for c in Constants.STAGE_2_CONTAINERS:
        containers.append({"tile": c["tile"], "loot": c["loot"].duplicate(), "searched": false})
```

Add to `SignalBus.gd`:
```gdscript
signal stage_loaded(stage_num: int)
signal campaign_won()
```

---

## Step 4: Stage 2 Data in Constants.gd

```gdscript
# In Constants.gd — add:

const STAGE_2_EXIT: Vector2i = Vector2i(9, 0)

const STAGE_2_OBSTACLES: Array[Vector2i] = [
    # Horizontal walls with gaps (corridor structure)
    Vector2i(0, 4), Vector2i(1, 4), Vector2i(2, 4),
    Vector2i(4, 4), Vector2i(5, 4), Vector2i(6, 4),
    Vector2i(7, 4), Vector2i(8, 4), Vector2i(9, 4),
    Vector2i(11, 4), Vector2i(12, 4), Vector2i(13, 4),
    # Vertical pillars
    Vector2i(4, 2), Vector2i(9, 2), Vector2i(4, 7), Vector2i(9, 7),
]

const STAGE_2_TERRAIN: Dictionary = {
    Vector2i(2, 2): Terrain.GLASS,
    Vector2i(11, 2): Terrain.GLASS,
    Vector2i(6, 6): Terrain.METAL,
    Vector2i(7, 6): Terrain.PUDDLE,
}

const STAGE_2_ZOMBIES: Array[Dictionary] = [
    # Patrolling shambler (will need patrol path logic)
    {"type": ZombieType.SHAMBLER, "tile": Vector2i(6, 2), "state": "dormant", "facing": Vector2i(1, 0)},
    {"type": ZombieType.SHAMBLER, "tile": Vector2i(4, 6), "state": "dormant", "facing": Vector2i(0, -1)},
    {"type": ZombieType.CRAWLER,  "tile": Vector2i(2, 6), "state": "dormant", "facing": Vector2i(1, 0)},
    {"type": ZombieType.CRAWLER,  "tile": Vector2i(11, 6),"state": "dormant", "facing": Vector2i(-1, 0)},
    {"type": ZombieType.BLOATER,  "tile": Vector2i(6, 7), "state": "dormant", "facing": Vector2i(0, -1)},
    {"type": ZombieType.SCREAMER, "tile": Vector2i(9, 6), "state": "dormant", "facing": Vector2i(-1, 0)},
    {"type": ZombieType.BRUTE,    "tile": Vector2i(1, 2), "state": "dormant", "facing": Vector2i(1, 0)},
]

const STAGE_2_LOOT: Array[Dictionary] = [
    {"id": "crowbar",     "tile": Vector2i(1, 7)},
    {"id": "flare",       "tile": Vector2i(12, 1)},
    {"id": "bandage",     "tile": Vector2i(5, 1)},
    {"id": "wire_trip",   "tile": Vector2i(3, 6)},
    {"id": "alarm_clock", "tile": Vector2i(10, 3)},
    {"id": "nail_board",  "tile": Vector2i(7, 2)},
    {"id": "medkit",      "tile": Vector2i(12, 7)},
]

const STAGE_2_CONTAINERS: Array[Dictionary] = [
    {"tile": Vector2i(0, 7), "loot": ["firecracker", "bear_trap"]},
    {"tile": Vector2i(13, 7), "loot": ["bandage", "molotov"]},
]
```

---

## Step 5: GameBoard Reacts to Stage Load

In `GameBoard.gd`, connect `stage_loaded`:

```gdscript
# In GameBoard._ready():
SignalBus.stage_loaded.connect(_on_stage_loaded)

func _on_stage_loaded(stage_num: int) -> void:
    # Rebuild terrain for the new stage
    _build_terrain_map()

    # Remove old entity nodes
    for node in survivor_nodes:
        node.queue_free()
    for node in zombie_nodes:
        node.queue_free()
    for id in item_nodes:
        item_nodes[id].queue_free()
    survivor_nodes.clear()
    zombie_nodes.clear()
    item_nodes.clear()

    # Spawn new entities
    _spawn_survivors()
    _spawn_zombies()
    _spawn_items()
    queue_redraw()
```

Update `_build_terrain_map()` to use the current stage:

```gdscript
func _build_terrain_map() -> void:
    terrain_map.clear()
    for row in range(Constants.GRID_ROWS):
        for col in range(Constants.GRID_COLS):
            terrain_map[Vector2i(col, row)] = Constants.Terrain.FLOOR

    var obstacles: Array[Vector2i]
    var special_terrain: Dictionary

    match GameState.current_stage:
        1:
            obstacles = Constants.STAGE_1_OBSTACLES
            special_terrain = Constants.STAGE_1_TERRAIN
            terrain_map[Constants.STAGE_1_EXIT] = Constants.Terrain.EXIT
        2:
            obstacles = Constants.STAGE_2_OBSTACLES
            special_terrain = Constants.STAGE_2_TERRAIN
            terrain_map[Constants.STAGE_2_EXIT] = Constants.Terrain.EXIT

    for tile in obstacles:
        terrain_map[tile] = Constants.Terrain.OBSTACLE
    for tile in special_terrain:
        terrain_map[tile] = special_terrain[tile]
```

---

## Step 6: Campaign Win Screen

Add to `GameOverScreen.gd`:

```gdscript
func _ready() -> void:
    visible = false
    SignalBus.game_over.connect(_show_game_over)
    SignalBus.stage_cleared.connect(_show_stage_cleared)
    SignalBus.campaign_won.connect(_show_campaign_won)
    $VBox/RestartButton.pressed.connect(_restart)
    $VBox/NextStageButton.pressed.connect(_next_stage)

func _show_stage_cleared() -> void:
    visible = true
    $VBox/Title.text = "STAGE CLEARED"
    $VBox/Title.modulate = Color(0.2, 0.9, 0.3)
    $VBox/ReasonLabel.text = "Survivors escaped! Loading next stage..."
    $VBox/RestartButton.visible = false
    $VBox/NextStageButton.visible = true

func _show_campaign_won() -> void:
    visible = true
    $VBox/Title.text = "★ YOU SURVIVED ★"
    $VBox/Title.modulate = Color(0.9, 0.8, 0.1)
    $VBox/ReasonLabel.text = "Both stages cleared. Your survivors made it out."
    $VBox/NextStageButton.visible = false
    $VBox/RestartButton.text = "Play Again"
    $VBox/RestartButton.visible = true

func _next_stage() -> void:
    visible = false
    # TurnManager already loaded the next stage via GameState.load_stage()
    TurnManager.start_game()
```

---

## Phase 7 Checklist

- [ ] Sustained noise sources (flare, alarm clock) tick each noise phase
- [ ] Turn phases chain correctly: Player → Noise → Zombie → Check → Player
- [ ] Downed countdown ticks in zombie phase, deaths registered
- [ ] Stage 2 data defined in Constants
- [ ] Stage cleared → survivors carry inventory to Stage 2
- [ ] GameBoard rebuilds terrain and entities on stage load
- [ ] Campaign win screen after Stage 2 cleared
- [ ] Restart works from Game Over screen
- [ ] End Turn button properly disabled during Zombie Phase

---

## Next

[Phase 8: Sprites & Visual Polish →](./phase-8-sprites-and-polish.md)
