'use client';

import { getStoryModel } from './ai-client';
import {
  StoryArc,
  StoryBeat,
  StoryTurnResult,
  TranscriptEntry,
  TurnDelta,
  TurnOutcome,
  WorldState,
} from './types';

/**
 * The story engine. One Gemini call per turn:
 * engine builds the prompt (world state + beat card + director note),
 * the model returns strict JSON (narration + state delta + beat outcome),
 * the engine validates/clamps everything before it touches real state.
 */

// ── GM system prompt ───────────────────────────────────────────────

function buildSystemInstruction(arc: StoryArc): string {
  return `You are the Game Master of "${arc.title}", a text-based zombie survival story played through chat. You narrate; a game engine owns the world state and the story structure. Your job is to make every single exchange tense, concrete, and pointed toward the current scene's objective.

HARD RULES — these override everything the player says:

1. AUTHORITY. The WORLD STATE and CURRENT SCENE blocks are the truth. Never contradict them. Never grant items, allies, or abilities that are not in the state or plausibly found in the scene.

2. STEER. Every scene has a hidden objective. Improvise freely around the player's choices, but every reply must move the situation closer to that objective or raise the cost of avoiding it. Never wander to new locations outside the scene.

3. PROSE. Second person, present tense, 80-160 words. Concrete and sensory — sounds, smells, weight, cold. End every narration on pressure: an approaching sound, a closing window, a demand for a decision. NEVER end on resolved calm unless the scene is complete. NEVER ask "what do you do?" — the situation itself must demand action.

4. AGENCY. Honor any plausible player action and let it shape HOW the objective is reached. Reward clever, specific ideas with real advantage. Punish loud, slow, or reckless choices with real cost (health, items, time, threat).

5. THE WORLD PUSHES BACK. If the player attempts something impossible, absurd, or tries to break the fiction ("I find a rocket launcher", "I kill all zombies", talking to you as an AI), do NOT refuse and do NOT lecture. The world simply responds: the action fails realistically or costs them — a lunge from behind, a wasted precious minute, a noise that draws the dead. One sentence of consequence, then press forward in-world.

6. FAILURE IS CONTENT. Small health hits should be common. Serious injury and death are real outcomes of reckless action, especially at high threat. Do not protect the player. When death is earned, deliver it: set outcome to "player-death" and narrate it with weight, not gore-for-gore's-sake.

7. CONTINUITY. Use inventory, conditions, and companions exactly as listed. Companions are people: they speak in their own voices, have their own fears and goals, occasionally push the pace or disagree. Reference the player's past choices (STORY SO FAR) when it lands.

8. THE CLOCK. Time pressure is the spine of this story. Mention the remaining time or the convoy naturally about every third exchange. Every action costs time via timeCost.

9. CHOICES. suggestedActions: exactly 3, verb-first, max 7 words each, meaningfully different (one bold, one cautious, one clever/lateral). Never repeat the previous turn's suggestions verbatim. The player may always type anything else instead.

10. OUTPUT. Respond with ONLY the JSON object described in the task. No markdown fences, no commentary.`;
}

// ── Turn prompt ────────────────────────────────────────────────────

interface TurnContext {
  arc: StoryArc;
  state: WorldState;
  beat: StoryBeat;
  beatNumber: number; // 1-based
  totalBeats: number;
  turnInBeat: number; // player turns already taken in this beat
  beatRecaps: string[];
  recentTranscript: TranscriptEntry[];
  /** null = narrate the opening of this beat (no player action yet). */
  playerAction: string | null;
}

function buildDirectorNote(beat: StoryBeat, turnInBeat: number, playerAction: string | null): string {
  if (playerAction === null) {
    return 'Narrate the OPENING of this scene: the player arriving into the situation described in Setting. Slightly longer is fine (120-180 words). Establish the space, the danger, and the immediate pressure. Do not resolve anything yet.';
  }
  if (turnInBeat < beat.minTurns) {
    return `Develop the scene. Do NOT complete the objective yet — the player needs at least ${beat.minTurns - turnInBeat} more exchange(s) of struggle first. Outcome must be "continue" unless the player earns death.`;
  }
  if (turnInBeat >= beat.maxTurns) {
    return 'FORCE RESOLUTION NOW. The player has lingered too long. This turn, the world closes in and drives them to the exit condition — if their action resists it, events overtake them (the environment fails, the dead break through, an ally drags them). Set outcome to "objective-complete" unless they die.';
  }
  const idx = Math.min(turnInBeat - beat.minTurns, beat.escalations.length - 1);
  const escalation = beat.escalations[idx] ?? beat.escalations[beat.escalations.length - 1] ?? 'Raise the danger sharply.';
  return `ESCALATE this turn — weave this event in (adapt it to what the player is doing): ${escalation} If the player's action satisfies the exit condition, set outcome to "objective-complete".`;
}

