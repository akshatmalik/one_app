import { StoryArc } from './types';

/**
 * "36 Hours" — the launch arc. Five acts, ten beats, roughly two hours of play.
 *
 * The player wakes on day three of an outbreak and hears the last evacuation
 * convoy leaves Harbor Bridge in 36 in-game hours. Every action costs clock
 * time, so the story physically cannot stall. Flags picked up along the way
 * (Maya, Sam, meds, the Ferrymen) converge in the final two beats and decide
 * the ending.
 */
export const ZOMBIE_ARC: StoryArc = {
  id: 'zombie-36-hours',
  title: '36 Hours',
  tagline: 'The last convoy leaves Harbor Bridge. Be on it.',
  premise:
    "Day three of the outbreak. The power just died in your fourth-floor apartment, and a battery radio is repeating one message: the final evacuation convoy leaves Harbor Bridge in 36 hours. The city between you and that bridge belongs to the dead now. What you carry, who you trust, and how loud you are will decide whether you make it.",
  openingState: {
    health: 100,
    hoursLeft: 36,
    threat: 3,
    inventory: ['kitchen knife', 'half bottle of water'],
    companions: [],
    trust: {},
    conditions: [],
    flags: {},
  },
  beats: [
    // ── ACT I — THE APARTMENT ─────────────────────────────────────
    {
      id: 'a1-wake',
      act: 1,
      actTitle: 'The Apartment',
      title: 'Static and Scratching',
      scene:
        "The player's fourth-floor apartment, day three of the outbreak. Power just cut out. A battery radio catches the evacuation broadcast: last convoy departs Harbor Bridge in 36 hours, then the city is sealed. Down the hall, something is scratching at the stairwell door — slow, patient, wrong. Grey morning light, dead phone, half-empty cupboards.",
      objective:
        'Make the player absorb the goal (Harbor Bridge, 36 hours), grab whatever they can, and commit to leaving the apartment.',
      obstacles: [
        'The scratcher at the stairwell door — noise brings it to their door instead',
        'Almost nothing useful left in the apartment; choosing what to carry matters',
        'Fear: the apartment feels safe. It is not.',
      ],
      escalations: [
        'The scratching becomes banging. A second set of fists joins it. A low moan carries through the wood.',
        "A scream from the floor above, cut off by a heavy thud. Dust sifts from the ceiling. The building is not safe.",
        'The stairwell door frame begins to split. Whatever is out there will be inside the hallway within minutes.',
      ],
      exitCondition:
        'The player steps out of the apartment — hallway, window, or fire escape — with a stated plan to reach the bridge.',
      failModes: [
        'Barricading and waiting until the dead break in with nowhere left to run',
        'Making loud noise that draws the stairwell dead to their door',
      ],
      minTurns: 2,
      maxTurns: 5,
      summary:
        'Caught the evacuation broadcast — last convoy leaves Harbor Bridge in 36 hours — packed what little there was, and left the apartment.',
    },
    {
      id: 'a1-building',
      act: 1,
      actTitle: 'The Apartment',
      title: 'Four Floors Down',
      scene:
        "The building's dark stairwell and corridors. Mr. Okafor's door on the third floor hangs ajar — his radio is still playing inside, and something shuffles in there with it (supplies, and his turned wife). The stairwell below the second floor is choked with a failed furniture barricade. The lobby's glass doors show four or five dead milling on the front steps. A rusting fire escape runs down the rear of the building.",
      objective:
        'Get the player to street level alive — ideally having weighed a risk for supplies on the way down.',
      obstacles: [
        "Okafor's apartment: real supplies guarded by his turned wife — a tempting, dangerous detour",
        'The barricade blocking the lower stairwell',
        'Dead visible at the lobby doors; the fire escape is loose in its bolts',
      ],
      escalations: [
        'The stairwell door above finally gives. The scratcher is in the stairs now, coming down, floor by floor.',
        'Glass shatters somewhere below — the lobby dead are inside the building.',
        'The fire escape groans and drops an inch, bolts tearing loose from old brick. Every route is getting worse.',
      ],
      exitCondition: 'The player reaches the street outside the building.',
      failModes: [
        'Cornered on the stairs between the descending dead and the barricade',
        "Overwhelmed in Okafor's apartment",
        'A fall from the failing fire escape',
      ],
      minTurns: 3,
      maxTurns: 6,
      summary: 'Fought clear of the apartment building and reached the street.',
    },

    // ── ACT II — THE STREETS ──────────────────────────────────────
    {
      id: 'a2-market',
      act: 2,
      actTitle: 'The Streets',
      title: 'The Long Way Round',
      scene:
        'Dawn over the Old Market district. Abandoned cars, doors hanging open, three days of silence. On the main boulevard a horde drifts like a slow grey river — hundreds. Routes toward Fairview Square: the boulevard itself (fast, utterly exposed), the service alleys (tight, blind corners), or the connected rooftops of the old row shops (slow, needs climbing).',
      objective:
        'Cross the district to Fairview Square — where the pharmacy is — without pulling the boulevard horde.',
      obstacles: [
        'The horde: any sustained noise turns the river toward the player',
        'Alleys hide single fast dead behind blind corners',
        'Rooftop gaps require commitment — and dropping down blind',
      ],
      escalations: [
        'Somewhere behind, a car alarm erupts — set off by someone or something. Part of the horde peels toward it, cutting across the player’s intended route.',
        'A military helicopter sweeps low across the district. Every dead head lifts. The river changes course, flooding the side streets.',
        'It starts to rain hard — sound is muffled (an opening), but fire escapes and rooftops turn slick.',
      ],
      exitCondition: 'The player reaches Fairview Square.',
      failModes: [
        'Funneled by the horde into a dead-end and pulled down',
        'A bad fall from the rooftops',
      ],
      minTurns: 3,
      maxTurns: 6,
      summary: 'Crossed the Old Market district under the noses of the boulevard horde and reached Fairview Square.',
    },
    {
      id: 'a2-maya',
      act: 2,
      actTitle: 'The Streets',
      title: 'The Paramedic',
      scene:
        "Fairview Square pharmacy, half-looted. Maya Reyes — a paramedic, late twenties, crowbar, calm eyes, three days awake — has the same idea. She is heading for the bridge too: her sister is already at the muster point. She knows the city's shortcuts. She does not trust easily, and she has watched people do ugly things this week. The good stock (antibiotics, bandages, painkillers) is in the back storeroom — and something is moving behind that door.",
      objective:
        'Get medical supplies out of the storeroom, and settle whether Maya joins the player. Set flags: mayaJoined (if she comes), gotMeds (if they secure medicine).',
      obstacles: [
        "Maya's distrust — threats or selfishness will lose her; competence and decency win her over",
        'The storeroom dead — a former pharmacist, still in his coat',
        'Rough voices outside casing the square — a crew of armed scavengers (foreshadow the Ferrymen; do not start a fight here)',
      ],
      escalations: [
        'The storeroom shelving crashes over. The door starts to shudder. Whatever is in there knows they are outside.',
        "The scavenger voices get closer — laughing, kicking in a shopfront across the square. Maya whispers: 'Ferrymen. We do NOT want to be here when they walk in.'",
        "Maya shoulders her pack: 'I'm gone in sixty seconds, with or without you.'",
      ],
      exitCondition:
        'The player leaves Fairview Square — with or without Maya, with or without meds. Set mayaJoined and gotMeds flags to match what actually happened.',
      failModes: [
        'Swarmed in the cramped storeroom',
        'Caught in the open by the Ferrymen crew',
      ],
      minTurns: 3,
      maxTurns: 7,
      summary: 'The pharmacy at Fairview Square: met Maya Reyes, a paramedic headed for the same bridge.',
    },

    // ── ACT III — THE UNDERGROUND ─────────────────────────────────
    {
      id: 'a3-descent',
      act: 3,
      actTitle: 'The Underground',
      title: 'Down Into the Dark',
      scene:
        'The overrun army checkpoint at Fairview Avenue — the direct surface route to the river is a sea of dead around abandoned barricades. The mouth of Fairview metro station gapes across the street. The tunnels run straight under the district to Riverside — a shortcut that saves hours. But the dark down there is total, and sound carries like a struck bell. A light source is not optional.',
      objective:
        'Get the player to commit to the tunnels, secure a light source (station kiosk, dropped army gear, emergency box), and descend.',
      obstacles: [
        'Total darkness below — going down without light is suicide',
        'The dead around the checkpoint are thick; lingering on the surface draws them',
        'Fear of the tunnels themselves',
      ],
      escalations: [
        'The checkpoint dead begin drifting toward the station mouth — the surface option is closing like a door.',
        'From below: the clatter of a turnstile. Something down there just moved. The dark is not empty.',
      ],
      exitCondition: 'The player descends into the tunnel proper with a working light.',
      failModes: [
        'Descending blind and going off the platform edge',
        'Pinned against the station mouth by the checkpoint horde',
      ],
      minTurns: 2,
      maxTurns: 5,
      summary: 'Took the Fairview metro tunnels — the shortcut under the district — with a scavenged light.',
    },
    {
      id: 'a3-tunnels',
      act: 3,
      actTitle: 'The Underground',
      title: 'What the Dark Keeps',
      scene:
        "The tunnel: dripping water, dead rails, a dark that eats the light three meters out. Halfway to Riverside, a stalled train car glows faintly — a handful of stragglers sheltering inside, too scared to move: an old man (Ibrahim) leading them, a woman with a sprained knee, and Sam — a quiet kid, twelve, keeping his left forearm inside his jacket sleeve. Sam is bitten. Some of the group suspects; nobody has said it aloud. The tunnel beyond the train is partially collapsed — the only way through is THROUGH the train car. Noise discipline is everything down here.",
      objective:
        'Get the player through the survivor camp and out the far side at Riverside station — forcing the Sam problem into the open on the way. Set flags: samJoined (if the kid comes with them), samBiteKnown (if the bite is revealed).',
      obstacles: [
        "The stragglers block the only path and fear strangers",
        "Sam's hidden bite — a moral landmine: expose him, protect him, take him, or walk away",
        'Any loud argument or shot rings down the whole tunnel',
      ],
      escalations: [
        "Sam shivers hard and his sleeve slips — someone in the camp sees the bandage and screams. The argument erupts, echoing down the tunnel both ways.",
        'From the dark behind the player: wet footsteps on gravel, more than one set, closing. The camp lanterns start guttering.',
        "Ibrahim grabs the player's arm: 'Take the boy or leave him — but decide NOW, because we are putting that scream out one way or another.'",
      ],
      exitCondition:
        'The player climbs out at Riverside station. Set samJoined and samBiteKnown to reflect what happened at the camp.',
      failModes: [
        'Swarmed in the dark when the noise peaks',
        'The camp turns on the player in a panic',
      ],
      minTurns: 4,
      maxTurns: 7,
      summary: 'Passed the survivor camp in the tunnels — and the problem of Sam, the bitten kid — and surfaced at Riverside.',
    },

    // ── ACT IV — THE CANAL ────────────────────────────────────────
    {
      id: 'a4-ferrymen',
      act: 4,
      actTitle: 'The Canal',
      title: 'The Toll',
      scene:
        "Riverside. The shipping canal cuts the district off from the harbor side — every road bridge is dropped or burning. The last intact footbridge is held by the Ferrymen: eight armed scavengers running it as a toll gate. The toll is steep — medicine, weapons, or 'a job' (retrieving a locked case from the flooded lock-keeper's house downstream, waist-deep in silt and stuck dead). Alternative: the drained lock gates further down — a slick, narrow catwalk over black mud where dead stand buried to the waist, arms working.",
      objective:
        'Get the player and companions across the canal — by paying, working, talking, or sneaking the lock gates. Set flags: paidToll (if they dealt with the Ferrymen), ferrymenHostile (if it turned violent).',
      obstacles: [
        'The Ferrymen: greedy, organized, not cartoonishly evil — they can be bargained with, but they hold every card at the gate',
        'The toll may cost exactly the supplies the player will want later (meds!)',
        'The lock gates: slippery, loud metal, and the mud dead below the catwalk',
      ],
      escalations: [
        'A Ferryman spots movement and fires a warning shot. The crack rolls across the water — and the dead on both banks begin to drift toward it.',
        "Dusk is coming. The Ferrymen's price doubles at dark, and the lock catwalk becomes lethal without light.",
        'The lock gate machinery groans — the gap in the gates is widening. The sneak route is closing.',
      ],
      exitCondition: 'The player (and companions) are across the canal, on the harbor side.',
      failModes: [
        'Shot by the Ferrymen after a double-cross or open threat',
        'Dragged into the silt from the lock catwalk',
      ],
      minTurns: 3,
      maxTurns: 7,
      summary: 'Crossed the canal — past the Ferrymen and their toll bridge — onto the harbor side.',
    },
    {
      id: 'a4-night',
      act: 4,
      actTitle: 'The Canal',
      title: 'The Long Night',
      scene:
        "Night. The harbor is close but the final stretch is a kill-box in the dark — it must wait for first light. Shelter: a riverside warehouse with one rolling shutter that mostly closes. This is where everything converges. If Sam is here, his fever is peaking and the bite can no longer be hidden. If the player is wounded, wounds are hot and angry — meds matter now. If Maya is here, she coaxes a salvaged radio to life and reaches her sister at the muster: the gate closes two hours after dawn, no exceptions, screening for bites. Around 3 a.m., something starts testing the shutter.",
      objective:
        'Carry the player through a quiet, human night scene — decisions about meds, Sam, and trust — then survive the 3 a.m. breach and leave at first light.',
      obstacles: [
        'Triage: if meds exist, who gets them — the player’s wounds or Sam’s fever (which meds cannot cure)?',
        'Exhaustion: the player has been moving for a day and a half',
        'The breach: the shutter will not hold all night',
      ],
      escalations: [
        'The shutter rattles once, deliberately. Then again. Fingers appear under the bottom edge.',
        "If Sam is present: his fever spikes — he whispers what everyone knows: 'It's getting worse. You should decide before morning.' If not: Maya (or the radio, or the player's own wounds) forces the dawn-deadline reality into the open.",
        'The shutter gives with a shriek of metal. Dark shapes wedge into the gap. The night ends NOW — fight the breach or run into the dark early.',
      ],
      exitCondition: 'First light: the player leaves the warehouse for the final approach to Harbor Bridge.',
      failModes: [
        'The breach overruns the warehouse',
        'An untreated wound or the sleeping decision about Sam going as wrong as it can go',
      ],
      minTurns: 3,
      maxTurns: 6,
      summary: 'Survived the long night in the riverside warehouse and set out for the bridge at first light.',
    },

    // ── ACT V — HARBOR BRIDGE ─────────────────────────────────────
    {
      id: 'a5-gauntlet',
      act: 5,
      actTitle: 'Harbor Bridge',
      title: 'The Bridge Run',
      scene:
        'Dawn. The bridge approach is a funnel of stopped cars, and between the player and the barricade gate is a horde — drawn all night by the convoy engines idling behind the wall. A flare arcs up from the barricade: the one-hour signal. Options that exist in the world: the under-deck maintenance walkway (Maya knows the access hatch, if she is here), a diversion (car alarms, a fire, thrown noise), or the straight sprint through the gaps.',
      objective:
        'The final set-piece: get the player (and companions) through the horde funnel to the barricade gate. Spend their remaining resources. Make companions matter.',
      obstacles: [
        'The horde between the cars — too many to fight, only to slip or divert',
        'The under-deck walkway is missing a section — a gap over black water',
        'A companion stumbles at the worst moment — help costs time, leaving costs more',
      ],
      escalations: [
        'The convoy sounds its horns — final call. The horde surges toward the sound, compressing the funnel.',
        'Gunfire from the barricade starts thinning the front of the horde — and drawing every dead thing on the waterfront toward the bridge.',
        'The flare gutters out. The gate begins, visibly, to close.',
      ],
      exitCondition: 'The player reaches the barricade gate.',
      failModes: [
        'Pulled down in the crush between the cars',
        'A fall from the under-deck walkway',
        'Going back for someone and not making it out of the surge',
      ],
      minTurns: 3,
      maxTurns: 6,
      summary: 'Ran the gauntlet of the bridge approach and reached the barricade gate.',
    },
    {
      id: 'a5-gate',
      act: 5,
      actTitle: 'Harbor Bridge',
      title: 'The Screening',
      scene:
        "The barricade gate. Soldiers with rifles and a medic with blue gloves: everyone boarding is screened for bites, sleeves up, no exceptions. Beyond the wire: buses, boats, engines running — the way out. If Maya is here, her sister is pressed against the fence calling her name. If Sam is here, his bandaged forearm is a countdown standing in line. If the player carries a bite, the medic's gloves are coming for their sleeve too.",
      objective:
        'Resolve the story. Play the screening honestly against the flags and conditions, let the player make their final choice, then end the story with a 150-220 word epilogue.',
      obstacles: [
        'The screening cannot be talked around — only smuggled past, sacrificed to, or accepted',
        'Time: the gate is minutes from closing',
      ],
      escalations: [
        "The line compresses. Two soldiers drag a screaming man out of the queue — he hid a bite under his watch strap. The medic's eyes move to the player's group next.",
      ],
      exitCondition: 'The story ends — an epilogue is delivered.',
      failModes: [
        'A hidden bite discovered at the wire, at rifle range',
        'The gate closing with the player on the wrong side',
      ],
      minTurns: 2,
      maxTurns: 4,
      isEnding: true,
      guidance:
        "Choose the ending the flags and conditions have earned. Examples: clean escape (no bites, companions alive) — quiet, exhausted relief, the city shrinking behind the boat; bittersweet (Sam present) — the screening finds him; the player chooses to plead, smuggle, stay behind with him, or let him go, and the epilogue honors that choice without judging it; the player bitten — refusal at the wire: a last look at the boats, and what they do with their remaining hours; Maya's reunion — small, human, worth the whole trip. Do NOT invent a cure or a miracle. The epilogue is 150-220 words, second person, past-tense final line permitted. It should feel EARNED by this specific playthrough: reference at least two concrete things the player actually did.",
      summary: 'Reached the screening at the barricade gate — the end of the road.',
    },
  ],

  // ── Endings — first matching condition wins ─────────────────────
  // Resolved by the engine from the final state, so every run gets a
  // named ending it actually earned. The gallery persists across runs.
  endings: [
    {
      id: 'hollow-dawn',
      title: 'The Hollow Dawn',
      epitaph: 'You reached the wire. The wire is as far as you go.',
      hint: 'Carry the one wound the screening cannot forgive.',
      condition: state => state.conditions.some(c => c.toLowerCase().includes('bit')),
    },
    {
      id: 'no-one-left-behind',
      title: 'No One Left Behind',
      epitaph: 'Everyone you chose to carry, you carried all the way.',
      hint: 'Bring them both to the gate — the paramedic and the boy.',
      condition: state =>
        state.companions.some(c => c.toLowerCase().includes('maya')) &&
        state.companions.some(c => c.toLowerCase().includes('sam')),
    },
    {
      id: 'the-weight',
      title: 'The Weight of the Wire',
      epitaph: 'You got out. Part of you stayed in that line.',
      hint: 'Take the boy under your wing — and lose him before the end.',
      condition: state =>
        state.flags.samJoined === true &&
        !state.companions.some(c => c.toLowerCase().includes('sam')),
    },
    {
      id: 'two-sisters',
      title: 'Two Sisters',
      epitaph: 'Some reunions are worth an entire burning city.',
      hint: 'Earn the paramedic’s trust and walk her home.',
      condition: state =>
        state.companions.some(c => c.toLowerCase().includes('maya')),
    },
    {
      id: 'ghost-of-harbor-bridge',
      title: 'The Ghost of Harbor Bridge',
      epitaph: 'Thirty-six hours, one set of footprints.',
      hint: 'Cross the whole city without letting a single soul attach to yours.',
      condition: state =>
        state.companions.length === 0 && !state.flags.mayaJoined && !state.flags.samJoined,
    },
    {
      id: 'clean-run',
      title: 'The Clean Run',
      epitaph: 'The city took its shot at you. It missed.',
      hint: 'Arrive strong, early, and barely scratched.',
      condition: state => state.health >= 75 && state.hoursLeft >= 6,
    },
    {
      id: 'by-a-thread',
      title: 'By a Thread',
      epitaph: 'Whatever was left of you is what got on that boat.',
      hint: 'Make it — but only just.',
      condition: (state, deathCount) => state.health <= 30 || deathCount >= 3,
    },
    {
      id: 'the-crossing',
      title: 'The Crossing',
      epitaph: 'You did what the broadcast asked: you were on it.',
      hint: 'Reach the far side of thirty-six hours.',
      condition: () => true,
    },
  ],
};
