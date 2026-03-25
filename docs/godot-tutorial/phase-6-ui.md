# Phase 6: UI — Mobile Action Panel, Bars, Status, Turn Indicator

## Goal
By the end of this phase:
- **Pinned bottom panel** always visible at the bottom of the screen (never scrolls)
- Survivor stats (HP/Nerve bars, weight bar, status tags) in the panel
- Action buttons in the panel, thumb-reachable
- HUD at the top (turn counter, phase)
- Game Over and Stage Cleared overlays
- Action feedback: flash on damage, color shift on low HP/nerve

---

## Mobile UI Philosophy

The screen is split into three fixed zones, all in a `CanvasLayer` (unaffected by camera pan):

```
┌────────────────────────────┐  ← CanvasLayer
│ HUD (60px)                 │  Turn number, phase, panic warning
├────────────────────────────┤
│                            │
│   (grid scrolls here)      │  Camera2D handles this area
│                            │
├────────────────────────────┤
│ ACTION PANEL (210px)       │  Always pinned, always touchable
│  [Scout ❤7 ⚡8  Act:3]    │  → tap survivor tab to switch
│  [inv slot][slot][slot]    │  → tap item to use/select
│  [Attack][Shoot][Throw]    │  → action buttons
│  [Overwatch][Disengage][⏭]│
└────────────────────────────┘
```

The action panel has **two tabs**: tap the survivor portrait to switch between Scout and Fighter. Both survivors' stats are always one tap away without leaving the panel.

---

## Step 1: ActionPanel Layout

The complete `ActionPanel.tscn` tree (anchored to bottom of screen):

```
ActionPanel (PanelContainer)
  anchors: left=0, right=1, bottom=1, top=1
  offset_top: -210                         ← 210px tall, pinned at bottom
└── MarginContainer (6px margins)
    └── VBoxContainer
        │
        ├── SurvivorTabs (HBoxContainer)   ← one button per survivor
        │   ├── ScoutTab (Button)          ← tap to select Scout
        │   └── FighterTab (Button)        ← tap to select Fighter
        │
        ├── StatsRow (HBoxContainer)
        │   ├── NameLabel                  ← "Scout"
        │   ├── StateLabel                 ← "[OW]" / "DOWNED" etc.
        │   └── CriticalWarning            ← "⚠ CRIT" (blinks)
        │
        ├── BarsRow (HBoxContainer)
        │   ├── HPSection (VBoxContainer)
        │   │   ├── HPBar (ProgressBar)
        │   │   └── HPText: "7/8"
        │   ├── NerveSection (VBoxContainer)
        │   │   ├── NerveBar (ProgressBar)
        │   │   └── NerveText: "8/10"
        │   ├── ActionsLabel: "Act: 3"
        │   └── WeightBar (HBoxContainer)  ← 5 mini slot squares
        │
        ├── StatusTags (HBoxContainer)     ← BLEEDING / WOUNDED etc.
        │
        ├── InventoryRow (HBoxContainer)   ← up to 5 item buttons, scrollable
        │   └── ScrollContainer
        │       └── HBoxContainer
        │           ├── ItemBtn1
        │           └── ...
        │
        └── ActionButtons (GridContainer, 3 columns)
            ├── btn_attack      "⚔"
            ├── btn_shoot       "🔫"
            ├── btn_throw       "↗"
            ├── btn_overwatch   "◯"
            ├── btn_disengage   "→"
            └── btn_end_turn    "⏭ END"
        │
        ├── InventoryLabel: "INVENTORY"
        ├── InventoryList (VBoxContainer)  ← dynamic item buttons
        │
        ├── Separator
        │
        ├── ActionButtons (VBoxContainer)
        │   ├── btn_attack
        │   ├── btn_shoot
        │   ├── btn_overwatch
        │   ├── btn_disengage
        │   ├── btn_break_free
        │   └── btn_stabilize
        │
        └── btn_end_turn
```

---

## Step 2: Survivor Tab Switching

The top row of the panel shows a button per survivor. Tapping switches the selected survivor without touching the grid.

