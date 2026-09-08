/**
 * Per-character placement for curving a balloon's own idiom text along a
 * gentle arc, instead of a straight left-to-right line — what "curve the
 * balloon" actually meant (2026-09-08 feedback, after two earlier
 * attempts wrongly curved the *arrangement of balloons in the sky*
 * instead): each character (and its pinyin) leans a little, following a
 * shallow rainbow, the way text curves on a badge or logo.
 *
 * Returns one slot per character, in reading order (index 0 = idiom's
 * first character): `x`/`y` are the offset of that character's own
 * center from the arc's center, and `angleDeg` is how much to rotate
 * that character (and its pinyin above it) so it stays tangent to the
 * curve — 0 at the middle character, leaning outward toward the ends.
 * `y` is smallest (highest) at the middle and grows toward the ends —
 * the actual rainbow shape: the middle characters sit a little higher
 * than the outer ones.
 */
export interface GlyphArcSlot {
  x: number;
  y: number;
  angleDeg: number;
}

export interface GlyphArcOptions {
  /** Radius of the circle the characters sit on — a smaller radius
   * curls the text more tightly, a larger one flattens it out. */
  radius: number;
  /** Angular step between adjacent characters, in degrees. */
  angleStepDeg?: number;
}

export const DEFAULT_ANGLE_STEP_DEG = 9;

export function computeGlyphArc(count: number, options: GlyphArcOptions): GlyphArcSlot[] {
  if (count <= 0) return [];
  if (count === 1) return [{ x: 0, y: 0, angleDeg: 0 }];

  const { radius, angleStepDeg = DEFAULT_ANGLE_STEP_DEG } = options;
  const maxIndex = count - 1;
  const startDeg = -(maxIndex * angleStepDeg) / 2;

  return Array.from({ length: count }, (_, i) => {
    const deg = startDeg + i * angleStepDeg;
    const rad = (deg * Math.PI) / 180;
    return {
      x: radius * Math.sin(rad),
      y: radius * (1 - Math.cos(rad)),
      angleDeg: deg,
    };
  });
}
