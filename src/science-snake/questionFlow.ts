import type { Position } from "./snakeGrid";
import { GRID_WIDTH, GRID_HEIGHT, TICK_MS } from "./snakeGrid";

/**
 * Pure rules for the main board's question phase (BACKLOG.md's
 * "Redesign: question apples, ANSWER door + answer room" entry). Eating
 * a science item starts it: the question appears one 4-6 word phrase at
 * a time, each on its own apple, and builds up in the bar as the snake
 * eats it — the same way the answer room's words do (it replaced three
 * numbered apples, per "the player is just chasing after numbers and not
 * reading the question"). After the last phrase an A-N-S-W-E-R door
 * appears that leads into the answer room. Same pure-function-plus-
 * thin-Scene split as everything else here — SnakeGameScene.ts only
 * calls these.
 */

function key(p: Position): string {
  return `${p.x},${p.y}`;
}

/** Shortest distance between two cells on the wrapping main board. */
export function boardDistance(a: Position, b: Position): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.min(dx, GRID_WIDTH - dx) + Math.min(dy, GRID_HEIGHT - dy);
}

/** The board slows down while a question is open — reading time, not racing time. */
export const QUESTION_TICK_MS = Math.round(TICK_MS * 1.45);

export const ANSWER_DOOR_WORD = "ANSWER";

/** The door lands at least this far from the head, so it can't be entered before the child has seen it. */
export const MIN_DISTANCE_FROM_HEAD = 4;

/** Question phrases: 4-6 words each (per "4-6 words is a good start"), up to 8 to avoid leaving a 1-2 word scrap behind. */
export const PHRASE_MIN_WORDS = 4;
export const PHRASE_MAX_WORDS = 6;
const PHRASE_HARD_MAX_WORDS = 8;
/** A phrase prefers to end before one of these (joining words and prepositions), so it reads as a natural chunk. */
const BREAK_BEFORE = new Set([
  "and", "but", "because", "so", "when", "while", "after", "before", "then", "where", "even", "until", "if", "which", "that",
  "of", "in", "on", "at", "to", "with", "from", "into", "onto", "under", "across", "over", "for", "near", "beside", "during",
  "without", "inside", "by", "out",
]);

const endsClause = (word: string): boolean => /[,;:]$/.test(word);

/**
 * Cuts a question into the phrases the snake eats one at a time — the
 * question's own words, unchanged and in order (joining the phrases with
 * spaces gives the prompt back exactly). Each sentence is cut on its
 * own, so a phrase never runs across a full stop. Within one, a phrase
 * ends once it has 4 words and reaches a comma or the word before a
 * joining word or preposition ("and", "because", "in", "of"…); at 6
 * words it ends anyway — unless such a natural break is only one or two
 * words further on, so "a toy robot ‖ dog" or "ice cube out ‖ of the
 * freezer" don't happen — and it never leaves a 1-2 word scrap behind
 * if they fit together in 8. A short sentence ("Explain why.") stays
 * whole.
 */
export function splitIntoPhrases(prompt: string): string[] {
  const sentences = prompt.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) ?? [prompt];
  const phrases: string[] = [];
  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/).filter(Boolean);
    const naturalBreakAfter = (i: number): boolean =>
      i === words.length - 1 || endsClause(words[i]) || BREAK_BEFORE.has(words[i + 1].toLowerCase());
    let chunk: string[] = [];
    words.forEach((word, i) => {
      chunk.push(word);
      const remaining = words.length - i - 1;
      if (remaining === 0) return;
      let wantsBreak = chunk.length >= PHRASE_MIN_WORDS && naturalBreakAfter(i);
      if (!wantsBreak && chunk.length >= PHRASE_MAX_WORDS) {
        const breakSoon = [1, 2].some((k) => i + k < words.length && chunk.length + k <= PHRASE_HARD_MAX_WORDS && naturalBreakAfter(i + k));
        wantsBreak = !breakSoon || chunk.length >= PHRASE_HARD_MAX_WORDS;
      }
      const wouldStrand = remaining < 3 && chunk.length + remaining <= PHRASE_HARD_MAX_WORDS;
      if (wantsBreak && !wouldStrand) {
        phrases.push(chunk.join(" "));
        chunk = [];
      }
    });
    if (chunk.length) phrases.push(chunk.join(" "));
  }
  return phrases;
}

/** A new phrase apple lands this far from the head — a quick snack, never across the board. */
export const PHRASE_SPAWN_MIN_DISTANCE = 3;
export const PHRASE_SPAWN_MAX_DISTANCE = 7;

/**
 * Where the next question phrase appears: a free cell a few steps from
 * the head (anywhere free, as a fallback on a crowded board), and never
 * straight ahead in the head's own row or column within 2 cells — so it
 * can't be eaten before the child has read it.
 */
export function placePhraseApple(occupied: Position[], head: Position, rng: () => number): Position | null {
  const taken = new Set(occupied.map(key));
  const near: Position[] = [];
  const anywhere: Position[] = [];
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const p = { x, y };
      if (taken.has(key(p))) continue;
      const distance = boardDistance(p, head);
      if (distance < PHRASE_SPAWN_MIN_DISTANCE) continue;
      anywhere.push(p);
      if (distance <= PHRASE_SPAWN_MAX_DISTANCE) near.push(p);
    }
  }
  const pool = near.length ? near : anywhere;
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)];
}

/**
 * The A-N-S-W-E-R door: six free cells in a row (no wrapping round the
 * edge), all at least `MIN_DISTANCE_FROM_HEAD` from the head and not on
 * the head's own row — so it can't be driven straight into the moment
 * it appears. The rows two above and two below its middle are kept clear
 * too, ready for the golden apples that will sit there. Null if no such
 * spot exists (a very crowded board); the scene tries again next step.
 */
export function placeAnswerDoor(occupied: Position[], head: Position, rng: () => number): Position[] | null {
  const taken = new Set(occupied.map(key));
  const width = ANSWER_DOOR_WORD.length;
  const spots: Position[][] = [];
  for (let y = 2; y < GRID_HEIGHT - 2; y++) {
    if (y === head.y) continue;
    for (let x = 0; x + width <= GRID_WIDTH; x++) {
      const cells = Array.from({ length: width }, (_, i) => ({ x: x + i, y }));
      if (cells.some((c) => taken.has(key(c)) || boardDistance(c, head) < MIN_DISTANCE_FROM_HEAD)) continue;
      const mid = Math.floor(x + width / 2);
      if (taken.has(key({ x: mid, y: y - 2 })) || taken.has(key({ x: mid, y: y + 2 }))) continue;
      spots.push(cells);
    }
  }
  if (spots.length === 0) return null;
  return spots[Math.floor(rng() * spots.length)];
}

/**
 * The two golden apples: two rows above and two below the door's middle
 * letter, with a one-cell gap so a child heading for the door doesn't
 * bite one by accident. `placeAnswerDoor` keeps both cells free.
 */
export function goldenAppleCells(door: Position[]): Position[] {
  const mid = door[Math.floor(door.length / 2)];
  return [
    { x: mid.x, y: mid.y - 2 },
    { x: mid.x, y: mid.y + 2 },
  ];
}

export function isOnCells(cells: Position[], p: Position): boolean {
  return cells.some((c) => c.x === p.x && c.y === p.y);
}