```gdscript
# In ActionPanel.gd

func _setup_survivor_tabs() -> void:
    for i in range(GameState.survivors.size()):
        var tab: Button = Button.new()
        tab.text = GameState.survivors[i]["name"]
        tab.custom_minimum_size = Vector2(80, 36)
        tab.pressed.connect(_on_survivor_tab_pressed.bind(i))
        $MC/VBox/SurvivorTabs.add_child(tab)

func _on_survivor_tab_pressed(index: int) -> void:
    if GameState.survivors[index]["state"] == "dead":
        return
    GameState.selected_survivor_index = index
    SignalBus.survivor_selected.emit(index)
    # Camera follows: GridCamera._on_survivor_selected() handles this

func _refresh_survivor_tabs() -> void:
    var tabs = $MC/VBox/SurvivorTabs.get_children()
    for i in range(tabs.size()):
        var s: Dictionary = GameState.survivors[i]
        var tab: Button = tabs[i]
        var is_selected: bool = (GameState.selected_survivor_index == i)

        # Highlight selected tab
        tab.modulate = Color.WHITE if is_selected else Color(0.6, 0.6, 0.6)

        # Show HP inline on tab for quick read
        tab.text = "%s\n❤%d" % [s["name"], s["hp"]]
        tab.disabled = (s["state"] == "dead")
```

---

## Step 3: ActionPanel.gd — Complete

