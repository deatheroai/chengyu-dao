import type { Adventure, Beat } from "./adventures";
import { wordsFor } from "./expansion";
import type { NextBeat } from "./partnerApi";
import { SENSE_IDS, type SenseId } from "./senses";

/** Child turns per story. Start short; raise it as stories grow. */
export const TURNS = 3;

function beatToNext(beat: Beat): NextBeat {
  const hints = {} as Record<SenseId, string[]>;
  for (const s of SENSE_IDS) hints[s] = wordsFor(beat, s).slice(0, 3);
  return { line: beat.partner, question: beat.prompt, hints };
}

const NO_HINTS = (): Record<SenseId, string[]> => {
  const hints = {} as Record<SenseId, string[]>;
  for (const s of SENSE_IDS) hints[s] = [];
  return hints;
};

/** 团团's opening for a ready-made adventure. */
export function openingBeat(adventure: Adventure): NextBeat {
  return beatToNext(adventure.beats[0]);
}

/** Lines 团团 uses to keep a child's own story going when AI is unavailable. */
const GENERIC_BEATS: Beat[] = [
  {
    partner: "忽然，发生了一件意想不到的事……",
    prompt: "发生了什么事？",
    starters: [],
    words: {},
    example: { plain: "", rich: "" },
  },
  {
    partner: "大家想了想，决定一起想办法。",
    prompt: "他们想了什么办法？",
    starters: [],
    words: {},
    example: { plain: "", rich: "" },
  },
];

/**
 * The pre-written next beat after child turn `finishedTurn` (0-based),
 * used when AI is off or fails. After the last turn it is the ending.
 */
export function scriptedNext(adventure: Adventure | undefined, finishedTurn: number): NextBeat {
  if (finishedTurn + 1 >= TURNS) {
    return { line: adventure?.ending ?? "就这样，这个故事有了一个快乐的结局。", question: "", hints: NO_HINTS() };
  }
  const beat = adventure?.beats[finishedTurn + 1] ?? GENERIC_BEATS[finishedTurn % GENERIC_BEATS.length];
  return beatToNext(beat);
}

/** A random mission, avoiding senses the sentence already uses (unless that's all of them). */
export function pickMission(exclude: SenseId[], rand: () => number = Math.random): SenseId {
  const open = SENSE_IDS.filter((s) => !exclude.includes(s));
  const pool = open.length ? open : SENSE_IDS;
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
}

/**
 * Total wheel rotation (degrees) so slot `index` of `slots` ends under
 * the pointer at the top, spinning forward from `current` by at least
 * three full turns. Slot i is centred at i * (360 / slots) degrees.
 */
export function wheelRotation(current: number, index: number, slots = SENSE_IDS.length): number {
  const target = (360 - index * (360 / slots)) % 360;
  const base = current - (((current % 360) + 360) % 360);
  let next = base + target + 3 * 360;
  if (next - current < 3 * 360) next += 360;
  return next;
}
