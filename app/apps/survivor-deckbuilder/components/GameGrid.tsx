'use client';

import { Survivor, Zombie, LootItem, TerrainTile, ContainerTile, NoiseRipple } from '../lib/types';
import { GRID_W, GRID_H, TILE, OBSTACLES, DOOR_TILES, EXIT_DOOR, ZOMBIE_TYPES } from '../lib/constants';
import { isObstacle, getVisionCone } from '../lib/grid';

interface GameGridProps {
  survivors: Survivor[];
  zombies: Zombie[];
  loot: LootItem[];
  terrain: TerrainTile[];
  containers: ContainerTile[];
  selectedSurvivor: number | null;
  reachableTiles: Map<string, number>;
  attackTargets: number[];
  rangedTargets: number[];
  throwTargets: Set<string>;
  knockbackPreview: Map<string, "clear" | "blocked" | "collision">;
  noiseRipples: NoiseRipple[];
  showVisionCones: boolean;
  focusMode: boolean;
  onTileClick: (x: number, y: number) => void;
}

export default function GameGrid({
  survivors, zombies, loot, terrain, containers,
  selectedSurvivor, reachableTiles, attackTargets, rangedTargets, throwTargets,
  knockbackPreview, noiseRipples, showVisionCones, focusMode, onTileClick,
}: GameGridProps) {
  const selS = survivors.find(s => s.id === selectedSurvivor);

  // Collect all zombie vision cones for overlay
  const visionTiles = new Set<string>();
  if (showVisionCones) {
    zombies.filter(z => z.hp > 0 && z.state !== "dead").forEach(z => {
      const cone = getVisionCone(z);
      cone.forEach(k => visionTiles.add(k));
    });
  }

  const terrainMap = new Map<string, TerrainTile>();
  terrain.forEach(t => terrainMap.set(`${t.x},${t.y}`, t));

  const containerMap = new Map<string, ContainerTile>();
  containers.forEach(c => containerMap.set(`${c.x},${c.y}`, c));

  const lootMap = new Map<string, LootItem>();
  loot.forEach(l => lootMap.set(`${l.x},${l.y}`, l));

  // Facing arrow characters
  const facingArrow: Record<string, string> = { N: "^", S: "v", E: ">", W: "<" };

  // Zombie type colors
  const zombieColors: Record<string, Record<string, string>> = {
    shambler: { dormant: "#555", alert: "#886622", agitated: "#c44", grabbing: "#f66" },
    crawler:  { dormant: "#445544", alert: "#668833", agitated: "#88aa33", grabbing: "#aacc44" },
    bloater:  { dormant: "#554455", alert: "#885588", agitated: "#aa44aa", grabbing: "#cc66cc" },
    screamer: { dormant: "#555522", alert: "#888833", agitated: "#cccc22", grabbing: "#cccc22" },
    brute:    { dormant: "#664422", alert: "#886633", agitated: "#aa4422", grabbing: "#cc6644" },
  };

  return (
    <div style={{
      width: GRID_W * TILE, height: GRID_H * TILE, position: "relative",
      background: "#2a2a2a", margin: "4px 0"
    }}>
      {/* Floor tiles */}
      {Array.from({ length: GRID_H }, (_, y) =>
        Array.from({ length: GRID_W }, (_, x) => {
          const key = `${x},${y}`;
          const isObs = isObstacle(x, y);
          const isDoor = DOOR_TILES.has(key);
          const isExit = x === EXIT_DOOR.x && y === EXIT_DOOR.y;
          const isReachable = reachableTiles.has(key) && (reachableTiles.get(key) ?? 0) > 0;
          const isThrowable = throwTargets.has(key);
          const isVision = visionTiles.has(key);
          const kbStatus = knockbackPreview.get(key);
          const ter = terrainMap.get(key);
          const cont = containerMap.get(key);
          const lootHere = lootMap.get(key);

          let bg = "#3a3a3a";
          let border = "1px solid #2a2a2a";

          if (ter) {
            switch (ter.type) {
              case "glass": bg = "#3a4a5a"; border = "1px solid #4a6a8a"; break;
              case "metal": bg = "#4a4a4a"; border = "1px solid #6a6a6a"; break;
              case "puddle": bg = "#2a3a4a"; border = "1px solid #3a5a7a"; break;
              case "trap":
                if (ter.triggered) {
                  bg = "#2a2a2a"; border = "1px dashed #444";
                } else if (ter.trapType === "nail") {
                  bg = "#3a2a1a"; border = "1px solid #8a5a2a";
                } else {
                  bg = "#1a2a1a"; border = "1px solid #3a6a3a";
                }
                break;
            }
          }
          if (isObs) { bg = "#5a4a2a"; border = "1px solid #6a5a3a"; }
          if (cont && !cont.searched) { bg = "#4a3a2a"; border = "1px solid #7a5a3a"; }
          if (isDoor) { bg = "#2a4a2a"; border = "1px solid #3a6a3a"; }
          if (isExit) { bg = "#2a2a4a"; border = "1px solid #4a4a8a"; }
          if (isReachable && !isObs) { bg = "#2a3a2a"; border = "1px solid #4a7a4a"; }
          if (isThrowable) { bg = "#3a3a1a"; border = "1px solid #7a7a3a"; }

          return (
            <div
              key={key}
              onClick={() => !isObs && onTileClick(x, y)}
              style={{
                position: "absolute",
                left: x * TILE, top: (GRID_H - 1 - y) * TILE,
                width: TILE - 2, height: TILE - 2,
                background: bg, border,
                cursor: isObs ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, color: "#555", boxSizing: "content-box",
              }}
            >
              {/* Vision cone overlay */}
              {isVision && !isObs && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: "rgba(255,50,50,0.08)",
                  pointerEvents: "none",
                }} />
              )}
              {/* Knockback landing preview */}
              {kbStatus && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: kbStatus === "clear" ? "rgba(80,220,80,0.25)" :
                              kbStatus === "collision" ? "rgba(255,200,50,0.3)" :
                              "rgba(220,60,60,0.25)",
                  border: `1px solid ${kbStatus === "clear" ? "#4e4" : kbStatus === "collision" ? "#fc0" : "#c44"}`,
                  pointerEvents: "none", zIndex: 2,
                }} />
              )}
              {/* Focus mode dim — darken tiles outside reach (not the selected survivor's current tile) */}
              {focusMode && !isReachable && !isObs && !(selS && selS.x === x && selS.y === y) && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: "rgba(0,0,0,0.45)",
                  pointerEvents: "none",
                  zIndex: 1,
                }} />
              )}
              {isObs && !cont && <span style={{ fontSize: 16 }}>&#9642;</span>}
              {isDoor && <span style={{ fontSize: 10, color: "#6a6" }}>DOOR</span>}
              {isExit && <span style={{ fontSize: 8, color: "#88f" }}>EXIT</span>}
              {cont && !cont.searched && <span style={{ fontSize: 10, color: "#c96" }}>?</span>}
              {cont && cont.searched && <span style={{ fontSize: 10, color: "#555" }}>-</span>}
              {ter && !isObs && ter.type !== "trap" && (
                <span style={{
                  position: "absolute", bottom: 1, right: 2, fontSize: 7,
                  color: ter.type === "glass" ? "#6af" : ter.type === "metal" ? "#999" : "#48a",
                  pointerEvents: "none",
                }}>
                  {ter.type === "glass" ? "***" : ter.type === "metal" ? "===" : "~~~"}
                </span>
              )}
              {ter && ter.type === "trap" && !ter.triggered && (
                <span style={{
                  position: "absolute", fontSize: 13,
                  color: ter.trapType === "nail" ? "#c84" : "#6c6",
                  pointerEvents: "none",
                  filter: "drop-shadow(0 0 3px currentColor)",
                }}>
                  {ter.trapType === "nail" ? "⊞" : "⌇"}
                </span>
              )}
              {ter && ter.type === "trap" && ter.triggered && (
                <span style={{
                  position: "absolute", fontSize: 8, color: "#555",
                  pointerEvents: "none",
                }}>✓</span>
              )}
              {/* Loot on ground */}
              {lootHere && (
                <div style={{
                  position: "absolute", bottom: 1, left: "50%",
                  transform: "translateX(-50%)",
                  background: lootHere.item.type === "weapon" ? "rgba(180,60,60,0.92)" :
                               lootHere.item.type === "distraction" ? "rgba(170,150,30,0.92)" : "rgba(50,150,60,0.92)",
                  border: `1px solid ${lootHere.item.type === "weapon" ? "#f88" : lootHere.item.type === "distraction" ? "#ee8" : "#8f8"}`,
                  borderRadius: 2, padding: "0px 3px",
                  fontSize: 7, color: "#fff", fontWeight: "bold",
                  pointerEvents: "none", whiteSpace: "nowrap",
                  maxWidth: TILE - 6, overflow: "hidden", textOverflow: "ellipsis",
                  animation: "loot-pulse 2s ease-in-out infinite",
                  zIndex: 2,
                }}>
                  {lootHere.item.name}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Noise ripples */}
      {noiseRipples.map(r => (
        <div key={r.id} style={{
          position: "absolute",
          left: r.x * TILE + TILE / 2 - r.radius * TILE,
          top: (GRID_H - 1 - r.y) * TILE + TILE / 2 - r.radius * TILE,
          width: r.radius * 2 * TILE, height: r.radius * 2 * TILE,
          border: `2px solid ${
            r.intensity >= 3 ? "rgba(255,80,50,0.6)" :
            r.intensity >= 2 ? "rgba(255,200,50,0.5)" :
            "rgba(100,180,255,0.4)"
          }`,
          borderRadius: "50%", pointerEvents: "none",
          animation: "ripple 1s ease-out forwards",
        }} />
      ))}

      {/* Zombies */}
      {zombies.filter(z => z.hp > 0).map(z => {
        const isTarget = attackTargets.includes(z.id) || rangedTargets.includes(z.id);
        const typeColors = zombieColors[z.type] || zombieColors.shambler;
        const color = typeColors[z.state] || typeColors.dormant;
        const typeInfo = ZOMBIE_TYPES[z.type];

        return (
          <div
            key={`z${z.id}`}
            onClick={() => isTarget && onTileClick(z.x, z.y)}
            style={{
              position: "absolute",
              left: z.x * TILE + 4, top: (GRID_H - 1 - z.y) * TILE + 4,
              width: TILE - 10, height: TILE - 10,
              background: color,
              border: isTarget ? "2px solid #ff0" : "2px solid #400",
              borderRadius: z.type === "crawler" ? 2 : 4,
              cursor: isTarget ? "pointer" : "default",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              fontSize: 10, color: "#fff", fontWeight: "bold",
              transition: "left 0.15s, top 0.15s",
              boxShadow: z.state === "agitated" ? "0 0 8px #c44" :
                         z.state === "alert" ? "0 0 6px #aa8822" : "none",
              opacity: z.type === "crawler" ? 0.85 : 1,
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>{typeInfo?.emoji || "Z"}</span>
            <span style={{ fontSize: 7 }}>{z.hp}/{z.maxHp}</span>

            {/* Facing indicator */}
            {z.state !== "dead" && (
              <span style={{
                position: "absolute", fontSize: 10,
                color: z.state === "dormant" ? "#888" : z.state === "alert" ? "#cc8" : "#f88",
                ...(z.facing === "N" ? { top: -12 } :
                    z.facing === "S" ? { bottom: -12 } :
                    z.facing === "E" ? { right: -8, top: "50%", transform: "translateY(-50%)" } :
                    { left: -8, top: "50%", transform: "translateY(-50%)" }),
                pointerEvents: "none",
              }}>
                {facingArrow[z.facing]}
              </span>
            )}

            {/* State indicator */}
            {z.state === "agitated" && (
              <span style={{ position: "absolute", top: -14, fontSize: 12, color: "#ff0" }}>!</span>
            )}
            {z.state === "alert" && (
              <span style={{ position: "absolute", top: -14, fontSize: 10, color: "#cc8" }}>?</span>
            )}
            {z.state === "grabbing" && (
              <span style={{ position: "absolute", top: -14, fontSize: 9, color: "#f66" }}>GRAB</span>
            )}
            {z.staggered && (
              <span style={{ position: "absolute", bottom: -14, fontSize: 9, color: "#fc0" }}>STGR</span>
            )}
          </div>
        );
      })}

      {/* Survivors */}
      {survivors.filter(s => s.state !== "dead").map(s => {
        const isSelected = selectedSurvivor === s.id;
        const isGrabbed = s.state === "grabbed";
        const isDowned = s.state === "downed";
        const lowNerve = s.nerve <= 3;
        const panicked = s.nerve <= 0;

        return (
          <div
            key={`s${s.id}`}
            onClick={() => onTileClick(s.x, s.y)}
            style={{
              position: "absolute",
              left: s.x * TILE + 4, top: (GRID_H - 1 - s.y) * TILE + 4,
              width: TILE - 10, height: TILE - 10,
              background: isDowned ? "#2a1500" :
                          panicked ? "#8a2a2a" :
                          isGrabbed ? "#a86a20" :
                          lowNerve ? "#5a4a2a" :
                          (s.id === 0 ? "#2a6a2a" : "#2a4a8a"),
              border: isDowned ? "2px solid #cc4400" :
                      isSelected ? "2px solid #fff" : "2px solid #040",
              borderRadius: "50%", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              fontSize: 10, color: isDowned ? "#ff7733" : "#fff", fontWeight: "bold",
              transition: "left 0.15s, top 0.15s",
              opacity: isDowned ? 0.85 : (!isSelected && focusMode ? 0.55 : 1),
              boxShadow: isDowned ? "0 0 10px rgba(200,60,0,0.7)" :
                         isSelected ? "0 0 14px rgba(255,255,255,0.6)" : "none",
              zIndex: 10,
              animation: panicked && !isDowned ? "panic-pulse 0.5s infinite" : undefined,
            }}
          >
            <span style={{ fontSize: 9 }}>{isDowned ? "☠" : s.name[0]}</span>
            <span style={{ fontSize: 7 }}>{isDowned ? `${s.downedTurns}T` : `${s.hp}/${s.maxHp}`}</span>

            {/* Overwatch indicator */}
            {s.overwatching && (
              <span style={{
                position: "absolute", top: -14, fontSize: 10, color: "#4af",
              }}>&#9678;</span>
            )}

            {/* Status effects */}
            {s.statusEffects.includes("bleeding") && (
              <span style={{
                position: "absolute", bottom: -10, left: 2, fontSize: 8, color: "#f44",
              }}>&#9676;</span>
            )}
            {s.statusEffects.includes("adrenaline") && (
              <span style={{
                position: "absolute", bottom: -10, right: 2, fontSize: 8, color: "#ff0",
              }}>&#9889;</span>
            )}
            {s.statusEffects.includes("exhausted") && (
              <span style={{
                position: "absolute", top: -14, right: 2, fontSize: 8, color: "#88f",
              }}>💤</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
