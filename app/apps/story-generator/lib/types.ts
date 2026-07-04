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

export interface StoryArc {
  id: string;
  title: string;
  tagline: string;
  /** Player-facing premise for the start screen. */
  premise: string;
  openingState: WorldState;
  beats: StoryBeat[];
}

export type TurnOutcome = 'continue' | 'objective-complete' | 'player-death';

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
}

export interface StoryTurnResult {
  narration: string;
  delta: TurnDelta;
  outcome: TurnOutcome;
  suggestedActions: string[];
}

export interface TranscriptEntry {
  id: string;
  role: 'narrator' | 'player' | 'system';
  text: string;
  beatId: string;
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
  startedAt: string;
  updatedAt: string;
}
