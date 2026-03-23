'use client';

import { useState, useCallback, useEffect, useRef } from "react";

const GRID_W = 14;
const GRID_H = 10;
const TILE = 52;

// Obstacle map: 1 = obstacle
const OBSTACLES = new Set([
  // Serving counter (row 9)
  "3,9","4,9","5,9","6,9","7,9","8,9",
  // Shelf (row 8)
  "11,8","12,8",
  // Table row upper (rows 6-7)
  "1,7","1,6","4,7","4,6","7,7","7,6","10,7","10,6",
  // Table row lower (rows 3-4)
  "1,4","1,3","4,4","4,3","7,4","7,3",
  // Food cart
  "12,4",
]);

const DOOR_TILES = new Set(["3,0","10,0"]);

const isObstacle = (x, y) => OBSTACLES.has(`${x},${y}`);
const inBounds = (x, y) => x >= 0 && x < GRID_W && y >= 0 && y < GRID_H;
const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function bfsReachable(start, maxSteps, blockedSet) {
  const reachable = new Map();
  const queue = [{ ...start, steps: 0 }];
  const visited = new Set([`${start.x},${start.y}`]);
  while (queue.length > 0) {
    const cur = queue.shift();
    reachable.set(`${cur.x},${cur.y}`, cur.steps);
    if (cur.steps >= maxSteps) continue;
    for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const nx = cur.x + dx, ny = cur.y + dy;
      const key = `${nx},${ny}`;
      if (!visited.has(key) && inBounds(nx, ny) && !isObstacle(nx, ny) && !blockedSet.has(key)) {
        visited.add(key);
        queue.push({ x: nx, y: ny, steps: cur.steps + 1 });
      }
    }
  }
  return reachable;
}

function bfsPath(start, end, blockedSet) {
  const queue = [{ ...start, path: [start] }];
  const visited = new Set([`${start.x},${start.y}`]);
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.x === end.x && cur.y === end.y) return cur.path;
    for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const nx = cur.x + dx, ny = cur.y + dy;
      const key = `${nx},${ny}`;
      if (!visited.has(key) && inBounds(nx, ny) && !isObstacle(nx, ny) && !blockedSet.has(key)) {
        visited.add(key);
        queue.push({ x: nx, y: ny, path: [...cur.path, { x: nx, y: ny }] });
      }
    }
  }
  return null;
}

function zombieMoveToward(zombie, target, blockedSet) {
  let best = null;
  let bestDist = Infinity;
  for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
    const nx = zombie.x + dx, ny = zombie.y + dy;
    const key = `${nx},${ny}`;
    if (inBounds(nx, ny) && !isObstacle(nx, ny) && !blockedSet.has(key)) {
      const d = manhattan({ x: nx, y: ny }, target);
      if (d < bestDist) { bestDist = d; best = { x: nx, y: ny }; }
    }
  }
  return best;
}

const initSurvivors = () => [
  { id: 0, name: "Scout", x: 3, y: 1, hp: 10, maxHp: 10, totalSlots: 4,
    inventory: [{ name: "Knife", damage: 1, noiseRadius: 1, durability: 99, type: "weapon" }],
    actionsUsed: 0, state: "active" },
  { id: 1, name: "Fighter", x: 10, y: 1, hp: 10, maxHp: 10, totalSlots: 4,
    inventory: [
      { name: "Bat", damage: 2, noiseRadius: 2, durability: 6, type: "weapon" },
      { name: "Bandage", heal: 3, noiseRadius: 1, type: "consumable" }
    ],
    actionsUsed: 0, state: "active" },
];

const initZombies = () => [
  { id: 0, x: 5, y: 8, hp: 3, maxHp: 3, state: "dormant", grabTarget: null, patrolPath: null },
  { id: 1, x: 8, y: 8, hp: 3, maxHp: 3, state: "dormant", grabTarget: null, patrolPath: null },
  { id: 2, x: 6, y: 5, hp: 3, maxHp: 3, state: "dormant", grabTarget: null,
    patrolPath: [{x:6,y:5},{x:7,y:5},{x:8,y:5},{x:9,y:5},{x:8,y:5},{x:7,y:5}], patrolIdx: 0 },
  { id: 3, x: 2, y: 6, hp: 3, maxHp: 3, state: "dormant", grabTarget: null, patrolPath: null },
  { id: 4, x: 11, y: 7, hp: 3, maxHp: 3, state: "dormant", grabTarget: null, patrolPath: null },
];

