import type Phaser from "phaser";

/**
 * The one apple drawing every Science Snake board uses — the main
 * board's apples, poison apples and question-phrase apples, and the
 * answer room's word apples and blue A/B apples — so they all match
 * (per "why is the shape of the apple in the answer room different").
 * Drawn rather than an emoji because emoji can't be recoloured (the
 * blue and purple apples).
 */

export const APPLE_RED = 0xe0463a;
export const APPLE_BLUE = 0x2f7fd6;
export const APPLE_POISON = 0x8e44ad;

const STEM_COLOR = 0x6b4424;
const LEAF_COLOR = 0x3c8a4c;

/**
 * Two overlapping lobes give the dip at the top, plus a stem, a leaf and
 * (unless `shine` is off — the blue apples, where a letter sits) a
 * small white shine. `cellSize` is the board's cell size in pixels; the
 * apple fills most of one cell.
 */
export function drawApple(g: Phaser.GameObjects.Graphics, cx: number, cy: number, cellSize: number, color: number, shine = true): void {
  const r = cellSize / 2 - Math.max(1, cellSize * 0.05);
  const bodyY = cy + r * 0.12;
  g.fillStyle(color, 1);
  g.fillCircle(cx - r * 0.36, bodyY, r * 0.74);
  g.fillCircle(cx + r * 0.36, bodyY, r * 0.74);
  g.fillEllipse(cx, bodyY + r * 0.24, r * 1.62, r * 1.4);
  g.lineStyle(Math.max(2, cellSize * 0.075), STEM_COLOR, 1);
  g.lineBetween(cx, bodyY - r * 0.45, cx + r * 0.12, bodyY - r * 0.95);
  g.fillStyle(LEAF_COLOR, 1);
  g.fillEllipse(cx + r * 0.42, bodyY - r * 0.82, r * 0.62, r * 0.3);
  if (shine) {
    g.fillStyle(0xffffff, 0.45);
    g.fillEllipse(cx - r * 0.45, bodyY - r * 0.15, r * 0.26, r * 0.4);
  }
}
