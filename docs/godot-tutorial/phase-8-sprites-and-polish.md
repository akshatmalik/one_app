# Phase 8: Sprites, Animations & Visual Polish

## Goal
Replace all placeholder colored rectangles with real sprites and add visual polish:
- Sprite sheets for survivors and zombies
- Animated walk cycles and attack flashes
- Tile sprites for terrain
- Item sprites
- Screen shake on explosions
- Sound effects

---

## How Sprites Work in Godot 4

A `Sprite2D` node displays a texture. For animated sprites, use `AnimatedSprite2D`.

```
Survivor (Node2D)
├── AnimatedSprite2D   ← replaces ColorRect
└── ...
```

`AnimatedSprite2D` uses a `SpriteFrames` resource — a collection of named animation arrays.

---

## Step 1: Prepare Your Sprite Assets

### Recommended Tile Size
Your grid uses `TILE_SIZE = 64`. Sprites should fit inside that. Typical choices:
- **48×48** character sprites (16px padding on each side looks clean)
- **64×64** terrain tiles (exact tile size)
- **32×32** item badges

### Folder Structure

```
assets/
├── sprites/
│   ├── survivors/
│   │   ├── scout_idle.png       (4-frame horizontal strip, 48x48 each)
│   │   ├── scout_walk.png       (4-frame strip)
│   │   ├── scout_attack.png     (3-frame strip)
│   │   └── scout_downed.png     (single frame)
│   ├── zombies/
│   │   ├── shambler_idle.png    (4-frame strip)
│   │   ├── shambler_walk.png    (4-frame strip)
│   │   ├── crawler_idle.png
│   │   ├── bloater_idle.png
│   │   ├── screamer_idle.png
│   │   └── brute_idle.png
│   ├── items/
│   │   ├── weapons.png          (sprite sheet, 1 row per weapon, 32x32 cells)
│   │   └── items.png            (consumables + distractions)
│   └── terrain/
│       ├── floor.png            (64x64 tile)
│       ├── obstacle.png
│       ├── exit.png
│       ├── glass.png
│       ├── metal.png
│       └── puddle.png
└── tilesets/
    └── terrain_tileset.tres     (Godot TileSet resource)
```

### Free Pixel Art Resources
Good sources for a zombie tactical game:
- **itch.io** search "zombie pixel art top down" — many free assets
- **Kenney.nl** → Top-down shooter packs (free, CC0)
- **OpenGameArt.org** → survival horror sprites

---

## Step 2: Switch from ColorRect to AnimatedSprite2D

Update `Survivor.tscn`:

```
Survivor (Node2D)
├── AnimatedSprite2D   ← "sprite"
├── SelectionRing (Node2D) ← drawn via _draw
└── StatusLabel (Label)
```

In the Godot editor:
1. Select `AnimatedSprite2D`
2. Inspector → `Frames` → New SpriteFrames → Edit
3. Add animation `idle`: drag in the idle strip, set speed 6fps
4. Add animation `walk`: walk strip, 8fps
5. Add animation `attack`: attack strip, 12fps, loop=false
6. Add animation `downed`: single frame