```gdscript
# scripts/ui/ActionPanel.gd
extends PanelContainer

func _ready() -> void:
    SignalBus.ui_refresh_requested.connect(_refresh)
    SignalBus.survivor_selected.connect(func(_i): _refresh())
    _setup_action_buttons()
    _setup_survivor_tabs()
    _refresh()

func _refresh() -> void:
    var idx: int = GameState.selected_survivor_index

    if idx < 0:
        $MC/VBox/NameLabel.text = "Select a survivor"
        $MC/VBox/StateLabel.text = ""
        _clear_inventory()
        _disable_all_buttons()
        return

    var s: Dictionary = GameState.survivors[idx]
    _refresh_stats(s)
    _refresh_weight_bar(s)
    _refresh_status_tags(s)
    _refresh_inventory(s)
    _refresh_buttons(s)

func _refresh_stats(s: Dictionary) -> void:
    $MC/VBox/NameLabel.text = s["name"]

    # State label
    match s["state"]:
        "downed":
            $MC/VBox/StateLabel.text = "☠ DOWNED — %d turns" % s["downed_timer"]
            $MC/VBox/StateLabel.modulate = Color(1, 0.3, 0.1)
        "grabbed":
            $MC/VBox/StateLabel.text = "GRABBED"
            $MC/VBox/StateLabel.modulate = Color(0.9, 0.5, 0.1)
        "dead":
            $MC/VBox/StateLabel.text = "DEAD"
            $MC/VBox/StateLabel.modulate = Color(0.4, 0.4, 0.4)
        _:
            var extras: Array[String] = []
            if s.get("overwatch"):   extras.append("[OW]")
            if s.get("disengaging"): extras.append("[DIS]")
            $MC/VBox/StateLabel.text = "ACTIVE " + " ".join(extras)
            $MC/VBox/StateLabel.modulate = Color.WHITE

    # Critical warning (blinks when HP <= 2)
    var critical: bool = (s["hp"] <= 2 and s["state"] == "active")
    $MC/VBox/CriticalWarning.visible = critical
    if critical:
        _start_blink($MC/VBox/CriticalWarning)

    # HP Bar
    var hp_bar = $MC/VBox/HPSection/HPBar
    hp_bar.max_value = s["max_hp"]
    hp_bar.value = s["hp"]

    # Color HP bar by value
    var hp_style = StyleBoxFlat.new()
    hp_style.bg_color = (
        Color(0.16, 0.6, 0.16) if s["hp"] > 5
        else Color(0.7, 0.6, 0.1) if s["hp"] > 2
        else Color(0.8, 0.1, 0.1)
    )
    hp_bar.add_theme_stylebox_override("fill", hp_style)
    $MC/VBox/HPSection/HPText.text = "%d/%d" % [s["hp"], s["max_hp"]]

    # Nerve Bar
    var nerve_bar = $MC/VBox/NerveSection/NerveBar
    nerve_bar.max_value = s["max_nerve"]
    nerve_bar.value = s["nerve"]

    var nerve_style = StyleBoxFlat.new()
    nerve_style.bg_color = (
        Color(0.16, 0.4, 0.8) if s["nerve"] > 6
        else Color(0.7, 0.6, 0.1) if s["nerve"] > 3
        else Color(0.8, 0.1, 0.1)
    )
    nerve_bar.add_theme_stylebox_override("fill", nerve_style)
    $MC/VBox/NerveSection/NerveText.text = "%d/%d" % [s["nerve"], s["max_nerve"]]

    # Panicked notice
    if s["nerve"] <= 0:
        $MC/VBox/NerveSection/NerveText.text += " PANICKED"

    # Actions
    var actions_left: int = GameState.get_actions_left(s)
    $MC/VBox/ActionsLabel.text = "Actions: %d  (used %d)" % [actions_left, s["actions_used"]]

func _refresh_weight_bar(s: Dictionary) -> void:
    var container = $MC/VBox/WeightBar
    for child in container.get_children():
        child.queue_free()

    for i in range(s["inventory_cap"]):
        var slot: ColorRect = ColorRect.new()
        slot.custom_minimum_size = Vector2(28, 28)
        slot.color = (Color(0.42, 0.16, 0.16) if i < s["inventory"].size()
                      else Color(0.16, 0.29, 0.16))
        # Border
        var style = StyleBoxFlat.new()
        style.bg_color = slot.color
        style.set_border_width_all(1)
        style.border_color = Color(0, 0, 0, 0.5)
        container.add_child(slot)

func _refresh_status_tags(s: Dictionary) -> void:
    var container = $MC/VBox/StatusTags
    for child in container.get_children():
        child.queue_free()

    var status_colors: Dictionary = {
        "bleeding":   Color(0.8, 0.1, 0.1),
        "wounded":    Color(0.8, 0.4, 0.1),
        "exhausted":  Color(0.1, 0.4, 0.8),
        "adrenaline": Color(0.8, 0.8, 0.1),
    }

    for status in s["status"]:
        var tag: Label = Label.new()
        tag.text = " " + status.to_upper() + " "
        tag.add_theme_color_override("font_color", Color.WHITE)
        tag.add_theme_font_size_override("font_size", 10)
        # Background color via StyleBox
        var style = StyleBoxFlat.new()
        style.bg_color = status_colors.get(status, Color(0.3, 0.3, 0.3))
        style.set_corner_radius_all(3)
        tag.add_theme_stylebox_override("normal", style)
        container.add_child(tag)

func _refresh_inventory(s: Dictionary) -> void:
    _clear_inventory()

    for i in range(s["inventory"].size()):
        var item: Dictionary = s["inventory"][i]
        var row: HBoxContainer = HBoxContainer.new()

        var btn: Button = Button.new()
        btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
        btn.text = _item_display_text(item)
        btn.add_theme_font_size_override("font_size", 11)

        # Color by category
        match item["category"]:
            Constants.ItemCategory.WEAPON:     btn.modulate = Color(1.0, 0.6, 0.6)
            Constants.ItemCategory.CONSUMABLE: btn.modulate = Color(0.6, 1.0, 0.7)
            Constants.ItemCategory.DISTRACTION: btn.modulate = Color(1.0, 1.0, 0.6)
            Constants.ItemCategory.TRAP:       btn.modulate = Color(0.8, 0.8, 0.6)

        btn.pressed.connect(_on_item_pressed.bind(i))
        row.add_child(btn)

        var drop: Button = Button.new()
        drop.text = "×"
        drop.custom_minimum_size = Vector2(28, 0)
        drop.pressed.connect(_on_drop_pressed.bind(i))
        row.add_child(drop)

        $MC/VBox/InventoryList.add_child(row)

func _item_display_text(item: Dictionary) -> String:
    var text: String = item["name"]
    if item.get("durability", 99) < 99:
        text += " (%d)" % item["durability"]
    if "ammo" in item:
        text += " [%d]" % item["ammo"]
    return text

func _clear_inventory() -> void:
    for child in $MC/VBox/InventoryList.get_children():
        child.queue_free()

func _disable_all_buttons() -> void:
    for btn in $MC/VBox/ActionButtons.get_children():
        if btn is Button:
            btn.disabled = true

func _start_blink(node: Control) -> void:
    if node.has_meta("blinking"): return
    node.set_meta("blinking", true)
    var tween: Tween = create_tween().set_loops()
    tween.tween_property(node, "modulate:a", 0.2, 0.4)
    tween.tween_property(node, "modulate:a", 1.0, 0.4)
```

