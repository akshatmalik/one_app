# Phase 3: Items, Inventory & Loot

## Goal
By the end of this phase:
- All item types defined (weapons, consumables, distractions, traps)
- Items spawn on the ground as colored badges
- Survivors can pick up items and drop them
- Item buttons appear in the Survivor Panel
- Weapon durability and ammo work

---

## Step 1: Item Data in Constants.gd

Add everything item-related to `Constants.gd`:

```gdscript
# In Constants.gd — add below terrain constants

# ── Item Categories ────────────────────────────────────
enum ItemCategory { WEAPON, CONSUMABLE, DISTRACTION, TRAP, CONTAINER }

# ── Item Definitions ───────────────────────────────────
# Each entry: { id, name, category, damage, noise_radius, noise_intensity,
#               durability, range, special, color_hint }
const ITEMS: Dictionary = {

    # ── Weapons ───────────────────────────────────────
    "knife": {
        "id": "knife", "name": "Knife", "category": ItemCategory.WEAPON,
        "damage": 1, "noise_radius": 1, "noise_intensity": 1,
        "durability": 99, "max_durability": 99,
        "range": 1, "special": [],
        "color": Color(0.7, 0.2, 0.2)
    },
    "bat": {
        "id": "bat", "name": "Bat", "category": ItemCategory.WEAPON,
        "damage": 2, "noise_radius": 2, "noise_intensity": 1,
        "durability": 8, "max_durability": 8,
        "range": 1, "special": ["knockback"],
        "color": Color(0.7, 0.3, 0.1)
    },
    "pipe": {
        "id": "pipe", "name": "Pipe", "category": ItemCategory.WEAPON,
        "damage": 2, "noise_radius": 2, "noise_intensity": 1,
        "durability": 6, "max_durability": 6,
        "range": 1, "special": ["knockback"],
        "color": Color(0.5, 0.5, 0.5)
    },
    "crowbar": {
        "id": "crowbar", "name": "Crowbar", "category": ItemCategory.WEAPON,
        "damage": 2, "noise_radius": 3, "noise_intensity": 1,
        "durability": 10, "max_durability": 10,
        "range": 1, "special": ["open_crate"],  # can open crates from 2 tiles
        "color": Color(0.4, 0.4, 0.6)
    },
    "pistol": {
        "id": "pistol", "name": "Pistol", "category": ItemCategory.WEAPON,
        "damage": 3, "noise_radius": 8, "noise_intensity": 3,
        "durability": 99, "max_durability": 99,
        "ammo": 3, "range": 3, "special": ["ranged", "free_action"],
        "color": Color(0.6, 0.1, 0.1)
    },

    # ── Consumables ───────────────────────────────────
    "bandage": {
        "id": "bandage", "name": "Bandage", "category": ItemCategory.CONSUMABLE,
        "heal": 3, "noise_radius": 1, "noise_intensity": 1,
        "special": ["remove_bleeding"],
        "color": Color(0.2, 0.7, 0.3)
    },
    "medkit": {
        "id": "medkit", "name": "Medkit", "category": ItemCategory.CONSUMABLE,
        "heal": 5, "noise_radius": 1, "noise_intensity": 1,
        "special": ["remove_bleeding"],
        "color": Color(0.1, 0.8, 0.4)
    },

    # ── Distractions ──────────────────────────────────
    "brick": {
        "id": "brick", "name": "Brick", "category": ItemCategory.DISTRACTION,
        "throw_range": 4, "noise_radius": 3, "noise_intensity": 1,  # alert only
        "alert_duration": 7,
        "color": Color(0.7, 0.6, 0.2)
    },
    "alarm_clock": {
        "id": "alarm_clock", "name": "Alarm Clock", "category": ItemCategory.DISTRACTION,
        "throw_range": 3, "noise_radius": 5, "noise_intensity": 2,  # agitates
        "alert_duration": 3,
        "color": Color(0.8, 0.8, 0.1)
    },
    "firecracker": {
        "id": "firecracker", "name": "Firecracker", "category": ItemCategory.DISTRACTION,
        "throw_range": 5, "noise_radius": 5, "noise_intensity": 2,
        "alert_duration": 3,
        "color": Color(0.9, 0.5, 0.1)
    },
    "flare": {
        "id": "flare", "name": "Flare", "category": ItemCategory.DISTRACTION,
        "throw_range": 5, "noise_radius": 3, "noise_intensity": 1,
        "alert_duration": 10,  # persists 10 turns
        "color": Color(1.0, 0.3, 0.1)
    },
    "glass_bottle": {
        "id": "glass_bottle", "name": "Glass Bottle", "category": ItemCategory.DISTRACTION,
        "throw_range": 3, "noise_radius": 2, "noise_intensity": 1,
        "special": ["create_glass_terrain"],
        "color": Color(0.3, 0.6, 0.8)
    },
    "molotov": {
        "id": "molotov", "name": "Molotov", "category": ItemCategory.DISTRACTION,
        "throw_range": 4, "noise_radius": 8, "noise_intensity": 3,
        "special": ["area_fire"],
        "damage_center": 6, "damage_cardinal": 3, "damage_diagonal": 2,
        "color": Color(0.9, 0.4, 0.1)
    },

    # ── Traps ─────────────────────────────────────────
    "wire_trip": {
        "id": "wire_trip", "name": "Wire Trip", "category": ItemCategory.TRAP,
        "noise_radius": 3, "noise_intensity": 2,
        "special": ["stagger"],
        "color": Color(0.6, 0.6, 0.3)
    },
    "nail_board": {
        "id": "nail_board", "name": "Nail Board", "category": ItemCategory.TRAP,
        "damage": 3, "noise_radius": 0,
        "color": Color(0.5, 0.3, 0.2)
    },
    "bear_trap": {
        "id": "bear_trap", "name": "Bear Trap", "category": ItemCategory.TRAP,
        "damage": 2, "noise_radius": 1, "noise_intensity": 1,
        "special": ["stagger"],
        "color": Color(0.6, 0.2, 0.2)
    },
}

# ── Stage 1 Loot Spawns ───────────────────────────────
const STAGE_1_LOOT: Array[Dictionary] = [
    {"id": "pipe",         "tile": Vector2i(2, 3)},
    {"id": "bandage",      "tile": Vector2i(5, 2)},
    {"id": "brick",        "tile": Vector2i(8, 4)},
    {"id": "pistol",       "tile": Vector2i(11, 2)},
    {"id": "molotov",      "tile": Vector2i(4, 7)},
    {"id": "wire_trip",    "tile": Vector2i(9, 6)},
    {"id": "glass_bottle", "tile": Vector2i(1, 5)},
    {"id": "nail_board",   "tile": Vector2i(12, 5)},
]

# ── Containers (crates) ───────────────────────────────
const STAGE_1_CONTAINERS: Array[Dictionary] = [
    {"tile": Vector2i(2, 8), "loot": ["bandage", "firecracker"]},
    {"tile": Vector2i(11, 8), "loot": ["medkit", "wire_trip"]},
]
```