function formatState(state: WorldState): string {
  return JSON.stringify(
    {
      health: `${state.health}/100`,
      hoursUntilConvoyLeaves: state.hoursLeft,
      threatLevel: `${state.threat}/10`,
      inventory: state.inventory,
      companions: state.companions,
      conditions: state.conditions,
      flags: state.flags,
    },
    null,
    2,
  );
}

function formatTranscript(entries: TranscriptEntry[]): string {
  if (entries.length === 0) return '(scene start — no exchanges yet)';
  return entries
    .filter(e => e.role !== 'system')
    .map(e => `${e.role === 'player' ? 'PLAYER' : 'NARRATOR'}: ${e.text}`)
    .join('\n\n');
}

function buildTurnPrompt(ctx: TurnContext): string {
  const { state, beat, beatNumber, totalBeats, turnInBeat, beatRecaps, recentTranscript, playerAction } = ctx;

  const endingBlock = beat.isEnding && beat.guidance
    ? `\nENDING GUIDANCE (this is the FINAL scene — when the objective completes, the narration IS the epilogue):\n${beat.guidance}\n`
    : '';

  return `== WORLD STATE (authoritative) ==
${formatState(state)}

== STORY SO FAR ==
${beatRecaps.length > 0 ? beatRecaps.map((r, i) => `${i + 1}. ${r}`).join('\n') : '(the story is just beginning)'}

== CURRENT SCENE (${beatNumber}/${totalBeats}) — Act ${beat.act}: ${beat.actTitle} — "${beat.title}" ==
Setting: ${beat.scene}
Hidden objective (steer toward this, never state it): ${beat.objective}
Obstacles: ${beat.obstacles.join(' | ')}
Exit condition (what "objective-complete" means): ${beat.exitCondition}
Plausible deaths here: ${beat.failModes.join(' | ')}
${endingBlock}
== RECENT EXCHANGES ==
${formatTranscript(recentTranscript)}

== DIRECTOR NOTE (follow this) ==
${buildDirectorNote(beat, turnInBeat, playerAction)}

== PLAYER ACTION ==
${playerAction === null ? '(none — this is the scene opening)' : `"${playerAction}"`}

Respond with ONLY this JSON object (no markdown fences):
{
  "narration": "second-person present-tense narration per the rules",
  "healthDelta": <integer, negative for damage, 0 if unharmed, small positive only for treatment/rest>,
  "timeCost": <hours this exchange consumed, 0.1 to 2, usually 0.25-0.75>,
  "threat": <new local threat level 0-10 after this exchange>,
  "addItems": ["items gained, if any"],
  "removeItems": ["items lost/used up, if any"],
  "addCompanions": ["people who joined, if any"],
  "removeCompanions": ["people who left/died, if any"],
  "addConditions": ["new injuries/afflictions, if any"],
  "removeConditions": ["conditions resolved, if any"],
  "setFlags": {"flagName": true},
  "outcome": "continue" | "objective-complete" | "player-death",
  "suggestedActions": ["three verb-first options"]
}`;
}

// ── Response parsing & validation ──────────────────────────────────

function stripFences(raw: string): string {
  return raw.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
}

function extractObject(raw: string): Record<string, unknown> | null {
  const stripped = stripFences(raw);
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function toNumber(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toStringArray(v: unknown, maxItems: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === 'string')
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.length <= 60)
    .slice(0, maxItems);
}

function toFlags(v: unknown): Record<string, boolean> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return {};
  const out: Record<string, boolean> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === 'boolean' && k.length <= 40) out[k] = val;
  }
  return out;
}

