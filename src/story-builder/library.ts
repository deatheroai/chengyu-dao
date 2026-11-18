import { cleanStoryFeedback, type StoryFeedback } from "./feedback";
import type { SenseId } from "./senses";

/** One line of a finished story: who wrote it and, for the child's
 * lines, how it grew in the five-senses step. */
export interface StoryLine {
  by: "partner" | "child";
  text: string;
  /** Child lines only: the sentence before the mission. */
  plain?: string;
  /** Child lines only: the mission they spun, and whether they did it. */
  mission?: SenseId;
  missionDone?: boolean;
}

export interface SavedStory {
  id: string;
  adventureId: string;
  title: string;
  savedAt: number;
  lines: StoryLine[];
  /** The 好词卡 shown at the end. Older stories have none: the page
   * builds one offline for them. */
  feedback?: StoryFeedback;
}

const KEY = "chengyu-dao:story-builder:library:v1";
const MAX_STORIES = 30;

function storage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function isLine(x: unknown): x is StoryLine {
  const l = x as StoryLine;
  return !!l && (l.by === "partner" || l.by === "child") && typeof l.text === "string";
}

function isStory(x: unknown): x is SavedStory {
  const s = x as SavedStory;
  return (
    !!s &&
    typeof s.id === "string" &&
    typeof s.title === "string" &&
    typeof s.savedAt === "number" &&
    Array.isArray(s.lines) &&
    s.lines.every(isLine)
  );
}

/** Saved stories, newest first. Bad or missing data reads as empty. */
export function loadLibrary(): SavedStory[] {
  try {
    const raw = storage()?.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStory).map((s) => {
      const feedback = cleanStoryFeedback(s.feedback);
      const { feedback: _drop, ...rest } = s;
      return feedback ? { ...rest, feedback } : rest;
    });
  } catch {
    return [];
  }
}

/** Saves (or replaces, by id) a story at the front; keeps the newest 30. */
export function saveStory(story: SavedStory): SavedStory[] {
  const next = [story, ...loadLibrary().filter((s) => s.id !== story.id)].slice(0, MAX_STORIES);
  try {
    storage()?.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked: the story still shows on screen */
  }
  return next;
}

/** Replaces a saved story in place (keeps its spot in the list). */
export function updateStory(story: SavedStory): SavedStory[] {
  const next = loadLibrary().map((s) => (s.id === story.id ? story : s));
  try {
    storage()?.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function deleteStory(id: string): SavedStory[] {
  const next = loadLibrary().filter((s) => s.id !== id);
  try {
    storage()?.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

/** Plain text of a story, one paragraph. */
export function storyText(lines: StoryLine[]): string {
  return lines.map((l) => l.text).join("");
}