---

## Step 2: Item Instances

Items on the ground are *instances* (have a position and can be picked up). In GameState:

```gdscript
# In GameState.gd — add:

var ground_items: Array[Dictionary] = []   # items lying on tiles
var containers: Array[Dictionary] = []     # crates

func init_stage_1() -> void:
    # ... existing survivor init ...

    # Spawn ground loot
    ground_items = []
    for loot in Constants.STAGE_1_LOOT:
        ground_items.append(_make_ground_item(loot["id"], loot["tile"]))

    # Spawn containers
    containers = []
    for c in Constants.STAGE_1_CONTAINERS:
        containers.append({
            "tile": c["tile"],
            "loot": c["loot"].duplicate(),
            "searched": false,
        })

func _make_ground_item(item_id: String, tile: Vector2i) -> Dictionary:
    var def: Dictionary = Constants.ITEMS[item_id].duplicate(true)
    def["tile"] = tile
    def["instance_id"] = randi()  # unique ID for this drop
    return def

func get_items_at_tile(tile: Vector2i) -> Array[Dictionary]:
    var result: Array[Dictionary] = []
    for item in ground_items:
        if item["tile"] == tile:
            result.append(item)
    return result

func get_container_at_tile(tile: Vector2i) -> Dictionary:
    for c in containers:
        if c["tile"] == tile:
            return c
    return {}
```

---

## Step 3: Item.tscn — Ground Item Visual

Create `scenes/game/Item.tscn`:

```
Item (Node2D)    ← Item.gd
└── ColorRect    ← colored badge, size: 32x16, centered
└── Label        ← item name, font size 7px
```