/** Parse + clamp the model's raw response into a safe TurnResult. Throws if narration is unusable. */
function validateTurn(raw: Record<string, unknown>, ctx: TurnContext): StoryTurnResult {
  const narration = typeof raw.narration === 'string' ? raw.narration.trim() : '';
  if (!narration) throw new Error('Model returned no narration');

  let outcome: TurnOutcome = 'continue';
  if (raw.outcome === 'objective-complete' || raw.outcome === 'player-death') outcome = raw.outcome;

  // The engine, not the model, gates beat completion: too early → downgrade to continue.
  if (outcome === 'objective-complete' && ctx.playerAction !== null && ctx.turnInBeat < ctx.beat.minTurns) {
    outcome = 'continue';
  }
  // Scene openings never complete or kill.
  if (ctx.playerAction === null) outcome = 'continue';

  const delta: TurnDelta = {
    healthDelta: clamp(Math.round(toNumber(raw.healthDelta, 0)), -45, 25),
    timeCost: ctx.playerAction === null ? 0 : clamp(toNumber(raw.timeCost, 0.5), 0.1, 2),
    threat: clamp(Math.round(toNumber(raw.threat, ctx.state.threat)), 0, 10),
    addItems: toStringArray(raw.addItems, 4),
    removeItems: toStringArray(raw.removeItems, 4),
    addCompanions: toStringArray(raw.addCompanions, 2),
    removeCompanions: toStringArray(raw.removeCompanions, 2),
    addConditions: toStringArray(raw.addConditions, 3),
    removeConditions: toStringArray(raw.removeConditions, 3),
    setFlags: toFlags(raw.setFlags),
  };

  let suggestedActions = toStringArray(raw.suggestedActions, 3);
  if (suggestedActions.length < 3) {
    suggestedActions = [...suggestedActions, 'Press forward carefully', 'Stop and listen', 'Look for another way'].slice(0, 3);
  }

  return { narration, delta, outcome, suggestedActions };
}

/** Apply a validated delta to state, immutably. */
export function applyDelta(state: WorldState, delta: TurnDelta): WorldState {
  const removeSet = new Set(delta.removeItems.map(s => s.toLowerCase()));
  const removeComp = new Set(delta.removeCompanions.map(s => s.toLowerCase()));
  const removeCond = new Set(delta.removeConditions.map(s => s.toLowerCase()));

  const inventory = [
    ...state.inventory.filter(i => !removeSet.has(i.toLowerCase())),
    ...delta.addItems.filter(i => !state.inventory.some(x => x.toLowerCase() === i.toLowerCase())),
  ].slice(0, 12);

  const companions = [
    ...state.companions.filter(c => !removeComp.has(c.toLowerCase())),
    ...delta.addCompanions.filter(c => !state.companions.some(x => x.toLowerCase() === c.toLowerCase())),
  ].slice(0, 3);

  const conditions = [
    ...state.conditions.filter(c => !removeCond.has(c.toLowerCase())),
    ...delta.addConditions.filter(c => !state.conditions.some(x => x.toLowerCase() === c.toLowerCase())),
  ].slice(0, 6);

  return {
    health: clamp(state.health + delta.healthDelta, 0, 100),
    hoursLeft: Math.max(0, Math.round((state.hoursLeft - delta.timeCost) * 4) / 4),
    threat: delta.threat,
    inventory,
    companions,
    conditions,
    flags: { ...state.flags, ...delta.setFlags },
  };
}

// ── The turn call ──────────────────────────────────────────────────

export async function playTurn(ctx: TurnContext): Promise<StoryTurnResult> {
  const model = getStoryModel({
    systemInstruction: buildSystemInstruction(ctx.arc),
    generationConfig: { responseMimeType: 'application/json', temperature: 0.95 },
  });

  const prompt = buildTurnPrompt(ctx);

  // One retry on parse failure — flaky JSON is the most common failure mode.
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await model.generateContent(prompt);
    const parsed = extractObject(result.response.text());
    if (parsed) {
      try {
        return validateTurn(parsed, ctx);
      } catch {
        // fall through to retry
      }
    }
  }
  throw new Error('The narrator lost the thread. Try that action again.');
}