const PHASE = { PLAYER: "player", NOISE: "noise", ZOMBIE: "zombie", GAMEOVER: "gameover", WIN: "win" };

export default function DeadWeightPrototype() {
  const [survivors, setSurvivors] = useState(initSurvivors);
  const [zombies, setZombies] = useState(initZombies);
  const [phase, setPhase] = useState(PHASE.PLAYER);
  const [selectedSurvivor, setSelectedSurvivor] = useState(null);
  const [reachableTiles, setReachableTiles] = useState(new Map());
  const [attackTargets, setAttackTargets] = useState([]);
  const [noiseEvents, setNoiseEvents] = useState([]);
  const [noiseRipples, setNoiseRipples] = useState([]);
  const [messages, setMessages] = useState(["Your turn. Tap a survivor to select."]);
  const [turn, setTurn] = useState(1);
  const [compoundIntegrity, setCompoundIntegrity] = useState(10);
  const gridRef = useRef(null);

  const addMsg = useCallback((msg) => {
    setMessages(prev => [msg, ...prev].slice(0, 6));
  }, []);

  const getBlockedSet = useCallback((excludeSurvivorId = -1) => {
    const blocked = new Set();
    survivors.forEach(s => { if (s.id !== excludeSurvivorId && s.state !== "dead") blocked.add(`${s.x},${s.y}`); });
    zombies.forEach(z => { if (z.hp > 0) blocked.add(`${z.x},${z.y}`); });
    return blocked;
  }, [survivors, zombies]);

  const freeSlots = (s) => s.totalSlots - s.inventory.length;
  const actionsLeft = (s) => freeSlots(s) - s.actionsUsed;

  const selectSurvivor = useCallback((sid) => {
    if (phase !== PHASE.PLAYER) return;
    const s = survivors.find(sv => sv.id === sid);
    if (!s || s.state === "dead") return;
    setSelectedSurvivor(sid);
    const remaining = actionsLeft(s);
    const blocked = getBlockedSet(sid);
    const reach = bfsReachable({ x: s.x, y: s.y }, remaining, blocked);
    setReachableTiles(reach);
    const targets = zombies.filter(z => z.hp > 0 && manhattan(s, z) === 1);
    setAttackTargets(targets.map(z => z.id));
  }, [phase, survivors, zombies, getBlockedSet]);

  const moveSurvivor = useCallback((tx, ty) => {
    if (selectedSurvivor === null || phase !== PHASE.PLAYER) return;
    const key = `${tx},${ty}`;
    if (!reachableTiles.has(key)) return;
    const cost = reachableTiles.get(key);
    if (cost === 0) return;

    setSurvivors(prev => prev.map(s => {
      if (s.id !== selectedSurvivor) return s;
      const newS = { ...s, x: tx, y: ty, actionsUsed: s.actionsUsed + cost };
      return newS;
    }));

    setTimeout(() => selectSurvivor(selectedSurvivor), 50);
  }, [selectedSurvivor, phase, reachableTiles, selectSurvivor]);

  const attackZombie = useCallback((zid) => {
    if (selectedSurvivor === null || phase !== PHASE.PLAYER) return;
    const s = survivors.find(sv => sv.id === selectedSurvivor);
    if (!s || actionsLeft(s) <= 0) return;
    const weapon = s.inventory.find(i => i.type === "weapon");
    if (!weapon) { addMsg("No weapon!"); return; }
    const z = zombies.find(zz => zz.id === zid);
    if (!z || z.hp <= 0 || manhattan(s, z) !== 1) return;

    const damage = weapon.damage;
    const noiseR = weapon.noiseRadius;
    const newHp = z.hp - damage;
    const killed = newHp <= 0;

    setZombies(prev => prev.map(zz => {
      if (zz.id !== zid) return zz;
      if (killed) {
        if (zz.grabTarget !== null) {
          setSurvivors(sp => sp.map(ss => ss.id === zz.grabTarget ? { ...ss, state: "active" } : ss));
        }
        return { ...zz, hp: 0, state: "dead", grabTarget: null };
      }
      return { ...zz, hp: newHp };
    }));

    const newDur = weapon.durability - 1;
    const weaponBroke = newDur <= 0;

    setSurvivors(prev => prev.map(ss => {
      if (ss.id !== selectedSurvivor) return ss;
      let newInv = ss.inventory.map(i => {
        if (i === weapon) return { ...i, durability: newDur };
        return i;
      });
      if (weaponBroke) {
        newInv = ss.inventory.filter(i => i !== weapon);
      }
      return { ...ss, actionsUsed: ss.actionsUsed + 1, inventory: newInv };
    }));

    setNoiseEvents(prev => [...prev, { x: s.x, y: s.y, radius: noiseR }]);
    setNoiseRipples(prev => [...prev, { x: s.x, y: s.y, radius: noiseR, id: Date.now() }]);

    let msg = `${s.name} hits zombie for ${damage}!`;
    if (killed) msg += " Zombie killed!";
    if (weaponBroke) msg += ` ${weapon.name} broke!`;
    addMsg(msg);

    setTimeout(() => selectSurvivor(selectedSurvivor), 50);
  }, [selectedSurvivor, phase, survivors, zombies, addMsg, selectSurvivor]);

  const useBandage = useCallback(() => {
    if (selectedSurvivor === null || phase !== PHASE.PLAYER) return;
    const s = survivors.find(sv => sv.id === selectedSurvivor);
    if (!s || actionsLeft(s) <= 0) return;
    const bandage = s.inventory.find(i => i.type === "consumable" && i.name === "Bandage");
    if (!bandage) return;
    const healed = Math.min(s.maxHp, s.hp + bandage.heal);
    setSurvivors(prev => prev.map(ss => {
      if (ss.id !== selectedSurvivor) return ss;
      return { ...ss, hp: healed, actionsUsed: ss.actionsUsed + 1, inventory: ss.inventory.filter(i => i !== bandage) };
    }));
    setNoiseEvents(prev => [...prev, { x: s.x, y: s.y, radius: bandage.noiseRadius }]);
    addMsg(`${s.name} used bandage. Healed to ${healed} HP.`);
    setTimeout(() => selectSurvivor(selectedSurvivor), 50);
  }, [selectedSurvivor, phase, survivors, addMsg, selectSurvivor]);

  const breakFree = useCallback(() => {
    if (selectedSurvivor === null || phase !== PHASE.PLAYER) return;
    const s = survivors.find(sv => sv.id === selectedSurvivor);
    if (!s || s.state !== "grabbed" || actionsLeft(s) <= 0) return;
    setSurvivors(prev => prev.map(ss => {
      if (ss.id !== selectedSurvivor) return ss;
      return { ...ss, state: "active", actionsUsed: ss.actionsUsed + 1 };
    }));
    setZombies(prev => prev.map(z => z.grabTarget === selectedSurvivor ? { ...z, state: "agitated", grabTarget: null } : z));
    setNoiseEvents(prev => [...prev, { x: s.x, y: s.y, radius: 1 }]);
    addMsg(`${s.name} broke free!`);
    setTimeout(() => selectSurvivor(selectedSurvivor), 50);
  }, [selectedSurvivor, phase, survivors, addMsg, selectSurvivor]);

  const endPlayerPhase = useCallback(() => {
    if (phase !== PHASE.PLAYER) return;
    setSelectedSurvivor(null);
    setReachableTiles(new Map());
    setAttackTargets([]);
    setPhase(PHASE.NOISE);
  }, [phase]);

  // Noise resolution
  useEffect(() => {
    if (phase !== PHASE.NOISE) return;
    const timer = setTimeout(() => {
      let events = [...noiseEvents];
      let newZombies = zombies.map(z => ({ ...z }));
      let changed = true;
      let iterations = 0;
      while (changed && iterations < 20) {
        changed = false;
        iterations++;
        for (const evt of events) {
          for (let i = 0; i < newZombies.length; i++) {
            const z = newZombies[i];
            if (z.state === "dormant" && z.hp > 0) {
              const dist = manhattan(evt, z);
              if (dist <= evt.radius) {
                newZombies[i] = { ...z, state: "agitated" };
                events.push({ x: z.x, y: z.y, radius: 2 });
                setNoiseRipples(prev => [...prev, { x: z.x, y: z.y, radius: 2, id: Date.now() + i }]);
                changed = true;
                addMsg(`Zombie at (${z.x},${z.y}) wakes up!`);
              }
            }
          }
        }
      }
      setZombies(newZombies);
      setNoiseEvents([]);
      setPhase(PHASE.ZOMBIE);
    }, 400);
    return () => clearTimeout(timer);
  }, [phase, noiseEvents, zombies, addMsg]);

  // Zombie phase
  useEffect(() => {
    if (phase !== PHASE.ZOMBIE) return;
    const timer = setTimeout(() => {
      let newZombies = zombies.map(z => ({ ...z }));
      let newSurvivors = survivors.map(s => ({ ...s }));

      for (let i = 0; i < newZombies.length; i++) {
        const z = newZombies[i];
        if (z.hp <= 0) continue;

        if (z.state === "grabbing") {
          const target = newSurvivors.find(s => s.id === z.grabTarget);
          if (target && target.state !== "dead") {
            target.hp -= 2;
            addMsg(`Zombie deals 2 damage to ${target.name}! (${target.hp} HP)`);
            if (target.hp <= 0) {
              target.state = "dead";
              addMsg(`${target.name} is down!`);
              newZombies[i] = { ...z, state: "agitated", grabTarget: null };
            }
          }
          continue;
        }

        if (z.state === "dormant" && z.patrolPath) {
          const nextIdx = ((z.patrolIdx || 0) + 1) % z.patrolPath.length;
          const next = z.patrolPath[nextIdx];
          const blocked = new Set();
          newSurvivors.forEach(s => { if (s.state !== "dead") blocked.add(`${s.x},${s.y}`); });
          newZombies.forEach((zz, j) => { if (j !== i && zz.hp > 0) blocked.add(`${zz.x},${zz.y}`); });
          if (!blocked.has(`${next.x},${next.y}`)) {
            newZombies[i] = { ...z, x: next.x, y: next.y, patrolIdx: nextIdx };
          }
          continue;
        }

        if (z.state === "agitated") {
          const aliveSurvivors = newSurvivors.filter(s => s.state !== "dead");
          if (aliveSurvivors.length === 0) continue;
          let closest = aliveSurvivors[0];
          let closestDist = manhattan(z, closest);
          for (const s of aliveSurvivors) {
            const d = manhattan(z, s);
            if (d < closestDist) { closest = s; closestDist = d; }
          }

          if (closestDist === 1) {
            newZombies[i] = { ...z, state: "grabbing", grabTarget: closest.id };
            const t = newSurvivors.find(s => s.id === closest.id);
            if (t) t.state = "grabbed";
            addMsg(`Zombie grabs ${closest.name}!`);
          } else {
            const blocked = new Set();
            newSurvivors.forEach(s => { if (s.state !== "dead") blocked.add(`${s.x},${s.y}`); });
            newZombies.forEach((zz, j) => { if (j !== i && zz.hp > 0) blocked.add(`${zz.x},${zz.y}`); });
            const next = zombieMoveToward(z, closest, blocked);
            if (next) newZombies[i] = { ...z, x: next.x, y: next.y };
          }
        }
      }

      setZombies(newZombies);
      setSurvivors(newSurvivors);

      const aliveS = newSurvivors.filter(s => s.state !== "dead");
      const aliveZ = newZombies.filter(z => z.hp > 0);
      if (aliveS.length === 0) {
        setPhase(PHASE.GAMEOVER);
        addMsg("All survivors down. Game over.");
        return;
      }
      if (aliveZ.length === 0) {
        setPhase(PHASE.WIN);
        addMsg("All zombies cleared! Room secure.");
        return;
      }

      setSurvivors(prev => prev.map(s => s.state !== "dead" ? { ...s, actionsUsed: 0 } : s));
      setTurn(t => t + 1);
      setPhase(PHASE.PLAYER);
      addMsg("Your turn.");
    }, 600);
    return () => clearTimeout(timer);
  }, [phase, zombies, survivors, addMsg]);

  // Clear ripples after animation
  useEffect(() => {
    if (noiseRipples.length === 0) return;
    const timer = setTimeout(() => setNoiseRipples([]), 1500);
    return () => clearTimeout(timer);
  }, [noiseRipples]);

  const handleTileClick = useCallback((tx, ty) => {
    if (phase !== PHASE.PLAYER) return;

    // Check if clicking a survivor
    const clickedSurvivor = survivors.find(s => s.x === tx && s.y === ty && s.state !== "dead");
    if (clickedSurvivor) {
      selectSurvivor(clickedSurvivor.id);
      return;
    }

    // Check if clicking a zombie to attack
    const clickedZombie = zombies.find(z => z.x === tx && z.y === ty && z.hp > 0);
    if (clickedZombie && attackTargets.includes(clickedZombie.id)) {
      attackZombie(clickedZombie.id);
      return;
    }

    // Otherwise try to move
    if (selectedSurvivor !== null) {
      moveSurvivor(tx, ty);
    }
  }, [phase, survivors, zombies, selectedSurvivor, attackTargets, selectSurvivor, attackZombie, moveSurvivor]);

  const restart = () => {
    setSurvivors(initSurvivors());
    setZombies(initZombies());
    setPhase(PHASE.PLAYER);
    setSelectedSurvivor(null);
    setReachableTiles(new Map());
    setAttackTargets([]);
    setNoiseEvents([]);
    setNoiseRipples([]);
    setMessages(["Your turn. Tap a survivor to select."]);
    setTurn(1);
    setCompoundIntegrity(10);
  };

  const selS = survivors.find(s => s.id === selectedSurvivor);

  return (
    <div style={{
      width: "100%", maxWidth: 540, margin: "0 auto", height: "100vh",
      display: "flex", flexDirection: "column",
      background: "#1a1a1a", color: "#e0e0e0", fontFamily: "'Courier New', monospace",
      overflow: "hidden", userSelect: "none"
    }}>
      {/* Header */}
      <div style={{
        padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: "1px solid #333", background: "#111", flexShrink: 0
      }}>
        <span style={{ fontSize: 14, fontWeight: "bold", color: "#c44" }}>DEAD WEIGHT</span>
        <span style={{ fontSize: 12, color: "#888" }}>Turn {turn}</span>
        <span style={{ fontSize: 12, color: compoundIntegrity > 5 ? "#6a6" : "#c44" }}>
          Integrity: {compoundIntegrity}
        </span>
      </div>

      {/* Phase indicator */}
      <div style={{
        padding: "4px 12px", textAlign: "center", fontSize: 13, flexShrink: 0,
        background: phase === PHASE.PLAYER ? "#1a2a1a" : phase === PHASE.ZOMBIE ? "#2a1a1a" : "#1a1a2a",
        color: phase === PHASE.PLAYER ? "#6a6" : phase === PHASE.ZOMBIE ? "#c44" : "#88f",
        fontWeight: "bold"
      }}>
        {phase === PHASE.PLAYER && "YOUR TURN"}
        {phase === PHASE.NOISE && "NOISE RESOLVING..."}
        {phase === PHASE.ZOMBIE && "ZOMBIE PHASE..."}
        {phase === PHASE.GAMEOVER && "GAME OVER"}
        {phase === PHASE.WIN && "ROOM CLEARED!"}
      </div>

      {/* Grid */}
      <div ref={gridRef} style={{
        flex: "1 1 auto", overflowX: "auto", overflowY: "hidden",
        WebkitOverflowScrolling: "touch", minHeight: 0
      }}>
        <div style={{
          width: GRID_W * TILE, height: GRID_H * TILE, position: "relative",
          background: "#2a2a2a", margin: "4px 0"
        }}>
          {/* Floor tiles */}
          {Array.from({ length: GRID_H }, (_, y) =>
            Array.from({ length: GRID_W }, (_, x) => {
              const isObs = isObstacle(x, y);
              const isDoor = DOOR_TILES.has(`${x},${y}`);
              const key = `${x},${y}`;
              const isReachable = reachableTiles.has(key) && reachableTiles.get(key) > 0;
              const isSelected = selS && selS.x === x && selS.y === y;

              let bg = "#3a3a3a";
              let border = "1px solid #2a2a2a";
              if (isObs) { bg = "#5a4a2a"; border = "1px solid #6a5a3a"; }
              if (isDoor) { bg = "#2a4a2a"; border = "1px solid #3a6a3a"; }
              if (isReachable && !isObs) { bg = "#2a3a2a"; border = "1px solid #4a7a4a"; }

              return (
                <div
                  key={key}
                  onClick={() => !isObs && handleTileClick(x, y)}
                  style={{
                    position: "absolute",
                    left: x * TILE, top: (GRID_H - 1 - y) * TILE,
                    width: TILE - 2, height: TILE - 2,
                    background: bg, border,
                    cursor: isObs ? "default" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, color: "#555", boxSizing: "content-box"
                  }}
                >
                  {isObs && <span style={{ fontSize: 16 }}>▪</span>}
                  {isDoor && <span style={{ fontSize: 10, color: "#6a6" }}>DOOR</span>}
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
              border: `2px solid ${r.radius <= 1 ? "rgba(100,180,255,0.5)" : "rgba(255,200,50,0.5)"}`,
              borderRadius: "50%", pointerEvents: "none",
              animation: "ripple 1s ease-out forwards"
            }} />
          ))}

          {/* Zombies */}
          {zombies.filter(z => z.hp > 0).map(z => {
            const isTarget = attackTargets.includes(z.id);
            const colors = {
              dormant: "#666", agitated: "#c44", grabbing: "#f66"
            };
            return (
              <div
                key={`z${z.id}`}
                onClick={() => isTarget && attackZombie(z.id)}
                style={{
                  position: "absolute",
                  left: z.x * TILE + 4, top: (GRID_H - 1 - z.y) * TILE + 4,
                  width: TILE - 10, height: TILE - 10,
                  background: colors[z.state] || "#666",
                  border: isTarget ? "2px solid #ff0" : "2px solid #400",
                  borderRadius: 4, cursor: isTarget ? "pointer" : "default",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  fontSize: 10, color: "#fff", fontWeight: "bold",
                  transition: "left 0.3s, top 0.3s",
                  boxShadow: z.state === "agitated" ? "0 0 8px #c44" : "none"
                }}
              >
                <span style={{ fontSize: 16 }}>Z</span>
                <span style={{ fontSize: 8 }}>{z.hp}/{z.maxHp}</span>
                {z.state === "agitated" && <span style={{ position: "absolute", top: -14, fontSize: 14, color: "#ff0" }}>!</span>}
                {z.state === "grabbing" && <span style={{ position: "absolute", top: -14, fontSize: 10, color: "#f66" }}>GRAB</span>}
              </div>
            );
          })}

          {/* Survivors */}
          {survivors.filter(s => s.state !== "dead").map(s => {
            const isSelected = selectedSurvivor === s.id;
            const isGrabbed = s.state === "grabbed";
            return (
              <div
                key={`s${s.id}`}
                onClick={() => handleTileClick(s.x, s.y)}
                style={{
                  position: "absolute",
                  left: s.x * TILE + 4, top: (GRID_H - 1 - s.y) * TILE + 4,
                  width: TILE - 10, height: TILE - 10,
                  background: isGrabbed ? "#a86a20" : (s.id === 0 ? "#2a6a2a" : "#2a4a8a"),
                  border: isSelected ? "2px solid #fff" : "2px solid #040",
                  borderRadius: "50%", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  fontSize: 10, color: "#fff", fontWeight: "bold",
                  transition: "left 0.3s, top 0.3s",
                  boxShadow: isSelected ? "0 0 12px rgba(255,255,255,0.4)" : "none",
                  zIndex: 10
                }}
              >
                <span style={{ fontSize: 9 }}>{s.name[0]}</span>
                <span style={{ fontSize: 8 }}>{s.hp}/{s.maxHp}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* UI Panel */}
      <div style={{
        flexShrink: 0, borderTop: "1px solid #333", background: "#111",
        padding: "8px 12px", minHeight: 180
      }}>
        {/* Selected survivor info */}
        {selS ? (
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontWeight: "bold", fontSize: 14, color: "#fff" }}>{selS.name}</span>
              <span style={{ fontSize: 12, color: "#aaa" }}>
                Actions: {actionsLeft(selS)}/{freeSlots(selS)} | Free slots: {freeSlots(selS)}
              </span>
            </div>
            <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
              <div style={{
                flex: 1, height: 8, background: "#333", borderRadius: 4, overflow: "hidden"
              }}>
                <div style={{
                  width: `${(selS.hp / selS.maxHp) * 100}%`, height: "100%",
                  background: selS.hp > 5 ? "#4a4" : "#c44", borderRadius: 4
                }} />
              </div>
              <span style={{ fontSize: 10, color: "#aaa" }}>{selS.hp}HP</span>
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
              {selS.inventory.map((item, idx) => (
                <span key={idx} style={{
                  padding: "2px 6px", background: "#2a2a2a", border: "1px solid #444",
                  borderRadius: 3, fontSize: 10, color: "#ccc"
                }}>
                  {item.name}{item.durability && item.durability < 99 ? ` (${item.durability})` : ""}
                </span>
              ))}
              {Array.from({ length: freeSlots(selS) }, (_, i) => (
                <span key={`empty${i}`} style={{
                  padding: "2px 6px", background: "#1a1a1a", border: "1px dashed #333",
                  borderRadius: 3, fontSize: 10, color: "#555"
                }}>empty</span>
              ))}
            </div>
            {selS.state === "grabbed" && actionsLeft(selS) > 0 && (
              <button onClick={breakFree} style={{
                padding: "4px 12px", background: "#a86a20", border: "1px solid #c88a30",
                color: "#fff", borderRadius: 4, fontSize: 11, cursor: "pointer", marginRight: 4
              }}>Break Free (1 action)</button>
            )}
            {selS.inventory.find(i => i.type === "consumable" && i.name === "Bandage") && actionsLeft(selS) > 0 && selS.hp < selS.maxHp && (
              <button onClick={useBandage} style={{
                padding: "4px 12px", background: "#2a5a2a", border: "1px solid #4a8a4a",
                color: "#fff", borderRadius: 4, fontSize: 11, cursor: "pointer"
              }}>Use Bandage (1 action)</button>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
            Tap a survivor to select and see their actions.
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          {phase === PHASE.PLAYER && (
            <button onClick={endPlayerPhase} style={{
              flex: 1, padding: "10px", background: "#333", border: "1px solid #555",
              color: "#fff", borderRadius: 6, fontSize: 14, fontWeight: "bold",
              cursor: "pointer", fontFamily: "'Courier New', monospace"
            }}>END TURN</button>
          )}
          {(phase === PHASE.GAMEOVER || phase === PHASE.WIN) && (
            <button onClick={restart} style={{
              flex: 1, padding: "10px", background: phase === PHASE.WIN ? "#2a5a2a" : "#5a2a2a",
              border: "1px solid #555", color: "#fff", borderRadius: 6, fontSize: 14,
              fontWeight: "bold", cursor: "pointer", fontFamily: "'Courier New', monospace"
            }}>RESTART</button>
          )}
        </div>

        {/* Messages */}
        <div style={{ maxHeight: 60, overflowY: "auto" }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              fontSize: 10, color: i === 0 ? "#ccc" : "#555",
              padding: "1px 0"
            }}>{m}</div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes ripple {
          0% { opacity: 0.8; transform: scale(0.3); }
          100% { opacity: 0; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
