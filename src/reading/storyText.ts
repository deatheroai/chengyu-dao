import type { Story, TargetCharacter } from "./stories";

export type StorySegment =
  | { kind: "text"; text: string }
  | { kind: "target"; text: string; target: TargetCharacter };

/**
 * Splits the story into plain-text runs and target words, so the
 * reading view can highlight each target word (with the character to
 * learn marked inside it). Each target is highlighted at its first
 * occurrence only.
 */
export function segmentStory(story: Story): StorySegment[] {
  const hits: { start: number; target: TargetCharacter }[] = [];
  for (const target of story.targets) {
    const start = story.text.indexOf(target.word);
    if (start === -1) continue;
    const overlaps = hits.some(
      (h) => start < h.start + h.target.word.length && h.start < start + target.word.length,
    );
    if (!overlaps) hits.push({ start, target });
  }
  hits.sort((a, b) => a.start - b.start);

  const segments: StorySegment[] = [];
  let pos = 0;
  for (const { start, target } of hits) {
    if (start > pos) segments.push({ kind: "text", text: story.text.slice(pos, start) });
    segments.push({ kind: "target", text: target.word, target });
    pos = start + target.word.length;
  }
  if (pos < story.text.length) segments.push({ kind: "text", text: story.text.slice(pos) });
  return segments;
}

/**
 * The sentence from the story that contains `target.word`, split
 * around the character to write, for the memory test's
 * fill-in-the-blank prompt: `before` + [blank] + `after`.
 */
export function blankSentence(story: Story, target: TargetCharacter): { before: string; after: string } {
  const sentences = story.text.match(/[^。！？]+[。！？”]*/g) ?? [story.text];
  const sentence = (sentences.find((s) => s.includes(target.word)) ?? target.word)
    .replace(/^[“”\s]+/, "")
    .trim();
  const wordAt = sentence.indexOf(target.word);
  const charAt = wordAt + target.word.indexOf(target.char);
  return { before: sentence.slice(0, charAt), after: sentence.slice(charAt + target.char.length) };
}
