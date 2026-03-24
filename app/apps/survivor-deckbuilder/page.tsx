'use client';

import { useState, useCallback, useEffect, useRef } from "react";
import { Survivor, Zombie, LootItem, TerrainTile, ContainerTile, NoiseEvent, NoiseRipple, Phase, TurnSummary } from "./lib/types";
import { GRID_W, GRID_H, TILE, initSurvivors, initZombies, initLoot, initTerrain, initContainers, ITEMS, NERVE_SHAKY } from "./lib/constants";
import { bfsReachable, manhattan, isObstacle, hasLineOfSight, getVisionCone } from "./lib/grid";
import { resolveNoise, getNoiseIntensity } from "./lib/noise";
import { processZombiePhase } from "./lib/zombie-ai";
import { processAttack, processRangedAttack, throwDistraction, throwMolotov, getZocDamage } from "./lib/combat";
import GameGrid from "./components/GameGrid";
import SurvivorPanel from "./components/SurvivorPanel";

export default function DeadWeightPrototype() {
  const [survivors, setSurvivors] = useState<Survivor[]>(initSurvivors);
  const [zombies, setZombies] = useState<Zombie[]>(initZombies);
  const [loot, setLoot] = useState<LootItem[]>(initLoot);
  const [terrain, setTerrain] = useState<TerrainTile[]>(initTerrain);
  const [containers, setContainers] = useState<ContainerTile[]>(initContainers);
  const [phase, setPhase] = useState<Phase>("player");
  const [selectedSurvivor, setSelectedSurvivor] = useState<number | null>(null);
  const [reachableTiles, setReachableTiles] = useState<Map<string, number>>(new Map());
  const [attackTargets, setAttackTargets] = useState<number[]>([]);
  const [rangedTargets, setRangedTargets] = useState<number[]>([]);
  const [throwTargets, setThrowTargets] = useState<Set<string>>(new Set());
  const [noiseEvents, setNoiseEvents] = useState<NoiseEvent[]>([]);
  const [noiseRipples, setNoiseRipples] = useState<NoiseRipple[]>([]);
  const [messages, setMessages] = useState<string[]>(["Your turn. Tap a survivor to select."]);
  const [turn, setTurn] = useState(1);
  const [throwMode, setThrowMode] = useState(false);
  const [molotovMode, setMolotovMode] = useState(false);
  const [rangedMode, setRangedMode] = useState(false);
  const [showEndTurnConfirm, setShowEndTurnConfirm] = useState(false);
  const [turnSummary, setTurnSummary] = useState<TurnSummary | null>(null);
  const [nextLootId, setNextLootId] = useState(100);
  const gridRef = useRef<HTMLDivElement>(null);

  const addMsg = useCallback((msg: string) => {
    setMessages(prev => [msg, ...prev].slice(0, 8));
  }, []);

  const addMsgs = useCallback((msgs: string[]) => {
    setMessages(prev => [...msgs, ...prev].slice(0, 8));
  }, []);

  const freeSlots = (s: Survivor) => s.totalSlots - s.inventory.length;
  const actionsLeft = (s: Survivor) => {
    const base = freeSlots(s) - s.actionsUsed;
    // Adrenaline bonus
    const bonus = s.statusEffects.includes("adrenaline") ? 1 : 0;
    return base + bonus;
  };

  const getBlockedSet = useCallback((excludeSurvivorId: number = -1): Set<string> => {
    const blocked = new Set<string>();
    survivors.forEach(s => { if (s.id !== excludeSurvivorId && s.state !== "dead") blocked.add(`${s.x},${s.y}`); });
    zombies.forEach(z => { if (z.hp > 0) blocked.add(`${z.x},${z.y}`); });
    return blocked;
  }, [survivors, zombies]);

  const computeTargets = useCallback((s: Survivor) => {
    // Melee targets
    const melee = zombies.filter(z => z.hp > 0 && manhattan(s, z) === 1 && s.inventory.some(i => i.type === "weapon"));
    setAttackTargets(melee.map(z => z.id));

    // Ranged targets
    const rangedWeapon = s.inventory.find(i => (i.rangedRange ?? 0) > 0 && (i.ammo ?? 0) > 0);
    if (rangedWeapon) {
      const ranged = zombies.filter(z =>
        z.hp > 0 && manhattan(s, z) <= rangedWeapon.rangedRange! && manhattan(s, z) > 0 &&
        hasLineOfSight(s, z)
      );
      setRangedTargets(ranged.map(z => z.id));
    } else {
      setRangedTargets([]);
    }
  }, [zombies]);

  const computeThrowTargets = useCallback((s: Survivor) => {
    const distraction = s.inventory.find(i => i.type === "distraction");
    const molotov = s.inventory.find(i => i.name === "Molotov");
    const item = molotovMode ? molotov : distraction;
    if (!item) { setThrowTargets(new Set()); return; }
    const range = item.throwRange ?? 3;
    const targets = new Set<string>();
    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        if (Math.abs(dx) + Math.abs(dy) > range || (dx === 0 && dy === 0)) continue;
        const tx = s.x + dx, ty = s.y + dy;
        if (tx >= 0 && tx < GRID_W && ty >= 0 && ty < GRID_H && !isObstacle(tx, ty)) {
          targets.add(`${tx},${ty}`);
        }
      }
    }
    setThrowTargets(targets);
  }, [molotovMode]);

  const selectSurvivor = useCallback((sid: number) => {
    if (phase !== "player") return;
    const s = survivors.find(sv => sv.id === sid);
    if (!s || s.state === "dead") return;
    setSelectedSurvivor(sid);
    setThrowMode(false);
    setMolotovMode(false);
    setRangedMode(false);

    if (s.overwatching || s.nerve <= 0) {
      setReachableTiles(new Map());
      setAttackTargets([]);
      setRangedTargets([]);
      setThrowTargets(new Set());
      return;
    }

    const remaining = actionsLeft(s);
    const blocked = getBlockedSet(sid);
    setReachableTiles(bfsReachable({ x: s.x, y: s.y }, remaining, blocked));
    computeTargets(s);
    setThrowTargets(new Set());
  }, [phase, survivors, getBlockedSet, computeTargets]);

  // --- Player Actions ---

  const moveSurvivor = useCallback((tx: number, ty: number) => {
    if (selectedSurvivor === null || phase !== "player") return;
    const key = `${tx},${ty}`;
    if (!reachableTiles.has(key)) return;
    const cost = reachableTiles.get(key)!;
    if (cost === 0) return;

    setSurvivors(prev => {
      const newSurvivors = prev.map(s => {
        if (s.id !== selectedSurvivor) return s;

        // Zone of control check
        const zoc = getZocDamage(s, s.x, s.y, tx, ty, zombies);
        let newHp = s.hp - zoc.damage;
        if (zoc.damage > 0) {
          addMsg(`${s.name} takes ${zoc.damage} ZoC damage fleeing ${zoc.attackers.join(", ")}!`);
        }

        // Terrain noise
        const ter = terrain.find(t => t.x === tx && t.y === ty);
        if (ter) {
          setNoiseEvents(prev => [...prev, { x: tx, y: ty, radius: ter.noiseOnStep, intensity: getNoiseIntensity(ter.noiseOnStep) }]);
          setNoiseRipples(prev => [...prev, { x: tx, y: ty, radius: ter.noiseOnStep, intensity: getNoiseIntensity(ter.noiseOnStep), id: Date.now() + 333 }]);
          const terrainNames: Record<string, string> = { glass: "glass shards", metal: "metal grating", puddle: "a puddle" };
          addMsg(`${s.name} steps on ${terrainNames[ter.type]}! Noise ${ter.noiseOnStep}.`);
        }

        if (newHp <= 0) {
          return { ...s, x: tx, y: ty, hp: 0, state: "dead" as const, actionsUsed: s.actionsUsed + cost };
        }
        return { ...s, x: tx, y: ty, hp: newHp, actionsUsed: s.actionsUsed + cost };
      });
      return newSurvivors;
    });

    setTimeout(() => selectSurvivor(selectedSurvivor), 50);
  }, [selectedSurvivor, phase, reachableTiles, zombies, terrain, addMsg, selectSurvivor]);

  const handleAttack = useCallback((zid: number) => {
    if (selectedSurvivor === null || phase !== "player") return;
    const s = survivors.find(sv => sv.id === selectedSurvivor);
    if (!s || actionsLeft(s) <= 0 || s.overwatching || s.nerve <= 0) return;

    const result = processAttack(selectedSurvivor, zid, survivors, zombies, loot, terrain, nextLootId);
    setSurvivors(result.survivors);
    setZombies(result.zombies);
    setLoot(result.loot);
    setTerrain(result.terrain);
    setNoiseEvents(prev => [...prev, ...result.noiseEvents]);
    setNoiseRipples(prev => [...prev, ...result.noiseRipples]);
    result.messages.forEach(m => addMsg(m));

    setTimeout(() => selectSurvivor(selectedSurvivor), 50);
  }, [selectedSurvivor, phase, survivors, zombies, loot, terrain, nextLootId, addMsg, selectSurvivor]);

  const handleThrowTile = useCallback((tx: number, ty: number) => {
    if (selectedSurvivor === null || phase !== "player") return;
    const s = survivors.find(sv => sv.id === selectedSurvivor);
    if (!s || actionsLeft(s) <= 0) return;

    if (molotovMode) {
      const result = throwMolotov(selectedSurvivor, tx, ty, survivors, zombies, terrain);
      if (!result) return;
      setSurvivors(result.survivors);
      setZombies(result.zombies);
      setTerrain(result.terrain);
      setNoiseEvents(prev => [...prev, ...result.noiseEvents]);
      setNoiseRipples(prev => [...prev, ...result.noiseRipples]);
      result.messages.forEach(m => addMsg(m));
      setMolotovMode(false);
    } else {
      const result = throwDistraction(selectedSurvivor, tx, ty, survivors, terrain, nextLootId);
      if (!result) return;
      setSurvivors(result.survivors);
      setTerrain(result.terrain);
      setNoiseEvents(prev => [...prev, ...result.noiseEvents]);
      setNoiseRipples(prev => [...prev, ...result.noiseRipples]);
      result.messages.forEach(m => addMsg(m));
      setThrowMode(false);
    }

    setTimeout(() => selectSurvivor(selectedSurvivor), 50);
  }, [selectedSurvivor, phase, survivors, zombies, terrain, nextLootId, molotovMode, addMsg, selectSurvivor]);

  const handleRangedAttack = useCallback((tx: number, ty: number) => {
    if (selectedSurvivor === null || phase !== "player") return;
    const result = processRangedAttack(selectedSurvivor, tx, ty, survivors, zombies, loot, terrain, nextLootId);
    if (!result) return;
    setSurvivors(result.survivors);
    setZombies(result.zombies);
    setNoiseEvents(prev => [...prev, ...result.noiseEvents]);
    setNoiseRipples(prev => [...prev, ...result.noiseRipples]);
    result.messages.forEach(m => addMsg(m));
    setRangedMode(false);
    setTimeout(() => selectSurvivor(selectedSurvivor), 50);
  }, [selectedSurvivor, phase, survivors, zombies, loot, terrain, nextLootId, addMsg, selectSurvivor]);

  const useBandageOrMedkit = useCallback((itemName: string) => {
    if (selectedSurvivor === null || phase !== "player") return;
    const s = survivors.find(sv => sv.id === selectedSurvivor);
    if (!s || actionsLeft(s) <= 0) return;
    const item = s.inventory.find(i => i.name === itemName);
    if (!item) return;

    const healed = Math.min(s.maxHp, s.hp + (item.heal ?? 0));
    const removeBleeding = itemName === "Bandage" || itemName === "Medkit";

    setSurvivors(prev => prev.map(ss => {
      if (ss.id !== selectedSurvivor) return ss;
      let effects = [...ss.statusEffects];
      if (removeBleeding) effects = effects.filter(e => e !== "bleeding");
      return {
        ...ss, hp: healed, actionsUsed: ss.actionsUsed + 1,
        inventory: ss.inventory.filter(i => i !== item),
        statusEffects: effects,
        nerve: Math.min(ss.maxNerve, ss.nerve + 1),
      };
    }));
    setNoiseEvents(prev => [...prev, { x: s.x, y: s.y, radius: item.noiseRadius, intensity: 1 }]);
    addMsg(`${s.name} used ${itemName}. Healed to ${healed} HP.`);
    setTimeout(() => selectSurvivor(selectedSurvivor), 50);
  }, [selectedSurvivor, phase, survivors, addMsg, selectSurvivor]);

  const breakFree = useCallback(() => {
    if (selectedSurvivor === null || phase !== "player") return;
    const s = survivors.find(sv => sv.id === selectedSurvivor);
    if (!s || s.state !== "grabbed" || actionsLeft(s) <= 0) return;
    setSurvivors(prev => prev.map(ss =>
      ss.id !== selectedSurvivor ? ss :
      { ...ss, state: "active", actionsUsed: ss.actionsUsed + 1 }
    ));
    setZombies(prev => prev.map(z => z.grabTarget === selectedSurvivor ? { ...z, state: "agitated", grabTarget: null } : z));
    setNoiseEvents(prev => [...prev, { x: s.x, y: s.y, radius: 1, intensity: 1 }]);
    addMsg(`${s.name} broke free!`);
    setTimeout(() => selectSurvivor(selectedSurvivor), 50);
  }, [selectedSurvivor, phase, survivors, addMsg, selectSurvivor]);

  const enterOverwatch = useCallback(() => {
    if (selectedSurvivor === null || phase !== "player") return;
    const s = survivors.find(sv => sv.id === selectedSurvivor);
    if (!s || s.state !== "active" || s.overwatching) return;
    const remaining = actionsLeft(s);
    if (remaining <= 0) return;
    const weapon = s.inventory.find(i => i.type === "weapon");
    if (!weapon) { addMsg("Need a weapon for overwatch!"); return; }
    setSurvivors(prev => prev.map(ss =>
      ss.id !== selectedSurvivor ? ss :
      { ...ss, overwatching: true, overwatchAttacks: remaining, actionsUsed: ss.actionsUsed + remaining }
    ));
    addMsg(`${s.name} enters overwatch with ${remaining} reaction attack${remaining > 1 ? "s" : ""}!`);
    setTimeout(() => selectSurvivor(selectedSurvivor), 50);
  }, [selectedSurvivor, phase, survivors, addMsg, selectSurvivor]);

  const disengage = useCallback(() => {
    if (selectedSurvivor === null || phase !== "player") return;
    const s = survivors.find(sv => sv.id === selectedSurvivor);
    if (!s || actionsLeft(s) <= 0 || s.disengaging) return;
    setSurvivors(prev => prev.map(ss =>
      ss.id !== selectedSurvivor ? ss :
      { ...ss, disengaging: true, actionsUsed: ss.actionsUsed + 1 }
    ));
    addMsg(`${s.name} carefully disengages. Safe to move.`);
    setTimeout(() => selectSurvivor(selectedSurvivor), 50);
  }, [selectedSurvivor, phase, survivors, addMsg, selectSurvivor]);

  const dropItem = useCallback((idx: number) => {
    if (selectedSurvivor === null || phase !== "player") return;
    const s = survivors.find(sv => sv.id === selectedSurvivor);
    if (!s) return;
    const item = s.inventory[idx];
    if (!item) return;

    // Drop on ground as loot (free action)
    const newLootId = nextLootId;
    setNextLootId(prev => prev + 1);
    setLoot(prev => [...prev, { id: newLootId, x: s.x, y: s.y, item: { ...item } }]);
    setSurvivors(prev => prev.map(ss => {
      if (ss.id !== selectedSurvivor) return ss;
      const newInv = [...ss.inventory];
      newInv.splice(idx, 1);
      return { ...ss, inventory: newInv };
    }));
    addMsg(`${s.name} drops ${item.name}. +1 action slot!`);
    setTimeout(() => selectSurvivor(selectedSurvivor), 50);
  }, [selectedSurvivor, phase, survivors, nextLootId, addMsg, selectSurvivor]);

  const pickupLoot = useCallback(() => {
    if (selectedSurvivor === null || phase !== "player") return;
    const s = survivors.find(sv => sv.id === selectedSurvivor);
    if (!s || actionsLeft(s) <= 0 || freeSlots(s) <= 0) return;
    const lootItem = loot.find(l => l.x === s.x && l.y === s.y);
    if (!lootItem) return;

    setLoot(prev => prev.filter(l => l.id !== lootItem.id));
    setSurvivors(prev => prev.map(ss => {
      if (ss.id !== selectedSurvivor) return ss;
      return { ...ss, inventory: [...ss.inventory, { ...lootItem.item }], actionsUsed: ss.actionsUsed + 1 };
    }));
    addMsg(`${s.name} picks up ${lootItem.item.name}. Weight +1.`);
    setTimeout(() => selectSurvivor(selectedSurvivor), 50);
  }, [selectedSurvivor, phase, survivors, loot, addMsg, selectSurvivor]);

  const searchContainer = useCallback(() => {
    if (selectedSurvivor === null || phase !== "player") return;
    const s = survivors.find(sv => sv.id === selectedSurvivor);
    if (!s || actionsLeft(s) <= 0) return;

    // Must be adjacent to container
    const cont = containers.find(c => {
      const dist = manhattan(s, { x: c.x, y: c.y });
      return dist <= 1 && !c.searched;
    });
    if (!cont) return;

    const found = cont.lootTable[Math.floor(Math.random() * cont.lootTable.length)];
    const newLootId = nextLootId;
    setNextLootId(prev => prev + 1);
    setLoot(prev => [...prev, { id: newLootId, x: cont.x, y: cont.y, item: { ...found } }]);
    setContainers(prev => prev.map(c => c === cont ? { ...c, searched: true } : c));
    setSurvivors(prev => prev.map(ss =>
      ss.id !== selectedSurvivor ? ss :
      { ...ss, actionsUsed: ss.actionsUsed + 1 }
    ));
    setNoiseEvents(prev => [...prev, { x: cont.x, y: cont.y, radius: 1, intensity: 1 }]);
    setNoiseRipples(prev => [...prev, { x: cont.x, y: cont.y, radius: 1, intensity: 1, id: Date.now() + 444 }]);
    addMsg(`${s.name} searches and finds ${found.name}!`);
    setTimeout(() => selectSurvivor(selectedSurvivor), 50);
  }, [selectedSurvivor, phase, survivors, containers, nextLootId, addMsg, selectSurvivor]);

  // --- End Turn ---

  const tryEndTurn = useCallback(() => {
    if (phase !== "player") return;
    const hasActionsLeft = survivors.some(s => s.state !== "dead" && !s.overwatching && s.nerve > 0 && actionsLeft(s) > 0);
    if (hasActionsLeft) {
      setShowEndTurnConfirm(true);
    } else {
      endPlayerPhase();
    }
  }, [phase, survivors]);

  const endPlayerPhase = useCallback(() => {
    setSelectedSurvivor(null);
    setReachableTiles(new Map());
    setAttackTargets([]);
    setRangedTargets([]);
    setThrowTargets(new Set());
    setThrowMode(false);
    setMolotovMode(false);
    setRangedMode(false);
    setShowEndTurnConfirm(false);
    setPhase("noise");
  }, []);

  // --- Noise Resolution Phase ---
  useEffect(() => {
    if (phase !== "noise") return;
    const timer = setTimeout(() => {
      const result = resolveNoise(noiseEvents, zombies, survivors);
      setZombies(result.zombies);
      setNoiseRipples(prev => [...prev, ...result.newRipples]);
      result.messages.forEach(m => addMsg(m));
      setNoiseEvents([]);

      setTurnSummary(prev => ({
        zombiesWoke: (prev?.zombiesWoke || 0) + result.zombiesWoke,
        zombiesKilled: prev?.zombiesKilled || 0,
        damageTaken: prev?.damageTaken || [],
        overwatchHits: prev?.overwatchHits || 0,
        zocHits: prev?.zocHits || 0,
      }));

      setPhase("zombie");
    }, 400);
    return () => clearTimeout(timer);
  }, [phase, noiseEvents, zombies, survivors, addMsg]);

  // --- Zombie Phase ---
  useEffect(() => {
    if (phase !== "zombie") return;
    const timer = setTimeout(() => {
      const result = processZombiePhase(zombies, survivors);
      setZombies(result.zombies);
      setSurvivors(result.survivors);
      result.messages.forEach(m => addMsg(m));

      // Process any noise events from zombie phase (screamer groans)
      if (result.noiseEvents.length > 0) {
        setNoiseEvents(prev => [...prev, ...result.noiseEvents]);
        setNoiseRipples(prev => [...prev, ...result.noiseRipples]);
      }

      const summary: TurnSummary = {
        zombiesWoke: turnSummary?.zombiesWoke || 0,
        zombiesKilled: result.zombies.filter(z => z.hp <= 0).length - zombies.filter(z => z.hp <= 0).length,
        damageTaken: [],
        overwatchHits: (turnSummary?.overwatchHits || 0) + result.overwatchHits,
        zocHits: 0,
      };

      // Check win/lose
      const aliveS = result.survivors.filter(s => s.state !== "dead");
      const aliveZ = result.zombies.filter(z => z.hp > 0);

      if (aliveS.length === 0) {
        setPhase("gameover");
        addMsg("All survivors down. Game over.");
        return;
      }
      if (aliveZ.length === 0) {
        setPhase("win");
        addMsg("All zombies cleared! Room secure.");
        return;
      }

      // Start new turn - apply status effects, reset actions
      setSurvivors(prev => prev.map(s => {
        if (s.state === "dead") return s;
        let newHp = s.hp;
        let newNerve = s.nerve;
        const newEffects = [...s.statusEffects];

        // Bleeding
        if (newEffects.includes("bleeding")) {
          newHp -= 1;
          if (newHp <= 0) {
            addMsg(`${s.name} bleeds out!`);
            return { ...s, hp: 0, state: "dead" as const, actionsUsed: 0, overwatching: false, overwatchAttacks: 0 };
          }
          addMsg(`${s.name} is bleeding! -1 HP (${newHp})`);
        }

        // Adrenaline: apply from last turn's kills, add as status effect for this turn
        const hasAdrenaline = s.adrenalineNextTurn;
        const effects = hasAdrenaline
          ? (newEffects.includes("adrenaline") ? newEffects : [...newEffects, "adrenaline" as const])
          : newEffects.filter(e => e !== "adrenaline");

        // Panicked check
        if (newNerve <= 0) {
          addMsg(`${s.name} is panicking! Can't act this turn.`);
          newNerve = 1; // recover 1 nerve per turn
        }

        return {
          ...s,
          hp: newHp, nerve: newNerve,
          actionsUsed: 0, overwatching: false, overwatchAttacks: 0,
          disengaging: false, adrenalineNextTurn: false,
          statusEffects: effects,
        };
      }));

      setTurn(t => t + 1);
      setTurnSummary(null);
      setPhase("player");
      addMsg("Your turn.");
    }, 600);
    return () => clearTimeout(timer);
  }, [phase, zombies, survivors, addMsg, turnSummary]);

  // Clear ripples
  useEffect(() => {
    if (noiseRipples.length === 0) return;
    const timer = setTimeout(() => setNoiseRipples([]), 1500);
    return () => clearTimeout(timer);
  }, [noiseRipples]);

  // --- Tile Click Handler ---
  const handleTileClick = useCallback((tx: number, ty: number) => {
    if (phase !== "player") return;

    // Throw mode: throw to target tile
    if ((throwMode || molotovMode) && throwTargets.has(`${tx},${ty}`)) {
      handleThrowTile(tx, ty);
      return;
    }

    // Ranged mode: shoot at zombie
    if (rangedMode) {
      const targetZ = zombies.find(z => z.x === tx && z.y === ty && z.hp > 0 && rangedTargets.includes(z.id));
      if (targetZ) {
        handleRangedAttack(tx, ty);
        return;
      }
    }

    // Click survivor to select
    const clickedSurvivor = survivors.find(s => s.x === tx && s.y === ty && s.state !== "dead");
    if (clickedSurvivor) {
      selectSurvivor(clickedSurvivor.id);
      return;
    }

    // Click zombie to attack (melee)
    const clickedZombie = zombies.find(z => z.x === tx && z.y === ty && z.hp > 0);
    if (clickedZombie) {
      if (attackTargets.includes(clickedZombie.id)) {
        handleAttack(clickedZombie.id);
        return;
      }
      if (rangedTargets.includes(clickedZombie.id)) {
        handleRangedAttack(tx, ty);
        return;
      }
    }

    // Move
    if (selectedSurvivor !== null) {
      moveSurvivor(tx, ty);
    }
  }, [phase, throwMode, molotovMode, rangedMode, throwTargets, survivors, zombies,
      selectedSurvivor, attackTargets, rangedTargets,
      selectSurvivor, handleAttack, moveSurvivor, handleThrowTile, handleRangedAttack]);

  const restart = () => {
    setSurvivors(initSurvivors());
    setZombies(initZombies());
    setLoot(initLoot());
    setTerrain(initTerrain());
    setContainers(initContainers());
    setPhase("player");
    setSelectedSurvivor(null);
    setReachableTiles(new Map());
    setAttackTargets([]);
    setRangedTargets([]);
    setThrowTargets(new Set());
    setNoiseEvents([]);
    setNoiseRipples([]);
    setMessages(["Your turn. Tap a survivor to select."]);
    setTurn(1);
    setThrowMode(false);
    setMolotovMode(false);
    setRangedMode(false);
    setShowEndTurnConfirm(false);
    setTurnSummary(null);
    setNextLootId(100);
  };

  const selS = survivors.find(s => s.id === selectedSurvivor) || null;
  const lootOnTile = selS ? loot.find(l => l.x === selS.x && l.y === selS.y) || null : null;
  const containerOnTile = selS ? containers.find(c => manhattan(selS, { x: c.x, y: c.y }) <= 1 && !c.searched) || null : null;

  // Update throw targets when mode changes
  useEffect(() => {
    if ((throwMode || molotovMode) && selS) {
      computeThrowTargets(selS);
    } else {
      setThrowTargets(new Set());
    }
  }, [throwMode, molotovMode, selS, computeThrowTargets]);

  return (
    <div style={{
      width: "100%", maxWidth: 540, margin: "0 auto", height: "100vh",
      display: "flex", flexDirection: "column",
      background: "#1a1a1a", color: "#e0e0e0", fontFamily: "'Courier New', monospace",
      overflow: "hidden", userSelect: "none",
    }}>
      {/* Header */}
      <div style={{
        padding: "6px 12px", display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: "1px solid #333", background: "#111", flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: "bold", color: "#c44" }}>DEAD WEIGHT</span>
        <span style={{ fontSize: 11, color: "#888" }}>Turn {turn}</span>
        <span style={{ fontSize: 10, color: "#888" }}>
          {zombies.filter(z => z.hp > 0).length} zombies left
        </span>
      </div>

      {/* Grid */}
      <div ref={gridRef} style={{
        flex: "1 1 auto", overflowX: "auto", overflowY: "hidden",
        WebkitOverflowScrolling: "touch", minHeight: 0,
      }}>
        <GameGrid
          survivors={survivors}
          zombies={zombies}
          loot={loot}
          terrain={terrain}
          containers={containers}
          selectedSurvivor={selectedSurvivor}
          reachableTiles={reachableTiles}
          attackTargets={attackTargets}
          rangedTargets={rangedTargets}
          throwTargets={throwTargets}
          noiseRipples={noiseRipples}
          showVisionCones={selectedSurvivor !== null}
          onTileClick={handleTileClick}
        />
      </div>

      {/* UI Panel */}
      <div style={{
        flexShrink: 0, borderTop: "1px solid #333", background: "#111",
        padding: "6px 10px", minHeight: 170, overflowY: "auto",
      }}>
        <SurvivorPanel
          survivor={selS}
          lootOnTile={lootOnTile || null}
          containerOnTile={containerOnTile || null}
          canAttack={attackTargets.length > 0}
          canRangedAttack={rangedTargets.length > 0}
          canThrow={selS?.inventory.some(i => i.type === "distraction") || false}
          canMolotov={selS?.inventory.some(i => i.name === "Molotov") || false}
          onBreakFree={breakFree}
          onUseBandage={() => useBandageOrMedkit("Bandage")}
          onUseMedkit={() => useBandageOrMedkit("Medkit")}
          onOverwatch={enterOverwatch}
          onDisengage={disengage}
          onDropItem={dropItem}
          onPickupLoot={pickupLoot}
          onSearchContainer={searchContainer}
          onToggleThrowMode={() => { setThrowMode(!throwMode); setMolotovMode(false); setRangedMode(false); }}
          onToggleMolotovMode={() => { setMolotovMode(!molotovMode); setThrowMode(false); setRangedMode(false); }}
          onToggleRangedMode={() => { setRangedMode(!rangedMode); setThrowMode(false); setMolotovMode(false); }}
          throwMode={throwMode}
          molotovMode={molotovMode}
          rangedMode={rangedMode}
        />

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          {phase === "player" && (
            <button onClick={tryEndTurn} style={{
              flex: 1, padding: "8px", background: "#333", border: "1px solid #555",
              color: "#fff", borderRadius: 4, fontSize: 13, fontWeight: "bold",
              cursor: "pointer", fontFamily: "'Courier New', monospace",
            }}>END TURN</button>
          )}
          {(phase === "gameover" || phase === "win") && (
            <button onClick={restart} style={{
              flex: 1, padding: "8px", background: phase === "win" ? "#2a5a2a" : "#5a2a2a",
              border: "1px solid #555", color: "#fff", borderRadius: 4, fontSize: 13,
              fontWeight: "bold", cursor: "pointer", fontFamily: "'Courier New', monospace",
            }}>RESTART</button>
          )}
        </div>

        {/* Messages */}
        <div style={{ maxHeight: 50, overflowY: "auto" }}>
          {messages.map((m, i) => (
            <div key={i} style={{ fontSize: 9, color: i === 0 ? "#ccc" : "#555", padding: "1px 0" }}>{m}</div>
          ))}
        </div>
      </div>

      {/* End Turn Confirmation Modal */}
      {showEndTurnConfirm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
        }}>
          <div style={{
            background: "#222", border: "1px solid #555", borderRadius: 8,
            padding: "16px 24px", maxWidth: 300, textAlign: "center",
          }}>
            <div style={{ fontSize: 13, color: "#fff", marginBottom: 12 }}>
              {survivors.filter(s => s.state !== "dead" && !s.overwatching && s.nerve > 0 && actionsLeft(s) > 0)
                .map(s => `${s.name} has ${actionsLeft(s)} action${actionsLeft(s) > 1 ? "s" : ""} left`)
                .join(". ")}.
              <br />End turn anyway?
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={endPlayerPhase} style={{
                padding: "6px 16px", background: "#5a2a2a", border: "1px solid #8a4a4a",
                color: "#fff", borderRadius: 4, cursor: "pointer", fontFamily: "'Courier New', monospace",
              }}>Yes, End Turn</button>
              <button onClick={() => setShowEndTurnConfirm(false)} style={{
                padding: "6px 16px", background: "#333", border: "1px solid #555",
                color: "#fff", borderRadius: 4, cursor: "pointer", fontFamily: "'Courier New', monospace",
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes ripple {
          0% { opacity: 0.8; transform: scale(0.3); }
          100% { opacity: 0; transform: scale(1); }
        }
        @keyframes panic-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