```gdscript
# scripts/game/Item.gd
extends Node2D

var item_data: Dictionary = {}

func setup(data: Dictionary) -> void:
    item_data = data
    _refresh_visual()

func _refresh_visual() -> void:
    $ColorRect.color = item_data.get("color", Color.WHITE)
    $Label.text = item_data.get("name", "?")

    # Position centered on tile
    var pixel: Vector2 = GameBoard.tile_to_pixel(item_data["tile"])
    position = pixel + Vector2(Constants.TILE_SIZE / 2.0, Constants.TILE_SIZE * 0.7)

    # Pulse animation (same as original)
    var tween: Tween = create_tween().set_loops()
    tween.tween_property($ColorRect, "modulate:a", 0.6, 1.0)
    tween.tween_property($ColorRect, "modulate:a", 1.0, 1.0)
```

In `GameBoard.gd`, add item spawning:

```gdscript
var item_nodes: Dictionary = {}  # instance_id → Node

func _spawn_items() -> void:
    var ItemScene = preload("res://scenes/game/Item.tscn")
    for item in GameState.ground_items:
        var node = ItemScene.instantiate()
        add_child(node)
        node.setup(item)
        item_nodes[item["instance_id"]] = node

func remove_item_node(instance_id: int) -> void:
    if instance_id in item_nodes:
        item_nodes[instance_id].queue_free()
        item_nodes.erase(instance_id)
```

---

## Step 4: Pick Up & Drop Actions

Add to `GameState.gd`:

```gdscript
# ── Inventory Actions ─────────────────────────────────

func pick_up_item(survivor_idx: int, item_instance_id: int) -> bool:
    var s: Dictionary = survivors[survivor_idx]

    # Check capacity
    if s["inventory"].size() >= s["inventory_cap"]:
        return false

    # Find item on ground
    var item_to_pick: Dictionary = {}
    for item in ground_items:
        if item["instance_id"] == item_instance_id:
            item_to_pick = item
            break

    if item_to_pick.is_empty():
        return false

    # Must be on same tile
    if item_to_pick["tile"] != s["tile"]:
        return false

    ground_items.erase(item_to_pick)
    s["inventory"].append(item_to_pick)
    spend_action(s)
    SignalBus.ui_refresh_requested.emit()
    return true

func drop_item(survivor_idx: int, inventory_idx: int) -> void:
    var s: Dictionary = survivors[survivor_idx]
    if inventory_idx >= s["inventory"].size():
        return
    var item: Dictionary = s["inventory"][inventory_idx]
    item["tile"] = s["tile"]
    s["inventory"].remove_at(inventory_idx)
    ground_items.append(item)
    # Drop is free (no action cost)
    SignalBus.ui_refresh_requested.emit()

func search_container(survivor_idx: int) -> void:
    var s: Dictionary = survivors[survivor_idx]
    var container: Dictionary = get_container_at_tile(s["tile"])
    if container.is_empty() or container["searched"]:
        return
    if s["inventory"].size() >= s["inventory_cap"]:
        return  # full

    container["searched"] = true
    for item_id in container["loot"]:
        if s["inventory"].size() < s["inventory_cap"]:
            var item: Dictionary = _make_ground_item(item_id, s["tile"])
            s["inventory"].append(item)
    spend_action(s)
    SignalBus.ui_refresh_requested.emit()
```

---

## Step 5: Use Item Actions

```gdscript
# In GameState.gd

func use_healing_item(survivor_idx: int, inventory_idx: int) -> void:
    var s: Dictionary = survivors[survivor_idx]
    var item: Dictionary = s["inventory"][inventory_idx]

    if item["category"] != Constants.ItemCategory.CONSUMABLE:
        return

    var heal_amount: int = item.get("heal", 0)
    s["hp"] = min(s["hp"] + heal_amount, s["max_hp"])

    if "remove_bleeding" in item.get("special", []):
        s["status"].erase("bleeding")

    s["nerve"] = min(s["nerve"] + 1, s["max_nerve"])  # healing restores nerve

    s["inventory"].remove_at(inventory_idx)
    spend_action(s)

    # Emit quiet noise (bandage: radius 1, intensity 1)
    var noise_radius: int = item.get("noise_radius", 1)
    var noise_intensity: int = item.get("noise_intensity", 1)
    NoiseSystem.emit_noise(s["tile"], noise_radius, noise_intensity)
    SignalBus.ui_refresh_requested.emit()

func place_trap(survivor_idx: int, inventory_idx: int) -> void:
    var s: Dictionary = survivors[survivor_idx]
    var item: Dictionary = s["inventory"][inventory_idx]

    if item["category"] != Constants.ItemCategory.TRAP:
        return

    # Place trap on current tile (stored in GameState.traps)
    traps.append({
        "id": item["id"],
        "tile": s["tile"],
        "data": item.duplicate(),
    })

    s["inventory"].remove_at(inventory_idx)
    spend_action(s)
    SignalBus.ui_refresh_requested.emit()
```

