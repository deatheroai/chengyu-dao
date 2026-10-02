import type Phaser from "phaser";

/**
 * The one apple drawing every Science Snake board uses — the main
 * board's apples, poison apples and question-phrase apples, the answer
 * room's word apples and blue A/B apples, and the golden apple — so they
 * all match (per "why is the shape of the apple in the answer room
 * different"). Drawn rather than an emoji because emoji can't be
 * recoloured (the blue, purple and golden apples).
 */

export const APPLE_RED = 0xe0463a;
export const APPLE_BLUE = 0x2f7fd6;
export const APPLE_POISON = 0x8e44ad;
export const APPLE_GOLD = 0xf5c518;

const STEM_COLOR = 0x6b4424;
const LEAF_COLOR = 0x3c8a4c;
const GOLD_RIM = 0xc28f00;
const SPARKLE = 0xfffbe0;

/**
 * An apple's silhouette, as a radius that varies around the centre:
 * a dip at the top (where the stem sits) and a smaller one at the
 * bottom, shoulders a little wider than the base, and the base a little
 * narrower — so it reads as an apple, not a ball or a heart (per "the
 * apple... is missing a dent at the bottom, it is looking more like a
 * heart shape").
 */
export interface AppleShape {
  /** How deep the top dip is, as a share of the radius. */
  topDip: number;
  /** How wide the top dip is (radians, roughly). */
  topWidth: number;
  bottomDip: number;
  bottomWidth: number;
  /** How much wider than tall the shoulders are. */
  shoulders: number;
  /** How much narrower the bottom half is than the top. */
  taper: number;
  /** Height relative to width-before-shoulders. */
  height: number;
}

export const APPLE_SHAPES = {
  classic: { topDip: 0.3, topWidth: 0.26, bottomDip: 0.13, bottomWidth: 0.2, shoulders: 0.04, taper: 0.12, height: 1 },
  round: { topDip: 0.24, topWidth: 0.24, bottomDip: 0.09, bottomWidth: 0.18, shoulders: 0.02, taper: 0.06, height: 0.96 },
  tall: { topDip: 0.3, topWidth: 0.24, bottomDip: 0.15, bottomWidth: 0.2, shoulders: -0.04, taper: 0.18, height: 1.06 },
} satisfies Record<string, AppleShape>;

export type AppleShapeName = keyof typeof APPLE_SHAPES;

let currentShape: AppleShape = APPLE_SHAPES.classic;

/** Which shape every apple is drawn in (the apple lab page switches between them). */
export function setAppleShape(shape: AppleShape): void {
  currentShape = shape;
}

const gauss = (x: number, width: number): number => Math.exp(-(x * x) / (2 * width * width));

/** The outline as points round the centre, starting at the right and going clockwise (y down). */
export function appleOutline(cx: number, cy: number, r: number, shape: AppleShape = currentShape, steps = 72): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    // Angle measured from straight up (top dip) or straight down (bottom dip), wrapped to -π..π.
    const fromTop = Math.atan2(Math.sin(t + Math.PI / 2), Math.cos(t + Math.PI / 2));
    const fromBottom = Math.atan2(Math.sin(t - Math.PI / 2), Math.cos(t - Math.PI / 2));
    let radius = 1 - shape.topDip * gauss(fromTop, shape.topWidth) - shape.bottomDip * gauss(fromBottom, shape.bottomWidth);
    const lower = Math.max(0, Math.sin(t));
    radius *= 1 - shape.taper * lower;
    const x = cx + r * radius * Math.cos(t) * (1 + shape.shoulders);
    const y = cy + r * radius * Math.sin(t) * shape.height;
    points.push({ x, y });
  }
  return points;
}

/** A darker shade of `color`, for the apple's edge. */
function darker(color: number, amount = 0.72): number {
  const r = Math.round(((color >> 16) & 0xff) * amount);
  const g = Math.round(((color >> 8) & 0xff) * amount);
  const b = Math.round((color & 0xff) * amount);
  return (r << 16) | (g << 8) | b;
}

/**
 * Draws one apple filling most of a `cellSize` cell: the silhouette
 * with a darker edge, a stem out of the top dip, a leaf, and (unless
 * `shine` is off — the blue apples, where a letter sits) a small white
 * shine. The golden apple adds a gold rim and two sparkles.
 */
export function drawApple(g: Phaser.GameObjects.Graphics, cx: number, cy: number, cellSize: number, color: number, shine = true): void {
  const r = cellSize * 0.42;
  const bodyY = cy + r * 0.12;
  const outline = appleOutline(cx, bodyY, r);
  const isGold = color === APPLE_GOLD;
  g.fillStyle(color, 1);
  g.fillPoints(outline as Phaser.Math.Vector2[], true, true);
  g.lineStyle(Math.max(1, cellSize * 0.04), isGold ? GOLD_RIM : darker(color), 1);
  g.strokePoints(outline as Phaser.Math.Vector2[], true, true);

  // The stem grows out of the top dip; the leaf hangs off the stem.
  const topY = bodyY - r * (1 - currentShape.topDip) * currentShape.height;
  const stemTop = { x: cx + r * 0.12, y: topY - r * 0.4 };
  g.lineStyle(Math.max(2, cellSize * 0.07), STEM_COLOR, 1);
  g.lineBetween(cx, topY + r * 0.1, stemTop.x, stemTop.y);
  drawLeaf(g, cx + r * 0.06, topY - r * 0.2, r);

  if (shine) {
    g.fillStyle(0xffffff, isGold ? 0.6 : 0.45);
    g.fillEllipse(cx - r * 0.45, bodyY - r * 0.12, r * 0.24, r * 0.42);
  }
  if (isGold) {
    drawSparkle(g, cx + r * 0.62, bodyY - r * 0.58, r * 0.28);
    drawSparkle(g, cx - r * 0.15, bodyY + r * 0.55, r * 0.18);
  }
}

/** A pointed leaf, from its base at (x, y) up and out to the right. */
function drawLeaf(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
  const length = r * 0.62;
  const width = r * 0.2;
  const angle = -0.45; // tilted up
  const along = { x: Math.cos(angle), y: Math.sin(angle) };
  const across = { x: -along.y, y: along.x };
  const points: { x: number; y: number }[] = [];
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const w = Math.sin(t * Math.PI) * width;
    points.push({ x: x + along.x * length * t + across.x * w, y: y + along.y * length * t + across.y * w });
  }
  for (let i = steps - 1; i > 0; i--) {
    const t = i / steps;
    const w = Math.sin(t * Math.PI) * width;
    points.push({ x: x + along.x * length * t - across.x * w, y: y + along.y * length * t - across.y * w });
  }
  g.fillStyle(LEAF_COLOR, 1);
  g.fillPoints(points as Phaser.Math.Vector2[], true, true);
}

/** A four-pointed sparkle. */
function drawSparkle(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number): void {
  const thin = size * 0.28;
  g.fillStyle(SPARKLE, 1);
  g.fillPoints(
    [
      { x, y: y - size },
      { x: x + thin, y: y - thin },
      { x: x + size, y },
      { x: x + thin, y: y + thin },
      { x, y: y + size },
      { x: x - thin, y: y + thin },
      { x: x - size, y },
      { x: x - thin, y: y - thin },
    ] as Phaser.Math.Vector2[],
    true,
    true,
  );
}