```gdscript
# In Survivor.gd — replace ColorRect logic:

@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D

func _refresh_visual() -> void:
    var data: Dictionary = GameState.survivors[survivor_index]

    # Position
    var pixel: Vector2 = _tile_to_pixel(data["tile"])
    position = pixel + Vector2(Constants.TILE_SIZE / 2.0, Constants.TILE_SIZE / 2.0)

    # Animation state
    match data["state"]:
        "downed": sprite.play("downed")
        "active": sprite.play("idle")

    # Tint for nerve/status (modulate is a color multiplier)
    if data["nerve"] <= 0:
        sprite.modulate = Color(1.0, 0.5, 0.5)   # red tint = panicked
    elif data["hp"] <= 2:
        sprite.modulate = Color(1.0, 0.8, 0.8)   # pale = critical
    else:
        sprite.modulate = Color.WHITE

    # Selection ring
    queue_redraw()

func _draw() -> void:
    if GameState.selected_survivor_index == survivor_index:
        draw_arc(Vector2.ZERO, 28, 0, TAU, 32, Color.WHITE, 2.0)

func animate_move_to(target_tile: Vector2i) -> void:
    sprite.play("walk")
    # Face direction
    var from_tile: Vector2i = GameState.survivors[survivor_index]["tile"]
    if target_tile.x < from_tile.x:
        sprite.flip_h = true
    else:
        sprite.flip_h = false

    var target_pixel: Vector2 = _tile_to_pixel(target_tile) + Vector2(Constants.TILE_SIZE / 2.0, Constants.TILE_SIZE / 2.0)
    var tween: Tween = create_tween()
    tween.tween_property(self, "position", target_pixel, 0.18)
    await tween.finished
    sprite.play("idle")

func animate_attack() -> void:
    sprite.play("attack")
    await sprite.animation_finished
    sprite.play("idle")

func _tile_to_pixel(tile: Vector2i) -> Vector2:
    # Can't call GameBoard directly; use a helper
    return Vector2(tile.x * Constants.TILE_SIZE, tile.y * Constants.TILE_SIZE)
```

---

## Step 3: Switch to TileMap for Terrain

`TileMap` is Godot's optimized tile renderer — better than `_draw()` for static terrain.

### Create the TileSet

1. In the editor, create `assets/tilesets/terrain_tileset.tres`
2. Open it → Add your terrain tile textures
3. Assign each tile a custom data layer named `"terrain_type"` → int
4. Set tile IDs to match `Constants.Terrain` enum values

### Replace _draw() in GameBoard

```gdscript
# GameBoard.gd — replace _draw() approach with TileMap

@onready var tile_map: TileMap = $TileMap  # add TileMap as child of GameBoard

func _build_terrain_map() -> void:
    tile_map.clear()

    for row in range(Constants.GRID_ROWS):
        for col in range(Constants.GRID_COLS):
            var tile: Vector2i = Vector2i(col, row)
            var terrain_type: int = terrain_map.get(tile, Constants.Terrain.FLOOR)
            # source_id=0, atlas_coords match terrain enum
            tile_map.set_cell(0, tile, 0, Vector2i(terrain_type, 0))

# Highlight tiles: use a second TileMap layer
func set_highlighted_tiles(tiles: Array[Vector2i]) -> void:
    tile_map.clear_layer(1)  # layer 1 = highlight overlay
    for tile in tiles:
        tile_map.set_cell(1, tile, 0, Vector2i(Constants.Terrain.FLOOR, 1))  # use overlay tile
```

If you don't have tile art yet, skip TileMap and keep `_draw()` — it works fine and you can migrate later.

---

## Step 4: Zombie Sprites

Same pattern as survivors. Each zombie type gets its own `SpriteFrames` resource (or one shared resource with namespaced animations like `shambler_idle`, `crawler_idle`, etc.)

```gdscript
# In Zombie.gd

func _refresh_visual() -> void:
    var z: Dictionary = _get_zombie()
    if z.is_empty(): return

    # Choose animation based on type + state
    var anim_name: String = "%s_%s" % [
        _type_name(z["type"]),   # "shambler", "crawler", etc.
        _state_anim(z["state"])  # "idle", "walk", "agitated"
    ]
    if $AnimatedSprite2D.sprite_frames.has_animation(anim_name):
        $AnimatedSprite2D.play(anim_name)

    # Face toward target
    var facing: Vector2i = z["facing"]
    $AnimatedSprite2D.flip_h = (facing.x < 0)

func _type_name(type: int) -> String:
    return ["shambler", "crawler", "bloater", "screamer", "brute"][type]

func _state_anim(state: String) -> String:
    match state:
        "agitated", "grabbing": return "walk"
        _: return "idle"
```

---

## Step 5: Item Sprites

Replace `Item.gd`'s `ColorRect` with a `Sprite2D` using a sprite atlas:

```gdscript
# In Item.gd

const ITEM_ATLAS_COORDS: Dictionary = {
    "knife":        Vector2i(0, 0),
    "bat":          Vector2i(1, 0),
    "pipe":         Vector2i(2, 0),
    "crowbar":      Vector2i(3, 0),
    "pistol":       Vector2i(4, 0),
    "bandage":      Vector2i(0, 1),
    "medkit":       Vector2i(1, 1),
    "brick":        Vector2i(0, 2),
    "alarm_clock":  Vector2i(1, 2),
    "flare":        Vector2i(2, 2),
    "molotov":      Vector2i(3, 2),
    "wire_trip":    Vector2i(0, 3),
    "nail_board":   Vector2i(1, 3),
    "bear_trap":    Vector2i(2, 3),
}

func setup(data: Dictionary) -> void:
    item_data = data
    var coords: Vector2i = ITEM_ATLAS_COORDS.get(data["id"], Vector2i(0, 0))
    $Sprite2D.region_rect = Rect2(coords * 32, Vector2(32, 32))
    position = Vector2(data["tile"].x * Constants.TILE_SIZE + Constants.TILE_SIZE / 2.0,
                       data["tile"].y * Constants.TILE_SIZE + Constants.TILE_SIZE * 0.7)
```

---

## Step 6: Screen Shake for Explosions and Guns

Add a `CameraShake` utility to `Main.gd`:

```gdscript
# In Main.gd

@onready var camera: Camera2D = $Camera2D

func shake_camera(strength: float, duration: float) -> void:
    var original_offset: Vector2 = camera.offset
    var elapsed: float = 0.0
    while elapsed < duration:
        var delta: float = await get_tree().process_frame
        elapsed += delta
        var t: float = elapsed / duration
        var intensity: float = strength * (1.0 - t)  # dampen over time
        camera.offset = original_offset + Vector2(
            randf_range(-intensity, intensity),
            randf_range(-intensity, intensity)
        )
    camera.offset = original_offset
```

Call it from `CombatSystem` on loud events:

```gdscript
# After pistol fire:
Main.shake_camera(4.0, 0.3)

# After bloater explosion:
Main.shake_camera(8.0, 0.5)
```

Access `Main` via the scene tree:
```gdscript
func _get_main() -> Node:
    return get_tree().get_first_node_in_group("main")
```

Add `Main` to the group `"main"` in the Inspector.

---

## Step 7: Particle Effects

Godot 4's `GPUParticles2D` for:
- Blood splatter on zombie death
- Fire particles on molotov tiles
- Dust puff on footsteps

Quick blood splatter:

```gdscript
# In GameBoard.gd

var BloodParticles = preload("res://scenes/effects/BloodSplatter.tscn")

func spawn_blood(tile: Vector2i) -> void:
    var effect = BloodParticles.instantiate()
    effect.position = tile_to_pixel(tile) + Vector2(Constants.TILE_SIZE / 2.0, Constants.TILE_SIZE / 2.0)
    add_child(effect)
    effect.emitting = true
    # Auto-free after particles finish
    await get_tree().create_timer(2.0).timeout
    effect.queue_free()
```

`BloodSplatter.tscn`:
- `GPUParticles2D`: amount=20, lifetime=0.5, one_shot=true
- Process Material: direction (0,-1), spread=45°, gravity=200
- Color curve: red → dark red → transparent

---

## Step 8: Sound Effects

Add an `AudioManager` autoload:

```gdscript
# autoloads/AudioManager.gd
extends Node

var _sfx_players: Array[AudioStreamPlayer] = []

func play_sfx(sound_name: String) -> void:
    var path: String = "res://assets/sounds/%s.ogg" % sound_name
    if not ResourceLoader.exists(path):
        return
    var player: AudioStreamPlayer = AudioStreamPlayer.new()
    player.stream = load(path)
    player.autoplay = true
    add_child(player)
    player.finished.connect(player.queue_free)
```