Add `var traps: Array[Dictionary] = []` to `GameState.gd`.

---

## Step 6: Render Traps on the Grid

In `GameBoard.gd _draw()`:

```gdscript
func _draw() -> void:
    for tile in terrain_map:
        _draw_tile(tile)
    _draw_traps()

func _draw_traps() -> void:
    for trap in GameState.traps:
        var pixel: Vector2 = tile_to_pixel(trap["tile"])
        var icon: String = "⊞" if trap["id"] == "nail_board" else "⌇"
        # Draw a small darker overlay on the tile
        draw_rect(Rect2(pixel, Vector2(Constants.TILE_SIZE, Constants.TILE_SIZE)),
                  Color(0.1, 0.1, 0.1, 0.4))
        # Icon drawn via Label node (or use draw_string)
        draw_string(ThemeDB.fallback_font, pixel + Vector2(4, 20), icon,
                    HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color.WHITE)
```

---

## Step 7: Full Inventory UI in SurvivorPanel

Replace the temp inventory label:

```gdscript
# In SurvivorPanel.gd — update _refresh():

func _refresh_inventory(s: Dictionary) -> void:
    # Clear existing buttons
    for child in $VBox/InventoryList.get_children():
        child.queue_free()

    # Weight bar: 5 slot indicators
    for i in range(s["inventory_cap"]):
        var slot_indicator: ColorRect = ColorRect.new()
        slot_indicator.size = Vector2(24, 24)
        slot_indicator.color = (Color(0.42, 0.16, 0.16) if i < s["inventory"].size()
                                 else Color(0.16, 0.29, 0.16))
        $VBox/WeightBar.add_child(slot_indicator)

    # Item buttons
    for i in range(s["inventory"].size()):
        var item: Dictionary = s["inventory"][i]
        var row: HBoxContainer = HBoxContainer.new()

        var btn: Button = Button.new()
        var dur_text: String = ""
        if "durability" in item and item["durability"] < 99:
            dur_text = " (%d)" % item["durability"]
        if "ammo" in item:
            dur_text = " [%d]" % item["ammo"]
        btn.text = item["name"] + dur_text
        btn.pressed.connect(_on_item_pressed.bind(i))
        row.add_child(btn)

        var drop_btn: Button = Button.new()
        drop_btn.text = "×"
        drop_btn.pressed.connect(_on_drop_pressed.bind(i))
        row.add_child(drop_btn)

        $VBox/InventoryList.add_child(row)

func _on_item_pressed(inventory_idx: int) -> void:
    var idx: int = GameState.selected_survivor_index
    if idx < 0: return
    var item: Dictionary = GameState.survivors[idx]["inventory"][inventory_idx]

    match item["category"]:
        Constants.ItemCategory.CONSUMABLE:
            GameState.use_healing_item(idx, inventory_idx)
        Constants.ItemCategory.TRAP:
            GameState.place_trap(idx, inventory_idx)
        Constants.ItemCategory.WEAPON:
            # Toggle equipped weapon (covered in Phase 5)
            pass
        Constants.ItemCategory.DISTRACTION:
            # Enter throw mode (covered in Phase 5)
            pass

func _on_drop_pressed(inventory_idx: int) -> void:
    var idx: int = GameState.selected_survivor_index
    if idx >= 0:
        GameState.drop_item(idx, inventory_idx)
        SignalBus.ui_refresh_requested.emit()
```

---

## Phase 3 Checklist

- [ ] All item types defined in `Constants.gd` (weapons, consumables, distractions, traps)
- [ ] Ground items spawn at stage 1 loot positions as colored badges with pulsing animation
- [ ] Survivors can pick up items (costs 1 action, must be on same tile)
- [ ] Survivors can drop items (free action)
- [ ] Survivors can search containers (costs 1 action)
- [ ] Healing items can be used from inventory
- [ ] Traps can be placed from inventory
- [ ] Inventory renders in Survivor Panel with slot weight bar
- [ ] Trap icons render on the grid

---

## Next

[Phase 4: Noise System & Zombie State Machine →](./phase-4-noise-and-zombies.md)
