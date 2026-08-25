export interface BalloonColorway {
  fill: number;
  border: number;
}

/**
 * A rainbow of light, saturated-border "candy" colors — varied per
 * balloon, never by correct/wrong, so the child has to judge the
 * sentence itself rather than learn to spot a color (per your
 * 2026-08-26 "more vibrant, suitable for children" feedback, replacing
 * the single warm-gold color every balloon shared before). Kept as a
 * light fill + a vivid border, same visual language as the door
 * puzzle's tiles, so the dark balloon text still reads clearly against
 * any of them.
 */
export const BALLOON_COLORWAYS: BalloonColorway[] = [
  { fill: 0xffd6d6, border: 0xff5c5c }, // red
  { fill: 0xffe6c2, border: 0xff9f40 }, // orange
  { fill: 0xfff3b0, border: 0xffd93d }, // yellow
  { fill: 0xd7f5d3, border: 0x4caf50 }, // green
  { fill: 0xd0ecff, border: 0x4aa3ff }, // blue
  { fill: 0xe8d9ff, border: 0xa66bff }, // purple
  { fill: 0xffd9ec, border: 0xff6fb0 }, // pink
];
