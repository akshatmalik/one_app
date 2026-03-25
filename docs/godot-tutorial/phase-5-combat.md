# Phase 5: Combat — Melee, Ranged, Throws & Traps

## Goal
By the end of this phase:
- Survivors can attack adjacent zombies with their equipped weapon
- Flanking bonus (+1 damage when ally on opposite side)
- Focus fire stagger (2nd attacker staggers zombie)
- Knockback (bat/pipe push)
- Pistol ranged attack (free action, very loud)
- Throw distractions at target tiles
- Molotov area fire with spread
- Bloater death explosion
- Break Free from grab

---

## Step 1: CombatSystem.gd

```gdscript
# autoloads/CombatSystem.gd
extends Node

# Which zombie did each survivor last attack (for focus fire stagger detection)
var _last_attacked: Dictionary = {}  # survivor_idx → zombie_id

# ── Melee Attack ───────────────────────────────────────

func melee_attack(survivor_idx: int, zombie_id: int) -> Dictionary:
    var s: Dictionary = GameState.survivors[survivor_idx]
    var z: Dictionary = _get_zombie(zombie_id)
    if z.is_empty():
        return {}

    # Must be adjacent
    if GridUtils.manhattan(s["tile"], z["tile"]) != 1:
        return {"error": "not_adjacent"}

    # Must have actions and a weapon equipped
    if not GameState.can_act(s):
        return {"error": "no_actions"}

    var weapon: Dictionary = _get_equipped_weapon(s)
    if weapon.is_empty():
        weapon = {"id": "fists", "damage": 1, "noise_radius": 1, "noise_intensity": 1, "special": []}

    # Calculate damage
    var damage: int = weapon.get("damage", 1)

    # Flanking bonus: +1 if ally on opposite side of zombie
    if _check_flanking(survivor_idx, z):
        damage += 1

    # Focus fire stagger: if another survivor already hit this zombie this turn
    var stagger: bool = false
    for other_idx in _last_attacked:
        if other_idx != survivor_idx and _last_attacked[other_idx] == zombie_id:
            stagger = true
            break

    # Record this attack for focus fire detection
    _last_attacked[survivor_idx] = zombie_id

    # Apply damage
    z["hp"] -= damage
    GameState.spend_action(s)

    # Weapon durability
    _use_weapon(s, weapon)

    # Stagger
    if stagger:
        z["staggered"] = true

    # Knockback (bat/pipe)
    if "knockback" in weapon.get("special", []) and not z["stats"].get("knockback_resistant", false):
        _apply_knockback(s["tile"], z)

    # Grab rescue: if this zombie was grabbing someone, free them
    if z["state"] == "grabbing":
        var grabbed_idx: int = z["grab_target"]
        GameState.survivors[grabbed_idx]["state"] = "active"
        GameState.survivors[grabbed_idx]["tile"] = z["tile"]  # freed next to zombie
        z["state"] = "agitated"
        z["grab_target"] = -1

    # Noise from attack
    var noise_radius: int = weapon.get("noise_radius", 2)
    var noise_intensity: int = weapon.get("noise_intensity", 1)
    NoiseSystem.emit_noise(z["tile"], noise_radius, noise_intensity)

    # Coordination jab: adjacent ally with weapon gets a free +1 hit
    _check_coordination_jab(survivor_idx, z)

    # Check death
    if z["hp"] <= 0:
        _handle_zombie_death(z)
    else:
        # Injured groan
        NoiseSystem.emit_noise(z["tile"], 2, 1)

    # Nerve boost for killing
    if z["state"] == "dead":
        s["nerve"] = min(s["nerve"] + 1, s["max_nerve"])

    SignalBus.ui_refresh_requested.emit()
    return {"damage": damage, "staggered": stagger, "killed": z["state"] == "dead"}

func _check_flanking(attacker_idx: int, z: Dictionary) -> bool:
    # Flanking: ally standing on the tile directly opposite the zombie's facing
    var opposite_tile: Vector2i = z["tile"] + z["facing"]
    for i in range(GameState.survivors.size()):
        if i == attacker_idx:
            continue
        var ally: Dictionary = GameState.survivors[i]
        if ally["state"] != "dead" and ally["tile"] == opposite_tile:
            return true
    return false

func _apply_knockback(attacker_tile: Vector2i, z: Dictionary) -> void:
    var board = get_tree().get_first_node_in_group("game_board")
    var direction: Vector2i = z["tile"] - attacker_tile
    var push_to: Vector2i = z["tile"] + direction

    if not Constants.is_valid_tile(push_to) or not board.is_walkable(push_to):
        # Hit a wall: extra damage
        z["hp"] -= 1
        NoiseSystem.emit_noise(z["tile"], 1, 1)
    else:
        var occupant: Dictionary = GameState.get_zombie_at_tile(push_to)
        if not occupant.is_empty():
            # Collision: both take 1 damage
            z["hp"] -= 1
            occupant["hp"] -= 1
            if occupant["hp"] <= 0:
                _handle_zombie_death(occupant)
        else:
            z["tile"] = push_to
            SignalBus.zombie_moved.emit(z["id"])

func _check_coordination_jab(attacker_idx: int, z: Dictionary) -> void:
    if z["state"] == "dead":
        return
    for i in range(GameState.survivors.size()):
        if i == attacker_idx:
            continue
        var ally: Dictionary = GameState.survivors[i]
        if ally["state"] == "dead":
            continue
        if GridUtils.manhattan(ally["tile"], z["tile"]) == 1:
            if not _get_equipped_weapon(ally).is_empty():
                z["hp"] -= 1  # free +1 hit
                if z["hp"] <= 0:
                    _handle_zombie_death(z)
                break

func _get_equipped_weapon(s: Dictionary) -> Dictionary:
    for item in s["inventory"]:
        if item["category"] == Constants.ItemCategory.WEAPON:
            return item
    return {}

func _use_weapon(s: Dictionary, weapon: Dictionary) -> void:
    if weapon.get("durability", 99) >= 99:
        return  # unbreakable / uses ammo separately
    for item in s["inventory"]:
        if item.get("instance_id") == weapon.get("instance_id"):
            item["durability"] -= 1
            if item["durability"] <= 0:
                s["inventory"].erase(item)
                NoiseSystem.emit_noise(s["tile"], 1, 1)  # clatter of breaking weapon
            break

func _handle_zombie_death(z: Dictionary) -> void:
    z["state"] = "dead"
    SignalBus.zombie_died.emit(z["id"])

    # Bloater: explode
    if z["stats"].get("explodes_on_death", false):
        _bloater_explosion(z)

    # Quiet thump noise if it was dormant, louder if active
    var noise_radius: int = 1 if z.get("_was_dormant", false) else 2
    NoiseSystem.emit_noise(z["tile"], noise_radius, 1)

func _bloater_explosion(z: Dictionary) -> void:
    var explosion_radius: int = z["stats"].get("explosion_radius", 1)
    var explosion_damage: int = z["stats"].get("explosion_damage", 3)

    var affected_tiles: Array[Vector2i] = GridUtils.get_tiles_in_radius(z["tile"], explosion_radius)
    for tile in affected_tiles:
        # Damage zombies
        var other_z: Dictionary = GameState.get_zombie_at_tile(tile)
        if not other_z.is_empty() and other_z["id"] != z["id"]:
            other_z["hp"] -= explosion_damage
            if other_z["hp"] <= 0:
                _handle_zombie_death(other_z)  # chain reaction if another bloater

        # Damage survivors
        var s_idx: int = GameState.get_survivor_at_tile(tile)
        if s_idx >= 0:
            GameState.survivors[s_idx]["hp"] -= explosion_damage

    # Very loud explosion
    NoiseSystem.emit_noise(z["tile"],
        z["stats"]["explosion_noise_radius"],
        z["stats"]["explosion_noise_intensity"])

# ── Break Free ─────────────────────────────────────────

func break_free(survivor_idx: int) -> bool:
    var s: Dictionary = GameState.survivors[survivor_idx]
    if s["state"] != "grabbed":
        return false
    if GameState.get_actions_left(s) < 2:
        return false  # costs 2 actions

    # Find the grabbing zombie
    for z in GameState.zombies:
        if z["state"] == "grabbing" and z["grab_target"] == survivor_idx:
            z["state"] = "agitated"
            z["grab_target"] = -1
            s["state"] = "active"
            GameState.spend_action(s)
            GameState.spend_action(s)  # costs 2 actions
            NoiseSystem.emit_noise(s["tile"], 2, 1)
            SignalBus.ui_refresh_requested.emit()
            return true

    return false

# ── Ranged (Pistol) ────────────────────────────────────

func ranged_attack(survivor_idx: int, target_tile: Vector2i) -> void:
    var s: Dictionary = GameState.survivors[survivor_idx]
    var pistol: Dictionary = _get_ranged_weapon(s)
    if pistol.is_empty():
        return

    # Must be in range
    if GridUtils.manhattan(s["tile"], target_tile) > pistol.get("range", 3):
        return

    # Line of sight
    var board = get_tree().get_first_node_in_group("game_board")
    if not GridUtils._raycast_clear(s["tile"], target_tile, board):
        return

    # Check ammo
    if pistol.get("ammo", 0) <= 0:
        return

    # Find zombie at target tile
    var z: Dictionary = GameState.get_zombie_at_tile(target_tile)
    if not z.is_empty():
        z["hp"] -= pistol["damage"]
        if z["hp"] <= 0:
            _handle_zombie_death(z)

    # Use ammo (free action — does NOT cost action points)
    pistol["ammo"] -= 1
    if pistol["ammo"] <= 0:
        s["inventory"].erase(pistol)

    # VERY LOUD
    NoiseSystem.emit_noise(s["tile"], pistol["noise_radius"], pistol["noise_intensity"])
    SignalBus.ui_refresh_requested.emit()

func _get_ranged_weapon(s: Dictionary) -> Dictionary:
    for item in s["inventory"]:
        if "ranged" in item.get("special", []):
            return item
    return {}

# ── Throw Distraction ──────────────────────────────────

func throw_item(survivor_idx: int, item_inventory_idx: int, target_tile: Vector2i) -> void:
    var s: Dictionary = GameState.survivors[survivor_idx]
    if not GameState.can_act(s):
        return
    var item: Dictionary = s["inventory"][item_inventory_idx]

    var throw_range: int = item.get("throw_range", 3)
    if GridUtils.manhattan(s["tile"], target_tile) > throw_range:
        return

    # Consume item
    s["inventory"].remove_at(item_inventory_idx)
    GameState.spend_action(s)

    # Special effects
    if "area_fire" in item.get("special", []):
        _molotov_effect(item, target_tile)
    elif "create_glass_terrain" in item.get("special", []):
        # Create glass terrain at landing tile
        GameState.game_board_ref.terrain_map[target_tile] = Constants.Terrain.GLASS
    else:
        # Standard distraction: emit noise at landing tile
        _emit_distraction_noise(item, target_tile)

    # The throw itself is quiet
    NoiseSystem.emit_noise(s["tile"], 0, 0)
    SignalBus.ui_refresh_requested.emit()

func _emit_distraction_noise(item: Dictionary, tile: Vector2i) -> void:
    var radius: int = item.get("noise_radius", 3)
    var intensity: int = item.get("noise_intensity", 1)
    var duration: int = item.get("alert_duration", 3)
    NoiseSystem.emit_noise(tile, radius, intensity)
    # Duration-based alerts (flare, brick) create sustained noise source
    # Handled by TurnManager tracking active noise sources

func _molotov_effect(item: Dictionary, center: Vector2i) -> void:
    var board = get_tree().get_first_node_in_group("game_board")

    # Center tile
    _apply_fire_damage(center, item["damage_center"])

    # Cardinal tiles (N/S/E/W)
    var cardinals: Array[Vector2i] = [
        center + Vector2i(0,-1), center + Vector2i(0,1),
        center + Vector2i(-1,0), center + Vector2i(1,0)
    ]
    for tile in cardinals:
        if Constants.is_valid_tile(tile):
            _apply_fire_damage(tile, item["damage_cardinal"])
            # Spread onto puddle tiles
            if board.terrain_map.get(tile) == Constants.Terrain.PUDDLE:
                for adj in GridUtils.DIRECTIONS:
                    var spread: Vector2i = tile + adj
                    if Constants.is_valid_tile(spread):
                        _apply_fire_damage(spread, item["damage_cardinal"])

    # Diagonal tiles
    var diagonals: Array[Vector2i] = [
        center + Vector2i(-1,-1), center + Vector2i(1,-1),
        center + Vector2i(-1, 1), center + Vector2i(1, 1)
    ]
    for tile in diagonals:
        if Constants.is_valid_tile(tile):
            _apply_fire_damage(tile, item["damage_diagonal"])

    NoiseSystem.emit_noise(center, item["noise_radius"], item["noise_intensity"])

func _apply_fire_damage(tile: Vector2i, damage: int) -> void:
    # Damage zombie
    var z: Dictionary = GameState.get_zombie_at_tile(tile)
    if not z.is_empty():
        z["hp"] -= damage
        if z["hp"] <= 0:
            _handle_zombie_death(z)

    # Damage survivors (friendly fire)
    var s_idx: int = GameState.get_survivor_at_tile(tile)
    if s_idx >= 0:
        GameState.survivors[s_idx]["hp"] -= damage

# ── Stabilize Downed Ally ──────────────────────────────

func stabilize_ally(survivor_idx: int, downed_idx: int) -> bool:
    var s: Dictionary = GameState.survivors[survivor_idx]
    var downed: Dictionary = GameState.survivors[downed_idx]

    if downed["state"] != "downed":
        return false
    if GridUtils.manhattan(s["tile"], downed["tile"]) != 1:
        return false
    if not GameState.can_act(s):
        return false

    downed["state"] = "active"
    downed["hp"] = 1
    if "wounded" not in downed["status"]:
        downed["status"].append("wounded")
    GameState.spend_action(s)
    SignalBus.ui_refresh_requested.emit()
    return true

# ── Overwatch ──────────────────────────────────────────

# Called when a zombie enters a tile in an overwatch survivor's LOS
func check_overwatch_triggers(moved_zombie_id: int) -> void:
    var z: Dictionary = _get_zombie(moved_zombie_id)
    if z.is_empty():
        return
    var board = get_tree().get_first_node_in_group("game_board")

    for i in range(GameState.survivors.size()):
        var s: Dictionary = GameState.survivors[i]
        if not s.get("overwatch", false):
            continue
        if s["state"] != "active":
            continue
        if GridUtils.has_line_of_sight(s["tile"], s["facing"], z["tile"], 5, board):
            # Free pistol shot
            ranged_attack(i, z["tile"])
            s["overwatch"] = false  # overwatch consumed

func _get_zombie(z_id: int) -> Dictionary:
    for z in GameState.zombies:
        if z["id"] == z_id:
            return z
    return {}

# ── Zone of Control (ZoC) ──────────────────────────────

func apply_zoc_damage(survivor_idx: int) -> void:
    # Called when survivor moves away from adjacent agitated zombie
    var s: Dictionary = GameState.survivors[survivor_idx]
    var total_damage: int = 0

    for z in GameState.zombies:
        if z["state"] != "agitated":
            continue
        if GridUtils.manhattan(z["tile"], s["tile"]) == 1:
            total_damage += z["damage"]

    if total_damage > 0 and not s.get("disengaging", false):
        s["hp"] -= total_damage
        if s["hp"] <= 0:
            TurnManager._handle_survivor_downed(survivor_idx)
```