---

## Step 4: Top HUD — Turn Counter & Phase Indicator

Add to `Main.tscn` inside the `UI/CanvasLayer`:

```
HUD (PanelContainer)
  anchors: left=0, right=1, top=0, bottom=0
  offset_bottom: 60                        ← 60px tall, pinned at top
└── HBoxContainer
    ├── TurnLabel          ← "Turn 1"
    ├── PhaseLabel         ← "PLAYER PHASE"
    └── PanicLabel         ← "⚠ PANIC"
```

```gdscript
# scripts/ui/HUD.gd
extends HBoxContainer

func _ready() -> void:
    SignalBus.phase_changed.connect(_on_phase_changed)
    SignalBus.ui_refresh_requested.connect(_refresh)
    _refresh()

func _refresh() -> void:
    $TurnLabel.text = "Turn %d" % GameState.turn_number

    var any_panicked: bool = false
    for s in GameState.survivors:
        if s["nerve"] <= 0 and s["state"] != "dead":
            any_panicked = true
    $PanicLabel.visible = any_panicked

func _on_phase_changed(phase: int) -> void:
    match phase:
        GameState.Phase.PLAYER: $PhaseLabel.text = "PLAYER PHASE"
        GameState.Phase.NOISE:  $PhaseLabel.text = "NOISE PHASE"
        GameState.Phase.ZOMBIE: $PhaseLabel.text = "ZOMBIE PHASE"
        GameState.Phase.CHECK:  $PhaseLabel.text = "RESOLVING..."

    # Flash the label briefly on phase change
    var tween: Tween = create_tween()
    $PhaseLabel.modulate = Color.YELLOW
    tween.tween_property($PhaseLabel, "modulate", Color.WHITE, 0.5)
```

---

## Step 5: Game Over Overlay

Add `GameOverScreen.tscn` as a child of `UI/CanvasLayer`:

```
GameOverScreen (ColorRect, full screen, semi-transparent black)
└── VBoxContainer (centered)
    ├── Title: "GAME OVER"
    ├── ReasonLabel: "All survivors are dead."
    └── RestartButton: "Try Again"
```

```gdscript
# scripts/ui/GameOverScreen.gd
extends ColorRect

func _ready() -> void:
    visible = false
    SignalBus.game_over.connect(_show_game_over)
    SignalBus.stage_cleared.connect(_show_stage_cleared)
    $VBox/RestartButton.pressed.connect(_restart)

func _show_game_over(reason: String) -> void:
    visible = true
    $VBox/Title.text = "☠ GAME OVER"
    $VBox/Title.modulate = Color(0.9, 0.1, 0.1)
    $VBox/ReasonLabel.text = reason

func _show_stage_cleared() -> void:
    visible = true
    $VBox/Title.text = "✓ STAGE CLEARED"
    $VBox/Title.modulate = Color(0.2, 0.9, 0.3)
    $VBox/ReasonLabel.text = "Survivors escaped!"

func _restart() -> void:
    get_tree().reload_current_scene()
```

---

## Step 6: Visual Feedback — Damage Flash

When a survivor or zombie takes damage, flash them red briefly.

In `Survivor.gd`:
```gdscript
func flash_damage() -> void:
    var tween: Tween = create_tween()
    tween.tween_property($ColorRect, "modulate", Color(1, 0, 0, 1), 0.05)
    tween.tween_property($ColorRect, "modulate", Color(1, 1, 1, 1), 0.2)
```

Add to `SignalBus.gd`:
```gdscript
signal survivor_took_damage(index: int)
signal zombie_took_damage(zombie_id: int)
```

Emit these in `CombatSystem` after applying damage. Connect in `Survivor.gd` and `Zombie.gd`.

