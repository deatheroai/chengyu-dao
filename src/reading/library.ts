import { stories as allStories, currentStoryId, type Story, type TargetCharacter } from "./stories";
import type { StoryProgress } from "./progress";

/**
 * The story list (故事目录) and combined revision (复习): every three
 * stories, in the order they appear in `stories`, form a revision set
 * whose characters are tested together in one 默写.
 */
export const REVIEW_GROUP_SIZE = 3;

export interface ReviewGroup {
  /** 1-based, in story order. */
  number: number;
  /** Progress key for this revision's saved score. */
  id: string;
  stories: Story[];
}

/** A character to write in the memory test, with the story whose
 * sentence it is blanked in. */
export interface TestItem {
  story: Story;
  target: TargetCharacter;
}

/** Stories in sets of three. The last set may be short; it has no
 * revision until it is full (see `isComplete`). */
export function storyGroups(stories: readonly Story[] = allStories): ReviewGroup[] {
  const groups: ReviewGroup[] = [];
  for (let i = 0; i < stories.length; i += REVIEW_GROUP_SIZE) {
    const number = groups.length + 1;
    groups.push({ number, id: `review-${number}`, stories: stories.slice(i, i + REVIEW_GROUP_SIZE) });
  }
  return groups;
}

export function isComplete(group: ReviewGroup): boolean {
  return group.stories.length === REVIEW_GROUP_SIZE;
}

export function reviewItems(group: ReviewGroup): TestItem[] {
  return group.stories.flatMap((story) => story.targets.map((target) => ({ story, target })));
}

export type Page =
  | { kind: "story"; story: Story; /** characters to open in practice */ practise: string[] }
  | { kind: "review"; group: ReviewGroup };

/**
 * Which page the URL asks for: `?story=<id>` (optionally with
 * `&practise=<chars>`), `?review=<n>` for a full revision set, or the
 * current story. Unknown ids fall back to the current story.
 */
export function pageFor(search: string, stories: readonly Story[] = allStories): Page {
  const params = new URLSearchParams(search);
  const review = params.get("review");
  if (review !== null) {
    const group = storyGroups(stories).find((g) => String(g.number) === review);
    if (group && isComplete(group)) return { kind: "review", group };
  }
  const story =
    stories.find((s) => s.id === params.get("story")) ??
    stories.find((s) => s.id === currentStoryId) ??
    stories[stories.length - 1];
  const wanted = params.get("practise") ?? "";
  const practise = story.targets.map((t) => t.char).filter((c) => wanted.includes(c));
  return { kind: "story", story, practise };
}

/** Relative links, so they work on preview URLs too. */
export function storyHref(story: Story, practise: string[] = []): string {
  const params = new URLSearchParams({ story: story.id });
  if (practise.length) params.set("practise", practise.join(""));
  return `?${params}`;
}

export function reviewHref(group: ReviewGroup): string {
  return `?review=${group.number}`;
}

/** Total practice stars earned for a story, out of three per character. */
export function starTotal(story: Story, p: StoryProgress): { earned: number; max: number } {
  return {
    earned: story.targets.reduce((sum, t) => sum + (p.stars[t.char] ?? 0), 0),
    max: story.targets.length * 3,
  };
}

const CN_NUMBERS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

/** 复习一, 复习二, … (plain digits past ten). */
export function reviewName(group: ReviewGroup): string {
  return `复习${CN_NUMBERS[group.number] ?? group.number}`;
}
