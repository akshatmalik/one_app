// Story engine types.
//
// The core idea: the LLM is NOT the game. A deterministic engine owns the
// world state and an authored "story spine" of beats; the LLM only narrates
// the current beat and proposes state changes, which the engine validates.

/** Authoritative game state. Lives in code, never inside the model's memory. */
export interface WorldState {
  /** 0-100. 0 = death. */
  health: number;
  /** In-game hours until the evacuation convoy leaves. 0 = fail state. */
  hoursLeft: number;
  /** 0-10 local danger level. Drives how punishing the narrator is. */
  threat: number;
  inventory: string[];
  companions: string[];
  /** Per-companion trust, 0-10. New companions start at 5. */
  trust: Record<string, number>;
  /** Ongoing afflictions, e.g. "sprained ankle", "bitten". */
  conditions: string[];
  /** Arc-logic booleans, e.g. mayaJoined, gotMeds, samBiteKnown. */
  flags: Record<string, boolean>;
}

/** One authored scene. The LLM improvises freely WITHIN a beat; the engine decides transitions. */
export interface StoryBeat {
  id: string;
  act: number;
  actTitle: string;
  /** Player-visible scene title (HUD). */
  title: string;
  /** GM-facing setting description. */
  scene: string;
  /** The hidden goal the GM steers every exchange toward. */
  objective: string;
  obstacles: string[];
  /** Director escalations, injected in order as the player stalls. */
  escalations: string[];
  /** What counts as objective-complete. */
  exitCondition: string;
  /** Ways the player can plausibly die/fail here. */
  failModes: string[];
  /** The model may not complete the beat before this many player turns. */
  minTurns: number;
  /** After this many turns the director forces resolution. */
  maxTurns: number;
  /** One-line recap once completed (feeds "story so far"). */
  summary: string;
  /** Terminal beat: objective-complete = the ending epilogue. */
  isEnding?: boolean;
  /** Extra GM guidance (e.g. how to pick an ending from flags). */
  guidance?: string;
}

/** A named ending, resolved deterministically from the final state. */
export interface EndingVariant {
  id: string;
  title: string;
  /** One-line inscription shown on the ending screen and in the gallery. */
  epitaph: string;
  /** Shown in the gallery while the ending is still locked. */
  hint: string;
  /** First matching ending (in arc order) wins. The last ending must always match. */
  condition: (state: WorldState, deathCount: number) => boolean;
}

export interface StoryArc {
  id: string;
  title: string;
  tagline: string;
  /** Player-facing premise for the start screen. */
  premise: string;
  openingState: WorldState;
  beats: StoryBeat[];
  /** Ordered ending variants — first condition match wins. */
  endings: EndingVariant[];
}

export type TurnOutcome = 'continue' | 'objective-complete' | 'player-death';

// ── Fate ─────────────────────────────────────────────────────────────
// The engine rolls a d20 for every player action BEFORE calling the model.
// The roll tells the narrator how well the attempt goes — tabletop physics
// the model must honor, so identical actions genuinely play out differently.

export type FateBand = 'disaster' | 'setback' | 'mixed' | 'clean' | 'triumph';

export interface FateRoll {
  /** 1-20. */
  roll: number;
  band: FateBand;
}

/** Validated, clamped state changes for one turn. */
export interface TurnDelta {
  healthDelta: number;
  timeCost: number;
  threat: number;
  addItems: string[];
  removeItems: string[];
  addCompanions: string[];
  removeCompanions: string[];
  addConditions: string[];
  removeConditions: string[];
  setFlags: Record<string, boolean>;
  /** Companion trust nudges, each clamped to -2..+2. */
  trustDeltas: Record<string, number>;
}

export interface StoryTurnResult {
  narration: string;
  delta: TurnDelta;
  outcome: TurnOutcome;
  suggestedActions: string[];
}

/** A compact, player-visible consequence of a turn ("-12 health", "+ crowbar"). */
export interface TurnEffect {
  text: string;
  tone: 'good' | 'bad' | 'neutral';
}

export interface TranscriptEntry {
  id: string;
  role: 'narrator' | 'player' | 'system';
  text: string;
  beatId: string;
  /** The fate roll behind a player action (player entries only). */
  fate?: FateRoll;
  /** What this turn cost/gained (narrator entries only). */
  effects?: TurnEffect[];
}

export type GameStatus = 'playing' | 'dead' | 'ended';

/** Snapshot taken at beat entry — death restarts here, not at the story start. */
export interface Checkpoint {
  state: WorldState;
  transcriptLength: number;
}

export interface StorySave {
  version: 1;
  arcId: string;
  state: WorldState;
  beatIndex: number;
  /** Player turns taken inside the current beat. */
  turnInBeat: number;
  transcript: TranscriptEntry[];
  checkpoint: Checkpoint;
  /** One-line recaps of completed beats — the model's long-term memory. */
  beatRecaps: string[];
  status: GameStatus;
  deathCause?: string;
  suggestedActions: string[];
  deathCount: number;
  /** Optional protagonist name — companions use it. */
  playerName?: string;
  /** Which EndingVariant this run earned (set when status becomes 'ended'). */
  endingId?: string;
  startedAt: string;
  updatedAt: string;
}

/** A run parked in the browser's story library — resumable any time. */
export interface ArchivedStory {
  id: string;
  archivedAt: string;
  save: StorySave;
}