Add to `GameState.gd`:
```gdscript
# Reference to the board node (set in GameBoard._ready)
var game_board_ref: Node = null
```

---

## Step 2: Action Modes in GameBoard._handle_click()

Update the click handler to support attack and throw modes:

```gdscript
# In GameBoard.gd — replace _handle_click:

func _handle_click(tile: Vector2i) -> void:
    var sel_idx: int = GameState.selected_survivor_index
    var mode: String = GameState.action_mode

    # ── Attack mode: click on zombie to attack ─────────
    if mode == "attack" and sel_idx >= 0:
        var z: Dictionary = GameState.get_zombie_at_tile(tile)
        if not z.is_empty() and GridUtils.manhattan(GameState.survivors[sel_idx]["tile"], tile) == 1:
            CombatSystem.melee_attack(sel_idx, z["id"])
            GameState.action_mode = "none"
            clear_highlights()
            queue_redraw()
            return

    # ── Shoot mode: click on tile to ranged attack ──────
    if mode == "shoot" and sel_idx >= 0:
        CombatSystem.ranged_attack(sel_idx, tile)
        GameState.action_mode = "none"
        clear_highlights()
        return

    # ── Throw mode: click on tile to throw ─────────────
    if mode == "throw" and sel_idx >= 0:
        var throw_item_idx: int = GameState.throw_item_index
        CombatSystem.throw_item(sel_idx, throw_item_idx, tile)
        GameState.action_mode = "none"
        GameState.throw_item_index = -1
        clear_highlights()
        return

    # ── Default: select survivor or move ───────────────
    # ... (existing code from Phase 2)
```

