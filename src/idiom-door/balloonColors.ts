export interface BalloonColorway {
  fill: number;
  border: number;
}

/**
 * A rainbow of vivid "candy" colors — varied per balloon, never by
 * correct/wrong, so the child has to judge the sentence itself rather
 * than learn to spot a color (per your 2026-08-26 "more vibrant,
 * suitable for children" feedback, replacing the single warm-gold color
 * every balloon shared before).
 *
 * 2026-09-08: the original set here paired a very light pastel fill with
 * a vivid border — from a distance the pale fill dominated and the
 * overall balloon still read as soft/washed-out ("I still don't like
 * the colours... I want more vivid colours"). This version saturates
 * the fill itself, not just the border — each fill was picked to keep
 * `#4a3420` (BALLOON_TEXT) at a contrast ratio of at least 4.5:1 (WCAG
 * AA for normal-size text — checked, not eyeballed, since the pinyin
 * line is small), so bumping the vividness didn't quietly cost
 * legibility.
 */
export const BALLOON_COLORWAYS: BalloonColorway[] = [
  { fill: 0xff8a80, border: 0xd32f2f }, // red
  { fill: 0xffab40, border: 0xe65100 }, // orange
  { fill: 0xffd54f, border: 0xf9a825 }, // yellow
  { fill: 0x69db7c, border: 0x2e7d32 }, // green
  { fill: 0x64b5f6, border: 0x1565c0 }, // blue
  { fill: 0xc9a3ff, border: 0x7c3aed }, // purple
  { fill: 0xff80ab, border: 0xc2185b }, // pink
];
