import type { Adventure, Beat } from "./adventures";
import { wordsFor } from "./expansion";
import type { NextBeat } from "./partnerApi";
import { SENSE_IDS, type SenseId } from "./senses";

/** Turns per story. Start short; raise it as stories grow. */
export const TURNS = 3;

/**
 * After this turn (0-based), 团团 offers three ways the story could go
 * and the child picks one, instead of 团团 just writing the next line.
 * The middle of the story: never the opening, never the ending.
 */
export const CHOICE_AFTER_TURN = 0;

/** True when 团团's next line, after turn `finishedTurn`, is a choice. */
export const isChoiceTurn = (finishedTurn: number): boolean =>
  finishedTurn === CHOICE_AFTER_TURN && finishedTurn + 1 < TURNS;

function beatToNext(beat: Beat): NextBeat {
  const hints = {} as Record<SenseId, string[]>;
  for (const s of SENSE_IDS) hints[s] = wordsFor(beat, s).slice(0, 3);
  const guide = { explain: beat.explain, starters: beat.starters, ...(beat.example.rich ? { example: beat.example.rich } : {}) };
  return { line: beat.partner, question: beat.prompt, hints, ...(beat.word ? { word: beat.word } : {}), guide };
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
    explain: "想一个让大家吓一跳的事：谁来了？东西不见了？突然下雨了？",
    starters: ["突然", "原来是", "大家看见"],
    words: {},
    example: { plain: "", rich: "" },
  },
  {
    partner: "大家想了想，决定一起想办法。",
    prompt: "他们想了什么办法？",
    explain: "他们遇到了问题。可以请谁帮忙？可以用什么东西？最后成功了吗？",
    starters: ["他们决定", "有人说", "大家一起"],
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

/** Other ways a child's own story can go when AI is unavailable. */
const GENERIC_CHOICES: NonNullable<Beat["choices"]> = [
  {
    partner: "这时候，来了一个新朋友。",
    prompt: "新朋友是谁？它想做什么？",
    explain: "新朋友可以是同学、邻居或者一只小猫。他叫什么名字？他来做什么？",
    starters: ["新朋友是", "他笑着说", "原来"],
  },
  {
    partner: "突然，下起了一场倾盆大雨！",
    prompt: "下雨了，大家怎么办？",
    explain: "雨下得很大！大家跑去哪里躲雨？有没有带雨伞？身上湿了吗？",
    starters: ["大家赶紧", "雨点", "我们跑到"],
    word: { word: "倾盆大雨", meaning: "雨非常大，好像有人用盆把水倒下来。" },
  },
];

/**
 * 团团's three pre-written choices after turn `finishedTurn`: the usual
 * next beat plus its alternatives, all sharing that beat's hints.
 */
export function scriptedChoices(adventure: Adventure | undefined, finishedTurn: number): NextBeat[] {
  const main = scriptedNext(adventure, finishedTurn);
  const beat = adventure?.beats[finishedTurn + 1];
  const others = beat ? (beat.choices ?? []) : GENERIC_CHOICES;
  return [
    main,
    ...others.map((c) => ({
      line: c.partner,
      question: c.prompt,
      hints: main.hints,
      ...(c.word ? { word: c.word } : {}),
      guide: { explain: c.explain, starters: c.starters },
    })),
  ];
}

/** A shuffled copy, so 团团's usual line isn't always first. */
export function shuffled<T>(items: T[], rand: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rand() * (i + 1)));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
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