Add to `GameState.gd`:
```gdscript
var throw_item_index: int = -1  # which inventory slot is being thrown
```

---

## Step 3: Action Buttons in SurvivorPanel

Expand `SurvivorPanel.tscn` to include action buttons below inventory:

```
└── VBoxContainer
    ├── ... (stats from Phase 2)
    ├── InventoryList
    └── ActionButtons (VBoxContainer)
        ├── btn_attack      "⚔ Attack"
        ├── btn_shoot       "🔫 Shoot (free)"
        ├── btn_overwatch   "◯ Overwatch"
        ├── btn_disengage   "→ Disengage"
        ├── btn_break_free  "Break Free (2 AP)"
        ├── btn_stabilize   "☀ Stabilize Ally"
        └── btn_end_turn    "End Turn →"
```

```gdscript
# In SurvivorPanel.gd

func _setup_action_buttons() -> void:
    $VBox/ActionButtons/btn_attack.pressed.connect(_on_attack_pressed)
    $VBox/ActionButtons/btn_shoot.pressed.connect(_on_shoot_pressed)
    $VBox/ActionButtons/btn_overwatch.pressed.connect(_on_overwatch_pressed)
    $VBox/ActionButtons/btn_disengage.pressed.connect(_on_disengage_pressed)
    $VBox/ActionButtons/btn_break_free.pressed.connect(_on_break_free_pressed)
    $VBox/ActionButtons/btn_stabilize.pressed.connect(_on_stabilize_pressed)
    $VBox/ActionButtons/btn_end_turn.pressed.connect(_on_end_turn_pressed)

func _refresh_buttons() -> void:
    var idx: int = GameState.selected_survivor_index
    if idx < 0:
        for btn in $VBox/ActionButtons.get_children():
            btn.disabled = true
        return

    var s: Dictionary = GameState.survivors[idx]
    var can_act: bool = GameState.can_act(s)

    $VBox/ActionButtons/btn_attack.disabled = not can_act
    $VBox/ActionButtons/btn_shoot.disabled = CombatSystem._get_ranged_weapon(s).is_empty()
    $VBox/ActionButtons/btn_break_free.disabled = (s["state"] != "grabbed" or GameState.get_actions_left(s) < 2)
    $VBox/ActionButtons/btn_overwatch.disabled = not can_act
    $VBox/ActionButtons/btn_disengage.disabled = not can_act

    # Overwatch/Disengage toggle state
    $VBox/ActionButtons/btn_overwatch.text = "◯ Stop Overwatch" if s.get("overwatch") else "◯ Overwatch"
    $VBox/ActionButtons/btn_disengage.text = "→ Disengaging" if s.get("disengaging") else "→ Disengage"

func _on_attack_pressed() -> void:
    GameState.action_mode = "attack"
    # Highlight adjacent zombies
    var s: Dictionary = GameState.survivors[GameState.selected_survivor_index]
    var attack_tiles: Array[Vector2i] = []
    for z in GameState.zombies:
        if z["state"] != "dead" and GridUtils.manhattan(s["tile"], z["tile"]) == 1:
            attack_tiles.append(z["tile"])
    GameBoard.set_highlighted_tiles(attack_tiles)

func _on_shoot_pressed() -> void:
    GameState.action_mode = "shoot"
    # Highlight tiles in range 3 with LOS
    var s: Dictionary = GameState.survivors[GameState.selected_survivor_index]
    var shoot_tiles: Array[Vector2i] = []
    var board = get_tree().get_first_node_in_group("game_board")
    for z in GameState.zombies:
        if z["state"] != "dead" and GridUtils.manhattan(s["tile"], z["tile"]) <= 3:
            if GridUtils._raycast_clear(s["tile"], z["tile"], board):
                shoot_tiles.append(z["tile"])
    GameBoard.set_highlighted_tiles(shoot_tiles)

func _on_overwatch_pressed() -> void:
    var idx: int = GameState.selected_survivor_index
    var s: Dictionary = GameState.survivors[idx]
    s["overwatch"] = not s["overwatch"]
    if s["overwatch"]:
        GameState.spend_action(s)
    SignalBus.ui_refresh_requested.emit()

func _on_disengage_pressed() -> void:
    var idx: int = GameState.selected_survivor_index
    var s: Dictionary = GameState.survivors[idx]
    s["disengaging"] = true
    GameState.spend_action(s)
    SignalBus.ui_refresh_requested.emit()

func _on_break_free_pressed() -> void:
    CombatSystem.break_free(GameState.selected_survivor_index)

func _on_stabilize_pressed() -> void:
    # Find adjacent downed ally
    var idx: int = GameState.selected_survivor_index
    var s: Dictionary = GameState.survivors[idx]
    for i in range(GameState.survivors.size()):
        if i == idx: continue
        var other: Dictionary = GameState.survivors[i]
        if other["state"] == "downed" and GridUtils.manhattan(s["tile"], other["tile"]) == 1:
            CombatSystem.stabilize_ally(idx, i)
            return

func _on_end_turn_pressed() -> void:
    GameState.selected_survivor_index = -1
    GameState.action_mode = "none"
    CombatSystem._last_attacked.clear()
    TurnManager.run_noise_phase()
```

---

## Step 4: Connect Overwatch to Zombie Movement

In `Zombie.gd`, after each move:
```gdscript
func _on_moved(z_id: int) -> void:
    if z_id == zombie_id:
        # Tween animation...
        await tween.finished
        CombatSystem.check_overwatch_triggers(z_id)
```

---

## Phase 5 Checklist

- [ ] Melee attack: damage, flanking bonus, focus fire stagger
- [ ] Weapon durability depletes and breaks
- [ ] Knockback (bat/pipe): pushes, wall damage, collision damage
- [ ] Grab rescue: hitting a grabbing zombie frees the grabbed survivor
- [ ] Pistol ranged attack: free action, uses ammo, VERY LOUD
- [ ] Overwatch: set for 1 AP, triggers on zombie entering LOS
- [ ] Throw distractions: emits noise at landing tile, consumed
- [ ] Molotov: area fire pattern with spread onto puddles
- [ ] Bloater explosion: chain on death
- [ ] Break Free: costs 2 AP
- [ ] Stabilize Ally: adjacent, costs 1 AP
- [ ] Disengage: negates ZoC for 1 turn
- [ ] Zone of Control: damage when moving away from agitated zombie

---

## Next

[Phase 6: UI Polish →](./phase-6-ui.md)