Sound effect names to source:
```
zombie_groan      ← zombie wakes up
zombie_shamble    ← zombie footstep
zombie_die        ← zombie killed
weapon_knife      ← knife attack
weapon_bat        ← bat swing
weapon_gunshot    ← pistol fire (LOUD)
item_pickup       ← loot collected
explosion         ← bloater / molotov
survivor_hurt     ← survivor takes damage
survivor_downed   ← survivor goes down
glass_break       ← glass terrain stepped on
```

Wire up in key systems:
```gdscript
# In NoiseSystem.emit_noise (intensity 3 = gunshot):
if intensity >= 3:
    AudioManager.play_sfx("weapon_gunshot")

# In CombatSystem._handle_zombie_death:
AudioManager.play_sfx("zombie_die")
```

---

## Step 9: Visual Polish Checklist

### The Noise Ripple
The `NoiseRipple.gd` already works. Improve it:
```gdscript
func _draw() -> void:
    # Draw multiple rings for a more impactful look
    for i in range(3):
        var t_offset: float = (elapsed / lifetime) + (i * 0.15)
        t_offset = fmod(t_offset, 1.0)
        var r: float = max_radius_px * t_offset
        var alpha: float = (1.0 - t_offset) * 0.5
        draw_arc(Vector2.ZERO, r, 0, TAU, 32, Color(color.r, color.g, color.b, alpha), 1.5)
```

### Zombie State Color Transitions
Smoothly transition zombie color when they wake up:
```gdscript
# In Zombie.gd
func _on_state_changed(z_id: int) -> void:
    if z_id != zombie_id: return
    var tween: Tween = create_tween()
    var target_color: Color = _get_state_color()
    tween.tween_property($AnimatedSprite2D, "modulate", target_color, 0.3)
```

### Downed Survivor Pulse
```gdscript
# In Survivor.gd, when state == "downed":
var tween: Tween = create_tween().set_loops()
tween.tween_property(sprite, "modulate", Color(1, 0.3, 0.1), 0.4)
tween.tween_property(sprite, "modulate", Color(0.5, 0.1, 0.0), 0.4)
```

---

## Final Integration: Run Through

At this point your port is complete. Play through this checklist:

### Core Loop
- [ ] Both survivors move and actions deplete correctly
- [ ] Items can be picked up, used, dropped
- [ ] Melee kills with correct noise and knockback
- [ ] Pistol fires free action and wakes everything nearby
- [ ] Throwing brick investigates; throwing molotov explodes
- [ ] Traps trigger on zombie movement

### Noise & AI
- [ ] Shooting pistol wakes all nearby zombies (cascade)
- [ ] Screamer groans every turn when agitated
- [ ] Bloater explodes, possibly chain-exploding another bloater
- [ ] Zombie herd converges on one survivor
- [ ] Crawler is harder to spot (lower vision range)
- [ ] Brute can't be knocked back

### Progression
- [ ] Stage 1 clears when both survivors reach exit
- [ ] Survivors carry inventory into Stage 2
- [ ] Stage 2 loads correct map and zombies
- [ ] Campaign win screen after Stage 2

### UI
- [ ] HP/Nerve bars change color correctly
- [ ] Weight bar fills as inventory fills
- [ ] Downed warning blinks and shows countdown
- [ ] Phase indicator updates on phase transition
- [ ] Game Over screen appears, restart works

---

## Where to Go From Here

1. **More stages** — add Stage 3, 4 in `Constants.gd` and `GameState.load_stage()`
2. **Save system** — use `FileAccess` to write `GameState` to JSON
3. **More survivors** — the Medic (healing specialist), Gunner (extra ammo), Engineer (trap expert)
4. **More zombie types** — Runner (fast), Armored (reduced damage), Giant (multi-tile)
5. **Roguelite runs** — randomized loot tables, procedural maps using `TileMap.set_cell()` loops
6. **Mobile** — the grid already works on touch; add `InputEventScreenTouch`