---

## Step 7: Survivor Selection — Keyboard Fallback

Add keyboard shortcut `Tab` to cycle between survivors:

```gdscript
# In Main.gd or GameBoard.gd

func _unhandled_input(event: InputEvent) -> void:
    if event.is_action_pressed("ui_focus_next"):  # Tab
        var num_survivors: int = GameState.survivors.size()
        if num_survivors == 0: return
        var next_idx: int = (GameState.selected_survivor_index + 1) % num_survivors
        # Skip dead survivors
        for _i in range(num_survivors):
            if GameState.survivors[next_idx]["state"] != "dead":
                break
            next_idx = (next_idx + 1) % num_survivors
        GameState.selected_survivor_index = next_idx
        SignalBus.survivor_selected.emit(next_idx)

    if event.is_action_pressed("ui_cancel"):  # Escape = cancel mode
        GameState.action_mode = "none"
        GameState.selected_survivor_index = -1
        SignalBus.ui_refresh_requested.emit()
        if get_tree().get_first_node_in_group("game_board"):
            get_tree().get_first_node_in_group("game_board").clear_highlights()
```

---

## Step 8: Tile Info Tooltip

When hovering a tile, show a small tooltip in the bottom-left corner:

```gdscript
# In GameBoard.gd

func _process(_delta: float) -> void:
    var tile: Vector2i = pixel_to_tile(get_local_mouse_position())
    if not Constants.is_valid_tile(tile):
        SignalBus.tile_hovered.emit(Vector2i(-1, -1), "")
        return

    var info_parts: Array[String] = []

    # Terrain type
    var terrain: int = terrain_map.get(tile, Constants.Terrain.FLOOR)
    info_parts.append(Constants.Terrain.keys()[terrain])

    # Zombie on tile
    var z: Dictionary = GameState.get_zombie_at_tile(tile)
    if not z.is_empty():
        info_parts.append("%s  HP:%d  [%s]" % [z["stats"]["name"], z["hp"], z["state"]])

    # Survivor on tile
    var s_idx: int = GameState.get_survivor_at_tile(tile)
    if s_idx >= 0:
        var s: Dictionary = GameState.survivors[s_idx]
        info_parts.append("%s  HP:%d  Nerve:%d" % [s["name"], s["hp"], s["nerve"]])

    # Items on tile
    for item in GameState.get_items_at_tile(tile):
        info_parts.append("📦 " + item["name"])

    SignalBus.tile_hovered.emit(tile, "\n".join(info_parts))
```

Add to `SignalBus.gd`:
```gdscript
signal tile_hovered(tile: Vector2i, info: String)
```

Create a `TileTooltip` label at the bottom of the screen connected to `tile_hovered`.

---

## Phase 6 Checklist

**Mobile Layout**
- [ ] ActionPanel pinned to bottom 210px, never scrolls
- [ ] HUD pinned to top 60px, never scrolls
- [ ] Grid area fills the middle, camera pans independently
- [ ] Survivor tab buttons: tap to switch selected survivor
- [ ] Survivor name + HP shown on tab for quick reference

**Stats**
- [ ] HP and Nerve bars with correct color coding (green/yellow/red)
- [ ] Weight bar (5 slots, filled = red, empty = green)
- [ ] Status tags (BLEEDING, WOUNDED, EXHAUSTED, ADRENALINE) with colors
- [ ] Downed warning with countdown blinks
- [ ] Critical HP warning blinks

**HUD**
- [ ] Turn counter and phase label at top of screen
- [ ] Phase label flashes yellow on phase transition
- [ ] Panic warning shows when any survivor has nerve = 0

**Feedback**
- [ ] Game Over overlay on all survivors dead
- [ ] Stage Cleared overlay when survivors reach exit
- [ ] Damage flash (red) on survivors and zombies

**Input**
- [ ] Tap survivor tab to switch without touching grid
- [ ] Escape/back to cancel action mode
- [ ] Tile hover tooltip (shown at top of action panel on mobile)

---

## Next

[Phase 7: Turn Phases, Win/Lose & Stage 2 →](./phase-7-turns-and-stages.md)
