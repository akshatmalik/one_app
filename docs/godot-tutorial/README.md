# Survivor Deck Builder — Godot 4 Port Tutorial

A complete guide to porting the Survivor Deck Builder from Next.js/React to Godot 4.

## What You're Building

A tactical survival game where 2 survivors navigate zombie-infested maps. The **core tension** is noise — everything you do makes sound, sound wakes zombies, woken zombies cascade-alert each other. It is turn-based, grid-based, and brutally strategic.

**Key systems to port:**
- 14×10 tile grid with terrain types
- Turn phase system (Player → Noise → Zombie → Check)
- 2 survivors with inventory slots = action points
- 5 zombie types with a state machine (Dormant → Alert → Agitated → Grabbing)
- Noise propagation with visual ripples
- Combat: melee, ranged, throws, traps, molotovs
- 2 stages with survivor carry-over

## Why Godot 4

- GDScript reads like Python (you already know it)
- Built-in `TileMap` fits a grid game perfectly
- Scene tree maps cleanly to game objects (each zombie = a scene)
- `Signals` replace React's state callbacks
- Free, ships on all platforms

## Design Pillars

**Mobile-first portrait** — Designed for 390×844 (iPhone-size). The grid scrolls under a panning camera. Action buttons are pinned at the bottom in the thumb zone, always visible. This is what makes it feel like a native mobile game rather than a ported PC game.

**CI/CD from day one** — Every commit triggers a GitHub Actions build. Every push to `main` deploys a live playable HTML5 version to GitHub Pages. You always have a shareable URL to test on your phone.

---

## Phases

| Phase | What You Build | File |
|-------|---------------|------|
| **0** | **CI/CD: GitHub Actions + HTML5 deploy** | [phase-0-cicd.md](./phase-0-cicd.md) |
| 1 | Project setup, portrait grid, scrollable camera | [phase-1-setup-and-grid.md](./phase-1-setup-and-grid.md) |
| 2 | Survivors: movement, selection, action points | [phase-2-survivors.md](./phase-2-survivors.md) |
| 3 | Items, inventory, and the action economy | [phase-3-inventory.md](./phase-3-inventory.md) |
| 4 | Noise system and zombie state machine | [phase-4-noise-and-zombies.md](./phase-4-noise-and-zombies.md) |
| 5 | Combat: melee, ranged, throws, traps | [phase-5-combat.md](./phase-5-combat.md) |
| 6 | UI: pinned mobile action panel, survivor tabs, bars | [phase-6-ui.md](./phase-6-ui.md) |
| 7 | Turn phases, win/lose conditions, stage 2 | [phase-7-turns-and-stages.md](./phase-7-turns-and-stages.md) |
| 8 | Sprites, animations, and visual polish | [phase-8-sprites-and-polish.md](./phase-8-sprites-and-polish.md) |

**Do Phase 0 and Phase 1 together** — set up CI before writing game code so every commit is testable on your phone immediately.

## Concept Mapping (React → Godot)

| React | Godot |
|-------|-------|
| `page.tsx` (game state) | `GameState` autoload singleton |
| `GameGrid.tsx` | `TileMap` + child `Node2D` scenes |
| `SurvivorPanel.tsx` | `CanvasLayer` with `Control` UI |
| `lib/types.ts` interfaces | GDScript `class_name` resources |
| `lib/constants.ts` | `Constants.gd` autoload |
| `lib/grid.ts` BFS/pathfinding | `GridUtils.gd` static helper |
| `lib/combat.ts` | `CombatSystem.gd` autoload |
| `lib/noise.ts` | `NoiseSystem.gd` autoload |
| `lib/zombie-ai.ts` | `ZombieAI.gd` per-zombie or autoload |
| React `useState` | Signals + `GameState` vars |
| React re-render | `update_visuals()` called after state change |

## GDScript Quick Reference (for Python devs)

```gdscript
# Variables (no type needed, but encouraged)
var health: int = 10
var name: String = "Scout"

# Functions
func take_damage(amount: int) -> void:
    health -= amount

# Signals (like React events/callbacks)
signal zombie_agitated(zombie_id: int)
emit_signal("zombie_agitated", z.id)  # or: zombie_agitated.emit(z.id)

# Arrays and Dicts (same as Python lists/dicts)
var inventory: Array[Item] = []
var tile_data: Dictionary = {}

# For loops
for zombie in zombies:
    zombie.act()

# if/match (match = switch)
match zombie.state:
    "dormant": pass
    "alert": move_toward_noise()
    "agitated": chase_survivor()

# Classes
class_name Zombie
extends Node2D

# Autoload singleton access
GameState.survivors[0].health

# Await (like async/await)
await get_tree().create_timer(0.3).timeout
```

## Folder Structure You'll Build

```
survivor_deckbuilder/          ← Godot project root
├── .github/
│   └── workflows/
│       └── export.yml         ← CI/CD: build + deploy on every push
├── export_presets.cfg         ← HTML5 export config (committed to git)
├── project.godot
├── autoloads/
│   ├── GameState.gd           ← Central game state
│   ├── SignalBus.gd           ← Global signals
│   ├── Constants.gd           ← Item defs, zombie stats, stage data
│   ├── GridUtils.gd           ← BFS, pathfinding, vision cone
│   ├── CombatSystem.gd        ← Attack resolution
│   ├── NoiseSystem.gd         ← Noise propagation
│   └── TurnManager.gd         ← Phase sequencing
├── scenes/
│   ├── Main.tscn              ← Root scene
│   ├── game/
│   │   ├── GameBoard.tscn     ← TileMap + everything on the grid
│   │   ├── Survivor.tscn      ← Survivor node (sprite + script)
│   │   ├── Zombie.tscn        ← Zombie node (sprite + script)
│   │   ├── Item.tscn          ← Loot on ground
│   │   └── NoiseRipple.tscn   ← Expanding circle effect
│   └── ui/
│       ├── ActionPanel.tscn   ← Pinned bottom panel (stats + inventory + buttons)
│       ├── HUD.tscn           ← Pinned top bar (turn, phase)
│       └── GameOverScreen.tscn
├── scripts/
│   ├── game/
│   │   ├── Survivor.gd
│   │   ├── Zombie.gd
│   │   ├── Item.gd
│   │   ├── GridCamera.gd      ← touch pan + follow survivor + bounds clamping
│   │   └── NoiseRipple.gd
│   └── ui/
│       ├── ActionPanel.gd     ← pinned bottom panel: stats + inventory + actions
│       └── HUD.gd             ← pinned top bar
├── assets/
│   ├── sprites/
│   │   ├── survivors/
│   │   ├── zombies/
│   │   ├── items/
│   │   └── terrain/
│   ├── tilesets/
│   └── sounds/
└── resources/
    ├── SurvivorData.gd        ← Resource class for survivor type data
    ├── ZombieData.gd          ← Resource class for zombie type data
    └── ItemData.gd            ← Resource class for item definitions
```
