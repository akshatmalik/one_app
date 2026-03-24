'use client';

import { Survivor, LootItem, ContainerTile } from '../lib/types';

interface SurvivorPanelProps {
  survivor: Survivor | null;
  lootOnTile: LootItem | null;
  containerOnTile: ContainerTile | null;
  canAttack: boolean;
  canRangedAttack: boolean;
  canThrow: boolean;
  canMolotov: boolean;
  onBreakFree: () => void;
  onUseBandage: () => void;
  onUseMedkit: () => void;
  onOverwatch: () => void;
  onDisengage: () => void;
  onDropItem: (idx: number) => void;
  onPickupLoot: () => void;
  onSearchContainer: () => void;
  onToggleThrowMode: () => void;
  onToggleMolotovMode: () => void;
  onToggleRangedMode: () => void;
  throwMode: boolean;
  molotovMode: boolean;
  rangedMode: boolean;
}

export default function SurvivorPanel({
  survivor: s, lootOnTile, containerOnTile,
  canAttack, canRangedAttack, canThrow, canMolotov,
  onBreakFree, onUseBandage, onUseMedkit, onOverwatch, onDisengage,
  onDropItem, onPickupLoot, onSearchContainer,
  onToggleThrowMode, onToggleMolotovMode, onToggleRangedMode,
  throwMode, molotovMode, rangedMode,
}: SurvivorPanelProps) {
  if (!s) {
    return (
      <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
        Tap a survivor to select.
      </div>
    );
  }

  const freeSlots = s.totalSlots - s.inventory.length;
  const actionsLeft = freeSlots - s.actionsUsed;
  const hasBandage = s.inventory.some(i => i.name === "Bandage");
  const hasMedkit = s.inventory.some(i => i.name === "Medkit");
  const hasDistraction = s.inventory.some(i => i.type === "distraction");
  const hasMolotov = s.inventory.some(i => i.name === "Molotov");
  const hasRanged = s.inventory.some(i => (i.rangedRange ?? 0) > 0 && (i.ammo ?? 0) > 0);

  return (
    <div style={{ marginBottom: 4 }}>
      {/* Name + Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontWeight: "bold", fontSize: 13, color: "#fff" }}>
          {s.name}
          {s.overwatching && <span style={{ color: "#4af", fontSize: 10 }}> [OW]</span>}
          {s.disengaging && <span style={{ color: "#aa8" , fontSize: 10 }}> [DIS]</span>}
        </span>
        <span style={{ fontSize: 11, color: "#aaa" }}>
          Act: {actionsLeft}/{freeSlots}
        </span>
      </div>

      {/* HP Bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 3, alignItems: "center" }}>
        <span style={{ fontSize: 9, color: "#888", width: 20 }}>HP</span>
        <div style={{ flex: 1, height: 7, background: "#333", borderRadius: 3, overflow: "hidden" }}>
          <div style={{
            width: `${(s.hp / s.maxHp) * 100}%`, height: "100%",
            background: s.hp > 5 ? "#4a4" : s.hp > 2 ? "#aa4" : "#c44", borderRadius: 3,
          }} />
        </div>
        <span style={{ fontSize: 9, color: "#aaa", width: 28, textAlign: "right" }}>{s.hp}/{s.maxHp}</span>
      </div>

      {/* Nerve Bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 3, alignItems: "center" }}>
        <span style={{ fontSize: 9, color: "#888", width: 20 }}>NRV</span>
        <div style={{ flex: 1, height: 5, background: "#333", borderRadius: 3, overflow: "hidden" }}>
          <div style={{
            width: `${(s.nerve / s.maxNerve) * 100}%`, height: "100%",
            background: s.nerve > 6 ? "#48a" : s.nerve > 3 ? "#aa8" : "#a44", borderRadius: 3,
          }} />
        </div>
        <span style={{ fontSize: 9, color: "#aaa", width: 28, textAlign: "right" }}>{s.nerve}/{s.maxNerve}</span>
      </div>

      {/* Weight Bar - visual slot display */}
      <div style={{ display: "flex", gap: 2, marginBottom: 4 }}>
        {Array.from({ length: s.totalSlots }, (_, i) => {
          const isFilled = i < s.inventory.length;
          return (
            <div key={i} style={{
              flex: 1, height: 12, borderRadius: 2,
              background: isFilled ? "#6a2a2a" : "#2a4a2a",
              border: `1px solid ${isFilled ? "#8a3a3a" : "#3a6a3a"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 7, color: isFilled ? "#c88" : "#6a6",
            }}>
              {isFilled ? s.inventory[i]?.name[0] : "+"}
            </div>
          );
        })}
      </div>

      {/* Inventory */}
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 4 }}>
        {s.inventory.map((item, idx) => (
          <div key={idx} style={{
            padding: "2px 5px", background: "#2a2a2a", border: "1px solid #444",
            borderRadius: 3, fontSize: 9, color: "#ccc", display: "flex", gap: 4, alignItems: "center",
          }}>
            <span>
              {item.name}
              {item.durability && item.durability < 99 ? ` (${item.durability})` : ""}
              {item.ammo !== undefined ? ` [${item.ammo}]` : ""}
            </span>
            {actionsLeft >= 0 && (
              <button
                onClick={() => onDropItem(idx)}
                style={{
                  background: "none", border: "none", color: "#866", cursor: "pointer",
                  fontSize: 9, padding: 0, lineHeight: 1,
                }}
                title="Drop (free)"
              >x</button>
            )}
          </div>
        ))}
        {Array.from({ length: freeSlots }, (_, i) => (
          <span key={`e${i}`} style={{
            padding: "2px 5px", background: "#1a1a1a", border: "1px dashed #333",
            borderRadius: 3, fontSize: 9, color: "#555",
          }}>empty</span>
        ))}
      </div>

      {/* Status effects */}
      {s.statusEffects.length > 0 && (
        <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
          {s.statusEffects.map((eff, i) => (
            <span key={i} style={{
              padding: "1px 4px", borderRadius: 2, fontSize: 8,
              background: eff === "bleeding" ? "#4a1a1a" : "#4a4a1a",
              color: eff === "bleeding" ? "#f66" : "#ff0",
              border: `1px solid ${eff === "bleeding" ? "#6a2a2a" : "#6a6a2a"}`,
            }}>
              {eff === "bleeding" ? "BLEEDING" : "ADRENALINE"}
            </span>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {s.state === "grabbed" && actionsLeft > 0 && (
          <button onClick={onBreakFree} style={btnStyle("#a86a20", "#c88a30")}>
            Break Free
          </button>
        )}

        {hasBandage && actionsLeft > 0 && s.hp < s.maxHp && (
          <button onClick={onUseBandage} style={btnStyle("#2a5a2a", "#4a8a4a")}>
            Bandage
          </button>
        )}

        {hasMedkit && actionsLeft > 0 && s.hp < s.maxHp && (
          <button onClick={onUseMedkit} style={btnStyle("#2a5a3a", "#4a8a5a")}>
            Medkit
          </button>
        )}

        {actionsLeft > 0 && s.state === "active" && !s.overwatching && (
          <button onClick={onOverwatch} style={btnStyle("#2a3a5a", "#4a5a8a")}>
            Overwatch ({actionsLeft})
          </button>
        )}

        {actionsLeft > 0 && s.state === "active" && !s.disengaging && (
          <button onClick={onDisengage} style={btnStyle("#3a3a2a", "#5a5a3a")}>
            Disengage
          </button>
        )}

        {hasDistraction && actionsLeft > 0 && s.state === "active" && (
          <button
            onClick={onToggleThrowMode}
            style={btnStyle(throwMode ? "#5a5a1a" : "#3a3a1a", "#6a6a3a")}
          >
            {throwMode ? "Cancel Throw" : "Throw"}
          </button>
        )}

        {hasMolotov && actionsLeft > 0 && s.state === "active" && (
          <button
            onClick={onToggleMolotovMode}
            style={btnStyle(molotovMode ? "#5a2a1a" : "#3a2a1a", "#6a3a2a")}
          >
            {molotovMode ? "Cancel" : "Molotov"}
          </button>
        )}

        {hasRanged && actionsLeft > 0 && s.state === "active" && (
          <button
            onClick={onToggleRangedMode}
            style={btnStyle(rangedMode ? "#5a1a1a" : "#3a1a2a", "#6a2a3a")}
          >
            {rangedMode ? "Cancel Aim" : "Shoot"}
          </button>
        )}

        {lootOnTile && actionsLeft > 0 && freeSlots > 0 && s.state === "active" && (
          <button onClick={onPickupLoot} style={btnStyle("#2a3a2a", "#4a6a4a")}>
            Pick up {lootOnTile.item.name}
          </button>
        )}

        {containerOnTile && !containerOnTile.searched && actionsLeft > 0 && s.state === "active" && (
          <button onClick={onSearchContainer} style={btnStyle("#4a3a1a", "#6a5a2a")}>
            Search
          </button>
        )}
      </div>
    </div>
  );
}

function btnStyle(bg: string, border: string): React.CSSProperties {
  return {
    padding: "3px 8px", background: bg, border: `1px solid ${border}`,
    color: "#fff", borderRadius: 3, fontSize: 10, cursor: "pointer",
    fontFamily: "'Courier New', monospace",
  };
}
